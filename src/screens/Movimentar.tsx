import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Scale, Trash2 } from "lucide-react";
import { api, msgErro } from "../lib/api";
import { useDados } from "../lib/useDados";
import { useTermos } from "../lib/sessao";
import type { Item } from "../lib/tipos";
import { brl, numIn, qtd } from "../lib/fmt";
import BuscaItem from "../components/BuscaItem";
import { Botao, Campo, Cartao, Entrada, Texto, Titulo, cx, useAviso } from "../components/ui";

type Modo = "entrada" | "saida" | "ajuste";
type Linha = { item: Item; quantidade: string; valorUnitario: string };

const MODOS: { id: Modo; r: string; d: string; i: typeof Scale }[] = [
  { id: "entrada", r: "Entrada", d: "Chegada de material / mercadoria com nota fiscal", i: ArrowDownLeft },
  { id: "saida", r: "Saída", d: "Retirada para uso, transferência ou perda", i: ArrowUpRight },
  { id: "ajuste", r: "Ajuste", d: "Corrigir o saldo após uma contagem", i: Scale },
];

export default function Movimentar() {
  const { dados: itens, recarregar } = useDados<Item[]>("/itens", []);
  const termos = useTermos();
  const avisar = useAviso();
  const [modo, setModo] = useState<Modo>("entrada");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [cab, setCab] = useState({ notaFiscal: "", fornecedor: "", retiradoPor: "", destino: "", observacao: "", semNota: false });
  const [enviando, setEnviando] = useState(false);

  const trocarModo = (m: Modo) => { setModo(m); setLinhas([]); };
  const adicionar = (item: Item) => {
    if (linhas.some((l) => l.item.id === item.id)) return avisar("Item já está na lista.", "erro");
    setLinhas([...linhas, { item, quantidade: modo === "ajuste" ? String(item.quantidade) : "1", valorUnitario: String(item.precoCusto || "") }]);
  };
  const mudar = (id: number, k: "quantidade" | "valorUnitario", v: string) =>
    setLinhas(linhas.map((l) => (l.item.id === id ? { ...l, [k]: v } : l)));

  const totalNota = linhas.reduce((s, l) => s + numIn(l.quantidade) * numIn(l.valorUnitario), 0);

  async function confirmar() {
    setEnviando(true);
    try {
      await api("/movimentos", {
        body: {
          tipo: modo, ...cab,
          linhas: linhas.map((l) => ({ itemId: l.item.id, quantidade: numIn(l.quantidade), valorUnitario: numIn(l.valorUnitario) })),
        },
      });
      avisar(`${MODOS.find((m) => m.id === modo)!.r} registrada: ${linhas.length} ${linhas.length === 1 ? "item" : "itens"}.`);
      setLinhas([]);
      setCab({ notaFiscal: "", fornecedor: "", retiradoPor: "", destino: "", observacao: "", semNota: false });
      recarregar();
    } catch (e) {
      avisar(msgErro(e), "erro");
    } finally {
      setEnviando(false);
    }
  }

  const faltaNota = modo === "entrada" && !cab.notaFiscal.trim() && !cab.semNota;
  const qtdInvalida = linhas.some((l) => (modo === "ajuste" ? numIn(l.quantidade) < 0 : numIn(l.quantidade) <= 0));
  const semSaldo = modo === "saida" && linhas.some((l) => numIn(l.quantidade) > l.item.quantidade);

  return (
    <>
      <Titulo titulo="Entrada / Saída" sub="Lance várias linhas de uma vez — o saldo é atualizado na hora." />

      <div className="mb-5 grid grid-cols-3 gap-2">
        {MODOS.map((m) => (
          <button key={m.id} onClick={() => trocarModo(m.id)}
            className={cx("rounded-xl border p-3 text-left transition sm:p-4", modo === m.id ? "border-ink bg-ink text-white" : "border-line bg-card hover:border-ink/40")}>
            <m.i size={20} className={modo === m.id ? "text-hazard" : "text-mute"} />
            <div className="mt-1 font-black">{m.r}</div>
            <div className={cx("hidden text-xs sm:block", modo === m.id ? "text-white/60" : "text-mute")}>{m.d}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <BuscaItem itens={itens} aoEscolher={adicionar} />
          {!linhas.length ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-mute">Adicione itens pela busca acima (ou passe o leitor de código de barras).</div>
          ) : (
            <div className="space-y-2">
              {linhas.map((l) => {
                const q = numIn(l.quantidade);
                const depois = modo === "entrada" ? l.item.quantidade + q : modo === "saida" ? l.item.quantidade - q : q;
                return (
                  <Cartao key={l.item.id} className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{l.item.nome}</div>
                        <div className="font-mono text-xs text-mute">{l.item.codigo} · saldo {qtd(l.item.quantidade)} → <b className={cx(depois < 0 ? "text-danger" : "text-ink")}>{qtd(depois)}</b> {l.item.unidade}</div>
                      </div>
                      <button onClick={() => setLinhas(linhas.filter((x) => x !== l))} className="rounded-md p-1.5 text-mute hover:bg-danger/10 hover:text-danger"><Trash2 size={16} /></button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Campo rotulo={modo === "ajuste" ? `Saldo contado (${l.item.unidade})` : `Quantidade (${l.item.unidade})`}>
                        <Entrada inputMode="decimal" value={l.quantidade} onChange={(e) => mudar(l.item.id, "quantidade", e.target.value)} />
                      </Campo>
                      {modo === "entrada" && (
                        <Campo rotulo="Valor unitário (R$)">
                          <Entrada inputMode="decimal" value={l.valorUnitario} onChange={(e) => mudar(l.item.id, "valorUnitario", e.target.value)} />
                        </Campo>
                      )}
                    </div>
                  </Cartao>
                );
              })}
            </div>
          )}
        </div>

        <Cartao className="h-fit space-y-4 p-4 lg:sticky lg:top-6">
          {modo === "entrada" && (
            <>
              <Campo rotulo="Nº da nota fiscal *">
                <Entrada value={cab.notaFiscal} onChange={(e) => setCab({ ...cab, notaFiscal: e.target.value })} placeholder="Ex.: 000123456" disabled={cab.semNota} />
              </Campo>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cab.semNota} onChange={(e) => setCab({ ...cab, semNota: e.target.checked, notaFiscal: "" })} className="h-4 w-4 accent-ink" />
                Entrada sem nota fiscal (doação, devolução…)
              </label>
              <Campo rotulo="Fornecedor"><Entrada value={cab.fornecedor} onChange={(e) => setCab({ ...cab, fornecedor: e.target.value })} /></Campo>
            </>
          )}
          {modo === "saida" && (
            <>
              <Campo rotulo={termos.retirado}><Entrada value={cab.retiradoPor} onChange={(e) => setCab({ ...cab, retiradoPor: e.target.value })} /></Campo>
              <Campo rotulo={termos.destino}><Entrada value={cab.destino} onChange={(e) => setCab({ ...cab, destino: e.target.value })} /></Campo>
            </>
          )}
          <Campo rotulo="Observação"><Texto value={cab.observacao} onChange={(e) => setCab({ ...cab, observacao: e.target.value })} rows={2} /></Campo>
          {modo === "entrada" && totalNota > 0 && (
            <div className="flex justify-between border-t border-line pt-3 text-sm"><span className="text-mute">Total da nota</span><b className="tabular">{brl(totalNota)}</b></div>
          )}
          {semSaldo && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">Há item com quantidade maior que o saldo.</p>}
          <Botao variante="primario" className="w-full" onClick={confirmar} disabled={enviando || !linhas.length || faltaNota || qtdInvalida || semSaldo}>
            {enviando ? "Registrando…" : `Confirmar ${MODOS.find((m) => m.id === modo)!.r.toLowerCase()}`}
          </Botao>
          {faltaNota && !!linhas.length && <p className="text-center text-xs text-mute">Informe o número da nota fiscal.</p>}
        </Cartao>
      </div>
    </>
  );
}
