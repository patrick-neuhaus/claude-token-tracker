import { Settings, LogOut, Sun, Moon } from "lucide-react";

// UserMenu — 2-row card pattern (CRM canonical lift Wave 6.0)
// Row 1: avatar + name + theme toggle (icon-only)
// Row 2: Configurações + Sair full-width
// Collapsed: stacked icon-only

interface User {
  name: string | null;
  avatarUrl?: string | null;
}

interface Props {
  user: User;
  onProfile?: () => void;
  onConfig?: () => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  themeMode?: "light" | "dark";
  active?: boolean;
  collapsed?: boolean;
}

function initialsFromName(name: string | null): string {
  return (
    String(name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "··"
  );
}

export function UserMenu({
  user,
  onProfile,
  onConfig,
  onLogout,
  onToggleTheme,
  themeMode,
  active = false,
  collapsed = false,
}: Props) {
  const name = user?.name ?? "Usuário";
  const avatarUrl = user?.avatarUrl ?? null;
  const initials = initialsFromName(name);

  return (
    <div
      className={`aa-user-panel${active ? " account-active" : ""}${collapsed ? " is-collapsed" : ""}`}
    >
      <div className="aa-user-panel-row1">
        <button
          type="button"
          className="aa-user-panel-clickable"
          onClick={onProfile}
          title="Meu perfil"
          aria-label={`Perfil de ${name}`}
        >
          <span className="aa-user-panel-avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </span>
          <span className="aa-user-panel-info">
            <span className="aa-user-panel-name">{name}</span>
          </span>
        </button>
        {onToggleTheme && (
          <button
            type="button"
            className="aa-user-action-btn"
            title={themeMode === "light" ? "Modo escuro" : "Modo claro"}
            aria-label="Alternar tema"
            onClick={onToggleTheme}
          >
            {themeMode === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        )}
      </div>
      <div className="aa-user-panel-row2">
        <button
          type="button"
          className="aa-user-action-btn-wide"
          title="Configurações"
          onClick={onConfig}
        >
          <Settings size={14} />
          <span>Configurações</span>
        </button>
        <button
          type="button"
          className="aa-user-action-btn-wide"
          title="Sair"
          onClick={onLogout}
        >
          <LogOut size={14} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
