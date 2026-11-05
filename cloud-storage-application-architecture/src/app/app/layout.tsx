import type { ReactNode } from "react";
import AppShell from "@/components/app-shell";

export const metadata = { title: "خزنتي" };

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
