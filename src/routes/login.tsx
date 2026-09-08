import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/lib/session-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Rock/Catalog" },
      { name: "description", content: "Acesso restrito ao painel do catálogo Rock/Catalog." },
      { property: "og:title", content: "Entrar | Rock/Catalog" },
      { property: "og:description", content: "Acesso restrito ao painel do catálogo Rock/Catalog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const { session, login } = useSession();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session.status === "authenticated") {
    return (
      <div className="mx-auto max-w-md px-4 pt-24">
        <Card>
          <CardHeader>
            <CardTitle>Sessão iniciada</CardTitle>
            <CardDescription>Você já está autenticado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sessão de <span className="text-foreground">{session.user.email}</span>.
            </p>
            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Ir para o painel
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const res = await login(email.trim(), password);
    setLoading(false);

    if (!res.ok) {
      setError(res.error ?? "Credenciais inválidas.");
      return;
    }
    navigate({ to: "/admin" });
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-24">
      <Card>
        <CardHeader className="space-y-0">
          <CardTitle className="flex justify-center font-display text-2xl font-bold uppercase tracking-widest">
            Rock<span className="text-primary">/</span>Catalog
          </CardTitle>
          <CardDescription className="text-center">
            Entre para administrar o catálogo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            E-mail
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@admin.com"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Senha
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email && password && !loading) void handleSubmit();
              }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <Button onClick={handleSubmit} disabled={loading || !email || !password} className="w-full">
            {loading ? "Processando…" : "Entrar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
