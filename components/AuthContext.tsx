"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

type AuthState = {
  userId: string | null;
  accessToken: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({
  userId: null,
  accessToken: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAccessToken(data.session?.access_token ?? null);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user.id ?? null);
        setAccessToken(session?.access_token ?? null);
        setLoading(false);
      }
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({ userId, accessToken, loading }),
    [userId, accessToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
