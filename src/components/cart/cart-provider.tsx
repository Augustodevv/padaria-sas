"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  /** Apenas para exibição; o preço oficial é recalculado no servidor no checkout. */
  priceCents: number;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  /** Incrementa a cada adição; usado para animar o ícone do carrinho. */
  pulse: number;
  open: () => void;
  close: () => void;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "maison-du-pain:cart:v1";
const MAX_QTY = 20;

function readStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);

  // Leitura de localStorage só após a montagem para não quebrar a hidratação do SSR.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage indisponível: o carrinho vale só na sessão */
    }
  }, [lines, hydrated]);

  const add = useCallback<CartContextValue["add"]>((line, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === line.productId
            ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) }
            : l,
        );
      }
      return [...prev, { ...line, quantity: Math.min(MAX_QTY, quantity) }];
    });
    setPulse((p) => p + 1);
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) =>
            l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l,
          ),
    );
  }, []);

  const remove = useCallback(
    (productId: string) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
    [],
  );
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotalCents: lines.reduce((n, l) => n + l.priceCents * l.quantity, 0),
      isOpen,
      pulse,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, isOpen, pulse, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}
