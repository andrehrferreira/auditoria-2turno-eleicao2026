# 11. H06: votos depois das 17h "sem efeito no resultado" (parecer consolidado)

Achado revisado: `docs/analysis/linha-do-tempo/02-votos-apos-17h.md` (Auditor C), resumido em `docs/hipoteses.md`, linha H06.
Revisão: três lentes independentes (reprodução, definições, alternativas) e uma conferência própria dos pontos em disputa.
Data: 29/10/2026. Banco: cópia de leitura `eleicao2026-20261029T105000.sqlite` (1º e 2º turno com 28 UFs cada, tabela `carga`).

## Afirmação original

> A urna trava o encerramento antes das 17:00, mas não trava votos depois. No 2º turno houve 34.330 votos após 17h de Brasília (0,027%) em 29.854 seções; 6.352 seções encerraram às 19h ou depois (RJ, SP, Salvador, Petrópolis, João Pessoa, Itaboraí, Recife), degrau inexistente no 1º turno; em 784 seções houve voto depois de o mesário responder "todos votaram? SIM". Efeito no resultado: nenhum mensurável (dentro da zona −0,26 p.p. para o 13; contra o 1º turno +0,10 p.p.; votos tardios = 0,8% da margem). Fuso: 11 municípios do oeste do AM a −2h, Noronha a +1h.

## Veredito final: **sustentado com ressalvas**

As três lentes deram o mesmo veredito. As contagens reproduzem exatamente, por três caminhos diferentes. A conclusão de que os votos tardios **não mudam o resultado** se sustenta, mas só pela aritmética do volume. A frase "nenhum efeito mensurável" está **refutada como escrita**: o sinal está trocado no doc, e contra o 1º turno completo existe uma associação pequena e estatisticamente firme a favor do 13, de causa não identificável. Duas leituras do autor também caem: o degrau das 19h não é "decisão de quem operava a urna", porque coincide com uma liminar do STF que já está no repositório; e as 784 declarações "SIM" não foram "desmentidas", porque foram desfeitas por um evento técnico registrado no log.

## Afirmação revisada (alcance que os dados sustentam)

> **Fato.** A urna recusa o encerramento antes das 17:00 de Brasília e não impede voto depois. No 2º turno houve 34.330 votos computados depois das 17h de Brasília (0,027% dos 127,85 milhões) em 29.854 seções. 6.352 seções encerraram às 19h ou depois (6.257 entre 19:00 e 19:09), concentradas em Rio, São Paulo, Salvador, Petrópolis, João Pessoa, Itaboraí e Recife. Esse degrau não existe no 1º turno, que não teve prorrogação. Ele coincide com a liminar do STF na Rcl 101.673/BA, que prorrogou o recebimento de votos "até as 19h, horário de Brasília" (cópia no repositório). Em 784 seções houve voto depois de uma resposta "todos votaram? SIM". Em 911 dos 912 votos, esse SIM foi desfeito antes por cancelamento ou aborto registrado no log; no voto restante, a urna foi desligada e religada. Nenhum voto veio depois do último SIM da seção.
>
> **Efeito no resultado.** Os votos tardios são 0,78% da margem de presidente se tivessem sido acrescentados, e 1,55% se tivessem sido trocados. Nos governos estaduais, o maior caso é o RN: 1,27% da margem (2,53% se trocados). Isso não muda nenhum resultado. Mas a afirmação de que não existe efeito mensurável é falsa. Dentro da zona, as seções com voto tardio dão **+0,26 p.p.** para o 13 (IC95 de +0,15 a +0,37). Contra o 1º turno da mesma seção, com o 1º turno completo, a diferença é de **+0,13 p.p.** (IC95 de +0,11 a +0,16). Os testes não conseguem separar efeito do voto tardio de perfil da seção.
>
> **Risco aberto (princípio 8).** Nenhum arquivo registra a hora de chegada do eleitor. 5.469 votos tardios (0,12% da margem) não têm biometria. Deles, 3.359 (0,076%) tiveram também o atendimento começado depois das 17h: nada nos arquivos os distingue de um voto inserido pelo mesário.

## O que foi reproduzido (Fato, universo completo do 2º turno)

