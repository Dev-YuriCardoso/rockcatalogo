import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import heroImg from "@/assets/hero.jpg";
import { LookCard, type Look } from "@/components/LookCard";
import { toProduto, type Produto } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { listLooks, listProducts, type AdminLook } from "@/server-functions/products";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rock/Catalog — Moda Rock & Lifestyle" },
      { name: "description", content: "Curadoria de moda rock: camisetas de banda, acessórios góticos, calças, mochilas e looks completos com links para loja parceira." },
      { property: "og:title", content: "Rock/Catalog — Moda Rock & Lifestyle" },
      { property: "og:description", content: "Encontre o melhor do estilo rock: camisetas, acessórios, calças, mochilas e looks completos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function toLook(row: AdminLook): Look {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    shopee_affiliate_link: row.shopee_affiliate_link,
  };
}

function Index() {
  const [destaques, setDestaques] = useState<Produto[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);

  useEffect(() => {
    void listProducts().then((res) => {
      if (res.ok) setDestaques((res.products ?? []).map(toProduto).slice(0, 4));
    });
    void listLooks().then((res) => {
      if (res.ok) setLooks((res.looks ?? []).map(toLook));
    });
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-end">
        <img src={heroImg} alt="Estilo rock editorial" className="absolute inset-0 h-full w-full object-cover" width={1536} height={1024} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-40">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">Curadoria Rock & Lifestyle</p>
          <h1 className="max-w-2xl text-5xl font-bold uppercase leading-tight text-foreground md:text-7xl">
            O melhor do <span className="text-primary">estilo rock</span> em um só lugar
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Camisetas de banda, couro, correntes e atitude. Garimpamos as melhores peças para você montar seu visual.
          </p>
          <Link
            to="/catalogo"
            search={{ categoria: "Todas" }}
            className="mt-8 inline-flex items-center rounded-md bg-primary px-8 py-3.5 text-base font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Ver Catálogo
          </Link>
        </div>
      </section>

      {/* Destaques */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl font-bold uppercase text-foreground">Destaques</h2>
          <Link to="/catalogo" search={{ categoria: "Todas" }} className="text-sm font-medium text-primary hover:underline">
            Ver tudo →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {destaques.map((p) => (
            <ProductCard key={p.id} produto={p} />
          ))}
        </div>
        {destaques.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">Aún no hay productos destacados — revisa el catálogo.</p>
        )}
      </section>

      {/* Looks Completos */}
      <section id="looks" className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary">Pronto pra vestir</p>
          <h2 className="mb-8 text-3xl font-bold uppercase text-foreground md:text-4xl">Looks Completos</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {looks.map((look) => (
              <LookCard key={look.id} look={look} />
            ))}
          </div>
          {looks.length === 0 && (
            <p className="mt-6 text-sm text-muted-foreground">Aún no hay looks completos publicados.</p>
          )}
        </div>
      </section>
    </div>
  );
}
