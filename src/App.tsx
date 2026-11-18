import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight, Building2, ClipboardList, History, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingCart, Store, X,
} from "lucide-react";
import { SessaoProvider, useSessao, useTermos } from "./lib/sessao";
import { AvisoProvider, cx } from "./components/ui";
import Login from "./screens/Login";
import EscolherObra from "./screens/EscolherObra";
import Painel from "./screens/Painel";
import Estoque from "./screens/Estoque";
import Movimentar from "./screens/Movimentar";
import Vendas from "./screens/Vendas";
import Compras from "./screens/Compras";
import Historico from "./screens/Historico";
import Ajustes from "./screens/Ajustes";

export type Tela = "painel" | "estoque" | "movimentar" | "vendas" | "compras" | "historico" | "ajustes";

const NAV: { id: Tela; rotulo: string; curto: string; icone: typeof Package }[] = [
  { id: "painel", rotulo: "Painel", curto: "Painel", icone: LayoutDashboard },
  { id: "estoque", rotulo: "Estoque", curto: "Estoque", icone: Package },
  { id: "movimentar", rotulo: "Entrada / Saída", curto: "Movimentar", icone: ArrowLeftRight },
  { id: "vendas", rotulo: "Vendas", curto: "Vender", icone: ShoppingCart },
  { id: "compras", rotulo: "Ordens de compra", curto: "Compras", icone: ClipboardList },
  { id: "historico", rotulo: "Histórico", curto: "Histórico", icone: History },
  { id: "ajustes", rotulo: "Configurações", curto: "Ajustes", icone: Settings },
];
const NAV_MOBILE: Tela[] = ["painel", "estoque", "movimentar", "vendas", "compras"];

const telaDoHash = (): Tela => {
  const h = location.hash.replace("#/", "") as Tela;
  return NAV.some((n) => n.id === h) ? h : "painel";
};

function useTela() {
  const [tela, setTela] = useState<Tela>(telaDoHash);
  useEffect(() => {
    const f = () => setTela(telaDoHash());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const ir = (t: Tela) => {
    location.hash = `/${t}`;
    window.scrollTo({ top: 0 });
  };
  return [tela, ir] as const;
}

function Marca({ claro }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg" />
      <div className="leading-none">
        <div className={cx("text-lg font-black tracking-tight", claro ? "text-white" : "text-ink")}>ALMOX</div>
        <div className={cx("font-mono text-[10px] uppercase tracking-[.2em]", claro ? "text-white/50" : "text-mute")}>estoque · vendas · compras</div>
      </div>
    </div>
  );
}

function Shell() {
  const { usuario, obra, obras, ehDono, escolherObra, sair } = useSessao();
  const termos = useTermos();
  const [tela, ir] = useTela();
  const [menu, setMenu] = useState(false);

  let conteudo: ReactNode;
  switch (tela) {
    case "estoque": conteudo = <Estoque ir={ir} />; break;
    case "movimentar": conteudo = <Movimentar />; break;
    case "vendas": conteudo = <Vendas />; break;
    case "compras": conteudo = <Compras />; break;
    case "historico": conteudo = <Historico />; break;
    case "ajustes": conteudo = <Ajustes />; break;
    default: conteudo = <Painel ir={ir} />;
  }

  const UnidadeIcone = termos.comercio ? Store : Building2;
  const trocar = ehDono && obras.filter((o) => o.ativo).length > 1;

  const navLateral = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <button
          key={n.id}
          onClick={() => { ir(n.id); setMenu(false); }}
          className={cx(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition",
            tela === n.id ? "bg-hazard text-ink" : "text-white/75 hover:bg-white/8 hover:text-white",
          )}
        >
          <n.icone size={18} /> {n.rotulo}
        </button>
      ))}
    </nav>
  );

  const rodapeLateral = (
    <div className="mt-auto space-y-3 border-t border-white/10 pt-4 text-white/80">
      <div className="rounded-lg bg-white/6 p-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/50"><UnidadeIcone size={13} /> {termos.unidade}</div>
        <div className="mt-0.5 truncate font-bold text-white">{obra?.nome}</div>
        {trocar && (
          <button onClick={() => escolherObra(null)} className="mt-1 text-xs font-semibold text-hazard hover:underline">Trocar →</button>
        )}
      </div>
      <div className="flex items-center justify-between px-1 text-sm">
        <span className="truncate">{usuario?.nome}</span>
        <button onClick={sair} title="Sair" className="rounded-md p-1.5 hover:bg-white/10"><LogOut size={16} /></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-full lg:pl-64">
      {/* Lateral (computador) */}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col bg-ink p-4 lg:flex">
        <div className="mb-6"><Marca claro /></div>
        {navLateral}
        {rodapeLateral}
      </aside>

      {/* Topo (celular) */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Marca claro />
        <div className="flex items-center gap-2">
          <span className="max-w-32 truncate rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white">{obra?.nome}</span>
          <button onClick={() => setMenu(true)} className="rounded-md p-2 text-white hover:bg-white/10" aria-label="Menu"><Menu size={22} /></button>
        </div>
      </header>
      <div className="hazard-stripe no-print h-1.5 lg:hidden" />

      {menu && (
        <div className="fixed inset-0 z-50 bg-ink/50 lg:hidden" onClick={() => setMenu(false)}>
          <div className="ml-auto flex h-full w-72 flex-col bg-ink p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <Marca claro />
              <button onClick={() => setMenu(false)} className="p-1 text-white"><X size={22} /></button>
            </div>
            {navLateral}
            {rodapeLateral}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">{conteudo}</main>

      {/* Barra inferior (celular) */}
      <nav className="no-print pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card lg:hidden">
        {NAV.filter((n) => NAV_MOBILE.includes(n.id)).map((n) => (
          <button
            key={n.id}
            onClick={() => ir(n.id)}
            className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", tela === n.id ? "text-ink" : "text-mute")}
          >
            <span className={cx("rounded-full px-3 py-1", tela === n.id && "bg-hazard")}><n.icone size={20} /></span>
            {n.curto}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Raiz() {
  const { carregando, usuario, obra } = useSessao();
  if (carregando)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <img src="/icon.svg" alt="" className="mx-auto h-14 w-14 animate-pulse rounded-xl" />
          <p className="mt-3 font-mono text-xs uppercase tracking-widest text-mute">Carregando…</p>
        </div>
      </div>
    );
  if (!usuario) return <Login />;
  if (!obra) return <EscolherObra />;
  return <Shell key={obra.id} />;
}

export default function App() {
  return (
    <AvisoProvider>
      <SessaoProvider>
        <Raiz />
      </SessaoProvider>
    </AvisoProvider>
  );
}
