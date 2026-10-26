"use client";
import { useCart } from "@/context/CartContext";

export default function CartDrawer() {
  const { items, total, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, setIsCheckoutOpen } = useCart();
  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-md bg-gourmet-bg border-l-2 border-gourmet-gold shadow-2xl flex flex-col h-full">
        <div className="p-6 bg-gourmet-brown text-gourmet-bg flex justify-between items-center border-b border-gourmet-gold">
          <h2 className="font-serif text-xl font-bold">Seu Pedido</h2>
          <button onClick={() => setIsCartOpen(false)} className="text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <p className="text-center py-10 opacity-70">Seu carrinho está vazio.</p>
          ) : (
            items.map(({ product, quantity }) => (
              <div key={product.id} className="bg-white p-3 rounded-xl border border-gourmet-gold/30 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm text-gourmet-brown">{product.nome}</h4>
                  <p className="text-xs text-gourmet-gold font-semibold">R$ {product.preco.toFixed(2)}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-6 h-6 border rounded">-</button>
                    <span className="text-sm font-semibold">{quantity}</span>
                    <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-6 h-6 border rounded">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm">R$ {(product.preco * quantity).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(product.id)} className="block text-xs text-red-500 mt-1">Remover</button>
                </div>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="p-6 bg-white border-t border-gourmet-gold/30">
            <div className="flex justify-between items-center text-lg font-bold mb-4">
              <span>Total:</span>
              <span className="text-gourmet-gold">R$ {total.toFixed(2)}</span>
            </div>
            <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} className="w-full py-3.5 bg-gourmet-green hover:opacity-90 text-white font-semibold rounded-xl">
              Finalizar Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}