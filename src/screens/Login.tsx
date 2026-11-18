import { useState, type FormEvent } from "react";
import { Building2, HardHat, Store } from "lucide-react";
import { useSessao } from "../lib/sessao";
import { msgErro } from "../lib/api";
import { Botao, Campo, Entrada, cx } from "../components/ui";

export default function Login() {
  const { precisaSetup, entrar, configurar } = useSessao();
  const [f, setF] = useState({ nome: "", usuario: "", senha: "", senha2: "", obra: "", tipo: "obra" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (precisaSetup && f.senha !== f.senha2) return setErro("As senhas não conferem.");
    setEnviando(true);
    try {
      if (precisaSetup) await configurar({ nome: f.nome, usuario: f.usuario.trim().toLowerCase(), senha: f.senha, obra: f.obra, tipo: f.tipo });
      else await entrar(f.usuario, f.senha);
    } catch (err) {
      setErro(msgErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-11 w-11 rounded-xl" />
          <span className="text-2xl font-black tracking-tight">ALMOX</span>
        </div>
        <div className="my-auto max-w-md">
          <p className="font-mono text-xs uppercase tracking-[.25em] text-hazard">Almoxarifado · PDV · Compras</p>
          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight">Controle do estoque na palma da mão.</h1>
          <p className="mt-5 text-lg text-white/65">
            Da obra ao balcão: entradas com nota fiscal, saídas por funcionário, vendas com baixa automática e ordens de compra — no computador ou no celular.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><HardHat className="mb-2 text-hazard" size={22} />Obras de construção</div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4"><Store className="mb-2 text-hazard" size={22} />Comércio e lojas</div>
          </div>
        </div>
        <div className="hazard-stripe absolute inset-x-0 bottom-0 h-3" />
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={enviar} className="w-full max-w-sm space-y-4">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/icon.svg" alt="" className="h-11 w-11 rounded-xl" />
            <div>
              <div className="text-2xl font-black">ALMOX</div>
              <div className="text-xs text-mute">Estoque, vendas e compras</div>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black">{precisaSetup ? "Crie a conta do dono" : "Entrar"}</h2>
            <p className="mt-1 text-sm text-mute">
              {precisaSetup ? "Primeiro acesso: com ela você cadastra obras, lojas e a equipe." : "Acesso do dono, administradores, almoxarifes e vendedores."}
            </p>
          </div>

          {precisaSetup && <Campo rotulo="Seu nome"><Entrada value={f.nome} onChange={set("nome")} required /></Campo>}
          <Campo rotulo="Usuário"><Entrada value={f.usuario} onChange={set("usuario")} autoCapitalize="none" autoComplete="username" placeholder="ex.: ana.paula" required /></Campo>
          <Campo rotulo="Senha"><Entrada type="password" value={f.senha} onChange={set("senha")} autoComplete={precisaSetup ? "new-password" : "current-password"} required /></Campo>
          {precisaSetup && (
            <>
              <Campo rotulo="Repita a senha"><Entrada type="password" value={f.senha2} onChange={set("senha2")} required /></Campo>
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-mute">Tipo do primeiro estoque</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "obra", r: "Obra", i: Building2 },
                    { v: "comercio", r: "Comércio / loja", i: Store },
                  ].map((o) => (
                    <button type="button" key={o.v} onClick={() => setF({ ...f, tipo: o.v })}
                      className={cx("flex items-center justify-center gap-2 rounded-lg border h-11 text-sm font-semibold", f.tipo === o.v ? "border-ink bg-ink text-white" : "border-line bg-white")}>
                      <o.i size={16} />{o.r}
                    </button>
                  ))}
                </div>
              </div>
              <Campo rotulo={f.tipo === "comercio" ? "Nome da loja" : "Nome da obra / estoque"}>
                <Entrada value={f.obra} onChange={set("obra")} placeholder={f.tipo === "comercio" ? "ex.: Loja Centro" : "ex.: Obra Residencial Aurora"} required />
              </Campo>
            </>
          )}
          {erro && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">{erro}</p>}
          <Botao variante="primario" className="w-full" disabled={enviando}>{enviando ? "Aguarde…" : precisaSetup ? "Criar e entrar" : "Entrar"}</Botao>
        </form>
      </section>
    </div>
  );
}
