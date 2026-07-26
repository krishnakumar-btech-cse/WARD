import { localDb } from './localDb';
import { ok, fail, type ApiResult } from '../utils/apiResponse';
import { CatalystApiError } from '../utils/apiError';
import type { ResourceService } from './resourceServiceTypes';
import type { CatalystRow } from '../types/catalyst.types';
import type { DemoDataset } from '../shared/lib/demoData';

/** Builds a ResourceService<T> for one table, backed by localDb — see localDb.ts for the storage engine. */
export function createLocalResourceService<T extends CatalystRow>(table: string, seed: DemoDataset): ResourceService<T> {
  async function guarded<R>(op: () => Promise<R>): Promise<ApiResult<R>> {
    try {
      return ok(await op());
    } catch (error) {
      return fail(new CatalystApiError({ message: error instanceof Error ? error.message : 'Local demo data error', code: 'REQUEST_FAILED' }));
    }
  }

  return {
    list: () =>
      guarded(async () => {
        const rows = await localDb.list<T>(table, seed);
        return { status: 200, message: 'success', content: rows, more_records: false };
      }),
    getById: (rowId) => guarded(() => localDb.getById<T>(table, seed, rowId)),
    create: (input) => guarded(async () => [await localDb.create<T>(table, seed, input as Partial<T>)]),
    update: (input) => guarded(async () => [await localDb.update<T>(table, seed, input as Partial<T> & { ROWID: string })]),
    remove: (rowId) => guarded(() => localDb.remove<T>(table, seed, rowId)),
    getSchema: () => guarded(() => localDb.getSchema(table, seed)),
  };
}
