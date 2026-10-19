"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
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

const STORAGE_KEY = "maison-du-pain:cart:v1";
const MAX_QTY = 20;

// ── Store externo (localStorage) ─────────────────────────────────────────────
// useSyncExternalStore hidrata SEMPRE com o snapshot do servidor (carrinho vazio) e só depois troca
// para o valor real do navegador. Isso evita divergência de hidratação mesmo quando partes da árvore
// (ex.: o cabeçalho dentro de <Suspense>) hidratam depois de o carrinho ser lido.
const EMPTY: CartLine[] = [];
let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

function getSnapshot(): CartLine[] {
  return (cache ??= readStorage());
}

function getServerSnapshot(): CartLine[] {
  return EMPTY;
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: CartLine[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage indisponível: o carrinho vale só na sessão */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // sincroniza entre abas
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cache = null;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Estado de interface e ações (estáveis). A lista do carrinho NÃO passa por aqui, veja useCart. */
interface CartUi {
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

const CartUiContext = createContext<CartUi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);

  const add = useCallback<CartUi["add"]>((line, quantity = 1) => {
    const prev = getSnapshot();
    const existing = prev.find((l) => l.productId === line.productId);
    commit(
      existing
        ? prev.map((l) =>
            l.productId === line.productId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l,
          )
        : [...prev, { ...line, quantity: Math.min(MAX_QTY, quantity) }],
    );
    setPulse((p) => p + 1);
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const prev = getSnapshot();
    commit(
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((productId: string) => commit(getSnapshot().filter((l) => l.productId !== productId)), []);
  const clear = useCallback(() => commit([]), []);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const ui = useMemo<CartUi>(
    () => ({ isOpen, pulse, open, close, add, setQuantity, remove, clear }),
    [isOpen, pulse, open, close, add, setQuantity, remove, clear],
  );

  return <CartUiContext.Provider value={ui}>{children}</CartUiContext.Provider>;
}

/**
 * A lista é lida aqui, em cada consumidor, com useSyncExternalStore: assim cada componente hidrata com o
 * snapshot do servidor (carrinho vazio) mesmo que hidrate tarde (ex.: dentro de <Suspense>) e só depois
 * recebe o carrinho real. Se a lista viesse por contexto, um consumidor tardio já pegaria o valor do navegador.
 */
export function useCart() {
  const ui = useContext(CartUiContext);
  if (!ui) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const totals = useMemo(
    () => ({
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotalCents: lines.reduce((n, l) => n + l.priceCents * l.quantity, 0),
    }),
    [lines],
  );
  return { ...ui, lines, ...totals };
}
