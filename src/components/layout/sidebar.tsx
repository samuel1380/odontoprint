"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileCheck2,
  ListOrdered,
  Scissors,
  Printer,
  FlaskConical,
  Compass,
  History,
  Users,
  Settings,
  ShieldAlert,
  Layers3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles?: string[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { activeRole } = useAuth();

  const navigation: { group: string; items: NavItem[] }[] = [
    {
      group: "Visão Geral",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      group: "Fluxo de Produção",
      items: [
        {
          title: "Cadista: Status",
          href: "/cadista/status",
          icon: FileCheck2,
          roles: ["ADMIN", "CADISTA"],
        },
        {
          title: "Fila de Impressão",
          href: "/fila",
          icon: ListOrdered,
          roles: ["ADMIN", "OPERADOR_IMPRESSAO", "CADISTA"],
        },
        {
          title: "Fatiador / Preparo",
          href: "/fatiador",
          icon: Scissors,
          roles: ["ADMIN", "OPERADOR_IMPRESSAO"],
        },
        {
          title: "Impressões Ativas",
          href: "/impressoes",
          icon: Printer,
          roles: ["ADMIN", "OPERADOR_IMPRESSAO"],
        },
      ],
    },
    {
      group: "Gestão Técnica",
      items: [
        {
          title: "Impressoras 3D",
          href: "/impressoras",
          icon: Layers3,
          roles: ["ADMIN", "OPERADOR_RESINA"],
        },
        {
          title: "Lotes de Resina",
          href: "/resinas",
          icon: FlaskConical,
          roles: ["ADMIN", "OPERADOR_RESINA"],
        },
        {
          title: "Calibrações",
          href: "/calibracoes",
          icon: Compass,
          roles: ["ADMIN", "OPERADOR_RESINA"],
        },
      ],
    },
    {
      group: "Rastreabilidade",
      items: [
        {
          title: "Histórico Completo",
          href: "/historico",
          icon: History,
        },
      ],
    },
    {
      group: "Administração",
      items: [
        {
          title: "Usuários & RBAC",
          href: "/admin/usuarios",
          icon: Users,
          roles: ["ADMIN"],
        },
        {
          title: "Configurações",
          href: "/admin/configuracoes",
          icon: Settings,
          roles: ["ADMIN"],
        },
      ],
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/80 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200/80 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
          <Printer className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-black tracking-wider text-slate-900 flex items-center gap-1.5">
            ODONTO<span className="text-brand-500">PRINT</span>
          </div>
          <p className="text-[10px] font-medium tracking-tight text-slate-400 uppercase">
            3D Dental Lab Platform
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navigation.map((section) => {
          // Filtra itens permitidos para o perfil ativo (ou exibe todos para ADMIN)
          const visibleItems = section.items.filter((item) => {
            if (activeRole === "ADMIN") return true;
            if (!item.roles) return true;
            return item.roles.includes(activeRole);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.group}>
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {section.group}
              </div>
              <nav className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        isActive
                          ? "bg-brand-50 font-semibold text-brand-600 shadow-sm border border-brand-100"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-brand-500"
                            : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Footer / Lab Station Status */}
      <div className="border-t border-slate-200/80 p-4 bg-slate-50/50">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ambiente</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Operacional
            </span>
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span>ODONTOPRINT LAB</span>
            <span className="text-[10px] font-normal text-slate-400">v2.4.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