| Número do autor | Reprodução | Como |
|---|---|---|
| 34.330 votos depois das 17h, em 29.854 seções | igual, nas três lentes | perfil do banco; releitura de 34.066 logs brutos por parser próprio; conferência seção a seção (0 divergências) |
| 1.993 depois das 18h; 11 depois das 19h | igual | idem |
| 6.352 seções às 19h ou depois (6.257 entre 19:00 e 19:09); 3.339 delas sem nenhum voto depois das 17h | igual | idem; 3.339 conferido por mim em `logs-tardios.jsonl` |
| 784 seções com voto depois de "SIM" (580 / 32 / 172 nos grupos 17h / 17h30–18h59 / 19h+) | igual | três parsers |
| Habilitação dos tardios (grupo 17h: 24.398 bio / 2.324 ano de nascimento / 2.469 manual; 19h+: 3.915 / 332 / 245) | igual | idem |
| 0 voto depois de encerramento confirmado; 0 "SIM" antes das 17h | igual | lente de reprodução |
| Fuso: 11 municípios do AM e 22 do AC a −2h, 339 a −1h, Noronha a +1h | igual, nos 5.688 municípios | fuso tirado da abertura do BU (outro caminho que o "urna pronta" do log); mesma contagem no 1º turno |
| Margem de presidente 4.430.191; tardios = 0,8% | 0,775% | aritmética |
| 16 encerramentos confirmados exatamente às 19:00:00 | igual | conferido por mim |
| 524 seções do grupo 19h+ com a 1ª seleção de "Encerrar votação" entre 17:00 e 17:29 | igual | conferido por mim |

Conferência no bruto (lente de reprodução): BA 36854/0180/0147. O BU encerra às 18:56:49 com comparecimento 355, igual ao log.

## Problemas encontrados

1. **Sinal trocado (Fato).** O doc 02 (item 5) e `hipoteses.md` dizem "−0,26 p.p. para o 13". O `resumo.json` do próprio autor (`diferencaMediaDentroDaZona_pp = 0.26`) e as três reproduções dão **+0,26 p.p.** (erro-padrão entre zonas de 0,055 a 0,063; IC95 de +0,15 a +0,37; z ≈ 4). A frase "a diferença some dentro da zona" é falsa. A correlação de +0,013 citada como ausência de efeito também é significativa (inclinação 0,79, z ≈ 7).
2. **O "+0,10 p.p. contra o 1º turno" não reproduz (Fato).** Ele saiu de 21 zonas, com o 1º turno parcial, e mistura medidas: 13/(13+22) no 2º turno e 13/nominais no 1º. Com o 1º turno completo (28 UFs) e a mesma medida nos dois turnos:
   - todas as seções com voto tardio contra as demais da zona: **+0,132 p.p.** (IC95 de +0,107 a +0,158). Com controle de tamanho, +0,122. Dose-resposta: inclinação 0,215 (IC95 de 0,15 a 0,28);
   - locais encerrados às 19h contra locais normais: **−0,06 p.p.** (IC95 de −0,22 a +0,11; 83 zonas, 2.102 seções);
   - seções às 19h contra seções às 17h: **−0,11 p.p.** (IC95 de −0,18 a −0,03).

   As lentes de definições e de alternativas tinham calculado com 22 UFs do 1º turno: os números delas são parciais e foram substituídos por estes. Só a troca de medida já cria efeito aparente. Exemplo: na PB, com a medida do autor, dá −0,40 (IC95 de −0,65 a −0,16); com a mesma medida nos dois turnos, −0,04.
3. **Ato oficial ignorado (Fato).** O doc diz "[a confirmar] ato do TSE ou dos TREs" e "as urnas ficaram abertas por decisão de quem as operava". A liminar da Rcl 101.673/BA (min. Zanin) está em `data/raw/stf/rcl-101673-zanin-25out26.pdf`. Conferi o SHA-256: `f1322682ec4cf44504276a6b482364beceb5ae6facd02e7cd9b05b406c79c4ab`. O próprio `hipoteses.md` já a registra como Fato. O texto manda prorrogar "até as 19h, horário de Brasília, … em todas as seções de todo o Brasil". O degrau das 19:00–19:09 coincide com esse horário. Por isso a ausência do degrau no 1º turno era esperada e não conta como anomalia. Duas das três lentes não viram o arquivo.
4. **As "784 declarações desmentidas" estão mal lidas (Fato).** São 912 votos depois do primeiro SIM e 0 depois do último SIM. O último evento do diálogo antes de cada voto foi:
   - cancelamento ("Operador cancelou o encerramento"): 785;
   - aborto ("Procedimento de encerramento abortado"): 119;
   - NÃO num segundo diálogo: 7;
   - um SIM que não foi cancelado: 1 (RJ 59013/0186/0147, onde a urna foi desligada e religada às 17:21 e houve "reinício da votação" às 17:24).

   Em 0 casos o atendimento do eleitor começou antes do SIM. O SIM é um passo do diálogo de encerramento, desfeito por um evento técnico que deixa rastro. A brecha humana existe: o mesário pode responder SIM sem que seja verdade (princípio 8). Mas o log não "desmente" a declaração; registra que ela foi retirada.
