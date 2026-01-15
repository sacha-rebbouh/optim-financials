"use client";

import ThemeToggle from "./ThemeToggle";
import { AuthProvider, useAuth } from "./AuthContext";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <AuthProvider>
      <ShellLayout>{children}</ShellLayout>
    </AuthProvider>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">OF</span>
          <div>
            <strong>Optim</strong>
            <div className="meta">Financials</div>
          </div>
        </div>
        <nav className="nav">
          <a className="nav-link" href="/">
            Dashboard
          </a>
          <a className="nav-link" href="/review">
            Validation
          </a>
          <a className="nav-link" href="/rules">
            Règles & marchands
          </a>
          <a className="nav-link" href="/budget">
            Budget
          </a>
          <a className="nav-link" href="/settings">
            Paramètres
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="meta">{userId ? "Connecté" : "Non connecté"}</div>
        </div>
      </aside>
      <div className="content">
        <div className="topbar">
          <div className="topbar-title">Optim Financials</div>
          <ThemeToggle />
        </div>
        {children}
      </div>
    </div>
  );
}
