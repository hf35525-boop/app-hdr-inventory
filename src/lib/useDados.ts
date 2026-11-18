import { useCallback, useEffect, useState } from "react";
import { api, msgErro } from "./api";

/** Carrega um recurso da API e expõe recarregar(). */
export function useDados<T>(caminho: string | null, inicial: T) {
  const [dados, setDados] = useState<T>(inicial);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const recarregar = useCallback(async () => {
    if (!caminho) return;
    setCarregando(true);
    try {
      setDados(await api<T>(caminho));
      setErro(null);
    } catch (e) {
      setErro(msgErro(e));
    } finally {
      setCarregando(false);
    }
  }, [caminho]);
  useEffect(() => {
    recarregar();
  }, [recarregar]);
  return { dados, setDados, carregando, erro, recarregar };
}
