import { useState } from "react";
import { Ban, Minus, Plus, Printer, Receipt, ShoppingCart, Trash2 } from "lucide-react";
import { api, msgErro } from "../lib/api";
import { useDados } from "../lib/useDados";
import { useSessao } from "../lib/sessao";
import { FORMAS_PAGAMENTO, type Item, type Venda } from "../lib/tipos";
import { brl, dataHora, hojeISO, numIn, qtd } from "../lib/fmt";
import BuscaItem from "../components/BuscaItem";
import { Botao, Campo, Cartao, Entrada, Janela, Kpi, Selecao, Selo, Titulo, Vazio, cx, useAviso } from "../components/ui";

type Linha = { item: Item; quantidade: string; preco: string };

export default function Vendas() {
  const [aba, setAba] = useState<"nova" | "lista">("nova");
  return (
    <>
      <Titulo titulo="Vendas" sub="Cada venda dá baixa automática no estoque." />
      <div className="mb-5 inline-flex rounded-lg border border-line bg-white p-1">
        {([["nova", "Nova venda"], ["lista", "Vendas realizadas"]] as const).map(([k, r]) => (
          <button key={k} onClick={() => setAba(k)} className={cx("rounded-md px-4 py-2 text-sm font-semibold", aba === k ? "bg-ink text-white" : "text-mute")}>{r}</button>
        ))}
      </div>
      {aba === "nova" ? <NovaVenda aoConcluir={() => setAba("lista")} /> : <ListaVendas />}
    </>
  );
}

