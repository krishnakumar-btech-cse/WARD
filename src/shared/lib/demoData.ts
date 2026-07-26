import type { CatalystColumnMeta } from '../../types/catalyst-sdk';
import type { CatalystRow } from '../../types/catalyst.types';
import { toFieldLabel } from './utils';

/**
 * This build runs entirely on local, in-browser data (see services/localDb.ts)
 * rather than a live backend — see index.html / vite.config.ts for where the
 * real Zoho Catalyst connection is commented out. Every dataset below is the
 * actual seed data for that local database, not a "sample fallback"; it's
 * realistic, hand-authored content for a fictional metropolitan police
 * department, persisted to localStorage/IndexedDB once a table is first
 * read, and fully editable (create/update/delete genuinely persist).
 *
 * synthesizeRowsFromSchema below is kept for the (currently unused) real-
 * backend code path: if that's ever reconnected, a table that exists but is
 * empty still gets plausible rows generated from its live column metadata.
 */

let demoRowSeq = 0;

function demoColumn(name: string, dataType: string, overrides: Partial<CatalystColumnMeta> = {}): CatalystColumnMeta {
  return {
    table_id: 'demo-table',
    column_id: `demo-col-${name}`,
    column_name: name,
    data_type: dataType,
    is_mandatory: false,
    ...overrides,
  };
}

