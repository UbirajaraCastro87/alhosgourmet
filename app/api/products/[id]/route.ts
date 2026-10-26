import { NextResponse } from "next/server";
import { deleteProduct, getStorageMode, updateProduct } from "@/lib/database";
import { isAdminRequest } from "@/lib/admin-auth";
import { Product } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseProduct(value: unknown, id: string): Product | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.id !== id ||
    typeof candidate.nome !== "string" ||
    !candidate.nome.trim() ||
    candidate.nome.length > 100 ||
    typeof candidate.descricao !== "string" ||
    candidate.descricao.length > 1000 ||
    typeof candidate.preco !== "number" ||
    !Number.isFinite(candidate.preco) ||
    candidate.preco < 0 ||
    typeof candidate.imagem !== "string" ||
    candidate.imagem.length > 5 * 1024 * 1024 ||
    (candidate.imagem.startsWith("data:image/") && getStorageMode() === "postgres")
  ) {
    return null;
  }

  if (!candidate.imagem.startsWith("data:image/jpeg;base64,")) {
    try {
      const imageUrl = new URL(candidate.imagem);
      if (imageUrl.protocol !== "http:" && imageUrl.protocol !== "https:") return null;
    } catch {
      return null;
    }
  }

  return {
    id,
    nome: candidate.nome.trim(),
    descricao: candidate.descricao.trim(),
    preco: candidate.preco,
    imagem: candidate.imagem,
  };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const product = parseProduct(body, id);
  if (!product) {
    return NextResponse.json({ error: "Confira os dados e a foto do sabor." }, { status: 400 });
  }

  try {
    if (!(await updateProduct(product))) {
      return NextResponse.json({ error: "Sabor não encontrado." }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Não foi possível atualizar o sabor. Confira a conexão com o banco de dados." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(_request)) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    if (!(await deleteProduct(id))) {
      return NextResponse.json({ error: "Sabor não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Não foi possível excluir o sabor. Confira a conexão com o banco de dados." }, { status: 500 });
  }
}
