import * as SQLite from "expo-sqlite";
import type { Invoice } from "./invoice";

type InvoiceRow = { data: string };
let dbPromise: ReturnType<typeof SQLite.openDatabaseAsync> | undefined;

async function database() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("invoice-maker.db").then(async db => {
      await db.execAsync(
        "PRAGMA journal_mode = WAL; " +
        "CREATE TABLE IF NOT EXISTS invoices (" +
        "id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);"
      );
      return db;
    }).catch(error => {
      dbPromise = undefined;
      throw error;
    });
  }
  return dbPromise;
}

export async function loadInvoices(): Promise<Invoice[]> {
  const db = await database();
  const rows = await db.getAllAsync<InvoiceRow>(
    "SELECT data FROM invoices ORDER BY updated_at DESC"
  );
  return rows.map(row => JSON.parse(row.data) as Invoice);
}

export async function saveInvoice(invoice: Invoice) {
  const db = await database();
  await db.runAsync(
    "INSERT INTO invoices (id, data, updated_at) VALUES (?, ?, ?) " +
    "ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
    invoice.id,
    JSON.stringify(invoice),
    invoice.updatedAt
  );
}

export async function removeInvoice(id: string) {
  const db = await database();
  await db.runAsync("DELETE FROM invoices WHERE id = ?", id);
}
