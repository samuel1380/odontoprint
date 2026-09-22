-- ====================================================================
-- SEED DATA FOR DEMO & TESTING - ODONTOPRINT
-- ====================================================================

-- 1. SYSTEM SETTINGS
INSERT INTO public.system_settings (
    maintenance_interval_days,
    calibration_hexagon_min,
    calibration_hexagon_max,
    normal_print_prefix,
    retry_print_prefix
)
VALUES (7, 9.99, 10.01, 'A', '00A')
ON CONFLICT (id) DO NOTHING;

-- 2. PRINTERS
-- Printer 1: Disponível (Manutenção em dia - feita há 2 dias)
INSERT INTO public.printers (id, name, brand, model, serial_number, maintenance_contact, active)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Odonto Printer 01',
    'Elegoo',
    'Saturn 3 Ultra 12K',
    'SN-ELG-9901-BR',
    'suporte@odontoprint.com.br / (11) 98888-0001',
    true
) ON CONFLICT (id) DO NOTHING;

-- Printer 2: Manutenção Vencida (Manutenção feita há 10 dias, limite é 7)
INSERT INTO public.printers (id, name, brand, model, serial_number, maintenance_contact, active)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Odonto Printer 02',
    'Anycubic',
    'Photon Mono M5s',
    'SN-ANY-4402-SP',
    'assistencia@photonbrasil.com / (11) 97777-0002',
    true
) ON CONFLICT (id) DO NOTHING;

-- Printer 3: Reprovada (Manutenção reprovada por pontos pretos no LED)
INSERT INTO public.printers (id, name, brand, model, serial_number, maintenance_contact, active)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Odonto Printer 03',
    'Creality',
    'Halot Mage Pro 8K',
    'SN-CRE-7703-RJ',
    'manutencao@halotlab.com / (21) 96666-0003',
    true
) ON CONFLICT (id) DO NOTHING;

-- 3. PRINTER MAINTENANCES
-- Manutenção aprovada na Printer 01 (há 2 dias)
INSERT INTO public.printer_maintenances (
    id, printer_id, performed_at, leveling_ok, cleaning_ok, fep_integrity_ok,
    led_integrity_ok, black_points_led, low_led_luminosity, protective_film_ok,
    notes, approved
)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    now() - INTERVAL '2 days',
    true, true, true, true, false, false, true,
    'Manutenção preventiva semanal realizada. FEP novo instalado.',
    true
) ON CONFLICT (id) DO NOTHING;

-- Manutenção aprovada na Printer 02 (há 10 dias -> VENCIDA)
INSERT INTO public.printer_maintenances (
    id, printer_id, performed_at, leveling_ok, cleaning_ok, fep_integrity_ok,
    led_integrity_ok, black_points_led, low_led_luminosity, protective_film_ok,
    notes, approved
)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    now() - INTERVAL '10 days',
    true, true, true, true, false, false, true,
    'Manutenção anterior estava OK, porém venceu há 3 dias.',
    true
) ON CONFLICT (id) DO NOTHING;

-- Manutenção reprovada na Printer 03 (ontem -> REPROVADA)
INSERT INTO public.printer_maintenances (
    id, printer_id, performed_at, leveling_ok, cleaning_ok, fep_integrity_ok,
    led_integrity_ok, black_points_led, low_led_luminosity, protective_film_ok,
    notes, approved
)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    now() - INTERVAL '1 day',
    true, true, false, false, true, true, false,
    'FEP riscado e pontos pretos identificados no centro do painel LED.',
    false
) ON CONFLICT (id) DO NOTHING;

-- 4. RESIN BATCHES
-- Lote 1: Calibrada
INSERT INTO public.resin_batches (id, brand, resin_type, lot, volume, volume_unit, received_at, status, active)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'PriZma 3D Bio',
    'Model Precision Beige',
    'BIO-2026-A',
    1000,
    'ml',
    now() - INTERVAL '15 days',
    'CALIBRADA',
    true
) ON CONFLICT (id) DO NOTHING;

-- Lote 2: Aguardando Calibração
INSERT INTO public.resin_batches (id, brand, resin_type, lot, volume, volume_unit, received_at, status, active)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    'Smart Print',
    'Denture Gingiva Pink',
    'SPD-9921-B',
    1000,
    'ml',
    now() - INTERVAL '3 days',
    'AGUARDANDO_CALIBRACAO',
    true
) ON CONFLICT (id) DO NOTHING;

-- Lote 3: Calibração Reprovada
INSERT INTO public.resin_batches (id, brand, resin_type, lot, volume, volume_unit, received_at, status, active)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    'Cosmos Castable',
    'Castable Resin Direct Burnout',
    'CC-1044-C',
    500,
    'ml',
    now() - INTERVAL '5 days',
    'REPROVADA',
    true
) ON CONFLICT (id) DO NOTHING;

