import { db } from "@/server/db";

export const findUserByEmail = (email: string) => db.user.findUnique({ where: { email } });

export const findUserById = (id: string) =>
  db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true } });

export const createCustomer = (data: { name: string; email: string; phone?: string; passwordHash: string }) =>
  db.user.create({ data: { ...data, role: "CUSTOMER" }, select: { id: true, role: true } });

export const createPasswordReset = (userId: string, tokenHash: string, expiresAt: Date) =>
  db.$transaction([
    // invalida pedidos anteriores ainda abertos
    db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    db.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } }),
  ]);

export const findValidReset = (tokenHash: string) =>
  db.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });

/** Troca a senha e consome o token numa única transação (uso único). */
export const consumeResetAndSetPassword = (tokenId: string, userId: string, passwordHash: string) =>
  db.$transaction([
    db.passwordResetToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
  ]);
