import { useState } from "react";
import { Download, Printer, Search } from "lucide-react";
import { useDados } from "../lib/useDados";
import type { Movimento, TipoMov } from "../lib/tipos";
import { baixarCsv, brl, dataHora, qtd } from "../lib/fmt";
import { Botao, Cartao, Entrada, Selecao, Selo, Titulo, Vazio } from "../components/ui";

const TIPOS: Record<TipoMov, { r: string; cor: "verde" | "vermelho" | "azul" | "amarelo" | "cinza" }> = {
  entrada: { r: "Entrada", cor: "verde" },
  saida: { r: "Saída", cor: "vermelho" },
  venda: { r: "Venda", cor: "azul" },
  estorno: { r: "Estorno", cor: "amarelo" },
  ajuste: { r: "Ajuste", cor: "cinza" },
};

export const RotuloTipo = ({ tipo }: { tipo: TipoMov }) => <Selo cor={TIPOS[tipo]?.cor ?? "cinza"}>{TIPOS[tipo]?.r ?? tipo}</Selo>;

/** Quantidade com sinal (+ entra no estoque, − sai do estoque). */
export function sinal(m: Pick<Movimento, "tipo" | "quantidade" | "unidade">) {
  const sai = m.tipo === "saida" || m.tipo === "venda" || (m.tipo === "ajuste" && m.quantidade < 0);
  return `${sai ? "−" : "+"}${qtd(Math.abs(m.quantidade))} ${m.unidade}`;
}

export default function Historico() {
  const [f, setF] = useState({ q: "", tipo: "", de: "", ate: "" });
  const [busca, setBusca] = useState(f);
  const params = new URLSearchParams(Object.entries(busca).filter(([, v]) => v) as [string, string][]);
  params.set("limit", "1000");
  const { dados: movs, carregando } = useDados<Movimento[]>(`/movimentos?${params}`, []);

  const exportar = () =>
    baixarCsv("movimentacoes.csv", [
      ["Data", "Tipo", "Código", "Item", "Quantidade", "Unidade", "Saldo após", "Nota fiscal", "Fornecedor", "Valor unit.", "Retirado por / cliente", "Destino", "Observação", "Usuário"],
      ...movs.map((m) => [dataHora(m.createdAt), TIPOS[m.tipo]?.r ?? m.tipo, m.itemCodigo ?? "", m.itemNome, m.quantidade, m.unidade, m.saldoApos, m.notaFiscal, m.fornecedor, m.valorUnitario, m.retiradoPor, m.destino, m.observacao, m.usuarioNome ?? ""]),
    ]);

  return (
    <>
      <Titulo titulo="Histórico" sub="Todas as entradas, saídas, vendas e ajustes"
        acoes={<>
          <Botao variante="claro" onClick={() => window.print()} className="no-print"><Printer size={16} /> Imprimir</Botao>
          <Botao variante="claro" onClick={exportar} disabled={!movs.length} className="no-print"><Download size={16} /> CSV</Botao>
        </>} />

      <form className="no-print mb-4 grid gap-2 sm:grid-cols-[1fr_160px_150px_150px_auto]" onSubmit={(e) => { e.preventDefault(); setBusca(f); }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 text-mute" size={20} />
          <Entrada value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Item, pessoa, setor, NF, fornecedor…" className="pl-10" />
        </div>
        <Selecao value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
          <option value="">Todos os tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.r}</option>)}
        </Selecao>
        <Entrada type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} aria-label="De" />
        <Entrada type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} aria-label="Até" />
        <Botao>Filtrar</Botao>
      </form>

      {carregando && !movs.length ? <p className="text-mute">Carregando…</p> : !movs.length ? <Vazio titulo="Nada por aqui" texto="Nenhuma movimentação encontrada com esses filtros." /> : (
        <Cartao className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-ink/4 text-left text-xs uppercase tracking-wide text-mute">
              <tr>
                <th className="px-4 py-3">Data</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Item</th>
                <th className="px-4 py-3 text-right">Qtd</th><th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3">NF / Fornecedor</th><th className="px-4 py-3">Retirado por / Destino</th><th className="px-4 py-3">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id} className="border-t border-line/70 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular text-mute">{dataHora(m.createdAt)}</td>
                  <td className="px-4 py-2.5"><RotuloTipo tipo={m.tipo} /></td>
                  <td className="px-4 py-2.5"><div className="font-semibold">{m.itemNome}</div>{m.observacao && <div className="text-xs text-mute">{m.observacao}</div>}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular">{sinal(m)}</td>
                  <td className="px-4 py-2.5 text-right tabular text-mute">{qtd(m.saldoApos)}</td>
                  <td className="px-4 py-2.5">
                    {m.notaFiscal && <div className="font-mono text-xs font-semibold">NF {m.notaFiscal}</div>}
                    <div className="text-xs text-mute">{m.fornecedor}{m.valorUnitario > 0 && ` · ${brl(m.valorUnitario)}/un`}</div>
                  </td>
                  <td className="px-4 py-2.5 text-xs"><div>{m.retiradoPor}</div><div className="text-mute">{m.destino}</div></td>
                  <td className="px-4 py-2.5 text-xs text-mute">{m.usuarioNome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      )}
    </>
  );
}
