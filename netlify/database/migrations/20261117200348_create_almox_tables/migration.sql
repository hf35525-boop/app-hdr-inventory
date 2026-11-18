CREATE TABLE "itens" (
	"id" serial PRIMARY KEY,
	"obra_id" integer NOT NULL,
	"codigo" text NOT NULL,
	"codigo_barras" text DEFAULT '' NOT NULL,
	"nome" text NOT NULL,
	"categoria" text DEFAULT '' NOT NULL,
	"unidade" text DEFAULT 'un' NOT NULL,
	"quantidade" double precision DEFAULT 0 NOT NULL,
	"minimo" double precision DEFAULT 0 NOT NULL,
	"local" text DEFAULT '' NOT NULL,
	"fornecedor" text DEFAULT '' NOT NULL,
	"preco_custo" double precision DEFAULT 0 NOT NULL,
	"preco_venda" double precision DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimentos" (
	"id" serial PRIMARY KEY,
	"obra_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"quantidade" double precision NOT NULL,
	"saldo_apos" double precision NOT NULL,
	"nota_fiscal" text DEFAULT '' NOT NULL,
	"fornecedor" text DEFAULT '' NOT NULL,
	"valor_unitario" double precision DEFAULT 0 NOT NULL,
	"retirado_por" text DEFAULT '' NOT NULL,
	"destino" text DEFAULT '' NOT NULL,
	"observacao" text DEFAULT '' NOT NULL,
	"venda_id" integer,
	"usuario_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obras" (
	"id" serial PRIMARY KEY,
	"nome" text NOT NULL,
	"tipo" text DEFAULT 'obra' NOT NULL,
	"endereco" text DEFAULT '' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ordens_compra" (
	"id" serial PRIMARY KEY,
	"obra_id" integer NOT NULL,
	"solicitante" text NOT NULL,
	"data_solicitacao" date NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"data_aprovacao" date,
	"grupo_orcamento" text DEFAULT '' NOT NULL,
	"unidade_construtiva" text DEFAULT '' NOT NULL,
	"codigo_consumo" text DEFAULT '' NOT NULL,
	"descricao_item" text NOT NULL,
	"quantidade" double precision NOT NULL,
	"unidade_compra" text DEFAULT 'un' NOT NULL,
	"observacao" text DEFAULT '' NOT NULL,
	"usuario_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"token" text PRIMARY KEY,
	"usuario_id" integer NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY,
	"nome" text NOT NULL,
	"usuario" text NOT NULL UNIQUE,
	"senha_hash" text NOT NULL,
	"papel" text DEFAULT 'almoxarife' NOT NULL,
	"obra_id" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venda_itens" (
	"id" serial PRIMARY KEY,
	"venda_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"descricao" text NOT NULL,
	"unidade" text DEFAULT 'un' NOT NULL,
	"quantidade" double precision NOT NULL,
	"preco_unitario" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendas" (
	"id" serial PRIMARY KEY,
	"obra_id" integer NOT NULL,
	"cliente" text DEFAULT '' NOT NULL,
	"documento" text DEFAULT '' NOT NULL,
	"forma_pagamento" text DEFAULT 'dinheiro' NOT NULL,
	"subtotal" double precision DEFAULT 0 NOT NULL,
	"desconto" double precision DEFAULT 0 NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'concluida' NOT NULL,
	"observacao" text DEFAULT '' NOT NULL,
	"usuario_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "itens_obra_idx" ON "itens" ("obra_id");--> statement-breakpoint
CREATE INDEX "mov_obra_idx" ON "movimentos" ("obra_id","created_at");--> statement-breakpoint
CREATE INDEX "mov_item_idx" ON "movimentos" ("item_id");--> statement-breakpoint
CREATE INDEX "oc_obra_idx" ON "ordens_compra" ("obra_id");--> statement-breakpoint
CREATE INDEX "vendas_obra_idx" ON "vendas" ("obra_id");--> statement-breakpoint
ALTER TABLE "itens" ADD CONSTRAINT "itens_obra_id_obras_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id");--> statement-breakpoint
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_obra_id_obras_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id");--> statement-breakpoint
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_item_id_itens_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id");--> statement-breakpoint
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_venda_id_vendas_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id");--> statement-breakpoint
ALTER TABLE "movimentos" ADD CONSTRAINT "movimentos_usuario_id_usuarios_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id");--> statement-breakpoint
ALTER TABLE "ordens_compra" ADD CONSTRAINT "ordens_compra_obra_id_obras_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id");--> statement-breakpoint
ALTER TABLE "ordens_compra" ADD CONSTRAINT "ordens_compra_usuario_id_usuarios_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id");--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_obra_id_obras_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id");--> statement-breakpoint
ALTER TABLE "venda_itens" ADD CONSTRAINT "venda_itens_venda_id_vendas_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "venda_itens" ADD CONSTRAINT "venda_itens_item_id_itens_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id");--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_obra_id_obras_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id");--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_usuario_id_usuarios_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id");