import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, armazenamento, definirAoExpirar } from "./api";
import type { Obra, Usuario } from "./tipos";

interface Sessao {
  usuario: Usuario | null;
  carregando: boolean;
  precisaSetup: boolean;
  obras: Obra[];
  obra: Obra | null;
  ehDono: boolean;
  ehGestor: boolean;
  escolherObra: (id: number | null) => void;
  recarregarObras: () => Promise<void>;
  entrar: (usuario: string, senha: string) => Promise<void>;
  configurar: (d: { nome: string; usuario: string; senha: string; obra: string; tipo: string }) => Promise<void>;
  sair: () => Promise<void>;
}

const Ctx = createContext<Sessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [precisaSetup, setPrecisaSetup] = useState(false);
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState<number | null>(() => Number(armazenamento.obra()) || null);

  const limpar = useCallback(() => {
    armazenamento.setToken(null);
    setUsuario(null);
    setObras([]);
  }, []);

  const recarregarObras = useCallback(async () => {
    const lista = await api<Obra[]>("/obras");
    setObras(lista);
  }, []);

  const iniciar = useCallback(async (u: Usuario) => {
    setUsuario(u);
    const lista = await api<Obra[]>("/obras");
    setObras(lista);
    if (u.papel !== "dono") {
      armazenamento.setObra(u.obraId);
      setObraId(u.obraId);
    } else {
      const salvo = Number(armazenamento.obra());
      const ativas = lista.filter((o) => o.ativo);
      const escolhida = ativas.find((o) => o.id === salvo) ?? (ativas.length === 1 ? ativas[0] : null);
      armazenamento.setObra(escolhida?.id ?? null);
      setObraId(escolhida?.id ?? null);
    }
  }, []);

  useEffect(() => {
    definirAoExpirar(limpar);
    (async () => {
      try {
        const est = await api<{ precisaSetup: boolean }>("/auth/estado");
        setPrecisaSetup(est.precisaSetup);
        if (armazenamento.token() && !est.precisaSetup) await iniciar(await api<Usuario>("/auth/eu"));
      } catch {
        /* sem sessão */
      } finally {
        setCarregando(false);
      }
    })();
  }, [iniciar, limpar]);

  const valor = useMemo<Sessao>(() => ({
    usuario,
    carregando,
    precisaSetup,
    obras,
    obra: obras.find((o) => o.id === obraId) ?? null,
    ehDono: usuario?.papel === "dono",
    ehGestor: usuario?.papel === "dono" || usuario?.papel === "admin",
    escolherObra: (id) => {
      armazenamento.setObra(id);
      setObraId(id);
    },
    recarregarObras,
    async entrar(u, s) {
      const r = await api<{ token: string; usuario: Usuario }>("/auth/login", { body: { usuario: u, senha: s } });
      armazenamento.setToken(r.token);
      await iniciar(r.usuario);
    },
    async configurar(d) {
      const r = await api<{ token: string; usuario: Usuario }>("/auth/setup", { body: d });
      armazenamento.setToken(r.token);
      setPrecisaSetup(false);
      await iniciar(r.usuario);
    },
    async sair() {
      await api("/auth/logout", { method: "POST" }).catch(() => {});
      limpar();
    },
  }), [usuario, carregando, precisaSetup, obras, obraId, recarregarObras, iniciar, limpar]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSessao() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSessao fora do SessaoProvider");
  return s;
}

/** Vocabulário que muda conforme o tipo da unidade (obra de construção x comércio). */
export function useTermos() {
  const { obra } = useSessao();
  const comercio = obra?.tipo === "comercio";
  return {
    comercio,
    unidade: comercio ? "Loja" : "Obra",
    destino: comercio ? "Destino / motivo" : "Destino / setor / frente",
    retirado: comercio ? "Responsável" : "Retirado por (funcionário)",
  };
}
