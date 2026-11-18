import { Hono } from "hono";
import { and, asc, desc, eq, gte, ilike, lte, or, sql, count, sum, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { itens, movimentos, obras, ordensCompra, sessoes, usuarios, vendaItens, vendas } from "../db/schema.js";
import {
  HttpErro, confereSenha, criarSessao, exigeLogin, exigeObra, exigePapel, hashSenha, publico, sair, type Env,
} from "./auth.js";
import { lancar } from "./estoque.js";

const app = new Hono<Env>().basePath("/api");

app.onError((err, c) => {
  if (err instanceof HttpErro) return c.json({ erro: err.message }, err.status as any);
  console.error(err);
  return c.json({ erro: "Erro interno no servidor." }, 500);
});

const txt = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const corpo = async (c: { req: { json: () => Promise<unknown> } }) =>
  ((await c.req.json().catch(() => ({}))) ?? {}) as Record<string, any>;
const hoje = () => new Date().toISOString().slice(0, 10);
const TIPOS_OBRA = ["obra", "comercio"];
const PAPEIS = ["admin", "almoxarife", "vendedor"];

/* ───────────────────────── Autenticação ───────────────────────── */

app.get("/auth/estado", async (c) => {
  const [r] = await db.select({ n: count() }).from(usuarios);
  return c.json({ precisaSetup: r.n === 0 });
});

app.post("/auth/setup", async (c) => {
  const b = await corpo(c);
  const nome = txt(b.nome), usuario = txt(b.usuario, 60).toLowerCase(), senha = String(b.senha ?? "");
  const obra = txt(b.obra) || "Estoque principal";
  const tipo = TIPOS_OBRA.includes(b.tipo) ? b.tipo : "obra";
  if (!nome || !usuario || senha.length < 6) throw new HttpErro(400, "Preencha nome, usuário e uma senha com 6+ caracteres.");
  const u = await db.transaction(async (tx) => {
    const [r] = await tx.select({ n: count() }).from(usuarios);
    if (r.n > 0) throw new HttpErro(409, "O sistema já foi configurado.");
    await tx.insert(obras).values({ nome: obra, tipo });
    const [novo] = await tx.insert(usuarios).values({ nome, usuario, senhaHash: hashSenha(senha), papel: "dono" }).returning();
    return novo;
  });
  return c.json({ token: await criarSessao(u.id), usuario: publico(u) });
});

app.post("/auth/login", async (c) => {
  const b = await corpo(c);
  const [u] = await db.select().from(usuarios).where(eq(usuarios.usuario, txt(b.usuario, 60).toLowerCase()));
  if (!u || !u.ativo || !confereSenha(String(b.senha ?? ""), u.senhaHash))
    throw new HttpErro(401, "Usuário ou senha incorretos.");
  return c.json({ token: await criarSessao(u.id), usuario: publico(u) });
});

app.post("/auth/logout", async (c) => {
  await sair(c);
  return c.json({ ok: true });
});

app.use("/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth/") && !c.req.path.match(/\/auth\/(eu|senha)$/)) return next();
  return exigeLogin(c, next);
});

app.get("/auth/eu", (c) => c.json(publico(c.get("usuario"))));

app.post("/auth/senha", async (c) => {
  const b = await corpo(c);
  const u = c.get("usuario");
  if (!confereSenha(String(b.atual ?? ""), u.senhaHash)) throw new HttpErro(400, "Senha atual incorreta.");
  if (String(b.nova ?? "").length < 6) throw new HttpErro(400, "A nova senha precisa de 6+ caracteres.");
  await db.update(usuarios).set({ senhaHash: hashSenha(String(b.nova)) }).where(eq(usuarios.id, u.id));
  return c.json({ ok: true });
});

/* ───────────────────────── Obras / lojas ───────────────────────── */

app.get("/obras", async (c) => {
  const u = c.get("usuario");
  const filtro = u.papel === "dono" ? undefined : eq(obras.id, u.obraId ?? -1);
  return c.json(await db.select().from(obras).where(filtro).orderBy(desc(obras.ativo), asc(obras.nome)));
});