5. **Exemplo mal atribuído (Fato, conferido por mim).** BA 36854/0180/0147 aparece como "exemplo extremo" das 784 seções, mas tem 0 voto depois do SIM: o SIM foi às 18:56:31 e o último voto às 18:26:31. É um caso de urna parada por quase 2 horas, não de voto depois do SIM.
6. **Item 3 exagerado (Fato, conferido por mim em `logs-tardios.jsonl`).** O doc diz que nas 1.025 seções o mesário "selecionou antes das 19h, respondeu SIM e cancelou". Na verdade, 1.025 selecionaram "Encerrar votação" antes das 19h, mas só **723** responderam SIM antes das 19h. 130 só tentaram antes das 17h, e a urna recusou sem fazer a pergunta. A lente de reprodução tinha contado 155 com outra definição; o número rastreável é 130 = 1.025 − 895 (as 895 têm seleção entre 17:00 e 18:59).
7. **Aritmética do item 4 (Fato, conferido por mim).** A soma dos votos depois de pausa de 30 min ou mais é 602 + 264 + 2.567 = **3.433**, e não "cerca de 2.900 a 3.300".
8. **"Total de votos (log = BU)" não é exato (Fato, lente de reprodução).** O log soma 127.854.844 e o BU 127.854.363. São 9 seções de contingência ou reserva com log diferente do BU (ex.: BA 39870/0133/0184, 413 × 228). Nenhuma tem voto tardio.
9. **Linha de base errada na biometria.** Ver "Ponto em disputa conferido". O autor compara com a média nacional; a lente de alternativas, com a mesma seção durante o dia. As duas comparações misturam o viés de duração.
10. **Código.**
    - `scripts/auditoria/tempo-extensao.mjs` abre o banco primário direto (`new DatabaseSync` de `data/db/eleicao2026.sqlite`), contra a regra 2 do doc 10.
    - `tempo-logs-tardios.mjs` chama `lerLogs` sem o argumento de seção. A releitura filtrada por seção deu efeito zero nos números.
    - `scripts/h06-votos-apos-17h.mjs` (34.066 votos, citado em `hipoteses.md`) difere em 264 votos porque filtra `tipoUrna === 1` e exclui as urnas de reserva. A diferença é só de definição, mas precisa ficar escrita.
11. **Rastro da revisão (Fato).**
    - A lente de reprodução sobrescreveu por engano o `scripts/auditoria/cetico-h06-logs.mjs` da lente de alternativas. Esta o recriou como `cetico-h06-alternativas-logs.mjs`.
    - As saídas `h06-logs.json` (campo `tardiosRastroDeInicio`) e `h06-voto-depois-do-sim.csv` (coluna `proximo_identificador`) vêm da versão perdida, que tinha um erro, e não devem ser usadas. Os valores certos estão em `h06-logs-run2.json` e `h06-sim-run2*`.
    - O "cerca de 24% com identificador antes das 17h" da lente de alternativas veio de amostra e foi descartado (regra 3). O número do universo é **8.654 de 34.330 (25,2%)**, da lente de definições.

## Ponto em disputa conferido: o "salto sem biometria às 17h"

As lentes divergiram aqui. A lente de alternativas viu um salto de 12% para 16,4% sem biometria exatamente às 17h no grupo das 17h, um excesso de cerca de 1.300 votos. A lente de definições atribuiu esse salto a **viés de duração**: o voto contado como "tardio" é o que foi computado depois das 17h, e o atendimento sem digital demora mais, por isso tende a estar em curso às 17:00.

Para decidir, rodei um **teste placebo** sobre as 29.854 seções inteiras (`cetico-h06-consolidacao-duracao.mjs`, 0 erros). A pergunta é que parcela fica sem biometria entre os atendimentos em curso num corte qualquer do dia, ou seja, com o identificador digitado antes do corte e o voto computado depois. Resultado no grupo das 17h (26.454 seções):

| Corte | Em curso no corte | Sem biometria | Começaram nos 30 min seguintes | Sem biometria |
|---|---|---|---|---|
| 10:00 | 10.234 | 23,41% | 538.909 | 11,83% |
| 12:00 | 7.562 | 23,02% | 391.072 | 11,29% |
| 14:00 | 5.575 | 22,96% | 295.646 | 11,95% |
| 15:00 | 5.358 | 23,12% | 283.539 | 12,06% |
| 16:00 | 4.860 | 23,05% | 250.083 | 11,83% |
| 16:30 | 4.255 | 22,63% | 154.876 | 12,56% |
| **17:00** | **8.470** | **24,34%** | **20.721** | **13,18%** |

Duração média do atendimento durante o dia, nas mesmas seções: biometria 29 s; sem biometria cadastrada 39 s; liberação manual 90 s.

- **Fato.** Em qualquer hora do dia, cerca de 23% dos atendimentos em curso num corte não têm biometria, porque a liberação manual leva três vezes mais tempo. O salto de "12% para 16,4%" nasce da definição de voto tardio, e não do horário. A lente de definições está certa; o excesso de cerca de 1.300 votos não se sustenta.
- **Resíduo (Hipótese, pequeno).** Às 17:00, os atendimentos em curso dão +0,9 a +1,7 p.p. acima dos cortes de placebo (cerca de 110 votos). Os que começaram depois das 17h dão +0,6 p.p. contra a janela 16:30–17:00 (cerca de 130 votos). Juntos, são da ordem de 250 votos, ou 0,006% da margem. Não foram atribuídos a nada.
- No grupo das 19h+ (3.013 seções com tardio), os atendimentos em curso às 17:00 são 27,67% sem biometria (159 votos), contra 19% a 26% nos cortes do dia: não há salto distinguível. Os que começaram depois das 17h são 12,96%, contra 11,4% a 13,0% de dia.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Fila legítima às 17h (procedimento humano: não conta como controle, princípio 8) | Só o rastro dela | Só 8.654 votos (25,2%) têm rastro técnico de atendimento começado antes das 17h. Nos outros 25.676, nada nos arquivos separa fila de chegada tardia. Em 2.871 seções o 1º atendimento tardio veio com a urna parada 10 min ou mais (2.230 no grupo das 19h). |
| Ato oficial explica as 19h | Sim, contra o documento do repo | Coincide com a liminar da Rcl 101.673 (19h de Brasília). [a confirmar]: versão assinada, horário da assinatura e ofício do TSE. Risco aberto: a ordem valia para "todas as seções", mas só 6.352 (cerca de 1,3%) ficaram abertas, concentradas em poucos municípios. |
| Prorrogação seletiva em locais favoráveis a um lado | Sim (1º turno completo) | Não: locais às 19h −0,06 p.p. (IC95 de −0,22 a +0,11); seções às 19h −0,11 p.p. (IC95 de −0,18 a −0,03), um leve viés contra o 13, se houver algum. |
| Voto inserido pelo mesário depois das 17h | Limitado pelo rastro | 28.861 tardios (84,1%) têm digital do eleitor. Sem biometria: 5.469 (0,12% da margem); sem biometria e com atendimento começado depois das 17h: 3.359 (0,076%). Nos 912 votos depois de SIM, 129 sem biometria. Não há prova de inserção; há um teto. |
| Liberação manual abusiva no fim do dia | Sim (placebo, universo) | Quase todo o excesso é viés de duração; resíduo de cerca de 250 votos (Hipótese). |
| O +0,26 / +0,13 p.p. vem do perfil da seção (urbana, grande, com fila) | Sim, mas sem poder de separar | Placebo no 1º turno (lente de alternativas, **parcial, 22 UFs**): seções com voto tardio no 1º turno já pendiam para o 13 (+0,70 p.p. dentro da zona). A inclinação de nível do 2º turno (0,79) é impossível como efeito causal (máximo de cerca de 0,48), o que prova composição no nível. A diferença de diferenças (+0,13; inclinação 0,215) é compatível com as duas leituras. Fica Hipótese aberta, de impacto aritmético irrelevante. |
| Fuso errado cria ou esconde votos tardios | Sim | Descartado: com o fuso do autor, 0 BUs encerram antes das 17:00; com 1h a leste, 143.678 de 144.703 seções do fuso 0 encerrariam antes das 17h, o que é impossível. O exterior fica de fora (1.310 seções; 417 votos tardios no horário local). |
| Relógio individual da urna adiantado (cria tardio) ou atrasado (esconde tardio) | Só suposta | O teste da lente de alternativas com `recebido_tse` **não limita** o adiantamento a 59 s, como ela afirmou. O intervalo entre emissão e recebimento tem mínimo de 59 s, mas mediana de 3,3 h, e o campo parece ser a última atualização de status (vazio em 342.269 seções, datas de 26 a 28/10). Só prova que nenhuma urna está adiantada mais do que o próprio intervalo. Urna atrasada não é testável com estes arquivos. |
| Linhas duplicadas ou log de contingência inflam a contagem | Sim | Descartado: a releitura filtrada por seção reproduz 34.330; as 9 seções com log ≠ BU não têm tardio. |
| Voto aceito em pleno encerramento (falha da urna) | Sim | Não houve: 0 voto depois de encerramento confirmado; 0 depois do último SIM. |