function NovaVenda({ aoConcluir }: { aoConcluir: () => void }) {
  const { dados: itens, recarregar } = useDados<Item[]>("/itens", []);
  const avisar = useAviso();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [cab, setCab] = useState({ cliente: "", documento: "", formaPagamento: "dinheiro", desconto: "", observacao: "" });
  const [enviando, setEnviando] = useState(false);
  const [recibo, setRecibo] = useState<number | null>(null);

  const adicionar = (item: Item) => {
    const existe = linhas.find((l) => l.item.id === item.id);
    if (existe) return setLinhas(linhas.map((l) => (l === existe ? { ...l, quantidade: String(numIn(l.quantidade) + 1) } : l)));
    setLinhas([...linhas, { item, quantidade: "1", preco: String(item.precoVenda) }]);
  };
  const mudar = (l: Linha, k: "quantidade" | "preco", v: string) => setLinhas(linhas.map((x) => (x === l ? { ...x, [k]: v } : x)));
  const passo = (l: Linha, d: number) => mudar(l, "quantidade", String(Math.max(1, numIn(l.quantidade) + d)));

  const subtotal = linhas.reduce((s, l) => s + numIn(l.quantidade) * numIn(l.preco), 0);
  const desconto = Math.min(subtotal, numIn(cab.desconto));
  const total = subtotal - desconto;
  const semSaldo = linhas.filter((l) => numIn(l.quantidade) > l.item.quantidade);

  async function finalizar() {
    setEnviando(true);
    try {
      const v = await api<Venda>("/vendas", {
        body: {
          ...cab, desconto,
          linhas: linhas.map((l) => ({ itemId: l.item.id, quantidade: numIn(l.quantidade), precoUnitario: numIn(l.preco) })),
        },
      });
      avisar(`Venda nº ${v.id} concluída — estoque atualizado.`);
      setLinhas([]);
      setCab({ cliente: "", documento: "", formaPagamento: "dinheiro", desconto: "", observacao: "" });
      setRecibo(v.id);
      recarregar();
    } catch (e) {
      avisar(msgErro(e), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <BuscaItem itens={itens} aoEscolher={adicionar} mostrarPreco placeholder="Buscar produto ou passar o leitor de código de barras" />
        {!linhas.length ? (
          <div className="rounded-xl border border-dashed border-line p-10 text-center text-mute">
            <ShoppingCart className="mx-auto mb-2" size={28} />
            Carrinho vazio. Busque produtos acima.
          </div>
        ) : (
          <div className="space-y-2">
            {linhas.map((l) => {
              const falta = numIn(l.quantidade) > l.item.quantidade;
              return (
                <Cartao key={l.item.id} className={cx("p-3 sm:p-4", falta && "border-danger/60")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{l.item.nome}</div>
                      <div className={cx("font-mono text-xs", falta ? "font-bold text-danger" : "text-mute")}>
                        {l.item.codigo} · disponível {qtd(l.item.quantidade)} {l.item.unidade}
                      </div>
                    </div>
                    <button onClick={() => setLinhas(linhas.filter((x) => x !== l))} className="rounded-md p-1.5 text-mute hover:bg-danger/10 hover:text-danger"><Trash2 size={16} /></button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div className="flex items-center rounded-lg border border-line bg-white">
                      <button onClick={() => passo(l, -1)} className="grid h-11 w-10 place-items-center text-mute hover:text-ink"><Minus size={16} /></button>
                      <input inputMode="decimal" value={l.quantidade} onChange={(e) => mudar(l, "quantidade", e.target.value)} className="h-11 w-16 border-x border-line text-center font-bold outline-none" />
                      <button onClick={() => passo(l, 1)} className="grid h-11 w-10 place-items-center text-mute hover:text-ink"><Plus size={16} /></button>
                    </div>
                    <Campo rotulo="Preço un. (R$)" className="w-32"><Entrada inputMode="decimal" value={l.preco} onChange={(e) => mudar(l, "preco", e.target.value)} /></Campo>
                    <div className="ml-auto text-right text-lg font-black tabular">{brl(numIn(l.quantidade) * numIn(l.preco))}</div>
                  </div>
                </Cartao>
              );
            })}
          </div>
        )}
      </div>

      <Cartao className="h-fit space-y-4 p-4 lg:sticky lg:top-6">
        <Campo rotulo="Cliente"><Entrada value={cab.cliente} onChange={(e) => setCab({ ...cab, cliente: e.target.value })} placeholder="Opcional" /></Campo>
        <Campo rotulo="CPF / CNPJ"><Entrada value={cab.documento} onChange={(e) => setCab({ ...cab, documento: e.target.value })} placeholder="Opcional" /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Pagamento">
            <Selecao value={cab.formaPagamento} onChange={(e) => setCab({ ...cab, formaPagamento: e.target.value })}>
              {Object.entries(FORMAS_PAGAMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Desconto (R$)"><Entrada inputMode="decimal" value={cab.desconto} onChange={(e) => setCab({ ...cab, desconto: e.target.value })} placeholder="0,00" /></Campo>
        </div>
        <div className="space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><span className="text-mute">Subtotal</span><span className="tabular">{brl(subtotal)}</span></div>
          {desconto > 0 && <div className="flex justify-between"><span className="text-mute">Desconto</span><span className="tabular">− {brl(desconto)}</span></div>}
          <div className="flex items-baseline justify-between pt-1"><span className="font-bold">Total</span><span className="text-3xl font-black tabular">{brl(total)}</span></div>
        </div>
        {!!semSaldo.length && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">Estoque insuficiente: {semSaldo.map((l) => l.item.nome).join(", ")}</p>
        )}
        <Botao variante="primario" className="h-13 w-full text-base" onClick={finalizar} disabled={enviando || !linhas.length || !!semSaldo.length || linhas.some((l) => numIn(l.quantidade) <= 0)}>
          {enviando ? "Finalizando…" : "Finalizar venda"}
        </Botao>
      </Cartao>

      <ReciboVenda id={recibo} aoFechar={() => { setRecibo(null); aoConcluir(); }} />
    </div>
  );
}

function ListaVendas() {
  const [dia, setDia] = useState(hojeISO());
  const { dados: vendas, carregando, recarregar } = useDados<Venda[]>(`/vendas${dia ? `?de=${dia}&ate=${dia}` : ""}`, []);
  const [vendo, setVendo] = useState<number | null>(null);
  const concluidas = vendas.filter((v) => v.status === "concluida");
  const total = concluidas.reduce((s, v) => s + v.total, 0);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Campo rotulo="Dia"><Entrada type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="w-44" /></Campo>
        <Botao variante="claro" onClick={() => setDia("")}>Ver todas</Botao>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi rotulo="Vendas" valor={concluidas.length} />
        <Kpi rotulo="Faturamento" valor={brl(total)} />
        <Kpi rotulo="Ticket médio" valor={brl(concluidas.length ? total / concluidas.length : 0)} />
      </div>
      {carregando && !vendas.length ? <p className="text-mute">Carregando…</p> : !vendas.length ? <Vazio titulo="Nenhuma venda neste período" /> : (
        <Cartao className="divide-y divide-line">
          {vendas.map((v) => (
            <button key={v.id} onClick={() => setVendo(v.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-hazard/8">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold">
                  Nº {v.id} {v.status === "cancelada" && <Selo cor="vermelho">Cancelada</Selo>}
                </div>
                <div className="truncate text-xs text-mute">
                  {dataHora(v.createdAt)} · {v.qtdItens} {v.qtdItens === 1 ? "item" : "itens"} · {FORMAS_PAGAMENTO[v.formaPagamento] ?? v.formaPagamento}{v.cliente && ` · ${v.cliente}`}
                </div>
              </div>
              <span className={cx("font-black tabular", v.status === "cancelada" && "text-mute line-through")}>{brl(v.total)}</span>
            </button>
          ))}
        </Cartao>
      )}
      <ReciboVenda id={vendo} aoFechar={() => setVendo(null)} aoCancelar={() => { setVendo(null); recarregar(); }} />
    </>
  );
}

function ReciboVenda({ id, aoFechar, aoCancelar }: { id: number | null; aoFechar: () => void; aoCancelar?: () => void }) {
  const { obra, ehGestor } = useSessao();
  const avisar = useAviso();
  const { dados: v } = useDados<Venda | null>(id ? `/vendas/${id}` : null, null);

  async function cancelar() {
    if (!confirm("Cancelar esta venda? Os itens voltam para o estoque.")) return;
    try {
      await api(`/vendas/${id}/cancelar`, { method: "POST" });
      avisar("Venda cancelada e estoque devolvido.");
      aoCancelar?.();
    } catch (e) {
      avisar(msgErro(e), "erro");
    }
  }

  if (!id) return null;
  return (
    <Janela aberta titulo={`Venda nº ${id}`} aoFechar={aoFechar}>
      {!v || v.id !== id ? <p className="text-mute">Carregando…</p> : (
        <>
          <div id="recibo" className="rounded-xl border border-line bg-white p-4 font-mono text-sm">
            <div className="text-center">
              <div className="font-sans text-lg font-black">{obra?.nome}</div>
              {obra?.endereco && <div className="text-xs text-mute">{obra.endereco}</div>}
              <div className="mt-1 text-xs text-mute">Comprovante de venda · não é documento fiscal</div>
            </div>
            <div className="my-3 border-t border-dashed border-line" />
            <div className="text-xs">Nº {v.id} · {dataHora(v.createdAt)}</div>
            {v.cliente && <div className="text-xs">Cliente: {v.cliente}{v.documento && ` (${v.documento})`}</div>}
            <div className="my-3 border-t border-dashed border-line" />
            {v.linhas?.map((l) => (
              <div key={l.id} className="mb-1.5">
                <div>{l.descricao}</div>
                <div className="flex justify-between text-xs text-mute"><span>{qtd(l.quantidade)} {l.unidade} × {brl(l.precoUnitario)}</span><span className="text-ink">{brl(l.total)}</span></div>
              </div>
            ))}
            <div className="my-3 border-t border-dashed border-line" />
            <div className="flex justify-between text-xs"><span>Subtotal</span><span>{brl(v.subtotal)}</span></div>
            {v.desconto > 0 && <div className="flex justify-between text-xs"><span>Desconto</span><span>− {brl(v.desconto)}</span></div>}
            <div className="flex justify-between text-base font-bold"><span>TOTAL</span><span>{brl(v.total)}</span></div>
            <div className="mt-1 text-xs">Pagamento: {FORMAS_PAGAMENTO[v.formaPagamento] ?? v.formaPagamento}</div>
            {v.status === "cancelada" && <div className="mt-3 text-center font-sans font-black text-danger">VENDA CANCELADA</div>}
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            {ehGestor && v.status === "concluida" && aoCancelar ? (
              <Botao variante="fantasma" className="text-danger" onClick={cancelar}><Ban size={16} /> Cancelar venda</Botao>
            ) : <span />}
            <div className="flex gap-2">
              <Botao variante="claro" onClick={() => imprimir()}><Printer size={16} /> Imprimir</Botao>
              <Botao variante="primario" onClick={aoFechar}><Receipt size={16} /> OK</Botao>
            </div>
          </div>
        </>
      )}
    </Janela>
  );
}

function imprimir() {
  const el = document.getElementById("recibo");
  if (!el) return;
  const w = window.open("", "_blank", "width=380,height=600");
  if (!w) return window.print();
  w.document.write(`<html><head><title>Recibo</title><style>
    body{font-family:ui-monospace,monospace;font-size:12px;padding:12px;color:#000}
    .flex{display:flex}.justify-between{justify-content:space-between}.text-center{text-align:center}
    .border-t{border-top:1px dashed #999;margin:8px 0}.font-bold,.font-black{font-weight:700}.text-lg,.text-base{font-size:14px}
  </style></head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