app.post("/obras", exigePapel("dono"), async (c) => {
  const b = await corpo(c);
  const nome = txt(b.nome);
  if (!nome) throw new HttpErro(400, "Informe o nome.");
  const [o] = await db.insert(obras).values({
    nome, endereco: txt(b.endereco), tipo: TIPOS_OBRA.includes(b.tipo) ? b.tipo : "obra",
  }).returning();
  return c.json(o, 201);
});

app.put("/obras/:id", exigePapel("dono"), async (c) => {
  const b = await corpo(c);
  const [o] = await db.update(obras).set({
    nome: txt(b.nome) || undefined,
    endereco: typeof b.endereco === "string" ? txt(b.endereco) : undefined,
    tipo: TIPOS_OBRA.includes(b.tipo) ? b.tipo : undefined,
    ativo: typeof b.ativo === "boolean" ? b.ativo : undefined,
  }).where(eq(obras.id, Number(c.req.param("id")))).returning();
  if (!o) throw new HttpErro(404, "Não encontrada.");
  return c.json(o);
});

/* ───────────────────────── Usuários ───────────────────────── */

app.get("/usuarios", exigePapel("dono", "admin"), async (c) => {
  const u = c.get("usuario");
  const filtro = u.papel === "dono" ? undefined : eq(usuarios.obraId, u.obraId ?? -1);
  const lista = await db.select().from(usuarios).where(filtro).orderBy(asc(usuarios.nome));
  return c.json(lista.map(publico));
});

app.post("/usuarios", exigePapel("dono", "admin"), async (c) => {
  const eu = c.get("usuario");
  const b = await corpo(c);
  const nome = txt(b.nome), usuario = txt(b.usuario, 60).toLowerCase(), senha = String(b.senha ?? "");
  if (!nome || !usuario || senha.length < 6) throw new HttpErro(400, "Preencha nome, usuário e senha (6+ caracteres).");
  if (!/^[a-z0-9._-]+$/.test(usuario)) throw new HttpErro(400, "Usuário: use letras, números, ponto ou traço.");
  const obraId = eu.papel === "dono" ? Number(b.obraId) || null : eu.obraId;
  if (!obraId) throw new HttpErro(400, "Escolha a obra ou loja do usuário.");
  const [existe] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.usuario, usuario));
  if (existe) throw new HttpErro(409, "Este nome de usuário já existe.");
  const [novo] = await db.insert(usuarios).values({
    nome, usuario, senhaHash: hashSenha(senha), papel: PAPEIS.includes(b.papel) ? b.papel : "almoxarife", obraId,
  }).returning();
  return c.json(publico(novo), 201);
});

app.put("/usuarios/:id", exigePapel("dono", "admin"), async (c) => {
  const eu = c.get("usuario");
  const id = Number(c.req.param("id"));
  const b = await corpo(c);
  const [alvo] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  if (!alvo || (eu.papel !== "dono" && alvo.obraId !== eu.obraId)) throw new HttpErro(404, "Usuário não encontrado.");
  if (alvo.papel === "dono" && alvo.id !== eu.id) throw new HttpErro(403, "Não é possível alterar o dono.");
  const senha = String(b.senha ?? "");
  if (senha && senha.length < 6) throw new HttpErro(400, "A senha precisa de 6+ caracteres.");
  const ehDono = alvo.papel === "dono";
  const [u] = await db.update(usuarios).set({
    nome: txt(b.nome) || undefined,
    papel: !ehDono && PAPEIS.includes(b.papel) ? b.papel : undefined,
    ativo: !ehDono && typeof b.ativo === "boolean" ? b.ativo : undefined,
    obraId: !ehDono && eu.papel === "dono" && Number(b.obraId) ? Number(b.obraId) : undefined,
    senhaHash: senha ? hashSenha(senha) : undefined,
  }).where(eq(usuarios.id, id)).returning();
  if (b.ativo === false) await db.delete(sessoes).where(eq(sessoes.usuarioId, id));
  return c.json(publico(u));
});

/* ───────────── Rotas abaixo exigem uma obra/loja selecionada ───────────── */

