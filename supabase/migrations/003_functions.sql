-- ====================================================================
-- MIGRATION 003: FUNCTIONS & STORED PROCEDURES (RPC) - ODONTOPRINT
-- ====================================================================

-- 1. ATOMIC PRINT RUN CODE GENERATOR
CREATE OR REPLACE FUNCTION public.generate_print_run_code(p_has_retry BOOLEAN DEFAULT false)
RETURNS TEXT AS $$
DECLARE
    v_normal_prefix TEXT;
    v_retry_prefix TEXT;
    v_seq_val BIGINT;
    v_code TEXT;
BEGIN
    SELECT normal_print_prefix, retry_print_prefix 
    INTO v_normal_prefix, v_retry_prefix
    FROM public.system_settings
    LIMIT 1;

    IF v_normal_prefix IS NULL THEN
        v_normal_prefix := 'A';
    END IF;
    IF v_retry_prefix IS NULL THEN
        v_retry_prefix := '00A';
    END IF;

    IF p_has_retry THEN
        v_seq_val := nextval('print_run_retry_seq');
        v_code := v_retry_prefix || LPAD(v_seq_val::TEXT, 3, '0');
    ELSE
        v_seq_val := nextval('print_run_normal_seq');
        v_code := v_normal_prefix || LPAD(v_seq_val::TEXT, 3, '0');
    END IF;

    RETURN v_code;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 2. TRIGGER: AUTO-CALCULATE MAINTENANCE APPROVAL
