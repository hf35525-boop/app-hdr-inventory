import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Context, Next } from "hono";
import { db } from "../db/index.js";
import { sessoes, usuarios } from "../db/schema.js";

export type Papel = "dono" | "admin" | "almoxarife" | "vendedor";
export type Usuario = typeof usuarios.$inferSelect;
export type Env = { Variables: { usuario: Usuario; obraId: number } };

export class HttpErro extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

export function hashSenha(senha: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(senha, salt, 64).toString("hex")}`;
}

export function confereSenha(senha: string, hash: string) {
  const [salt, chave] = hash.split(":");
  if (!salt || !chave) return false;
  const a = Buffer.from(chave, "hex");
  const b = scryptSync(senha, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

const DIAS_SESSAO = 30;

export async function criarSessao(usuarioId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DIAS_SESSAO * 864e5);
  await db.insert(sessoes).values({ token, usuarioId, expiraEm });
  return token;
}

export const publico = (u: Usuario) => ({
  id: u.id,
  nome: u.nome,
  usuario: u.usuario,
  papel: u.papel as Papel,
  obraId: u.obraId,
  ativo: u.ativo,
});

const tokenDe = (c: Context) => c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

/** Exige login. */
export async function exigeLogin(c: Context<Env>, next: Next) {
  const token = tokenDe(c);
  if (!token) throw new HttpErro(401, "Faça login para continuar.");
  const [linha] = await db
    .select({ u: usuarios })
    .from(sessoes)
    .innerJoin(usuarios, eq(sessoes.usuarioId, usuarios.id))
    .where(and(eq(sessoes.token, token), gt(sessoes.expiraEm, new Date())));
  if (!linha || !linha.u.ativo) throw new HttpErro(401, "Sessão expirada. Entre novamente.");
  c.set("usuario", linha.u);
  await next();
}

/** Exige login + uma unidade (obra/loja) selecionada. */
export async function exigeObra(c: Context<Env>, next: Next) {
  const u = c.get("usuario");
  let obraId: number | null = u.obraId;
  if (u.papel === "dono") {
    const h = Number(c.req.header("x-obra"));
    obraId = Number.isFinite(h) && h > 0 ? h : null;
  }
  if (!obraId) throw new HttpErro(400, "Selecione uma obra ou loja.");
  c.set("obraId", obraId);
  await next();
}

export function exigePapel(...papeis: Papel[]) {
  return async (c: Context<Env>, next: Next) => {
    if (!papeis.includes(c.get("usuario").papel as Papel))
      throw new HttpErro(403, "Você não tem permissão para esta ação.");
    await next();
  };
}

export async function sair(c: Context) {
  const token = tokenDe(c);
  if (token) await db.delete(sessoes).where(eq(sessoes.token, token));
}
