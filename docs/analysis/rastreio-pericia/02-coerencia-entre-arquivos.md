# Rastreio de `docs/pericia/02-coerencia-entre-arquivos.md`

Índice técnico do que saiu do texto do tópico 2 quando o relatório passou a ser independente do processo (pedido do André, 30/10/2026). **Este arquivo não entra no relatório.** Nenhum número, rótulo ou conclusão mudou.

No texto do relatório, "revisão independente" quer dizer o agente `cetico-revisor`. Pareceres usados neste tópico:

- [parecer 08](../cetico-revisor/08-votos-sem-log-contingencia.md): primeira contagem de votos sem diário (50 votos), sustentado com ressalvas; traz a estimativa de raridade da BA 0235 e a estimativa de capturas pelo tamanho do arquivo de digitais.
- [parecer 10](../cetico-revisor/10-a7-comparecimento-alto-sem-digital.md): comparecimento alto, sustentado com ressalvas; traz o modelo de seções esperadas com 95%+ e a estimativa sobre as 23 seções.
- [parecer 24](../cetico-revisor/24-integridade-h04-h11.md): identificação da urna e dos cartões (itens 5 a 9 e 15 a 19).
- [parecer 25](../cetico-revisor/25-votos-sem-log-reconciliacao.md): reconciliação dos votos sem a linha "computado", dois turnos (inclui a seção "Bugs de leitura").
- [parecer 26](../cetico-revisor/26-h03-1turno-todos-cargos.md): números de candidato ausentes do resultado por município, 1º turno.

Documentos de análise de origem: [`coerencia-contagem/03`](../coerencia-contagem/03-coerencia-interna.md) (C1 a C6, inclusive o 1º turno parcial), [`coerencia-contagem/04`](../coerencia-contagem/04-a7-comparecimento-alto.md) (comparecimento alto), [`integridade-nacional/03`](../integridade-nacional/03-seriais-h11.md) (seriais, conta do acaso) e [`integridade-nacional/04`](../integridade-nacional/04-coerencia-identificadores.md) (demais conferências de identificação).

## Resposta curta

- "(revisado pelo cético)" → "(com revisão independente)": comparecimento > aptos, parecer 10.
- "revisado pelo cético no parecer 25" → "com revisão independente": parecer 25.
- "revisado pelo cético no parecer 24" → "com revisão independente": parecer 24.
- "o resultado parcial está em `docs/analysis/coerencia-contagem/`" → "por ser parcial, o resultado não entra neste relatório": [`coerencia-contagem/03`](../coerencia-contagem/03-coerencia-interna.md).
- "feita no país inteiro pelo revisor" e "(parecer 26)": pareceres 25 e 26.

## Como foi feito

Texto retirado:

> Fonte: `docs/analysis/coerencia-contagem/03-coerencia-interna.md`, script `scripts/auditoria/contagem-coerencia.mjs`. Todos os números desta página foram refeitos de forma independente, do banco e dos arquivos brutos, pelos scripts `scripts/auditoria/verifica-pericia-coerencia*.mjs` (ver "Como repetir"), ou vêm de parecer do revisor cético que os sustenta.

> Fonte: `docs/analysis/coerencia-contagem/04-a7-comparecimento-alto.md`, revisada pelo cético em `docs/analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md`.

- "a partir dos arquivos originais das urnas" resume "do banco e dos arquivos brutos" (o banco é a cópia de leitura do SQLite montada a partir dos arquivos das urnas).

## O que foi encontrado: 2º turno

- Saída do autor: `data/parsed/auditoria/contagem/coerencia-2t.txt`; números refeitos com `scripts/auditoria/verifica-pericia-coerencia.mjs --turno 2`.
- Linha "Comparecimento > aptos (revisado pelo cético)": parecer 10.

### As 10 seções em que o diário não bateu de primeira

- Recontagem no arquivo bruto: `scripts/auditoria/contagem-log-pacote.mjs`, refeita por `scripts/auditoria/verifica-pericia-coerencia-logs.mjs`.
- "Fato (revisado pelo cético)" (11.748 seções com mais de um diário): `contagem-log-pacote.mjs --multiplos` e parecer 25.
- "O cético cruzou também o boletim com o diário nas 499.178 seções (parecer 25)" → "A revisão independente cruzou...".
- "O eleitor identificado já votou" nas 3 seções: parecer 25.

### Votos do boletim sem rastro completo no diário (dois turnos)

