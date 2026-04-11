import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Fragment } from "react";

export type BreadcrumbItem =
  | { type: "link"; label: string; href: string; icon?: LucideIcon }
  | { type: "page"; label: string; icon?: LucideIcon };

interface Props {
  items: BreadcrumbItem[];
}

export function NavBreadcrumb({ items }: Props) {
  return (
    <nav aria-label="Navegação" className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, i) => {
        const Icon = item.icon;
        const content = (
          <span className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span className="truncate max-w-[200px]">{item.label}</span>
          </span>
        );

        return (
          <Fragment key={`${item.type}-${i}-${item.label}`}>
            {item.type === "link" ? (
              <Link
                to={item.href}
                className="hover:text-foreground transition-colors"
              >
                {content}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground font-medium">
                {content}
              </span>
            )}
            {i < items.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" aria-hidden="true" />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
