import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { findUserById } from "@/server/repositories/users";
import { hasRole, type Role } from "./policies";
import { readSession } from "./session";

/** Usuário atual lido do banco (o papel do token pode estar desatualizado). */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  return findUserById(session.userId);
});

export async function requireUser(returnTo?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(returnTo ? `/entrar?next=${encodeURIComponent(returnTo)}` : "/entrar");
  return user;
}

export async function requireRole(min: Role, returnTo?: string) {
  const user = await requireUser(returnTo);
  if (!hasRole(user, min)) redirect("/");
  return user;
}
