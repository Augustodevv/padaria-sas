import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { loginAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Entrar" };

async function LoginForm({ searchParams }: { searchParams: Promise<{ next?: string; redefinida?: string }> }) {
  const { next, redefinida } = await searchParams;
  const nextPath = safeRedirectPath(next, "");
  return (
    <>
      {redefinida && (
        <p role="status" className="mb-5 rounded-2xl bg-olive/10 px-4 py-3 text-sm text-olive">
          Senha redefinida. Entre com a nova senha.
        </p>
      )}
      <AuthForm
        action={loginAction}
        submitLabel="Entrar"
        hidden={nextPath ? { next: nextPath } : undefined}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Senha", type: "password", autoComplete: "current-password" },
        ]}
        footer={
          <div className="space-y-2">
            <p>
              <Link href="/recuperar-senha" className="underline hover:text-caramel">
                Esqueci minha senha
              </Link>
            </p>
            <p>
              Não tem conta?{" "}
              <Link href="/cadastrar" className="font-medium text-coffee underline hover:text-caramel">
                Cadastre-se
              </Link>
            </p>
          </div>
        }
      />
    </>
  );
}

export default function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string; redefinida?: string }> }) {
  return (
    <>
      <h1 className="mb-6 font-display text-3xl">Entrar</h1>
      <Suspense>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}
