import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Conecte um armazenamento Vercel Blob ao projeto para enviar fotos." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!isAdminRequest(request)) {
          throw new Error("Acesso administrativo necessário para enviar fotos.");
        }
        if (!pathname.startsWith("products/")) {
          throw new Error("Caminho de upload inválido.");
        }

        return {
          allowedContentTypes: ["image/jpeg"],
          maximumSizeInBytes: 2 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to authorize image upload:", error);
    return NextResponse.json({ error: "Não foi possível autorizar o envio da foto." }, { status: 400 });
  }
}
