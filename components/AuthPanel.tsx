"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

export default function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user.id ?? null);
      }
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setStatus("Connexion...");
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setStatus(error ? error.message : "Connecté");
  };

  const handleSignUp = async () => {
    setStatus("Création...");
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setStatus(error ? error.message : "Compte créé");
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setStatus("Déconnecté");
  };

  return (
    <div className="card">
      <h2>Authentification</h2>
      <p className="meta">
        {userId ? "Connecte" : "Connectez-vous pour demarrer l'analyse."}
      </p>
      {userId ? (
        <button type="button" onClick={handleSignOut}>
          Se deconnecter
        </button>
      ) : (
        <>
          <div className="tabs">
            <button
              type="button"
              className={mode === "signin" ? "tab active" : "tab"}
              onClick={() => setMode("signin")}
            >
              Se connecter
            </button>
            <button
              type="button"
              className={mode === "signup" ? "tab active" : "tab"}
              onClick={() => setMode("signup")}
            >
              Creer un compte
            </button>
          </div>
          <div className="grid">
            <div>
              <label>Email</label>
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div>
              <label>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div>
              {mode === "signin" ? (
                <button type="button" onClick={handleSignIn}>
                  Se connecter
                </button>
              ) : (
                <button type="button" onClick={handleSignUp}>
                  Creer mon compte
                </button>
              )}
            </div>
          </div>
          <p className="meta">
            {mode === "signin"
              ? "Utilisez vos identifiants existants."
              : "Un compte suffit pour conserver l'historique et les regles."}
          </p>
        </>
      )}
      {status ? <div className="meta">{status}</div> : null}
    </div>
  );
}
