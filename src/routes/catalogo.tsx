import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CATEGORIAS, PRODUTOS, type Categoria } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";

type Busca = { categoria: Categoria | "Todas" };

export const Route = createFileRoute("/catalogo")({
  validateSearch: (search: Record<string, unknown>): Busca => {
    const c = search.categoria;
    const valida = c === "Todas" || CATEGORIAS.includes(c as Categoria);
    return { categoria: valida ? (c as Busca["categoria"]) : "Todas" };
  },
  head: () => ({
    meta: [
      { title: "Catálogo — Rock/Catalog" },
      { name: "description", content: "Catálogo completo de moda rock: acessórios, camisas, calças e mochilas com links diretos para a loja parceira." },
      { property: "og:title", content: "Catálogo — Rock/Catalog" },
      { property: "og:description", content: "Explore acessórios, camisas, calças e mochilas com estética rock." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Catalogo,
});

function Catalogo() {
  const { categoria } = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });

  const filtrados = categoria === "Todas" ? PRODUTOS : PRODUTOS.filter((p) => p.categoria === categoria);
  const filtros: Busca["categoria"][] = ["Todas", ...CATEGORIAS];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-bold uppercase text-foreground">Catálogo</h1>
      <p className="mt-2 text-muted-foreground">Garimpamos as melhores peças rock da loja parceira.</p>

      {/* Filtros */}
      <div className="mt-8 flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f}
            onClick={() => navigate({ search: { categoria: f } })}
            className={`rounded-full border px-5 py-2 text-sm font-medium uppercase tracking-wider transition-colors ${
              categoria === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filtrados.map((p) => (
          <ProductCard key={p.id} produto={p} />
        ))}
      </div>

      {filtrados.length === 0 && (
        <p className="mt-16 text-center text-muted-foreground">Nenhum produto encontrado nesta categoria.</p>
      )}
    </div>
  );
}
