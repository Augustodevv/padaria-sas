import { Flame, Heart, Wheat } from "lucide-react";
import { Parallax } from "@/components/motion/parallax";
import { Reveal } from "@/components/motion/reveal";

const pillars = [
  { Icon: Wheat, title: "Ingredientes de origem", text: "Farinhas moídas em pedra e manteiga francesa." },
  { Icon: Flame, title: "Forno a lenha", text: "Fornadas pequenas, todas as manhãs, às 5h." },
  { Icon: Heart, title: "Feito à mão", text: "Cada croissant é laminado e modelado por nós." },
];

export function StorySection() {
  return (
    <section id="historia" className="scroll-mt-20 bg-beige/50 py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        <Parallax offset={40} className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-lift">
          <div
            aria-hidden
            className="h-[120%] w-full bg-[radial-gradient(circle_at_30%_30%,#e8d8c3,#c68b59_55%,#6b4226)]"
          />
          <p className="absolute bottom-8 left-8 right-8 font-editorial text-3xl italic leading-tight text-white drop-shadow">
            “Pão bom não tem pressa.”
          </p>
        </Parallax>

        <div>
          <Reveal>
            <p className="font-editorial text-xl italic text-caramel-deep">Nossa história</p>
            <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              Uma padaria de bairro com alma francesa
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-coffee/75">
              A Maison du Pain nasceu de uma receita de família e de uma obsessão: fazer pão do
              jeito que se fazia antes, com tempo, boa farinha e as mãos certas. Hoje, são mais de
              trinta itens feitos diariamente, sem conservantes.
            </p>
          </Reveal>
          <ul className="mt-10 space-y-6">
            {pillars.map(({ Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={0.15 + i * 0.1} className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream text-caramel-deep shadow-soft">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3 className="font-display text-xl">{title}</h3>
                    <p className="text-coffee/70">{text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
