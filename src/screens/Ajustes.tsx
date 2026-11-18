import { useState } from "react";
import { Building2, KeyRound, Pencil, Plus, Store, Users } from "lucide-react";
import { api, msgErro } from "../lib/api";
import { useDados } from "../lib/useDados";
import { useSessao } from "../lib/sessao";
import { PAPEIS, type Obra, type Papel, type Usuario } from "../lib/tipos";
import { Botao, Campo, Cartao, Entrada, Janela, Selecao, Selo, Titulo, useAviso } from "../components/ui";

export default function Ajustes() {
  const { ehDono, ehGestor } = useSessao();
  return (
    <>
      <Titulo titulo="Configurações" sub="Obras e lojas, equipe e sua conta" />
      <div className="space-y-6">
        {ehDono && <SecaoObras />}
        {ehGestor && <SecaoUsuarios />}
        <SecaoSenha />
      </div>
    </>
  );
}

function SecaoObras() {
  const { obras, recarregarObras } = useSessao();
  const avisar = useAviso();
  const [ed, setEd] = useState<Partial<Obra> | null>(null);

  async function salvar() {
    try {
      await api(ed?.id ? `/obras/${ed.id}` : "/obras", { method: ed?.id ? "PUT" : "POST", body: ed });
      await recarregarObras();
      avisar("Salvo.");
      setEd(null);
    } catch (e) {
      avisar(msgErro(e), "erro");
    }
  }

  return (
    <Cartao>
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 font-black"><Building2 size={18} /> Obras e lojas</h2>
        <Botao variante="claro" className="h-9" onClick={() => setEd({ tipo: "obra", nome: "", endereco: "", ativo: true })}><Plus size={16} /> Nova</Botao>
      </div>
      <ul className="divide-y divide-line">
        {obras.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              {o.tipo === "comercio" ? <Store size={18} className="text-mute" /> : <Building2 size={18} className="text-mute" />}
              <div className="min-w-0">
                <div className="truncate font-semibold">{o.nome} {!o.ativo && <Selo>Arquivada</Selo>}</div>
                <div className="truncate text-xs text-mute">{o.tipo === "comercio" ? "Comércio" : "Obra"}{o.endereco && ` · ${o.endereco}`}</div>
              </div>
            </div>
            <button onClick={() => setEd(o)} className="rounded-md p-2 text-mute hover:bg-ink/5 hover:text-ink"><Pencil size={16} /></button>
          </li>
        ))}
      </ul>
      <Janela aberta={!!ed} titulo={ed?.id ? "Editar" : "Nova obra ou loja"} aoFechar={() => setEd(null)}>
        {ed && (
          <div className="space-y-4">
            <Campo rotulo="Tipo">
              <Selecao value={ed.tipo} onChange={(e) => setEd({ ...ed, tipo: e.target.value as Obra["tipo"] })}>
                <option value="obra">Obra de construção</option>
                <option value="comercio">Comércio / loja</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Nome *"><Entrada value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></Campo>
            <Campo rotulo="Endereço ou observação"><Entrada value={ed.endereco} onChange={(e) => setEd({ ...ed, endereco: e.target.value })} /></Campo>
            {ed.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} className="h-4 w-4 accent-ink" /> Ativa
              </label>
            )}
            <Botao variante="primario" className="w-full" onClick={salvar} disabled={!ed.nome?.trim()}>Salvar</Botao>
          </div>
        )}
      </Janela>
    </Cartao>
  );
}

type FormUsuario = { id?: number; nome: string; usuario: string; senha: string; papel: Papel; obraId: string; ativo: boolean };

