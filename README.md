# ALMOX — Estoque, vendas e ordens de compra

ALMOX é um sistema de almoxarifado que funciona tanto para **obras de construção** quanto para **comércio/lojas**. Funciona no computador, no tablet e no celular (dá para instalar na tela inicial do celular).

## O que ele faz

- **Obras e lojas**: cada unidade tem seu próprio estoque. O dono escolhe em qual vai trabalhar; a equipe fica presa à sua unidade.
- **Estoque**: cadastro de itens (código, código de barras, categoria, unidade, mínimo, local, fornecedor, custo e preço de venda), alertas de baixo/zerado, exportação CSV.
- **Entrada / Saída / Ajuste**: lançamento de várias linhas de uma vez. **Toda entrada pede o número da nota fiscal** (ou marcar "sem nota"). Saídas registram quem retirou e o destino.
- **Vendas (PDV)**: carrinho, desconto, forma de pagamento, cliente e comprovante para impressão. **Cada venda dá baixa automática no estoque** (e não permite vender mais do que existe). Cancelar uma venda devolve os itens ao estoque.
- **Ordens de compra**: solicitante, data da solicitação, status (pendente, aprovada, atendida, cancelada), data de aprovação, grupo de orçamento, unidade construtiva, código consumo, descrição do item, quantidade e unidade de compra.
- **Histórico**: todas as movimentações com filtros (tipo, período, busca por NF/pessoa/item), impressão e CSV.
- **Equipe**: níveis Dono, Administrador, Almoxarife e Vendedor.

## Tecnologias

- React 19 + Vite + Tailwind CSS 4 (frontend em `src/`)
- Hono rodando como Netlify Server (API em `server/`, entrada em `netlify/server/index.ts`, rotas em `/api/*`)
- Netlify Database (Postgres gerenciado, hospedado na Neon) com Drizzle ORM (`db/schema.ts`)

## Rodando localmente

```bash
npm install
netlify dev --port 8889
```

Abra http://localhost:8889. No primeiro acesso o sistema pede para criar a conta do **dono** e a primeira obra ou loja.

As migrações do banco ficam em `netlify/database/migrations/` e são aplicadas automaticamente pela Netlify a cada deploy. Ao alterar `db/schema.ts`, gere uma nova migração com:

```bash
npx drizzle-kit generate --name descricao_da_mudanca
```

## Próximos passos

Veja [PLAN.md](PLAN.md) para o roteiro de evolução (inventário por contagem, pedidos de material sem login, cadastro de funcionários e setores, backups, uso offline, leitura de código pela câmera e importação de XML da NF-e).
