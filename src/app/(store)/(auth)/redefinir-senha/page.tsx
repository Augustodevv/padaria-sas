import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { resetPasswordAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Redefinir senha", robots: { index: false } };

async function Form({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <p className="text-coffee/70">
        Link inválido.{" "}
        <Link href="/recuperar-senha" className="underline hover:text-caramel-deep">
          Peça um novo
        </Link>
        .
      </p>
    );
  }
  return (
    <AuthForm
      action={resetPasswordAction}
      submitLabel="Salvar nova senha"
      hidden={{ token }}
      fields={[
        { name: "password", label: "Nova senha", type: "password", autoComplete: "new-password" },
        { name: "confirmPassword", label: "Confirmar nova senha", type: "password", autoComplete: "new-password" },
      ]}
    />
  );
}

export default function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return (
    <>
      <h1 className="mb-6 font-display text-3xl">Nova senha</h1>
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  );
}
