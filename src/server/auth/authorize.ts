import "server-only";
import { getCurrentUser } from "./guards";
import { can, type Permission } from "./policies";

/**
 * Autorização para Server Actions e Route Handlers: lê o usuário do banco e
 * confere a permissão. Devolve null quando não pode (nunca confia no frontend).
 */
export async function authorize(permission: Permission) {
  const user = await getCurrentUser();
  return user && can(user, permission) ? user : null;
}