CREATE OR REPLACE FUNCTION public.fn_trg_calculate_printer_maintenance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.approved := (
        NEW.leveling_ok = true AND
        NEW.cleaning_ok = true AND
        NEW.fep_integrity_ok = true AND
        NEW.led_integrity_ok = true AND
        NEW.black_points_led = false AND
        NEW.low_led_luminosity = false AND
        NEW.protective_film_ok = true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_printer_maintenance ON public.printer_maintenances;
CREATE TRIGGER trg_calculate_printer_maintenance
BEFORE INSERT OR UPDATE ON public.printer_maintenances
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_calculate_printer_maintenance();

-- 3. TRIGGER: AUTO-CALCULATE CALIBRATION APPROVAL
CREATE OR REPLACE FUNCTION public.fn_trg_calculate_resin_calibration()
RETURNS TRIGGER AS $$
DECLARE
    v_hex_min NUMERIC(5,2);
    v_hex_max NUMERIC(5,2);
BEGIN
    SELECT calibration_hexagon_min, calibration_hexagon_max
    INTO v_hex_min, v_hex_max
    FROM public.system_settings
    LIMIT 1;

    IF v_hex_min IS NULL THEN v_hex_min := 9.99; END IF;
    IF v_hex_max IS NULL THEN v_hex_max := 10.01; END IF;

    IF NEW.status = 'APROVADA' THEN
        -- Verify strict conditions
        IF NOT (
            NEW.hexagon_size_mm >= v_hex_min AND
            NEW.hexagon_size_mm <= v_hex_max AND
            NEW.lines_visible = true AND
            NEW.numbers_visible = true AND
            NEW.details_visible = true
        ) THEN
            RAISE EXCEPTION 'Calibração não atende aos parâmetros técnicos obrigatórios (Hexágono %.2f-%.2f e visibilidade total)', v_hex_min, v_hex_max;
        END IF;

        NEW.finalized_at := now();

        -- Also update resin batch status to CALIBRADA if not already
        UPDATE public.resin_batches
        SET status = 'CALIBRADA', updated_at = now()
        WHERE id = NEW.resin_batch_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_resin_calibration ON public.resin_calibrations;
CREATE TRIGGER trg_calculate_resin_calibration
BEFORE INSERT OR UPDATE ON public.resin_calibrations
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_calculate_resin_calibration();

-- 4. ATOMIC RPC: FINALIZE PRINT RUN
CREATE OR REPLACE FUNCTION public.finalize_print_run(
    p_run_id UUID,
    p_failed_item_ids UUID[],
    p_failure_reasons TEXT[],
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_run RECORD;
    v_run_item RECORD;
    v_is_failed BOOLEAN;
    v_reason TEXT;
    v_idx INT;
    v_completed_count INT := 0;
    v_failed_count INT := 0;
    v_job_id UUID;
    v_pending_in_job INT;
BEGIN
    SELECT * INTO v_run FROM public.print_runs WHERE id = p_run_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ordem de impressão % não encontrada', p_run_id;
    END IF;

    IF v_run.status = 'FINALIZADA' THEN
        RAISE EXCEPTION 'Esta ordem de impressão já foi finalizada anteriormente';
    END IF;

    UPDATE public.print_runs
    SET status = 'FINALIZADA', finished_at = now(), updated_at = now()
    WHERE id = p_run_id;

    -- Process each item of the run
    FOR v_run_item IN 
        SELECT pri.*, pji.print_job_id 
        FROM public.print_run_items pri
        JOIN public.print_job_items pji ON pji.id = pri.print_job_item_id
        WHERE pri.print_run_id = p_run_id
    LOOP
        v_is_failed := false;
        v_reason := NULL;

        IF p_failed_item_ids IS NOT NULL THEN
            FOR v_idx IN 1..array_length(p_failed_item_ids, 1) LOOP
                IF p_failed_item_ids[v_idx] = v_run_item.print_job_item_id THEN
                    v_is_failed := true;
                    IF p_failure_reasons IS NOT NULL AND array_length(p_failure_reasons, 1) >= v_idx THEN
                        v_reason := p_failure_reasons[v_idx];
                    END IF;
                    EXIT;
                END IF;
            END LOOP;
        END IF;

        IF v_is_failed THEN
            v_failed_count := v_failed_count + 1;

            -- Update print_run_items
            UPDATE public.print_run_items
            SET result = 'FALHOU', failure_reason = v_reason
            WHERE id = v_run_item.id;

            -- Return item to queue highlighted as retry
            UPDATE public.print_job_items
            SET 
                status = 'AGUARDANDO_FILA',
                retry_count = retry_count + 1,
                is_retry = true,
                last_failure_reason = v_reason,
                last_run_code = v_run.run_code,
                updated_at = now()
            WHERE id = v_run_item.print_job_item_id;

            -- Audit log
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
            VALUES (
                p_user_id,
                'ITEM_REIMPRESSAO',
                'print_job_items',
                v_run_item.print_job_item_id,
                jsonb_build_object(
                    'run_code', v_run.run_code,
                    'reason', v_reason,
                    'status', 'AGUARDANDO_FILA'
                )
            );
        ELSE
            v_completed_count := v_completed_count + 1;

            -- Update print_run_items
            UPDATE public.print_run_items
            SET result = 'CONCLUIDO'
            WHERE id = v_run_item.id;

            -- Mark item as completed
            UPDATE public.print_job_items
            SET status = 'CONCLUIDO', last_run_code = v_run.run_code, updated_at = now()
            WHERE id = v_run_item.print_job_item_id;

            -- Audit log
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
            VALUES (
                p_user_id,
                'ITEM_CONCLUIDO',
                'print_job_items',
                v_run_item.print_job_item_id,
                jsonb_build_object(
                    'run_code', v_run.run_code,
                    'status', 'CONCLUIDO'
                )
            );
        END IF;

        -- Update parent print_job status
        v_job_id := v_run_item.print_job_id;
        SELECT COUNT(*) INTO v_pending_in_job
        FROM public.print_job_items
        WHERE print_job_id = v_job_id AND status != 'CONCLUIDO';

        IF v_pending_in_job = 0 THEN
            UPDATE public.print_jobs SET status = 'CONCLUIDO', updated_at = now() WHERE id = v_job_id;
        ELSE
            UPDATE public.print_jobs SET status = 'PARCIAL', updated_at = now() WHERE id = v_job_id;
        END IF;
    END LOOP;

    -- Audit print run finalized
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
    VALUES (
        p_user_id,
        'IMPRESSAO_FINALIZADA',
        'print_runs',
        p_run_id,
        jsonb_build_object(
            'run_code', v_run.run_code,
            'completed_count', v_completed_count,
            'failed_count', v_failed_count
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'run_code', v_run.run_code,
        'completed', v_completed_count,
        'failed', v_failed_count
    );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
