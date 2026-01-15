import type { Metadata } from "next";
import "./style.css";
import AppShell from "../components/AppShell";

export const metadata: Metadata = {
  title: "Optim Financials",
  description: "Import, normalize, and analyze your finances.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
