import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/session-state";
import { addProduct, listProducts, deleteProduct, type AdminProduct } from "@/server-functions/products";
import { fetchShopeeProduct, importShopeeProduct } from "@/server-functions/shopee";
import { CATEGORIAS } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import camisaImg from "@/assets/camisa.jpg";
import acessoriosImg from "@/assets/acessorios.jpg";
import calcaImg from "@/assets/calca.jpg";
import mochilaImg from "@/assets/mochila.jpg";
import { ExternalLink, Trash2, RefreshCw, Search, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

type Categoria = (typeof CATEGORIAS)[number];
type FormState = {
  title: string;
  description: string;
  category: Categoria;
  price: string;
  imageUrl: string;
  link: string;
};

const EMPTY: FormState = { title: "", description: "", category: "Camisas", price: "", imageUrl: "", link: "" };

const FALLBACK_IMGS: Record<Categoria, string> = {
  Camisas: camisaImg,
  Acessórios: acessoriosImg,
  Calças: calcaImg,
  Mochilas: mochilaImg,
};

const SOURCE_LABEL: Record<string, string> = {
  pagina: "página del producto",
  metadatos: "metadatos (OpenGraph)",
  lector: "lector web",
  "": "no disponibles",
};

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Garante https:// e remove espaços acidentais. */
function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isShopeeLink(value: string): boolean {
  try {
    return new URL(value).hostname.toLowerCase().includes("shopee");
  } catch {
    return false;
  }
}

function Admin() {
  const { session } = useSession();
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [shopeeLink, setShopeeLink] = useState("");
  const [fetching, setFetching] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);
  const [extracted, setExtracted] = useState<{ source: string; warnings: string[] } | null>(null);

  const loadProducts = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await listProducts();
      setProducts(res.ok ? res.products : []);
      if (!res.ok && "error" in res) setMessage({ kind: "error", text: res.error });
    } catch {
      setProducts([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadProducts();
  }, [session.status, loadProducts]);

  if (session.status === "loading") {
    return <div className="mx-auto max-w-xl px-4 pt-24 text-muted-foreground">Verificando sessão…</div>;
  }

  if (session.status === "anonymous") {
    return (
      <div className="mx-auto max-w-xl px-4 pt-24">
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>Entre na sua conta para gerenciar os produtos do catálogo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Ir para o login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const normalizedLink = normalizeUrl(form.link);
  const linkWarn = normalizedLink !== "" && !isShopeeLink(normalizedLink);

  const previewProduto = {
    id: "preview",
    titulo: form.title || "Pré-visualização do produto",
    categoria: form.category,
    preco: form.price ? formatPrice(Number(form.price.replace(",", ".")) || 0) : "R$ —",
    imagem: normalizeUrl(form.imageUrl) || FALLBACK_IMGS[form.category],
    link: normalizedLink || "https://shopee.com.br",
  };

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);

    const res = await addProduct({
      data: {
        title: form.title,
        description: form.description,
        category: form.category,
        price: Number(form.price.replace(",", ".")) || 0,
        imageUrl: normalizeUrl(form.imageUrl),
        link: normalizeUrl(form.link),
      },
    });

    setLoading(false);
    if (res.ok) {
      setMessage({ kind: "ok", text: "Produto salvo no Supabase! Ele já aparece no catálogo." });
      setForm({ ...EMPTY });
      void loadProducts();
    } else {
      setMessage({ kind: "error", text: res.error });
    }
  };

  const handleDelete = async (product: AdminProduct) => {
    if (!window.confirm(`Excluir "${product.title}" do catálogo?`)) return;
    const res = await deleteProduct({ data: { id: product.id } });
    if (res.ok) {
      setMessage({ kind: "ok", text: "Produto excluído." });
      void loadProducts();
    } else {
      setMessage({ kind: "error", text: res.error });
    }
  };

  const handleFetch = async () => {
    const link = normalizeUrl(shopeeLink);
    if (!link) {
      setMessage({ kind: "error", text: "Pega o link do produto da Shopee primeiro." });
      return;
    }
    setFetching(true);
    setMessage(null);
    const res = await fetchShopeeProduct({ data: { link } });
    setFetching(false);

    if (res.ok) {
      setExtracted({ source: res.source ?? "", warnings: res.warnings ?? [] });
      setForm((f) => ({
        ...f,
        title: res.title || f.title,
        description: res.description || f.description,
        category: res.category || f.category,
        price: res.price != null ? String(res.price) : f.price,
        imageUrl: res.imageUrl || f.imageUrl,
        link,
      }));
      const warnings = res.warnings ?? [];
      if (warnings.length > 0) {
        setMessage({ kind: "error", text: warnings.join(" ") });
      } else {
        setMessage({
          kind: "ok",
          text: `Dados obtidos (${SOURCE_LABEL[res.source ?? ""] ?? res.source}). Revisa e guarda abaixo, ou usa "Importar e publicar".`,
        });
      }
    } else {
      setMessage({ kind: "error", text: res.error });
    }
  };

  const handleAutoImport = async () => {
    const link = normalizeUrl(shopeeLink);
    if (!link) {
      setMessage({ kind: "error", text: "Pega o link do produto da Shopee primeiro." });
      return;
    }
    setSavingAuto(true);
    setMessage(null);
    const res = await importShopeeProduct({ data: { link } });
    setSavingAuto(false);

    if (res.ok) {
      setMessage({
        kind: "ok",
        text: (res.warnings ?? []).length > 0
          ? `Produto importado e publicado. ${(res.warnings ?? []).join(" ")}`
          : "Produto importado e publicado automaticamente desde Shopee. ✅",
      });
      setShopeeLink("");
      setForm({ ...EMPTY });
      setExtracted(null);
      void loadProducts();
    } else {
      setMessage({ kind: "error", text: res.error });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-20">
      <h1 className="text-3xl font-bold uppercase text-foreground">Painel do administrador</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sessão de <span className="text-foreground">{session.user.email}</span> · adicione produtos com o link de afiliado da Shopee.
      </p>

      {message && (
        <p
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            message.kind === "ok"
              ? "border-primary bg-primary/10 text-primary"
              : "border-destructive bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Importação automática desde Shopee */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Importar desde Shopee (automático)</CardTitle>
            <CardDescription>
              Cola o link do produto da Shopee (ou o link de afiliado s.shopee.com.br/…) e o sistema busca o nome,
              preço, descrição e foto, guarda tudo no Supabase e publica o produto no catálogo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shp-link">Link do produto na Shopee</Label>
              <Input
                id="shp-link"
                type="url"
                value={shopeeLink}
                onChange={(e) => setShopeeLink(e.target.value)}
                placeholder="https://shopee.com.br/… ou https://s.shopee.com.br/…"
                disabled={fetching || savingAuto}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => void handleFetch()}
                disabled={fetching || savingAuto || shopeeLink.trim() === ""}
              >
                <Search className="h-4 w-4" />
                {fetching ? "Buscando…" : "Obter dados"}
              </Button>

              <Button
                onClick={() => void handleAutoImport()}
                disabled={fetching || savingAuto || shopeeLink.trim() === ""}
              >
                <Sparkles className="h-4 w-4" />
                {savingAuto ? "Importando…" : "Importar e publicar (todo automático)"}
              </Button>
            </div>

            {extracted && !fetching && (
              <p className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                Última busca: datos {(SOURCE_LABEL[extracted.source] ?? extracted.source) || "no disponibles"} — já
                preencheram o formulário abaixo. Revisa e guarda, ou usa "Importar e publicar".
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Adicionar produto</CardTitle>
            <CardDescription>Será salvo na tabela products do Supabase e exibido no catálogo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-title">Nome do produto</Label>
              <Input id="p-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Camiseta de banda — estampa caveira" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-desc">Descrição</Label>
              <textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Algodão pesado com estampa serigrafada…"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-price">Preço estimado (R$)</Label>
                <Input id="p-price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="89.90" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-cat">Categoria</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v as Categoria)}>
                  <SelectTrigger id="p-cat" className="w-full">
                    <SelectValue placeholder="Escolha a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-img">URL da imagem (opcional)</Label>
              <Input id="p-img" type="url" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://down-br.img.susercontent.com/file/…" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-link">Link de afiliado da Shopee</Label>
              <Input
                id="p-link"
                type="url"
                value={form.link}
                onChange={(e) => set("link", e.target.value)}
                placeholder="https://shopee.com.br/produto-i.…?af_siteid=…"
                className={linkWarn ? "border-amber-500/60" : undefined}
              />
              {linkWarn ? (
                <p className="text-xs text-amber-500">
                  ⚠ Este link não parece ser da Shopee — o servidor rejeita domínios sem "shopee".
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Aceita links de produto (shopee.com.br/…) e encurtados de afiliado (s.shopee.com.br/…).
                </p>
              )}
            </div>

            <Button onClick={handleSubmit} disabled={loading || !form.title} className="w-full">
              {loading ? "Salvando…" : "Salvar no Supabase"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">Pré-visualização</p>
          <ProductCard produto={previewProduto} />
        </div>
      </div>

      {/* Lista de produtos */}
      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold uppercase text-foreground">
            Produtos no catálogo <span className="text-muted-foreground">({products.length})</span>
          </h2>
          <Button variant="outline" size="sm" onClick={() => void loadProducts()} disabled={listLoading}>
            <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {products.length === 0 && !listLoading ? (
          <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Link</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-card/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-card text-xs text-muted-foreground">
                            {p.category.slice(0, 2)}
                          </div>
                        )}
                        <span className="max-w-[240px] truncate font-medium text-foreground">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3 text-foreground">{formatPrice(Number(p.price))}</td>
                    <td className="px-4 py-3">
                      {p.shopee_affiliate_link ? (
                        <a href={p.shopee_affiliate_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          Shopee <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDelete(p)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-destructive transition-colors hover:bg-destructive/10"
                        title="Excluir produto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
