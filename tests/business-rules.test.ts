import { describe, it, expect } from "vitest";
import {
  validateMaintenanceChecklist,
  calculatePrinterStatus,
  validateResinCalibration,
  formatPrintRunCode,
} from "../src/lib/business-rules";

describe("Regras de Negócio - Manutenção de Impressoras", () => {
  it("aprova checklist quando todos os parâmetros de manutenção estão corretos", () => {
    const valid = validateMaintenanceChecklist({
      leveling_ok: true,
      cleaning_ok: true,
      fep_integrity_ok: true,
      led_integrity_ok: true,
      black_points_led: false,
      low_led_luminosity: false,
      protective_film_ok: true,
    });
    expect(valid).toBe(true);
  });

  it("reprova checklist se existirem pontos pretos no LED", () => {
    const valid = validateMaintenanceChecklist({
      leveling_ok: true,
      cleaning_ok: true,
      fep_integrity_ok: true,
      led_integrity_ok: true,
      black_points_led: true, // FALHA
      low_led_luminosity: false,
      protective_film_ok: true,
    });
    expect(valid).toBe(false);
  });

  it("reprova checklist se houver baixa luminosidade no LED", () => {
    const valid = validateMaintenanceChecklist({
      leveling_ok: true,
      cleaning_ok: true,
      fep_integrity_ok: true,
      led_integrity_ok: true,
      black_points_led: false,
      low_led_luminosity: true, // FALHA
      protective_film_ok: true,
    });
    expect(valid).toBe(false);
  });

  it("bloqueia impressora com MANUTENCAO_VENCIDA se passaram mais de 7 dias da última manutenção aprovada", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const eightDaysAgo = new Date("2026-09-13T10:00:00Z");

    const statusResult = calculatePrinterStatus(
      { active: true },
      { performed_at: eightDaysAgo, approved: true },
      7,
      now
    );

    expect(statusResult.status).toBe("MANUTENCAO_VENCIDA");
    expect(statusResult.isEligible).toBe(false);
  });

  it("libera impressora como DISPONIVEL se manutenção aprovada ocorreu há menos de 7 dias", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const twoDaysAgo = new Date("2026-09-19T10:00:00Z");

    const statusResult = calculatePrinterStatus(
      { active: true },
      { performed_at: twoDaysAgo, approved: true },
      7,
      now
    );

    expect(statusResult.status).toBe("DISPONIVEL");
    expect(statusResult.isEligible).toBe(true);
  });

  it("classifica impressora como REPROVADA se a última manutenção foi reprovada", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const yesterday = new Date("2026-09-20T10:00:00Z");

    const statusResult = calculatePrinterStatus(
      { active: true },
      { performed_at: yesterday, approved: false },
      7,
      now
    );

    expect(statusResult.status).toBe("REPROVADA");
    expect(statusResult.isEligible).toBe(false);
  });

  it("classifica impressora desativada como INATIVA", () => {
    const statusResult = calculatePrinterStatus({ active: false }, null);
    expect(statusResult.status).toBe("INATIVA");
    expect(statusResult.isEligible).toBe(false);
  });
});

describe("Regras de Negócio - Calibração de Resina", () => {
  it("reprova hexágono de 9.98 mm (abaixo de 9.99 mm)", () => {
    const res = validateResinCalibration({
      hexagon_size_mm: 9.98,
      lines_visible: true,
      numbers_visible: true,
      details_visible: true,
    });
    expect(res.approved).toBe(false);
    expect(res.errorReason).toContain("fora do intervalo aceitável");
  });

  it("aprova hexágono no limite inferior de 9.99 mm", () => {
    const res = validateResinCalibration({
      hexagon_size_mm: 9.99,
      lines_visible: true,
      numbers_visible: true,
      details_visible: true,
    });
    expect(res.approved).toBe(true);
  });

  it("aprova hexágono no limite superior de 10.01 mm", () => {
    const res = validateResinCalibration({
      hexagon_size_mm: 10.01,
      lines_visible: true,
      numbers_visible: true,
      details_visible: true,
    });
    expect(res.approved).toBe(true);
  });

  it("reprova hexágono de 10.02 mm (acima de 10.01 mm)", () => {
    const res = validateResinCalibration({
      hexagon_size_mm: 10.02,
      lines_visible: true,
      numbers_visible: true,
      details_visible: true,
    });
    expect(res.approved).toBe(false);
    expect(res.errorReason).toContain("fora do intervalo aceitável");
  });

  it("reprova calibração se detalhes_visiveis for false, mesmo com hexágono 10.00 mm", () => {
    const res = validateResinCalibration({
      hexagon_size_mm: 10.0,
      lines_visible: true,
      numbers_visible: true,
      details_visible: false,
    });
    expect(res.approved).toBe(false);
    expect(res.errorReason).toContain("Detalhes finos");
  });

  it("reprova calibração se linhas_visiveis for false", () => {
    const res = validateResinCalibration({
      hexagon_size_mm: 10.0,
      lines_visible: false,
      numbers_visible: true,
      details_visible: true,
    });
    expect(res.approved).toBe(false);
    expect(res.errorReason).toContain("Linhas de teste");
  });

  it("reprova calibração se numeros_visiveis for false", () => {
    const res = validateResinCalibration({
      hexagon_size_mm: 10.0,
      lines_visible: true,
      numbers_visible: false,
      details_visible: true,
    });
    expect(res.approved).toBe(false);
    expect(res.errorReason).toContain("Números de identificação");
  });
});

describe("Regras de Negócio - Nomenclatura Atômica", () => {
  it("gera código normal com prefixo A e padding sequencial (ex: A001, A042)", () => {
    expect(formatPrintRunCode(1, false, "A", "00A")).toBe("A001");
    expect(formatPrintRunCode(42, false, "A", "00A")).toBe("A042");
  });

  it("gera código de reimpressão com prefixo 00A quando há modelo com falha anterior (ex: 00A001)", () => {
    expect(formatPrintRunCode(1, true, "A", "00A")).toBe("00A001");
    expect(formatPrintRunCode(5, true, "A", "00A")).toBe("00A005");
  });
});
