"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function CheckoutModal() {
  const { isCheckoutOpen, setIsCheckoutOpen, items, total, clearCart } = useCart();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");

  if (!isCheckoutOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const produtos = items.map((i) => `Produto: ${i.product.nome}\nQuantidade: ${i.quantity}`).join("\n\n");
    const msg = `Olá, gostaria de fazer o seguinte pedido:\n\n${produtos}\n\nTotal: R$ ${total.toFixed(2)}\n\nNome: ${nome}\nTelefone: ${telefone}\nEndereço: ${endereco}`;
    window.open(`https://wa.me/5521988832361?text=${encodeURIComponent(msg)}`, "_blank");
    clearCart();
    setIsCheckoutOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gourmet-bg w-full max-w-lg rounded-2xl border-2 border-gourmet-gold p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-xl font-bold text-gourmet-brown">Finalizar Pedido</h3>
          <button onClick={() => setIsCheckoutOpen(false)}>✕</button>
        </div>
        <form onSubmit={handleSend} className="space-y-4">
          <input required type="text" placeholder="Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full p-2.5 rounded-lg border border-gourmet-gold/40 text-sm" />
          <input required type="tel" placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full p-2.5 rounded-lg border border-gourmet-gold/40 text-sm" />
          <textarea required rows={3} placeholder="Endereço de entrega" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-full p-2.5 rounded-lg border border-gourmet-gold/40 text-sm" />
          <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
            Enviar Pedido pelo WhatsApp
          </button>
        </form>
      </div>
    </div>
  );
}