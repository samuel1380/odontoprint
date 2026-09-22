-- ====================================================================
-- MIGRATION 004: VIEWS & AGGREGATIONS - ODONTOPRINT
-- ====================================================================

-- 1. VIEW: PRINTER AVAILABILITY & STATUS CALCULATION
CREATE OR REPLACE VIEW public.printer_availability_view AS
WITH latest_maint AS (
    SELECT DISTINCT ON (printer_id)
        printer_id,
        id AS maintenance_id,
        performed_at,
        approved,
        leveling_ok,
        cleaning_ok,
        fep_integrity_ok,
        led_integrity_ok,
        protective_film_ok
    FROM public.printer_maintenances
    ORDER BY printer_id, performed_at DESC
),
settings AS (
    SELECT COALESCE(maintenance_interval_days, 7) AS interval_days
    FROM public.system_settings
    LIMIT 1
)
SELECT 
    p.id AS printer_id,
    p.name,
    p.brand,
    p.model,
    p.serial_number,
    p.maintenance_contact,
    p.active,
    lm.maintenance_id,
    lm.performed_at AS last_maintenance_at,
    lm.approved AS last_maintenance_approved,
    CASE 
        WHEN lm.performed_at IS NOT NULL THEN
            EXTRACT(DAY FROM (now() - lm.performed_at))::INT
        ELSE NULL
    END AS days_since_maintenance,
    CASE
        WHEN p.active = false THEN 'INATIVA'
        WHEN lm.maintenance_id IS NULL THEN 'REPROVADA'
        WHEN lm.approved = false THEN 'REPROVADA'
        WHEN EXTRACT(DAY FROM (now() - lm.performed_at)) > (SELECT interval_days FROM settings) THEN 'MANUTENCAO_VENCIDA'
        ELSE 'DISPONIVEL'
    END AS calculated_status,
    CASE
        WHEN p.active = true 
         AND lm.approved = true 
         AND EXTRACT(DAY FROM (now() - lm.performed_at)) <= (SELECT interval_days FROM settings)
        THEN true
        ELSE false
    END AS is_eligible_for_print
FROM public.printers p
LEFT JOIN latest_maint lm ON lm.printer_id = p.id;

-- 2. VIEW: ELIGIBLE RESIN CALIBRATIONS (RESINA CALIBRADA POR IMPRESSORA)
CREATE OR REPLACE VIEW public.eligible_resin_calibrations_view AS
SELECT 
    rc.id AS calibration_id,
    rc.calibration_number,
    rc.status AS calibration_status,
    rc.finalized_at,
    rc.hexagon_size_mm,
    rc.layer_height,
    rc.exposure_time,
    rb.id AS resin_batch_id,
    rb.brand AS resin_brand,
    rb.resin_type,
    rb.lot AS resin_lot,
    rb.volume,
    rb.volume_unit,
    rb.active AS resin_active,
    p.id AS printer_id,
    p.name AS printer_name,
    pav.calculated_status AS printer_status,
    pav.is_eligible_for_print AS printer_eligible
FROM public.resin_calibrations rc
JOIN public.resin_batches rb ON rb.id = rc.resin_batch_id
JOIN public.printers p ON p.id = rc.printer_id
JOIN public.printer_availability_view pav ON pav.printer_id = p.id
WHERE rc.status = 'APROVADA'
  AND rb.active = true
  AND rb.status = 'CALIBRADA';

-- 3. VIEW: PRINT QUEUE ORGANIZED BY PATIENT (FIFO)
CREATE OR REPLACE VIEW public.print_queue_view AS
SELECT 
    pji.id AS item_id,
    pji.file_type,
    pji.status AS item_status,
    pji.retry_count,
    pji.is_retry,
    pji.last_failure_reason,
    pji.last_run_code,
    pji.created_at AS item_created_at,
    pj.id AS print_job_id,
    pj.priority,
    pj.queue_entered_at,
    c.id AS case_id,
    c.patient_code,
    c.patient_name,
    c.notes AS case_notes,
    EXTRACT(EPOCH FROM (now() - pj.queue_entered_at))::INT AS wait_seconds
FROM public.print_job_items pji
JOIN public.print_jobs pj ON pj.id = pji.print_job_id
JOIN public.cases c ON c.id = pj.case_id
WHERE pji.status = 'AGUARDANDO_FILA'
ORDER BY pj.queue_entered_at ASC, pji.is_retry DESC, pji.created_at ASC;
