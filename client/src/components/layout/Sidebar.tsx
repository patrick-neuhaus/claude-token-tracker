import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  List,
  BarChart2,
  Trophy,
  FileCode,
  ScrollText,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { UserMenu } from "@/components/navigation/UserMenu";
import { StreakCounter } from "@/components/layout/StreakCounter";
import { formatUSD } from "@/lib/formatters";

// Sidebar canonical CRM lift (Wave 6.0)
// Source of truth visual: index.css `.aa-sidebar` + `.aa-user-panel`
// Anatomy: toggle bolinha + brand lockup + search + nav groups + PlanCountdown + UserMenu

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  badge?: string | number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/sessions", icon: MessageSquare, label: "Sessões" },
      { to: "/projects", icon: FolderOpen, label: "Projetos" },
      { to: "/entries", icon: List, label: "Entradas" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/analytics", icon: BarChart2, label: "Analytics" },
      { to: "/achievements", icon: Trophy, label: "Conquistas" },
    ],
  },
  {
    label: "Showcase",
    items: [
      { to: "/skills", icon: FileCode, label: "Skills" },
      { to: "/skill-usage", icon: Activity, label: "Uso de Skills" },
      { to: "/system-prompts", icon: ScrollText, label: "System Prompts" },
    ],
  },
];

function PlanCountdown({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const { data } = usePlanStatus();
  const planCost = Number(user?.plan_cost_usd) || 200;
  const totalCost = Number(data?.total_cost_usd) || 0;
  const diff = totalCost - planCost;
  const above = diff >= 0;

  if (!data || totalCost === 0) return null;
  if (collapsed) return null;

  return (
    <div
      className="rounded-md px-3 py-2 text-center text-xs font-medium"
      style={{
        marginBottom: 8,
        background: above ? "hsl(var(--success) / 0.15)" : "hsl(var(--warning) / 0.15)",
        color: above ? "hsl(var(--success-display))" : "hsl(var(--warning-text))",
        border: `1px solid hsl(var(--${above ? "success" : "warning"}) / 0.3)`,
      }}
    >
      <div className="flex items-center justify-center gap-1.5">
        {above ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        <span className="tabular-nums">
          {above
            ? `+${formatUSD(diff)} acima do plano`
            : `Falta ${formatUSD(Math.abs(diff))} pro breakeven`}
        </span>
      </div>
    </div>
  );
}

interface Props {
  onSearchOpen?: () => void;
}

export function Sidebar({ onSearchOpen }: Props) {
  const { user, logout } = useAuth();
  const { mode, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "1";
  });
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleToggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  };

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const accountActive = location.pathname.startsWith("/settings");

  const renderBrand = () => (
    <div className="aa-sidebar__brand">
      <div className="aa-sidebar__logo-wrap">
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: collapsed ? 16 : 18,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "hsl(var(--sidebar-foreground))",
            display: "block",
          }}
        >
          {collapsed ? "CTT" : "Claude Token Tracker"}
        </span>
        {!collapsed && (
          <span className="aa-sidebar__logo-tag">TRACKER</span>
        )}
      </div>
    </div>
  );

  const renderSearchTrigger = () =>
    onSearchOpen && (
      <div style={{ padding: "0 0 12px" }}>
        <button
          type="button"
          onClick={onSearchOpen}
          className="aa-sidebar__item"
          aria-label="Abrir busca global (Ctrl+K)"
          style={{ background: "hsl(var(--sidebar-background))", border: `1px solid hsl(var(--sidebar-border))` }}
        >
          <Search className="aa-sidebar__item-icon" size={16} />
          <span className="aa-sidebar__item-label">Buscar...</span>
          {!collapsed && (
            <kbd
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                padding: "1px 5px",
                borderRadius: 3,
                background: "hsl(var(--sidebar-decorative) / 0.18)",
                border: "1px solid hsl(var(--sidebar-decorative) / 0.3)",
                color: "hsl(var(--sidebar-foreground) / 0.7)",
              }}
            >
              Ctrl+K
            </kbd>
          )}
        </button>
      </div>
    );

  const renderNav = () => (
    <nav className="aa-sidebar__nav">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="aa-sidebar__group-label">{group.label}</div>
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `aa-sidebar__item${isActive ? " is-active" : ""}`
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="aa-sidebar__item-icon" size={16} />
                <span className="aa-sidebar__item-label">{item.label}</span>
                {item.badge != null && (
                  <span className="aa-sidebar__item-badge">{item.badge}</span>
                )}
              </NavLink>
            );
          })}
        </div>
      ))}
      {isAdmin && (
        <div>
          <div className="aa-sidebar__group-label">Admin</div>
          <NavLink
            to="/admin"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `aa-sidebar__item${isActive ? " is-active" : ""}`
            }
            title={collapsed ? "Admin" : undefined}
          >
            <Shield className="aa-sidebar__item-icon" size={16} />
            <span className="aa-sidebar__item-label">Admin</span>
          </NavLink>
        </div>
      )}
    </nav>
  );

  const renderFooter = (compact: boolean) => (
    <div className="aa-sidebar__footer">
      {!compact && <StreakCounter collapsed={compact} />}
      {!compact && <PlanCountdown collapsed={compact} />}
      <UserMenu
        user={{ name: user?.display_name || user?.email || "Usuário", avatarUrl: null }}
        onProfile={() => navigate("/settings")}
        onConfig={() => navigate("/settings")}
        onLogout={logout}
        onToggleTheme={toggleTheme}
        themeMode={mode}
        active={accountActive}
        collapsed={compact}
      />
    </div>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        <button
          className="aa-sidebar__hamburger"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          style={{ display: mobileOpen ? "none" : "flex" }}
        >
          <Menu size={20} />
        </button>
        {mobileOpen && (
          <div
            className="aa-sidebar__backdrop"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={`aa-sidebar aa-sidebar--drawer${mobileOpen ? " is-open" : ""}`}
          aria-hidden={!mobileOpen}
        >
          <div
            style={{
              position: "relative",
              padding: "8px 4px",
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: 16,
                color: "hsl(var(--sidebar-foreground))",
              }}
            >
              CTT
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "transparent",
                border: 0,
                color: "hsl(var(--sidebar-foreground))",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>
          {renderSearchTrigger()}
          {renderNav()}
          {renderFooter(false)}
        </aside>
      </>
    );
  }

  // Desktop
  return (
    <aside
      className={`aa-sidebar aa-sidebar--sticky${collapsed ? " is-collapsed" : ""}`}
    >
      <button
        className="aa-sidebar__toggle"
        onClick={handleToggleCollapse}
        title={collapsed ? "Expandir" : "Recolher"}
        aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        type="button"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      {renderBrand()}
      {!collapsed && renderSearchTrigger()}
      {renderNav()}
      {renderFooter(collapsed)}
    </aside>
  );
}
