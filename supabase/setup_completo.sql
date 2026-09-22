-- ====================================================================
-- ODONTOPRINT: SCRIPT COMPLETO E UNIFICADO (MIGRATIONS + SEED)
-- Execute este script inteiro no SQL Editor do Supabase de uma só vez!
-- ====================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS DE DOMÍNIO
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'CADISTA', 'OPERADOR_RESINA', 'OPERADOR_IMPRESSAO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE process_type AS ENUM ('FRESAGEM', 'IMPRESSAO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE dental_file_type AS ENUM (
        'MODELO_DE_TRABALHO',
        'ANTAGONISTA',
        'TROQUEL',
        'PLACA_MIORRELAXANTE',
        'ELEMENTO_PROVA',
        'ELEMENTO_PROVISORIO',
        'ELEMENTO_CARGA_CERAMICA'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE print_job_status AS ENUM ('AGUARDANDO', 'PARCIAL', 'CONCLUIDO', 'CANCELADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE print_item_status AS ENUM (
        'AGUARDANDO_FILA',
        'EM_PREPARO',
        'EM_IMPRESSAO',
        'CONCLUIDO',
        'FALHOU_REIMPRESSAO'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE resin_batch_status AS ENUM ('AGUARDANDO_CALIBRACAO', 'CALIBRADA', 'REPROVADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE calibration_status AS ENUM ('EM_ANDAMENTO', 'APROVADA', 'REPROVADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE print_run_status AS ENUM ('PREPARADA', 'EM_IMPRESSAO', 'FINALIZADA', 'CANCELADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE print_run_item_result AS ENUM ('PENDENTE', 'CONCLUIDO', 'FALHOU');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABELAS PRINCIPAIS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'CADISTA',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_interval_days INT NOT NULL DEFAULT 7,
    calibration_hexagon_min NUMERIC(5, 2) NOT NULL DEFAULT 9.99,
    calibration_hexagon_max NUMERIC(5, 2) NOT NULL DEFAULT 10.01,
    normal_print_prefix TEXT NOT NULL DEFAULT 'A',
    retry_print_prefix TEXT NOT NULL DEFAULT '00A',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_code TEXT NOT NULL,
    patient_name TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.case_status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    process_type process_type NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    source_status_event_id UUID REFERENCES public.case_status_events(id),
    queue_entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status print_job_status NOT NULL DEFAULT 'AGUARDANDO',
    priority INT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.print_job_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    print_job_id UUID NOT NULL REFERENCES public.print_jobs(id) ON DELETE CASCADE,
    file_type dental_file_type NOT NULL,
    status print_item_status NOT NULL DEFAULT 'AGUARDANDO_FILA',
    retry_count INT NOT NULL DEFAULT 0,
    is_retry BOOLEAN NOT NULL DEFAULT false,
    last_failure_reason TEXT,
    last_run_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.printers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    maintenance_contact TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.printer_maintenances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    printer_id UUID NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    leveling_ok BOOLEAN NOT NULL DEFAULT false,
    cleaning_ok BOOLEAN NOT NULL DEFAULT false,
    fep_integrity_ok BOOLEAN NOT NULL DEFAULT false,
    led_integrity_ok BOOLEAN NOT NULL DEFAULT false,
    black_points_led BOOLEAN NOT NULL DEFAULT false,
    low_led_luminosity BOOLEAN NOT NULL DEFAULT false,
    protective_film_ok BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    approved BOOLEAN NOT NULL DEFAULT false,
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resin_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand TEXT NOT NULL,
    resin_type TEXT NOT NULL,
    lot TEXT NOT NULL,
    volume NUMERIC(10, 2) NOT NULL,
    volume_unit TEXT NOT NULL DEFAULT 'ml',
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status resin_batch_status NOT NULL DEFAULT 'AGUARDANDO_CALIBRACAO',
    active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.resin_calibrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resin_batch_id UUID NOT NULL REFERENCES public.resin_batches(id) ON DELETE CASCADE,
    printer_id UUID NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
    calibration_number INT NOT NULL DEFAULT 1,
    initial_exposure_time NUMERIC(6, 2) NOT NULL,
    exposure_time NUMERIC(6, 2) NOT NULL,
    lift_speed NUMERIC(6, 2) NOT NULL,
    layer_height NUMERIC(6, 3) NOT NULL,
    hexagon_size_mm NUMERIC(6, 3) NOT NULL,
    lines_visible BOOLEAN NOT NULL DEFAULT false,
    numbers_visible BOOLEAN NOT NULL DEFAULT false,
    details_visible BOOLEAN NOT NULL DEFAULT false,
    wash_time NUMERIC(6, 2) NOT NULL,
    cure_time NUMERIC(6, 2) NOT NULL,
    status calibration_status NOT NULL DEFAULT 'EM_ANDAMENTO',
    finalized_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.print_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_code TEXT NOT NULL UNIQUE,
    printer_id UUID NOT NULL REFERENCES public.printers(id),
    resin_batch_id UUID NOT NULL REFERENCES public.resin_batches(id),
    calibration_id UUID NOT NULL REFERENCES public.resin_calibrations(id),
    supports_confirmed BOOLEAN NOT NULL DEFAULT false,
    resin_manipulated BOOLEAN NOT NULL DEFAULT false,
    status print_run_status NOT NULL DEFAULT 'PREPARADA',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.print_run_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    print_run_id UUID NOT NULL REFERENCES public.print_runs(id) ON DELETE CASCADE,
    print_job_item_id UUID NOT NULL REFERENCES public.print_job_items(id) ON DELETE CASCADE,
    result print_run_item_result NOT NULL DEFAULT 'PENDENTE',
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SEQUENCES E ÍNDICES
CREATE SEQUENCE IF NOT EXISTS print_run_normal_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS print_run_retry_seq START WITH 1 INCREMENT BY 1;

CREATE INDEX IF NOT EXISTS idx_cases_patient_code ON public.cases(patient_code);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_queue_entered ON public.print_jobs(queue_entered_at ASC);
CREATE INDEX IF NOT EXISTS idx_print_job_items_status ON public.print_job_items(status);
CREATE INDEX IF NOT EXISTS idx_print_job_items_is_retry ON public.print_job_items(is_retry);
CREATE INDEX IF NOT EXISTS idx_printer_maintenances_printer ON public.printer_maintenances(printer_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_resin_calibrations_combo ON public.resin_calibrations(resin_batch_id, printer_id, status);
CREATE INDEX IF NOT EXISTS idx_print_runs_code ON public.print_runs(run_code);

-- 5. FUNÇÕES AUXILIARES E ATÔMICAS (RPC)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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

    IF v_normal_prefix IS NULL THEN v_normal_prefix := 'A'; END IF;
    IF v_retry_prefix IS NULL THEN v_retry_prefix := '00A'; END IF;

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

-- Trigger para Manutenção
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
FOR EACH ROW EXECUTE FUNCTION public.fn_trg_calculate_printer_maintenance();

-- Trigger para Calibração
CREATE OR REPLACE FUNCTION public.fn_trg_calculate_resin_calibration()
RETURNS TRIGGER AS $$
DECLARE
    v_hex_min NUMERIC(5,2);
    v_hex_max NUMERIC(5,2);
BEGIN
    SELECT calibration_hexagon_min, calibration_hexagon_max
    INTO v_hex_min, v_hex_max
    FROM public.system_settings LIMIT 1;

    IF v_hex_min IS NULL THEN v_hex_min := 9.99; END IF;
    IF v_hex_max IS NULL THEN v_hex_max := 10.01; END IF;

    IF NEW.status = 'APROVADA' THEN
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
FOR EACH ROW EXECUTE FUNCTION public.fn_trg_calculate_resin_calibration();

-- Função Atômica: Finalizar Impressão com Retorno à Fila
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

            UPDATE public.print_run_items
            SET result = 'FALHOU', failure_reason = v_reason
            WHERE id = v_run_item.id;

            UPDATE public.print_job_items
            SET 
                status = 'AGUARDANDO_FILA',
                retry_count = retry_count + 1,
                is_retry = true,
                last_failure_reason = v_reason,
                last_run_code = v_run.run_code,
                updated_at = now()
            WHERE id = v_run_item.print_job_item_id;
        ELSE
            v_completed_count := v_completed_count + 1;

            UPDATE public.print_run_items
            SET result = 'CONCLUIDO'
            WHERE id = v_run_item.id;

            UPDATE public.print_job_items
            SET status = 'CONCLUIDO', last_run_code = v_run.run_code, updated_at = now()
            WHERE id = v_run_item.print_job_item_id;
        END IF;

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

    RETURN jsonb_build_object(
        'success', true,
        'run_code', v_run.run_code,
        'completed', v_completed_count,
        'failed', v_failed_count
    );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 6. VIEWS DO SISTEMA
CREATE OR REPLACE VIEW public.printer_availability_view AS
WITH latest_maint AS (
    SELECT DISTINCT ON (printer_id)
        printer_id, id AS maintenance_id, performed_at, approved
    FROM public.printer_maintenances
    ORDER BY printer_id, performed_at DESC
),
settings AS (
    SELECT COALESCE(maintenance_interval_days, 7) AS interval_days
    FROM public.system_settings LIMIT 1
)
SELECT 
    p.id AS printer_id,
    p.name, p.brand, p.model, p.serial_number, p.maintenance_contact, p.active,
    lm.maintenance_id,
    lm.performed_at AS last_maintenance_at,
    lm.approved AS last_maintenance_approved,
    CASE WHEN lm.performed_at IS NOT NULL THEN EXTRACT(DAY FROM (now() - lm.performed_at))::INT ELSE NULL END AS days_since_maintenance,
    CASE
        WHEN p.active = false THEN 'INATIVA'
        WHEN lm.maintenance_id IS NULL THEN 'REPROVADA'
        WHEN lm.approved = false THEN 'REPROVADA'
        WHEN EXTRACT(DAY FROM (now() - lm.performed_at)) > (SELECT interval_days FROM settings) THEN 'MANUTENCAO_VENCIDA'
        ELSE 'DISPONIVEL'
    END AS calculated_status,
    CASE
        WHEN p.active = true AND lm.approved = true AND EXTRACT(DAY FROM (now() - lm.performed_at)) <= (SELECT interval_days FROM settings) THEN true
        ELSE false
    END AS is_eligible_for_print
FROM public.printers p
LEFT JOIN latest_maint lm ON lm.printer_id = p.id;

CREATE OR REPLACE VIEW public.eligible_resin_calibrations_view AS
SELECT 
    rc.id AS calibration_id, rc.calibration_number, rc.status AS calibration_status, rc.finalized_at,
    rc.hexagon_size_mm, rc.layer_height, rc.exposure_time,
    rb.id AS resin_batch_id, rb.brand AS resin_brand, rb.resin_type, rb.lot AS resin_lot, rb.volume, rb.volume_unit,
    p.id AS printer_id, p.name AS printer_name,
    pav.calculated_status AS printer_status, pav.is_eligible_for_print AS printer_eligible
FROM public.resin_calibrations rc
JOIN public.resin_batches rb ON rb.id = rc.resin_batch_id
JOIN public.printers p ON p.id = rc.printer_id
JOIN public.printer_availability_view pav ON pav.printer_id = p.id
WHERE rc.status = 'APROVADA' AND rb.active = true AND rb.status = 'CALIBRADA';

CREATE OR REPLACE VIEW public.print_queue_view AS
SELECT 
    pji.id AS item_id, pji.file_type, pji.status AS item_status, pji.retry_count, pji.is_retry, pji.last_failure_reason, pji.last_run_code, pji.created_at AS item_created_at,
    pj.id AS print_job_id, pj.priority, pj.queue_entered_at,
    c.id AS case_id, c.patient_code, c.patient_name, c.notes AS case_notes,
    EXTRACT(EPOCH FROM (now() - pj.queue_entered_at))::INT AS wait_seconds
FROM public.print_job_items pji
JOIN public.print_jobs pj ON pj.id = pji.print_job_id
JOIN public.cases c ON c.id = pj.case_id
WHERE pji.status = 'AGUARDANDO_FILA'
ORDER BY pj.queue_entered_at ASC, pji.is_retry DESC, pji.created_at ASC;

-- 7. ATIVAÇÃO DO REALTIME
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.print_job_items;
    EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_object THEN null; END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
    EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_object THEN null; END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.print_runs;
    EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_object THEN null; END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.printers;
    EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_object THEN null; END;
END $$;

-- 8. CONFIGURAÇÃO INICIAL (SETTINGS)
INSERT INTO public.system_settings (
    maintenance_interval_days, calibration_hexagon_min, calibration_hexagon_max, normal_print_prefix, retry_print_prefix
)
SELECT 7, 9.99, 10.01, 'A', '00A'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

-- 9. DADOS DE DEMONSTRAÇÃO (SEED)
-- Impressoras
INSERT INTO public.printers (id, name, brand, model, serial_number, maintenance_contact, active)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Odonto Printer 01', 'Elegoo', 'Saturn 3 Ultra 12K', 'SN-ELG-9901-BR', 'suporte@odontoprint.com.br / (11) 98888-0001', true),
('22222222-2222-2222-2222-222222222222', 'Odonto Printer 02', 'Anycubic', 'Photon Mono M5s', 'SN-ANY-4402-SP', 'assistencia@photonbrasil.com / (11) 97777-0002', true),
('33333333-3333-3333-3333-333333333333', 'Odonto Printer 03', 'Creality', 'Halot Mage Pro 8K', 'SN-CRE-7703-RJ', 'manutencao@halotlab.com / (21) 96666-0003', true)
ON CONFLICT (id) DO NOTHING;

-- Manutenções
INSERT INTO public.printer_maintenances (id, printer_id, performed_at, leveling_ok, cleaning_ok, fep_integrity_ok, led_integrity_ok, black_points_led, low_led_luminosity, protective_film_ok, notes, approved)
VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', now() - INTERVAL '2 days', true, true, true, true, false, false, true, 'Manutenção preventiva semanal realizada. FEP novo.', true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', now() - INTERVAL '10 days', true, true, true, true, false, false, true, 'Manutenção OK, porém venceu há 3 dias.', true),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', now() - INTERVAL '1 day', true, true, false, false, true, true, false, 'FEP riscado e pontos pretos no painel LED.', false)
ON CONFLICT (id) DO NOTHING;

-- Lotes de Resina
INSERT INTO public.resin_batches (id, brand, resin_type, lot, volume, volume_unit, received_at, status, active)
VALUES 
('44444444-4444-4444-4444-444444444444', 'PriZma 3D Bio', 'Model Precision Beige', 'BIO-2026-A', 1000, 'ml', now() - INTERVAL '15 days', 'CALIBRADA', true),
('55555555-5555-5555-5555-555555555555', 'Smart Print', 'Denture Gingiva Pink', 'SPD-9921-B', 1000, 'ml', now() - INTERVAL '3 days', 'AGUARDANDO_CALIBRACAO', true),
('66666666-6666-6666-6666-666666666666', 'Cosmos Castable', 'Castable Resin Direct Burnout', 'CC-1044-C', 500, 'ml', now() - INTERVAL '5 days', 'REPROVADA', true)
ON CONFLICT (id) DO NOTHING;

-- Calibrações
INSERT INTO public.resin_calibrations (id, resin_batch_id, printer_id, calibration_number, initial_exposure_time, exposure_time, lift_speed, layer_height, hexagon_size_mm, lines_visible, numbers_visible, details_visible, wash_time, cure_time, status, finalized_at)
VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 1, 25.0, 2.30, 60.0, 0.050, 10.000, true, true, true, 5.0, 10.0, 'APROVADA', now() - INTERVAL '14 days'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 1, 30.0, 2.90, 50.0, 0.050, 10.040, false, true, false, 5.0, 15.0, 'REPROVADA', now() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

-- Casos de Pacientes
INSERT INTO public.cases (id, patient_code, patient_name, notes, created_at)
VALUES 
('c0000001-0000-0000-0000-000000000001', 'PAC-001', 'João Silva', 'Prótese Fixa sobre implantes elemento 14 a 16', now() - INTERVAL '5 hours'),
('c0000002-0000-0000-0000-000000000002', 'PAC-002', 'Maria Oliveira', 'Placa de bruxismo superior + modelo de estudo', now() - INTERVAL '4 hours'),
('c0000003-0000-0000-0000-000000000003', 'PAC-003', 'Carlos Eduardo', 'Troquel múltiplo e modelo de trabalho', now() - INTERVAL '3 hours'),
('c0000004-0000-0000-0000-000000000004', 'PAC-004', 'Ana Paula Santos', 'Prova estética e provisórios dentes anteriores', now() - INTERVAL '2 hours'),
('c0000005-0000-0000-0000-000000000005', 'PAC-005', 'Roberto Souza', 'Carga cerâmica e antagonista', now() - INTERVAL '1 hour'),
('c0000006-0000-0000-0000-000000000006', 'PAC-006', 'Camila Ferreira', 'Modelo de trabalho e placa miorrelaxante', now() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- Jobs e Itens da Fila
INSERT INTO public.print_jobs (id, case_id, queue_entered_at, status, priority)
VALUES 
('j0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', now() - INTERVAL '5 hours', 'CONCLUIDO', 1),
('j0000002-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', now() - INTERVAL '4 hours', 'PARCIAL', 2),
('j0000003-0000-0000-0000-000000000003', 'c0000003-0000-0000-0000-000000000003', now() - INTERVAL '3 hours', 'AGUARDANDO', 1),
('j0000004-0000-0000-0000-000000000004', 'c0000004-0000-0000-0000-000000000004', now() - INTERVAL '2 hours', 'AGUARDANDO', 1),
('j0000005-0000-0000-0000-000000000005', 'c0000005-0000-0000-0000-000000000005', now() - INTERVAL '1 hour', 'AGUARDANDO', 1),
('j0000006-0000-0000-0000-000000000006', 'c0000006-0000-0000-0000-000000000006', now() - INTERVAL '30 minutes', 'AGUARDANDO', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_job_items (id, print_job_id, file_type, status, retry_count, is_retry, last_failure_reason, last_run_code)
VALUES 
('i0000001-0000-0000-0000-000000000001', 'j0000001-0000-0000-0000-000000000001', 'MODELO_DE_TRABALHO', 'CONCLUIDO', 0, false, NULL, 'A001'),
('i0000002-0000-0000-0000-000000000002', 'j0000001-0000-0000-0000-000000000001', 'ANTAGONISTA', 'CONCLUIDO', 0, false, NULL, 'A001'),
('i0000003-0000-0000-0000-000000000003', 'j0000002-0000-0000-0000-000000000002', 'MODELO_DE_TRABALHO', 'CONCLUIDO', 0, false, NULL, 'A002'),
('i0000004-0000-0000-0000-000000000004', 'j0000002-0000-0000-0000-000000000002', 'ANTAGONISTA', 'AGUARDANDO_FILA', 1, true, 'Descolamento da mesa de impressão na cúspide lingual', 'A002'),
('i0000005-0000-0000-0000-000000000005', 'j0000003-0000-0000-0000-000000000003', 'MODELO_DE_TRABALHO', 'AGUARDANDO_FILA', 0, false, NULL, NULL),
('i0000006-0000-0000-0000-000000000006', 'j0000003-0000-0000-0000-000000000003', 'TROQUEL', 'AGUARDANDO_FILA', 0, false, NULL, NULL),
('i0000007-0000-0000-0000-000000000007', 'j0000003-0000-0000-0000-000000000003', 'ANTAGONISTA', 'AGUARDANDO_FILA', 0, false, NULL, NULL),
('i0000008-0000-0000-0000-000000000008', 'j0000004-0000-0000-0000-000000000004', 'PLACA_MIORRELAXANTE', 'AGUARDANDO_FILA', 0, false, NULL, NULL),
('i0000009-0000-0000-0000-000000000009', 'j0000004-0000-0000-0000-000000000004', 'ELEMENTO_PROVA', 'AGUARDANDO_FILA', 0, false, NULL, NULL),
('i0000010-0000-0000-0000-000000000010', 'j0000005-0000-0000-0000-000000000005', 'ELEMENTO_PROVISORIO', 'AGUARDANDO_FILA', 0, false, NULL, NULL),
('i0000011-0000-0000-0000-000000000011', 'j0000005-0000-0000-0000-000000000005', 'ELEMENTO_CARGA_CERAMICA', 'AGUARDANDO_FILA', 0, false, NULL, NULL),
('i0000012-0000-0000-0000-000000000012', 'j0000006-0000-0000-0000-000000000006', 'MODELO_DE_TRABALHO', 'AGUARDANDO_FILA', 0, false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Ordens de Impressão de Exemplo
INSERT INTO public.print_runs (id, run_code, printer_id, resin_batch_id, calibration_id, supports_confirmed, resin_manipulated, status, started_at, finished_at)
VALUES 
('r0000001-0000-0000-0000-000000000001', 'A001', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true, true, 'FINALIZADA', now() - INTERVAL '4 hours', now() - INTERVAL '2 hours'),
('r0000002-0000-0000-0000-000000000002', 'A002', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true, true, 'FINALIZADA', now() - INTERVAL '2 hours', now() - INTERVAL '45 minutes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_run_items (id, print_run_id, print_job_item_id, result, failure_reason)
VALUES 
('ri000001-0000-0000-0000-000000000001', 'r0000001-0000-0000-0000-000000000001', 'i0000001-0000-0000-0000-000000000001', 'CONCLUIDO', NULL),
('ri000002-0000-0000-0000-000000000002', 'r0000001-0000-0000-0000-000000000001', 'i0000002-0000-0000-0000-000000000002', 'CONCLUIDO', NULL),
('ri000003-0000-0000-0000-000000000003', 'r0000002-0000-0000-0000-000000000002', 'i0000003-0000-0000-0000-000000000003', 'CONCLUIDO', NULL),
('ri000004-0000-0000-0000-000000000004', 'r0000002-0000-0000-0000-000000000002', 'i0000004-0000-0000-0000-000000000004', 'FALHOU', 'Descolamento da mesa de impressão na cúspide lingual')
ON CONFLICT (id) DO NOTHING;

SELECT setval('print_run_normal_seq', 2, true);
SELECT setval('print_run_retry_seq', 1, false);

-- FIM DO SCRIPT COMPLETO
