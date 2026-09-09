import { ExternalLink } from "lucide-react";
import lookImg from "@/assets/look.jpg";

export interface Look {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  shopee_affiliate_link: string | null;
}

export function LookCard({ look }: { look: Look }) {
  const pecas = (look.description ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={look.image_url || lookImg}
          alt={look.title}
          loading="lazy"
          width={960}
          height={720}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-3 p-6">
        <span className="text-xs font-medium uppercase tracking-widest text-primary">Look Completo</span>
        <h3 className="text-xl font-bold uppercase text-foreground">{look.title}</h3>
        {pecas.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {pecas.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        )}
        <a
          href={look.shopee_affiliate_link || "https://shopee.com.br"}
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
