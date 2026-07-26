import { createLocalFileAttachedResourceService } from './createLocalFileAttachedResourceService';
import { NOTEBOOK_ENTRIES_DEMO } from '../shared/lib/demoData';
import type { NotebookEntryRecord } from '../types/notebook.types';

export const notebookService = createLocalFileAttachedResourceService<NotebookEntryRecord>('notebookEntries', NOTEBOOK_ENTRIES_DEMO);
