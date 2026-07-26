import { useState } from 'react';
import { ShieldCheck, Users, LineChart, Fingerprint } from 'lucide-react';
import { useSignIn } from '../../hooks/useAuth';
import { WardMark } from '../../shared/components/brand/WardMark';
import { Button } from '../../shared/components/ui/button';
import { Input } from '../../shared/components/ui/input';
import { Label } from '../../shared/components/ui/label';
import { cn } from '../../shared/lib/utils';

const QUICK_PERSONAS = [
  {
    email: 'arjun.rao@cmpd.gov.in',
    name: 'Inspector Arjun Rao',
    role: 'Investigator',
    icon: Fingerprint,
  },
  {
    email: 'meera.sharma@cmpd.gov.in',
    name: 'DCP Meera Sharma',
    role: 'Supervisor',
    icon: ShieldCheck,
  },
  {
    email: 'priya.menon@cmpd.gov.in',
    name: 'Analyst Priya Menon',
    role: 'Analyst',
    icon: LineChart,
  },
  {
    email: 'admin@cmpd.gov.in',
    name: 'System Administrator',
    role: 'Administrator',
    icon: Users,
  },
] as const;

const DEMO_PASSWORD = 'demo123';

/**
 * Local sign-in for the offline demo build — checks against a fixed roster
 * of department personas (see services/localAuthService.ts) instead of a
 * live Zoho Catalyst session. Quick-select cards exist purely so a live demo
 * can switch between roles in one click; the email/password form underneath
 * works identically and is what a real deployment's login would look like.
 */
export function LoginPage() {
  const { mutate: signIn, isPending, error } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signIn({ email, password });
  }

  function handleQuickSignIn(personaEmail: string) {
    setEmail(personaEmail);
    setPassword(DEMO_PASSWORD);
    signIn({ email: personaEmail, password: DEMO_PASSWORD });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-3 text-center">
          <WardMark size={72} />
          <div>
            <h1 className="text-2xl font-bold tracking-wide">WARD</h1>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Central Metropolitan Police Department
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Sign in to continue to your investigation workspace.</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick sign-in</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PERSONAS.map((persona) => {
              const Icon = persona.icon;
              return (
                <button
                  key={persona.email}
                  type="button"
                  onClick={() => handleQuickSignIn(persona.email)}
                  disabled={isPending}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-md border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{persona.name}</span>
                  <span className="text-xs text-muted-foreground">{persona.role}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or sign in manually
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cmpd.gov.in"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-critical">{error instanceof Error ? error.message : 'Sign-in failed.'}</p>}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Demo password for every account: {DEMO_PASSWORD}</p>
        </form>
      </div>
    </div>
  );
}
