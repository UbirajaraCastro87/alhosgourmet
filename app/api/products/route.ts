import { NextResponse } from "next/server";
import {
  addProduct,
  getProducts,
  importLegacyProducts,
  isLegacyImportPending,
  resetProducts,
  getStorageMode,
} from "@/lib/database";
import { isAdminRequest } from "@/lib/admin-auth";
import { Product } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseProduct(value: unknown): Omit<Product, "id"> | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.nome !== "string" ||
    !candidate.nome.trim() ||
    candidate.nome.length > 100 ||
    typeof candidate.descricao !== "string" ||
    candidate.descricao.length > 1000 ||
    typeof candidate.preco !== "number" ||
    !Number.isFinite(candidate.preco) ||
    candidate.preco < 0 ||
    typeof candidate.imagem !== "string" ||
    candidate.imagem.length > 5 * 1024 * 1024
  ) {
    return null;
  }

  const isOptimizedImage = candidate.imagem.startsWith("data:image/jpeg;base64,");
  if (isOptimizedImage && getStorageMode() === "postgres") return null;
  if (!isOptimizedImage) {
    try {
      const imageUrl = new URL(candidate.imagem);
      if (imageUrl.protocol !== "http:" && imageUrl.protocol !== "https:") return null;
    } catch {
      return null;
    }
  }

  return {
    nome: candidate.nome.trim(),
    descricao: candidate.descricao.trim(),
    preco: candidate.preco,
    imagem: candidate.imagem,
  };
}

export async function GET() {
  try {
    return NextResponse.json({
      products: await getProducts(),
      legacyImportPending: await isLegacyImportPending(),
    });
  } catch (error) {
    console.error("Failed to read products:", error);
    const message =
      getStorageMode() === "unconfigured"
        ? "Conecte um banco PostgreSQL ao projeto Vercel para carregar os sabores."
        : "Não foi possível carregar os sabores. Confira a conexão com o banco de dados.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const product = parseProduct(body);
  if (!product) {
    return NextResponse.json({ error: "Confira os dados e a foto do sabor." }, { status: 400 });
  }

  try {
    return NextResponse.json(await addProduct(product), { status: 201 });
  } catch (error) {
    console.error("Failed to add product:", error);
    return NextResponse.json({ error: "Não foi possível salvar o sabor. Confira a conexão com o banco de dados." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as { products?: unknown }).products)) {
    return NextResponse.json({ error: "Lista de sabores inválida." }, { status: 400 });
  }

  const rawProducts = (body as { products: unknown[] }).products;
  if (rawProducts.length > 100) {
    return NextResponse.json({ error: "A lista de sabores excede o limite permitido." }, { status: 400 });
  }

  const products: Product[] = [];
  for (const value of rawProducts) {
    const parsed = parseProduct(value);
    if (!parsed || typeof (value as Record<string, unknown>).id !== "string") {
      return NextResponse.json({ error: "Há dados inválidos na lista de sabores." }, { status: 400 });
    }
    products.push({ ...parsed, id: (value as Record<string, unknown>).id as string });
  }

  try {
    if (!(await importLegacyProducts(products))) {
      return NextResponse.json({ error: "A importação inicial já foi concluída." }, { status: 409 });
    }
    return NextResponse.json({ products: await getProducts() });
  } catch (error) {
    console.error("Failed to import legacy products:", error);
    return NextResponse.json({ error: "Não foi possível importar os sabores antigos. Confira a conexão com o banco de dados." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  try {
    await resetProducts();
    return NextResponse.json({ products: await getProducts() });
  } catch (error) {
    console.error("Failed to reset products:", error);
    return NextResponse.json({ error: "Não foi possível restaurar os sabores padrão. Confira a conexão com o banco de dados." }, { status: 500 });
  }
}
