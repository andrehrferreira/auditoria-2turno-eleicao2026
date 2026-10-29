# Auditoria independente: eleições gerais de 2026 (1º e 2º turno)

> [!WARNING]
> **Análise em andamento. Nada aqui é conclusão final.**
>
> - Os números, os status das hipóteses e os textos mudam conforme os testes avançam e passam pela revisão cética. Confira sempre a data do retrato.
> - **Nenhuma hipótese de fraude foi sustentada até agora**, e também **não é possível afirmar que não houve fraude**. Os arquivos públicos não mostram quem estava na cabine, e vários testes têm pontos cegos declarados.
> - Só o [relatório de perícia](docs/pericia/README.md) traz números conferidos no universo completo. O que está em [docs/analysis/](docs/analysis/) são análises de trabalho: hipóteses, estimativas e rascunhos que ainda podem estar errados.
> - Brecha (um ponto em que só uma pessoa decide, sem rastro técnico) é **risco**, não prova de fraude. Não use trechos isolados como prova de nada: leia cada achado com o seu alcance e os seus limites.

Auditoria dos arquivos públicos das urnas eletrônicas (BU, RDV, log e assinaturas) publicados pelo TSE para as eleições de 2026, com métodos reproduzíveis. Premissas, fontes e achados ficam em [docs/](docs/README.md), e cada afirmação leva o rótulo **Fato**, **Hipótese** ou **Recomendação**.

