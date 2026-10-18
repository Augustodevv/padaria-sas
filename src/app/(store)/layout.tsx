import { Suspense } from "react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <a
        href="#conteudo"
        className="sr-only z-[100] rounded bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <Suspense fallback={<div className="fixed inset-x-0 top-0 z-50 h-20" aria-hidden />}>
        <Header />
      </Suspense>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <Footer />
      <CartDrawer />
    </CartProvider>
  );
}
