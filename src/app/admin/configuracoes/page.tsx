"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/shell";
import { OdontoPrintService } from "@/services/odontoprint-service";
import { SystemSettings } from "@/types/database.types";
import { Settings, Save, RefreshCcw, Info, Sliders, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminConfiguracoesPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [maintenanceDays, setMaintenanceDays] = useState(7);
  const [hexagonMin, setHexagonMin] = useState(9.99);
  const [hexagonMax, setHexagonMax] = useState(10.01);
  const [normalPrefix, setNormalPrefix] = useState("A");
  const [retryPrefix, setRetryPrefix] = useState("00A");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const s = await OdontoPrintService.getSettings();
        setSettings(s);
        setMaintenanceDays(s.maintenance_interval_days);
        setHexagonMin(s.calibration_hexagon_min);
        setHexagonMax(s.calibration_hexagon_max);
        setNormalPrefix(s.normal_print_prefix);
        setRetryPrefix(s.retry_print_prefix);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hexagonMin >= hexagonMax) {
      toast.error("O hexágono mínimo deve ser estritamente menor que o máximo.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await OdontoPrintService.updateSettings({
        maintenance_interval_days: Number(maintenanceDays),
        calibration_hexagon_min: Number(hexagonMin),
        calibration_hexagon_max: Number(hexagonMax),
        normal_print_prefix: normalPrefix.trim().toUpperCase(),
        retry_print_prefix: retryPrefix.trim().toUpperCase(),
      });
      setSettings(updated);
      toast.success("Parâmetros do sistema atualizados com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setMaintenanceDays(7);
    setHexagonMin(9.99);
    setHexagonMax(10.01);
    setNormalPrefix("A");
    setRetryPrefix("00A");
    toast.info("Valores padrão restaurados no formulário. Clique em 'Salvar' para aplicar.");
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-brand-700 bg-brand-50 border-brand-200">
                Administração
              </Badge>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500">Parametrização sem Alteração de Código</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              Configurações & Parâmetros do Sistema
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ajuste limites de calibração, janelas de manutenção de impressoras e prefixos de nomenclatura.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="gap-1 text-xs"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Restaurar Padrões
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Manutenção */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-500" />
                1. Janela Periódica de Manutenção
              </CardTitle>
              <CardDescription>
                Define quantos dias a impressora pode produzir antes de ser automaticamente bloqueada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intervalo Máximo de Manutenção (Dias) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={maintenanceDays}
                    onChange={(e) => setMaintenanceDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-xs text-slate-500 font-medium">dias corridos</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Padrão do laboratório: 7 dias. Ultrapassado este prazo, a impressora muda para MANUTENÇÃO VENCIDA.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Tolerância de Calibração */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-500" />
                2. Tolerância Dimensional do Hexágono de Teste
              </CardTitle>
              <CardDescription>
                Intervalo aceitável de medição no paquímetro para aprovação técnica da resina.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tamanho Mínimo (mm) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={hexagonMin}
                    onChange={(e) => setHexagonMin(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Padrão: 9.99 mm</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tamanho Máximo (mm) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={hexagonMax}
                    onChange={(e) => setHexagonMax(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Padrão: 10.01 mm</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Nomenclatura */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-500" />
                3. Prefixos de Nomenclatura de Impressão
              </CardTitle>
              <CardDescription>
                Padrões de identificação gravados no fatiador e carimbados na bancada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prefixo Normal (ex: A001) *
                  </label>
                  <input
                    type="text"
                    required
                    value={normalPrefix}
                    onChange={(e) => setNormalPrefix(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Exemplo gerado: {normalPrefix}001</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prefixo Reimpressão (ex: 00A001) *
                  </label>
                  <input
                    type="text"
                    required
                    value={retryPrefix}
                    onChange={(e) => setRetryPrefix(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Exemplo gerado: {retryPrefix}001</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Bar */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              size="lg"
              disabled={isSaving}
              className="gap-2 font-bold px-8"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Salvando Parâmetros..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
