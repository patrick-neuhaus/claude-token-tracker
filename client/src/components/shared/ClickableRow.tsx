import type { KeyboardEvent, ReactNode, CSSProperties } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type ClickableRowProps =
  | {
      mode: "link";
      to: string;
      children: ReactNode;
      className?: string;
      style?: CSSProperties;
    }
  | {
      mode: "button";
      onClick: () => void;
      children: ReactNode;
      className?: string;
      style?: CSSProperties;
      ariaLabel?: string;
    };

/**
 * ClickableRow — molecule for clickable list rows. Replaces the inconsistent
 * patterns scattered (`<div onClick>` / `<button>` / `<Link>`).
 *
 * - mode="link" → wraps children in <Link>, native keyboard parity (Enter)
 * - mode="button" → semantic <button> with aria-label
 *
 * Both modes share the focus-visible ring + hover bg + group context for
 * children effects. Resolves UX F-02 (keyboard parity) + UX F-01 (focus ring).
 *
 * Note: <Link> cannot wrap <tr>. For tables, see ClickableTableRow below.
 */
export function ClickableRow(props: ClickableRowProps) {
  const baseClass =
    "block hover:bg-muted/40 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if (props.mode === "link") {
    return (
      <Link
        to={props.to}
        className={cn(baseClass, props.className)}
        style={props.style}
      >
        {props.children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={props.ariaLabel}
      className={cn(baseClass, "text-left w-full", props.className)}
      style={props.style}
    >
      {props.children}
    </button>
  );
}

/**
 * handleEnterSpaceKey — keyboard mitigation handler for `<TableRow onClick>`
 * cases where we cannot use `<Link>` (HTML semantic constraint).
 *
 * Use with `tabIndex={0} role="link" onKeyDown={handleEnterSpaceKey(handler)}`.
 */
export function handleEnterSpaceKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };
}
