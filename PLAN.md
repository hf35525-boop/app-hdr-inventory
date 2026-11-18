# Roteiro do ALMOX

## Marco 1 — Núcleo do sistema ✅
Login com níveis de acesso, obras e lojas, estoque, entradas com nota fiscal, saídas, ajustes,
vendas com baixa automática, ordens de compra, histórico e painel — no computador e no celular.

## Marco 2 — Inventário por contagem
Abrir um inventário, contar item a item (também pelo código), ver divergências e finalizar
ajustando o estoque com um único lançamento de "ajuste".

## Marco 3 — Funcionários e setores
Cadastro de funcionários (matrícula, cargo, setor) e setores/frentes de serviço, para escolher
"retirado por" e "destino" de uma lista em vez de digitar.

## Marco 4 — Pedidos de material sem login
Link público por obra para o funcionário pedir material com a matrícula; fila de solicitações
para o almoxarife aprovar/recusar, com protocolo para acompanhamento. Aprovar gera a saída.

## Marco 5 — Ordem de compra → entrada
Ao marcar uma ordem como atendida, oferecer "dar entrada no estoque" já preenchendo item,
quantidade e pedindo o nº da nota fiscal. Agrupar várias linhas em uma mesma ordem.

## Marco 6 — Nota fiscal eletrônica
Importar o XML da NF-e para lançar a entrada automaticamente (fornecedor, itens, quantidades
e valores) e guardar o arquivo da nota (Netlify Blobs).

## Marco 7 — Uso em campo
Leitura de código de barras/QR pela câmera do celular, fila offline (lançar sem internet e
sincronizar depois) e instalação como aplicativo (PWA com service worker).

## Marco 8 — Relatórios e segurança
Relatórios em PDF (posição de estoque, vendas por período, curva ABC, consumo por obra),
backups/exportação completa e restauração, registro de atividade por usuário, personalização
de marca (nome, logo, cor).
