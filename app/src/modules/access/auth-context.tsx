import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { isOfflineMode } from "@/lib/mock-mode";
import { mockApi } from "@/lib/mock-store";
import type { Profile } from "./types";

type AuthStatus = "loading" | "anonymous" | "authenticated" | "inactive" | "misconfigured";

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,role,active")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const offline = isOfflineMode();
  const configured = hasSupabaseConfig();
  const [status, setStatus] = useState<AuthStatus>(offline || configured ? "loading" : "misconfigured");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const applySession = useCallback(async (nextSession: Session | null) => {
    if (isOfflineMode()) {
      setSession(null);
      const p = mockApi.sessionProfile();
      setProfile(p);
      if (!p) setStatus("anonymous");
      else if (!p.active) setStatus("inactive");
      else setStatus("authenticated");
      return;
    }
    if (!hasSupabaseConfig()) {
      setSession(null);
      setProfile(null);
      setStatus("misconfigured");
      return;
    }
    setSession(nextSession);
    if (!nextSession?.user) {
      setProfile(null);
      setStatus("anonymous");
      return;
    }
    const nextProfile = await fetchProfile(nextSession.user.id);
    setProfile(nextProfile);
    if (!nextProfile || !nextProfile.active) {
      setStatus("inactive");
      return;
    }
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    if (offline) {
      void applySession(null);
      return;
    }
    if (!configured) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void applySession(next);
    });
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    return () => sub.subscription.unsubscribe();
  }, [applySession, configured, offline]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (isOfflineMode()) {
      const p = mockApi.signIn(email, password);
      if (!p) return "Credenciais inválidas ou acesso não autorizado.";
      await applySession(null);
      return null;
    }
    if (!hasSupabaseConfig()) return "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return "Credenciais inválidas ou acesso não autorizado.";
    return null;
  }, [applySession]);

  const signOut = useCallback(async () => {
    if (isOfflineMode()) {
      mockApi.signOut();
      setSession(null);
      setProfile(null);
      setStatus("anonymous");
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setStatus("anonymous");
  }, []);

  const requestPasswordReset = useCallback(async (_email: string) => {
    if (isOfflineMode()) return null;
    if (!hasSupabaseConfig()) return "Configuração do Supabase ausente.";
    const { error } = await supabase.auth.resetPasswordForEmail(_email, {
      redirectTo: `${window.location.origin}/recuperar-senha`,
    });
    if (error) return "Não foi possível solicitar a recuperação. Verifique o e-mail informado.";
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    await applySession(session);
  }, [applySession, session]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      signInWithPassword,
      signOut,
      requestPasswordReset,
      refreshProfile,
    }),
    [status, session, profile, signInWithPassword, signOut, requestPasswordReset, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


