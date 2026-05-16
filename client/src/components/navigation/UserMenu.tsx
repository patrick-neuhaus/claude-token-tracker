import { useEffect, useRef, useState } from "react";
import { Settings, LogOut, Sun, Moon, ChevronUp } from "lucide-react";

// UserMenu — CRM canonical lift (Wave R10).
// Pattern: avatar + nome trigger compacto → dropdown (Theme / Config / Sair).
// Collapsed: avatar circular, dropdown lateral à direita.

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

interface DropdownItemProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick?: () => void;
}

function DropdownItem({ icon: Icon, label, onClick }: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="aa-user-dropdown-item"
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

export function UserMenu({
  user,
  onConfig,
  onLogout,
  onToggleTheme,
  themeMode,
  active = false,
  collapsed = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = user?.name ?? "Usuário";
  const avatarUrl = user?.avatarUrl ?? null;
  const initials = initialsFromName(name);

  const handleConfig = () => {
    setOpen(false);
    onConfig?.();
  };
  const handleLogout = () => {
    setOpen(false);
    onLogout?.();
  };
  const handleTheme = () => {
    onToggleTheme?.();
  };

  if (collapsed) {
    return (
      <div ref={ref} className="aa-user-panel is-collapsed">
        <button
          type="button"
          aria-label={`Menu de ${name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="aa-user-panel-avatar-btn"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="aa-user-panel-avatar">{initials}</span>
          )}
        </button>
        {open && (
          <div role="menu" className="aa-user-dropdown aa-user-dropdown--side">
            {onToggleTheme && (
              <DropdownItem
                icon={themeMode === "light" ? Moon : Sun}
                label={themeMode === "light" ? "Modo escuro" : "Modo claro"}
                onClick={handleTheme}
              />
            )}
            <DropdownItem icon={Settings} label="Configurações" onClick={handleConfig} />
            <DropdownItem icon={LogOut} label="Sair" onClick={handleLogout} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={`aa-user-panel${active ? " account-active" : ""}`}>
      <button
        type="button"
        aria-label={`Menu de ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`aa-user-panel-trigger${open ? " is-open" : ""}`}
      >
        <span className="aa-user-panel-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials
          )}
        </span>
        <span className="aa-user-panel-info">
          <span className="aa-user-panel-name">{name}</span>
        </span>
        <ChevronUp
          size={14}
          className="aa-user-panel-chevron"
          style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)" }}
        />
      </button>

      {open && (
        <div role="menu" className="aa-user-dropdown aa-user-dropdown--top">
          {onToggleTheme && (
            <DropdownItem
              icon={themeMode === "light" ? Moon : Sun}
              label={themeMode === "light" ? "Modo escuro" : "Modo claro"}
              onClick={handleTheme}
            />
          )}
          <DropdownItem icon={Settings} label="Configurações" onClick={handleConfig} />
          <DropdownItem icon={LogOut} label="Sair" onClick={handleLogout} />
        </div>
      )}
    </div>
  );
}
