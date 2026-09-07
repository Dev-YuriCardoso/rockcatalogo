import { Link } from "@tanstack/react-router";
import { Skull, Menu, X } from "lucide-react";
import { useState } from "react";
import { CATEGORIAS } from "@/data/products";

const linkClass =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-widest text-foreground"
        >
          <Skull className="h-6 w-6 text-primary" />
          Rock<span className="text-primary">/</span>Catalog
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {CATEGORIAS.map((c) => (
            <Link
              key={c}
              to="/catalogo"
              search={{ categoria: c }}
              className={linkClass}
              activeProps={{ className: "text-primary" }}
              activeOptions={{ includeSearch: true, exact: true }}
            >
              {c}
            </Link>
          ))}
          <Link to="/" hash="looks" className={linkClass}>
            Looks Completos
          </Link>
          <Link
            to="/catalogo"
            search={{ categoria: "Todas" }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
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
          {CATEGORIAS.map((c) => (
            <Link
              key={c}
              to="/catalogo"
              search={{ categoria: c }}
              onClick={() => setOpen(false)}
              className={linkClass}
            >
              {c}
            </Link>
          ))}
          <Link to="/" hash="looks" onClick={() => setOpen(false)} className={linkClass}>
            Looks Completos
          </Link>
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
