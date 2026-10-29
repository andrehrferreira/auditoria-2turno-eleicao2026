# Tabela "urnas que fecharam até 17:00 deram Flávio +1,4 milhão" e o fuso horário

29/10/2026. Pedido do auditor: verificar se houve erro de contagem por causa dos fusos horários do Brasil.

## A afirmação que circula

Uma tabela, feita a partir dos BUs com ajuda do Grok, agrupa as seções pelo horário de encerramento:
- "até 17:00:00": 32.025 seções, Flávio +1.443.398;
- "de 17:01 em diante": Lula +5.844.932.

A partir daí, sugere que algo mudou depois das 17h.

## Fato: a tabela foi montada com o horário local da urna, sem converter para Brasília

O BU grava o horário no **relógio local** da urna (doc 06). A votação vai das 8h às 17h **de Brasília** em todo o país. Por isso as urnas de AC e do oeste do AM (−2 h) encerram às 15h locais, e as de AM, MS, MT, RO e RR (−1 h) às 16h locais. O fuso de cada município vem da tabela do Auditor C ([linha-do-tempo/01](../linha-do-tempo/01-fuso-horario.md)), tirada do relógio das próprias urnas.

`node scripts/encerramento-x-voto.mjs` (banco, 2º turno, 497.897 seções, sem o exterior):

| Faixa | (a) horário cru da urna | Seções fora do fuso de Brasília em (a) | (b) convertido para Brasília |
|---|---|---|---|
| até 17:00:00 | 32.025 seções; Flávio 4.433.690 × Lula 2.990.292 (Flávio +1.443.398) | **32.025 (todas)** | **0 seções** |
| 17:00:01–17:00:59 | 118.717; Flávio +305.070 | 1 | 125.624; Flávio +607.102 |
| 17:01–17:01:59 | 144.039; Lula +1.366.712 | 0 | 154.492; Lula +872.897 |
| 17:02–19:00 | 196.790; Lula +4.596.593 | 14 | 211.445; Lula +3.950.272 |
| após 19:00 | 6.326; Lula +186.697 | 7 | 6.336; Lula +185.467 |
| total | 497.897; Lula +4.401.534 | | 497.897; Lula +4.401.534 |

- A coluna (a) reproduz **exatamente** os números da tabela que circula (seções e votos de cada faixa).
- **O grupo "até 17:00:00" é inteiro de municípios fora do fuso de Brasília.** Convertendo o horário, nenhuma urna do país fechou antes das 17h de Brasília. Isso bate com o Auditor C, que achou o mesmo por outro caminho: a urna trava o encerramento antes das 17:00, e o mais cedo foi 17:00:09 ([linha-do-tempo/02](../linha-do-tempo/02-votos-apos-17h.md)).
- **A soma não muda:** Lula +4.401.534 nas 497.897 seções, o mesmo dos BUs e do resultado oficial (o exterior fica fora da tabela).

## Fato: depois da conversão, a diferença que sobra é de local, não de horário

Na tabela corrigida, as seções que fecharam no 1º minuto ainda dão Flávio à frente, e as que fecharam depois dão Lula. Para ver se isso é efeito do horário, a comparação foi feita dentro do **mesmo local de votação** (mesmo prédio).

- Há 47.266 locais com seções dos dois grupos.
- Dentro de cada um, a parcela do 13 entre os finalistas é **−0,02 ponto** nas seções que fecharam depois.
- O tamanho também é o mesmo: 256 votantes por seção nas que fecharam no 1º minuto, 260 nas que fecharam depois.

Portanto a diferença vem de **quais locais** demoraram mais para fechar (cidades grandes, com fila), e não do horário de encerramento.

## Conclusão

- **Não há erro de contagem por fuso.** A soma por seção e o total não dependem do horário; cada BU é fechado e assinado pela urna no encerramento.
- **O erro está na tabela que circula:** ela compara horários locais de fusos diferentes como se fossem o mesmo relógio.

## Pendente

