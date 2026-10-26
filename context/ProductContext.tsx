"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "@/types";
import { defaultProducts } from "@/data/defaultProducts";

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  resetToDefault: () => void;
  isLoaded: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("alhos_products_v1");
      if (saved) {
        setProducts(JSON.parse(saved));
      } else {
        setProducts(defaultProducts);
        localStorage.setItem("alhos_products_v1", JSON.stringify(defaultProducts));
      }
    } catch {
      setProducts(defaultProducts);
    }
    setIsLoaded(true);
  }, []);

  const saveProducts = (newProducts: Product[]) => {
    localStorage.setItem("alhos_products_v1", JSON.stringify(newProducts));
    setProducts(newProducts);
  };

  const addProduct = (prod: Omit<Product, "id">) => {
    saveProducts([{ ...prod, id: Date.now().toString() }, ...products]);
  };

  const updateProduct = (updated: Product) => {
    saveProducts(products.map((p) => (p.id === updated.id ? updated : p)));
  };

  const deleteProduct = (id: string) => {
    saveProducts(products.filter((p) => p.id !== id));
  };

  const resetToDefault = () => {
    saveProducts(defaultProducts);
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, resetToDefault, isLoaded }}>
      {children}
    </ProductContext.Provider>
  );
}

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProducts must be used within ProductProvider");
  return context;
};