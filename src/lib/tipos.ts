export type Papel = "dono" | "admin" | "almoxarife" | "vendedor";
export type TipoObra = "obra" | "comercio";

export interface Usuario { id: number; nome: string; usuario: string; papel: Papel; obraId: number | null; ativo: boolean }
export interface Obra { id: number; nome: string; tipo: TipoObra; endereco: string; ativo: boolean }
export interface Item {
  id: number; codigo: string; codigoBarras: string; nome: string; categoria: string; unidade: string;
  quantidade: number; minimo: number; local: string; fornecedor: string; precoCusto: number; precoVenda: number;
}
export type TipoMov = "entrada" | "saida" | "venda" | "estorno" | "ajuste";
export interface Movimento {
  id: number; itemId: number; tipo: TipoMov; quantidade: number; saldoApos: number; notaFiscal: string;
  fornecedor: string; valorUnitario: number; retiradoPor: string; destino: string; observacao: string;
  vendaId: number | null; createdAt: string; itemNome: string; itemCodigo?: string; unidade: string; usuarioNome?: string | null;
}
export interface Venda {
  id: number; cliente: string; documento: string; formaPagamento: string; subtotal: number; desconto: number;
  total: number; status: "concluida" | "cancelada"; observacao: string; createdAt: string; vendedor?: string | null; qtdItens?: number;
  linhas?: { id: number; itemId: number; descricao: string; unidade: string; quantidade: number; precoUnitario: number; total: number }[];
}
export type StatusOC = "pendente" | "aprovada" | "atendida" | "cancelada";
export interface OrdemCompra {
  id: number; solicitante: string; dataSolicitacao: string; status: StatusOC; dataAprovacao: string | null;
  grupoOrcamento: string; unidadeConstrutiva: string; codigoConsumo: string; descricaoItem: string;
  quantidade: number; unidadeCompra: string; observacao: string; criadoPor?: string | null; createdAt: string;
}

export const UNIDADES = ["un", "cx", "pct", "m", "m²", "m³", "kg", "t", "L", "par", "sc", "rl", "gl", "pç", "barra"];
export const CATEGORIAS_OBRA = ["EPI", "Elétrica", "Hidráulica", "Alvenaria", "Acabamento", "Ferramentas", "Fixação", "Escritório", "Limpeza"];
export const CATEGORIAS_COMERCIO = ["Mercadoria", "Bebidas", "Alimentos", "Limpeza", "Higiene", "Ferragens", "Utilidades", "Eletrônicos"];
export const FORMAS_PAGAMENTO: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "Pix", debito: "Cartão de débito", credito: "Cartão de crédito", boleto: "Boleto", prazo: "A prazo",
};
export const PAPEIS: Record<Papel, string> = { dono: "Dono", admin: "Administrador", almoxarife: "Almoxarife", vendedor: "Vendedor" };
