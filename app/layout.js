import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "GestImmo",
  description: "Gestion locative simplifiée",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='10' y='20' width='20' height='60' rx='10' fill='%232563eb'/><rect x='40' y='35' width='20' height='45' rx='10' fill='%232563eb' opacity='.6'/><rect x='70' y='10' width='20' height='70' rx='10' fill='%232563eb' opacity='.3'/></svg>" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
  {children}
</ToastProvider>
      </body>
    </html>
  );
}