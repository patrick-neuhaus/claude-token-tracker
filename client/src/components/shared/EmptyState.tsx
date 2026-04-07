import type { LucideIcon } from "lucide-react";
import { BarChart2 } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon?: LucideIcon;
  message: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = BarChart2, message, description, action, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground ${className}`}>
      <Icon className="h-8 w-8 opacity-30" />
      <p className="text-sm font-medium">{message}</p>
      {description && <p className="text-xs text-center max-w-md">{description}</p>}
      {action}
    </div>
  );
}
