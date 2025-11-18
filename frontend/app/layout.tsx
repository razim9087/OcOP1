import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const exo2 = Exo_2({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Solana Options Escrow",
  description: "Decentralized options trading platform on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${exo2.className} bg-gradient-to-br from-black via-gray-900 to-purple-950 min-h-screen`}>
        <div className="page-container">
          <WalletContextProvider>
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 relative z-10">
              {children}
            </main>
            <Footer />
          </WalletContextProvider>
        </div>
      </body>
    </html>
  );
}
