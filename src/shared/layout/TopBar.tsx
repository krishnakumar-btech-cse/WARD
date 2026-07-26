import { useCurrentUser, useSignOut } from '../../hooks/useAuth';
import { Button } from '../components/ui/button';

export function TopBar() {
  const { data: user } = useCurrentUser();
  const { mutate: signOut, isPending } = useSignOut();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 print:hidden">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs text-muted-foreground">{user.role_details?.role_name ?? user.email_id}</p>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => signOut(undefined)} disabled={isPending}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
