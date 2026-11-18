import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Item } from "../lib/tipos";
import { brl, qtd, situacao } from "../lib/fmt";
import { cx } from "./ui";

/** Busca de itens por nome, código ou código de barras (aceita leitor USB/Bluetooth + Enter). */
export default function BuscaItem({ itens, aoEscolher, mostrarPreco, placeholder }: {
  itens: Item[]; aoEscolher: (i: Item) => void; mostrarPreco?: boolean; placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState(false);
  const achados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return itens.slice(0, 8);
    return itens.filter((i) =>
      i.nome.toLowerCase().includes(t) || i.codigo.toLowerCase().includes(t) || (i.codigoBarras && i.codigoBarras.toLowerCase() === t),
    ).slice(0, 12);
  }, [q, itens]);

  const escolher = (i: Item) => {
    aoEscolher(i);
    setQ("");
    setAberto(false);
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 text-mute" size={20} />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const t = q.trim().toLowerCase();
          const exato = itens.find((i) => i.codigoBarras.toLowerCase() === t || i.codigo.toLowerCase() === t);
          if (exato) escolher(exato);
          else if (achados.length === 1) escolher(achados[0]);
        }}
        placeholder={placeholder ?? "Buscar item por nome, código ou código de barras"}
        className="h-12 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-[15px] outline-none focus:border-ink focus:ring-2 focus:ring-hazard/60"
      />
      {aberto && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-line bg-white shadow-xl">
          {achados.length === 0 && <div className="p-4 text-sm text-mute">Nenhum item encontrado.</div>}
          {achados.map((i) => {
            const s = situacao(i);
            return (
              <button key={i.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(i)}
                className="flex w-full items-center justify-between gap-3 border-b border-line/60 px-4 py-2.5 text-left last:border-0 hover:bg-hazard/15">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{i.nome}</div>
                  <div className="font-mono text-xs text-mute">{i.codigo}{i.local && ` · ${i.local}`}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={cx("text-sm font-bold tabular", s === "zerado" && "text-danger", s === "baixo" && "text-warn")}>{qtd(i.quantidade)} {i.unidade}</div>
                  {mostrarPreco && <div className="text-xs text-mute tabular">{brl(i.precoVenda)}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