function SecaoUsuarios() {
  const { ehDono, obras, usuario: eu } = useSessao();
  const { dados: usuarios, recarregar } = useDados<Usuario[]>("/usuarios", []);
  const avisar = useAviso();
  const [ed, setEd] = useState<FormUsuario | null>(null);
  const nomeObra = (id: number | null) => obras.find((o) => o.id === id)?.nome ?? "Todas";

  async function salvar() {
    if (!ed) return;
    try {
      await api(ed.id ? `/usuarios/${ed.id}` : "/usuarios", { method: ed.id ? "PUT" : "POST", body: { ...ed, obraId: Number(ed.obraId) || undefined } });
      avisar("Usuário salvo.");
      setEd(null);
      recarregar();
    } catch (e) {
      avisar(msgErro(e), "erro");
    }
  }

  return (
    <Cartao>
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 font-black"><Users size={18} /> Equipe</h2>
        <Botao variante="claro" className="h-9" onClick={() => setEd({ nome: "", usuario: "", senha: "", papel: "almoxarife", obraId: String(eu?.obraId ?? obras[0]?.id ?? ""), ativo: true })}>
          <Plus size={16} /> Novo usuário
        </Botao>
      </div>
      <ul className="divide-y divide-line">
        {usuarios.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{u.nome} {u.id === eu?.id && <span className="text-mute">(você)</span>} {!u.ativo && <Selo cor="vermelho">Desativado</Selo>}</div>
              <div className="truncate text-xs text-mute"><span className="font-mono">{u.usuario}</span> · {PAPEIS[u.papel]} · {nomeObra(u.obraId)}</div>
            </div>
            {u.papel !== "dono" && (
              <button onClick={() => setEd({ ...u, senha: "", obraId: String(u.obraId ?? "") })} className="rounded-md p-2 text-mute hover:bg-ink/5 hover:text-ink"><Pencil size={16} /></button>
            )}
          </li>
        ))}
      </ul>
      <Janela aberta={!!ed} titulo={ed?.id ? "Editar usuário" : "Novo usuário"} aoFechar={() => setEd(null)}>
        {ed && (
          <div className="space-y-4">
            <Campo rotulo="Nome *"><Entrada value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></Campo>
            <Campo rotulo="Usuário (login) *"><Entrada value={ed.usuario} disabled={!!ed.id} autoCapitalize="none" onChange={(e) => setEd({ ...ed, usuario: e.target.value })} placeholder="ex.: ana.paula" /></Campo>
            <Campo rotulo={ed.id ? "Nova senha (deixe em branco para manter)" : "Senha inicial *"}><Entrada type="password" value={ed.senha} onChange={(e) => setEd({ ...ed, senha: e.target.value })} /></Campo>
            <Campo rotulo="Nível">
              <Selecao value={ed.papel} onChange={(e) => setEd({ ...ed, papel: e.target.value as Papel })}>
                <option value="admin">Administrador</option>
                <option value="almoxarife">Almoxarife</option>
                <option value="vendedor">Vendedor</option>
              </Selecao>
            </Campo>
            {ehDono && (
              <Campo rotulo="Obra / loja *">
                <Selecao value={ed.obraId} onChange={(e) => setEd({ ...ed, obraId: e.target.value })}>
                  <option value="">Escolha…</option>
                  {obras.filter((o) => o.ativo).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </Selecao>
              </Campo>
            )}
            {ed.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} className="h-4 w-4 accent-ink" /> Ativo
              </label>
            )}
            <Botao variante="primario" className="w-full" onClick={salvar}>Salvar</Botao>
          </div>
        )}
      </Janela>
    </Cartao>
  );
}

function SecaoSenha() {
  const avisar = useAviso();
  const [f, setF] = useState({ atual: "", nova: "", nova2: "" });
  async function salvar() {
    if (f.nova !== f.nova2) return avisar("As senhas não conferem.", "erro");
    try {
      await api("/auth/senha", { body: { atual: f.atual, nova: f.nova } });
      avisar("Senha alterada.");
      setF({ atual: "", nova: "", nova2: "" });
    } catch (e) {
      avisar(msgErro(e), "erro");
    }
  }
  return (
    <Cartao className="p-5">
      <h2 className="mb-4 flex items-center gap-2 font-black"><KeyRound size={18} /> Alterar senha</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Senha atual"><Entrada type="password" value={f.atual} onChange={(e) => setF({ ...f, atual: e.target.value })} /></Campo>
        <Campo rotulo="Nova senha"><Entrada type="password" value={f.nova} onChange={(e) => setF({ ...f, nova: e.target.value })} /></Campo>
        <Campo rotulo="Repita a senha"><Entrada type="password" value={f.nova2} onChange={(e) => setF({ ...f, nova2: e.target.value })} /></Campo>
      </div>
      <Botao className="mt-4" onClick={salvar} disabled={!f.atual || f.nova.length < 6}>Alterar senha</Botao>
    </Cartao>
  );
}