- Revisão cética.
- Avaliar a entrada no relatório de perícia (tópico 3, linha do tempo, do Auditor C), seguindo a regra dos dois cálculos independentes. As duas contas que já existem são: 0 seção antes das 17h de Brasília (Auditor C e este script) e a coluna (a) igual à tabela de terceiros.

## Objeção do auditor: "não dá para provar que a urna segue o fuso local"

A tabela do Auditor C tira o fuso do próprio relógio da urna, o que tornaria o argumento circular. O teste abaixo usa um relógio que **não é o da urna**: a hora em que o servidor do TSE recebeu cada boletim (`DT_RECEBIMENTO_BU_HOR_TSE`, dados abertos, horário de Brasília). `node scripts/relogio-urna-x-tse.mjs`, 2º turno, todas as seções com as duas horas (exterior fora):

| Fuso do município | Seções | Atraso recebimento − encerramento gravado (min): p1 / p10 / mediana / p90 | Recebidos antes das 17h de Brasília | Encerramento mais cedo gravado pela urna | Recebimento mais cedo no TSE |
|---|---|---|---|---|---|
| Brasília | 465.850 | 122 / 155 / 205 / 238 | 0 | 17:00:09 | 17:05:10 |
| −1 h | 29.211 | **180** / 203 / 235 / 279 | 0 | **16:00:10** | 17:05:10 |
| −2 h | 2.826 | **239** / 262 / 295 / 333 | 0 | **15:00:13** | 17:05:10 |
| +1 h (Noronha) | 10 | 41 / 41 / 53 / 114 | 0 | 18:00:43 | 19:03:46 |

- **Correção (o primeiro texto desta seção estava errado):** eu tinha lido o deslocamento do p1 (+58 e +117 minutos) como prova de que a urna marca hora local. **Não é prova.** O recebimento no TSE só começa a ser registrado perto das 17h para todo o país, até para o exterior: o mais cedo da ZZ é 17:03:25 no 2º turno e 17:08:44 no 1º (`scripts/recebimento-exterior.mjs`), embora urnas na Ásia e na Europa fechem horas antes. Depois disso há outro represamento até as 19h, com a totalização suspensa pela prorrogação. Com recebimento represado, as duas hipóteses (urna em hora local, ou urna em Brasília fechando mais cedo) dão o mesmo padrão. **Fato:** o horário de recebimento dos dados abertos não serve para provar o fuso da urna.
- **Fato (configuração da urna, `scripts/trava-encerramento-fuso.mjs`):** a trava de encerramento gravada no log tem texto diferente por UF:

  | UF | Texto da trava | Vezes | Encerramento aceito mais cedo |
  |---|---|---|---|
  | AC | "após as **15:00:00** horas" | 106 | 15:00:13 |
  | RO | "após as **16:00:00** horas" | 105 | 16:00:17 |
  | ES | "após as **17:00:00** horas" | 135 | 17:00:12 |

  Cada urna foi carregada com a hora de fechamento do seu fuso, igual aos fusos oficiais. Isso ainda é o relógio da urna: não prova, com um relógio externo, se o AC votou das 6h às 15h locais (8h às 17h de Brasília) ou das 4h às 13h locais.
- **Pendente:** um relógio externo à urna para fechar a questão, por exemplo atas de mesa com horário, registros de fiscais com carimbo de tempo ou o horário de transmissão no sistema de transmissão de arquivos (C3, doc 07; só a pedido de entidade fiscalizadora).
- **O que não depende do relógio:**
  - a hora de encerramento não altera votos. A tabela que circula só reparte as mesmas seções em grupos; cada BU é fechado e assinado na urna, e a soma é igual ao oficial nas duas hipóteses;
  - o grupo "até 17:00" é exatamente o conjunto das UFs cuja trava não é 17:00 (AC, AM, MS, MT, RO, RR). Na hipótese de urna em Brasília, essas UFs teriam votado mais cedo que o resto do país, e o grupo continuaria sendo "essas UFs", não "um horário em que algo mudou";
  - dentro do mesmo local de votação, o horário de fechamento não muda o voto (−0,02 ponto).
