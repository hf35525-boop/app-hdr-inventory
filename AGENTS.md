# AGENTS.md — guia para futuras sessões

ALMOX é um sistema de almoxarifado/estoque com vendas (PDV) e ordens de compra, para obras de
construção e para comércio. Interface e código em **português (pt-BR)**. Continue a partir do
roteiro em [PLAN.md](PLAN.md).

## Arquitetura
- **Frontend**: SPA React 19 + Vite + Tailwind 4 em `src/`. Publicado em `dist/`.
  Navegação por hash (`#/estoque`, `#/vendas`…) em `src/App.tsx` — por isso não há regra de
  rewrite `/* /index.html` (ela roubaria as requisições do servidor).
- **API**: Hono exportado como Netlify Server (`netlify/server/index.ts` → `server/app.ts`),
  atendendo apenas `/api/*`. Não crie endpoints em `netlify/functions/` (use funções só para
  agendamentos/eventos).
- **Banco**: Netlify Database (Postgres/Neon) via Drizzle (`drizzle-orm@beta`, `drizzle-orm/netlify-db`).
  Esquema em `db/schema.ts`; migrações geradas com `npx drizzle-kit generate --name ...` em
  `netlify/database/migrations/` (nunca editar migrações já aplicadas; nunca rodar migrate/push).

## Pastas
- `server/auth.ts` — hash de senha (scrypt), sessões com token Bearer (tabela `sessoes`, 30 dias),
  middlewares `exigeLogin`, `exigeObra` (unidade atual: header `X-Obra` para o dono, `usuarios.obra_id`
  para os demais) e `exigePapel`.
- `server/estoque.ts` — `lancar()`: **única** forma de mudar saldo. Atualiza `itens.quantidade`
  atomicamente e grava `movimentos`. Saída/venda falham com 409 se não houver saldo.
- `server/app.ts` — todas as rotas (auth, obras, usuarios, itens, movimentos, vendas, ordens, painel).
- `src/lib/` — `api.ts` (fetch com token/obra), `sessao.tsx` (contexto de login e unidade, `useTermos`
  para vocabulário obra x comércio), `tipos.ts`, `fmt.ts` (moeda, datas, CSV), `useDados.ts`.
- `src/components/ui.tsx` — componentes base (Botao, Campo, Entrada, Janela, Selo, Kpi, avisos).
- `src/screens/` — uma tela por arquivo.

## Regras e decisões
- Vendas: `POST /api/vendas` grava venda + linhas e chama `lancar(tipo "venda")` para cada linha na
  mesma transação. Cancelar gera movimentos `estorno`.
- Entradas exigem `notaFiscal` ou `semNota: true`. O custo informado na entrada atualiza `preco_custo`.
- `movimentos.quantidade` é positiva para entrada/saída/venda/estorno; para `ajuste` é a diferença (pode ser negativa).
- Ordens de compra: ao ir para `aprovada`/`atendida` sem data, `data_aprovacao` vira hoje.
- Papéis: `dono` (tudo, todas as unidades), `admin` (gestão da sua unidade + equipe), `almoxarife`, `vendedor`.
- Fuso usado em filtros de data: -03:00 (Brasília).
- Visual: "industrial" — papel `#f3f1ec`, tinta `#16181d`, amarelo de sinalização `#ffc21a`, faixa zebrada.
