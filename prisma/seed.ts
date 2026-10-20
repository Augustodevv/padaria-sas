import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { categories, products, slugify } from "./seed-data";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const HOURS = { weekdays: "07:00–19:00", saturday: "07:00–17:00", sunday: "08:00–13:00" };
const ZONES = [
  { neighborhood: "Centro", feeCents: 800 },
  { neighborhood: "Bela Vista", feeCents: 900 },
  { neighborhood: "Vila Mariana", feeCents: 1200 },
  { neighborhood: "Pinheiros", feeCents: 1400 },
];

async function seedCatalog() {
  const catIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: i },
      create: { ...c, sortOrder: i },
    });
    catIds.set(c.slug, row.id);
  }

  for (const p of products) {
    const slug = slugify(p.name);
    const data = {
      categoryId: catIds.get(p.cat)!,
      name: p.name,
      description: p.desc,
      priceCents: p.price,
      ingredients: p.ing,
      allergens: p.all,
      isFeatured: p.featured ?? false,
      isAvailable: p.available ?? true,
      popularity: p.pop ?? 0,
    };
    await db.product.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }

  await db.storeSettings.upsert({
    where: { id: 1 },
    update: { openingHours: HOURS, deliveryZones: ZONES },
    create: {
      id: 1,
      deliveryZones: ZONES,
      name: "Maison du Pain",
      address: "Rua das Padarias, 123 — São Paulo, SP",
      phone: "(11) 99999-0000",
      openingHours: HOURS,
    },
  });

  // CUPONS DE DEMONSTRAÇÃO
  const coupons = [
    { code: "BEMVINDO10", discountType: "PERCENT" as const, discountValue: 10, minOrderCents: 3000, maxUses: null },
    { code: "PAO5", discountType: "FIXED" as const, discountValue: 500, minOrderCents: 2000, maxUses: 100 },
  ];
  for (const c of coupons) {
    await db.coupon.upsert({ where: { code: c.code }, update: { ...c }, create: { ...c } });
  }
}

async function main() {
  // Catálogo de demonstração: só semeia banco vazio, para o seed poder rodar a cada deploy sem
  // sobrescrever preços e produtos editados no painel. SEED_FORCE=1 força (útil em desenvolvimento).
  if (process.env.SEED_FORCE !== "1" && (await db.product.count()) > 0) {
    console.log("Catálogo já existe: seed do catálogo ignorado (SEED_FORCE=1 para sobrescrever).");
  } else {
    await seedCatalog();
    console.log(`Seed ok: ${categories.length} categorias, ${products.length} produtos`);
  }

  // USUÁRIOS DE DEMONSTRAÇÃO: só são criados se SEED_DEMO_PASSWORD estiver definida (nunca em produção).
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (demoPassword && process.env.NODE_ENV === "production") {
    console.warn("SEED_DEMO_PASSWORD ignorada em produção: usuários de demonstração não foram criados.");
  } else if (demoPassword) {
    if (demoPassword.length < 8) throw new Error("SEED_DEMO_PASSWORD precisa ter pelo menos 8 caracteres.");
    const passwordHash = await bcrypt.hash(demoPassword, 12);
    const demo = [
      { email: "admin@maisondupain.example", name: "Admin Demo", role: "ADMIN" as const },
      { email: "equipe@maisondupain.example", name: "Equipe Demo", role: "STAFF" as const },
      { email: "cliente@maisondupain.example", name: "Cliente Demo", role: "CUSTOMER" as const },
    ];
    for (const u of demo) {
      await db.user.upsert({ where: { email: u.email }, update: { passwordHash, role: u.role, name: u.name }, create: { ...u, passwordHash } });
    }
    console.log("Usuários de demonstração: admin@, equipe@ e cliente@maisondupain.example (senha = SEED_DEMO_PASSWORD)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
