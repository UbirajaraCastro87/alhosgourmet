"use client";
import { useCart } from "@/context/CartContext";
export default function Toast() {
  const { toastMessage } = useCart();
  if (!toastMessage) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
      <div className="bg-gourmet-brown text-gourmet-bg px-5 py-3 rounded-xl shadow-2xl border-2 border-gourmet-gold flex items-center space-x-3">
        <span className="w-2.5 h-2.5 rounded-full bg-gourmet-gold animate-ping" />
        <p className="text-sm font-medium tracking-wide">{toastMessage}</p>
      </div>
    </div>
  );
}