import { NextResponse } from "next/server";
import { isAdminPasswordConfigured, isValidAdminPassword } from "@/lib/admin-auth";
import { getStorageMode } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Informe a senha administrativa." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || typeof (body as { password?: unknown }).password !== "string") {
    return NextResponse.json({ error: "Informe a senha administrativa." }, { status: 400 });
  }

  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: "Configure ADMIN_PASSWORD no ambiente para liberar o painel administrativo." },
      { status: 503 },
    );
  }

  if (getStorageMode() === "unconfigured") {
    return NextResponse.json(
      { error: "Conecte um banco PostgreSQL ao projeto Vercel para habilitar o painel." },
      { status: 503 },
    );
  }

  if (!isValidAdminPassword((body as { password: string }).password)) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
