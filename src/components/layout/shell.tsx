"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar fixo */}
      <Sidebar />

      {/* Área de Conteúdo */}
      <div className="flex-1 pl-64 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-8 min-w-0 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
