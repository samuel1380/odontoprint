import { createClient } from "@/lib/supabase/client";
import {
  Case,
  PrintJob,
  PrintJobItem,
  Printer,
  PrinterMaintenance,
  ResinBatch,
  ResinCalibration,
  PrintRun,
  PrintRunItem,
  AuditLog,
  SystemSettings,
  DentalFileType,
  ProcessType,
} from "@/types/database.types";
import {
  QueueItem,
  PatientQueueCard,
  PrinterWithStatus,
  EligibleResinOption,
  DashboardMetrics,
  CaseTimelineEvent,
} from "@/types/domain";
import {
  validateMaintenanceChecklist,
  calculatePrinterStatus,
  validateResinCalibration,
  formatPrintRunCode,
  MaintenanceChecklistInput,
  ResinCalibrationInput,
} from "@/lib/business-rules";
import { DEFAULT_SYSTEM_SETTINGS, FILE_TYPE_LABELS } from "@/lib/constants";

// ====================================================================
// INITIAL DEMO STATE (Espelha exatamente supabase/seed.sql)
// ====================================================================
let mockSettings: SystemSettings = {
  id: "s0000000-0000-0000-0000-000000000001",
  maintenance_interval_days: 7,
  calibration_hexagon_min: 9.99,
  calibration_hexagon_max: 10.01,
  normal_print_prefix: "A",
  retry_print_prefix: "00A",
  updated_at: new Date().toISOString(),
};

