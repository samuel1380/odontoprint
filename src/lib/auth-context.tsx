"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRole, USER_ROLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

interface AuthContextType {
  user: UserProfile;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  isLoading: boolean;
  logout: () => Promise<void>;
  isDemoMode: boolean;
}

const DEFAULT_DEMO_USER: UserProfile = {
  id: "u0000001-0000-0000-0000-000000000001",
  email: "admin@odontoprint.com.br",
  full_name: "Dr. Marcelo Arquiteto",
  role: "ADMIN",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(DEFAULT_DEMO_USER);
  const [activeRole, setActiveRoleState] = useState<UserRole>("ADMIN");
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);

  useEffect(() => {
    // Carrega papel salvo em localStorage se disponível
    const savedRole = localStorage.getItem("odontoprint_active_role") as UserRole;
    if (savedRole && USER_ROLES[savedRole]) {
      setActiveRoleState(savedRole);
    }

    // Tenta obter usuário real do Supabase se configurado
    const { client, isConfigured } = createClient();
    if (isConfigured && client) {
      setIsDemoMode(false);
      client.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          setUser({
            id: authUser.id,
            email: authUser.email || "usuario@odontoprint.com.br",
            full_name: authUser.user_metadata?.full_name || "Operador OdontoPrint",
            role: (authUser.user_metadata?.role as UserRole) || "ADMIN",
          });
        }
      });
    }
  }, []);

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    localStorage.setItem("odontoprint_active_role", role);
    setUser((prev) => ({ ...prev, role }));
  };

  const logout = async () => {
    const { client, isConfigured } = createClient();
    if (isConfigured && client) {
      await client.auth.signOut();
    }
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        setActiveRole,
        isLoading,
        logout,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
