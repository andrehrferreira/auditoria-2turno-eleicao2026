# Auditoria independente: eleições gerais de 2026 (1º e 2º turno)

Auditoria dos arquivos públicos das urnas eletrônicas (BU, RDV, log e assinaturas) publicados pelo TSE para as eleições de 2026, com métodos reproduzíveis. Premissas, fontes e achados ficam em [docs/](docs/README.md), e cada afirmação leva o rótulo **Fato**, **Hipótese** ou **Recomendação**.

Trabalhos anteriores: [2º turno 2022](https://github.com/andrehrferreira/auditoria-2turno-eleicao2022) · [1º turno 2024](https://github.com/andrehrferreira/auditoria-1turno-eleicoes-2024).

## Andamento

Atualizado em 29/10/2026, 07:40. O painel `coleta-tse` do Claude Code lê esta tabela: mantenha o formato e os marcadores.

<!-- andamento:inicio -->
| Fase | Etapa | Status | Detalhe |
|---|---|---|---|
| 1. Coleta | Arquivos de urna do 2º turno | concluída | 499.248/499.248 seções (499.207 completas + 41 não instaladas); 17.931/17.931 agregadas |
| 1. Coleta | Arquivos de urna do 1º turno | concluída | 499.248/499.248 seções (499.207 completas + 41 não instaladas); 17.931/17.931 agregadas |
| 1. Coleta | aux.json do 2º turno (status oficial por seção) | em andamento | 65% (326 mil de 499 mil), 20/s, sem bloqueio do TSE |
| 1. Coleta | aux.json do 1º turno | pendente | Começa depois do aux do 2º turno |
| 1. Coleta | Dados abertos (resultado oficial, perfil do eleitorado, comparecimento por idade, candidaturas, 2018 e 2022) | concluída | data/raw/dadosabertos |
| 1. Coleta | Candidatos e municípios (referência) | concluída | 1º e 2º turno |
| 2. Leitura | Decodificador pela especificação oficial (BU, RDV, imgbu, vsc) | concluída | src/asn1.js + src/esquemas.js |
| 2. Leitura | Conversor de seção para JSON legível | concluída | src/exportar.js, sob demanda |
| 2. Leitura | Banco SQLite para consultas | concluída | 1º e 2º turno: 28/28 UFs, 499.248 seções cada, 0 erro de carga; resultado oficial carregado |
| 2. Leitura | Cópia de leitura com índices analíticos | em andamento | Recarga do perfil de AM/BA (1º turno) e publicação da cópia com índices (doc 09) |
| 2. Leitura | Perfil por seção (métricas de log e BU) | concluída | 1º e 2º turno: 28/28 UFs; regeneração de BA, ES, MG e SP com deduplicação de log pendente (sessão -64) |
| 3. Integridade | Assinaturas e hashes no país inteiro (H04) | em andamento | Auditor E rodando; AC, ES e ZZ: 0 falha; 3 seções de contingência exigem corte de 1 byte no certificado (defeito de leitura) |
| 3. Integridade | Cadeia de evidências da perícia | em andamento | docs/pericia/evidencias |
| 4. Análises | A1/B2: soma dos BUs × resultado oficial (H03) | em andamento | 2º turno: igual em todos os cargos e campos, seção a seção. 1º turno: votos de candidaturas excluídas viraram nulo técnico (RJ governador: decidiu o 1º turno); refazer com 28 UFs |
| 4. Análises | Coerência BU × RDV × log | concluída | 2º turno: 3 seções com 50 votos sem log; mecanismo encontrado (erro 72 na contingência); risco aberto em 13 votos na BA |
| 4. Análises | B5/H10: crescimento entre turnos | concluída | H10 refutada como escrita (parecer 05); linha de base 2018/2022 |
| 4. Análises | C2/H01: títulos de falecidos | em andamento | Cadastro: ≥148.553 títulos 100+ sem pessoa; uso no 1º turno: 0,72% (oficial); mínimo de 157 votos 100+ sem biometria; 2º turno: arquivo oficial ainda sem dados |
| 4. Análises | A5/B1/H02/H05: liberação sem biometria e mesários | em andamento | 16 mil seções explicadas por "foto sem digital"; Auditor B rodando |
| 4. Análises | H13: liberados sem biometria votaram no 13, sobretudo no Nordeste? | em andamento | 5 métodos + revisão cética rodando |
| 4. Análises | A2/B3/H06: votos após 17h e encerramento às 19h | em andamento | 34.330 / 34.066 votos após 17h (duas contas); em revisão cética |
| 4. Análises | A10/H08: sequências impossíveis | em andamento | Nenhuma encontrada; em revisão cética |
| 4. Análises | A3/A4 e forense estatística | em andamento | Sem marca clássica de fraude em larga escala; em revisão cética (poder do teste) |
| 4. Análises | Aumento de comparecimento entre turnos | em andamento | Estatístico rodando |
| 4. Análises | A8, A12/H11, A13, B4 | em andamento | Integridade, segurança, matemático e biometria ainda trabalhando |
| 5. Relatório | Perícia em linguagem simples | em andamento | Tópicos 00, 01, 05, 06 e 08 escritos; 02, 03, 04, 07, 09 e 10 em verificação "só dados 100% corretos" |
<!-- andamento:fim -->

## Hipóteses em análise

<!-- hipoteses:inicio -->
Retrato de 29/10/2026. Gerado por `python scripts/relatorios/hipoteses.py` a partir de [docs/relatorios/hipoteses-em-teste.json](docs/relatorios/hipoteses-em-teste.json); relatório completo em [PDF](docs/relatorios/hipoteses-em-teste.pdf). Os números vêm do relatório de perícia (universo completo, conferidos); o registro com toda a evidência está em [docs/hipoteses.md](docs/hipoteses.md) e o quadro em linguagem simples em [docs/pericia/10](docs/pericia/10-quadro-das-hipoteses.md).

| # | Suspeita | Status | O que já se sabe | Próximo teste |
|---|---|---|---|---|
| H01 | Votos dados com títulos de pessoas que já morreram | em teste | ≥ 148.553 títulos de 100+ sem pessoa no Censo; 1º turno: 0,72% dos 100+ votaram (TSE) | Comparecimento por idade no 2º turno e óbitos por município (LAI); diários dos municípios destacados |
| H02 | Seções com quantidade fora do normal de eleitores liberados sem digital | aberta | 16.011 seções com excesso sobre o cadastro (36.340 eleitores); nas 378 maiores, a foto sem digital explica quase tudo | Marca da foto nas 16.011 seções; 1º turno completo; digitais carregadas por seção (LAI) |
| H03 | A soma das urnas é diferente do resultado oficial | em teste | Presidente igual ao oficial nas 499.205 (2º t.) e 499.206 (1º t.) seções; 50 votos sem rastro no diário em 3 seções | Demais cargos; tabela final dos votos sem rastro no diário (revisão cética 20 e 25) |
| H04 | Arquivos publicados alterados, ou gerados fora de uma urna oficial | em teste | Hashes de 1.996.828 arquivos por turno, 0 falhas; assinaturas 0 falhas no AC e em 2 seções do ES | Assinaturas no país inteiro; diário corrompido no RJ; versão do programa (revisão cética 21 e 24) |
| H05 | Mesários liberando outras pessoas no lugar de eleitores da seção, sem digital | aberta | 113.979 avisos "já votou" em 73.246 seções; 601.543 do aumento de comparecimento entraram sem digital | Rajadas e consultas no país inteiro; teste com as 28 UFs; inspeção das 97 seções de liberação em massa |
| H06 | A prorrogação do horário de votação favoreceu um lado | em teste | 34.330 votos após 17h de Brasília (0,027%), menos de 1% da margem | Decisão assinada e ofício do TSE; diferença de voto das seções tardias; votos após "todos votaram" |
| H07 | Urnas antigas colocadas de propósito onde se quer dispensar a digital | **refutada** | Todo modelo lê digital (UE2013: 82,2% pela digital); a urna antiga libera mais à mão | Alocação das urnas antigas; trocas de urna por zona |
| H08 | Votos em sequência rápida demais para uma pessoa | aberta | Menor intervalo entre dois votos no país: 16 segundos | Ciclo completo de eleitor em todos os votos, com os perfis refeitos |
| H09 | Os arquivos públicos permitem descobrir em quem uma pessoa votou | aberta | Sete arquivos gerados pela urna não são publicados | Ordem do registro dos votos no país inteiro; seções pequenas |
| H10 | O vencedor cresceu do 1º para o 2º turno mais do que havia de votos disponíveis | **refutada** | A conta fecha em todos os municípios (identidade contábil: não absolve) | Queda de brancos e nulos seção a seção; linha de base de eleições anteriores |
| H11 | O mesmo cartão de memória usado em mais de uma urna, ou resultado trocado no caminho | em teste | Acre: nenhuma mídia ou urna repetida | Números de série no país; trocas de urna e cargas no dia (revisão cética 24) |
| H12 | O QR do título digital (e-Título) entrega os dados usados para liberar sem digital, e pode ser forjado | aberta | — | Ler o QR em vários e-Títulos e testar o validador do TSE |
| H13 | Os eleitores liberados sem digital votaram majoritariamente no 13, sobretudo no Nordeste | em teste | Nordeste: 3,41% a 99,93% dos 4,27 mi liberados podem ter votado no 13; o pior caso no Brasil inteiro inverteria o resultado; virada igual em todas as faixas | Conta com a liberação do diário; seções de CE, PB e PE; revisão cética da virada (parecer 23) |

Na fila, ainda sem número de hipótese: queda de brancos e nulos entre os turnos; urnas carregadas no dia da votação e trocas de urna; votos sem rastro no diário no 1º turno; demais cargos; linha de base de eleições anteriores.
<!-- hipoteses:fim -->

## Números do 2º turno (Fatos)

- **499.248** seções com urna, **17.931** agregadas, **41** não instaladas (exterior), **29** apuradas pelo Sistema de Apuração (exterior).
- Todos os arquivos conferidos pelo hash do manifesto (`vota.vsc`) e pelo SHA-512 de cada arquivo. Um `log.jez` faltava no zip de SP e foi baixado por seção (confere com o `vota.vsc`).
- Seções "Recebida" no site de resultados (em vez de "Totalizada"), **parcial**: 5.270 até agora, em 10 UFs (faltam SP e TO no retrato do aux.json), com datas de 25 a 28/10. Nelas, os votos para presidente no BU são idênticos aos do resultado oficial (0 divergentes). Detalhes na [perícia 00](docs/pericia/00-coleta-completa.md).

## Como rodar

```
npm test                                          # suíte de testes
node src/coleta.js [--turno 1|2] [--uf ac,sp]     # coleta: índice, zips, extração, aux, conferência (--ajuda)
node src/referencia.js --turno 2                  # candidatos e municípios do TSE
node src/dadosabertos.js                          # dados abertos oficiais (CDN)
node src/exportar.js --uf ac --municipio 01007    # seção(ões) em JSON legível (--ajuda)
node src/banco.js --turno 2 --uf ac               # carga no SQLite (doc 09)
node src/lacres.js <dir>                          # verificação de assinaturas
node src/perfil-secoes.js --turno 2               # métricas por seção
```

Os dados ficam em `data/` (fora do git): `raw/<t>t/zip` (zips do TSE), `raw/<t>t/urnas/<uf>/<mun>/<zona>/<seção>/<hash>/` (arquivos extraídos), `raw/dadosabertos`, `parsed/` (JSON, perfis, comparações), `db/` (SQLite) e `manifest/` (logs, ocorrências, resumo e cobertura).

## Módulos

| Arquivo | Função |
|---|---|
| `src/coleta.js`, `etapas.js`, `http.js`, `zip.js`, `indice.js`, `registro.js` | Coleta com retomada, controle de taxa e conferência de 100% |
| `src/vsc.js`, `conferencia.js` | Integridade: hash do manifesto e SHA-512 de cada arquivo |
| `src/asn1.js`, `esquemas.js`, `exportar.js`, `referencia.js` | Decodificação pela especificação oficial e conversão para JSON |
| `src/lacres.js`, `ed521.js`, `evidencias.js` | Assinaturas da urna (Ed521/ECDSA) e cadeia de evidências |
| `src/perfil-secoes.js`, `analises.js`, `comparar-turnos.js`, `busca-identificador.js` | Métricas e análises do checklist (doc 07) |
| `src/banco.js` | Banco SQLite (doc 09) |
| `src/dadosabertos.js` | Dados abertos do TSE |
| `src/modelos.js` | Revisores auxiliares (doc 08) |

## Próximos passos

1. Rodar `src/referencia.js --turno 1` (candidatos do 1º turno).
2. Carga nacional no SQLite (dois turnos) e comparação BU × resultado oficial em todo o país (H03).
3. Perfil por seção do 1º turno e comparação entre turnos (H05, H10).
4. Verificação de assinaturas no país inteiro (H04), em paralelo.
5. Rodar os itens pendentes do doc 07 sobre o banco.
