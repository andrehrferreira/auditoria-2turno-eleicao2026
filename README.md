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

Atualizado em 30/10/2026. O painel `coleta-tse` do Claude Code lê esta tabela: mantenha o formato e os marcadores.

<!-- andamento:inicio -->
| Fase | Etapa | Status | Detalhe |
|---|---|---|---|
| 1. Coleta | Arquivos de urna do 2º turno | concluída | 499.248/499.248 seções (499.207 completas + 41 não instaladas); 17.931/17.931 agregadas |
| 1. Coleta | Arquivos de urna do 1º turno | concluída | 499.248/499.248 seções (499.207 completas + 41 não instaladas); 17.931/17.931 agregadas |
| 1. Coleta | aux.json do 2º turno (status oficial por seção) | em andamento | Falta a lista oficial de parte de SP e de todo o TO; 0 seção com hash oficial diferente do pacote |
| 1. Coleta | aux.json do 1º turno | pendente | Começa depois do aux do 2º turno |
| 1. Coleta | Dados abertos (resultado oficial, perfil do eleitorado, comparecimento por idade, candidaturas, 2018 e 2022) | concluída | data/raw/dadosabertos |
| 1. Coleta | Candidatos e municípios (referência) | concluída | 1º e 2º turno |
| 2. Leitura | Decodificador pela especificação oficial (BU, RDV, imgbu, vsc) | concluída | src/asn1.js + src/esquemas.js |
| 2. Leitura | Conversor de seção para JSON legível | concluída | src/exportar.js, sob demanda |
| 2. Leitura | Banco SQLite para consultas | concluída | 1º e 2º turno: 28/28 UFs, 499.248 seções cada, 0 erro de carga; resultado oficial carregado |
| 2. Leitura | Cópia de leitura com índices analíticos | concluída | Dois turnos com 28/28 UFs; índices e ANALYZE só na cópia (doc 09) |
| 2. Leitura | Perfil por seção (métricas de log e BU) | em andamento | Regeneração das 28 UFs nos dois turnos com a ordem do log corrigida (pacotes com 2+ logs); depois, recarga do perfil_log |
| 3. Integridade | Hashes e assinaturas no país inteiro (H04) | concluída | Dois turnos, 499.207 pacotes cada: 0 arquivo alterado; 1 pacote de MG (1º turno) com o boletim impresso fora da lista lacrada; carteiras com bytes a mais são defeito de leitura, não de assinatura |
| 3. Integridade | Certificados das urnas (H25) | concluída | AC URNA vencida em 18/07/2026 assinou 54 certificados de urna depois de vencer; 0 certificado de fora das 3 ACs do TSE (503.525); pedido de esclarecimento ao TSE no relatório temático |
| 3. Integridade | Seriais e trocas de urna (H11) | concluída | Dois turnos: 0 número de urna e 0 código de carga repetidos entre seções; cartões de votação repetidos na quantidade que o acaso prevê; urnas religadas e trocadas explicadas (revisão cética 24) |
| 4. Análises | A1/B2: soma dos BUs × resultado oficial (H03) | em andamento | 1º turno: todos os cargos iguais ao oficial (109/109 pares UF × cargo); 2º turno: Presidente igual em 499.205 seções; demais campos do 2º turno pendentes |
| 4. Análises | Coerência BU × RDV × log | concluída | Votos do boletim sem linha no diário reconciliados nos dois turnos (revisões céticas 20 e 25) |
| 4. Análises | B5/H10: crescimento entre turnos | concluída | H10 refutada como escrita (parecer 05); linha de base 2018/2022 |
| 4. Análises | C2/H01: títulos de falecidos | em andamento | Cadastro: piso de títulos 100+ sem pessoa no Censo; uso no 1º turno: 0,72% (oficial); 2º turno: arquivo oficial ainda sem dados |
| 4. Análises | A5/B1/H02/H05: liberação sem biometria e mesários | em andamento | 28 UFs nos dois turnos: o teste não decide (revisões céticas 27 e 31); falha do leitor de digital não explica os sinais |
| 4. Análises | H13: liberados sem biometria votaram no 13, sobretudo no Nordeste? | em andamento | 5 métodos e revisão cética feitos (parecer 15); falta a conta com a liberação do log |
| 4. Análises | A2/B3/H06: chegada dos BUs, votos após 17h e encerramento às 19h | em andamento | Às 19h, 98,64% dos BUs já emitidos e 0,38% registrados no TSE; divulgação seguiu a ordem de registro (revisão cética 28); 81 seções do 1º turno com relógio 1 h adiantado corrigidas; decisão da prorrogação pendente |
| 4. Análises | A10/H08: sequências impossíveis | em andamento | Menor intervalo 16 s (parecer 12); falta o ciclo completo com os perfis refeitos |
| 4. Análises | H09: sigilo do voto nos arquivos públicos | concluída | Universo dos dois turnos: o RDV não guarda a ordem de votação; números com formato de título nas mensagens de suspensão do diário (revisão cética 29) |
| 4. Análises | H14: urnas trocadas por reserva no 2º turno | concluída | 5.714 seções com reserva comparadas com a mesma seção no 1º turno: sem diferença detectável, sem marca de software adulterado (revisão cética 30) |
| 4. Análises | H15/H16/H17: mesa, máquina de estados do eleitor, suspensão e "já votou" | concluída | Sem sinal de fraude na mesa; 0 sessão órfã; 0 voto sem habilitação no 1º turno (revisões céticas 31 e 32) |
| 4. Análises | H26: virada para o 13 por zona | em andamento | Triagem das 2.641 zonas feita: virada geral, não concentrada; falta a revisão cética |
| 4. Análises | H18–H24 (inserção uniforme, falha induzida, relógio, RDV, exterior, recarga, trânsito) | pendente | Registradas a partir da discussão T19 |
| 4. Análises | A3/A4 e forense estatística | em andamento | Parecer 13: sem marca de fraude concentrada; os testes não veem fraude espalhada ou proporcional |
| 4. Análises | Aumento de comparecimento entre turnos | em andamento | Estatístico concluído; em revisão cética (parecer 22) |
| 5. Relatório | Perícia em linguagem simples | em andamento | Resumo executivo e tópicos 00 a 12; revisão geral (T20) e consenso T22 aplicados; texto independente do processo |
| 5. Relatório | Relatório completo (PDF assinado) | em andamento | [docs/relatorio/relatorio.pdf](docs/relatorio/relatorio.pdf); nova versão assinada depois do consenso T22 |
| 5. Relatório | Relatório temático: certificado vencido da AC URNA (PDF assinado) | em andamento | [docs/relatorio/temas/certificado-ac-urna.pdf](docs/relatorio/temas/certificado-ac-urna.pdf), com as planilhas das urnas embutidas; nova versão com o pedido ao TSE a gerar |
| 5. Relatório | Relatório das hipóteses em teste (PDF) | concluída | [docs/relatorios/hipoteses-em-teste.pdf](docs/relatorios/hipoteses-em-teste.pdf), H01 a H26, retrato de 30/10 |
<!-- andamento:fim -->

## Hipóteses em análise

<!-- hipoteses:inicio -->
Retrato de 30/10/2026. Gerado por `python scripts/relatorios/hipoteses.py` a partir de [docs/relatorios/hipoteses-em-teste.json](docs/relatorios/hipoteses-em-teste.json); relatório completo em [PDF](docs/relatorios/hipoteses-em-teste.pdf). Os números vêm do relatório de perícia (universo completo, conferidos); o registro com toda a evidência está em [docs/hipoteses.md](docs/hipoteses.md) e o quadro em linguagem simples em [docs/pericia/10](docs/pericia/10-quadro-das-hipoteses.md).

| # | Suspeita | Status | O que já se sabe | Próximo teste |
|---|---|---|---|---|
| H01 | Votos dados com títulos de pessoas que já morreram | em teste | ≥ 94.985 títulos de 100+ sem pessoa no Censo (148.553 se a idade é contada até julho); 1º turno: 0,72% dos 100+ votaram (TSE) | Comparecimento por idade no 2º turno e óbitos por município (LAI); revisão do teste por zona do 1º turno |
| H02 | Seções com quantidade fora do normal de eleitores liberados sem digital | aberta | 16.011 seções com excesso sobre o cadastro (36.340 eleitores); nas 378 maiores, a foto sem digital explica quase tudo | Marca da foto nas 16.011 seções; 1º turno completo; digitais carregadas por seção (LAI) |
| H03 | A soma das urnas é diferente do resultado oficial | em teste | Igual ao oficial: Presidente nas 499.205 seções (2º t.) e todos os cargos no 1º t.; 630.541 votos como nulo técnico, que pesaram no governo do RJ | Demais campos do 2º turno; decisão sobre o nº 10 no RJ; urna que gravou 15 votos em SP no 1º turno |
| H04 | Arquivos publicados alterados, ou gerados fora de uma urna oficial | em teste | Assinaturas dos 499.207 pacotes conferidas nos dois turnos, 0 falha de arquivo; hashes de 1.996.828 arquivos por turno, 0 falhas | Inicializações das urnas refeitas por um segundo programa; certificado da AC URNA (H25) |
| H05 | Mesários liberando outras pessoas no lugar de eleitores da seção, sem digital | aberta | 113.979 avisos "já votou" em 73.246 seções; o teste do eleitor a mais sem digital não decide (muda de lado com o perfil da seção) | Rajadas e consultas (H15, H17); sinais de SP e PR; inspeção das 97 seções de liberação em massa |
| H06 | A prorrogação do horário de votação favoreceu um lado; na apuração, os boletins foram liberados de forma controlada | em teste | 34.330 votos após 17h de Brasília (0,027%), menos de 1% da margem; boletins registrados em lotes a partir de 19:03:37 | Decisão assinada e ofício do TSE; onde os boletins esperaram e se a ordem de registro dependeu do voto |
| H07 | Urnas antigas colocadas de propósito onde se quer dispensar a digital | **refutada** | Todo modelo lê digital (UE2013: 82,2% pela digital); a urna antiga libera mais à mão | Critério de alocação das urnas antigas (LAI) |
| H08 | Votos em sequência rápida demais para uma pessoa | aberta | Menor intervalo entre dois votos no país: 16 segundos; o diário nunca tem mais votos que o boletim | Ciclo completo de eleitor em todos os votos (H16); as 3 seções com leitura a corrigir |
| H09 | Os arquivos públicos permitem descobrir em quem uma pessoa votou | aberta | A lista de votos não guarda a ordem de votação nos dois turnos; o diário publica números com formato de título na suspensão do eleitor | Perguntar ao TSE de quem são os números da suspensão; refazer a busca de título codificado |
| H10 | O vencedor cresceu do 1º para o 2º turno mais do que havia de votos disponíveis | **refutada** | A conta fecha em todos os municípios (identidade contábil: não absolve) | Queda de brancos e nulos seção a seção; linha de base de eleições anteriores |
| H11 | O mesmo cartão de memória usado em mais de uma urna, ou resultado trocado no caminho | em teste | Nenhum cartão, urna ou código de carga repetido no mesmo município ou zona, nos dois turnos | Trocas em Aracaju (TRE-SE); carga no dia no 1º turno; registros de transmissão |
| H12 | O QR do título digital (e-Título) entrega os dados usados para liberar sem digital, e pode ser forjado | aberta | — | Ler o QR em vários e-Títulos e testar o validador do TSE |
| H13 | Os eleitores liberados sem digital votaram majoritariamente no 13, sobretudo no Nordeste | em teste | Nordeste: 3,41% a 99,93% dos 4,27 mi liberados podem ter votado no 13; o pior caso no Brasil inteiro inverteria o resultado; virada igual em todas as faixas | Conta com a liberação do diário; seções de CE, PB e PE; método por zona com as 28 UFs |
| H14 | Urnas trocadas por urna reserva no 2º turno teriam sido manipuladas | em teste | 5.714 seções com reserva; nas trocas novas, voto igual ao das vizinhas no que o teste vê; mesmo todos do 22, o 13 venceria | Trocas em Aracaju (TRE-SE); reservas quase sem digital (atas) |
| H15 | Votos no lugar de ausentes, liberados em bloco pelo mesmo mesário, sem digital, no fim do dia | em teste | Teste nos dois turnos sem sinal; a revisão cética estreitou o alcance; ainda fora da perícia | Levar à perícia; caderno de votação (LAI) para blocos pequenos ou disfarçados |
| H16 | Voto sem eleitor liberado, ou eleitor liberado sem desfecho registrado no diário da urna | em teste | Teste nos dois turnos sem atendimento fora da sequência, sustentado pela revisão cética; ainda fora da perícia | Levar à perícia; votos confirmados e não gravados seguem na H17 |
| H17 | Votos suprimidos ou roubados na mesa: eleitor suspenso ou cancelado de propósito, ou "já votou" para quem estava presente | em teste | Teste sem sinal de supressão; ligação pequena entre voto sem digital e "já votou", menor no 2º turno; ainda fora da perícia | Caderno de votação de uma seção do PR; votos confirmados e não gravados (urna desligada) |
| H18 | Votos inseridos por igual num município inteiro, um ponto cego dos testes por seção | aberta | — | Virada e variação entre seções por município, contra os outros cargos |
| H19 | Falha de digital provocada de propósito nas seções escolhidas | aberta | — | Falha do leitor por seção entre os turnos, contra o voto no mesmo local |
| H20 | Relógio ou ordem dos eventos da urna adulterados | aberta | — | Ordem zerésima, abertura e primeiro eleitor; eventos fora de ordem |
| H21 | Compra de voto conferida pelo registro dos votos: um número nulo raro usado como senha | aberta | — | Números nulos raros e concentrados, por cargo, seção e turno |
| H22 | Exterior e urnas de fluxo especial com comparecimento ou ritmo fora do normal | aberta | Exterior: 100% dos 380.612 votantes do 2º turno liberados sem digital | Comparecimento, voto e ritmo por país entre os turnos; base de 2022 |
| H23 | Urna carregada de novo, ou carregada fora da cerimônia oficial | aberta | 5 urnas carregadas na manhã do 2º turno, com a carga conferida | Urnas com mais de uma carga ou carga fora do bloco da zona; atas dos TREs |
| H24 | Eleitores em trânsito e com atributos especiais (preso, militar, servidor da Justiça Eleitoral, deficiência visual) usados para inflar seções | aberta | — | Seções com e sem trânsito no mesmo local; atributos por seção entre os turnos |
| H25 | O certificado do cartório digital das urnas antigas (AC URNA) venceu antes da eleição; um sistema alterado poderia assinar com chave aceita, e a totalização não conferiria a validade | em teste | Certificado da AC URNA vencido em 18/07/2026; 54 carteiras de urna carimbadas depois; votos dessas seções iguais aos das vizinhas | Resposta do TSE pela LAI (conferência na totalização, emissões, guarda da chave) |
| H26 | Zonas com virada para o 13 do 1º para o 2º turno muito acima do que o voto da própria zona no 1º turno explica, concentradas numa região, num modelo de urna ou num horário | em teste | Triagem de todas as zonas feita; aguarda revisão cética | Revisão cética; zonas fora da curva seção a seção; linha de base 2018 e 2022 |

