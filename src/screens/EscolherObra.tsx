import { useState } from "react";
import { Building2, LogOut, Plus, Store } from "lucide-react";
import { useSessao } from "../lib/sessao";
import { api, msgErro } from "../lib/api";
import { Botao, Campo, Entrada, Janela, Selecao, useAviso } from "../components/ui";

export default function EscolherObra() {
  const { obras, usuario, ehDono, escolherObra, recarregarObras, sair } = useSessao();
  const [nova, setNova] = useState(false);
  const [f, setF] = useState({ nome: "", tipo: "obra", endereco: "" });
  const avisar = useAviso();
  const ativas = obras.filter((o) => o.ativo);

  async function criar() {
    try {
      const o = await api("/obras", { body: f });
      await recarregarObras();
      setNova(false);
      escolherObra(o.id);
    } catch (e) {
      avisar(msgErro(e), "erro");
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col p-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-xl font-black">ALMOX</span>
        </div>
        <button onClick={sair} className="flex items-center gap-1 text-sm font-semibold text-mute hover:text-ink"><LogOut size={16} /> Sair</button>
      </div>
      <h1 className="text-3xl font-black">Olá, {usuario?.nome.split(" ")[0]}.</h1>
      <p className="mt-1 text-mute">Em qual obra ou loja você vai trabalhar agora?</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {ativas.map((o) => (
          <button key={o.id} onClick={() => escolherObra(o.id)}
            className="group rounded-xl border border-line bg-card p-5 text-left transition hover:border-ink hover:shadow-md">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mute">
              {o.tipo === "comercio" ? <Store size={14} /> : <Building2 size={14} />} {o.tipo === "comercio" ? "Comércio" : "Obra"}
            </div>
            <div className="mt-1 text-lg font-black group-hover:underline">{o.nome}</div>
            {o.endereco && <div className="mt-1 truncate text-sm text-mute">{o.endereco}</div>}
          </button>
        ))}
        {ehDono && (
          <button onClick={() => setNova(true)} className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-5 font-semibold text-mute hover:border-ink hover:text-ink">
            <Plus size={18} /> Nova obra ou loja
          </button>
        )}
      </div>
      {!ativas.length && !ehDono && <p className="mt-6 text-mute">Nenhuma obra disponível. Fale com o administrador.</p>}

      <Janela aberta={nova} titulo="Nova obra ou loja" aoFechar={() => setNova(false)}>
        <div className="space-y-4">
          <Campo rotulo="Tipo">
            <Selecao value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
              <option value="obra">Obra de construção</option>
              <option value="comercio">Comércio / loja</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Nome *"><Entrada value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Campo>
          <Campo rotulo="Endereço ou observação"><Entrada value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></Campo>
          <Botao variante="primario" className="w-full" onClick={criar} disabled={!f.nome.trim()}>Criar</Botao>
        </div>
      </Janela>
    </div>
  );
}
