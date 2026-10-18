"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Stagger, StaggerItem } from "@/components/motion/stagger";

export function Hero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 700], [0, 140]);
  const glowY = useTransform(scrollY, [0, 700], [0, -80]);

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-coffee text-cream">
      <motion.div
        aria-hidden
        style={reduce ? undefined : { y: bgY }}
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_40%,#c68b59_0%,#6b4226_35%,#3e2723_70%)]"
      />
      <motion.div
        aria-hidden
        style={reduce ? undefined : { y: glowY }}
        className="absolute -right-32 top-1/4 -z-10 h-[34rem] w-[34rem] rounded-full bg-caramel/25 blur-3xl"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%224%22><circle cx=%222%22 cy=%222%22 r=%220.6%22 fill=%22white%22 fill-opacity=%220.05%22/></svg>')]" />

      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32">
        <Stagger onMount className="max-w-3xl">
          <StaggerItem>
            <p className="font-editorial text-2xl italic text-caramel">Padaria artesanal · desde 2014</p>
          </StaggerItem>
          <StaggerItem>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] sm:text-7xl lg:text-8xl">
              O sabor que transforma seus momentos
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-6 max-w-xl text-lg text-cream/75">
              Pães de fermentação lenta, croissants de manteiga e doces feitos à mão todas as
              manhãs. Peça online e retire quentinho na loja.
            </p>
          </StaggerItem>
          <StaggerItem className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/cardapio"
              className="rounded-full bg-caramel px-8 py-4 font-medium text-white transition hover:bg-cream hover:text-coffee"
            >
              Explorar cardápio
            </Link>
            <Link
              href="/#historia"
              className="rounded-full border border-cream/40 px-8 py-4 font-medium transition hover:bg-cream/10"
            >
              Nossa história
            </Link>
          </StaggerItem>
        </Stagger>
      </div>

      <motion.a
        href="#destaques"
        aria-label="Rolar para os destaques"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-cream/70"
        animate={reduce ? undefined : { y: [0, 10, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown size={32} />
      </motion.a>
    </section>
  );
}