-- 5. RESIN CALIBRATIONS
-- Calibração Aprovada: Lote 1 na Printer 01 (Hexágono exato 10.00 mm)
INSERT INTO public.resin_calibrations (
    id, resin_batch_id, printer_id, calibration_number,
    initial_exposure_time, exposure_time, lift_speed, layer_height,
    hexagon_size_mm, lines_visible, numbers_visible, details_visible,
    wash_time, cure_time, status, finalized_at
)
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    1,
    25.0, 2.30, 60.0, 0.050,
    10.000, true, true, true,
    5.0, 10.0, 'APROVADA', now() - INTERVAL '14 days'
) ON CONFLICT (id) DO NOTHING;

-- Calibração Reprovada: Lote 3 na Printer 01 (Hexágono 10.04 mm - fora do range 9.99-10.01)
INSERT INTO public.resin_calibrations (
    id, resin_batch_id, printer_id, calibration_number,
    initial_exposure_time, exposure_time, lift_speed, layer_height,
    hexagon_size_mm, lines_visible, numbers_visible, details_visible,
    wash_time, cure_time, status, finalized_at
)
VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    1,
    30.0, 2.90, 50.0, 0.050,
    10.040, false, true, false,
    5.0, 15.0, 'REPROVADA', now() - INTERVAL '4 days'
) ON CONFLICT (id) DO NOTHING;

