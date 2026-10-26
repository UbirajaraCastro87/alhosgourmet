"use client";
import { useState, type FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { useProducts } from "@/context/ProductContext";
import { Product } from "@/types";

interface AdminConfig {
  imageStorage: "inline" | "blob" | "unavailable";
  configurationMessage: string;
}

async function processImage(file: File): Promise<string> {
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

async function uploadImage(dataUrl: string, password: string): Promise<string> {
  const imageBlob = await (await fetch(dataUrl)).blob();
  const imageFile = new File([imageBlob], `product-${Date.now()}.jpg`, { type: "image/jpeg" });
  const result = await upload(`products/${imageFile.name}`, imageFile, {
    access: "public",
    contentType: "image/jpeg",
    handleUploadUrl: "/api/images/upload",
    headers: { "x-admin-password": password },
  });
  return result.url;
}

export default function AdminPage() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    resetToDefault,
    importLegacyProducts,
    legacyImportPending,
    loadError,
    isLoaded,
  } = useProducts();
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [imagem, setImagem] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [imageStorage, setImageStorage] = useState<AdminConfig["imageStorage"]>("inline");
  const [configurationMessage, setConfigurationMessage] = useState("");

  const handleLogin = async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível entrar no painel.");
      }

      const configResponse = await fetch("/api/admin/config");
      const config = (await configResponse.json()) as AdminConfig;
      if (!configResponse.ok) {
        throw new Error(config.configurationMessage || "Não foi possível verificar o armazenamento.");
      }
      setImageStorage(config.imageStorage);
      setConfigurationMessage(config.configurationMessage);

      if (legacyImportPending) {
        let legacyProducts: Product[] = [];
        try {
          const saved = localStorage.getItem("alhos_products_v1");
          const parsed: unknown = saved ? JSON.parse(saved) : [];
          if (Array.isArray(parsed)) {
            legacyProducts = parsed.filter(
              (product): product is Product =>
                product !== null &&
                typeof product === "object" &&
                typeof product.id === "string" &&
                typeof product.nome === "string" &&
                typeof product.descricao === "string" &&
                typeof product.preco === "number" &&
                typeof product.imagem === "string",
            ).slice(0, 100);
          }
        } catch {
          legacyProducts = [];
        }

        if (imageStorage === "blob" || config.imageStorage === "blob") {
          for (const product of legacyProducts) {
            if (product.imagem.startsWith("data:image/")) {
              product.imagem = await uploadImage(product.imagem, pass);
            }
          }
        }
        await importLegacyProducts(legacyProducts, pass);
      }

      setAuth(true);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar no painel.");
    }
  };

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
      const optimizedImage = await processImage(file);
      if (imageStorage === "blob") {
        setImagem(await uploadImage(optimizedImage, pass));
      } else if (imageStorage === "unavailable") {
        setError("Conecte um armazenamento Vercel Blob ao projeto para enviar fotos. Você ainda pode informar uma URL.");
      } else {
        setImagem(optimizedImage);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível carregar a imagem.");
    }
  };

  if (!auth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl border-2 border-gourmet-gold max-w-sm w-full text-center">
          <h2 className="font-serif text-2xl font-bold mb-4">Área Administrativa</h2>
          <input type="password" placeholder="Senha administrativa" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full p-2.5 border rounded-lg mb-4 text-sm" />
          {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
          <button disabled={!isLoaded || Boolean(loadError)} onClick={() => void handleLogin()} className="w-full py-2.5 bg-gourmet-gold text-white font-bold rounded-lg disabled:opacity-60">
            {!isLoaded ? "Carregando..." : loadError ? "Banco indisponível" : "Entrar"}
          </button>
          {loadError && <p role="alert" className="mt-3 text-sm text-red-600">{loadError}</p>}
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
        await updateProduct({ ...editingProduct, ...product }, pass);
      } else {
        await addProduct(product, pass);
      }
      clearForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar o sabor.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id, pass);
      setError("");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível excluir o sabor.");
    }
  };

  const handleReset = async () => {
    try {
      await resetToDefault(pass);
      setError("");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Não foi possível restaurar os sabores.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="font-serif text-3xl font-bold">Painel de Sabores</h1>
        <button onClick={() => void handleReset()} className="text-xs border px-3 py-1.5 rounded">Restaurar Padrões</button>
      </div>
      {(loadError || error || configurationMessage) && (
        <p role="alert" className="mb-4 text-sm text-red-600">{error || loadError || configurationMessage}</p>
      )}
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
          <p className="text-xs text-gray-500">
            {imageStorage === "blob"
              ? "A foto otimizada será salva no Vercel Blob. Máximo: 8 MB."
              : imageStorage === "unavailable"
                ? "Configure Vercel Blob para enviar fotos; URLs de imagem continuam disponíveis."
                : "A foto otimizada será salva no banco local deste servidor. Máximo: 8 MB."}
          </p>
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
                <button type="button" onClick={() => void handleDelete(p.id)} className="text-xs text-red-500 font-bold">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}