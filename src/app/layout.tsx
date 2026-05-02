import "~/styles/globals.css";

import { type Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Sans_3 } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_URL ?? "https://odoo-finale.vercel.app",
  ),
  title: "EMPAY - Smart HRMS",
  description: "Human Resource & Payroll Management System",
  icons: [{ rel: "icon", url: "/empay.png" }],
  openGraph: {
    title: "EMPAY - Smart HRMS",
    description: "Human Resource & Payroll Management System",
    images: [{ url: "/empay.png", width: 452, height: 552 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${plusJakarta.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