let mockPrinters: Printer[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Odonto Printer 01",
    brand: "Elegoo",
    model: "Saturn 3 Ultra 12K",
    serial_number: "SN-ELG-9901-BR",
    maintenance_contact: "suporte@odontoprint.com.br / (11) 98888-0001",
    active: true,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Odonto Printer 02",
    brand: "Anycubic",
    model: "Photon Mono M5s",
    serial_number: "SN-ANY-4402-SP",
    maintenance_contact: "assistencia@photonbrasil.com / (11) 97777-0002",
    active: true,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Odonto Printer 03",
    brand: "Creality",
    model: "Halot Mage Pro 8K",
    serial_number: "SN-CRE-7703-RJ",
    maintenance_contact: "manutencao@halotlab.com / (21) 96666-0003",
    active: true,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

let mockMaintenances: PrinterMaintenance[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    printer_id: "11111111-1111-1111-1111-111111111111",
    performed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    leveling_ok: true,
    cleaning_ok: true,
    fep_integrity_ok: true,
    led_integrity_ok: true,
    black_points_led: false,
    low_led_luminosity: false,
    protective_film_ok: true,
    notes: "Manutenção preventiva semanal realizada. FEP novo instalado.",
    approved: true,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    printer_id: "22222222-2222-2222-2222-222222222222",
    performed_at: new Date(Date.now() - 10 * 86400000).toISOString(), // > 7 dias atrás = VENCIDA!
    leveling_ok: true,
    cleaning_ok: true,
    fep_integrity_ok: true,
    led_integrity_ok: true,
    black_points_led: false,
    low_led_luminosity: false,
    protective_film_ok: true,
    notes: "Manutenção anterior estava OK, porém venceu há 3 dias.",
    approved: true,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    printer_id: "33333333-3333-3333-3333-333333333333",
    performed_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    leveling_ok: true,
    cleaning_ok: true,
    fep_integrity_ok: false,
    led_integrity_ok: false,
    black_points_led: true, // REPROVADA!
    low_led_luminosity: true,
    protective_film_ok: false,
    notes: "FEP riscado e pontos pretos identificados no centro do painel LED.",
    approved: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

let mockResinBatches: ResinBatch[] = [
  {
    id: "44444444-4444-4444-4444-444444444444",
    brand: "PriZma 3D Bio",
    resin_type: "Model Precision Beige",
    lot: "BIO-2026-A",
    volume: 1000,
    volume_unit: "ml",
    received_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    status: "CALIBRADA",
    active: true,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    brand: "Smart Print",
    resin_type: "Denture Gingiva Pink",
    lot: "SPD-9921-B",
    volume: 1000,
    volume_unit: "ml",
    received_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: "AGUARDANDO_CALIBRACAO",
    active: true,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    brand: "Cosmos Castable",
    resin_type: "Castable Resin Direct Burnout",
    lot: "CC-1044-C",
    volume: 500,
    volume_unit: "ml",
    received_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    status: "REPROVADA",
    active: true,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

let mockCalibrations: ResinCalibration[] = [
  {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    resin_batch_id: "44444444-4444-4444-4444-444444444444",
    printer_id: "11111111-1111-1111-1111-111111111111",
    calibration_number: 1,
    initial_exposure_time: 25.0,
    exposure_time: 2.3,
    lift_speed: 60.0,
    layer_height: 0.05,
    hexagon_size_mm: 10.0,
    lines_visible: true,
    numbers_visible: true,
    details_visible: true,
    wash_time: 5.0,
    cure_time: 10.0,
    status: "APROVADA",
    finalized_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    resin_batch_id: "66666666-6666-6666-6666-666666666666",
    printer_id: "11111111-1111-1111-1111-111111111111",
    calibration_number: 1,
    initial_exposure_time: 30.0,
    exposure_time: 2.9,
    lift_speed: 50.0,
    layer_height: 0.05,
    hexagon_size_mm: 10.04, // Fora do intervalo!
    lines_visible: false,
    numbers_visible: true,
    details_visible: false,
    wash_time: 5.0,
    cure_time: 15.0,
    status: "REPROVADA",
    finalized_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

let mockCases: Case[] = [
  {
    id: "c0000001-0000-0000-0000-000000000001",
    patient_code: "PAC-001",
    patient_name: "João Silva",
    notes: "Prótese Fixa sobre implantes elemento 14 a 16",
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "c0000002-0000-0000-0000-000000000002",
    patient_code: "PAC-002",
    patient_name: "Maria Oliveira",
    notes: "Placa de bruxismo superior + modelo de estudo",
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: "c0000003-0000-0000-0000-000000000003",
    patient_code: "PAC-003",
    patient_name: "Carlos Eduardo",
    notes: "Troquel múltiplo e modelo de trabalho",
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "c0000004-0000-0000-0000-000000000004",
    patient_code: "PAC-004",
    patient_name: "Ana Paula Santos",
    notes: "Prova estética e provisórios dentes anteriores",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "c0000005-0000-0000-0000-000000000005",
    patient_code: "PAC-005",
    patient_name: "Roberto Souza",
    notes: "Carga cerâmica e antagonista",
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: "c0000006-0000-0000-0000-000000000006",
    patient_code: "PAC-006",
    patient_name: "Camila Ferreira",
    notes: "Modelo de trabalho e placa miorrelaxante",
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
];

let mockPrintJobs: PrintJob[] = [
  {
    id: "j0000001-0000-0000-0000-000000000001",
    case_id: "c0000001-0000-0000-0000-000000000001",
    queue_entered_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    status: "CONCLUIDO",
    priority: 1,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "j0000002-0000-0000-0000-000000000002",
    case_id: "c0000002-0000-0000-0000-000000000002",
    queue_entered_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    status: "PARCIAL",
    priority: 2,
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: "j0000003-0000-0000-0000-000000000003",
    case_id: "c0000003-0000-0000-0000-000000000003",
    queue_entered_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    status: "AGUARDANDO",
    priority: 1,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "j0000004-0000-0000-0000-000000000004",
    case_id: "c0000004-0000-0000-0000-000000000004",
    queue_entered_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: "AGUARDANDO",
    priority: 1,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "j0000005-0000-0000-0000-000000000005",
    case_id: "c0000005-0000-0000-0000-000000000005",
    queue_entered_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    status: "AGUARDANDO",
    priority: 1,
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: "j0000006-0000-0000-0000-000000000006",
    case_id: "c0000006-0000-0000-0000-000000000006",
    queue_entered_at: new Date(Date.now() - 30 * 60000).toISOString(),
    status: "AGUARDANDO",
    priority: 1,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
];

let mockPrintJobItems: PrintJobItem[] = [
  // PAC-001 (Concluídos)
  {
    id: "i0000001-0000-0000-0000-000000000001",
    print_job_id: "j0000001-0000-0000-0000-000000000001",
    file_type: "MODELO_DE_TRABALHO",
    status: "CONCLUIDO",
    retry_count: 0,
    is_retry: false,
    last_run_code: "A001",
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "i0000002-0000-0000-0000-000000000002",
    print_job_id: "j0000001-0000-0000-0000-000000000001",
    file_type: "ANTAGONISTA",
    status: "CONCLUIDO",
    retry_count: 0,
    is_retry: false,
    last_run_code: "A001",
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },

  // PAC-002: Modelo concluiu na A002, mas Antagonista FALHOU e voltou à fila em destaque vermelho!
  {
    id: "i0000003-0000-0000-0000-000000000003",
    print_job_id: "j0000002-0000-0000-0000-000000000002",
    file_type: "MODELO_DE_TRABALHO",
    status: "CONCLUIDO",
    retry_count: 0,
    is_retry: false,
    last_run_code: "A002",
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: "i0000004-0000-0000-0000-000000000004",
    print_job_id: "j0000002-0000-0000-0000-000000000002",
    file_type: "ANTAGONISTA",
    status: "AGUARDANDO_FILA",
    retry_count: 1,
    is_retry: true,
    last_failure_reason: "Descolamento da mesa de impressão na cúspide lingual",
    last_run_code: "A002",
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },

  // PAC-003: Na fila
  {
    id: "i0000005-0000-0000-0000-000000000005",
    print_job_id: "j0000003-0000-0000-0000-000000000003",
    file_type: "MODELO_DE_TRABALHO",
    status: "AGUARDANDO_FILA",
    retry_count: 0,
    is_retry: false,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "i0000006-0000-0000-0000-000000000006",
    print_job_id: "j0000003-0000-0000-0000-000000000003",
    file_type: "TROQUEL",
    status: "AGUARDANDO_FILA",
    retry_count: 0,
    is_retry: false,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "i0000007-0000-0000-0000-000000000007",
    print_job_id: "j0000003-0000-0000-0000-000000000003",
    file_type: "ANTAGONISTA",
    status: "AGUARDANDO_FILA",
    retry_count: 0,
    is_retry: false,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },

  // PAC-004: Na fila
  {
    id: "i0000008-0000-0000-0000-000000000008",
    print_job_id: "j0000004-0000-0000-0000-000000000004",
    file_type: "PLACA_MIORRELAXANTE",
    status: "AGUARDANDO_FILA",
    retry_count: 0,
    is_retry: false,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "i0000009-0000-0000-0000-000000000009",
    print_job_id: "j0000004-0000-0000-0000-000000000004",
    file_type: "ELEMENTO_PROVA",
    status: "AGUARDANDO_FILA",
    retry_count: 0,
    is_retry: false,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },

  // PAC-005: Na fila
  {
    id: "i0000010-0000-0000-0000-000000000010",
    print_job_id: "j0000005-0000-0000-0000-000000000005",
    file_type: "ELEMENTO_PROVISORIO",
    status: "AGUARDANDO_FILA",
    retry_count: 0,
    is_retry: false,
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: "i0000011-0000-0000-0000-000000000011",
    print_job_id: "j0000005-0000-0000-0000-000000000005",
    file_type: "ELEMENTO_CARGA_CERAMICA",
    status: "AGUARDANDO_FILA",
    retry_count: 0,
    is_retry: false,
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
  },

  // PAC-006: Na fila
  {
    id: "i0000012-0000-0000-0000-000000000012",
    print_job_id: "j0000006-0000-0000-0000-000000000006",
    file_type: "MODELO_DE_TRABALHO",
    status: "AGUARDANDO_FILA",
    retry_count: 0,
    is_retry: false,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
];

let mockPrintRuns: PrintRun[] = [
  {
    id: "r0000001-0000-0000-0000-000000000001",
    run_code: "A001",
    printer_id: "11111111-1111-1111-1111-111111111111",
    resin_batch_id: "44444444-4444-4444-4444-444444444444",
    calibration_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    supports_confirmed: true,
    resin_manipulated: true,
    status: "FINALIZADA",
    started_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    finished_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: "r0000002-0000-0000-0000-000000000002",
    run_code: "A002",
    printer_id: "11111111-1111-1111-1111-111111111111",
    resin_batch_id: "44444444-4444-4444-4444-444444444444",
    calibration_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    supports_confirmed: true,
    resin_manipulated: true,
    status: "FINALIZADA",
    started_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    finished_at: new Date(Date.now() - 45 * 60000).toISOString(),
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

let mockPrintRunItems: PrintRunItem[] = [
  {
    id: "ri000001-0000-0000-0000-000000000001",
    print_run_id: "r0000001-0000-0000-0000-000000000001",
    print_job_item_id: "i0000001-0000-0000-0000-000000000001",
    result: "CONCLUIDO",
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: "ri000002-0000-0000-0000-000000000002",
    print_run_id: "r0000001-0000-0000-0000-000000000001",
    print_job_item_id: "i0000002-0000-0000-0000-000000000002",
    result: "CONCLUIDO",
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: "ri000003-0000-0000-0000-000000000003",
    print_run_id: "r0000002-0000-0000-0000-000000000002",
    print_job_item_id: "i0000003-0000-0000-0000-000000000003",
    result: "CONCLUIDO",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "ri000004-0000-0000-0000-000000000004",
    print_run_id: "r0000002-0000-0000-0000-000000000002",
    print_job_item_id: "i0000004-0000-0000-0000-000000000004",
    result: "FALHOU",
    failure_reason: "Descolamento da mesa de impressão na cúspide lingual",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

let mockAuditLogs: AuditLog[] = [
  {
    id: "l0000001-0000-0000-0000-000000000001",
    action: "ITEM_REIMPRESSAO",
    entity_type: "print_job_items",
    entity_id: "i0000004-0000-0000-0000-000000000004",
    new_data: {
      patient_code: "PAC-002",
      item: "Antagonista",
      run_code: "A002",
      reason: "Descolamento da mesa de impressão na cúspide lingual",
    },
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: "l0000002-0000-0000-0000-000000000002",
    action: "IMPRESSAO_FINALIZADA",
    entity_type: "print_runs",
    entity_id: "r0000002-0000-0000-0000-000000000002",
    new_data: { run_code: "A002", completed: 1, failed: 1 },
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: "l0000003-0000-0000-0000-000000000003",
    action: "IMPRESSAO_INICIADA",
    entity_type: "print_runs",
    entity_id: "r0000002-0000-0000-0000-000000000002",
    new_data: { run_code: "A002", printer: "Odonto Printer 01", items_count: 2 },
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "l0000004-0000-0000-0000-000000000004",
    action: "MANUTENCAO_REPROVADA",
    entity_type: "printers",
    entity_id: "33333333-3333-3333-3333-333333333333",
    new_data: { printer: "Odonto Printer 03", reason: "Pontos pretos e baixa luminosidade no LED" },
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: "l0000005-0000-0000-0000-000000000005",
    action: "RESINA_CALIBRADA",
    entity_type: "resin_calibrations",
    entity_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    new_data: { batch: "BIO-2026-A", printer: "Odonto Printer 01", hex: 10.0 },
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
];

let normalSeqCounter = 2;
let retrySeqCounter = 0;

// ====================================================================
// ODONTOPRINT SERVICE CLASS
// ====================================================================
export class OdontoPrintService {
  private static getSupabase() {
    return createClient();
  }

  // --- SETTINGS ---
  static async getSettings(): Promise<SystemSettings> {
    const { client, isConfigured } = this.getSupabase();
    if (isConfigured && client) {
      const { data } = await client.from("system_settings").select("*").limit(1).single();
      if (data) return data;
    }
    return mockSettings;
  }

  static async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    mockSettings = {
      ...mockSettings,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    const { client, isConfigured } = this.getSupabase();
    if (isConfigured && client) {
      await client.from("system_settings").update(settings).eq("id", mockSettings.id);
    }
    return mockSettings;
  }

  // --- CASISTA: CRIAR CASO / TRABALHO ---
  static async createCadistaCase(params: {
    patient_code: string;
    patient_name?: string;
    notes?: string;
    process_type: ProcessType;
    selected_files: DentalFileType[];
    user_id?: string;
  }): Promise<{ success: boolean; case_id: string; job_id: string; error?: string }> {
    // REGRA FUNDAMENTAL: Se nenhum item for selecionado, NÃO criar
    if (!params.selected_files || params.selected_files.length === 0) {
      return {
        success: false,
        case_id: "",
        job_id: "",
        error: "Selecione pelo menos um arquivo para continuar.",
      };
    }

    const cleanCode = params.patient_code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, case_id: "", job_id: "", error: "O código do paciente/trabalho é obrigatório." };
    }

    const caseId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newCase: Case = {
      id: caseId,
      patient_code: cleanCode,
      patient_name: params.patient_name?.trim() || null,
      notes: params.notes?.trim() || null,
      created_by: params.user_id || null,
      created_at: now,
    };

    const newJob: PrintJob = {
      id: jobId,
      case_id: caseId,
      source_status_event_id: eventId,
      queue_entered_at: now,
      status: "AGUARDANDO",
      priority: 1,
      created_by: params.user_id || null,
      created_at: now,
    };

    const newItems: PrintJobItem[] = params.selected_files.map((fileType) => ({
      id: crypto.randomUUID(),
      print_job_id: jobId,
      file_type: fileType,
      status: "AGUARDANDO_FILA",
      retry_count: 0,
      is_retry: false,
      created_at: now,
    }));

    // Persist in mock state
    mockCases.unshift(newCase);
    mockPrintJobs.unshift(newJob);
    mockPrintJobItems.unshift(...newItems);

    // Audit log
    mockAuditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: params.user_id || null,
      action: "TRABALHO_CRIADO",
      entity_type: "cases",
      entity_id: caseId,
      new_data: {
        patient_code: cleanCode,
        process_type: params.process_type,
        items: params.selected_files.map((f) => FILE_TYPE_LABELS[f]),
      },
      created_at: now,
    });

    // If live Supabase is connected, persist to DB
    const { client, isConfigured } = this.getSupabase();
    if (isConfigured && client) {
      try {
        await client.from("cases").insert(newCase);
        await client.from("case_status_events").insert({
          id: eventId,
          case_id: caseId,
          process_type: params.process_type,
          notes: params.notes || null,
          created_by: params.user_id || null,
          created_at: now,
        });
        await client.from("print_jobs").insert(newJob);
        await client.from("print_job_items").insert(newItems);
      } catch (err) {
        console.warn("Supabase insert error (fallback preserved):", err);
      }
    }

    return { success: true, case_id: caseId, job_id: jobId };
  }

  // --- FILA DE IMPRESSÃO (FIFO) ---
  static async getQueue(): Promise<{ items: QueueItem[]; cards: PatientQueueCard[] }> {
    const settings = await this.getSettings();

    // Filtra itens aguardando na fila
    const waitingItems = mockPrintJobItems.filter((i) => i.status === "AGUARDANDO_FILA");

    // Enriquece com dados do job e caso
    const enriched: QueueItem[] = waitingItems.map((item) => {
      const job = mockPrintJobs.find((j) => j.id === item.print_job_id);
      const caseItem = job ? mockCases.find((c) => c.id === job.case_id) : null;
      const enteredAt = job?.queue_entered_at || item.created_at;
      const waitSeconds = Math.max(0, Math.floor((Date.now() - new Date(enteredAt).getTime()) / 1000));

      return {
        id: item.id,
        print_job_id: item.print_job_id,
        case_id: caseItem?.id || "",
        patient_code: caseItem?.patient_code || "PAC-???",
        patient_name: caseItem?.patient_name || null,
        file_type: item.file_type,
        status: item.status,
        retry_count: item.retry_count,
        is_retry: item.is_retry,
        last_failure_reason: item.last_failure_reason || null,
        last_run_code: item.last_run_code || null,
        queue_entered_at: enteredAt,
        wait_seconds: waitSeconds,
        priority: job?.priority || 1,
      };
    });

    // Ordenação FIFO: primeiro quem entrou primeiro (queue_entered_at asc), com prioridade para reimpressões
    enriched.sort((a, b) => {
      if (a.is_retry !== b.is_retry) return a.is_retry ? -1 : 1;
      return new Date(a.queue_entered_at).getTime() - new Date(b.queue_entered_at).getTime();
    });

    // Agrupa em cards de paciente
    const cardsMap = new Map<string, PatientQueueCard>();
    for (const item of enriched) {
      if (!cardsMap.has(item.case_id)) {
        cardsMap.set(item.case_id, {
          case_id: item.case_id,
          patient_code: item.patient_code,
          patient_name: item.patient_name,
          queue_entered_at: item.queue_entered_at,
          items: [],
        });
      }
      cardsMap.get(item.case_id)!.items.push(item);
    }

    const cards = Array.from(cardsMap.values());
    return { items: enriched, cards };
  }

  // --- IMPRESSORAS E MANUTENÇÕES ---
  static async getPrinters(): Promise<PrinterWithStatus[]> {
    const settings = await this.getSettings();

    return mockPrinters.map((printer) => {
      const printerMaint = mockMaintenances
        .filter((m) => m.printer_id === printer.id)
        .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());

      const latest = printerMaint[0] || null;
      const statusInfo = calculatePrinterStatus(printer, latest, settings.maintenance_interval_days);

      return {
        ...printer,
        latest_maintenance: latest,
        days_since_maintenance: statusInfo.daysSince,
        calculated_status: statusInfo.status,
        is_eligible_for_print: statusInfo.isEligible,
      };
    });
  }

  static async getPrinterById(id: string): Promise<{
    printer: PrinterWithStatus | null;
    maintenances: PrinterMaintenance[];
  }> {
    const printers = await this.getPrinters();
    const printer = printers.find((p) => p.id === id) || null;
    const maintenances = mockMaintenances
      .filter((m) => m.printer_id === id)
      .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());

    return { printer, maintenances };
  }

  static async createPrinter(params: Omit<Printer, "id" | "created_at" | "updated_at">): Promise<Printer> {
    const newPrinter: Printer = {
      id: crypto.randomUUID(),
      ...params,
      created_at: new Date().toISOString(),
    };
    mockPrinters.push(newPrinter);
    return newPrinter;
  }

  static async addPrinterMaintenance(params: {
    printer_id: string;
    checklist: MaintenanceChecklistInput;
    notes?: string;
    performed_by?: string;
  }): Promise<{ success: boolean; maintenance: PrinterMaintenance; approved: boolean }> {
    const approved = validateMaintenanceChecklist(params.checklist);
    const now = new Date().toISOString();

    const newMaint: PrinterMaintenance = {
      id: crypto.randomUUID(),
      printer_id: params.printer_id,
      performed_at: now,
      leveling_ok: params.checklist.leveling_ok,
      cleaning_ok: params.checklist.cleaning_ok,
      fep_integrity_ok: params.checklist.fep_integrity_ok,
      led_integrity_ok: params.checklist.led_integrity_ok,
      black_points_led: params.checklist.black_points_led,
      low_led_luminosity: params.checklist.low_led_luminosity,
      protective_film_ok: params.checklist.protective_film_ok,
      notes: params.notes || null,
      approved,
      performed_by: params.performed_by || null,
      created_at: now,
    };

    mockMaintenances.unshift(newMaint);

    const printer = mockPrinters.find((p) => p.id === params.printer_id);
    mockAuditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: params.performed_by || null,
      action: approved ? "MANUTENCAO_APROVADA" : "MANUTENCAO_REPROVADA",
      entity_type: "printers",
      entity_id: params.printer_id,
      new_data: {
        printer_name: printer?.name,
        approved,
        notes: params.notes,
      },
      created_at: now,
    });

    return { success: true, maintenance: newMaint, approved };
  }

  // --- RESINAS E CALIBRAÇÕES ---
  static async getResinBatches(): Promise<ResinBatch[]> {
    return [...mockResinBatches].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  }

  static async getResinBatchById(id: string): Promise<{
    batch: ResinBatch | null;
    calibrations: (ResinCalibration & { printer_name?: string })[];
  }> {
    const batch = mockResinBatches.find((b) => b.id === id) || null;
    const calibrations = mockCalibrations
      .filter((c) => c.resin_batch_id === id)
      .sort((a, b) => b.calibration_number - a.calibration_number)
      .map((c) => ({
        ...c,
        printer_name: mockPrinters.find((p) => p.id === c.printer_id)?.name,
      }));

    return { batch, calibrations };
  }

  static async createResinBatch(params: {
    brand: string;
    resin_type: string;
    lot: string;
    volume: number;
    volume_unit?: string;
    notes?: string;
    created_by?: string;
  }): Promise<ResinBatch> {
    const now = new Date().toISOString();
    const newBatch: ResinBatch = {
      id: crypto.randomUUID(),
      brand: params.brand.trim(),
      resin_type: params.resin_type.trim(),
      lot: params.lot.trim().toUpperCase(),
      volume: params.volume,
      volume_unit: params.volume_unit || "ml",
      received_at: now,
      status: "AGUARDANDO_CALIBRACAO",
      active: true,
      created_by: params.created_by || null,
      created_at: now,
    };

    mockResinBatches.unshift(newBatch);

    mockAuditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: params.created_by || null,
      action: "RECEBIMENTO_RESINA",
      entity_type: "resin_batches",
      entity_id: newBatch.id,
      new_data: { brand: newBatch.brand, type: newBatch.resin_type, lot: newBatch.lot },
      created_at: now,
    });

    return newBatch;
  }

  static async getCalibrations(): Promise<(ResinCalibration & { resin_brand: string; resin_lot: string; printer_name: string })[]> {
    return mockCalibrations.map((cal) => {
      const batch = mockResinBatches.find((b) => b.id === cal.resin_batch_id);
      const printer = mockPrinters.find((p) => p.id === cal.printer_id);
      return {
        ...cal,
        resin_brand: batch ? `${batch.brand} (${batch.resin_type})` : "Desconhecida",
        resin_lot: batch ? batch.lot : "—",
        printer_name: printer ? printer.name : "Desconhecida",
      };
    });
  }

  static async registerCalibrationAttempt(params: {
    resin_batch_id: string;
    printer_id: string;
    initial_exposure_time: number;
    exposure_time: number;
    lift_speed: number;
    layer_height: number;
    hexagon_size_mm: number;
    lines_visible: boolean;
    numbers_visible: boolean;
    details_visible: boolean;
    wash_time: number;
    cure_time: number;
    created_by?: string;
  }): Promise<{
    success: boolean;
    approved: boolean;
    calibration: ResinCalibration;
    errorReason?: string;
  }> {
    const settings = await this.getSettings();
    const validation = validateResinCalibration({
      hexagon_size_mm: params.hexagon_size_mm,
      lines_visible: params.lines_visible,
      numbers_visible: params.numbers_visible,
      details_visible: params.details_visible,
      minHex: settings.calibration_hexagon_min,
      maxHex: settings.calibration_hexagon_max,
    });

    // Conta calibrações existentes para essa combinação resina + impressora
    const existing = mockCalibrations.filter(
      (c) => c.resin_batch_id === params.resin_batch_id && c.printer_id === params.printer_id
    );
    const nextNumber = existing.length + 1;
    const now = new Date().toISOString();

    const newCal: ResinCalibration = {
      id: crypto.randomUUID(),
      resin_batch_id: params.resin_batch_id,
      printer_id: params.printer_id,
      calibration_number: nextNumber,
      initial_exposure_time: params.initial_exposure_time,
      exposure_time: params.exposure_time,
      lift_speed: params.lift_speed,
      layer_height: params.layer_height,
      hexagon_size_mm: params.hexagon_size_mm,
      lines_visible: params.lines_visible,
      numbers_visible: params.numbers_visible,
      details_visible: params.details_visible,
      wash_time: params.wash_time,
      cure_time: params.cure_time,
      status: validation.approved ? "APROVADA" : "REPROVADA",
      finalized_at: validation.approved ? now : null,
      created_by: params.created_by || null,
      created_at: now,
    };

    mockCalibrations.unshift(newCal);

    // Se aprovada, marca o lote como CALIBRADA
    if (validation.approved) {
      const batch = mockResinBatches.find((b) => b.id === params.resin_batch_id);
      if (batch) {
        batch.status = "CALIBRADA";
      }
    }

    mockAuditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: params.created_by || null,
      action: validation.approved ? "CALIBRACAO_APROVADA" : "CALIBRACAO_REPROVADA",
      entity_type: "resin_calibrations",
      entity_id: newCal.id,
      new_data: {
        attempt: nextNumber,
        hex: params.hexagon_size_mm,
        approved: validation.approved,
        reason: validation.errorReason,
      },
      created_at: now,
    });

    return {
      success: true,
      approved: validation.approved,
      calibration: newCal,
      errorReason: validation.errorReason,
    };
  }

  // --- FATIADOR: OPÇÕES ELEGÍVEIS ---
  static async getEligibleOptions(): Promise<{
    printers: PrinterWithStatus[];
    resins: EligibleResinOption[];
  }> {
    const allPrinters = await this.getPrinters();
    const eligiblePrinters = allPrinters.filter((p) => p.is_eligible_for_print);

    // Resinas com calibração aprovada
    const approvedCalibrations = mockCalibrations.filter((c) => c.status === "APROVADA");
    const resins: EligibleResinOption[] = [];

    for (const cal of approvedCalibrations) {
      const batch = mockResinBatches.find((b) => b.id === cal.resin_batch_id && b.active);
      if (batch) {
        resins.push({
          resin_batch_id: batch.id,
          brand: batch.brand,
          resin_type: batch.resin_type,
          lot: batch.lot,
          volume: batch.volume,
          volume_unit: batch.volume_unit,
          calibration_id: cal.id,
          calibration_number: cal.calibration_number,
          layer_height: cal.layer_height,
          exposure_time: cal.exposure_time,
          printer_id: cal.printer_id,
          finalized_at: cal.finalized_at,
        });
      }
    }

    return {
      printers: eligiblePrinters,
      resins,
    };
  }

  // --- NOMENCLATURA E EXECUÇÃO DE IMPRESSÃO ---
  static async generatePrintCode(hasRetry: boolean): Promise<string> {
    const settings = await this.getSettings();
    if (hasRetry) {
      retrySeqCounter += 1;
      return formatPrintRunCode(retrySeqCounter, true, settings.normal_print_prefix, settings.retry_print_prefix);
    } else {
      normalSeqCounter += 1;
      return formatPrintRunCode(normalSeqCounter, false, settings.normal_print_prefix, settings.retry_print_prefix);
    }
  }

  static async startPrintRun(params: {
    run_code: string;
    printer_id: string;
    resin_batch_id: string;
    calibration_id: string;
    item_ids: string[];
    supports_confirmed: boolean;
    resin_manipulated: boolean;
    user_id?: string;
  }): Promise<{ success: boolean; run: PrintRun; error?: string }> {
    if (!params.supports_confirmed || !params.resin_manipulated) {
      return { success: false, run: null as any, error: "As verificações pré-impressão devem ser confirmadas." };
    }
    if (!params.item_ids || params.item_ids.length === 0) {
      return { success: false, run: null as any, error: "Nenhum modelo selecionado para impressão." };
    }

    const now = new Date().toISOString();
    const newRun: PrintRun = {
      id: crypto.randomUUID(),
      run_code: params.run_code,
      printer_id: params.printer_id,
      resin_batch_id: params.resin_batch_id,
      calibration_id: params.calibration_id,
      supports_confirmed: params.supports_confirmed,
      resin_manipulated: params.resin_manipulated,
      status: "EM_IMPRESSAO",
      started_at: now,
      created_by: params.user_id || null,
      created_at: now,
    };

    mockPrintRuns.unshift(newRun);

    // Vincula itens à impressão e atualiza status para EM_IMPRESSAO
    for (const itemId of params.item_ids) {
      mockPrintRunItems.push({
        id: crypto.randomUUID(),
        print_run_id: newRun.id,
        print_job_item_id: itemId,
        result: "PENDENTE",
        created_at: now,
      });

      const item = mockPrintJobItems.find((i) => i.id === itemId);
      if (item) {
        item.status = "EM_IMPRESSAO";
        item.last_run_code = params.run_code;
      }
    }

    const printer = mockPrinters.find((p) => p.id === params.printer_id);
    mockAuditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: params.user_id || null,
      action: "IMPRESSAO_INICIADA",
      entity_type: "print_runs",
      entity_id: newRun.id,
      new_data: {
        run_code: params.run_code,
        printer: printer?.name,
        items_count: params.item_ids.length,
      },
      created_at: now,
    });

    return { success: true, run: newRun };
  }

  static async finalizePrintRun(params: {
    run_id: string;
    failed_items: { item_id: string; reason?: string }[];
    user_id?: string;
  }): Promise<{ success: boolean; completed_count: number; failed_count: number; error?: string }> {
    const run = mockPrintRuns.find((r) => r.id === params.run_id);
    if (!run) return { success: false, completed_count: 0, failed_count: 0, error: "Impressão não encontrada." };
    if (run.status === "FINALIZADA") {
      return { success: false, completed_count: 0, failed_count: 0, error: "Esta impressão já foi finalizada." };
    }

    const now = new Date().toISOString();
    run.status = "FINALIZADA";
    run.finished_at = now;

    const runItems = mockPrintRunItems.filter((ri) => ri.print_run_id === run.id);
    const failedMap = new Map(params.failed_items.map((f) => [f.item_id, f.reason]));

    let completedCount = 0;
    let failedCount = 0;

    for (const ri of runItems) {
      const jobItem = mockPrintJobItems.find((i) => i.id === ri.print_job_item_id);
      if (!jobItem) continue;

      if (failedMap.has(jobItem.id)) {
        // FALHOU: Volta para fila em vermelho como REIMPRESSÃO
        failedCount++;
        const failureReason = failedMap.get(jobItem.id) || "Falha não especificada na impressão";
        ri.result = "FALHOU";
        ri.failure_reason = failureReason;

        jobItem.status = "AGUARDANDO_FILA";
        jobItem.retry_count += 1;
        jobItem.is_retry = true;
        jobItem.last_failure_reason = failureReason;
        jobItem.last_run_code = run.run_code;

        mockAuditLogs.unshift({
          id: crypto.randomUUID(),
          user_id: params.user_id || null,
          action: "ITEM_REIMPRESSAO",
          entity_type: "print_job_items",
          entity_id: jobItem.id,
          new_data: {
            item_type: FILE_TYPE_LABELS[jobItem.file_type],
            run_code: run.run_code,
            retry_count: jobItem.retry_count,
            reason: failureReason,
          },
          created_at: now,
        });
      } else {
        // CONCLUÍDO
        completedCount++;
        ri.result = "CONCLUIDO";
        jobItem.status = "CONCLUIDO";

        mockAuditLogs.unshift({
          id: crypto.randomUUID(),
          user_id: params.user_id || null,
          action: "ITEM_CONCLUIDO",
          entity_type: "print_job_items",
          entity_id: jobItem.id,
          new_data: {
            item_type: FILE_TYPE_LABELS[jobItem.file_type],
            run_code: run.run_code,
          },
          created_at: now,
        });
      }

      // Atualiza status do job pai
      const parentJob = mockPrintJobs.find((j) => j.id === jobItem.print_job_id);
      if (parentJob) {
        const siblingItems = mockPrintJobItems.filter((i) => i.print_job_id === parentJob.id);
        const allCompleted = siblingItems.every((i) => i.status === "CONCLUIDO");
        parentJob.status = allCompleted ? "CONCLUIDO" : "PARCIAL";
      }
    }

    mockAuditLogs.unshift({
      id: crypto.randomUUID(),
      user_id: params.user_id || null,
      action: "IMPRESSAO_FINALIZADA",
      entity_type: "print_runs",
      entity_id: run.id,
      new_data: {
        run_code: run.run_code,
        completed: completedCount,
        failed: failedCount,
      },
      created_at: now,
    });

    return { success: true, completed_count: completedCount, failed_count: failedCount };
  }

  static async getPrintRuns(): Promise<(PrintRun & { printer_name: string; resin_brand: string; items_count: number })[]> {
    return mockPrintRuns.map((r) => {
      const printer = mockPrinters.find((p) => p.id === r.printer_id);
      const batch = mockResinBatches.find((b) => b.id === r.resin_batch_id);
      const itemsCount = mockPrintRunItems.filter((ri) => ri.print_run_id === r.id).length;
      return {
        ...r,
        printer_name: printer?.name || "Desconhecida",
        resin_brand: batch ? `${batch.brand} (${batch.resin_type})` : "Desconhecida",
        items_count: itemsCount,
      };
    });
  }

  static async getPrintRunById(id: string) {
    const run = mockPrintRuns.find((r) => r.id === id);
    if (!run) return null;

    const printer = mockPrinters.find((p) => p.id === run.printer_id);
    const batch = mockResinBatches.find((b) => b.id === run.resin_batch_id);
    const calibration = mockCalibrations.find((c) => c.id === run.calibration_id);

    const runItems = mockPrintRunItems.filter((ri) => ri.print_run_id === run.id);
    const itemsEnriched = runItems.map((ri) => {
      const jobItem = mockPrintJobItems.find((i) => i.id === ri.print_job_item_id);
      const job = jobItem ? mockPrintJobs.find((j) => j.id === jobItem.print_job_id) : null;
      const caseItem = job ? mockCases.find((c) => c.id === job.case_id) : null;

      return {
        ...ri,
        file_type: jobItem?.file_type || ("MODELO_DE_TRABALHO" as DentalFileType),
        retry_count: jobItem?.retry_count || 0,
        patient_code: caseItem?.patient_code || "PAC-???",
        patient_name: caseItem?.patient_name || null,
      };
    });

    return {
      ...run,
      printer,
      batch,
      calibration,
      items: itemsEnriched,
    };
  }

  // --- HISTÓRICO & TIMELINE ---
  static async getHistory(filters?: {
    search?: string;
    status?: string;
  }): Promise<{
    cases: (Case & { items_count: number; status: string; completed_count: number })[];
  }> {
    const query = filters?.search?.toLowerCase().trim() || "";

    const results = mockCases
      .map((c) => {
        const jobs = mockPrintJobs.filter((j) => j.case_id === c.id);
        const jobIds = new Set(jobs.map((j) => j.id));
        const items = mockPrintJobItems.filter((i) => jobIds.has(i.print_job_id));
        const completed = items.filter((i) => i.status === "CONCLUIDO").length;

        let generalStatus = "AGUARDANDO";
        if (items.length > 0 && completed === items.length) generalStatus = "CONCLUIDO";
        else if (items.some((i) => i.is_retry)) generalStatus = "REIMPRESSAO";
        else if (items.some((i) => i.status === "EM_IMPRESSAO")) generalStatus = "EM_IMPRESSAO";

        return {
          ...c,
          items_count: items.length,
          status: generalStatus,
          completed_count: completed,
        };
      })
      .filter((c) => {
        if (!query) return true;
        return (
          c.patient_code.toLowerCase().includes(query) ||
          (c.patient_name && c.patient_name.toLowerCase().includes(query)) ||
          (c.notes && c.notes.toLowerCase().includes(query))
        );
      });

    return { cases: results };
  }

  static async getCaseTimeline(caseId: string): Promise<{
    caseData: Case | null;
    items: PrintJobItem[];
    timeline: CaseTimelineEvent[];
  }> {
    const c = mockCases.find((x) => x.id === caseId) || null;
    if (!c) return { caseData: null, items: [], timeline: [] };

    const jobs = mockPrintJobs.filter((j) => j.case_id === caseId);
    const jobIds = new Set(jobs.map((j) => j.id));
    const items = mockPrintJobItems.filter((i) => jobIds.has(i.print_job_id));

    const timeline: CaseTimelineEvent[] = [];

    // 1. Criação
    timeline.push({
      id: `created-${c.id}`,
      timestamp: c.created_at,
      title: "Trabalho Cadastrado pelo Cadista",
      description: `Código do paciente ${c.patient_code} registrado. ${items.length} modelos odontológicos solicitados.`,
      type: "CREATED",
      badgeColor: "bg-blue-100 text-blue-800",
    });

    // 2. Fila
    for (const job of jobs) {
      timeline.push({
        id: `queued-${job.id}`,
        timestamp: job.queue_entered_at,
        title: "Entrada na Fila de Impressão (FIFO)",
        description: `Arquivos posicionados na fila prioritária de impressão.`,
        type: "QUEUED",
        badgeColor: "bg-cyan-100 text-cyan-800",
      });
    }

    // 3. Impressões vinculadas aos itens
    const itemIds = new Set(items.map((i) => i.id));
    const runItems = mockPrintRunItems.filter((ri) => itemIds.has(ri.print_job_item_id));

    for (const ri of runItems) {
      const run = mockPrintRuns.find((r) => r.id === ri.print_run_id);
      const item = items.find((i) => i.id === ri.print_job_item_id);
      const printer = run ? mockPrinters.find((p) => p.id === run.printer_id) : null;
      const resin = run ? mockResinBatches.find((b) => b.id === run.resin_batch_id) : null;
      const itemLabel = item ? FILE_TYPE_LABELS[item.file_type] : "Item";

      if (run?.started_at) {
        timeline.push({
          id: `start-${ri.id}`,
          timestamp: run.started_at,
          title: `Impressão Iniciada: ${run.run_code}`,
          description: `Modelo ${itemLabel} alocado na impressora ${printer?.name || "N/A"} com resina ${resin?.brand || "N/A"} (Lote ${resin?.lot || "N/A"}).`,
          type: "PRINTING",
          badgeColor: "bg-indigo-100 text-indigo-800",
        });
      }

      if (run?.finished_at) {
        if (ri.result === "FALHOU") {
          timeline.push({
            id: `failed-${ri.id}`,
            timestamp: run.finished_at,
            title: `Falha Reportada: ${itemLabel} (Reimpressão)`,
            description: `Motivo: ${ri.failure_reason || "Falha técnica"}. Item incrementou tentativa (${item?.retry_count}ª tentativa) e retornou à fila em vermelho.`,
            type: "FAILED",
            badgeColor: "bg-red-100 text-red-800",
          });
        } else if (ri.result === "CONCLUIDO") {
          timeline.push({
            id: `done-${ri.id}`,
            timestamp: run.finished_at,
            title: `Impressão Aprovada: ${itemLabel}`,
            description: `Modelo impresso com sucesso e inspecionado sem avarias na ordem ${run.run_code}.`,
            type: "COMPLETED",
            badgeColor: "bg-emerald-100 text-emerald-800",
          });
        }
      }
    }

    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      caseData: c,
      items,
      timeline,
    };
  }

  // --- DASHBOARD E AUDITORIA ---
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const printers = await this.getPrinters();
    const availablePrinters = printers.filter((p) => p.calculated_status === "DISPONIVEL").length;
    const blockedPrinters = printers.length - availablePrinters;

    const waitingItems = mockPrintJobItems.filter((i) => i.status === "AGUARDANDO_FILA");
    const printingItems = mockPrintJobItems.filter((i) => i.status === "EM_IMPRESSAO");
    const completedItems = mockPrintJobItems.filter((i) => i.status === "CONCLUIDO");
    const failedItems = mockPrintJobItems.filter((i) => i.retry_count > 0);
    const reprintsPending = mockPrintJobItems.filter((i) => i.status === "AGUARDANDO_FILA" && i.is_retry);

    const jobsWaiting = mockPrintJobs.filter((j) => j.status === "AGUARDANDO").length;
    const calibratedResins = mockResinBatches.filter((b) => b.status === "CALIBRADA").length;
    const awaitingResins = mockResinBatches.filter((b) => b.status === "AGUARDANDO_CALIBRACAO").length;

    return {
      jobs_waiting: jobsWaiting,
      items_in_queue: waitingItems.length,
      items_printing: printingItems.length,
      items_completed_today: completedItems.length,
      items_failed_total: failedItems.length,
      reprints_pending: reprintsPending.length,
      printers_available: availablePrinters,
      printers_blocked: blockedPrinters,
      resins_calibrated: calibratedResins,
      resins_awaiting: awaitingResins,
    };
  }

  static async getRecentActivities(): Promise<AuditLog[]> {
    return mockAuditLogs.slice(0, 10);
  }
}