## Poder do teste

- **Teste do autor, dentro da zona.** O estimador mudaria −0,247 p.p. se 100% dos tardios fossem do 22 e +0,207 p.p. se fossem do 13. O observado (+0,26) está no tamanho do cenário extremo. O teste não separa efeito de perfil e não serve para absolver nem para acusar.
- **Diferença de diferenças (1º turno completo).** O erro-padrão de 0,013 p.p. dá poder para detectar desvios de cerca de ±0,03 p.p. O resultado (+0,13) exclui o zero e exclui "todos para o 22", mas não identifica a causa. Na leitura causal, a inclinação de 0,215 equivaleria a cerca de três quartos dos tardios votando no 13: algo como 17 mil votos na margem (0,4%). É uma conta sob suposição e fica fora da perícia.
- **Locais às 19h.** O IC95 de cerca de ±0,17 p.p. tem poder para descartar uma prorrogação seletiva de efeito maior que 0,2 p.p. nesses locais.
- **O que sustenta "não muda o resultado"** é só o limite determinístico: 34.330 votos (mais 417 do exterior) contra 4.430.191 de margem, ou seja, 0,78% se acrescentados e 1,55% se trocados. Para virar o resultado seriam necessários cerca de 2,2 milhões de votos. Governador (BU, cópia das 10:50): AC 0,12%, AM 0,21%, DF 0,40%, ES 0,31%, TO 0,09%, RN **1,27%** da margem (413 tardios contra 32.625 de margem), com o dobro se os votos tivessem sido trocados.

## Pendências

1. Versão assinada da liminar da Rcl 101.673 no portal do STF, horário da assinatura e ofício do TSE aos TREs com a lista de locais. Cruzar com `locais-encerramento-19h.csv`, incluindo os 818 locais mistos. Explicar por que só cerca de 1,3% das seções ficaram abertas.
2. Corrigir no doc 02 (cabe ao autor): o sinal (+0,26), o "+0,10" (substituir pelos números do 1º turno completo e pela medida uniforme), o exemplo do SIM, o "1.025" (723 com SIM), o "2.900–3.300" (3.433), o "log = BU" e a leitura "declaração desmentida".
3. `tempo-extensao.mjs`: trocar a abertura do primário por `abrirLeitura()` e passar a seção a `lerLogs` em `tempo-logs-tardios.mjs`.
4. Refazer o placebo de composição do 1º turno (+0,70 p.p.) com as 28 UFs; hoje é parcial.
5. Resíduo de cerca de 250 votos sem biometria acima do placebo às 17h: ver se ele se concentra em seção, mesário ou município.
6. O relógio individual da urna (atrasado) não é testável com estes arquivos. Precisa de um relógio externo (horário de transmissão no primeiro recebimento, que o campo atual não dá).
7. Registrar em `hipoteses.md` (só o coordenador) que a contagem de 34.066 exclui as urnas de reserva e a de 34.330 as inclui.

## Comandos que reproduzem a revisão

