import { timingSafeEqual } from "node:crypto";

function getConfiguredPassword(): string {
  return process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "development" ? "admin123" : "");
}

export function isValidAdminPassword(password: string): boolean {
  const expected = getConfiguredPassword();
  if (!expected) return false;

  const suppliedBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function isAdminRequest(request: Request): boolean {
  return isValidAdminPassword(request.headers.get("x-admin-password") || "");
}

export function isAdminPasswordConfigured(): boolean {
  return Boolean(getConfiguredPassword());
}