app.use("/itens/*", exigeObra);
app.use("/itens", exigeObra);
app.use("/movimentos", exigeObra);
app.use("/vendas", exigeObra);
app.use("/vendas/*", exigeObra);
app.use("/ordens", exigeObra);
app.use("/ordens/*", exigeObra);
app.use("/painel", exigeObra);

/* ───────────────────────── Itens ───────────────────────── */

app.get("/itens", async (c) => {
  const lista = await db.select().from(itens)
    .where(and(eq(itens.obraId, c.get("obraId")), eq(itens.ativo, true)))
    .orderBy(asc(itens.nome));
  return c.json(lista);
});

function dadosItem(b: Record<string, any>) {
  return {
    codigo: txt(b.codigo, 60),
    codigoBarras: txt(b.codigoBarras, 80),
    nome: txt(b.nome, 200),
    categoria: txt(b.categoria, 80),
    unidade: txt(b.unidade, 20) || "un",
    minimo: Math.max(0, num(b.minimo)),
    local: txt(b.local, 80),
    fornecedor: txt(b.fornecedor, 120),
    precoCusto: Math.max(0, num(b.precoCusto)),
    precoVenda: Math.max(0, num(b.precoVenda)),
  };
}

app.post("/itens", async (c) => {
  const b = await corpo(c);
  const obraId = c.get("obraId");
  const d = dadosItem(b);
  if (!d.nome || !d.codigo) throw new HttpErro(400, "Informe código e nome do item.");
  const [dup] = await db.select({ id: itens.id }).from(itens)
    .where(and(eq(itens.obraId, obraId), eq(itens.codigo, d.codigo), eq(itens.ativo, true)));
  if (dup) throw new HttpErro(409, `Já existe um item com o código ${d.codigo}.`);
  const saldo = Math.max(0, num(b.quantidade));
  const item = await db.transaction(async (tx) => {
    const [novo] = await tx.insert(itens).values({ ...d, obraId }).returning();
    if (saldo > 0) {
      await lancar(tx, {
        obraId, itemId: novo.id, tipo: "entrada", quantidade: saldo, usuarioId: c.get("usuario").id,
        notaFiscal: txt(b.notaFiscal, 60), fornecedor: d.fornecedor, valorUnitario: d.precoCusto,
        observacao: "Saldo inicial",
      });
      novo.quantidade = saldo;
    }
    return novo;
  });
  return c.json(item, 201);
});

app.put("/itens/:id", async (c) => {
  const b = await corpo(c);
  const d = dadosItem(b);
  if (!d.nome || !d.codigo) throw new HttpErro(400, "Informe código e nome do item.");
  const [item] = await db.update(itens).set(d)
    .where(and(eq(itens.id, Number(c.req.param("id"))), eq(itens.obraId, c.get("obraId")))).returning();
  if (!item) throw new HttpErro(404, "Item não encontrado.");
  return c.json(item);
});

app.delete("/itens/:id", async (c) => {
  await db.update(itens).set({ ativo: false })
    .where(and(eq(itens.id, Number(c.req.param("id"))), eq(itens.obraId, c.get("obraId"))));
  return c.json({ ok: true });
});

/* ───────────────────────── Movimentos ───────────────────────── */

app.get("/movimentos", async (c) => {
  const q = c.req.query();
  const filtros: SQL[] = [eq(movimentos.obraId, c.get("obraId"))];
  if (q.itemId) filtros.push(eq(movimentos.itemId, Number(q.itemId)));
  if (q.tipo) filtros.push(eq(movimentos.tipo, q.tipo));
  if (q.de) filtros.push(gte(movimentos.createdAt, new Date(`${q.de}T00:00:00-03:00`)));
  if (q.ate) filtros.push(lte(movimentos.createdAt, new Date(`${q.ate}T23:59:59.999-03:00`)));
  if (q.q) {
    const t = `%${q.q}%`;
    filtros.push(or(ilike(itens.nome, t), ilike(itens.codigo, t), ilike(movimentos.notaFiscal, t),
      ilike(movimentos.retiradoPor, t), ilike(movimentos.destino, t), ilike(movimentos.fornecedor, t))!);
  }
  const lista = await db.select({
    m: movimentos, itemNome: itens.nome, itemCodigo: itens.codigo, unidade: itens.unidade, usuarioNome: usuarios.nome,
  }).from(movimentos)
    .innerJoin(itens, eq(movimentos.itemId, itens.id))
    .leftJoin(usuarios, eq(movimentos.usuarioId, usuarios.id))
    .where(and(...filtros))
    .orderBy(desc(movimentos.createdAt), desc(movimentos.id))
    .limit(Math.min(Number(q.limit) || 300, 2000));
  return c.json(lista.map((r) => ({ ...r.m, itemNome: r.itemNome, itemCodigo: r.itemCodigo, unidade: r.unidade, usuarioNome: r.usuarioNome })));
});