-- 6. CASES (6 PACIENTES)
INSERT INTO public.cases (id, patient_code, patient_name, notes, created_at)
VALUES 
('c0000001-0000-0000-0000-000000000001', 'PAC-001', 'João Silva', 'Prótese Fixa sobre implantes elemento 14 a 16', now() - INTERVAL '5 hours'),
('c0000002-0000-0000-0000-000000000002', 'PAC-002', 'Maria Oliveira', 'Placa de bruxismo superior + modelo de estudo', now() - INTERVAL '4 hours'),
('c0000003-0000-0000-0000-000000000003', 'PAC-003', 'Carlos Eduardo', 'Troquel múltiplo e modelo de trabalho', now() - INTERVAL '3 hours'),
('c0000004-0000-0000-0000-000000000004', 'PAC-004', 'Ana Paula Santos', 'Prova estética e provisórios dentes anteriores', now() - INTERVAL '2 hours'),
('c0000005-0000-0000-0000-000000000005', 'PAC-005', 'Roberto Souza', 'Carga cerâmica e antagonista', now() - INTERVAL '1 hour'),
('c0000006-0000-0000-0000-000000000006', 'PAC-006', 'Camila Ferreira', 'Modelo de trabalho e placa miorrelaxante', now() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- 7. PRINT JOBS & ITEMS
-- PAC-001 (Job 1): Concluído na impressão A001
INSERT INTO public.print_jobs (id, case_id, queue_entered_at, status, priority)
VALUES ('j0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', now() - INTERVAL '5 hours', 'CONCLUIDO', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_job_items (id, print_job_id, file_type, status, retry_count, is_retry, last_run_code)
VALUES 
('i0000001-0000-0000-0000-000000000001', 'j0000001-0000-0000-0000-000000000001', 'MODELO_DE_TRABALHO', 'CONCLUIDO', 0, false, 'A001'),
('i0000002-0000-0000-0000-000000000002', 'j0000001-0000-0000-0000-000000000001', 'ANTAGONISTA', 'CONCLUIDO', 0, false, 'A001')
ON CONFLICT (id) DO NOTHING;

-- PAC-002 (Job 2): Teve impressão A002 onde Modelo de Trabalho CONCLUIU, mas ANTAGONISTA FALHOU e voltou à fila em vermelho!
INSERT INTO public.print_jobs (id, case_id, queue_entered_at, status, priority)
VALUES ('j0000002-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', now() - INTERVAL '4 hours', 'PARCIAL', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_job_items (id, print_job_id, file_type, status, retry_count, is_retry, last_failure_reason, last_run_code)
VALUES 
('i0000003-0000-0000-0000-000000000003', 'j0000002-0000-0000-0000-000000000002', 'MODELO_DE_TRABALHO', 'CONCLUIDO', 0, false, NULL, 'A002'),
('i0000004-0000-0000-0000-000000000004', 'j0000002-0000-0000-0000-000000000002', 'ANTAGONISTA', 'AGUARDANDO_FILA', 1, true, 'Descolamento da mesa de impressão na cúspide lingual', 'A002')
ON CONFLICT (id) DO NOTHING;

-- PAC-003 (Job 3): Na Fila aguardando (Modelo, Troquel, Antagonista)
INSERT INTO public.print_jobs (id, case_id, queue_entered_at, status, priority)
VALUES ('j0000003-0000-0000-0000-000000000003', 'c0000003-0000-0000-0000-000000000003', now() - INTERVAL '3 hours', 'AGUARDANDO', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_job_items (id, print_job_id, file_type, status, retry_count, is_retry)
VALUES 
('i0000005-0000-0000-0000-000000000005', 'j0000003-0000-0000-0000-000000000003', 'MODELO_DE_TRABALHO', 'AGUARDANDO_FILA', 0, false),
('i0000006-0000-0000-0000-000000000006', 'j0000003-0000-0000-0000-000000000003', 'TROQUEL', 'AGUARDANDO_FILA', 0, false),
('i0000007-0000-0000-0000-000000000007', 'j0000003-0000-0000-0000-000000000003', 'ANTAGONISTA', 'AGUARDANDO_FILA', 0, false)
ON CONFLICT (id) DO NOTHING;

-- PAC-004 (Job 4): Na Fila aguardando (Placa Miorrelaxante, Elemento para Prova)
INSERT INTO public.print_jobs (id, case_id, queue_entered_at, status, priority)
VALUES ('j0000004-0000-0000-0000-000000000004', 'c0000004-0000-0000-0000-000000000004', now() - INTERVAL '2 hours', 'AGUARDANDO', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_job_items (id, print_job_id, file_type, status, retry_count, is_retry)
VALUES 
('i0000008-0000-0000-0000-000000000008', 'j0000004-0000-0000-0000-000000000004', 'PLACA_MIORRELAXANTE', 'AGUARDANDO_FILA', 0, false),
('i0000009-0000-0000-0000-000000000009', 'j0000004-0000-0000-0000-000000000004', 'ELEMENTO_PROVA', 'AGUARDANDO_FILA', 0, false)
ON CONFLICT (id) DO NOTHING;

-- PAC-005 (Job 5): Na Fila aguardando (Elemento Provisório, Elemento Carga Cerâmica)
INSERT INTO public.print_jobs (id, case_id, queue_entered_at, status, priority)
VALUES ('j0000005-0000-0000-0000-000000000005', 'c0000005-0000-0000-0000-000000000005', now() - INTERVAL '1 hour', 'AGUARDANDO', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_job_items (id, print_job_id, file_type, status, retry_count, is_retry)
VALUES 
('i0000010-0000-0000-0000-000000000010', 'j0000005-0000-0000-0000-000000000005', 'ELEMENTO_PROVISORIO', 'AGUARDANDO_FILA', 0, false),
('i0000011-0000-0000-0000-000000000011', 'j0000005-0000-0000-0000-000000000005', 'ELEMENTO_CARGA_CERAMICA', 'AGUARDANDO_FILA', 0, false)
ON CONFLICT (id) DO NOTHING;

-- PAC-006 (Job 6): Na Fila aguardando (Modelo de Trabalho)
INSERT INTO public.print_jobs (id, case_id, queue_entered_at, status, priority)
VALUES ('j0000006-0000-0000-0000-000000000006', 'c0000006-0000-0000-0000-000000000006', now() - INTERVAL '30 minutes', 'AGUARDANDO', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_job_items (id, print_job_id, file_type, status, retry_count, is_retry)
VALUES 
('i0000012-0000-0000-0000-000000000012', 'j0000006-0000-0000-0000-000000000006', 'MODELO_DE_TRABALHO', 'AGUARDANDO_FILA', 0, false)
ON CONFLICT (id) DO NOTHING;

-- 8. PRINT RUNS EXAMPLES
-- Run A001 (Finalizada com sucesso)
INSERT INTO public.print_runs (
    id, run_code, printer_id, resin_batch_id, calibration_id,
    supports_confirmed, resin_manipulated, status, started_at, finished_at
)
VALUES (
    'r0000001-0000-0000-0000-000000000001',
    'A001',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    true, true, 'FINALIZADA',
    now() - INTERVAL '4 hours',
    now() - INTERVAL '2 hours'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_run_items (id, print_run_id, print_job_item_id, result)
VALUES 
('ri000001-0000-0000-0000-000000000001', 'r0000001-0000-0000-0000-000000000001', 'i0000001-0000-0000-0000-000000000001', 'CONCLUIDO'),
('ri000002-0000-0000-0000-000000000002', 'r0000001-0000-0000-0000-000000000001', 'i0000002-0000-0000-0000-000000000002', 'CONCLUIDO')
ON CONFLICT (id) DO NOTHING;

-- Run A002 (Finalizada com falha parcial)
INSERT INTO public.print_runs (
    id, run_code, printer_id, resin_batch_id, calibration_id,
    supports_confirmed, resin_manipulated, status, started_at, finished_at
)
VALUES (
    'r0000002-0000-0000-0000-000000000002',
    'A002',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    true, true, 'FINALIZADA',
    now() - INTERVAL '2 hours',
    now() - INTERVAL '45 minutes'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.print_run_items (id, print_run_id, print_job_item_id, result, failure_reason)
VALUES 
('ri000003-0000-0000-0000-000000000003', 'r0000002-0000-0000-0000-000000000002', 'i0000003-0000-0000-0000-000000000003', 'CONCLUIDO', NULL),
('ri000004-0000-0000-0000-000000000004', 'r0000002-0000-0000-0000-000000000002', 'i0000004-0000-0000-0000-000000000004', 'FALHOU', 'Descolamento da mesa de impressão na cúspide lingual')
ON CONFLICT (id) DO NOTHING;

-- Sincronizar sequences para o próximo código ser A003
SELECT setval('print_run_normal_seq', 2, true);
SELECT setval('print_run_retry_seq', 0, false);
