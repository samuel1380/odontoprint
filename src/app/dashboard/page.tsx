"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/shell";
import { OdontoPrintService } from "@/services/odontoprint-service";
import { DashboardMetrics } from "@/types/domain";
import { AuditLog } from "@/types/database.types";
import {
  Printer,
  ListOrdered,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Activity,
  ArrowUpRight,
  FileCheck2,
  Scissors,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [m, a] = await Promise.all([
          OdontoPrintService.getDashboardMetrics(),
          OdontoPrintService.getRecentActivities(),
        ]);
        setMetrics(m);
        setActivities(a);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header with Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Painel Operacional ODONTOPRINT
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Visão consolidada da fila FIFO, parque de impressoras 3D e rastreabilidade de resinas.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/cadista/status">
              <Button variant="default" size="sm" className="gap-1.5">
                <FileCheck2 className="w-4 h-4" />
                Cadista: Novo Trabalho
              </Button>
            </Link>
            <Link href="/fila">
              <Button variant="outline" size="sm" className="gap-1.5 border-brand-200 text-brand-700 bg-brand-50/50 hover:bg-brand-50">
                <ListOrdered className="w-4 h-4" />
                Acessar Fila
              </Button>
            </Link>
          </div>
        </div>

        {/* STATUS DA OPERAÇÃO (DESTAQUE EMPRESARIAL REQUISITO 27) */}
        <div className="rounded-2xl border border-brand-200/80 bg-gradient-to-r from-brand-50 via-white to-blue-50/40 p-6 shadow-card">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-brand-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Status da Operação em Tempo Real
                </h2>
                <p className="text-xs text-slate-500">
                  Monitoramento instantâneo das variáveis críticas de produção
                </p>
              </div>
            </div>
            <Badge variant="lime" className="gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
              </span>
              Produção Ativa
            </Badge>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-subtle">
                <span className="text-xs font-medium text-slate-500">Impressoras Disponíveis</span>
                <div className="text-2xl font-bold text-emerald-600 mt-1 flex items-baseline gap-2">
                  {metrics?.printers_available}
                  <span className="text-xs font-normal text-slate-400">
                    de {(metrics?.printers_available || 0) + (metrics?.printers_blocked || 0)} unidades
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-brand-100 bg-white p-4 shadow-subtle">
                <span className="text-xs font-medium text-slate-500">Fila Atual de Espera</span>
                <div className="text-2xl font-bold text-brand-600 mt-1 flex items-baseline gap-2">
                  {metrics?.items_in_queue}
                  <span className="text-xs font-normal text-slate-400">modelos aguardando</span>
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-subtle">
                <span className="text-xs font-medium text-rose-700 font-semibold">Reimpressões Pendentes</span>
                <div className="text-2xl font-bold text-rose-600 mt-1 flex items-baseline gap-2">
                  {metrics?.reprints_pending}
                  <span className="text-xs font-normal text-rose-500">prioridade máxima</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-subtle">
                <span className="text-xs font-medium text-slate-500">Resinas Calibradas</span>
                <div className="text-2xl font-bold text-slate-800 mt-1 flex items-baseline gap-2">
                  {metrics?.resins_calibrated}
                  <span className="text-xs font-normal text-slate-400">lotes liberados</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="hover:border-brand-300 transition">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500">
                Trabalhos Aguardando
              </CardTitle>
              <Clock className="w-4 h-4 text-brand-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {isLoading ? <Skeleton className="h-8 w-12" /> : metrics?.jobs_waiting}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Pacientes com itens na fila
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-brand-300 transition">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500">
                Em Impressão Agora
              </CardTitle>
              <Printer className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {isLoading ? <Skeleton className="h-8 w-12" /> : metrics?.items_printing}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Modelos nas cubas no momento
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-brand-300 transition">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500">
                Concluídos Hoje
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {isLoading ? <Skeleton className="h-8 w-12" /> : metrics?.items_completed_today}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Modelos aprovados sem falhas
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-rose-300 transition">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-500">
                Impressoras Bloqueadas
              </CardTitle>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {isLoading ? <Skeleton className="h-8 w-12" /> : metrics?.printers_blocked}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Vencidas (&gt;7 dias) ou Reprovadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* WORKFLOW SUMMARY & RECENT ACTIVITIES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Workflow Map Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-500" />
                Fluxo Operacional Integrado
              </CardTitle>
              <CardDescription>
                Rastreabilidade estrita do CAD ao produto final
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative pl-6 border-l-2 border-brand-200 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-white bg-brand-500 shadow-sm" />
                  <div className="text-xs font-bold text-slate-800">1. Cadista Digital</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define o trabalho (ex: PAC-100) e seleciona os modelos a imprimir.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-white bg-cyan-500 shadow-sm" />
                  <div className="text-xs font-bold text-slate-800">2. Fila FIFO & Fatiador</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Agrupa modelos de pacientes e valida impressora e resina calibrada.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm" />
                  <div className="text-xs font-bold text-slate-800">3. Nomenclatura Atômica</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gera sequencial único A001 ou 00A001 para retentativas.
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                  <div className="text-xs font-bold text-slate-800">4. Finalização & Falhas</div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aprovações são concluídas. Falhas retornam à fila em vermelho.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/fatiador">
                  <Button variant="lime" className="w-full text-xs font-bold gap-2">
                    <Scissors className="w-4 h-4" />
                    Abrir Estação do Fatiador
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed (Requisito 5 & 22: Últimas Atividades / Auditoria) */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-500" />
                  Últimas Atividades Registradas
                </CardTitle>
                <CardDescription>
                  Trilha de auditoria operacional em tempo real
                </CardDescription>
              </div>
              <Link href="/historico">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-brand-600">
                  Ver Histórico Completo
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Nenhuma atividade registrada até o momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activities.map((act) => {
                    const isReprint = act.action === "ITEM_REIMPRESSAO";
                    const isMaint = act.action.includes("MANUTENCAO");
                    const isCalib = act.action.includes("CALIBRACAO");

                    return (
                      <div key={act.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              isReprint
                                ? "bg-rose-100 text-rose-700"
                                : isMaint
                                ? "bg-amber-100 text-amber-700"
                                : isCalib
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isReprint ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : isMaint ? (
                              <Printer className="h-3.5 w-3.5" />
                            ) : isCalib ? (
                              <FlaskConical className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </div>

                          <div>
                            <div className="font-semibold text-slate-800">
                              {act.action === "ITEM_REIMPRESSAO" && "Item Retornou para Reimpressão"}
                              {act.action === "ITEM_CONCLUIDO" && "Modelo Concluído com Sucesso"}
                              {act.action === "IMPRESSAO_FINALIZADA" && "Ordem de Impressão Finalizada"}
                              {act.action === "IMPRESSAO_INICIADA" && "Nova Impressão Iniciada"}
                              {act.action === "TRABALHO_CRIADO" && "Novo Trabalho Criado pelo Cadista"}
                              {act.action === "MANUTENCAO_APROVADA" && "Manutenção Aprovada (Impressora Liberada)"}
                              {act.action === "MANUTENCAO_REPROVADA" && "Manutenção Reprovada (Impressora Bloqueada)"}
                              {act.action === "RECEBIMENTO_RESINA" && "Novo Lote de Resina Recebido"}
                              {act.action === "CALIBRACAO_APROVADA" && "Calibração Aprovada com Sucesso"}
                              {act.action === "CALIBRACAO_REPROVADA" && "Calibração Reprovada (Fora de Parâmetros)"}
                            </div>
                            <p className="text-slate-500 mt-0.5">
                              {act.new_data ? JSON.stringify(act.new_data).replace(/["{}]/g, " ") : "Operação concluída"}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 text-[11px] text-slate-400 font-medium">
                          {formatDate(act.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
