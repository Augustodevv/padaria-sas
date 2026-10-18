import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/server/services/order-transitions";
import type { OrderStatus } from "@/server/services/payment-status";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-coffee/65">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Card({ title, children, className, action }: { title?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-beige bg-white p-5 shadow-[0_1px_2px_rgb(62_39_35/0.04)]", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-medium">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  /** variação percentual vs período anterior; null = sem base */
  delta?: number | null;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-beige bg-white p-5">
      <p className="text-sm text-coffee/65">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined &&
          (delta === null ? (
            <span className="text-coffee/50">sem período anterior</span>
          ) : (
            <span
              className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium", delta >= 0 ? "bg-olive/10 text-olive" : "bg-red-50 text-red-800")}
            >
              {delta >= 0 ? <ArrowUpRight size={12} aria-hidden /> : <ArrowDownRight size={12} aria-hidden />}
              {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
              <span className="sr-only">{delta >= 0 ? " a mais" : " a menos"} que o período anterior</span>
            </span>
          ))}
        {hint && <span className="text-coffee/50">{hint}</span>}
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-900 ring-amber-200",
  CONFIRMED: "bg-sky-50 text-sky-900 ring-sky-200",
  PREPARING: "bg-violet-50 text-violet-900 ring-violet-200",
  READY: "bg-olive/10 text-olive ring-olive/30",
  DELIVERED: "bg-beige/60 text-coffee ring-beige",
  CANCELLED: "bg-red-50 text-red-800 ring-red-200",
};

/** Status com texto (nunca só cor). */
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-beige bg-white/60 py-12 text-center text-coffee/60">{children}</p>;
}

export function LinkButton({ href, children, variant = "solid" }: { href: string; children: React.ReactNode; variant?: "solid" | "outline" }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition",
        variant === "solid" ? "bg-coffee text-cream hover:bg-coffee/90" : "border border-coffee/30 hover:bg-beige/50",
      )}
    >
      {children}
    </Link>
  );
}

export const tableCls = {
  wrap: "overflow-x-auto rounded-xl border border-beige bg-white",
  table: "w-full min-w-[36rem] text-sm",
  th: "bg-cream/60 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-coffee/70",
  td: "border-t border-beige px-4 py-3 align-middle",
};
