import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice Maker — Simple invoices on iPhone & Android",
  description: "Create professional invoices, save them offline and share PDFs from your phone."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
