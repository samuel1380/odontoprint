"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AICopilotDrawer } from "@/components/ai/ai-copilot-drawer";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar com gaveta responsiva para mobile/tablet e fixo em desktop */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Área de Conteúdo */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 transition-all duration-300">
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Assistente IA Copiloto OdontoPrint (Groq / Mistral) acessível em todo o sistema */}
      <AICopilotDrawer />
    </div>
  );
}
