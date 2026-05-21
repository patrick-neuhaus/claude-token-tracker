import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card — Design System primitive (Fase A).
 *
 * Composicao via slots:
 *   <Card>
 *     <Card.Header>
 *       <Card.Title>...</Card.Title>
 *       <Card.Description>...</Card.Description>
 *     </Card.Header>
 *     <Card.Body>...</Card.Body>
 *     <Card.Footer>...</Card.Footer>
 *   </Card>
 *
 * Coexiste com `components/shared/Section` (filosofia anti-shadcn:
 * surface helpers via lib/surface.ts). Card aqui e pra UI nova
 * que precisa de composicao explicita estilo Radix/shadcn.
 *
 * Migracao: ver `docs/design-system.md`.
 */

type CardProps = React.HTMLAttributes<HTMLDivElement>;

function CardRoot({ className, children, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-state="idle"
      className={cn(
        "bg-card text-card-foreground border border-border rounded-xl",
        "transition-colors duration-(--motion-fast) ease-(--ease-standard)",
        "hover:border-accent/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col gap-1 px-5 py-3 border-b border-border",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-sm font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardBody({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card-body"
      className={cn("px-5 py-4", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: CardProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-2 px-5 py-3 border-t border-border",
        className
      )}
      {...props}
    />
  );
}

/**
 * Compound component pattern. Permite tanto:
 *   <Card><Card.Header>...</Card.Header></Card>
 * quanto imports diretos:
 *   import { Card, CardHeader } from '@/components/primitives/Card';
 */
type CardCompound = React.FC<CardProps> & {
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
};

const Card = CardRoot as CardCompound;
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;

export { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter };
