import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations precisam de conexão direta/sessão. Em produção com pooler (ex.: Supabase em modo transação),
    // defina DIRECT_URL para as migrations e deixe DATABASE_URL para o app.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