```
# lente reprodução
node scripts/auditoria/cetico-h06-reproducao.mjs
node scripts/auditoria/cetico-h06-reproducao-logs.mjs
node scripts/auditoria/cetico-h06-reproducao-logs-resumo.mjs
node scripts/auditoria/cetico-h06-reproducao-did.mjs
node scripts/auditoria/cetico-h06-reproducao-did-tardios.mjs
# lente definições
node scripts/auditoria/cetico-h06-dados-logs.mjs
node scripts/auditoria/cetico-h06-dados-banco.mjs
node scripts/auditoria/cetico-h06-dados-turnos.mjs
# lente alternativas
node scripts/auditoria/cetico-h06-alternativas.mjs
node scripts/auditoria/cetico-h06-alternativas-logs.mjs
node scripts/auditoria/cetico-h06-confusao.mjs
node scripts/auditoria/cetico-h06-relogio.mjs
# consolidação (este parecer)
node scripts/auditoria/cetico-h06-consolidacao-duracao.mjs     # placebo de duração, 29.854 seções, ~12 min
node scripts/auditoria/cetico-h06-consolidacao-governador.mjs  # margem de governador × votos tardios
node scripts/auditoria/cetico-h06-consolidacao-dialogo.mjs     # 1.025 / 895 / 723 / 130 / 524 / 16 / 3.339 / 3.433
sha256sum data/raw/stf/rcl-101673-zanin-25out26.pdf
```

As saídas ficam em `data/parsed/auditoria/cetico/h06-*.json`; as da consolidação são `h06-consolidacao-duracao.json`, `h06-consolidacao-governador.json` e `h06-consolidacao-dialogo.json`. O script do diálogo lê `data/parsed/auditoria/tempo/2t/logs-tardios.jsonl` (campos `encerrarSelecionado`, `todasVotaram`, `encerramentoConfirmado` e `tardiosAposPausa30min`, em segundos de Brasília).

## Errata: gerador aleatório (29/10/2026)

`cetico-h06-alternativas.mjs` e `cetico-h06-confusao.mjs` usavam o gerador `(semente * 1103515245 + 12345) % 2 ** 31`, que perde precisão no double: entra num ciclo de 10.466 valores, e 99,6% dos estados são pares (conferido com as duas sementes). Só os erros-padrão por bootstrap, os z, os IC95 e o MDE dependiam dele; as diferenças, as inclinações e o erro-padrão sanduíche das inclinações não dependem. O gerador foi trocado por mulberry32, com a mesma semente, e os dois scripts rodaram de novo. As saídas antigas estão em `data/parsed/auditoria/cetico/antes-gerador/`. Para separar o efeito do gerador do efeito do dado (as saídas antigas leram a cópia `eleicao2026-20261029T092711`, com o 1º turno parcial em 22 UFs), rodei também o gerador novo sobre essa cópia antiga.

| Número citado neste parecer | Antes | Depois | Causa |
|---|---|---|---|
| Erro-padrão entre zonas do +0,26 p.p. (problema 1) | 0,055 a 0,063 | **0,053 a 0,056** (z de 4,7 a 4,9) | gerador: o 0,063 vinha dele (alternativas A e confusão, z 4,13 e 4,14). O 0,055 e o IC95 de +0,15 a +0,37 são da lente de reprodução e não mudam. |
| Placebo do 1º turno, seções com voto tardio no próprio 1º turno, dentro da zona (explicações alternativas e pendência 4) | +0,70 p.p., **parcial, 22 UFs** | **+0,90 p.p.** (erro-padrão 0,059; z 15,3; 5.835 zonas; 221.938 seções com voto tardio no 1º turno; 28 UFs) | dado completo, não o gerador: com o gerador novo na cópia antiga, continua +0,704 (erro-padrão 0,081). |

Não citados aqui, mas corrigidos nas saídas: o gerador velho subestimava o erro-padrão nos estratos de zona × faixa de tamanho. O z do 2º turno com controle de tamanho cai de 17,27 para 6,76 (erro-padrão 0,019 → 0,048). O da diferença de diferenças com controle de tamanho cai de 14,42 para 7,94 (0,008 → 0,014). O do placebo do 1º turno com controle de tamanho cai de 92,12 para 39,08 (0,020 → 0,047). O MDE do teste do autor passa de 0,39 para 0,33 da fração dos tardios. Todos continuam longe de zero, no mesmo sentido.

**O veredito não muda** (sustentado com ressalvas). O placebo completo é maior que o parcial, o que reforça a leitura de composição da seção para o +0,26 p.p. A pendência 4 fica feita por `node scripts/auditoria/cetico-h06-confusao.mjs` (`placebo_t1_tardio1_zona`, cópia `eleicao2026-20261029T105000`).