app.post("/movimentos", async (c) => {
  const b = await corpo(c);
  const tipo = b.tipo;
  if (!["entrada", "saida", "ajuste"].includes(tipo)) throw new HttpErro(400, "Tipo de movimento inválido.");
  const linhas: any[] = Array.isArray(b.linhas) ? b.linhas : [];
  if (!linhas.length) throw new HttpErro(400, "Adicione pelo menos um item.");
  if (tipo === "entrada" && !txt(b.notaFiscal) && !b.semNota)
    throw new HttpErro(400, "Informe o número da nota fiscal (ou marque “sem nota”).");
  const obraId = c.get("obraId"), usuarioId = c.get("usuario").id;
  const saldos = await db.transaction(async (tx) => {
    const r: Record<number, number> = {};
    for (const l of linhas) {
      r[l.itemId] = await lancar(tx, {
        obraId, usuarioId, tipo, itemId: Number(l.itemId), quantidade: num(l.quantidade),
        valorUnitario: num(l.valorUnitario), notaFiscal: txt(b.notaFiscal, 60), fornecedor: txt(b.fornecedor, 120),
        retiradoPor: txt(b.retiradoPor, 120), destino: txt(b.destino, 120), observacao: txt(b.observacao, 500),
      });
      if (tipo === "entrada" && num(l.valorUnitario) > 0)
        await tx.update(itens).set({ precoCusto: num(l.valorUnitario) }).where(eq(itens.id, Number(l.itemId)));
    }
    return r;
  });
  return c.json({ ok: true, saldos }, 201);
});

/* ───────────────────────── Vendas ───────────────────────── */

const FORMAS = ["dinheiro", "pix", "debito", "credito", "boleto", "prazo"];

app.get("/vendas", async (c) => {
  const q = c.req.query();
  const filtros: SQL[] = [eq(vendas.obraId, c.get("obraId"))];
  if (q.de) filtros.push(gte(vendas.createdAt, new Date(`${q.de}T00:00:00-03:00`)));
  if (q.ate) filtros.push(lte(vendas.createdAt, new Date(`${q.ate}T23:59:59.999-03:00`)));
  const lista = await db.select({ v: vendas, vendedor: usuarios.nome, itens: sql<number>`(select count(*)::int from venda_itens vi where vi.venda_id = ${vendas.id})` })
    .from(vendas).leftJoin(usuarios, eq(vendas.usuarioId, usuarios.id))
    .where(and(...filtros)).orderBy(desc(vendas.createdAt)).limit(500);
  return c.json(lista.map((r) => ({ ...r.v, vendedor: r.vendedor, qtdItens: r.itens })));
});

app.get("/vendas/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [v] = await db.select().from(vendas).where(and(eq(vendas.id, id), eq(vendas.obraId, c.get("obraId"))));
  if (!v) throw new HttpErro(404, "Venda não encontrada.");
  const linhas = await db.select().from(vendaItens).where(eq(vendaItens.vendaId, id)).orderBy(asc(vendaItens.id));
  return c.json({ ...v, linhas });
});

