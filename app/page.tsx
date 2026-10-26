"use client";
import { useState, useMemo } from "react";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/context/ProductContext";

export default function Home() {
  const { products, isLoaded, loadError } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState("todos");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchName = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName) return false;
      if (priceFilter === "ate25") return p.preco <= 25;
      if (priceFilter === "acima25") return p.preco > 25;
      return true;
    });
  }, [products, searchTerm, priceFilter]);

  return (
    <div>
      <Hero />
      <section id="produtos" className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="font-serif text-4xl font-bold text-gourmet-brown">Nossos Sabores</h2>
          <div className="w-20 h-1 bg-gourmet-gold mx-auto my-3" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
          <input type="text" placeholder="Buscar sabor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-80 p-2.5 rounded-xl border border-gourmet-gold/40 text-sm bg-white" />
          <div className="flex gap-2">
            <button onClick={() => setPriceFilter("todos")} className="px-3 py-1.5 rounded-lg border text-xs font-bold">Todos</button>
            <button onClick={() => setPriceFilter("ate25")} className="px-3 py-1.5 rounded-lg border text-xs font-bold">Até R$ 25</button>
            <button onClick={() => setPriceFilter("acima25")} className="px-3 py-1.5 rounded-lg border text-xs font-bold">Acima de R$ 25</button>
          </div>
        </div>
        {!isLoaded ? (
          <p className="text-center py-10">Carregando...</p>
        ) : loadError ? (
          <p role="alert" className="text-center py-10 text-red-600">{loadError}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((prod) => <ProductCard key={prod.id} product={prod} />)}
          </div>
        )}
      </section>
    </div>
  );
}