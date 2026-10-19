import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { registerAction } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Criar conta" };

export default function CadastrarPage() {
  return (
    <>
      <h1 className="mb-6 font-display text-3xl">Criar conta</h1>
      <AuthForm
        action={registerAction}
        submitLabel="Criar conta"
        fields={[
          { name: "name", label: "Nome", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "phone", label: "Telefone (opcional)", type: "tel", autoComplete: "tel", required: false },
          { name: "password", label: "Senha (mín. 8, com letras e números)", type: "password", autoComplete: "new-password" },
          { name: "confirmPassword", label: "Confirmar senha", type: "password", autoComplete: "new-password" },
        ]}
        footer={
          <p>
            Já tem conta?{" "}
            <Link href="/entrar" className="font-medium text-coffee underline hover:text-caramel-deep">
              Entrar
            </Link>
          </p>
        }
      />
      <p className="mt-6 text-xs text-coffee/70">
        Usamos seus dados apenas para processar pedidos e entregas, conforme a LGPD. Leia a{" "}
        <Link href="/privacidade" className="underline">política de privacidade</Link>.
      </p>
    </>
  );
}
