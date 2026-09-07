import { ExternalLink } from "lucide-react";
import type { Produto } from "@/data/products";

export function ProductCard({ produto }: { produto: Produto }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60">
      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={produto.imagem}
          alt={produto.titulo}
          loading="lazy"
          width={768}
          height={960}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{produto.categoria}</span>
        <h3 className="text-base font-semibold text-foreground">{produto.titulo}</h3>
        <p className="mt-1 text-lg font-bold text-foreground">{produto.preco}</p>
        <a
          href={produto.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Comprar na Shopee
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
