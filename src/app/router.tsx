import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { CaseExplorerPage } from '../features/cases/CaseExplorerPage';
import { NewCasePage } from '../features/cases/NewCasePage';
import { CaseWorkspacePage } from '../features/cases/CaseWorkspacePage';
import { NetworkAnalysisPage } from '../features/network/NetworkAnalysisPage';
import { CrimePatternAnalyticsPage } from '../features/analytics/CrimePatternAnalyticsPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { AdminPage } from '../features/admin/AdminPage';
import { useIsAdministrator, useUserRoleCategory } from '../hooks/useAuth';
import { WORKSPACE_LANDING_PATH } from '../shared/lib/workspace';

/** Client-side gate only — hides the page from nav and direct URL entry; the real check is server-side. */
function RequireAdministrator({ children }: { children: ReactNode }) {
  const isAdministrator = useIsAdministrator();
  return isAdministrator ? <>{children}</> : <Navigate to="/" replace />;
}

/** "/" itself isn't a page — it sends each role straight to its own workspace home (see shared/lib/workspace.ts). */
function RoleLandingRedirect() {
  const roleCategory = useUserRoleCategory();
  return <Navigate to={WORKSPACE_LANDING_PATH[roleCategory]} replace />;
}

/**
 * All 8 core product modules now have a route: Cases/Evidence/Notebook/
 * Timeline/AI Analyst live as tabs inside the case workspace (single
 * investigation workspace principle); Network Analysis, Crime Pattern
 * Analytics, Dashboard, and Admin are cross-case top-level pages.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RoleLandingRedirect />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/cases" element={<CaseExplorerPage />} />
      <Route path="/cases/new" element={<NewCasePage />} />
      <Route path="/cases/:caseId" element={<CaseWorkspacePage />} />
      <Route path="/network" element={<NetworkAnalysisPage />} />
      <Route path="/analytics" element={<CrimePatternAnalyticsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route
        path="/admin"
        element={
          <RequireAdministrator>
            <AdminPage />
          </RequireAdministrator>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
