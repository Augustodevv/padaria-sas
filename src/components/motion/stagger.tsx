"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Stagger({
  children,
  className,
  onMount = false,
}: {
  children: ReactNode;
  className?: string;
  /** true: anima ao montar (hero). false: ao entrar na viewport. */
  onMount?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  const trigger = onMount
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once: true, margin: "-60px" } };
  return (
    <motion.div className={className} variants={container} initial="hidden" {...trigger}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
