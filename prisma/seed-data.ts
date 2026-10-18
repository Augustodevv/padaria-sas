// DADOS DE DEMONSTRAÇÃO — produtos fictícios para desenvolvimento.
export const categories = [
  { slug: "paes-artesanais", name: "Pães artesanais" },
  { slug: "croissants", name: "Croissants" },
  { slug: "bolos", name: "Bolos" },
  { slug: "doces", name: "Doces" },
  { slug: "cafes", name: "Cafés" },
  { slug: "bebidas", name: "Bebidas" },
  { slug: "salgados", name: "Salgados" },
  { slug: "combos", name: "Combos" },
];

type Seed = {
  cat: string;
  name: string;
  price: number; // centavos
  desc: string;
  ing: string[];
  all: string[];
  featured?: boolean;
  pop?: number;
  available?: boolean;
};

const G = "glúten";
const L = "leite";
const O = "ovos";

export const products: Seed[] = [
  { cat: "paes-artesanais", name: "Pão de Fermentação Natural", price: 2800, desc: "Casca crocante, miolo úmido e 48 horas de fermentação lenta.", ing: ["farinha de trigo", "água", "sal", "fermento natural"], all: [G], featured: true, pop: 95 },
  { cat: "paes-artesanais", name: "Baguete Tradicional", price: 1400, desc: "A clássica baguete francesa, assada na hora.", ing: ["farinha de trigo", "água", "sal", "fermento"], all: [G], pop: 80 },
  { cat: "paes-artesanais", name: "Pão de Azeitonas e Alecrim", price: 3200, desc: "Azeitonas pretas e alecrim fresco em massa de longa fermentação.", ing: ["farinha", "azeitona", "alecrim", "azeite"], all: [G], pop: 55 },
  { cat: "paes-artesanais", name: "Pão Integral com Sementes", price: 3000, desc: "Linhaça, gergelim e girassol em farinha integral moída em pedra.", ing: ["farinha integral", "linhaça", "gergelim", "girassol"], all: [G, "gergelim"], pop: 48 },
  { cat: "croissants", name: "Croissant de Manteiga", price: 1290, desc: "Cento e vinte e sete camadas de massa folhada com manteiga francesa.", ing: ["farinha", "manteiga", "leite", "açúcar"], all: [G, L], featured: true, pop: 100 },
  { cat: "croissants", name: "Croissant de Pistache", price: 1890, desc: "Creme de pistache e cobertura crocante.", ing: ["massa folhada", "pistache", "manteiga"], all: [G, L, "oleaginosas"], featured: true, pop: 88 },
  { cat: "croissants", name: "Croissant de Chocolate", price: 1690, desc: "Chocolate belga meio amargo e fio de ganache.", ing: ["massa folhada", "chocolate belga"], all: [G, L], pop: 90 },
  { cat: "croissants", name: "Croissant de Morango", price: 1790, desc: "Geleia de morango caseira e morangos frescos.", ing: ["massa folhada", "morango", "açúcar"], all: [G, L], pop: 62 },
  { cat: "croissants", name: "Pain au Chocolat", price: 1590, desc: "Dois bastões de chocolate enrolados em massa folhada.", ing: ["massa folhada", "chocolate"], all: [G, L], pop: 75 },
  { cat: "bolos", name: "Bolo de Morango com Chantilly", price: 14500, desc: "Pão de ló, creme leve e morangos frescos. Serve 8 fatias.", ing: ["ovos", "farinha", "morango", "creme de leite"], all: [G, L, O], featured: true, pop: 70 },
  { cat: "bolos", name: "Bolo de Chocolate Belga", price: 15500, desc: "Massa úmida e cobertura de ganache. Serve 8 fatias.", ing: ["chocolate belga", "ovos", "manteiga"], all: [G, L, O], pop: 72 },
  { cat: "bolos", name: "Bolo de Cenoura", price: 9800, desc: "Com calda de brigadeiro. Serve 8 fatias.", ing: ["cenoura", "ovos", "chocolate"], all: [G, L, O], pop: 60 },
  { cat: "doces", name: "Tarteleta de Limão", price: 1850, desc: "Massa sablée, creme de limão e merengue maçaricado.", ing: ["limão", "manteiga", "ovos"], all: [G, L, O], pop: 66 },
  { cat: "doces", name: "Éclair de Baunilha", price: 1750, desc: "Massa choux recheada com creme de baunilha de Madagascar.", ing: ["ovos", "leite", "baunilha"], all: [G, L, O], pop: 58 },
  { cat: "doces", name: "Macarons Sortidos (6 un.)", price: 4200, desc: "Seis sabores da estação em caixa presente.", ing: ["amêndoa", "açúcar", "ovos"], all: [O, "oleaginosas", L], pop: 64 },
  { cat: "doces", name: "Cookie de Chocolate", price: 1200, desc: "Crocante por fora, macio por dentro, com gotas de chocolate.", ing: ["farinha", "manteiga", "chocolate"], all: [G, L, O], pop: 77 },
  { cat: "cafes", name: "Espresso", price: 700, desc: "Grãos especiais torrados localmente.", ing: ["café"], all: [], pop: 85 },
  { cat: "cafes", name: "Cappuccino", price: 1200, desc: "Espresso, leite vaporizado e espuma cremosa.", ing: ["café", "leite"], all: [L], pop: 92 },
  { cat: "cafes", name: "Café Coado V60", price: 1400, desc: "Extração manual, notas frutadas.", ing: ["café"], all: [], pop: 40 },
  { cat: "bebidas", name: "Suco de Laranja Natural", price: 1300, desc: "Espremido na hora, sem açúcar.", ing: ["laranja"], all: [], pop: 50 },
  { cat: "bebidas", name: "Chocolate Quente Belga", price: 1600, desc: "Chocolate derretido com leite cremoso.", ing: ["chocolate", "leite"], all: [L], pop: 56 },
  { cat: "salgados", name: "Quiche Lorraine", price: 1900, desc: "Massa amanteigada, bacon e queijo gruyère.", ing: ["ovos", "bacon", "queijo", "creme de leite"], all: [G, L, O], pop: 61 },
  { cat: "salgados", name: "Sanduíche de Presunto e Queijo", price: 2200, desc: "Baguete, presunto cru, queijo brie e manteiga.", ing: ["baguete", "presunto", "brie"], all: [G, L], pop: 59 },
  { cat: "salgados", name: "Folhado de Espinafre", price: 1700, desc: "Espinafre, ricota e noz-moscada.", ing: ["espinafre", "ricota", "massa folhada"], all: [G, L], pop: 35, available: false },
  { cat: "combos", name: "Combo Café da Manhã", price: 3400, desc: "Croissant de manteiga + cappuccino + suco de laranja.", ing: ["croissant", "cappuccino", "suco"], all: [G, L], featured: true, pop: 83 },
  { cat: "combos", name: "Combo Tarde Francesa", price: 3900, desc: "Éclair + café coado + cookie.", ing: ["éclair", "café", "cookie"], all: [G, L, O], pop: 51 },
];

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
