import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "سحاب | تخزين سحابي 1 تيرابايت بتشفير كامل",
    template: "%s | سحاب",
  },
  description:
    "سحاب هو تخزينك السحابي الشخصي: مساحة 1TB مجانية، رفع مجزأ مباشر بأقصى سرعة، تشفير من طرف لآخر (Zero-Knowledge)، بث فوري للوسائط، وصفر استهلاك لمساحة هاتفك.",
  keywords: ["تخزين سحابي", "1TB", "تشفير", "S3", "رفع مباشر", "سحابة عربية"],
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#05070f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="app-bg antialiased">
        {children}
        <Toaster
          position="bottom-left"
          dir="rtl"
          toastOptions={{
            style: {
              background: "#11172b",
              border: "1px solid rgba(148,184,255,0.18)",
              color: "#e8ecf8",
              fontFamily: "'IBM Plex Sans Arabic', sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
