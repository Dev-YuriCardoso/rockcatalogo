import { Link, useRouterState } from "@tanstack/react-router";
import { Skull, Menu, X } from "lucide-react";
import { useState } from "react";
import { CATEGORIAS } from "@/data/products";

const LINKS = [
  ...CATEGORIAS.map((c) => ({ label: c, to: "/catalogo" as const, categoria: c })),
  { label: "Looks Completos", to: "/" as const, categoria: undefined as string | undefined },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-foreground">
          <Skull className="h-6 w-6 text-primary" />
          Rock<span className="text-primary">/</span>Catalog
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              {...(l.categoria ? { search: { categoria: l.categoria } } : {})}
              hash={l.label === "Looks Completos" ? "looks" : undefined}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/catalogo"
            search={{ categoria: "Todas" }}
            className={`rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 ${pathname === "/catalogo" ? "" : ""}`}
          >
            Catálogo
          </Link>
        </nav>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 py-4 md:hidden flex flex-col gap-3">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              {...(l.categoria ? { search: { categoria: l.categoria } } : {})}
              hash={l.label === "Looks Completos" ? "looks" : undefined}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/catalogo"
            search={{ categoria: "Todas" }}
            onClick={() => setOpen(false)}
            className="rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
          >
            Catálogo
          </Link>
        </nav>
      )}
    </header>
  );
}
