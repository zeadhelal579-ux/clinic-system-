// Establish Arabic direction, metadata, and shared styles for the clinic application.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, LOCALE_DIR } from "@/i18n/config";
import { clinicDescription, clinicName } from "@/i18n/messages";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: clinicName, template: `%s | ${clinicName}` },
  description: clinicDescription,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang={DEFAULT_LOCALE} dir={LOCALE_DIR}><body>{children}</body></html>;
}
