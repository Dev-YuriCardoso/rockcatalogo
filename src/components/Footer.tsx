import { Skull } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-widest text-foreground">
            <Skull className="h-5 w-5 text-primary" />
            Rock<span className="text-primary">/</span>Catalog
          </div>
          <nav className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Início</Link>
            <Link to="/catalogo" search={{ categoria: "Todas" }} className="hover:text-foreground">Catálogo</Link>
            <Link to="/" hash="looks" className="hover:text-foreground">Looks Completos</Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          Os produtos listados redirecionam para nossa loja parceira na Shopee. © 2026 Rock/Catalog — Curadoria de moda rock & lifestyle.
        </p>
      </div>
    </footer>
  );
}