Trabalhos anteriores: [2º turno 2022](https://github.com/andrehrferreira/auditoria-2turno-eleicao2022) · [1º turno 2024](https://github.com/andrehrferreira/auditoria-1turno-eleicoes-2024).

## Andamento

Atualizado em 29/10/2026, 09:30. O painel `coleta-tse` do Claude Code lê esta tabela: mantenha o formato e os marcadores.

<!-- andamento:inicio -->
| Fase | Etapa | Status | Detalhe |
|---|---|---|---|
| 1. Coleta | Arquivos de urna do 2º turno | concluída | 499.248/499.248 seções (499.207 completas + 41 não instaladas); 17.931/17.931 agregadas |
| 1. Coleta | Arquivos de urna do 1º turno | concluída | 499.248/499.248 seções (499.207 completas + 41 não instaladas); 17.931/17.931 agregadas |
| 1. Coleta | aux.json do 2º turno (status oficial por seção) | em andamento | 395.227 seções conferidas (faltam SP e TO), 0 com hash oficial diferente do pacote |
| 1. Coleta | aux.json do 1º turno | pendente | Começa depois do aux do 2º turno |
| 1. Coleta | Dados abertos (resultado oficial, perfil do eleitorado, comparecimento por idade, candidaturas, 2018 e 2022) | concluída | data/raw/dadosabertos |
| 1. Coleta | Candidatos e municípios (referência) | concluída | 1º e 2º turno |
| 2. Leitura | Decodificador pela especificação oficial (BU, RDV, imgbu, vsc) | concluída | src/asn1.js + src/esquemas.js |
| 2. Leitura | Conversor de seção para JSON legível | concluída | src/exportar.js, sob demanda |
| 2. Leitura | Banco SQLite para consultas | concluída | 1º e 2º turno: 28/28 UFs, 499.248 seções cada, 0 erro de carga; resultado oficial carregado |
| 2. Leitura | Cópia de leitura com índices analíticos | concluída | Dois turnos com 28/28 UFs (cópia de 29/10, 10h50 UTC); índices e ANALYZE só na cópia (doc 09) |
| 2. Leitura | Perfil por seção (métricas de log e BU) | em andamento | Regeneração das 28 UFs nos dois turnos com a ordem do log corrigida (pacotes com 2+ logs); depois, recarga do perfil_log |
| 3. Integridade | Assinaturas e hashes no país inteiro (H04) | em andamento | Auditor E rodando; AC, ES e ZZ: 0 falha; 3 seções de contingência exigem corte de 1 byte no certificado (defeito de leitura) |
| 3. Integridade | Cadeia de evidências da perícia | em andamento | docs/pericia/evidencias |
| 4. Análises | A1/B2: soma dos BUs × resultado oficial (H03) | em andamento | Presidente igual ao oficial nos dois turnos (499.205 e 499.206 seções, 0 diferença); demais cargos pendentes |
| 4. Análises | Coerência BU × RDV × log | em andamento | 2º turno: 50 votos sem rastro no log em 3 seções de contingência; contagens de outros auditores a reconciliar (pareceres 20 e 25) |
| 4. Análises | B5/H10: crescimento entre turnos | concluída | H10 refutada como escrita (parecer 05); linha de base 2018/2022 |
| 4. Análises | C2/H01: títulos de falecidos | em andamento | Cadastro: ≥148.553 títulos 100+ sem pessoa; uso no 1º turno: 0,72% (oficial); mínimo de 157 votos 100+ sem biometria; 2º turno: arquivo oficial ainda sem dados |
| 4. Análises | A5/B1/H02/H05: liberação sem biometria e mesários | em andamento | 16 mil seções explicadas por "foto sem digital"; Auditor B rodando |
| 4. Análises | H13: liberados sem biometria votaram no 13, sobretudo no Nordeste? | em andamento | 5 métodos e revisão cética feitos (parecer 15); aritmética na perícia 04; falta a conta com a liberação do log |
| 4. Análises | A2/B3/H06: votos após 17h e encerramento às 19h | em andamento | 34.330 votos após 17h (0,027%); parecer 11: não muda o resultado, há associação pequena com o 13 de causa não identificada |
| 4. Análises | A10/H08: sequências impossíveis | em andamento | Menor intervalo 16 s (parecer 12); falta o ciclo completo com os perfis refeitos |
| 4. Análises | A3/A4 e forense estatística | em andamento | Parecer 13: sem marca de fraude concentrada; os testes não veem fraude espalhada ou proporcional |
| 4. Análises | Aumento de comparecimento entre turnos | em andamento | Estatístico concluído; em revisão cética (parecer 22) |
| 4. Análises | A8, A12/H11, A13, B4 | em andamento | Segurança, matemático e biometria concluídos; em revisão cética (pareceres 20, 21, 24 e 25) |
| 5. Relatório | Perícia em linguagem simples | em andamento | Tópicos 00 a 10 verificados pela regra "só dados 100% corretos" (29/10); revisão externa dos números por Grok, Astra e Kimi (T15) |
| 5. Relatório | Relatório das hipóteses em teste (PDF) | concluída | [docs/relatorios/hipoteses-em-teste.pdf](docs/relatorios/hipoteses-em-teste.pdf), retrato de 29/10 |
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

1. Revisão cética dos achados de integridade, segurança, matemático e estatístico (pareceres 20 a 25) e incorporação do que for sustentado à perícia.
2. Perfis por seção refeitos nas 28 UFs e recarga do banco; refazer o que depende do diário da urna (H05, H08 e H13 com a liberação do log).
3. Assinaturas digitais e números de série no país inteiro (H04, H11).
4. Demais cargos: soma das urnas × resultado oficial (H03).
5. Pedidos ao TSE pela Lei de Acesso à Informação (lista no [relatório de hipóteses](docs/relatorios/hipoteses-em-teste.pdf)).

## Como contribuir ou contestar

Encontrou um erro de conta, de método ou de leitura? Abra uma *issue* com o número, o arquivo e o comando que o reproduz. Toda afirmação deste repositório deve poder ser refeita a partir dos arquivos públicos do TSE com os scripts daqui; o que não puder ser refeito não vale como Fato.

O que **não** está no repositório: os arquivos brutos do TSE e o banco (são grandes; os scripts baixam e montam tudo, ver "Como rodar") e qualquer base com dado pessoal (CPF), que nunca sai da máquina do auditor.
