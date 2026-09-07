import { ExternalLink } from "lucide-react";
import lookImg from "@/assets/look.jpg";

export interface Look {
  id: string;
  titulo: string;
  pecas: string[];
  precoTotal: string;
  link: string;
}

export const LOOKS: Look[] = [
  {
    id: "l1",
    titulo: "Look Metal Clássico",
    pecas: ["Camiseta de banda", "Calça skinny rasgada", "Pulseira de espinhos", "Coturno preto"],
    precoTotal: "R$ 249,70",
    link: "https://shopee.com.br",
  },
  {
    id: "l2",
    titulo: "Look Gothic Street",
    pecas: ["Camiseta oversized", "Calça cargo com correntes", "Colar de prata", "Mochila de rebites"],
    precoTotal: "R$ 369,60",
    link: "https://shopee.com.br",
  },
];

export function LookCard({ look }: { look: Look }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={lookImg}
          alt={look.titulo}
          loading="lazy"
          width={960}
          height={720}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-3 p-6">
        <span className="text-xs font-medium uppercase tracking-widest text-primary">Look Completo</span>
        <h3 className="text-xl font-bold uppercase text-foreground">{look.titulo}</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {look.pecas.map((p) => (
            <li key={p}>• {p}</li>
          ))}
        </ul>
        <p className="text-lg font-bold text-foreground">{look.precoTotal} <span className="text-sm font-normal text-muted-foreground">(estimado)</span></p>
        <a
          href={look.link}
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
