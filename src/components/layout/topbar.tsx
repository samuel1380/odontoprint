"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { USER_ROLES, UserRole } from "@/lib/constants";
import {
  UserCircle2,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Check,
  Sparkles,
  Database,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "./breadcrumbs";

export function Topbar() {
  const { user, activeRole, setActiveRole, logout, isDemoMode } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const roleColors: Record<UserRole, string> = {
    ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
    CADISTA: "bg-blue-100 text-blue-800 border-blue-200",
    OPERADOR_RESINA: "bg-emerald-100 text-emerald-800 border-emerald-200",
    OPERADOR_IMPRESSAO: "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-8 backdrop-blur-md">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Breadcrumbs />
      </div>

      {/* Right: Role Switcher & User Profile */}
      <div className="flex items-center gap-4">
        {/* DB Connection Indicator */}
        <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-xs text-slate-600">
          <Database className="h-3.5 w-3.5 text-brand-500" />
          <span>{isDemoMode ? "Modo Demo Interativo" : "Supabase Conectado"}</span>
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Executive Role Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            <span className="text-slate-400">Perfil:</span>
            <Badge className={roleColors[activeRole]}>{USER_ROLES[activeRole]}</Badge>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setRoleMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Simular Perfil na Reunião
                </div>
                {(Object.keys(USER_ROLES) as UserRole[]).map((roleKey) => (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => {
                      setActiveRole(roleKey);
                      setRoleMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors[roleKey]}>{USER_ROLES[roleKey]}</Badge>
                    </div>
                    {activeRole === roleKey && (
                      <Check className="h-4 w-4 text-brand-500" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600 font-semibold text-xs border border-brand-200">
              {user.full_name.charAt(0)}
            </div>
            <div className="hidden lg:block text-left leading-none">
              <div className="text-xs font-semibold text-slate-800">{user.full_name}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{user.email}</div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Encerrar Sessão"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
