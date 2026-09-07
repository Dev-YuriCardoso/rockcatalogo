import { ExternalLink } from "lucide-react";
import { formatarPreco, type Look } from "@/hooks/useProducts";

export function LookCard({ look }: { look: Look }) {
  const total = look.products.reduce((soma, p) => soma + Number(p.price), 0);

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {look.image_url && (
          <img
            src={look.image_url}
            alt={look.title}
            loading="lazy"
            width={960}
            height={720}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-col gap-3 p-6">
        <span className="text-xs font-medium uppercase tracking-widest text-primary">Look Completo</span>
        <h3 className="text-xl font-bold uppercase text-foreground">{look.title}</h3>
        {look.description && <p className="text-sm text-muted-foreground">{look.description}</p>}
        <ul className="space-y-1 text-sm text-muted-foreground">
          {look.products.map((p) => (
            <li key={p.id}>• {p.title}</li>
          ))}
        </ul>
        {total > 0 && (
          <p className="text-lg font-bold text-foreground">
            {formatarPreco(total)} <span className="text-sm font-normal text-muted-foreground">(estimado)</span>
          </p>
        )}
        <a
          href={look.shopee_affiliate_link ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:opacity-80"
        >
          Comprar na Shopee
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
