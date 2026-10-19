import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { forgotPasswordAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function RecuperarSenhaPage() {
  return (
    <>
      <h1 className="mb-2 font-display text-3xl">Recuperar senha</h1>
      <p className="mb-6 text-sm text-coffee/70">Informe seu email e enviaremos um link válido por 1 hora.</p>
      <AuthForm
        action={forgotPasswordAction}
        submitLabel="Enviar link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
        footer={
          <Link href="/entrar" className="underline hover:text-caramel-deep">
            Voltar para entrar
          </Link>
        }
      />
    </>
  );
}
