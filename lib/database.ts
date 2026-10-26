import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { defaultProducts } from "@/data/defaultProducts";
import { Product } from "@/types";

interface ProductRow {
  id: string;
  nome: string;
  descricao: string;
  preco: number | string;
  imagem: string;
}

interface SettingRow {
  value: string;
}

type StorageMode = "postgres" | "sqlite" | "unconfigured";

const globalForDatabase = globalThis as typeof globalThis & {
  alhosPostgres?: ReturnType<typeof neon>;
  alhosSchemaReady?: boolean;
  alhosSchemaPromise?: Promise<void>;
};

function getConnectionString() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
}

export function getStorageMode(): StorageMode {
  if (getConnectionString()) return "postgres";
  if (process.env.VERCEL) return "unconfigured";
  return "sqlite";
}

export function isBlobStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function getPostgres() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "Configure POSTGRES_URL na Vercel conectando um banco PostgreSQL pelo Marketplace.",
    );
  }

  if (!globalForDatabase.alhosPostgres) {
    globalForDatabase.alhosPostgres = neon(connectionString);
  }
  return globalForDatabase.alhosPostgres;
}

function queryRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as T[];
  }
  throw new Error("O banco PostgreSQL retornou um resultado inválido.");
}

async function ensurePostgresSchema() {
  if (globalForDatabase.alhosSchemaReady) return;
  if (!globalForDatabase.alhosSchemaPromise) {
    globalForDatabase.alhosSchemaPromise = (async () => {
      const sql = getPostgres();
      await sql`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          nome TEXT NOT NULL,
          descricao TEXT NOT NULL,
          preco DOUBLE PRECISION NOT NULL,
          imagem TEXT NOT NULL,
          position INTEGER NOT NULL
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `;

      const initialized = queryRows<{ key: string }>(await sql`
          INSERT INTO settings (key, value)
          VALUES ('initialized', 'true')
          ON CONFLICT (key) DO NOTHING
          RETURNING key
        `);

      if (initialized.length > 0) {
        try {
          await sql.transaction([
            ...defaultProducts.map(
              (product, position) => sql`
                INSERT INTO products (id, nome, descricao, preco, imagem, position)
                VALUES (${product.id}, ${product.nome}, ${product.descricao}, ${product.preco}, ${product.imagem}, ${position})
                ON CONFLICT (id) DO NOTHING
              `,
            ),
            sql`
              INSERT INTO settings (key, value)
              VALUES ('legacy_import_pending', 'true')
              ON CONFLICT (key) DO NOTHING
            `,
          ]);
        } catch (error) {
          await sql`DELETE FROM settings WHERE key = 'initialized'`;
          throw error;
        }
      }

      globalForDatabase.alhosSchemaReady = true;
    })().catch((error: unknown) => {
      globalForDatabase.alhosSchemaPromise = undefined;
      throw error;
    });
  }
  await globalForDatabase.alhosSchemaPromise;
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    preco: Number(row.preco),
    imagem: row.imagem,
  };
}

export async function getProducts(): Promise<Product[]> {
  if (getStorageMode() === "sqlite") {
    const { getSqliteProducts } = await import("@/lib/sqlite-database");
    return getSqliteProducts();
  }
  await ensurePostgresSchema();
  const rows = queryRows<ProductRow>(await getPostgres()`SELECT id, nome, descricao, preco, imagem FROM products ORDER BY position ASC`);
  return rows.map(toProduct);
}

export async function isLegacyImportPending(): Promise<boolean> {
  if (getStorageMode() === "sqlite") {
    const { isSqliteLegacyImportPending } = await import("@/lib/sqlite-database");
    return isSqliteLegacyImportPending();
  }
  await ensurePostgresSchema();
  const [setting] = queryRows<SettingRow>(await getPostgres()`SELECT value FROM settings WHERE key = 'legacy_import_pending'`);
  return setting?.value === "true";
}

export async function importLegacyProducts(products: Product[]): Promise<boolean> {
  if (getStorageMode() === "sqlite") {
    const { importSqliteLegacyProducts } = await import("@/lib/sqlite-database");
    return importSqliteLegacyProducts(products);
  }
  await ensurePostgresSchema();
  const sql = getPostgres();
  const [setting] = queryRows<SettingRow>(await sql`SELECT value FROM settings WHERE key = 'legacy_import_pending'`);
  if (setting?.value !== "true") return false;

  const queries = [];
  if (products.length > 0) {
    queries.push(sql`DELETE FROM products`);
    queries.push(
      ...products.map(
        (product, position) => sql`
          INSERT INTO products (id, nome, descricao, preco, imagem, position)
          VALUES (${product.id}, ${product.nome}, ${product.descricao}, ${product.preco}, ${product.imagem}, ${position})
        `,
      ),
    );
  }
  queries.push(sql`UPDATE settings SET value = 'false' WHERE key = 'legacy_import_pending'`);
  await sql.transaction(queries);
  return true;
}

export async function addProduct(product: Omit<Product, "id">): Promise<Product> {
  if (getStorageMode() === "sqlite") {
    const { addSqliteProduct } = await import("@/lib/sqlite-database");
    return addSqliteProduct(product);
  }
  await ensurePostgresSchema();
  const sql = getPostgres();
  const created = { ...product, id: randomUUID() };
  const [positionRow] = queryRows<{ position: number }>(await sql`SELECT COALESCE(MIN(position), 0) - 1 AS position FROM products`);
  await sql`
    INSERT INTO products (id, nome, descricao, preco, imagem, position)
    VALUES (${created.id}, ${created.nome}, ${created.descricao}, ${created.preco}, ${created.imagem}, ${positionRow.position})
  `;
  return created;
}

export async function updateProduct(product: Product): Promise<boolean> {
  if (getStorageMode() === "sqlite") {
    const { updateSqliteProduct } = await import("@/lib/sqlite-database");
    return updateSqliteProduct(product);
  }
  await ensurePostgresSchema();
  const rows = queryRows<{ id: string }>(await getPostgres()`
    UPDATE products
    SET nome = ${product.nome}, descricao = ${product.descricao}, preco = ${product.preco}, imagem = ${product.imagem}
    WHERE id = ${product.id}
    RETURNING id
  `);
  return rows.length > 0;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (getStorageMode() === "sqlite") {
    const { deleteSqliteProduct } = await import("@/lib/sqlite-database");
    return deleteSqliteProduct(id);
  }
  await ensurePostgresSchema();
  const rows = queryRows<{ id: string }>(await getPostgres()`DELETE FROM products WHERE id = ${id} RETURNING id`);
  return rows.length > 0;
}

export async function resetProducts(): Promise<void> {
  if (getStorageMode() === "sqlite") {
    const { resetSqliteProducts } = await import("@/lib/sqlite-database");
    return resetSqliteProducts();
  }
  await ensurePostgresSchema();
  const sql = getPostgres();
  await sql.transaction([
    sql`DELETE FROM products`,
    ...defaultProducts.map(
      (product, position) => sql`
        INSERT INTO products (id, nome, descricao, preco, imagem, position)
        VALUES (${product.id}, ${product.nome}, ${product.descricao}, ${product.preco}, ${product.imagem}, ${position})
      `,
    ),
  ]);
}
