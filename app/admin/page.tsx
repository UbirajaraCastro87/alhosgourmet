"use client";
import { useState, type FormEvent } from "react";
import { useProducts } from "@/context/ProductContext";
import { Product } from "@/types";

function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      try {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        reject(new Error("Não foi possível processar a imagem."));
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível abrir a imagem selecionada."));
    };

    image.src = objectUrl;
  });
}

export default function AdminPage() {
  const { products, addProduct, updateProduct, deleteProduct, resetToDefault } = useProducts();
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [imagem, setImagem] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const clearForm = () => {
    setNome("");
    setPreco("");
    setImagem("");
    setDescricao("");
    setEditingProduct(null);
    setError("");
    setFileInputKey((key) => key + 1);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setNome(product.nome);
    setPreco(product.preco.toString());
    setImagem(product.imagem);
    setDescricao(product.descricao);
    setError("");
  };

  const handleImageUpload = async (file?: File) => {
    if (!file) return;

    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem válido.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 8 MB.");
      return;
    }

    try {
      setImagem(await processImage(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível carregar a imagem.");
    }
  };

  if (!auth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border-2 border-gourmet-gold max-w-sm w-full text-center">
          <h2 className="font-serif text-2xl font-bold mb-4">Área Administrativa</h2>
          <input type="password" placeholder="Senha (admin123)" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full p-2.5 border rounded-lg mb-4 text-sm" />
          <button onClick={() => pass === "admin123" ? setAuth(true) : alert("Senha errada!")} className="w-full py-2.5 bg-gourmet-gold text-white font-bold rounded-lg">Entrar</button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!imagem) {
      setError("Informe uma URL ou selecione uma foto para o sabor.");
      return;
    }

    const product = {
      nome: nome.trim(),
      preco: parseFloat(preco),
      imagem,
      descricao: descricao.trim(),
    };

    try {
      if (editingProduct) {
        updateProduct({ ...editingProduct, ...product });
      } else {
        addProduct(product);
      }
      clearForm();
    } catch {
      setError("Não foi possível salvar. O armazenamento do navegador pode estar cheio.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="font-serif text-3xl font-bold">Painel de Sabores</h1>
        <button onClick={resetToDefault} className="text-xs border px-3 py-1.5 rounded">Restaurar Padrões</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gourmet-gold space-y-3">
          <h3 className="font-bold">{editingProduct ? "Editar Sabor" : "Adicionar Sabor"}</h3>
          <input required placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full p-2 border rounded text-sm" />
          <input required type="number" step="0.5" placeholder="Preço" value={preco} onChange={(e) => setPreco(e.target.value)} className="w-full p-2 border rounded text-sm" />
          <label className="block text-sm font-medium" htmlFor="product-image">Foto do sabor</label>
          <input
            key={fileInputKey}
            id="product-image"
            type="file"
            accept="image/*"
            onChange={(e) => void handleImageUpload(e.target.files?.[0])}
            className="w-full p-2 border rounded text-sm"
          />
          <p className="text-xs text-gray-500">A imagem será otimizada e salva neste navegador. Máximo: 8 MB.</p>
          <input placeholder="Ou informe a URL da imagem" value={imagem.startsWith("data:") ? "" : imagem} onChange={(e) => setImagem(e.target.value)} className="w-full p-2 border rounded text-sm" />
          {imagem && (
            <img src={imagem} alt="Prévia do sabor" className="h-32 w-full rounded-lg object-cover" />
          )}
          <textarea placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full p-2 border rounded text-sm" />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="w-full py-2 bg-gourmet-gold text-white font-bold rounded">
            {editingProduct ? "Salvar alterações" : "Cadastrar"}
          </button>
          {editingProduct && (
            <button type="button" onClick={clearForm} className="w-full py-2 border rounded font-medium">
              Cancelar edição
            </button>
          )}
        </form>
        <div className="space-y-3">
          <h3 className="font-bold">Sabores Cadastrados ({products.length})</h3>
          {products.map((p) => (
            <div key={p.id} className="bg-white p-3 border rounded-xl flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src={p.imagem} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                <div className="min-w-0">
                <p className="font-bold">{p.nome}</p>
                <p className="text-xs text-gourmet-gold">R$ {p.preco.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button type="button" onClick={() => handleEdit(p)} className="text-xs font-bold text-gourmet-brown">Editar</button>
                <button type="button" onClick={() => deleteProduct(p.id)} className="text-xs text-red-500 font-bold">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}