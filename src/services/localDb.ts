import type { CatalystColumnMeta } from '../types/catalyst-sdk';
import type { CatalystRow } from '../types/catalyst.types';
import type { DemoDataset } from '../shared/lib/demoData';

/**
 * A tiny localStorage-backed "table" engine standing in for the real
 * Catalyst Data Store for this offline demo build. Each table is seeded
 * once from its DemoDataset (see shared/lib/demoData.ts) on first access,
 * then every read/write goes through localStorage so create/edit/delete
 * genuinely persist across reloads within this browser — this is real,
 * working CRUD, not a read-only mock.
 */

const STORAGE_PREFIX = 'ward-local-db:';

function storageKeyFor(table: string): string {
  return `${STORAGE_PREFIX}${table}`;
}

let rowSeq = Date.now();
export function nextRowId(): string {
  rowSeq += 1;
  return `local-${rowSeq}`;
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds()
  )}:${pad(d.getMilliseconds(), 3)}`;
}

interface StoredTable<T extends CatalystRow> {
  schema: CatalystColumnMeta[];
  rows: T[];
}

function readTable<T extends CatalystRow>(table: string, seed: DemoDataset): StoredTable<T> {
  const raw = localStorage.getItem(storageKeyFor(table));
  if (raw) {
    try {
      return JSON.parse(raw) as StoredTable<T>;
    } catch {
      // fall through to reseed on parse failure
    }
  }
  const seeded: StoredTable<T> = { schema: seed.schema, rows: seed.rows as T[] };
  localStorage.setItem(storageKeyFor(table), JSON.stringify(seeded));
  return seeded;
}

function writeTable<T extends CatalystRow>(table: string, data: StoredTable<T>): void {
  localStorage.setItem(storageKeyFor(table), JSON.stringify(data));
}

/** Simulates real network latency so loading states are visible, same as talking to an actual backend. */
function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const localDb = {
  async getSchema(table: string, seed: DemoDataset): Promise<CatalystColumnMeta[]> {
    const data = readTable(table, seed);
    return delay(data.schema);
  },

  async list<T extends CatalystRow>(table: string, seed: DemoDataset): Promise<T[]> {
    const data = readTable<T>(table, seed);
    return delay(data.rows);
  },

  async getById<T extends CatalystRow>(table: string, seed: DemoDataset, rowId: string): Promise<T> {
    const data = readTable<T>(table, seed);
    const row = data.rows.find((r) => r.ROWID === rowId);
    if (!row) throw new Error(`No row with ROWID "${rowId}" in table "${table}".`);
    return delay(row);
  },

  async create<T extends CatalystRow>(table: string, seed: DemoDataset, input: Partial<T>): Promise<T> {
    const data = readTable<T>(table, seed);
    const timestamp = nowStamp();
    const row = {
      ...input,
      ROWID: nextRowId(),
      CREATORID: 'local-demo-user',
      CREATEDTIME: timestamp,
      MODIFIEDTIME: timestamp,
    } as T;
    data.rows = [row, ...data.rows];
    writeTable(table, data);
    return delay(row);
  },

  async update<T extends CatalystRow>(table: string, seed: DemoDataset, input: Partial<T> & { ROWID: string }): Promise<T> {
    const data = readTable<T>(table, seed);
    let updated: T | undefined;
    data.rows = data.rows.map((row) => {
      if (row.ROWID !== input.ROWID) return row;
      updated = { ...row, ...input, MODIFIEDTIME: nowStamp() };
      return updated;
    });
    if (!updated) throw new Error(`No row with ROWID "${input.ROWID}" in table "${table}".`);
    writeTable(table, data);
    return delay(updated);
  },

  async remove<T extends CatalystRow>(table: string, seed: DemoDataset, rowId: string): Promise<T> {
    const data = readTable<T>(table, seed);
    const removed = data.rows.find((r) => r.ROWID === rowId);
    if (!removed) throw new Error(`No row with ROWID "${rowId}" in table "${table}".`);
    data.rows = data.rows.filter((r) => r.ROWID !== rowId);
    writeTable(table, data);
    return delay(removed);
  },

  /** Wipes this table back to its original seed — used by the demo-reset action. */
  reset(table: string): void {
    localStorage.removeItem(storageKeyFor(table));
  },
};
