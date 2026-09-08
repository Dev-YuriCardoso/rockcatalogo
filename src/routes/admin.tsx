import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/lib/session-state";
import { addProduct } from "@/server-functions/products";
import { CATEGORIAS } from "@/data/products";
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

function Admin() {
  const { session } = useSession();
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  if (session.status === "loading") {
    return <div className="mx-auto max-w-xl px-4 pt-24 text-muted-foreground">Comprobando sesión…</div>;
  }

  if (session.status === "anonymous") {
    return (
      <div className="mx-auto max-w-xl px-4 pt-24">
        <Card>
          <CardHeader>
            <CardTitle>Acceso restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para agregar productos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Ir a iniciar sesión
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    const price = Number(form.price.replace(",", "."));

    const res = await addProduct({
      data: {
        title: form.title,
        description: form.description,
        category: form.category,
        price,
        imageUrl: form.imageUrl,
        link: form.link,
      },
    });

    setLoading(false);
    if (res.ok) {
      setMessage({ kind: "ok", text: "Producto guardado en Supabase." });
      setForm({ ...EMPTY });
    } else {
      setMessage({ kind: "error", text: res.error });
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pt-20">
      <h1 className="text-3xl font-bold uppercase text-foreground">Administrar</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sesión de <span className="text-foreground">{session.user.email}</span> · agrega productos al catálogo.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Agregar producto</CardTitle>
          <CardDescription>Se guardará en la base de datos de Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {message && (
            <p
              className={`rounded-md border px-3 py-2 text-sm ${
                message.kind === "ok"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-destructive bg-destructive/10 text-destructive"
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-title">Nombre del producto</Label>
            <Input id="p-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Camiseta de banda — estampa" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-desc">Descripción</Label>
            <textarea
              id="p-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Algodón pesado con estampa serigrafiada…"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-price">Precio (R$)</Label>
              <Input id="p-price" type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="89.90" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-cat">Categoría</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v as Categoria)}>
                <SelectTrigger id="p-cat" className="w-full">
                  <SelectValue placeholder="Elige categoría" />
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
            <Label htmlFor="p-img">URL de imagen (opcional)</Label>
            <Input id="p-img" type="url" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…/imagen.jpg" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-link">Link Shopee (opcional)</Label>
            <Input id="p-link" type="url" value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://shopee.com.br/…" />
          </div>

          <Button onClick={handleSubmit} disabled={loading || !form.title} className="w-full">
            {loading ? "Guardando…" : "Guardar en Supabase"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
