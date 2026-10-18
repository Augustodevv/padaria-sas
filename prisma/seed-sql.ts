/**
 * Gera um SQL idempotente equivalente ao seed.ts, para rodar direto no banco
 * (ex.: SQL editor do Supabase) quando não há conexão via Prisma.
 * Uso: npx tsx prisma/seed-sql.ts > seed.sql
 */
import { categories, products, slugify } from "./seed-data";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const arr = (a: string[]) => (a.length ? `ARRAY[${a.map(q).join(",")}]::text[]` : "ARRAY[]::text[]");

const out: string[] = [];

categories.forEach((c, i) => {
  out.push(
    `INSERT INTO "Category" ("id","name","slug","sortOrder") VALUES (gen_random_uuid()::text,${q(c.name)},${q(c.slug)},${i}) ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name","sortOrder"=EXCLUDED."sortOrder";`,
  );
});

for (const p of products) {
  out.push(
    `INSERT INTO "Product" ("id","categoryId","name","slug","description","priceCents","ingredients","allergens","isFeatured","isAvailable","popularity","updatedAt") ` +
      `SELECT gen_random_uuid()::text, c."id", ${q(p.name)}, ${q(slugify(p.name))}, ${q(p.desc)}, ${p.price}, ${arr(p.ing)}, ${arr(p.all)}, ${p.featured ?? false}, ${p.available ?? true}, ${p.pop ?? 0}, now() ` +
      `FROM "Category" c WHERE c."slug"=${q(p.cat)} ` +
      `ON CONFLICT ("slug") DO UPDATE SET "categoryId"=EXCLUDED."categoryId","name"=EXCLUDED."name","description"=EXCLUDED."description","priceCents"=EXCLUDED."priceCents","ingredients"=EXCLUDED."ingredients","allergens"=EXCLUDED."allergens","isFeatured"=EXCLUDED."isFeatured","isAvailable"=EXCLUDED."isAvailable","popularity"=EXCLUDED."popularity","updatedAt"=now();`,
  );
}

out.push(
  `INSERT INTO "StoreSettings" ("id","name","address","phone","openingHours","updatedAt") VALUES (1,'Maison du Pain','Rua das Padarias, 123 — São Paulo, SP','(11) 99999-0000','{"weekdays":"07:00–19:00","saturday":"07:00–17:00","sunday":"08:00–13:00"}'::jsonb,now()) ON CONFLICT ("id") DO NOTHING;`,
);

console.log(out.join("\n"));
