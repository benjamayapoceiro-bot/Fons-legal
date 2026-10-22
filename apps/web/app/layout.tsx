import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Fons Legal", description: "Panel de gestión jurídica" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
