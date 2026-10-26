import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { defaultProducts } from "@/data/defaultProducts";
import { Product } from "@/types";

interface ProductRow {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string;
  position: number;
}

const globalForDatabase = globalThis as typeof globalThis & {
  alhosDatabase?: Database.Database;
};

function getDatabase() {
  if (!globalForDatabase.alhosDatabase) {
    const storageDirectory = path.join(process.cwd(), "storage");
    mkdirSync(storageDirectory, { recursive: true });

    const database = new Database(path.join(storageDirectory, "alhosgourmet.sqlite"));
    database.pragma("journal_mode = WAL");
    database.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        descricao TEXT NOT NULL,
        preco REAL NOT NULL,
        imagem TEXT NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const initialized = database
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get("initialized") as { value: string } | undefined;

    if (!initialized) {
      const insert = database.prepare(
        "INSERT INTO products (id, nome, descricao, preco, imagem, position) VALUES (?, ?, ?, ?, ?, ?)",
      );
      const initialize = database.transaction(() => {
        for (const [position, product] of defaultProducts.entries()) {
          insert.run(product.id, product.nome, product.descricao, product.preco, product.imagem, position);
        }
        database.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("initialized", "true");
        database.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("legacy_import_pending", "true");
      });
      initialize();
    }

    globalForDatabase.alhosDatabase = database;
  }
  return globalForDatabase.alhosDatabase;
}

function toProduct(row: ProductRow): Product {
  const { id, nome, descricao, preco, imagem } = row;
  return { id, nome, descricao, preco, imagem };
}

export function getSqliteProducts(): Product[] {
  return (getDatabase().prepare("SELECT * FROM products ORDER BY position ASC, rowid ASC").all() as ProductRow[]).map(toProduct);
}

export function isSqliteLegacyImportPending(): boolean {
  const setting = getDatabase()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get("legacy_import_pending") as { value: string } | undefined;
  return setting?.value === "true";
}

export function importSqliteLegacyProducts(products: Product[]): boolean {
  const database = getDatabase();
  const importProducts = database.transaction(() => {
    if (!isSqliteLegacyImportPending()) return false;

    if (products.length > 0) {
      database.prepare("DELETE FROM products").run();
      const insert = database.prepare(
        "INSERT INTO products (id, nome, descricao, preco, imagem, position) VALUES (?, ?, ?, ?, ?, ?)",
      );
      for (const [position, product] of products.entries()) {
        insert.run(product.id, product.nome, product.descricao, product.preco, product.imagem, position);
      }
    }

    database.prepare("UPDATE settings SET value = ? WHERE key = ?").run("false", "legacy_import_pending");
    return true;
  });
  return importProducts();
}

export function addSqliteProduct(product: Omit<Product, "id">): Product {
  const database = getDatabase();
  const created = { ...product, id: randomUUID() };
  const firstPosition = database
    .prepare("SELECT COALESCE(MIN(position), 0) - 1 AS position FROM products")
    .get() as { position: number };
  database
    .prepare("INSERT INTO products (id, nome, descricao, preco, imagem, position) VALUES (?, ?, ?, ?, ?, ?)")
    .run(created.id, created.nome, created.descricao, created.preco, created.imagem, firstPosition.position);
  return created;
}

export function updateSqliteProduct(product: Product): boolean {
  const result = getDatabase()
    .prepare("UPDATE products SET nome = ?, descricao = ?, preco = ?, imagem = ? WHERE id = ?")
    .run(product.nome, product.descricao, product.preco, product.imagem, product.id);
  return result.changes > 0;
}

export function deleteSqliteProduct(id: string): boolean {
  const result = getDatabase().prepare("DELETE FROM products WHERE id = ?").run(id);
  return result.changes > 0;
}

export function resetSqliteProducts(): void {
  const database = getDatabase();
  const reset = database.transaction(() => {
    database.prepare("DELETE FROM products").run();
    const insert = database.prepare(
      "INSERT INTO products (id, nome, descricao, preco, imagem, position) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const [position, product] of defaultProducts.entries()) {
      insert.run(product.id, product.nome, product.descricao, product.preco, product.imagem, position);
    }
  });
  reset();
}