- Rótulo retirado: "revisado pelo cético no parecer 25, que reconcilia as três contagens anteriores e o parecer 08".
- "(parecer 25, 'Bugs de leitura')": seção "Bugs de leitura" do parecer 25.
- Rótulos "(Fato, parecer 25)" em: Seção a seção; Como o diário se perdeu; Assinaturas; Como esses eleitores foram liberados; e o parágrafo "Nos dois turnos, nenhuma outra seção".
- Scripts: `scripts/auditoria/cetico-vsr25-universo.mjs`, `cetico-vsr25-bruto.mjs`, `cetico-vsr25-lacres.mjs` (comandos abaixo).
- BA 0235, liberação: "A estimativa do cético está em `docs/analysis/cetico-revisor/08-votos-sem-log-contingencia.md`" → "A estimativa feita até aqui é estatística e fica fora deste relatório": parecer 08.
- "Hipótese (risco, princípio 8, parecer 25)" → "Hipótese (risco, princípio 8)": parecer 25. O princípio 8 é o de [`docs/01-premissas.md`](../../01-premissas.md), agora explicado no README do relatório.
- Número de capturas estimado pelo tamanho do arquivo: parecer 08.

## O que foi encontrado: 1º turno (parcial)

- Números parciais: [`coerencia-contagem/03`](../coerencia-contagem/03-coerencia-interna.md).
- "A cópia de leitura de 29/10/2026 (10h50 UTC)" → "a base de dados desta perícia" (cópia de leitura do banco SQLite, de 29/10/2026, 10h50 UTC).

### Números de candidato que faltam no resultado por município

- Rótulo retirado: parecer 26.
- "O arquivo oficial por candidato, município e zona (`votacao_candidato_munzona`)" → "O arquivo oficial do TSE com a votação por candidato, município e zona": arquivo `votacao_candidato_munzona` dos dados abertos do TSE.
- "no `consulta_cand_2026`" → "no cadastro oficial de candidaturas publicado pelo TSE": arquivo `consulta_cand_2026`.
- Scripts: `scripts/auditoria/contagem-munzona.mjs --turno 1`; verificação `verifica-pericia-coerencia-munzona.mjs`.

## Comparecimento alto

- Título: "(revisado pelo cético)" → "(com revisão independente)": parecer 10.
- "Fonte: [...] veredito 'sustentado com ressalvas'": parecer 10.
- Três referências a `docs/analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md` (número esperado de seções com 95%+; comparação com a taxa da zona e limite de votos no lugar de ausentes) → "fica(m) fora deste relatório".
- "na estimativa do cético" → "na estimativa da revisão independente": parecer 10.
- Script: `scripts/auditoria/contagem-a7.mjs --turno 2`.

## Identificação da urna e dos cartões (dois turnos)

- Fontes retiradas: integridade-nacional/03 e 04, parecer 24 (itens 5 a 9 e 15 a 19).
- Número da urna (boletim × pacote × carteira): parecer 24, item 9.
- Demais conferências (cartão, modelo, mídia e código de carga), Pendente: [`integridade-nacional/04`](../integridade-nacional/04-coerencia-identificadores.md).
- Recuperador de Dados: parecer 24, itens 8 e 15. Lista das 17 seções: `data/parsed/auditoria/cetico/integridade-casos.json` → `B`, de `scripts/auditoria/cetico-integridade-casos.mjs`.
- Cartão, urna e código de carga repetidos: parecer 24, item 5; conta do acaso em [`integridade-nacional/03`](../integridade-nacional/03-seriais-h11.md).
- Lista dos 29 pares: [`docs/pericia/graficos/dados/seriais-cartao-votacao-pares-2t-lista.csv`](../../pericia/graficos/dados/seriais-cartao-votacao-pares-2t-lista.csv); dados do gráfico: [`seriais-cartao-votacao-pares.csv`](../../pericia/graficos/dados/seriais-cartao-votacao-pares.csv).
- Mídia de resultado: parecer 24, item 6 (Fato e Hipótese).
- A mesma urna em duas seções: parecer 24, item 7.
- Troca de urna e carga no dia: parecer 24, itens 16, 17 e 19. Tabela por modelo: `scripts/auditoria/cetico-integridade-trocas-modelo.mjs`. Dados do gráfico: [`troca-urna-por-modelo.csv`](../../pericia/graficos/dados/troca-urna-por-modelo.csv).
- "duas formas de cálculo do revisor" (Aracaju): parecer 24.

## Prova de que o teste funciona (contraprova)

- "Fato (parecer 25). A recontagem do revisor" → "A recontagem da revisão independente": parecer 25.
- "Fato (parecer 24)" e "(parecer 24, item 7)": parecer 24.

## Limites

- Limite 2: "o cético conferiu as assinaturas (0 falha; pareceres 08 e 25)" → "as assinaturas foram conferidas na revisão independente (0 falha)": pareceres 08 e 25.
- Limite 4: "(parecer 25)".
- Limite 5: "A conferência independente do matemático forense [...] (`docs/analysis/matematico-forense/01-catalogo.md`, itens I1 a I3 e I10 a I12)" → "Uma segunda conferência independente da corrente de elos [...]": [`matematico-forense/01-catalogo.md`](../matematico-forense/01-catalogo.md), itens I1 a I3 e I10 a I12.