Na fila, ainda sem número de hipótese: queda de brancos e nulos entre os turnos; linha de base de eleições anteriores; concentração de votos em seções.
<!-- hipoteses:fim -->

## Números do 2º turno (Fatos)

- **499.248** seções com urna, **17.931** agregadas, **41** não instaladas (exterior), **29** apuradas pelo Sistema de Apuração (exterior).
- Todos os arquivos conferidos pelo hash do manifesto (`vota.vsc`) e pelo SHA-512 de cada arquivo. Um `log.jez` faltava no zip de SP e foi baixado por seção (confere com o `vota.vsc`).
- Seções "Recebida" no site de resultados (em vez de "Totalizada"), **parcial**: 5.270 até agora, em 10 UFs (faltam SP e TO no retrato do aux.json), com datas de 25 a 28/10. Nelas, os votos para presidente no BU são idênticos aos do resultado oficial (0 divergentes). Detalhes na [perícia 00](docs/pericia/00-coleta-completa.md).

## Relatórios

| Documento | O que é |
|---|---|
| [Relatório de perícia completo (PDF)](docs/relatorio/relatorio.pdf) | Resumo executivo com os principais achados, os tópicos 0 a 12 e o glossário, em linguagem simples. Gerado a partir de [docs/pericia/](docs/pericia/README.md) |
| [O certificado vencido da AC URNA (PDF)](docs/relatorio/temas/certificado-ac-urna.pdf) | Relatório temático da H25: abre com o pedido formal de esclarecimento ao TSE; traz o tamanho do risco, a conclusão e, embutidas no PDF, as planilhas das urnas ligadas à AC URNA nos dois turnos |
| [Hipóteses em teste (PDF)](docs/relatorios/hipoteses-em-teste.pdf) | Quadro de todas as hipóteses, com o que já se sabe e o próximo teste |

