import { AuthGate } from './AuthGate';
import { AppRoutes } from './router';
import { AppShell } from '../shared/layout/AppShell';

export function App() {
  return (
    <AuthGate>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </AuthGate>
  );
}
