import { Case, PrintJob, PrintJobItem, Printer, PrinterMaintenance, ResinBatch, ResinCalibration, PrintRun, DentalFileType } from "./database.types";

export interface QueueItem {
  id: string; // print_job_item_id
  print_job_id: string;
  case_id: string;
  patient_code: string;
  patient_name: string | null;
  file_type: DentalFileType;
  status: PrintJobItem["status"];
  retry_count: number;
  is_retry: boolean;
  last_failure_reason?: string | null;
  last_run_code?: string | null;
  queue_entered_at: string;
  wait_seconds: number;
  priority: number;
}

export interface PatientQueueCard {
  case_id: string;
  patient_code: string;
  patient_name: string | null;
  queue_entered_at: string;
  items: QueueItem[];
}

export type PrinterCalculatedStatus = "DISPONIVEL" | "MANUTENCAO_VENCIDA" | "REPROVADA" | "INATIVA";

export interface PrinterWithStatus extends Printer {
  latest_maintenance?: PrinterMaintenance | null;
  days_since_maintenance?: number | null;
  calculated_status: PrinterCalculatedStatus;
  is_eligible_for_print: boolean;
}

export interface EligibleResinOption {
  resin_batch_id: string;
  brand: string;
  resin_type: string;
  lot: string;
  volume: number;
  volume_unit: string;
  calibration_id: string;
  calibration_number: number;
  layer_height: number;
  exposure_time: number;
  printer_id: string;
  finalized_at?: string | null;
}

export interface DashboardMetrics {
  jobs_waiting: number;
  items_in_queue: number;
  items_printing: number;
  items_completed_today: number;
  items_failed_total: number;
  reprints_pending: number;
  printers_available: number;
  printers_blocked: number;
  resins_calibrated: number;
  resins_awaiting: number;
}

export interface CaseTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: "CREATED" | "QUEUED" | "PREPARED" | "PRINTING" | "COMPLETED" | "FAILED" | "REPRINT";
  badgeColor?: string;
  meta?: Record<string, any>;
}