app.post("/vendas", async (c) => {
  const b = await corpo(c);
  const linhas: any[] = Array.isArray(b.linhas) ? b.linhas : [];
  if (!linhas.length) throw new HttpErro(400, "Adicione itens à venda.");
  const obraId = c.get("obraId"), usuarioId = c.get("usuario").id;
  const venda = await db.transaction(async (tx) => {
    const preparadas = [];
    for (const l of linhas) {
      const [item] = await tx.select().from(itens)
        .where(and(eq(itens.id, Number(l.itemId)), eq(itens.obraId, obraId), eq(itens.ativo, true)));
      if (!item) throw new HttpErro(404, "Item da venda não encontrado.");
      const quantidade = num(l.quantidade);
      if (quantidade <= 0) throw new HttpErro(400, `Quantidade inválida para "${item.nome}".`);
      const preco = l.precoUnitario !== undefined ? Math.max(0, num(l.precoUnitario)) : item.precoVenda;
      preparadas.push({ item, quantidade, preco, total: Math.round(quantidade * preco * 100) / 100 });
    }
    const subtotal = Math.round(preparadas.reduce((s, p) => s + p.total, 0) * 100) / 100;
    const desconto = Math.min(subtotal, Math.max(0, num(b.desconto)));
    const [v] = await tx.insert(vendas).values({
      obraId, usuarioId, cliente: txt(b.cliente, 160), documento: txt(b.documento, 40),
      formaPagamento: FORMAS.includes(b.formaPagamento) ? b.formaPagamento : "dinheiro",
      subtotal, desconto, total: Math.round((subtotal - desconto) * 100) / 100, observacao: txt(b.observacao, 500),
    }).returning();
    for (const p of preparadas) {
      await tx.insert(vendaItens).values({
        vendaId: v.id, itemId: p.item.id, descricao: p.item.nome, unidade: p.item.unidade,
        quantidade: p.quantidade, precoUnitario: p.preco, total: p.total,
      });
      // Baixa automática no estoque
      await lancar(tx, {
        obraId, usuarioId, tipo: "venda", itemId: p.item.id, quantidade: p.quantidade, valorUnitario: p.preco,
        vendaId: v.id, retiradoPor: v.cliente, observacao: `Venda nº ${v.id}`,
      });
    }
    return v;
  });
  return c.json(venda, 201);
});

app.post("/vendas/:id/cancelar", async (c) => {
  const id = Number(c.req.param("id"));
  const obraId = c.get("obraId"), usuarioId = c.get("usuario").id;
  await db.transaction(async (tx) => {
    const [v] = await tx.update(vendas).set({ status: "cancelada" })
      .where(and(eq(vendas.id, id), eq(vendas.obraId, obraId), eq(vendas.status, "concluida"))).returning();
    if (!v) throw new HttpErro(409, "Venda não encontrada ou já cancelada.");
    const linhas = await tx.select().from(vendaItens).where(eq(vendaItens.vendaId, id));
    for (const l of linhas) {
      await lancar(tx, {
        obraId, usuarioId, tipo: "estorno", itemId: l.itemId, quantidade: l.quantidade, valorUnitario: l.precoUnitario,
        vendaId: id, observacao: `Cancelamento da venda nº ${id}`,
      });
    }
  });
  return c.json({ ok: true });
});

/* ───────────────────────── Ordens de compra ───────────────────────── */

const STATUS_OC = ["pendente", "aprovada", "atendida", "cancelada"];
const dataOk = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

function dadosOrdem(b: Record<string, any>) {
  const status = STATUS_OC.includes(b.status) ? b.status : "pendente";
  let dataAprovacao = dataOk(b.dataAprovacao);
  if (!dataAprovacao && (status === "aprovada" || status === "atendida")) dataAprovacao = hoje();
  return {
    solicitante: txt(b.solicitante, 160),
    dataSolicitacao: dataOk(b.dataSolicitacao) ?? hoje(),
    status,
    dataAprovacao,
    grupoOrcamento: txt(b.grupoOrcamento, 120),
    unidadeConstrutiva: txt(b.unidadeConstrutiva, 120),
    codigoConsumo: txt(b.codigoConsumo, 60),
    descricaoItem: txt(b.descricaoItem, 500),
    quantidade: Math.max(0, num(b.quantidade)),
    unidadeCompra: txt(b.unidadeCompra, 20) || "un",
    observacao: txt(b.observacao, 500),
  };
}

