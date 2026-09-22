"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserRole, USER_ROLES } from "@/lib/constants";
import { Printer, Shield, Sparkles, ArrowRight, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { setActiveRole } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickLogin = (role: UserRole) => {
    setActiveRole(role);
    toast.success(`Sessão iniciada como ${USER_ROLES[role]}`);
    router.push("/dashboard");
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveRole("ADMIN");
      toast.success("Autenticado com sucesso no OdontoPrint!");
      router.push("/dashboard");
    }, 600);
  };

  const demoAccounts: { role: UserRole; name: string; desc: string; color: string }[] = [
    {
      role: "CADISTA",
      name: "Dra. Juliana Ribeiro",
      desc: "Responsável pelo design CAD e encaminhamento dos modelos para fresagem/impressão",
      color: "border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700",
    },
    {
      role: "OPERADOR_IMPRESSAO",
      name: "Lucas Mendes",
      desc: "Opera a fila de produção, fatiamento, conferência e controle de falhas",
      color: "border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-700",
    },
    {
      role: "OPERADOR_RESINA",
      name: "Eng. Rafael Costa",
      desc: "Gestão do parque de impressoras, manutenção periódica de 7 dias e calibração milimétrica",
      color: "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700",
    },
    {
      role: "ADMIN",
      name: "Dr. Marcelo Arquiteto",
      desc: "Acesso irrestrito a todos os módulos operacionais, auditoria e parametrização",
      color: "border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-700",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-card mb-4">
          <Printer className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          ODONTO<span className="text-brand-500">PRINT</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sistema Empresarial de Gestão e Produção 3D Odontológica
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-slate-200/80 sm:px-10">
          {/* Executive Demo Quick Access */}
          <div className="mb-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Acesso Rápido para Apresentação
                </span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                4 Perfis Prontos
              </Badge>
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-4">
              Clique em qualquer um dos perfis abaixo para navegar diretamente com as permissões e telas do usuário:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickLogin(acc.role)}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm ${acc.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider">
                      {USER_ROLES[acc.role]}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mt-1">
                    {acc.name}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                    {acc.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-semibold">
                Ou acesse com credenciais
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Profissional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@odontoprint.com.br"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-slate-50/50"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2"
              variant="default"
              size="lg"
            >
              {isLoading ? "Conectando..." : "Entrar no Sistema"}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          ODONTOPRINT &copy; {new Date().getFullYear()} &bull; Laboratório de Odontologia Digital & Impressão 3D
        </div>
      </div>
    </div>
  );
}
