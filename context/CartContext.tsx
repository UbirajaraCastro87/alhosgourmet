"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, Product } from "@/types";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  total: number;
  totalItems: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("alhos_cart");
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch { setItems([]); }
    }
  }, []);

  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem("alhos_cart", JSON.stringify(newItems));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToCart = (product: Product, quantity: number) => {
    const existingIndex = items.findIndex((i) => i.product.id === product.id);
    let newItems = [...items];
    if (existingIndex > -1) {
      newItems[existingIndex].quantity += quantity;
    } else {
      newItems.push({ product, quantity });
    }
    saveCart(newItems);
    showToast(`Adicionado: ${quantity}x ${product.nome}`);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(productId);
    saveCart(items.map((i) => (i.product.id === productId ? { ...i, quantity } : i)));
  };

  const removeFromCart = (productId: string) => {
    saveCart(items.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => saveCart([]);

  const total = items.reduce((acc, i) => acc + i.product.preco * i.quantity, 0);
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, updateQuantity, removeFromCart, clearCart, total, totalItems, isCartOpen, setIsCartOpen, isCheckoutOpen, setIsCheckoutOpen, toastMessage, showToast }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};