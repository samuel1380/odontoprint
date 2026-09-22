"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { OdontoPrintService } from "@/services/odontoprint-service";
import { PRINTER_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  Printer,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Calendar,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function ImpressoraDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const printerId = params.id as string;

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await OdontoPrintService.getPrinterById(printerId);
        setData(res);
      } catch {
        toast.error("Erro ao carregar histórico da impressora.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [printerId]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!data?.printer) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="text-lg font-bold text-slate-800">Impressora Não Encontrada</h2>
          <Button onClick={() => router.push("/impressoras")} className="mt-4">
            Voltar
          </Button>
        </div>
      </AppShell>
    );
  }

  const p = data.printer;
  const statusCfg =
    (PRINTER_STATUS as Record<string, { label: string; color: string }>)[p.calculated_status] ||
    PRINTER_STATUS.INATIVA;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/impressoras")}
              className="text-slate-500 hover:text-slate-900 gap-1 pl-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {p.name}
                </h1>
                <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {p.brand} &bull; {p.model} &bull; Série: <span className="font-mono">{p.serial_number}</span>
              </p>
            </div>
          </div>

          <Link href={`/impressoras/${p.id}/manutencao`}>
            <Button variant="default" size="sm" className="gap-1.5 font-bold">
              <Wrench className="w-4 h-4" />
              Realizar Nova Manutenção
            </Button>
          </Link>
        </div>

        {/* Maintenance History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" />
              Histórico Completo de Manutenções Preventivas ({data.maintenances.length})
            </CardTitle>
            <CardDescription>
              Registro auditável de cada inspeção realizada nesta impressora
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.maintenances.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Nenhuma manutenção registrada até o momento.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.maintenances.map((m: any) => (
                  <div key={m.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.approved ? "success" : "destructive"}>
                          {m.approved ? "Aprovada" : "Reprovada"}
                        </Badge>
                        <span className="font-semibold text-slate-800">
                          {formatDate(m.performed_at)}
                        </span>
                      </div>
                      {m.notes && (
                        <p className="text-slate-500 mt-1 italic">
                          &ldquo;{m.notes}&rdquo;
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-1.5">
                        <span>Nivelamento: {m.leveling_ok ? "OK" : "Falhou"}</span>
                        <span>&bull;</span>
                        <span>FEP: {m.fep_integrity_ok ? "Íntegro" : "Danificado"}</span>
                        <span>&bull;</span>
                        <span>LED: {m.led_integrity_ok ? "OK" : "Defeito"}</span>
                        <span>&bull;</span>
                        <span>Pontos Pretos: {m.black_points_led ? "SIM (Falha)" : "Nenhum"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
