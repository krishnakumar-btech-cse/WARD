/**
 * Shared shapes returned by the Catalyst Web SDK, independent of any single
 * table or domain. Domain-specific types (Case, Evidence, Workspace, ...)
 * extend CatalystRow rather than redeclaring these fields.
 */

export interface CatalystRow {
  ROWID: string;
  CREATORID?: string;
  CREATEDTIME?: string;
  MODIFIEDTIME?: string;
  [key: string]: unknown;
}

export interface CatalystApiResponse<T> {
  status: number;
  message: string;
  content: T;
}

export interface CatalystPagedResponse<T> extends CatalystApiResponse<T> {
  more_records: boolean;
  next_token?: string;
}

export interface CatalystRoleDetails {
  role_id: string;
  role_name: string;
}

export interface CatalystUser {
  zuid: string;
  zaaid?: string;
  org_id?: string;
  user_id: string;
  email_id: string;
  first_name: string;
  last_name: string;
  status?: string;
  is_confirmed?: boolean;
  user_type?: string;
  locale?: string;
  time_zone?: string;
  role_details?: CatalystRoleDetails;
  created_time?: string;
  modified_time?: string;
  invited_time?: string;
}
