// A fixed roster of local personas for Central Metropolitan Police
// Department, standing in for real sign-in — same CatalystUser shape
// everywhere else in the app already expects (TopBar, role classifier,
// Admin gate), so nothing downstream needed to change.
import type { CatalystUser } from '../types/auth.types';

export interface LocalPersona {
  email: string;
  password: string;
  user: CatalystUser;
}

export const LOCAL_PERSONAS: LocalPersona[] = [
  {
    email: 'arjun.rao@cmpd.gov.in',
    password: 'demo123',
    user: {
      zuid: 'local-1',
      user_id: 'local-1',
      email_id: 'arjun.rao@cmpd.gov.in',
      first_name: 'Arjun',
      last_name: 'Rao',
      role_details: { role_id: 'role-investigator', role_name: 'Investigator' },
    },
  },
  {
    email: 'meera.sharma@cmpd.gov.in',
    password: 'demo123',
    user: {
      zuid: 'local-2',
      user_id: 'local-2',
      email_id: 'meera.sharma@cmpd.gov.in',
      first_name: 'Meera',
      last_name: 'Sharma',
      role_details: { role_id: 'role-supervisor', role_name: 'Supervisor (DCP)' },
    },
  },
  {
    email: 'priya.menon@cmpd.gov.in',
    password: 'demo123',
    user: {
      zuid: 'local-3',
      user_id: 'local-3',
      email_id: 'priya.menon@cmpd.gov.in',
      first_name: 'Priya',
      last_name: 'Menon',
      role_details: { role_id: 'role-analyst', role_name: 'Crime Intelligence Analyst' },
    },
  },
  {
    email: 'admin@cmpd.gov.in',
    password: 'demo123',
    user: {
      zuid: 'local-4',
      user_id: 'local-4',
      email_id: 'admin@cmpd.gov.in',
      first_name: 'System',
      last_name: 'Administrator',
      role_details: { role_id: 'role-admin', role_name: 'Administrator' },
    },
  },
];

export const localAuthService = {
  signIn(email: string, password: string): CatalystUser | null {
    const match = LOCAL_PERSONAS.find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase() && p.password === password
    );
    return match ? match.user : null;
  },
};
