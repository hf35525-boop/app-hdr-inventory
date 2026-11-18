import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ClipboardList, Package, ShoppingCart, Wallet } from "lucide-react";
import type { Tela } from "../App";
import { useDados } from "../lib/useDados";
import { useSessao, useTermos } from "../lib/sessao";
import type { Item, Movimento } from "../lib/tipos";
import { brl, dataHora, qtd } from "../lib/fmt";
import { Botao, Cartao, Kpi, Titulo, cx } from "../components/ui";
import { RotuloTipo } from "./Historico";

interface DadosPainel {
  itens: number; baixo: number; zerado: number; valorEstoque: number; movimentos7d: number;
  vendasHoje: number; faturamentoHoje: number; ordensPendentes: number; falta: Item[]; recentes: Movimento[];
}

export default function Painel({ ir }: { ir: (t: Tela) => void }) {
  const { obra, usuario } = useSessao();
  const termos = useTermos();
  const { dados: d, carregando } = useDados<DadosPainel | null>("/painel", null);

  return (
    <>
      <Titulo
        titulo={obra?.nome ?? "Painel"}
        sub={`${termos.comercio ? "Loja" : "Obra"} · Olá, ${usuario?.nome.split(" ")[0]}`}
        acoes={
          <>
            <Botao variante="claro" onClick={() => ir("movimentar")}><ArrowDownLeft size={16} /> Entrada / saída</Botao>
            <Botao variante="primario" onClick={() => ir("vendas")}><ShoppingCart size={16} /> Nova venda</Botao>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Itens cadastrados" valor={d ? d.itens : "…"} icone={<Package size={15} />} />
        <Kpi rotulo="Abaixo do mínimo" valor={d ? d.baixo : "…"} destaque={d && d.baixo ? "alerta" : undefined} icone={<AlertTriangle size={15} />} />
        <Kpi rotulo="Zerados" valor={d ? d.zerado : "…"} destaque={d && d.zerado ? "perigo" : undefined} />
        <Kpi rotulo="Valor em estoque" valor={d ? brl(d.valorEstoque) : "…"} icone={<Wallet size={15} />} />
        <Kpi rotulo="Vendas hoje" valor={d ? d.vendasHoje : "…"} icone={<ShoppingCart size={15} />} />
        <Kpi rotulo="Faturado hoje" valor={d ? brl(d.faturamentoHoje) : "…"} />
        <Kpi rotulo="Movimentos (7 dias)" valor={d ? d.movimentos7d : "…"} />
        <Kpi rotulo="Ordens pendentes" valor={d ? d.ordensPendentes : "…"} destaque={d && d.ordensPendentes ? "alerta" : undefined} icone={<ClipboardList size={15} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Cartao>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-black">Reposição necessária</h2>
            <button className="text-sm font-semibold text-mute hover:text-ink" onClick={() => ir("estoque")}>Ver estoque →</button>
          </div>
          {carregando && !d ? <p className="p-5 text-sm text-mute">Carregando…</p> : !d?.falta.length ? (
            <p className="p-5 text-sm text-mute">Tudo certo — nenhum item abaixo do mínimo. ✔</p>
          ) : (
            <ul>
              {d.falta.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 border-b border-line/60 px-5 py-3 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{i.nome}</div>
                    <div className="font-mono text-xs text-mute">{i.codigo} · mín. {qtd(i.minimo)} {i.unidade}</div>
                  </div>
                  <span className={cx("font-black tabular", i.quantidade <= 0 ? "text-danger" : "text-warn")}>{qtd(i.quantidade)} {i.unidade}</span>
                </li>
              ))}
            </ul>
          )}
          {!!d?.falta.length && (
            <div className="border-t border-line px-5 py-3">
              <button className="text-sm font-semibold text-ink hover:underline" onClick={() => ir("compras")}>Abrir ordem de compra →</button>
            </div>
          )}
        </Cartao>

        <Cartao>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-black">Movimentação recente</h2>
            <button className="text-sm font-semibold text-mute hover:text-ink" onClick={() => ir("historico")}>Histórico →</button>
          </div>
          {!d?.recentes.length ? <p className="p-5 text-sm text-mute">Nada registrado ainda.</p> : (
            <ul>
              {d.recentes.map((m) => {
                const entra = m.quantidade >= 0 && m.tipo !== "saida" && m.tipo !== "venda";
                return (
                  <li key={m.id} className="flex items-center gap-3 border-b border-line/60 px-5 py-3 last:border-0">
                    <span className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full", entra ? "bg-ok/12 text-ok" : "bg-danger/10 text-danger")}>
                      {entra ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{m.itemNome}</div>
                      <div className="text-xs text-mute">
                        <RotuloTipo tipo={m.tipo} /> {dataHora(m.createdAt)}{m.notaFiscal && ` · NF ${m.notaFiscal}`}
                      </div>
                    </div>
                    <span className="font-bold tabular">{entra ? "+" : "−"}{qtd(Math.abs(m.quantidade))} {m.unidade}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  );
}
