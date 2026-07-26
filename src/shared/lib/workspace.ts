import type { RoleCategory } from '../../hooks/useAuth';

/** Each role's default landing route — where "/" sends them, and what their workspace is "for" day to day. */
export const WORKSPACE_LANDING_PATH: Record<RoleCategory, string> = {
  administrator: '/dashboard',
  supervisor: '/dashboard',
  analyst: '/analytics',
  investigator: '/cases',
};

export const WORKSPACE_LABEL: Record<RoleCategory, string> = {
  administrator: 'Administrator workspace',
  supervisor: 'Command workspace',
  analyst: 'Analyst workspace',
  investigator: 'Investigator workspace',
};
