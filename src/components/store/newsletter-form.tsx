"use client";

import { Check } from "lucide-react";
import { useState } from "react";

export function NewsletterForm() {
  const [done, setDone] = useState(false);

  // Demonstração: a inscrição real (persistência + email) entra na Fase 3.
  return done ? (
    <p className="flex items-center justify-center gap-2 font-editorial text-2xl italic text-cream" role="status">
      <Check size={22} /> Obrigado! Você está na lista.
    </p>
  ) : (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
      className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Seu melhor email
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder="Seu melhor email"
        className="flex-1 rounded-full bg-cream/10 px-6 py-3.5 text-cream placeholder:text-cream/60 focus:bg-cream/15"
      />
      <button className="rounded-full bg-caramel-deep px-8 py-3.5 font-medium text-white transition hover:bg-cream hover:text-coffee">
        Assinar
      </button>
    </form>
  );
}