function formatDemoTimestamp(date: Date): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}:${pad(date.getMilliseconds(), 3)}`;
}

function demoRow<T extends Record<string, unknown>>(fields: T, hoursAgo = 0): T & CatalystRow {
  demoRowSeq += 1;
  const timestamp = formatDemoTimestamp(new Date(Date.now() - hoursAgo * 3_600_000));
  return {
    ROWID: `demo-${demoRowSeq}`,
    CREATORID: 'demo-seed',
    CREATEDTIME: timestamp,
    MODIFIEDTIME: timestamp,
    ...fields,
  };
}

const GENERIC_STATUS_CYCLE = ['Open', 'In Progress', 'Resolved', 'Closed'];
const GENERIC_PRIORITY_CYCLE = ['Low', 'Medium', 'High', 'Critical'];
const GENERIC_SENTENCES = [
  'Awaiting further review before this can be finalized.',
  'Cross-referenced against related records with no conflicts found.',
  'Flagged for follow-up during the next case review cycle.',
  'Consistent with patterns observed in similar prior cases.',
];

/** Generates plausible values for a table that's real but currently empty, purely from its live column metadata. */
export function synthesizeRowsFromSchema<T extends CatalystRow>(schema: CatalystColumnMeta[], count = 5): T[] {
  const editable = schema.filter((c) => !['ROWID', 'CREATORID', 'CREATEDTIME', 'MODIFIEDTIME'].includes(c.column_name.toUpperCase()));

  return Array.from({ length: count }, (_, index) => {
    const fields: Record<string, unknown> = {};
    for (const column of editable) {
      fields[column.column_name] = synthesizeValue(column, index);
    }
    return demoRow(fields, index * 6) as T;
  });
}

function synthesizeValue(column: CatalystColumnMeta, index: number): unknown {
  const type = column.data_type.toLowerCase();
  const name = column.column_name.toLowerCase();
  const label = toFieldLabel(column.column_name);

  if (type.includes('bool')) return index % 2 === 0;
  if (type.includes('datetime') || type.includes('timestamp')) return formatDemoTimestamp(new Date(Date.now() - index * 21_600_000));
  if (type.includes('date')) return formatDemoTimestamp(new Date(Date.now() - index * 86_400_000)).slice(0, 10);
  if (type.includes('int') || type.includes('decimal') || type.includes('double') || type.includes('float')) {
    return 10 + index * 7;
  }
  if (name.includes('status')) return GENERIC_STATUS_CYCLE[index % GENERIC_STATUS_CYCLE.length];
  if (name.includes('priority') || name.includes('severity')) return GENERIC_PRIORITY_CYCLE[index % GENERIC_PRIORITY_CYCLE.length];
  if (name.includes('description') || name.includes('summary') || name.includes('note') || name.includes('content')) {
    return GENERIC_SENTENCES[index % GENERIC_SENTENCES.length];
  }
  return `Sample ${label} ${index + 1}`;
}

export interface DemoDataset {
  schema: CatalystColumnMeta[];
  rows: CatalystRow[];
}

export interface ResolvedTableDisplay<T extends CatalystRow> {
  /** Real schema when available, otherwise the demo dataset's schema. Never includes both. */
  columns: CatalystColumnMeta[];
  rows: T[];
  isDemo: boolean;
}

/**
 * The shared two-tier fallback decision used everywhere a table is
 * rendered: table missing entirely -> hand-authored demo dataset; table
 * real but empty -> rows synthesized from its real schema; otherwise real
 * data. Centralized so SchemaResourcePanel and the Investigation Canvas
 * (which needs raw rows, not a rendered table) agree on the same rules.
 * In this local-data build the local services never error and are always
 * seeded, so every table always takes the final "real data" branch below —
 * this logic only re-activates if the real Catalyst backend is reconnected.
 */
export function resolveTableDisplay<T extends CatalystRow>(params: {
  schema?: CatalystColumnMeta[];
  schemaIsError: boolean;
  realRows: T[];
  listSettled: boolean;
  demoDataset?: DemoDataset;
  fallbackEnabled: boolean;
}): ResolvedTableDisplay<T> {
  const { schema, schemaIsError, realRows, listSettled, demoDataset, fallbackEnabled } = params;

  // Both schema and realRows are typed as arrays, but they ultimately come
  // from an external API response (`content`) — an auth failure or
  // malformed response can resolve successfully with a non-array payload
  // instead of rejecting the query, so this boundary re-validates at
  // runtime rather than trusting the type.
  const safeSchema = Array.isArray(schema) ? schema : undefined;
  const safeRows = Array.isArray(realRows) ? realRows : [];

  const tableMissing = (schemaIsError || (schema !== undefined && !safeSchema)) && fallbackEnabled && Boolean(demoDataset);
  if (tableMissing) {
    return { columns: demoDataset!.schema, rows: demoDataset!.rows as T[], isDemo: true };
  }

  const tableEmpty = Boolean(safeSchema) && listSettled && safeRows.length === 0 && fallbackEnabled;
  if (tableEmpty) {
    return { columns: safeSchema!, rows: synthesizeRowsFromSchema<T>(safeSchema!, 5), isDemo: true };
  }

  return { columns: safeSchema ?? [], rows: safeRows, isDemo: false };
}

// =============================================================================
// Central Metropolitan Police Department — local seed data
// 10 cases across 5 districts, cross-referenced evidence/notebook/network data.
// =============================================================================

// --- Cases -------------------------------------------------------------------

export const CASES_DEMO: DemoDataset = {
  schema: [
    demoColumn('CaseNumber', 'varchar', { max_length: '20' }),
    demoColumn('Title', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('CrimeType', 'varchar', { max_length: '60' }),
    demoColumn('Status', 'varchar', { max_length: '30' }),
    demoColumn('Priority', 'varchar', { max_length: '20' }),
    demoColumn('District', 'varchar', { max_length: '60' }),
    demoColumn('PoliceStation', 'varchar', { max_length: '80' }),
    demoColumn('Description', 'text'),
  ],
  rows: [
    demoRow(
      {
        CaseNumber: 'WD-2026-0142',
        Title: 'Warehouse Burglary — MG Road',
        CrimeType: 'Burglary',
        Status: 'Under Investigation',
        Priority: 'High',
        District: 'Central',
        PoliceStation: 'MG Road PS',
        Description: 'Forced entry reported at a logistics warehouse; CCTV and one suspect vehicle identified.',
      },
      6
    ),
    demoRow(
      {
        CaseNumber: 'WD-2026-0139',
        Title: 'Vehicle Theft — Sector 12',
        CrimeType: 'Vehicle Theft',
        Status: 'Open',
        Priority: 'Medium',
        District: 'North',
        PoliceStation: 'Sector 12 PS',
        Description: 'White sedan reported stolen from a residential parking lot overnight.',
      },
      18
    ),
    demoRow(
      {
        CaseNumber: 'WD-2026-0135',
        Title: 'Cyber Fraud Complaint',
        CrimeType: 'Cybercrime',
        Status: 'Assigned',
        Priority: 'Critical',
        District: 'Central',
        PoliceStation: 'Cyber Cell',
        Description: 'Victim reports unauthorized transactions totaling ₹2.4L via a phishing link.',
      },
      30
    ),
    demoRow(
      {
        CaseNumber: 'WD-2026-0128',
        Title: 'Assault Near Market Complex',
        CrimeType: 'Assault',
        Status: 'Under Investigation',
        Priority: 'High',
        District: 'East',
        PoliceStation: 'East Market PS',
        Description: 'Altercation outside a market complex resulted in injuries to two individuals.',
      },
      48
    ),
    demoRow(
      {
        CaseNumber: 'WD-2026-0121',
        Title: 'Residential Burglary',
        CrimeType: 'Burglary',
        Status: 'Resolved',
        Priority: 'Low',
        District: 'West',
        PoliceStation: 'West Zone PS',
        Description: 'Suspect apprehended with recovered stolen property.',
      },
      96
    ),
    demoRow(
      {
        CaseNumber: 'WD-2026-0114',
        Title: 'Missing Person Report',
        CrimeType: 'Missing Person',
        Status: 'Closed',
        Priority: 'Medium',
        District: 'South',
        PoliceStation: 'South District PS',
        Description: 'Individual located safely after a three-day search; case closed.',
      },
      140
    ),
    demoRow(
      {
        CaseNumber: 'WD-2026-0148',
        Title: 'Chain Snatching — Central Market',
        CrimeType: 'Robbery',
        Status: 'Under Investigation',
        Priority: 'High',
        District: 'Central',
        PoliceStation: 'MG Road PS',
        Description: 'Two-wheeler-borne suspects snatched a gold chain from a pedestrian near Central Market and fled toward the ring road.',
      },
      3
    ),
    demoRow(
      {
        CaseNumber: 'WD-2026-0146',
        Title: 'ATM Fraud — Multiple Withdrawals',
        CrimeType: 'Cybercrime',
        Status: 'Assigned',
        Priority: 'Critical',
        District: 'North',
        PoliceStation: 'Sector 12 PS',
        Description: 'Victim reports five unauthorized ATM withdrawals totaling ₹85,000 within a two-hour window after a card-skimming incident.',
      },
      9
    ),
    demoRow(
      {
        CaseNumber: 'WD-2026-0144',
        Title: 'Domestic Disturbance Complaint',
        CrimeType: 'Domestic Dispute',
        Status: 'Open',
        Priority: 'Medium',
        District: 'East',
        PoliceStation: 'East Market PS',
        Description: 'Neighbor-reported disturbance; responding officers separated the parties and filed a formal complaint at the complainant’s request.',
      },
      16
    ),
    demoRow(
      {
        CaseNumber: 'WD-2026-0140',
        Title: 'Narcotics Seizure — Highway Checkpoint',
        CrimeType: 'Narcotics',
        Status: 'Under Investigation',
        Priority: 'Critical',
        District: 'South',
        PoliceStation: 'South District PS',
        Description: 'Routine highway checkpoint led to the seizure of a concealed narcotics consignment; two occupants detained for questioning.',
      },
      26
    ),
  ],
};

// --- Case Assignments ---------------------------------------------------------

export const CASE_ASSIGNMENTS_DEMO: DemoDataset = {
  schema: [
    demoColumn('CaseId', 'varchar', { max_length: '40' }),
    demoColumn('OfficerName', 'varchar', { max_length: '120', is_mandatory: true }),
    demoColumn('Role', 'varchar', { max_length: '60' }),
    demoColumn('AssignedDate', 'date'),
  ],
  rows: [
    demoRow({ CaseId: 'demo-1', OfficerName: 'Inspector Arjun Rao', Role: 'Lead Investigator', AssignedDate: '2026-06-10' }, 20),
    demoRow({ CaseId: 'demo-1', OfficerName: 'SI Meena Iyer', Role: 'Supporting Officer', AssignedDate: '2026-06-11' }, 19),
    demoRow({ CaseId: 'demo-2', OfficerName: 'HC Suresh Kumar', Role: 'Lead Investigator', AssignedDate: '2026-07-08' }, 17),
    demoRow({ CaseId: 'demo-3', OfficerName: 'Inspector Arjun Rao', Role: 'Lead Investigator', AssignedDate: '2026-06-25' }, 29),
    demoRow({ CaseId: 'demo-3', OfficerName: 'Analyst Priya Menon', Role: 'Cyber Forensics Analyst', AssignedDate: '2026-06-26' }, 28),
    demoRow({ CaseId: 'demo-3', OfficerName: 'DCP Meera Sharma', Role: 'Supervising Officer', AssignedDate: '2026-06-25' }, 29),
    demoRow({ CaseId: 'demo-4', OfficerName: 'SI Meena Iyer', Role: 'Lead Investigator', AssignedDate: '2026-05-27' }, 47),
    demoRow({ CaseId: 'demo-7', OfficerName: 'Inspector Arjun Rao', Role: 'Lead Investigator', AssignedDate: '2026-07-23' }, 3),
    demoRow({ CaseId: 'demo-8', OfficerName: 'Analyst Priya Menon', Role: 'Cyber Forensics Analyst', AssignedDate: '2026-07-17' }, 9),
    demoRow({ CaseId: 'demo-8', OfficerName: 'DCP Meera Sharma', Role: 'Supervising Officer', AssignedDate: '2026-07-17' }, 9),
    demoRow({ CaseId: 'demo-10', OfficerName: 'HC Suresh Kumar', Role: 'Lead Investigator', AssignedDate: '2026-07-10' }, 26),
    demoRow({ CaseId: 'demo-10', OfficerName: 'SI Meena Iyer', Role: 'Supporting Officer', AssignedDate: '2026-07-10' }, 26),
  ],
};

// --- Evidence ------------------------------------------------------------------

export const EVIDENCE_DEMO: DemoDataset = {
  schema: [
    demoColumn('Title', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('FileType', 'varchar', { max_length: '20' }),
    demoColumn('FileKey', 'varchar', { max_length: '260' }),
    demoColumn('CaseId', 'varchar', { max_length: '40' }),
    demoColumn('Description', 'text'),
    demoColumn('OcrText', 'text'),
    demoColumn('Transcript', 'text'),
    demoColumn('AiSummary', 'text'),
  ],
  rows: [
    demoRow(
      {
        Title: 'Rear entrance CCTV — still frame, 23:41',
        FileType: 'image',
        FileKey: 'demo-assets/evidence-cctv-still.png',
        CaseId: 'demo-1',
        Description: 'Still captured from the rear-door camera covering the estimated window of entry.',
        OcrText: '',
        Transcript: '',
        AiSummary:
          'A figure matching the primary suspect’s build approaches the rear door at 23:41 and is inside by 23:44. A vehicle matching the white sedan is visible idling at the property line from 23:38.',
      },
      5
    ),
    demoRow(
      {
        Title: 'Recovered pocket knife — close-up',
        FileType: 'image',
        FileKey: 'demo-assets/evidence-photo-knife.png',
        CaseId: 'demo-1',
        Description: 'Photographed in situ near the rear service door before collection.',
        OcrText: '',
        Transcript: '',
        AiSummary: 'Folding knife, approx. 9cm blade, visible staining consistent with the scene report. No visible serial marking.',
      },
      6
    ),
    demoRow(
      {
        Title: 'Witness statement — Mr. Verma (scanned)',
        FileType: 'image',
        FileKey: 'demo-assets/evidence-witness-statement.png',
        CaseId: 'demo-1',
        Description: 'Handwritten statement taken on-site, scanned for the case file.',
        OcrText:
          'I was closing my shop around midnight when I saw a white car parked near the warehouse gate. It left in a hurry a few minutes later heading toward MG Road.',
        Transcript: '',
        AiSummary: '',
      },
      10
    ),
    demoRow(
      {
        Title: 'Witness interview — Mr. Verma (audio)',
        FileType: 'audio',
        FileKey: '',
        CaseId: 'demo-1',
        Description: 'Follow-up interview recorded at the station.',
        OcrText: '',
        Transcript:
          '"...the car was white, maybe a sedan. I didn’t get the plate but it definitely came from the warehouse side. It left fast, like someone in a hurry."',
        AiSummary: '',
      },
      8
    ),
    demoRow(
      {
        Title: 'Vehicle registration extract',
        FileType: 'image',
        FileKey: 'demo-assets/evidence-document-scan.png',
        CaseId: 'demo-1',
        Description: 'RTO extract for the vehicle identified on CCTV.',
        OcrText: 'Registration: KA01AB1234 | Owner: R. Kumar | Make: Maruti Swift | Color: White | Registered since: 2022',
        Transcript: '',
        AiSummary: '',
      },
      4
    ),
    demoRow(
      {
        Title: 'Recovered stolen vehicle — photograph',
        FileType: 'image',
        FileKey: 'demo-assets/evidence-photo-vehicle.png',
        CaseId: 'demo-2',
        Description: 'Vehicle recovered abandoned two blocks from the reported theft location.',
        OcrText: '',
        Transcript: '',
        AiSummary: '',
      },
      12
    ),
    demoRow(
      {
        Title: 'Bank statement extract — disputed transactions',
        FileType: 'image',
        FileKey: 'demo-assets/evidence-document-scan.png',
        CaseId: 'demo-3',
        Description: 'Statement highlighting the five unauthorized transactions flagged by the complainant.',
        OcrText: 'Account ending 4521 | 5 transactions | Total disputed amount: ₹2,40,000 | Merchant category: E-commerce',
        Transcript: '',
        AiSummary: 'Transaction timestamps cluster within an 18-minute window, consistent with an automated phishing-kit checkout flow rather than manual card entry.',
      },
      28
    ),
    demoRow(
      {
        Title: 'CCTV still — suspects on two-wheeler',
        FileType: 'image',
        FileKey: 'demo-assets/evidence-cctv-still.png',
        CaseId: 'demo-7',
        Description: 'Captured from the market-entrance camera moments before the snatching.',
        OcrText: '',
        Transcript: '',
        AiSummary: 'Two occupants, no visible helmet, plate obscured by mud — consistent with prior chain-snatching pattern in this district.',
      },
      3
    ),
    demoRow(
      {
        Title: 'ATM transaction slip — disputed withdrawal',
        FileType: 'image',
        FileKey: 'demo-assets/evidence-document-scan.png',
        CaseId: 'demo-8',
        Description: 'Slip recovered from the ATM matching one of the five disputed withdrawal timestamps.',
        OcrText: 'ATM ID: SEC12-04 | Withdrawal: ₹20,000 | Time: 02:14:08',
        Transcript: '',
        AiSummary: '',
      },
      9
    ),
    demoRow(
      {
        Title: 'Seized package — field photograph',
        FileType: 'image',
        FileKey: 'demo-assets/evidence-document-scan.png',
        CaseId: 'demo-10',
        Description: 'Photograph of the concealed package as recovered from the vehicle’s underbody compartment.',
        OcrText: '',
        Transcript: '',
        AiSummary: '',
      },
      25
    ),
  ],
};

// --- Investigation Workspace board ---------------------------------------------

export const WORKSPACE_ITEMS_DEMO: DemoDataset = {
  schema: [
    demoColumn('CaseId', 'varchar', { max_length: '40' }),
    demoColumn('ItemType', 'varchar', { max_length: '40' }),
    demoColumn('Label', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('Description', 'text'),
    demoColumn('PositionX', 'decimal'),
    demoColumn('PositionY', 'decimal'),
  ],
  rows: [
    demoRow({ CaseId: 'demo-1', ItemType: 'Suspect', Label: 'Rajesh Kumar', Description: 'Primary suspect, last seen near the scene at 23:40.' }, 2),
    demoRow({ CaseId: 'demo-1', ItemType: 'Victim', Label: 'Ananya Sharma', Description: 'Store manager, reported the incident.' }, 3),
    demoRow({ CaseId: 'demo-1', ItemType: 'Witness', Label: 'Mr. Verma (shopkeeper)', Description: 'Saw a white sedan leave around midnight.' }, 4),
    demoRow({ CaseId: 'demo-1', ItemType: 'Vehicle', Label: 'White Maruti Swift — KA01AB1234', Description: 'Registered to R. Kumar.' }, 5),
    demoRow({ CaseId: 'demo-1', ItemType: 'Location', Label: 'Warehouse 7B, MG Road', Description: 'Point of forced entry.' }, 6),
    demoRow({ CaseId: 'demo-1', ItemType: 'Evidence', Label: 'Recovered pocket knife', Description: 'Found near the rear service door.' }, 7),
    demoRow({ CaseId: 'demo-8', ItemType: 'Suspect', Label: 'Unidentified male, ~30s', Description: 'Seen withdrawing cash on ATM camera footage at 02:14.' }, 9),
    demoRow({ CaseId: 'demo-8', ItemType: 'Victim', Label: 'Deepak Nair', Description: 'Account holder who reported the disputed withdrawals.' }, 9),
    demoRow({ CaseId: 'demo-8', ItemType: 'Location', Label: 'ATM SEC12-04, Sector 12', Description: 'Site of the disputed withdrawals.' }, 9),
    demoRow({ CaseId: 'demo-8', ItemType: 'Device', Label: 'Skimmer device (recovered)', Description: 'Recovered from the ATM card slot during inspection.' }, 7),
  ],
};

export const WORKSPACE_EDGES_DEMO: DemoDataset = {
  schema: [
    demoColumn('CaseId', 'varchar', { max_length: '40' }),
    demoColumn('FromLabel', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('ToLabel', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('RelationshipType', 'varchar', { max_length: '80' }),
  ],
  rows: [
    demoRow({ CaseId: 'demo-1', FromLabel: 'Rajesh Kumar', ToLabel: 'White Maruti Swift — KA01AB1234', RelationshipType: 'Owns' }, 2),
    demoRow({ CaseId: 'demo-1', FromLabel: 'Rajesh Kumar', ToLabel: 'Warehouse 7B, MG Road', RelationshipType: 'Last seen at' }, 3),
    demoRow({ CaseId: 'demo-1', FromLabel: 'Recovered pocket knife', ToLabel: 'Warehouse 7B, MG Road', RelationshipType: 'Recovered from' }, 4),
    demoRow({ CaseId: 'demo-1', FromLabel: 'Mr. Verma (shopkeeper)', ToLabel: 'White Maruti Swift — KA01AB1234', RelationshipType: 'Witnessed' }, 5),
    demoRow({ CaseId: 'demo-8', FromLabel: 'Unidentified male, ~30s', ToLabel: 'ATM SEC12-04, Sector 12', RelationshipType: 'Captured at' }, 8),
    demoRow({ CaseId: 'demo-8', FromLabel: 'Skimmer device (recovered)', ToLabel: 'ATM SEC12-04, Sector 12', RelationshipType: 'Recovered from' }, 7),
    demoRow({ CaseId: 'demo-8', FromLabel: 'Deepak Nair', ToLabel: 'ATM SEC12-04, Sector 12', RelationshipType: 'Reported incident at' }, 9),
  ],
};

export const CASE_HYPOTHESES_DEMO: DemoDataset = {
  schema: [
    demoColumn('CaseId', 'varchar', { max_length: '40' }),
    demoColumn('Statement', 'text', { is_mandatory: true }),
    demoColumn('Confidence', 'varchar', { max_length: '20' }),
  ],
  rows: [
    demoRow(
      { CaseId: 'demo-1', Statement: 'Suspect entered through the rear service door using a duplicate key.', Confidence: 'Medium' },
      3
    ),
    demoRow(
      { CaseId: 'demo-1', Statement: 'The vehicle seen on the shopkeeper’s account belongs to the primary suspect.', Confidence: 'High' },
      5
    ),
    demoRow(
      { CaseId: 'demo-8', Statement: 'A skimming device was installed on the ATM 24–48 hours before the disputed withdrawals.', Confidence: 'High' },
      8
    ),
    demoRow(
      { CaseId: 'demo-8', Statement: 'The withdrawals were made in person at the same ATM, not via a cloned card used elsewhere.', Confidence: 'Medium' },
      7
    ),
  ],
};

export const CASE_TASKS_DEMO: DemoDataset = {
  schema: [
    demoColumn('CaseId', 'varchar', { max_length: '40' }),
    demoColumn('Title', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('AssignedTo', 'varchar', { max_length: '80' }),
    demoColumn('Status', 'varchar', { max_length: '20' }),
    demoColumn('DueDate', 'date'),
  ],
  rows: [
    demoRow({ CaseId: 'demo-1', Title: 'Interview night-shift security guard', AssignedTo: 'SI Meena Iyer', Status: 'Pending', DueDate: '2026-07-29' }, 1),
    demoRow({ CaseId: 'demo-1', Title: 'Cross-check vehicle registration', AssignedTo: 'HC Suresh Kumar', Status: 'Completed', DueDate: '2026-07-24' }, 4),
    demoRow({ CaseId: 'demo-1', Title: 'Request CCTV footage from adjacent stores', AssignedTo: 'SI Meena Iyer', Status: 'In Progress', DueDate: '2026-07-28' }, 2),
    demoRow({ CaseId: 'demo-3', Title: 'Subpoena payment gateway transaction logs', AssignedTo: 'Analyst Priya Menon', Status: 'In Progress', DueDate: '2026-07-30' }, 20),
    demoRow({ CaseId: 'demo-3', Title: 'Trace phishing domain registration details', AssignedTo: 'Analyst Priya Menon', Status: 'Pending', DueDate: '2026-08-02' }, 18),
    demoRow({ CaseId: 'demo-7', Title: 'Canvass market vendors for additional witnesses', AssignedTo: 'Inspector Arjun Rao', Status: 'Pending', DueDate: '2026-07-27' }, 2),
    demoRow({ CaseId: 'demo-8', Title: 'Physically inspect all ATMs in Sector 12 for skimmer devices', AssignedTo: 'HC Suresh Kumar', Status: 'Completed', DueDate: '2026-07-19' }, 8),
    demoRow({ CaseId: 'demo-8', Title: 'Coordinate with bank fraud team on chargeback freeze', AssignedTo: 'Analyst Priya Menon', Status: 'In Progress', DueDate: '2026-07-29' }, 7),
    demoRow({ CaseId: 'demo-10', Title: 'Forward seized sample to forensic lab for analysis', AssignedTo: 'HC Suresh Kumar', Status: 'Completed', DueDate: '2026-07-12' }, 24),
  ],
};

// --- Notebook ---------------------------------------------------------------

export const NOTEBOOK_ENTRIES_DEMO: DemoDataset = {
  schema: [
    demoColumn('Title', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('EntryType', 'varchar', { max_length: '20' }),
    demoColumn('Content', 'text', { is_mandatory: true }),
    demoColumn('CaseId', 'varchar', { max_length: '40' }),
    demoColumn('FileKey', 'varchar', { max_length: '260' }),
    demoColumn('OcrText', 'text'),
    demoColumn('AiSummary', 'text'),
    demoColumn('IsBookmarked', 'boolean'),
    demoColumn('IsKeyFinding', 'boolean'),
    demoColumn('LinkedEvidenceId', 'varchar', { max_length: '40' }),
    demoColumn('LinkedPersonId', 'varchar', { max_length: '40' }),
  ],
  rows: [
    demoRow(
      {
        Title: 'Initial scene assessment',
        EntryType: 'Text',
        Content:
          'Forced entry via rear door. No signs of struggle in the main hall. Recommend prioritizing the rear service door for forensic sweep.',
        CaseId: 'demo-1',
        FileKey: '',
        OcrText: '',
        AiSummary: '',
        IsBookmarked: false,
        IsKeyFinding: true,
        LinkedEvidenceId: '',
        LinkedPersonId: WORKSPACE_ITEMS_DEMO.rows[4]?.ROWID ?? '',
      },
      6
    ),
    demoRow(
      {
        Title: 'Witness interview — Mr. Verma',
        EntryType: 'Voice',
        Content: 'Follow-up voice note after the recorded interview — he seemed more confident about the timing on a second pass.',
        CaseId: 'demo-1',
        FileKey: '',
        OcrText: '',
        AiSummary: '',
        IsBookmarked: true,
        IsKeyFinding: false,
        LinkedEvidenceId: EVIDENCE_DEMO.rows[3]?.ROWID ?? '',
        LinkedPersonId: WORKSPACE_ITEMS_DEMO.rows[2]?.ROWID ?? '',
      },
      4
    ),
    demoRow(
      {
        Title: 'CCTV still frame',
        EntryType: 'Image',
        Content: 'Captured from camera 3, timestamp 23:41. Filed for reference alongside the full footage.',
        CaseId: 'demo-1',
        FileKey: 'demo-assets/evidence-cctv-still.png',
        OcrText: '',
        AiSummary: '',
        IsBookmarked: false,
        IsKeyFinding: false,
        LinkedEvidenceId: '',
        LinkedPersonId: '',
      },
      3
    ),
    demoRow(
      {
        Title: 'Suspect vehicle cross-check',
        EntryType: 'Text',
        Content:
          'RTO records confirm the vehicle on camera is registered to Rajesh Kumar. Cross-referenced with the CCTV timestamp — consistent with a 23:38 arrival.',
        CaseId: 'demo-1',
        FileKey: '',
        OcrText: '',
        AiSummary: '',
        IsBookmarked: true,
        IsKeyFinding: true,
        LinkedEvidenceId: EVIDENCE_DEMO.rows[4]?.ROWID ?? '',
        LinkedPersonId: WORKSPACE_ITEMS_DEMO.rows[0]?.ROWID ?? '',
      },
      1
    ),
    demoRow(
      {
        Title: 'Bank fraud-team coordination note',
        EntryType: 'Text',
        Content: 'Bank’s fraud team confirms the disputed transactions all route through the same third-party payment aggregator. Requesting their merchant-onboarding KYC on file.',
        CaseId: 'demo-3',
        FileKey: '',
        OcrText: '',
        AiSummary: '',
        IsBookmarked: true,
        IsKeyFinding: true,
        LinkedEvidenceId: EVIDENCE_DEMO.rows[5]?.ROWID ?? '',
        LinkedPersonId: '',
      },
      26
    ),
    demoRow(
      {
        Title: 'ATM site inspection notes',
        EntryType: 'Text',
        Content: 'Skimmer device recovered from the card slot during physical inspection — consistent with the hypothesis of a device installed 24–48 hours prior. Sent for forensic analysis.',
        CaseId: 'demo-8',
        FileKey: '',
        OcrText: '',
        AiSummary: '',
        IsBookmarked: false,
        IsKeyFinding: true,
        LinkedEvidenceId: EVIDENCE_DEMO.rows[8]?.ROWID ?? '',
        LinkedPersonId: WORKSPACE_ITEMS_DEMO.rows[9]?.ROWID ?? '',
      },
      8
    ),
  ],
};

// --- Timeline ----------------------------------------------------------------

// Case registration, evidence uploads, and notebook entries appear on the
// timeline automatically (derived from their own tables — see
// resolveTimelineFeed) so they're deliberately not duplicated here. This
// table holds only what can't be derived from a single MODIFIEDTIME: status/
// priority changes and other manually- or AI-logged updates.
export const TIMELINE_EVENTS_DEMO: DemoDataset = {
  schema: [
    demoColumn('EventType', 'varchar', { max_length: '40' }),
    demoColumn('Description', 'text', { is_mandatory: true }),
    demoColumn('OccurredAt', 'datetime'),
    demoColumn('CaseId', 'varchar', { max_length: '40' }),
  ],
  rows: [
    demoRow(
      {
        EventType: 'Status Change',
        Description: 'Status changed from Open to Under Investigation.',
        OccurredAt: formatDemoTimestamp(new Date(Date.now() - 30 * 3_600_000)),
        CaseId: 'demo-1',
      },
      30
    ),
    demoRow(
      {
        EventType: 'Priority Change',
        Description: 'Priority raised from Medium to High following the CCTV review.',
        OccurredAt: formatDemoTimestamp(new Date(Date.now() - 20 * 3_600_000)),
        CaseId: 'demo-1',
      },
      20
    ),
    demoRow(
      {
        EventType: 'AI Analysis',
        Description: 'AI flagged a similar modus operandi to Case #WD-2024-0113.',
        OccurredAt: formatDemoTimestamp(new Date(Date.now() - 10 * 3_600_000)),
        CaseId: 'demo-1',
      },
      10
    ),
    demoRow(
      {
        EventType: 'Status Change',
        Description: 'Status changed from Open to Assigned following initial triage.',
        OccurredAt: formatDemoTimestamp(new Date(Date.now() - 29 * 3_600_000)),
        CaseId: 'demo-3',
      },
      29
    ),
    demoRow(
      {
        EventType: 'Priority Change',
        Description: 'Priority raised to Critical after the disputed amount was confirmed above threshold.',
        OccurredAt: formatDemoTimestamp(new Date(Date.now() - 27 * 3_600_000)),
        CaseId: 'demo-3',
      },
      27
    ),
    demoRow(
      {
        EventType: 'Status Change',
        Description: 'Status changed from Open to Assigned after the fraud team was looped in.',
        OccurredAt: formatDemoTimestamp(new Date(Date.now() - 9 * 3_600_000)),
        CaseId: 'demo-8',
      },
      9
    ),
  ],
};

// --- Criminal Network Analysis ----------------------------------------------

export const NETWORK_ENTITIES_DEMO: DemoDataset = {
  schema: [
    demoColumn('EntityType', 'varchar', { max_length: '40' }),
    demoColumn('Name', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('RiskScore', 'int'),
  ],
  rows: [
    demoRow({ EntityType: 'Person', Name: 'Rajesh Kumar', RiskScore: 78 }, 2),
    demoRow({ EntityType: 'Person', Name: 'Suresh Nair', RiskScore: 65 }, 3),
    demoRow({ EntityType: 'Witness', Name: 'Mr. Verma', RiskScore: 20 }, 4),
    demoRow({ EntityType: 'Vehicle', Name: 'KA01AB1234', RiskScore: 40 }, 5),
    demoRow({ EntityType: 'Location', Name: 'Warehouse 7B, MG Road', RiskScore: 55 }, 6),
    demoRow({ EntityType: 'Financial Account', Name: 'HDFC ••••4521', RiskScore: 62 }, 7),
    demoRow({ EntityType: 'Organization', Name: 'Kumar Logistics Pvt Ltd', RiskScore: 51 }, 8),
    demoRow({ EntityType: 'Device', Name: 'Prepaid SIM +91-98xxxxxx21', RiskScore: 48 }, 9),
    demoRow({ EntityType: 'Evidence', Name: 'Recovered pocket knife', RiskScore: 30 }, 10),
    demoRow({ EntityType: 'Person', Name: 'Unidentified ATM suspect', RiskScore: 70 }, 9),
    demoRow({ EntityType: 'Device', Name: 'ATM Skimmer Unit #SK-04', RiskScore: 58 }, 8),
    demoRow({ EntityType: 'Location', Name: 'ATM SEC12-04, Sector 12', RiskScore: 45 }, 9),
    demoRow({ EntityType: 'Financial Account', Name: 'ICICI ••••7710', RiskScore: 50 }, 9),
    demoRow({ EntityType: 'Organization', Name: 'Metro Payments Aggregator', RiskScore: 42 }, 27),
  ],
};

export const NETWORK_RELATIONSHIPS_DEMO: DemoDataset = {
  schema: [
    demoColumn('FromEntity', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('ToEntity', 'varchar', { max_length: '160', is_mandatory: true }),
    demoColumn('RelationshipType', 'varchar', { max_length: '80' }),
    demoColumn('Strength', 'int'),
  ],
  rows: [
    demoRow({ FromEntity: 'Rajesh Kumar', ToEntity: 'KA01AB1234', RelationshipType: 'Owns', Strength: 90 }, 2),
    demoRow({ FromEntity: 'Rajesh Kumar', ToEntity: 'Kumar Logistics Pvt Ltd', RelationshipType: 'Director of', Strength: 85 }, 3),
    demoRow({ FromEntity: 'Kumar Logistics Pvt Ltd', ToEntity: 'HDFC ••••4521', RelationshipType: 'Holds account', Strength: 70 }, 4),
    demoRow({ FromEntity: 'Rajesh Kumar', ToEntity: 'Warehouse 7B, MG Road', RelationshipType: 'Frequented', Strength: 60 }, 5),
    demoRow({ FromEntity: 'Mr. Verma', ToEntity: 'KA01AB1234', RelationshipType: 'Witnessed', Strength: 55 }, 6),
    demoRow({ FromEntity: 'Suresh Nair', ToEntity: 'Kumar Logistics Pvt Ltd', RelationshipType: 'Employee of', Strength: 75 }, 7),
    demoRow({ FromEntity: 'Suresh Nair', ToEntity: 'Prepaid SIM +91-98xxxxxx21', RelationshipType: 'Uses', Strength: 65 }, 8),
    demoRow({ FromEntity: 'Prepaid SIM +91-98xxxxxx21', ToEntity: 'Rajesh Kumar', RelationshipType: 'Registered to', Strength: 58 }, 9),
    demoRow({ FromEntity: 'Recovered pocket knife', ToEntity: 'Warehouse 7B, MG Road', RelationshipType: 'Recovered from', Strength: 80 }, 10),
    demoRow({ FromEntity: 'Rajesh Kumar', ToEntity: 'Suresh Nair', RelationshipType: 'Associate of', Strength: 72 }, 11),
    demoRow({ FromEntity: 'Unidentified ATM suspect', ToEntity: 'ATM SEC12-04, Sector 12', RelationshipType: 'Captured at', Strength: 68 }, 9),
    demoRow({ FromEntity: 'ATM Skimmer Unit #SK-04', ToEntity: 'ATM SEC12-04, Sector 12', RelationshipType: 'Installed at', Strength: 82 }, 8),
    demoRow({ FromEntity: 'Unidentified ATM suspect', ToEntity: 'ICICI ••••7710', RelationshipType: 'Linked transactions', Strength: 60 }, 9),
    demoRow({ FromEntity: 'ICICI ••••7710', ToEntity: 'Metro Payments Aggregator', RelationshipType: 'Routes through', Strength: 50 }, 27),
  ],
};

// --- Crime Pattern Analytics -------------------------------------------------

export const CRIME_PATTERN_AGGREGATES_DEMO: DemoDataset = {
  schema: [
    demoColumn('Category', 'varchar', { max_length: '60' }),
    demoColumn('District', 'varchar', { max_length: '60' }),
    demoColumn('Period', 'varchar', { max_length: '20' }),
    demoColumn('IncidentCount', 'int'),
    demoColumn('TrendDirection', 'varchar', { max_length: '20' }),
  ],
  rows: [
    demoRow({ Category: 'Burglary', District: 'Central', Period: '2026-06', IncidentCount: 14, TrendDirection: 'Up' }, 10),
    demoRow({ Category: 'Vehicle Theft', District: 'North', Period: '2026-06', IncidentCount: 9, TrendDirection: 'Down' }, 12),
    demoRow({ Category: 'Assault', District: 'East', Period: '2026-06', IncidentCount: 6, TrendDirection: 'Flat' }, 14),
    demoRow({ Category: 'Cybercrime', District: 'Central', Period: '2026-06', IncidentCount: 21, TrendDirection: 'Up' }, 8),
    demoRow({ Category: 'Burglary', District: 'South', Period: '2026-06', IncidentCount: 5, TrendDirection: 'Down' }, 16),
    demoRow({ Category: 'Robbery', District: 'Central', Period: '2026-07', IncidentCount: 7, TrendDirection: 'Up' }, 3),
    demoRow({ Category: 'Cybercrime', District: 'North', Period: '2026-07', IncidentCount: 11, TrendDirection: 'Up' }, 5),
    demoRow({ Category: 'Narcotics', District: 'South', Period: '2026-07', IncidentCount: 4, TrendDirection: 'Flat' }, 6),
    demoRow({ Category: 'Domestic Dispute', District: 'East', Period: '2026-07', IncidentCount: 8, TrendDirection: 'Flat' }, 4),
    demoRow({ Category: 'Burglary', District: 'Central', Period: '2026-05', IncidentCount: 10, TrendDirection: 'Flat' }, 40),
    demoRow({ Category: 'Vehicle Theft', District: 'North', Period: '2026-05', IncidentCount: 12, TrendDirection: 'Up' }, 42),
    demoRow({ Category: 'Cybercrime', District: 'Central', Period: '2026-05', IncidentCount: 16, TrendDirection: 'Up' }, 44),
    demoRow({ Category: 'Assault', District: 'East', Period: '2026-04', IncidentCount: 5, TrendDirection: 'Down' }, 70),
    demoRow({ Category: 'Burglary', District: 'West', Period: '2026-04', IncidentCount: 8, TrendDirection: 'Flat' }, 75),
    demoRow({ Category: 'Missing Person', District: 'South', Period: '2026-03', IncidentCount: 3, TrendDirection: 'Flat' }, 100),
  ],
};

// --- Administration: Users / Roles / Police Stations ------------------------

export const USERS_DEMO: DemoDataset = {
  schema: [
    demoColumn('FullName', 'varchar', { max_length: '120', is_mandatory: true }),
    demoColumn('Email', 'varchar', { max_length: '160' }),
    demoColumn('Role', 'varchar', { max_length: '60' }),
    demoColumn('Status', 'varchar', { max_length: '20' }),
  ],
  rows: [
    demoRow({ FullName: 'Inspector Arjun Rao', Email: 'arjun.rao@cmpd.gov.in', Role: 'Investigator', Status: 'Active' }, 400),
    demoRow({ FullName: 'DCP Meera Sharma', Email: 'meera.sharma@cmpd.gov.in', Role: 'Supervisor', Status: 'Active' }, 400),
    demoRow({ FullName: 'Analyst Priya Menon', Email: 'priya.menon@cmpd.gov.in', Role: 'Analyst', Status: 'Active' }, 400),
    demoRow({ FullName: 'System Administrator', Email: 'admin@cmpd.gov.in', Role: 'Administrator', Status: 'Active' }, 400),
    demoRow({ FullName: 'HC Suresh Kumar', Email: 'suresh.kumar@cmpd.gov.in', Role: 'Investigator', Status: 'Active' }, 400),
    demoRow({ FullName: 'SI Meena Iyer', Email: 'meena.iyer@cmpd.gov.in', Role: 'Investigator', Status: 'Active' }, 400),
  ],
};

export const ROLES_DEMO: DemoDataset = {
  schema: [
    demoColumn('RoleName', 'varchar', { max_length: '60', is_mandatory: true }),
    demoColumn('Description', 'text'),
  ],
  rows: [
    demoRow({ RoleName: 'Investigator', Description: 'Frontline officer responsible for day-to-day case investigation.' }, 400),
    demoRow({ RoleName: 'Supervisor', Description: 'Oversees casework across a district or unit; approves case status escalations.' }, 400),
    demoRow({ RoleName: 'Analyst', Description: 'Provides crime-pattern and intelligence analysis support across cases.' }, 400),
    demoRow({ RoleName: 'Administrator', Description: 'Manages user accounts, roles, and system configuration.' }, 400),
  ],
};

export const POLICE_STATIONS_DEMO: DemoDataset = {
  schema: [
    demoColumn('StationName', 'varchar', { max_length: '80', is_mandatory: true }),
    demoColumn('District', 'varchar', { max_length: '60' }),
    demoColumn('ContactNumber', 'varchar', { max_length: '20' }),
  ],
  rows: [
    demoRow({ StationName: 'MG Road PS', District: 'Central', ContactNumber: '080-2222-1001' }, 400),
    demoRow({ StationName: 'Sector 12 PS', District: 'North', ContactNumber: '080-2222-1002' }, 400),
    demoRow({ StationName: 'Cyber Cell', District: 'Central', ContactNumber: '080-2222-1003' }, 400),
    demoRow({ StationName: 'East Market PS', District: 'East', ContactNumber: '080-2222-1004' }, 400),
    demoRow({ StationName: 'West Zone PS', District: 'West', ContactNumber: '080-2222-1005' }, 400),
    demoRow({ StationName: 'South District PS', District: 'South', ContactNumber: '080-2222-1006' }, 400),
  ],
};
