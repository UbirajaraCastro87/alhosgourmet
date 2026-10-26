"use client";
import { useState } from "react";
import { Product } from "@/types";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  return (
    <div className="bg-white rounded-2xl border-2 border-gourmet-gold/30 hover:border-gourmet-gold transition-all duration-300 shadow-md flex flex-col overflow-hidden">
      <div className="relative h-56 w-full bg-gourmet-bg">
        <img src={product.imagem} alt={product.nome} className="h-full w-full object-cover" />
        <div className="absolute top-3 right-3 bg-gourmet-brown/90 px-3 py-1 rounded-full border border-gourmet-gold text-gourmet-gold text-sm font-bold">
          R$ {product.preco.toFixed(2)}
        </div>
      </div>
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-serif text-xl font-bold text-gourmet-brown">{product.nome}</h3>
          <p className="mt-2 text-sm text-gourmet-brown/80 line-clamp-3">{product.descricao}</p>
        </div>
        <div className="mt-6 pt-4 border-t border-gourmet-gold/20 flex items-center gap-3">
          <div className="flex items-center border border-gourmet-gold/40 rounded-lg overflow-hidden">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-1.5 font-bold text-gourmet-brown">-</button>
            <span className="px-2 text-sm font-semibold">{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)} className="px-3 py-1.5 font-bold text-gourmet-brown">+</button>
          </div>
          <button onClick={() => { addToCart(product, quantity); setQuantity(1); }} className="flex-1 py-2 px-3 rounded-lg bg-gourmet-gold hover:bg-gourmet-gold-hover text-gourmet-bg font-medium text-sm transition">
            Adicionar ao Pedido
          </button>
        </div>
      </div>
    </div>
  );
}