## Como repetir (seção retirada, texto integral)

```
node scripts/auditoria/contagem-coerencia.mjs --turno 2             # C1 a C6, 2º turno
node scripts/auditoria/contagem-log-pacote.mjs --turno 2            # recontagem diário a diário das seções do C2
node scripts/auditoria/contagem-log-pacote.mjs --turno 2 --multiplos --parte 1/2   # e 2/2: todas as seções com 2+ diários
node scripts/auditoria/contagem-munzona.mjs --turno 1               # números ausentes do resultado por município
node scripts/auditoria/contagem-a7.mjs --turno 2                    # comparecimento × aptos

# verificação independente desta página (cópia de leitura do banco e arquivos brutos)
node scripts/auditoria/verifica-pericia-coerencia.mjs --turno 2
node scripts/auditoria/verifica-pericia-coerencia.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt
node scripts/auditoria/verifica-pericia-coerencia-logs.mjs --turno 2 ma/08893/0047/0609 ba/35653/0173/0235 rs/89060/0017/0191   # e as outras 7
node scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt
node scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 2
node scripts/auditoria/verifica-pericia-coerencia-secao.mjs --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt
node scripts/auditoria/verifica-pericia-coerencia-zz.mjs            # seções não instaladas e do Sistema de Apuração no oficial

# votos do boletim sem rastro no diário, dois turnos (parecer 25; cada turno ~30 min com 2 processos)
node scripts/auditoria/cetico-vsr25-universo.mjs --turno 2 --procs 2
node scripts/auditoria/cetico-vsr25-universo.mjs --turno 1 --procs 2
node scripts/auditoria/cetico-vsr25-bruto.mjs --turno 1 --secao ba/39934/0183/0175 --secao sp/71072/0002/0035 --secao rs/89036/0083/0044
node scripts/auditoria/cetico-vsr25-bruto.mjs --turno 2 --secao ma/08893/0047/0609 --secao ba/35653/0173/0235 --secao rs/89060/0017/0191
node scripts/auditoria/cetico-vsr25-lacres.mjs                      # assinaturas das 5 seções sem nenhuma linha

# identificação da urna e dos cartões (dependem da varredura de lacres do tópico 1)
node scripts/auditoria/integridade-resumo.mjs --turno 2
node scripts/auditoria/integridade-resumo.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores
node scripts/auditoria/integridade-casos-especiais.mjs --turno 2    # Recuperador de Dados, mídia de resultado
node scripts/auditoria/integridade-entre-turnos.mjs                 # trocas de urna e cartões entre os turnos
node scripts/auditoria/integridade-urnas-reaproveitadas.mjs --turno 2
node scripts/auditoria/integridade-sobreposicao-bruto.mjs --turno 2 # os 92 períodos cruzados, no diário original
node scripts/auditoria/seguranca-caminhos-fora-fluxo.mjs --turno 2  # Recuperador de Dados e urna reserva
node scripts/auditoria/seguranca-carga-no-dia.mjs --turno 2         # carga no dia da votação

# revisão cética (parecer 24)
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 2
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores
node scripts/auditoria/cetico-integridade-casos.mjs
node scripts/auditoria/cetico-integridade-log-urna.mjs --turno 2 --secao se/32417/0022/0039 --urna 02286264
node scripts/auditoria/cetico-integridade-trocas-modelo.mjs         # troca de urna por modelo

# tabelas e gráficos (só leem as saídas acima e conferem as somas)
node scripts/auditoria/grafico-integridade-dados.mjs
node scripts/auditoria/grafico-integridade.mjs
```

Saídas do autor em `data/parsed/auditoria/contagem/` (`coerencia-*`, `log-pacote-*`, `munzona-*`, `a7-*`), em `data/parsed/auditoria/integridade/` e, do revisor, em `data/parsed/auditoria/cetico/`.

## Próximos passos

- "[x] Revisão cética dos 50 votos sem diário (`cetico-revisor/08`, sustentado com ressalvas)": parecer 08.
- "[x] Reconciliação [...] (parecer 25)": parecer 25.
- "[x] Revisão cética dos números de candidato ausentes [...] (parecer 26)": parecer 26.
- "(o `consulta_cand_2026` traz '#NE' na situação)" → "(o cadastro oficial de candidaturas [...])".
- "(os dados das 28 UFs já estão na cópia de leitura de 29/10/2026). O C2 do 1º turno já foi feito no país inteiro (parecer 25)": cópia de leitura do banco; parecer 25.
- "[x] Identificação da urna e dos cartões nos dois turnos, com revisão cética (parecer 24)": parecer 24.
