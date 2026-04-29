import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, FolderOpen, List, Settings, Shield,
  LogOut, TrendingUp, TrendingDown, BarChart2, Trophy, FileCode, ScrollText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatUSD } from "@/lib/formatters";

// Primary nav (consolidated from 8 → 6 — Delta 6 do DS audit)
const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/skills", icon: FileCode, label: "Skills" },
  { to: "/sessions", icon: MessageSquare, label: "Sessões" },
  { to: "/projects", icon: FolderOpen, label: "Projetos" },
  { to: "/entries", icon: List, label: "Entradas" },
  { to: "/analytics", icon: BarChart2, label: "Analytics" },
];

// Footer nav — items raros ou auxiliares
const footerItems = [
  { to: "/system-prompts", icon: ScrollText, label: "System Prompts" },
  { to: "/achievements", icon: Trophy, label: "Conquistas" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  }`;

function PlanCountdown() {
  const { user } = useAuth();
  const { data } = usePlanStatus();
  const planCost = Number(user?.plan_cost_usd) || 200;
  const totalCost = Number(data?.total_cost_usd) || 0;
  const diff = totalCost - planCost;
  const above = diff >= 0;

  if (!data || totalCost === 0) return null;

  return (
    <div
      className={`mx-3 my-2 rounded-md px-3 py-2 text-center text-xs font-medium ${
        above
          ? "bg-success/10 text-success border border-success/30"
          : "bg-warning/10 text-warning border border-warning/30"
      }`}
    >
      <div className="flex items-center justify-center gap-1.5">
        {above ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        <span className="tabular-nums">
          {above ? `+${formatUSD(diff)} acima do plano` : `Falta ${formatUSD(Math.abs(diff))} pro breakeven`}
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4">
        <h2 className="text-base font-semibold tracking-tight">Claude Token Tracker</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
      </div>
      <PlanCountdown />
      <Separator className="bg-sidebar-border" />

      {/* Primary nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
        {(user?.role === "super_admin" || user?.role === "admin") && (
          <NavLink to="/admin" className={navLinkClass}>
            <Shield className="h-4 w-4" />
            Admin
          </NavLink>
        )}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Footer nav — items raros */}
      <div className="p-2 space-y-1">
        {footerItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
