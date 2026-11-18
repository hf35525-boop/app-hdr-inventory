const TOKEN = "almox:token";
const OBRA = "almox:obra";

export const armazenamento = {
  token: () => localStorage.getItem(TOKEN),
  setToken: (t: string | null) => (t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN)),
  obra: () => localStorage.getItem(OBRA),
  setObra: (id: number | null) => (id ? localStorage.setItem(OBRA, String(id)) : localStorage.removeItem(OBRA)),
};

export class ErroApi extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

let aoExpirar: (() => void) | null = null;
export const definirAoExpirar = (fn: () => void) => (aoExpirar = fn);

export async function api<T = any>(caminho: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = armazenamento.token();
  if (token) headers.Authorization = `Bearer ${token}`;
  const obra = armazenamento.obra();
  if (obra) headers["X-Obra"] = obra;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  let r: Response;
  try {
    r = await fetch(`/api${caminho}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ErroApi(0, "Sem conexão com o servidor.");
  }
  const dados = await r.json().catch(() => null);
  if (!r.ok) {
    if (r.status === 401 && token && !caminho.startsWith("/auth/login")) aoExpirar?.();
    throw new ErroApi(r.status, dados?.erro ?? `Erro ${r.status}`);
  }
  return dados as T;
}

export const msgErro = (e: unknown) => (e instanceof Error ? e.message : "Algo deu errado.");
