import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { categories, products, slugify } from "./seed-data";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
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
    update: {},
    create: {
      id: 1,
      name: "Maison du Pain",
      address: "Rua das Padarias, 123 — São Paulo, SP",
      phone: "(11) 99999-0000",
      openingHours: { weekdays: "07:00–19:00", saturday: "07:00–17:00", sunday: "08:00–13:00" },
    },
  });

  console.log(`Seed ok: ${categories.length} categorias, ${products.length} produtos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
