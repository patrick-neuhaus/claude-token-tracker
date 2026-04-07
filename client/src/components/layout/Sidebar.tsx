import { NavLink } from "react-router-dom";
import { LayoutDashboard, MessageSquare, FolderOpen, List, Settings, Shield, LogOut, TrendingUp, TrendingDown, BarChart2, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatUSD } from "@/lib/formatters";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sessions", icon: MessageSquare, label: "Sessões" },
  { to: "/projects", icon: FolderOpen, label: "Projetos" },
  { to: "/entries", icon: List, label: "Entradas" },
  { to: "/analytics", icon: BarChart2, label: "Analytics" },
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
    <div className={`mx-3 my-2 rounded-md px-3 py-2 text-center text-xs font-medium transition-all ${
      above
        ? "bg-green-500/10 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.15)]"
        : "bg-yellow-500/10 text-yellow-400"
    }`}>
      <div className="flex items-center justify-center gap-1.5">
        {above ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        <span>
          {above ? `+${formatUSD(diff)} acima do plano` : `Falta ${formatUSD(Math.abs(diff))} pro breakeven`}
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <h1 className="text-lg font-bold">Claude Token Tracker</h1>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <PlanCountdown />
      <Separator />
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
      <Separator />
      <div className="p-2">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
