import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/lib/session-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { session, login, register } = useSession();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(null);
    const res = mode === "login"
      ? await login(email.trim(), password)
      : await register(email.trim(), password);

    if (!res.ok) {
      setError(res.error ?? "Algo deu errado.");
      setLoading(false);
      return;
    }

    if (res.confirmationRequired) {
      setNotice("Conta criada! Confirme pelo e-mail antes de entrar (ou desative a confirmação no Supabase).");
      setLoading(false);
      return;
    }

    setLoading(false);
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
            {mode === "login" ? "Entre para administrar o catálogo." : "Crie sua conta para administrar o catálogo."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              {notice}
            </p>
          )}

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            E-mail
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
            Senha
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          <Button onClick={handleSubmit} disabled={loading || !email || !password} className="w-full">
            {loading ? "Processando…" : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
              setNotice(null);
            }}
            className="text-sm text-primary hover:underline"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