app.get("/ordens", async (c) => {
  const lista = await db.select({ o: ordensCompra, criadoPor: usuarios.nome }).from(ordensCompra)
    .leftJoin(usuarios, eq(ordensCompra.usuarioId, usuarios.id))
    .where(eq(ordensCompra.obraId, c.get("obraId")))
    .orderBy(desc(ordensCompra.dataSolicitacao), desc(ordensCompra.id)).limit(1000);
  return c.json(lista.map((r) => ({ ...r.o, criadoPor: r.criadoPor })));
});

app.post("/ordens", async (c) => {
  const d = dadosOrdem(await corpo(c));
  if (!d.solicitante || !d.descricaoItem || d.quantidade <= 0)
    throw new HttpErro(400, "Preencha solicitante, descrição do item e quantidade.");
  const [o] = await db.insert(ordensCompra).values({ ...d, obraId: c.get("obraId"), usuarioId: c.get("usuario").id }).returning();
  return c.json(o, 201);
});

app.put("/ordens/:id", async (c) => {
  const d = dadosOrdem(await corpo(c));
  if (!d.solicitante || !d.descricaoItem || d.quantidade <= 0)
    throw new HttpErro(400, "Preencha solicitante, descrição do item e quantidade.");
  const [o] = await db.update(ordensCompra).set(d)
    .where(and(eq(ordensCompra.id, Number(c.req.param("id"))), eq(ordensCompra.obraId, c.get("obraId")))).returning();
  if (!o) throw new HttpErro(404, "Ordem não encontrada.");
  return c.json(o);
});

app.delete("/ordens/:id", async (c) => {
  await db.delete(ordensCompra)
    .where(and(eq(ordensCompra.id, Number(c.req.param("id"))), eq(ordensCompra.obraId, c.get("obraId"))));
  return c.json({ ok: true });
});

/* ───────────────────────── Painel ───────────────────────── */

app.get("/painel", async (c) => {
  const obraId = c.get("obraId");
  const inicioHoje = new Date(`${new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10)}T00:00:00-03:00`);
  const seteDias = new Date(Date.now() - 7 * 864e5);
  const [[est], [mov], [vend], [ocs], falta, recentes] = await Promise.all([
    db.select({
      total: count(),
      baixo: sql<number>`(count(*) filter (where ${itens.quantidade} > 0 and ${itens.quantidade} < ${itens.minimo}))::int`,
      zerado: sql<number>`(count(*) filter (where ${itens.quantidade} <= 0))::int`,
      valor: sql<number>`coalesce(sum(${itens.quantidade} * ${itens.precoCusto}), 0)::float`,
    }).from(itens).where(and(eq(itens.obraId, obraId), eq(itens.ativo, true))),
    db.select({ n: count() }).from(movimentos).where(and(eq(movimentos.obraId, obraId), gte(movimentos.createdAt, seteDias))),
    db.select({ n: count(), total: sum(vendas.total) }).from(vendas)
      .where(and(eq(vendas.obraId, obraId), eq(vendas.status, "concluida"), gte(vendas.createdAt, inicioHoje))),
    db.select({ n: count() }).from(ordensCompra).where(and(eq(ordensCompra.obraId, obraId), eq(ordensCompra.status, "pendente"))),
    db.select().from(itens)
      .where(and(eq(itens.obraId, obraId), eq(itens.ativo, true), sql`(${itens.quantidade} < ${itens.minimo} or ${itens.quantidade} <= 0)`))
      .orderBy(sql`${itens.quantidade} - ${itens.minimo}`).limit(8),
    db.select({ m: movimentos, itemNome: itens.nome, unidade: itens.unidade }).from(movimentos)
      .innerJoin(itens, eq(movimentos.itemId, itens.id))
      .where(eq(movimentos.obraId, obraId)).orderBy(desc(movimentos.createdAt)).limit(8),
  ]);
  return c.json({
    itens: est.total, baixo: est.baixo, zerado: est.zerado, valorEstoque: est.valor,
    movimentos7d: mov.n, vendasHoje: vend.n, faturamentoHoje: Number(vend.total ?? 0), ordensPendentes: ocs.n,
    falta, recentes: recentes.map((r) => ({ ...r.m, itemNome: r.itemNome, unidade: r.unidade })),
  });
});

app.all("/*", (c) => c.json({ erro: "Rota não encontrada." }, 404));

export default app;
