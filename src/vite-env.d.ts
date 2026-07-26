/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CATALYST_PROJECT_ID: string;
  readonly VITE_CATALYST_ENVIRONMENT?: 'Development' | 'Production';
  readonly VITE_CATALYST_SIGNIN_REDIRECT_URL?: string;
  readonly VITE_CATALYST_SIGNOUT_REDIRECT_URL?: string;

  readonly VITE_CATALYST_TABLE_CASES: string;
  readonly VITE_CATALYST_TABLE_EVIDENCE: string;
  readonly VITE_CATALYST_TABLE_WORKSPACE_ITEMS: string;
  readonly VITE_CATALYST_TABLE_WORKSPACE_EDGES: string;
  readonly VITE_CATALYST_TABLE_NOTEBOOK_ENTRIES: string;
  readonly VITE_CATALYST_TABLE_TIMELINE_EVENTS: string;
  readonly VITE_CATALYST_TABLE_CASE_HYPOTHESES: string;
  readonly VITE_CATALYST_TABLE_CASE_TASKS: string;
  readonly VITE_CATALYST_TABLE_NETWORK_ENTITIES: string;
  readonly VITE_CATALYST_TABLE_NETWORK_RELATIONSHIPS: string;
  readonly VITE_CATALYST_TABLE_CRIME_PATTERN_AGGREGATES: string;
  readonly VITE_CATALYST_TABLE_USERS: string;
  readonly VITE_CATALYST_TABLE_ROLES: string;
  readonly VITE_CATALYST_TABLE_POLICE_STATIONS: string;
  readonly VITE_CATALYST_TABLE_CASE_ASSIGNMENTS: string;

  readonly VITE_CATALYST_BUCKET_EVIDENCE: string;
  readonly VITE_CATALYST_BUCKET_NOTEBOOK: string;

  readonly VITE_CATALYST_FUNCTION_AI: string;

  readonly VITE_ENABLE_QUERY_DEVTOOLS?: string;
  readonly VITE_ENABLE_SAMPLE_DATA_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
