import { PrinterCalculatedStatus } from "@/types/domain";

export interface MaintenanceChecklistInput {
  leveling_ok: boolean;
  cleaning_ok: boolean;
  fep_integrity_ok: boolean;
  led_integrity_ok: boolean;
  black_points_led: boolean;
  low_led_luminosity: boolean;
  protective_film_ok: boolean;
}

/**
 * Valida se os 7 itens do checklist de manutenção conferem aprovação da impressora
 */
export function validateMaintenanceChecklist(input: MaintenanceChecklistInput): boolean {
  return (
    input.leveling_ok === true &&
    input.cleaning_ok === true &&
    input.fep_integrity_ok === true &&
    input.led_integrity_ok === true &&
    input.black_points_led === false &&
    input.low_led_luminosity === false &&
    input.protective_film_ok === true
  );
}

/**
 * Calcula o status da impressora baseado na regra estrita de 7 dias e na última manutenção aprovada
 */
export function calculatePrinterStatus(
  printer: { active: boolean },
  latestMaintenance?: { performed_at: string | Date; approved: boolean } | null,
  intervalDays: number = 7,
  referenceDate: Date = new Date()
): { status: PrinterCalculatedStatus; isEligible: boolean; daysSince: number | null } {
  if (!printer.active) {
    return { status: "INATIVA", isEligible: false, daysSince: null };
  }

  if (!latestMaintenance) {
    return { status: "REPROVADA", isEligible: false, daysSince: null };
  }

  const maintDate = new Date(latestMaintenance.performed_at);
  const diffTime = referenceDate.getTime() - maintDate.getTime();
  const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (!latestMaintenance.approved) {
    return { status: "REPROVADA", isEligible: false, daysSince };
  }

  if (daysSince > intervalDays) {
    return { status: "MANUTENCAO_VENCIDA", isEligible: false, daysSince };
  }

  return { status: "DISPONIVEL", isEligible: true, daysSince };
}

export interface ResinCalibrationInput {
  hexagon_size_mm: number;
  lines_visible: boolean;
  numbers_visible: boolean;
  details_visible: boolean;
  minHex?: number;
  maxHex?: number;
}

/**
 * Valida calibração de resina:
 * - Hexágono entre 9.99 mm e 10.01 mm inclusive
 * - Linhas, números e detalhes visíveis obrigatórios
 */
export function validateResinCalibration(input: ResinCalibrationInput): {
  approved: boolean;
  errorReason?: string;
} {
  const min = input.minHex ?? 9.99;
  const max = input.maxHex ?? 10.01;

  if (typeof input.hexagon_size_mm !== "number" || isNaN(input.hexagon_size_mm)) {
    return { approved: false, errorReason: "Tamanho do hexágono inválido." };
  }

  // Float precision comparison up to 3 decimal places
  const roundedHex = Math.round(input.hexagon_size_mm * 1000) / 1000;
  if (roundedHex < min || roundedHex > max) {
    return {
      approved: false,
      errorReason: `Tamanho do hexágono (${roundedHex.toFixed(2)} mm) fora do intervalo aceitável de ${min.toFixed(2)} mm a ${max.toFixed(2)} mm.`,
    };
  }

  if (!input.lines_visible) {
    return { approved: false, errorReason: "Linhas de teste não estão visíveis." };
  }
  if (!input.numbers_visible) {
    return { approved: false, errorReason: "Números de identificação não estão visíveis." };
  }
  if (!input.details_visible) {
    return { approved: false, errorReason: "Detalhes finos da peça de teste não estão visíveis." };
  }

  return { approved: true };
}

/**
 * Formatação do código de impressão:
 * Normal: ex. A001
 * Reimpressão: ex. 00A001
 */
export function formatPrintRunCode(
  seq: number,
  isRetry: boolean,
  normalPrefix: string = "A",
  retryPrefix: string = "00A"
): string {
  const prefix = isRetry ? retryPrefix : normalPrefix;
  const padded = String(seq).padStart(3, "0");
  return `${prefix}${padded}`;
}
