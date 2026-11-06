import type { ReactNode } from "react";

export const runtime = "edge";

export default function ApiLayout({ children }: { children: ReactNode }) {
  return children;
}
