import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Tela } from "../App";
import { api, msgErro } from "../lib/api";
import { useDados } from "../lib/useDados";
import { useTermos } from "../lib/sessao";
import { CATEGORIAS_COMERCIO, CATEGORIAS_OBRA, UNIDADES, type Item, type Movimento } from "../lib/tipos";
import { baixarCsv, brl, dataHora, numIn, qtd, situacao } from "../lib/fmt";
import { Botao, Campo, Cartao, Entrada, Janela, Selecao, Selo, Titulo, Vazio, cx, useAviso } from "../components/ui";
import { RotuloTipo, sinal } from "./Historico";

const SELO = { ok: <Selo cor="verde">Normal</Selo>, baixo: <Selo cor="amarelo">Baixo</Selo>, zerado: <Selo cor="vermelho">Zerado</Selo> };

export default function Estoque({ ir }: { ir: (t: Tela) => void }) {
  const { dados: itens, carregando, recarregar } = useDados<Item[]>("/itens", []);
  const termos = useTermos();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "baixo" | "zerado">("todos");
  const [categoria, setCategoria] = useState("");
  const [editando, setEditando] = useState<Partial<Item> | null>(null);
  const [vendo, setVendo] = useState<Item | null>(null);

  const categorias = useMemo(() => [...new Set(itens.map((i) => i.categoria).filter(Boolean))].sort(), [itens]);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return itens.filter((i) => {
      if (filtro === "baixo" && situacao(i) !== "baixo") return false;
      if (filtro === "zerado" && situacao(i) !== "zerado") return false;
      if (categoria && i.categoria !== categoria) return false;
      return !t || [i.nome, i.codigo, i.codigoBarras, i.local, i.fornecedor].some((v) => v.toLowerCase().includes(t));
    });
  }, [itens, q, filtro, categoria]);

  const exportar = () =>
    baixarCsv("estoque.csv", [
      ["Código", "Nome", "Categoria", "Unidade", "Saldo", "Mínimo", "Local", "Fornecedor", "Custo", "Preço venda", "Situação"],
      ...lista.map((i) => [i.codigo, i.nome, i.categoria, i.unidade, i.quantidade, i.minimo, i.local, i.fornecedor, i.precoCusto, i.precoVenda, situacao(i)]),
    ]);

  return (
    <>
      <Titulo
        titulo="Estoque"
        sub={`${itens.length} itens · posição atual`}
        acoes={
          <>
            <Botao variante="claro" onClick={exportar} disabled={!lista.length}><Download size={16} /> CSV</Botao>
            <Botao variante="primario" onClick={() => setEditando({})}><Plus size={16} /> Novo item</Botao>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 text-mute" size={20} />
          <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, código, local ou fornecedor" className="pl-10" />
        </div>
        <Selecao value={categoria} onChange={(e) => setCategoria(e.target.value)} className="sm:w-48">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c}>{c}</option>)}
        </Selecao>
        <div className="flex rounded-lg border border-line bg-white p-1">
          {(["todos", "baixo", "zerado"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={cx("flex-1 rounded-md px-3 py-1.5 text-sm font-semibold capitalize", filtro === f ? "bg-ink text-white" : "text-mute")}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {carregando && !itens.length ? <p className="text-mute">Carregando…</p> : !itens.length ? (
        <Vazio titulo="Nenhum item cadastrado ainda" texto="Cadastre materiais ou mercadorias para começar a controlar o estoque."
          acao={<Botao variante="primario" onClick={() => setEditando({})}><Plus size={16} /> Cadastrar o primeiro item</Botao>} />
      ) : !lista.length ? <Vazio titulo="Nenhum item encontrado" texto="Ajuste a busca ou os filtros." /> : (
        <>
          {/* Tabela (computador) */}
          <Cartao className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-ink/4 text-left text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-4 py-3">Item</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3 text-right">Mín.</th>
                  {termos.comercio && <th className="px-4 py-3 text-right">Preço</th>}
                  <th className="px-4 py-3">Situação</th><th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {lista.map((i) => (
                  <tr key={i.id} onClick={() => setVendo(i)} className="cursor-pointer border-t border-line/70 hover:bg-hazard/8">
                    <td className="px-4 py-3"><div className="font-semibold">{i.nome}</div><div className="font-mono text-xs text-mute">{i.codigo}</div></td>
                    <td className="px-4 py-3 text-mute">{i.categoria || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{i.local || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold tabular">{qtd(i.quantidade)} <span className="font-normal text-mute">{i.unidade}</span></td>
                    <td className="px-4 py-3 text-right tabular text-mute">{qtd(i.minimo)}</td>
                    {termos.comercio && <td className="px-4 py-3 text-right tabular">{brl(i.precoVenda)}</td>}
                    <td className="px-4 py-3">{SELO[situacao(i)]}</td>
                    <td className="px-2 py-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setEditando(i); }} className="rounded-md p-2 text-mute hover:bg-ink/5 hover:text-ink" title="Editar"><Pencil size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Cartao>
          {/* Cartões (celular) */}
          <div className="space-y-2 md:hidden">
            {lista.map((i) => (
              <button key={i.id} onClick={() => setVendo(i)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-card p-4 text-left">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{i.nome}</div>
                  <div className="mt-0.5 font-mono text-xs text-mute">{i.codigo}{i.local && ` · ${i.local}`}</div>
                  <div className="mt-2">{SELO[situacao(i)]}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xl font-black tabular">{qtd(i.quantidade)}</div>
                  <div className="text-xs text-mute">{i.unidade}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <FormItem item={editando} aoFechar={() => setEditando(null)} aoSalvar={() => { setEditando(null); recarregar(); }} />
      <DetalheItem item={vendo} aoFechar={() => setVendo(null)} aoEditar={(i) => { setVendo(null); setEditando(i); }} irMovimentar={() => ir("movimentar")} />
    </>
  );
}

function FormItem({ item, aoFechar, aoSalvar }: { item: Partial<Item> | null; aoFechar: () => void; aoSalvar: () => void }) {
  const termos = useTermos();
  const avisar = useAviso();
  const novo = !item?.id;
  const cats = termos.comercio ? CATEGORIAS_COMERCIO : CATEGORIAS_OBRA;
  const inicial = () => ({
    codigo: item?.codigo ?? "", codigoBarras: item?.codigoBarras ?? "", nome: item?.nome ?? "", categoria: item?.categoria ?? cats[0],
    unidade: item?.unidade ?? "un", minimo: String(item?.minimo ?? 0), local: item?.local ?? "", fornecedor: item?.fornecedor ?? "",
    precoCusto: String(item?.precoCusto ?? 0), precoVenda: String(item?.precoVenda ?? 0), quantidade: "0", notaFiscal: "",
  });
  const [f, setF] = useState(inicial);
  const [chave, setChave] = useState<unknown>(null);
  if (item !== chave) { setChave(item); if (item) setF(inicial()); }
  const set = (k: keyof ReturnType<typeof inicial>) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      const body = { ...f, minimo: numIn(f.minimo), precoCusto: numIn(f.precoCusto), precoVenda: numIn(f.precoVenda), quantidade: numIn(f.quantidade) };
      await api(novo ? "/itens" : `/itens/${item!.id}`, { method: novo ? "POST" : "PUT", body });
      avisar(novo ? "Item cadastrado." : "Item atualizado.");
      aoSalvar();
    } catch (e) {
      avisar(msgErro(e), "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar() {
    if (!item?.id || !confirm(`Arquivar "${item.nome}"? Ele some da lista, mas o histórico fica guardado.`)) return;
    try {
      await api(`/itens/${item.id}`, { method: "DELETE" });
      avisar("Item arquivado.");
      aoSalvar();
    } catch (e) {
      avisar(msgErro(e), "erro");
    }
  }

  return (
    <Janela aberta={!!item} titulo={novo ? "Novo item" : "Editar item"} aoFechar={aoFechar} largura="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Código *"><Entrada value={f.codigo} onChange={set("codigo")} placeholder={termos.comercio ? "MERC-0001" : "EPI-0050"} /></Campo>
        <Campo rotulo="Código de barras / QR"><Entrada value={f.codigoBarras} onChange={set("codigoBarras")} placeholder="Digite ou use leitor USB/Bluetooth" /></Campo>
        <Campo rotulo="Nome *" className="sm:col-span-2"><Entrada value={f.nome} onChange={set("nome")} placeholder={termos.comercio ? "Ex.: Refrigerante 2L" : "Ex.: Capacete de segurança branco"} /></Campo>
        <Campo rotulo="Categoria">
          <Entrada list="cats" value={f.categoria} onChange={set("categoria")} />
          <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        </Campo>
        <Campo rotulo="Unidade">
          <Selecao value={f.unidade} onChange={set("unidade")}>{UNIDADES.map((u) => <option key={u}>{u}</option>)}</Selecao>
        </Campo>
        <Campo rotulo="Estoque mínimo"><Entrada inputMode="decimal" value={f.minimo} onChange={set("minimo")} /></Campo>
        <Campo rotulo="Localização"><Entrada value={f.local} onChange={set("local")} placeholder="A-01-01" /></Campo>
        <Campo rotulo="Fornecedor" className="sm:col-span-2"><Entrada value={f.fornecedor} onChange={set("fornecedor")} /></Campo>
        <Campo rotulo="Custo unitário (R$)"><Entrada inputMode="decimal" value={f.precoCusto} onChange={set("precoCusto")} /></Campo>
        <Campo rotulo="Preço de venda (R$)" dica={termos.comercio ? undefined : "Opcional — use se for vender o material."}>
          <Entrada inputMode="decimal" value={f.precoVenda} onChange={set("precoVenda")} />
        </Campo>
        {novo && (
          <div className="grid gap-4 rounded-xl border border-hazard/60 bg-hazard/10 p-4 sm:col-span-2 sm:grid-cols-2">
            <Campo rotulo="Saldo inicial"><Entrada inputMode="decimal" value={f.quantidade} onChange={set("quantidade")} /></Campo>
            <Campo rotulo="Nº da nota fiscal"><Entrada value={f.notaFiscal} onChange={set("notaFiscal")} placeholder="Ex.: 000123456" /></Campo>
          </div>
        )}
      </div>
      <div className="mt-6 flex flex-wrap justify-between gap-2">
        {!novo ? <Botao variante="fantasma" className="text-danger" onClick={arquivar}><Trash2 size={16} /> Arquivar</Botao> : <span />}
        <div className="flex gap-2">
          <Botao variante="claro" onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" onClick={salvar} disabled={salvando || !f.nome.trim() || !f.codigo.trim()}>{salvando ? "Salvando…" : "Salvar"}</Botao>
        </div>
      </div>
    </Janela>
  );
}

function DetalheItem({ item, aoFechar, aoEditar, irMovimentar }: { item: Item | null; aoFechar: () => void; aoEditar: (i: Item) => void; irMovimentar: () => void }) {
  const { dados: movs, carregando } = useDados<Movimento[]>(item ? `/movimentos?itemId=${item.id}&limit=100` : null, []);
  if (!item) return null;
  return (
    <Janela aberta titulo={item.nome} aoFechar={aoFechar} largura="max-w-2xl">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Info r="Saldo atual" v={`${qtd(item.quantidade)} ${item.unidade}`} forte />
        <Info r="Mínimo" v={`${qtd(item.minimo)} ${item.unidade}`} />
        <Info r="Custo" v={brl(item.precoCusto)} />
        <Info r="Venda" v={brl(item.precoVenda)} />
        <Info r="Código" v={item.codigo} mono />
        <Info r="Local" v={item.local || "—"} mono />
        <Info r="Categoria" v={item.categoria || "—"} />
        <Info r="Fornecedor" v={item.fornecedor || "—"} />
      </div>
      <div className="mt-4 flex gap-2">
        <Botao variante="claro" onClick={() => aoEditar(item)}><Pencil size={16} /> Editar</Botao>
        <Botao variante="primario" onClick={irMovimentar}>Movimentar</Botao>
      </div>
      <h3 className="mb-2 mt-6 font-black">Movimentações do item</h3>
      {carregando ? <p className="text-sm text-mute">Carregando…</p> : !movs.length ? <p className="text-sm text-mute">Sem movimentações registradas.</p> : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {movs.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><RotuloTipo tipo={m.tipo} /> <span className="text-mute">{dataHora(m.createdAt)}</span></div>
                <div className="truncate text-xs text-mute">
                  {[m.notaFiscal && `NF ${m.notaFiscal}`, m.fornecedor, m.retiradoPor, m.destino, m.observacao].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold tabular">{sinal(m)}</div>
                <div className="text-xs text-mute tabular">saldo {qtd(m.saldoApos)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Janela>
  );
}

const Info = ({ r, v, forte, mono }: { r: string; v: string; forte?: boolean; mono?: boolean }) => (
  <div className="rounded-lg border border-line bg-card p-3">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-mute">{r}</div>
    <div className={cx("mt-0.5 truncate", forte ? "text-lg font-black" : "font-semibold", mono && "font-mono text-sm")}>{v}</div>
  </div>
);
