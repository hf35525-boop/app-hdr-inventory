import { createContext, useCallback, useContext, useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variante = "primario" | "escuro" | "claro" | "perigo" | "fantasma";
const VARIANTES: Record<Variante, string> = {
  primario: "bg-hazard text-ink hover:bg-hazard-deep border-ink/10",
  escuro: "bg-ink text-white hover:bg-ink-2 border-ink",
  claro: "bg-card text-ink hover:bg-white border-line",
  perigo: "bg-danger text-white hover:brightness-110 border-danger",
  fantasma: "bg-transparent text-ink hover:bg-ink/5 border-transparent",
};

export function Botao({ variante = "escuro", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg border px-4 h-11 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none",
        VARIANTES[variante], className,
      )}
    />
  );
}

export function Campo({ rotulo, dica, children, className }: { rotulo: string; dica?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mute">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-mute">{dica}</span>}
    </label>
  );
}

const base = "w-full rounded-lg border border-line bg-white px-3 h-11 text-[15px] outline-none focus:border-ink focus:ring-2 focus:ring-hazard/60";
export const Entrada = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(base, className)} />;
export const Selecao = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(base, "pr-8", className)} />;
export const Texto = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(base, "h-auto min-h-20 py-2", className)} />
);

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-card", className)}>{children}</div>;
}

export function Selo({ cor = "cinza", children }: { cor?: "verde" | "amarelo" | "vermelho" | "cinza" | "azul" | "escuro"; children: ReactNode }) {
  const c = {
    verde: "bg-ok/12 text-ok", amarelo: "bg-hazard/30 text-ink", vermelho: "bg-danger/12 text-danger",
    cinza: "bg-ink/7 text-ink-2", azul: "bg-sky-600/12 text-sky-700", escuro: "bg-ink text-white",
  }[cor];
  return <span className={cx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap", c)}>{children}</span>;
}

export function Titulo({ titulo, sub, acoes }: { titulo: string; sub?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{titulo}</h1>
        {sub && <p className="mt-1 text-sm text-mute">{sub}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-card/60 px-6 py-12 text-center">
      <p className="font-bold">{titulo}</p>
      {texto && <p className="mt-1 text-sm text-mute">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function Janela({ aberta, titulo, aoFechar, children, largura = "max-w-lg" }: {
  aberta: boolean; titulo: string; aoFechar: () => void; children: ReactNode; largura?: string;
}) {
  useEffect(() => {
    if (!aberta) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [aberta, aoFechar]);
  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-4" onMouseDown={aoFechar}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-paper shadow-2xl sm:rounded-2xl", largura)}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-5 py-4">
          <h2 className="text-lg font-black">{titulo}</h2>
          <button onClick={aoFechar} className="rounded-md p-1 hover:bg-ink/5" aria-label="Fechar"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Avisos (toasts) ── */
type Aviso = { id: number; texto: string; tipo: "ok" | "erro" };
const AvisoCtx = createContext<(texto: string, tipo?: "ok" | "erro") => void>(() => {});
export const useAviso = () => useContext(AvisoCtx);

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const avisar = useCallback((texto: string, tipo: "ok" | "erro" = "ok") => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), 4000);
  }, []);
  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        {lista.map((a) => (
          <div key={a.id} className={cx("pointer-events-auto rounded-lg px-4 py-3 text-sm font-semibold shadow-lg", a.tipo === "ok" ? "bg-ink text-white" : "bg-danger text-white")}>
            {a.texto}
          </div>
        ))}
      </div>
    </AvisoCtx.Provider>
  );
}

export function Kpi({ rotulo, valor, destaque, icone }: { rotulo: string; valor: ReactNode; destaque?: "alerta" | "perigo"; icone?: ReactNode }) {
  return (
    <Cartao className={cx("p-4", destaque === "alerta" && "border-warn/50", destaque === "perigo" && "border-danger/50")}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-mute">
        {rotulo}
        {icone}
      </div>
      <div className={cx("mt-2 text-2xl font-black tabular", destaque === "alerta" && "text-warn", destaque === "perigo" && "text-danger")}>{valor}</div>
    </Cartao>
  );
}

export { cx };
