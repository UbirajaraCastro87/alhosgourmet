"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const { totalItems, setIsCartOpen } = useCart();
  return (
    <header className="sticky top-0 z-40 bg-gourmet-bg/95 backdrop-blur-md border-b border-gourmet-gold/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-full bg-gourmet-brown border-2 border-gourmet-gold flex items-center justify-center text-gourmet-gold text-lg shadow">
            🧄
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-2xl font-bold tracking-wider text-gourmet-brown">ALHOS GOURMET</span>
            <span className="text-[10px] uppercase tracking-widest text-gourmet-gold font-semibold">Artesanal & Nobre</span>
          </div>
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/admin" className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border border-gourmet-gold/40 text-gourmet-gold hover:bg-gourmet-gold hover:text-white transition">
            Painel Admin
          </Link>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2.5 rounded-xl bg-gourmet-brown text-gourmet-bg hover:bg-gourmet-gold-hover transition shadow flex items-center space-x-2">
            <span>🛒 Pedido</span>
            {totalItems > 0 && (
              <span className="bg-gourmet-gold text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}