Os PDFs da perícia são assinados digitalmente dentro do arquivo (PAdES) com o certificado da auditoria, "Auditoria independente das urnas — Eleições 2026". A assinatura aparece no painel de assinaturas do leitor de PDF; qualquer mudança depois da assinatura a invalida. O certificado é autoassinado: confira a impressão digital SHA-256 do certificado público, [docs/relatorio/certificado-assinatura.pem](docs/relatorio/certificado-assinatura.pem):

```
CF:FB:8B:52:0A:97:11:94:8D:5A:32:FF:4A:5A:4E:1D:F7:6F:A9:84:E2:26:9F:16:8C:DF:62:3C:28:F3:CB:E3
```

Para conferir pela linha de comando (pyHanko): `python -m pyhanko sign validate --pretty-print --trust docs/relatorio/certificado-assinatura.pem docs/relatorio/relatorio.pdf`.

## Como rodar

```
npm test                                          # suíte de testes
npm run relatorio                                 # relatório completo em HTML (docs/relatorio/)
npm run relatorio:pdf                             # o mesmo, em PDF assinado
npm run relatorio:temas                           # relatórios temáticos (docs/pericia/temas/) em PDF assinado
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
| `scripts/auditoria/` | Scripts de cada frente e de cada gráfico da perícia |
| `scripts/relatorio/gerar.mjs`, `markdown.mjs` | Relatório em HTML e PDF assinado; bloqueia referência ao processo e link para fora do relatório |

## Próximos passos

1. Gerar e assinar a nova versão do relatório completo e do temático da AC URNA (com o pedido ao TSE).
2. Enviar ao TSE o pedido de esclarecimento sobre a AC URNA e os demais pedidos pela Lei de Acesso à Informação (lista no [relatório de hipóteses](docs/relatorios/hipoteses-em-teste.pdf)).
3. Revisão cética da H26 (virada por zona); testar H18 e H21 a H24.
4. Perfis por seção refeitos nas 28 UFs e recarga do banco; refazer o que depende do diário da urna (H08 e H13 com a liberação do log).
5. Demais campos do 2º turno: soma das urnas × resultado oficial (H03).
6. Entrada de H15, H16 e H17 na perícia e anexo de tabelas de dados no relatório.

O histórico das entregas está no [CHANGELOG](CHANGELOG.md).

## Como contribuir ou contestar

Encontrou um erro de conta, de método ou de leitura? Abra uma *issue* com o número, o arquivo e o comando que o reproduz. Toda afirmação deste repositório deve poder ser refeita a partir dos arquivos públicos do TSE com os scripts daqui; o que não puder ser refeito não vale como Fato.

O que **não** está no repositório: os arquivos brutos do TSE e o banco (são grandes; os scripts baixam e montam tudo, ver "Como rodar") e qualquer base com dado pessoal (CPF), que nunca sai da máquina do auditor.

## Licença

[MIT](LICENSE).
