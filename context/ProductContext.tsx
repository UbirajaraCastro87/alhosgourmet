"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/types";

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, "id">, password: string) => Promise<void>;
  updateProduct: (product: Product, password: string) => Promise<void>;
  deleteProduct: (id: string, password: string) => Promise<void>;
  resetToDefault: (password: string) => Promise<void>;
  importLegacyProducts: (products: Product[], password: string) => Promise<void>;
  isLoaded: boolean;
  loadError: string;
  legacyImportPending: boolean;
}

interface ProductsResponse {
  products: Product[];
  legacyImportPending?: boolean;
  error?: string;
}

interface ProductsState {
  products: Product[];
  legacyImportPending: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

async function readProducts(): Promise<ProductsState> {
  const response = await fetch("/api/products");
  const result = (await response.json()) as ProductsResponse;
  if (!response.ok) {
    throw new Error(result.error || "Não foi possível carregar os sabores.");
  }

  return { products: result.products, legacyImportPending: result.legacyImportPending === true };
}

async function sendProductRequest(url: string, method: string, password: string, body?: unknown): Promise<void> {
  const response = await fetch(url, {
    method,
    headers: {
      "x-admin-password": password,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = (await response.json()) as ProductsResponse;
  if (!response.ok) {
    throw new Error(result.error || "Não foi possível salvar os sabores.");
  }
}

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [legacyImportPending, setLegacyImportPending] = useState(false);

  useEffect(() => {
    readProducts()
      .then((state) => {
        setProducts(state.products);
        setLegacyImportPending(state.legacyImportPending);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Não foi possível carregar os sabores.");
      })
      .finally(() => setIsLoaded(true));
  }, []);

  const refreshProducts = async () => {
    const state = await readProducts();
    setProducts(state.products);
    setLegacyImportPending(state.legacyImportPending);
    setLoadError("");
  };

  const addProduct = async (product: Omit<Product, "id">, password: string) => {
    await sendProductRequest("/api/products", "POST", password, product);
    await refreshProducts();
  };

  const updateProduct = async (product: Product, password: string) => {
    await sendProductRequest(`/api/products/${encodeURIComponent(product.id)}`, "PUT", password, product);
    await refreshProducts();
  };

  const deleteProduct = async (id: string, password: string) => {
    await sendProductRequest(`/api/products/${encodeURIComponent(id)}`, "DELETE", password);
    await refreshProducts();
  };

  const resetToDefault = async (password: string) => {
    await sendProductRequest("/api/products", "DELETE", password);
    await refreshProducts();
  };

  const importLegacyProducts = async (legacyProducts: Product[], password: string) => {
    await sendProductRequest("/api/products", "PUT", password, { products: legacyProducts });
    await refreshProducts();
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        resetToDefault,
        importLegacyProducts,
        isLoaded,
        loadError,
        legacyImportPending,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProducts must be used within ProductProvider");
  return context;
};
