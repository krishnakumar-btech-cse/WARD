import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Folder, Share2, BarChart3, FileOutput, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useIsAdministrator, useUserRoleCategory } from '../../hooks/useAuth';
import { WORKSPACE_LABEL } from '../lib/workspace';
import { WardMark } from '../components/brand/WardMark';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: false },
  { to: '/cases', label: 'Cases', icon: Folder, end: false },
  { to: '/network', label: 'Network Analysis', icon: Share2, end: false },
  { to: '/analytics', label: 'Crime Patterns', icon: BarChart3, end: false },
  { to: '/reports', label: 'Reports', icon: FileOutput, end: false },
];

const adminNavItem = { to: '/admin', label: 'Admin', icon: ShieldCheck, end: false };

export function Sidebar() {
  const isAdministrator = useIsAdministrator();
  const roleCategory = useUserRoleCategory();
  const items = isAdministrator ? [...navItems, adminNavItem] : navItems;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card print:hidden">
      <div className="flex h-16 items-center gap-2.5 border-b border-border bg-brand-navy px-4">
        <WardMark size={32} />
        <div className="leading-none">
          <span className="block text-base font-bold tracking-wide text-brand-cream">WARD</span>
          <span className="block text-[9px] font-medium uppercase tracking-wider text-brand-cream/70">Investigation Intelligence</span>
        </div>
      </div>
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{WORKSPACE_LABEL[roleCategory]}</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive && 'bg-muted text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
