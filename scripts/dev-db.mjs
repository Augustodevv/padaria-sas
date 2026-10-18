/**
 * Postgres local para desenvolvimento, sem Docker.
 * Uso: npm run db:local   (mantenha rodando; Ctrl+C encerra)
 * Os dados ficam fora do projeto (e fora do OneDrive): %LOCALAPPDATA%/maison-du-pain/pgdata
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.LOCAL_DB_PORT ?? 5433);
const USER = "maison";
const PASSWORD = "maison_dev"; // apenas desenvolvimento local, escutando em localhost
const DB = "maison_du_pain";

const base =
  process.env.LOCALAPPDATA ?? path.join(os.homedir(), ".local", "share");
const dir = path.join(base, "maison-du-pain", "pgdata");
const fresh = !fs.existsSync(path.join(dir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

if (fresh) {
  fs.mkdirSync(dir, { recursive: true });
  await pg.initialise();
}
await pg.start();

if (fresh) await pg.createDatabase(DB);

console.log(`Postgres local pronto: postgresql://${USER}:***@localhost:${PORT}/${DB}`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
