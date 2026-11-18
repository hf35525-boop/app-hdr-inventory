import { useMemo, useState } from "react";
import { CheckCircle2, Download, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import { api, msgErro } from "../lib/api";
import { useDados } from "../lib/useDados";
import { useSessao, useTermos } from "../lib/sessao";
import { UNIDADES, type Item, type OrdemCompra, type StatusOC } from "../lib/tipos";
import { baixarCsv, data, hojeISO, numIn, qtd } from "../lib/fmt";
import { Botao, Campo, Cartao, Entrada, Janela, Selecao, Selo, Texto, Titulo, Vazio, cx, useAviso } from "../components/ui";

const STATUS: Record<StatusOC, { r: string; cor: "amarelo" | "azul" | "verde" | "vermelho" }> = {
  pendente: { r: "Pendente", cor: "amarelo" },
  aprovada: { r: "Aprovada", cor: "azul" },
  atendida: { r: "Atendida", cor: "verde" },
  cancelada: { r: "Cancelada", cor: "vermelho" },
};
const SeloStatus = ({ s }: { s: StatusOC }) => <Selo cor={STATUS[s].cor}>{STATUS[s].r}</Selo>;

export default function Compras() {
  const { dados: ordens, carregando, recarregar } = useDados<OrdemCompra[]>("/ordens", []);
  const avisar = useAviso();
  const [filtro, setFiltro] = useState<StatusOC | "todas">("todas");
  const [q, setQ] = useState("");
  const [editando, setEditando] = useState<Partial<OrdemCompra> | null>(null);

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todas: ordens.length };
    for (const o of ordens) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [ordens]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ordens.filter((o) =>
      (filtro === "todas" || o.status === filtro) &&
      (!t || [o.solicitante, o.descricaoItem, o.grupoOrcamento, o.unidadeConstrutiva, o.codigoConsumo].some((v) => v.toLowerCase().includes(t))),
    );
  }, [ordens, filtro, q]);

  async function mudarStatus(o: OrdemCompra, status: StatusOC) {
    try {
      const dataAprovacao = status === "pendente" || status === "cancelada" ? o.dataAprovacao : o.dataAprovacao ?? hojeISO();
      await api(`/ordens/${o.id}`, { method: "PUT", body: { ...o, status, dataAprovacao } });
      avisar(`Ordem nº ${o.id}: ${STATUS[status].r.toLowerCase()}.`);
      recarregar();
    } catch (e) {
      avisar(msgErro(e), "erro");
    }
  }

  const exportar = () =>
    baixarCsv("ordens-de-compra.csv", [
      ["Nº", "Solicitante", "Data da solicitação", "Status", "Data de aprovação", "Grupo de orçamento", "Unidade construtiva", "Código consumo", "Descrição do item", "Quantidade", "Unidade de compra", "Observação"],
      ...lista.map((o) => [o.id, o.solicitante, data(o.dataSolicitacao), STATUS[o.status].r, data(o.dataAprovacao), o.grupoOrcamento, o.unidadeConstrutiva, o.codigoConsumo, o.descricaoItem, o.quantidade, o.unidadeCompra, o.observacao]),
    ]);

  return (
    <>
      <Titulo titulo="Ordens de compra" sub="Solicitações de compra, aprovação e atendimento"
        acoes={<>
          <Botao variante="claro" className="no-print" onClick={() => window.print()}><Printer size={16} /> Imprimir</Botao>
          <Botao variante="claro" className="no-print" onClick={exportar} disabled={!lista.length}><Download size={16} /> CSV</Botao>
          <Botao variante="primario" className="no-print" onClick={() => setEditando({})}><Plus size={16} /> Nova ordem</Botao>
        </>} />

      <div className="no-print mb-4 flex flex-col gap-2 lg:flex-row">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-white p-1">
          {(["todas", "pendente", "aprovada", "atendida", "cancelada"] as const).map((s) => (
            <button key={s} onClick={() => setFiltro(s)} className={cx("whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold", filtro === s ? "bg-ink text-white" : "text-mute")}>
              {s === "todas" ? "Todas" : STATUS[s].r} <span className="opacity-60">{contagem[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 text-mute" size={20} />
          <Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar solicitante, item, grupo, código…" className="pl-10" />
        </div>
      </div>

      {carregando && !ordens.length ? <p className="text-mute">Carregando…</p> : !ordens.length ? (
        <Vazio titulo="Nenhuma ordem de compra" texto="Registre a primeira solicitação de compra."
          acao={<Botao variante="primario" onClick={() => setEditando({})}><Plus size={16} /> Nova ordem</Botao>} />
      ) : !lista.length ? <Vazio titulo="Nenhuma ordem neste filtro" /> : (
        <>
          <Cartao className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-ink/4 text-left text-xs uppercase tracking-wide text-mute">
                <tr>
                  <th className="px-3 py-3">Nº</th><th className="px-3 py-3">Solicitante</th><th className="px-3 py-3">Solicitação</th>
                  <th className="px-3 py-3">Status</th><th className="px-3 py-3">Aprovação</th><th className="px-3 py-3">Grupo orç.</th>
                  <th className="px-3 py-3">Un. construtiva</th><th className="px-3 py-3">Cód. consumo</th><th className="px-3 py-3">Descrição do item</th>
                  <th className="px-3 py-3 text-right">Qtd</th><th className="no-print w-24" />
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => (
                  <tr key={o.id} className="border-t border-line/70">
                    <td className="px-3 py-2.5 font-mono text-xs">{o.id}</td>
                    <td className="px-3 py-2.5 font-semibold">{o.solicitante}</td>
                    <td className="px-3 py-2.5 tabular">{data(o.dataSolicitacao)}</td>
                    <td className="px-3 py-2.5"><SeloStatus s={o.status} /></td>
                    <td className="px-3 py-2.5 tabular">{data(o.dataAprovacao)}</td>
                    <td className="px-3 py-2.5">{o.grupoOrcamento || "—"}</td>
                    <td className="px-3 py-2.5">{o.unidadeConstrutiva || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{o.codigoConsumo || "—"}</td>
                    <td className="px-3 py-2.5">{o.descricaoItem}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular">{qtd(o.quantidade)} {o.unidadeCompra}</td>
                    <td className="no-print px-2 py-2.5">
                      <div className="flex justify-end gap-1">
                        {o.status === "pendente" && <button title="Aprovar" onClick={() => mudarStatus(o, "aprovada")} className="rounded-md p-2 text-sky-700 hover:bg-sky-600/10"><CheckCircle2 size={16} /></button>}
                        {o.status === "aprovada" && <button title="Marcar como atendida" onClick={() => mudarStatus(o, "atendida")} className="rounded-md p-2 text-ok hover:bg-ok/10"><CheckCircle2 size={16} /></button>}
                        <button title="Editar" onClick={() => setEditando(o)} className="rounded-md p-2 text-mute hover:bg-ink/5 hover:text-ink"><Pencil size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Cartao>

          <div className="space-y-2 lg:hidden">
            {lista.map((o) => (
              <Cartao key={o.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-mute">OC nº {o.id} · {data(o.dataSolicitacao)}</div>
                    <div className="mt-0.5 font-semibold">{o.descricaoItem}</div>
                    <div className="text-sm text-mute">{qtd(o.quantidade)} {o.unidadeCompra} · {o.solicitante}</div>
                  </div>
                  <SeloStatus s={o.status} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-mute">
                  <span>Grupo: <b className="text-ink">{o.grupoOrcamento || "—"}</b></span>
                  <span>Un. constr.: <b className="text-ink">{o.unidadeConstrutiva || "—"}</b></span>
                  <span>Cód. consumo: <b className="text-ink">{o.codigoConsumo || "—"}</b></span>
                  <span>Aprovação: <b className="text-ink">{data(o.dataAprovacao)}</b></span>
                </div>
                <div className="mt-3 flex gap-2">
                  {o.status === "pendente" && <Botao variante="claro" className="h-9 flex-1" onClick={() => mudarStatus(o, "aprovada")}>Aprovar</Botao>}
                  {o.status === "aprovada" && <Botao variante="claro" className="h-9 flex-1" onClick={() => mudarStatus(o, "atendida")}>Atendida</Botao>}
                  <Botao variante="fantasma" className="h-9" onClick={() => setEditando(o)}><Pencil size={15} /> Editar</Botao>
                </div>
              </Cartao>
            ))}
          </div>
        </>
      )}

      <FormOrdem ordem={editando} aoFechar={() => setEditando(null)} aoSalvar={() => { setEditando(null); recarregar(); }} />
    </>
  );
}

function FormOrdem({ ordem, aoFechar, aoSalvar }: { ordem: Partial<OrdemCompra> | null; aoFechar: () => void; aoSalvar: () => void }) {
  const { usuario } = useSessao();
  const termos = useTermos();
  const avisar = useAviso();
  const { dados: itens } = useDados<Item[]>(ordem ? "/itens" : null, []);
  const nova = !ordem?.id;
  const inicial = () => ({
    solicitante: ordem?.solicitante ?? usuario?.nome ?? "",
    dataSolicitacao: ordem?.dataSolicitacao ?? hojeISO(),
    status: (ordem?.status ?? "pendente") as StatusOC,
    dataAprovacao: ordem?.dataAprovacao ?? "",
    grupoOrcamento: ordem?.grupoOrcamento ?? "",
    unidadeConstrutiva: ordem?.unidadeConstrutiva ?? "",
    codigoConsumo: ordem?.codigoConsumo ?? "",
    descricaoItem: ordem?.descricaoItem ?? "",
    quantidade: ordem?.quantidade != null ? String(ordem.quantidade) : "",
    unidadeCompra: ordem?.unidadeCompra ?? "un",
    observacao: ordem?.observacao ?? "",
  });
  const [f, setF] = useState(inicial);
  const [chave, setChave] = useState<unknown>(null);
  if (ordem !== chave) { setChave(ordem); if (ordem) setF(inicial()); }
  const set = (k: keyof ReturnType<typeof inicial>) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const [salvando, setSalvando] = useState(false);

  const mudarStatus = (status: StatusOC) =>
    setF({ ...f, status, dataAprovacao: (status === "aprovada" || status === "atendida") && !f.dataAprovacao ? hojeISO() : f.dataAprovacao });

  const escolherDescricao = (v: string) => {
    const item = itens.find((i) => i.nome === v);
    setF({ ...f, descricaoItem: v, unidadeCompra: item?.unidade ?? f.unidadeCompra, codigoConsumo: f.codigoConsumo || (item?.codigo ?? "") });
  };

  async function salvar() {
    setSalvando(true);
    try {
      const body = { ...f, quantidade: numIn(f.quantidade), dataAprovacao: f.dataAprovacao || null };
      await api(nova ? "/ordens" : `/ordens/${ordem!.id}`, { method: nova ? "POST" : "PUT", body });
      avisar(nova ? "Ordem de compra registrada." : "Ordem atualizada.");
      aoSalvar();
    } catch (e) {
      avisar(msgErro(e), "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!ordem?.id || !confirm(`Excluir a ordem nº ${ordem.id}?`)) return;
    try {
      await api(`/ordens/${ordem.id}`, { method: "DELETE" });
      avisar("Ordem excluída.");
      aoSalvar();
    } catch (e) {
      avisar(msgErro(e), "erro");
    }
  }

  return (
    <Janela aberta={!!ordem} titulo={nova ? "Nova ordem de compra" : `Ordem de compra nº ${ordem?.id}`} aoFechar={aoFechar} largura="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Solicitante *"><Entrada value={f.solicitante} onChange={set("solicitante")} /></Campo>
        <Campo rotulo="Data da solicitação *"><Entrada type="date" value={f.dataSolicitacao} onChange={set("dataSolicitacao")} /></Campo>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mute">Status</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(STATUS) as StatusOC[]).map((s) => (
              <button key={s} type="button" onClick={() => mudarStatus(s)}
                className={cx("h-10 rounded-lg border text-sm font-semibold", f.status === s ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2")}>
                {STATUS[s].r}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-mute">Pendente = ainda não atendida · Atendida = material já comprado/entregue.</p>
        </div>
        <Campo rotulo="Data de aprovação" dica="Preenchida automaticamente ao aprovar.">
          <Entrada type="date" value={f.dataAprovacao} onChange={set("dataAprovacao")} />
        </Campo>
        <Campo rotulo="Grupo de orçamento"><Entrada value={f.grupoOrcamento} onChange={set("grupoOrcamento")} placeholder="Ex.: 03 · Estrutura" /></Campo>
        <Campo rotulo={termos.comercio ? "Unidade construtiva / setor" : "Unidade construtiva"}>
          <Entrada value={f.unidadeConstrutiva} onChange={set("unidadeConstrutiva")} placeholder={termos.comercio ? "Ex.: Depósito" : "Ex.: Bloco A · Torre 2"} />
        </Campo>
        <Campo rotulo="Código consumo"><Entrada value={f.codigoConsumo} onChange={set("codigoConsumo")} placeholder="Ex.: 3.02.001" /></Campo>
        <Campo rotulo="Descrição do item *" className="sm:col-span-2" dica="Digite livremente ou escolha um item já cadastrado.">
          <Entrada list="oc-itens" value={f.descricaoItem} onChange={(e) => escolherDescricao(e.target.value)} placeholder="Ex.: Cimento CP-II 50 kg" />
          <datalist id="oc-itens">{itens.map((i) => <option key={i.id} value={i.nome} />)}</datalist>
        </Campo>
        <Campo rotulo="Quantidade de compra *"><Entrada inputMode="decimal" value={f.quantidade} onChange={set("quantidade")} /></Campo>
        <Campo rotulo="Unidade de compra">
          <Entrada list="oc-unidades" value={f.unidadeCompra} onChange={set("unidadeCompra")} />
          <datalist id="oc-unidades">{UNIDADES.map((u) => <option key={u} value={u} />)}</datalist>
        </Campo>
        <Campo rotulo="Observação" className="sm:col-span-2"><Texto value={f.observacao} onChange={set("observacao")} rows={2} /></Campo>
      </div>
      <div className="mt-6 flex flex-wrap justify-between gap-2">
        {!nova ? <Botao variante="fantasma" className="text-danger" onClick={excluir}><Trash2 size={16} /> Excluir</Botao> : <span />}
        <div className="flex gap-2">
          <Botao variante="claro" onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" onClick={salvar} disabled={salvando || !f.solicitante.trim() || !f.descricaoItem.trim() || numIn(f.quantidade) <= 0}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </div>
      </div>
    </Janela>
  );
}
