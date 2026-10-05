"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRole, USER_ROLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export interface UserProfile {
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
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isSupabaseConnected: boolean;
}

const DEFAULT_USER: UserProfile = {
  id: "u0000001-0000-0000-0000-000000000001",
  email: "admin@odontoprint.com.br",
  full_name: "Administrador do Laboratório",
  role: "ADMIN",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [activeRole, setActiveRoleState] = useState<UserRole>("ADMIN");
  const [isLoading, setIsLoading] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  useEffect(() => {
    // Carrega preferências salvas localmente
    const savedRole = localStorage.getItem("odontoprint_active_role") as UserRole;
    if (savedRole && USER_ROLES[savedRole]) {
      setActiveRoleState(savedRole);
    }

    const savedUser = localStorage.getItem("odontoprint_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.email) setUser(parsed);
      } catch {
        // ignore
      }
    }

    // Tenta obter usuário real do Supabase se configurado
    const { client, isConfigured } = createClient();
    if (isConfigured && client) {
      setIsSupabaseConnected(true);
      client.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          const profile: UserProfile = {
            id: authUser.id,
            email: authUser.email || "usuario@odontoprint.com.br",
            full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Operador",
            role: (authUser.user_metadata?.role as UserRole) || "ADMIN",
          };
          setUser(profile);
          setActiveRoleState(profile.role);
        }
      });
    }
  }, []);

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    localStorage.setItem("odontoprint_active_role", role);
    setUser((prev) => {
      const updated = { ...prev, role };
      localStorage.setItem("odontoprint_user", JSON.stringify(updated));
      return updated;
    });
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { client, isConfigured } = createClient();
      if (isConfigured && client && password) {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || email.split("@")[0],
            role: (data.user.user_metadata?.role as UserRole) || "ADMIN",
          };
          setUser(profile);
          setActiveRoleState(profile.role);
          localStorage.setItem("odontoprint_user", JSON.stringify(profile));
          localStorage.setItem("odontoprint_active_role", profile.role);
          return { success: true };
        }
      }

      // Autenticação local (modo operacional direto)
      const cleanName = email.split("@")[0]
        .split(".")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");

      const profile: UserProfile = {
        id: crypto.randomUUID(),
        email: email.trim().toLowerCase(),
        full_name: cleanName || "Administrador",
        role: "ADMIN",
      };

      setUser(profile);
      setActiveRoleState("ADMIN");
      localStorage.setItem("odontoprint_user", JSON.stringify(profile));
      localStorage.setItem("odontoprint_active_role", "ADMIN");

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Falha ao realizar login." };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const { client, isConfigured } = createClient();
    if (isConfigured && client) {
      await client.auth.signOut();
    }
    localStorage.removeItem("odontoprint_user");
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        setActiveRole,
        isLoading,
        login,
        logout,
        isSupabaseConnected,
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
