import {
  pgTable, serial, text, timestamp, integer, boolean, doublePrecision, date, index,
} from "drizzle-orm/pg-core";

/** Uma "unidade" de estoque: obra de construção ou loja/comércio. */
export const obras = pgTable("obras", {
  id: serial().primaryKey(),
  nome: text().notNull(),
  tipo: text().notNull().default("obra"), // 'obra' | 'comercio'
  endereco: text().notNull().default(""),
  ativo: boolean().notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usuarios = pgTable("usuarios", {
  id: serial().primaryKey(),
  nome: text().notNull(),
  usuario: text().notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  papel: text().notNull().default("almoxarife"), // 'dono' | 'admin' | 'almoxarife' | 'vendedor'
  obraId: integer("obra_id").references(() => obras.id),
  ativo: boolean().notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessoes = pgTable("sessoes", {
  token: text().primaryKey(),
  usuarioId: integer("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
});

export const itens = pgTable("itens", {
  id: serial().primaryKey(),
  obraId: integer("obra_id").notNull().references(() => obras.id),
  codigo: text().notNull(),
  codigoBarras: text("codigo_barras").notNull().default(""),
  nome: text().notNull(),
  categoria: text().notNull().default(""),
  unidade: text().notNull().default("un"),
  quantidade: doublePrecision().notNull().default(0),
  minimo: doublePrecision().notNull().default(0),
  local: text().notNull().default(""),
  fornecedor: text().notNull().default(""),
  precoCusto: doublePrecision("preco_custo").notNull().default(0),
  precoVenda: doublePrecision("preco_venda").notNull().default(0),
  ativo: boolean().notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("itens_obra_idx").on(t.obraId)]);

export const vendas = pgTable("vendas", {
  id: serial().primaryKey(),
  obraId: integer("obra_id").notNull().references(() => obras.id),
  cliente: text().notNull().default(""),
  documento: text().notNull().default(""),
  formaPagamento: text("forma_pagamento").notNull().default("dinheiro"),
  subtotal: doublePrecision().notNull().default(0),
  desconto: doublePrecision().notNull().default(0),
  total: doublePrecision().notNull().default(0),
  status: text().notNull().default("concluida"), // 'concluida' | 'cancelada'
  observacao: text().notNull().default(""),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("vendas_obra_idx").on(t.obraId)]);

export const vendaItens = pgTable("venda_itens", {
  id: serial().primaryKey(),
  vendaId: integer("venda_id").notNull().references(() => vendas.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => itens.id),
  descricao: text().notNull(),
  unidade: text().notNull().default("un"),
  quantidade: doublePrecision().notNull(),
  precoUnitario: doublePrecision("preco_unitario").notNull().default(0),
  total: doublePrecision().notNull().default(0),
});

export const movimentos = pgTable("movimentos", {
  id: serial().primaryKey(),
  obraId: integer("obra_id").notNull().references(() => obras.id),
  itemId: integer("item_id").notNull().references(() => itens.id),
  tipo: text().notNull(), // 'entrada' | 'saida' | 'venda' | 'estorno' | 'ajuste'
  quantidade: doublePrecision().notNull(),
  saldoApos: doublePrecision("saldo_apos").notNull(),
  notaFiscal: text("nota_fiscal").notNull().default(""),
  fornecedor: text().notNull().default(""),
  valorUnitario: doublePrecision("valor_unitario").notNull().default(0),
  retiradoPor: text("retirado_por").notNull().default(""),
  destino: text().notNull().default(""),
  observacao: text().notNull().default(""),
  vendaId: integer("venda_id").references(() => vendas.id),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("mov_obra_idx").on(t.obraId, t.createdAt), index("mov_item_idx").on(t.itemId)]);

export const ordensCompra = pgTable("ordens_compra", {
  id: serial().primaryKey(),
  obraId: integer("obra_id").notNull().references(() => obras.id),
  solicitante: text().notNull(),
  dataSolicitacao: date("data_solicitacao").notNull(),
  status: text().notNull().default("pendente"), // 'pendente' | 'aprovada' | 'atendida' | 'cancelada'
  dataAprovacao: date("data_aprovacao"),
  grupoOrcamento: text("grupo_orcamento").notNull().default(""),
  unidadeConstrutiva: text("unidade_construtiva").notNull().default(""),
  codigoConsumo: text("codigo_consumo").notNull().default(""),
  descricaoItem: text("descricao_item").notNull(),
  quantidade: doublePrecision().notNull(),
  unidadeCompra: text("unidade_compra").notNull().default("un"),
  observacao: text().notNull().default(""),
  usuarioId: integer("usuario_id").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("oc_obra_idx").on(t.obraId)]);
