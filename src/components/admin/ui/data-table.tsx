import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Tableau de données du cockpit — HTML sémantique (`<table>`/`<th scope>`),
 * jamais des `<div>` en grille : c'est ce qui rend la donnée navigable au
 * lecteur d'écran. Le conteneur défile horizontalement pour lui seul, la page
 * ne défile jamais latéralement.
 */
export function DataTable({ className, children, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="hall overflow-x-auto">
      <table className={cn("w-full min-w-[42rem] border-collapse text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("border-b border-border", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-border", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-muted/50", className)} {...props} />;
}

export function TableTh({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TableTd({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle text-foreground", className)} {...props} />;
}

/** Cellule numérique : chiffres alignés, largeur stable. */
export function TableNum({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 text-right font-mono tabular-nums text-foreground", className)} {...props} />;
}

export function TableEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
