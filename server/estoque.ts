import { and, eq, gte, sql } from "drizzle-orm";
import type { Tx } from "../db/index.js";
import { itens, movimentos } from "../db/schema.js";
import { HttpErro } from "./auth.js";

export type TipoMov = "entrada" | "saida" | "venda" | "estorno" | "ajuste";

export interface Lancamento {
  obraId: number;
  itemId: number;
  tipo: TipoMov;
  /** Quantidade sempre positiva. Para "ajuste", é o novo saldo. */
  quantidade: number;
  usuarioId: number;
  notaFiscal?: string;
  fornecedor?: string;
  valorUnitario?: number;
  retiradoPor?: string;
  destino?: string;
  observacao?: string;
  vendaId?: number;
}

/**
 * Aplica um lançamento de estoque de forma atômica: atualiza o saldo do item
 * e grava o movimento. Saídas e vendas falham se não houver saldo suficiente.
 */
export async function lancar(tx: Tx, l: Lancamento) {
  const q = Number(l.quantidade);
  if (!Number.isFinite(q) || q < 0 || (q === 0 && l.tipo !== "ajuste"))
    throw new HttpErro(400, "Quantidade inválida.");

  const doItem = and(eq(itens.id, l.itemId), eq(itens.obraId, l.obraId));
  let novo: { quantidade: number; nome: string } | undefined;
  let qtdMov = q;

  if (l.tipo === "entrada" || l.tipo === "estorno") {
    [novo] = await tx.update(itens).set({ quantidade: sql`${itens.quantidade} + ${q}` })
      .where(doItem).returning({ quantidade: itens.quantidade, nome: itens.nome });
  } else if (l.tipo === "saida" || l.tipo === "venda") {
    [novo] = await tx.update(itens).set({ quantidade: sql`${itens.quantidade} - ${q}` })
      .where(and(doItem, gte(itens.quantidade, q))).returning({ quantidade: itens.quantidade, nome: itens.nome });
    if (!novo) {
      const [atual] = await tx.select({ nome: itens.nome, quantidade: itens.quantidade }).from(itens).where(doItem);
      if (!atual) throw new HttpErro(404, "Item não encontrado.");
      throw new HttpErro(409, `Estoque insuficiente de "${atual.nome}" (disponível: ${atual.quantidade}).`);
    }
  } else {
    const [antes] = await tx.select({ quantidade: itens.quantidade }).from(itens).where(doItem);
    if (!antes) throw new HttpErro(404, "Item não encontrado.");
    qtdMov = q - antes.quantidade;
    [novo] = await tx.update(itens).set({ quantidade: q }).where(doItem)
      .returning({ quantidade: itens.quantidade, nome: itens.nome });
  }
  if (!novo) throw new HttpErro(404, "Item não encontrado.");

  await tx.insert(movimentos).values({
    obraId: l.obraId,
    itemId: l.itemId,
    tipo: l.tipo,
    quantidade: qtdMov,
    saldoApos: novo.quantidade,
    notaFiscal: (l.notaFiscal ?? "").trim(),
    fornecedor: (l.fornecedor ?? "").trim(),
    valorUnitario: Number(l.valorUnitario) || 0,
    retiradoPor: (l.retiradoPor ?? "").trim(),
    destino: (l.destino ?? "").trim(),
    observacao: (l.observacao ?? "").trim(),
    vendaId: l.vendaId,
    usuarioId: l.usuarioId,
  });
  return novo.quantidade;
}
