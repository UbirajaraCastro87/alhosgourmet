import { NextResponse } from "next/server";
import { getStorageMode, isBlobStorageConfigured } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const storageMode = getStorageMode();
  return NextResponse.json({
    storageMode,
    imageStorage: isBlobStorageConfigured()
      ? "blob"
      : storageMode === "postgres"
        ? "unavailable"
        : "inline",
    configurationMessage:
      storageMode === "unconfigured"
        ? "Conecte um banco PostgreSQL ao projeto Vercel para salvar os sabores."
        : process.env.VERCEL && !isBlobStorageConfigured()
          ? "Conecte um armazenamento Vercel Blob para ativar o upload de fotos."
          : "",
  });
}
