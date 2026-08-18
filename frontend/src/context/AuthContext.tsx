import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User as SupaUser } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AuthContext, type AuthUser } from "@/context/auth-context";

function toAuthUser(u: SupaUser | null): AuthUser | null {
  if (!u) return null;
  const metaName = (u.user_metadata?.name as string | undefined)?.trim();
  const name = metaName || (u.email ? u.email.split("@")[0] : "Camper");
  return { id: u.id, email: u.email ?? "", name };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      throw new Error("Connected mode is not configured. Open the fictional demo instead.");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async function signUp(email: string, password: string, name: string) {
    if (!isSupabaseConfigured) {
      throw new Error("Connected mode is not configured. Open the fictional demo instead.");
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
    // If email confirmation is enabled, there's no session until the user confirms.
    return { needsConfirmation: !data.session };
  }

  async function signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user: toAuthUser(session?.user ?? null),
        session,
        isAuthenticated: !!session,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
