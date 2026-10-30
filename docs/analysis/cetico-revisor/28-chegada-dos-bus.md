# 28. Parecer: chegada dos BUs ao TSE × divulgação do 2º turno (H06, linha do tempo)

Achado revisado: [linha-do-tempo/06-chegada-dos-bus-e-divulgacao.md](../linha-do-tempo/06-chegada-dos-bus-e-divulgacao.md) (estatístico eleitoral, commit `af2efe3`), com os scripts `scripts/auditoria/estatistico-chegada-bu-aux.mjs`, `-dados.mjs` e `estatistico-chegada-bu.mjs`. Base anterior: `scripts/curva-totalizacao.mjs` e o [parecer 16](16-topico-8-virada.md). Revisão de 30/10/2026. Banco: cópia de leitura `eleicao2026-20261029T105000.sqlite` (dois turnos, 28 UFs cada).

Hipótese do André que motivou o estudo:

> "Às 19h, quando a divulgação foi liberada, mais de 90% dos BUs já tinham sido enviados ao TSE, mas foram liberados ao público de forma controlada, com variações e quedas impossíveis numa apuração aleatória."

**Universo: completo.** As 499.248 seções do 2º turno, que são as mesmas do 1º. As exclusões são as do autor, com contagem: 1.351 seções do exterior sem hora de fim e 43 sem voto no 13 nem no 22.

## Resposta curta

**Os números do autor reproduzem bit a bit.** Rodei os três scripts de novo. `secoes.csv`, `aux-horarios.csv`, os três CSVs do gráfico e o `resumo.json` saíram idênticos (md5). A única diferença é o campo `segundos` (tempo de execução).

| # | Afirmação | Veredito | Em uma linha |
|---|---|---|---|
| 1 | Fonte: `DT_RECEBIMENTO_BU_HOR_TSE`, 499.248 seções, hora de Brasília; aux igual em 96,0% | **Sustentado com ressalvas** | Os 4% que diferem se explicam: 7.741 diferem por até 2 s, 8.982 por menos de 1 h e 3.120 por mais de 1 h (3.109 deles com data do aux depois de 26/10). Usar o aux muda pouco: 1.887 seções recebidas antes das 19h, contra 1.909. O argumento do fuso no texto é fraco, mas a conclusão vale por outro motivo |
| 2 | Às 19h: 98,64% emitidos, 0,38% recebidos, parada de 17:10 a 19:03:37, lote de 5.651, degraus "iguais" aos do 1º turno | **Sustentado com ressalvas** | Os números reproduzem. Mas o "recebimento" é o **registro, em lotes, por um processo de capacidade limitada**, não a chegada. A fila ficou cheia do começo ao fim (19:03 a 21:09). O texto omite uma segunda parada (19:48 a 19:50) e exagera ao chamar os degraus de "iguais" aos do 1º turno |
| 3 | A totalização seguiu o recebimento | **Sustentado** | Reproduz: correlação de postos 0,999978, mediana de 24 s, nenhuma seção ultrapassada por outra recebida mais de 5 min depois. Só que isso vem **depois** do ponto em que uma ordem controlada poderia agir |
| 4 | Teste de liberação controlada (c2 por local; zona com z = −5,5) | **Sustentado com ressalvas** | O teste por local reproduz e tem poder contra reordenar seção a seção. O efeito na zona **some** quando se controla o fim da votação e a ordem do 1º turno (z = +1,17). A virada não tem efeito em nenhum nível. Ele não enxerga reordenação de lugares inteiros, e isso precisa vir escrito na resposta curta |
| 5 | Curvas iguais depois de 1,5%; embaralhando por local, p = 0,32; por UF, município e zona, p < 0,005 "por causa dos blocos do mesmo local" | **Sustentado com ressalvas; a explicação está incompleta** | Embaralhar **locais inteiros** dentro da zona ainda dá p = 0,005 (2º e 1º turnos): o que pesa é a ordem geográfica dos locais, em que o 22 chega antes. Em compensação, os saltos e as quedas da curva real são **comuns** em todos os embaralhamentos de lugares inteiros (p de 0,25 a 1). A parte "quedas impossíveis" cai com mais força do que o autor mostrou |
| 6 | Lote das 19:03: as UFs com mais 22 foram totalizadas antes (r = −0,41, p = 0,037) | **Sustentado como exploratório; não é próprio do 2º turno** | Reproduz (−0,40). Com o voto da UF **no 1º turno**, a correlação fica mais forte (−0,47). No primeiro lote do 1º turno, o sentido é o mesmo (−0,43 nas UFs com 20 seções ou mais). É uma propriedade estável das UFs, não uma escolha feita no 2º turno |
| 7 | Riscos: hora de envio, histórico do site, MT 90069 | **Sustentado; um erro e uma pendência resolvida** | Os 53 casos de MT não são todos de MT 90069 (35 em 90069, 13 em 90905 e 5 em 90921). A pendência se resolve: no 1º turno, o relógio dessas 78 urnas estava na hora de Brasília. Isso abre um ponto novo para a H06 do 1º turno (abaixo) |

**Sobre a hipótese do André, com o que os dados permitem dizer:**
- **"Às 19h, mais de 90% já existiam":** Fato. Às 19h, 98,64% dos BUs já tinham sido emitidos.
- **"...já tinham sido enviados ao TSE":** não se confirma nem se nega. Mas a leitura do autor ("nenhum ficou recebido e parado") é mais fraca do que parece. O registro de recebimento é feito por um processo em lotes e de vazão limitada. Às 19:03:37, 5.651 BUs foram registrados em 19 s (cerca de 300 por segundo). No minuto seguinte, a vazão era de cerca de 2 por segundo. Isso mostra que havia **BUs prontos à espera** em algum ponto antes do registro. Onde estavam (no TSE, nos TREs ou nos pontos de transmissão) os arquivos públicos não dizem.
- **"...liberados de forma controlada":** Fato no ritmo. A vazão foi limitada do começo ao fim, com degraus e duas paradas: 17:10–19:03 e 19:48–19:50. **Não há sinal** de que a ordem dependesse do voto da seção. Os testes alcançam a ordem dentro do local, a virada em todos os níveis e a ordem dentro da zona com controle de geografia. A ordem de **UFs e de lugares inteiros** não é testável contra uma escolha deliberada, só contra o 1º turno, que tem o mesmo sentido.
- **"...variações e quedas impossíveis numa apuração aleatória":** a premissa está errada, porque nenhuma apuração real é aleatória. O autor mostra isso e eu confirmo. Comparados com qualquer ordem aleatória de **lugares inteiros**, o maior salto e a maior queda do 2º turno são comuns.
- **Alcance (Fato):** a ordem de liberação não muda o resultado final. O total é a soma dos BUs, e o BU é igual ao resultado oficial nas 499.205 seções com voto do 2º turno ([parecer 18](18-h13-liberacao-reproducao.md)). Mesmo uma liberação controlada de verdade afetaria só **o que o público viu durante a apuração**, não a contagem.

---

## 1. Fonte e fuso

**Reprodução (Fato).** O campo do detalhe tem 499.248 linhas de Presidente por turno, 0 duplicadas, 0 sem recebimento e 0 sem totalização (`dados-resumo.json`). Os 499.248 aux.json existem (`aux-resumo.json`). Toda seção tem **exatamente 1 hash** no aux.

**Os 19.875 que diferem (Fato, `cetico-chegada-bu.mjs`, bloco 1):**

| Diferença aux − oficial | Status do hash no aux | Seções | Leitura |
|---|---|---:|---|
| até 2 s | Totalizado / Recebido | 7.671 / 70 | arredondamento entre dois sistemas |
| 2 s a 1 h, depois | Totalizado / Recebido | 1.429 / 7.553 | o aux guarda um registro posterior, quase sempre com status "Recebido" |
| mais de 1 h depois | Recebido | 3.120 | 3.109 com data do aux depois de 26/10 (até 2,83 dias): novo recebimento do BU depois da eleição |
| mais de 1 h antes | Recebido / Totalizado | 31 / 1 | 29 do exterior em 136 mais cedo |

- Nas seções em que o aux é diferente, o último hash nunca é igual à hora oficial (0 de 19.875). O aux mostra **um registro posterior que substituiu o primeiro**, e não o recebimento que entrou na totalização.
- Isso não mexe nos votos: o BU baixado é igual ao oficial em todas as seções com voto ([parecer 18](18-h13-liberacao-reproducao.md)). Também não mexe no estudo: com a hora do aux no lugar da oficial, seriam 1.887 seções recebidas antes das 19h, contra 1.909.
- **Risco aberto:** 10.774 seções têm, no aux publicado, o status "Recebido" (e não "Totalizado") num registro posterior à totalização, 3.109 delas dias depois. Os arquivos não dizem por que o BU foi recebido de novo. Ver Recomendações.

**Fuso.** O argumento do texto ("se o campo usasse a hora local, o AC teria recebido às 19:05") é circular, porque usa o próprio campo para dizer em que fuso ele está. O argumento que se sustenta é outro (Fato): o primeiro recebimento é **17:05:10, o mesmo segundo, em 15 UFs** com fusos diferentes (AC −2 h; AM, MT, RO e RR −1 h; DF, PA, PR, BA e outras 0). Nas outras 9 UFs com recebimento antes das 19h, o primeiro vem entre 17:05:21 e 17:07:01. Só um relógio único explica isso, e no DF ele é o de Brasília. No AC, a primeira emissão convertida para Brasília é 17:00:34, e o primeiro recebimento vem 4,6 min depois. **Conclusão do autor mantida.**

**Veredito: sustentado com ressalvas.** O texto deve trocar o argumento do fuso e explicar os 4% como acima.

## 2. O que existia às 19h, e o que é "recebimento"

**Reprodução (Fato):**
- emitidas até 19h: 98,64% das 497.897 seções do Brasil;
- recebidas: 1.909 (0,38%), sendo 1.870 até 17:10 e 39 registros de seções não instaladas do exterior;
- zero BU com voto recebido entre 17:10 e 19:03:37;
- 5.651 BUs com voto recebidos de 19:03:37 a 19:03:56;
- dos 491.127 BUs emitidos antes das 19h, 490.035 (99,78%) foram recebidos depois das 19h.

**"Recebimento" é hora de registro, não de chegada (Fato, por três sinais independentes):**
1. **Mesmo segundo em 15 UFs:** o primeiro recebimento é às 17:05:10 em 15 UFs de fusos diferentes, e até 17:07:01 em mais 9. Chegadas de 94 mil locais não começam juntas no mesmo segundo.
2. **Lotes por segundo:** nos patamares, a contagem por minuto é quase constante, mas a contagem por segundo vem em rajadas.
   - 2º turno, 19:30–19:40: 292 dos 600 segundos sem nenhum registro, até 190 registros num segundo, índice de dispersão (variância ÷ média) de 68.
   - 1º turno, 17:14–17:27: 675 de 780 segundos vazios, dispersão de 83.
   - Mesmo no 1º turno às 20:00–20:10, sem fila aparente, a dispersão é de 98.
   - O sistema registra em lotes nos dois turnos.
3. **Vazão com teto do começo ao fim no 2º turno** (`por-minuto.csv` do autor):

   | Período | Registros por minuto |
   |---|---|
   | 19:05–19:11 | cerca de 100 |
   | 19:12–19:13 | cerca de 210 |
   | 19:14–19:17 | cerca de 490 |
   | 19:18–19:23 | cerca de 960 |
   | 19:24–19:29 | cerca de 1.850 |
   | 19:30–19:47 | cerca de 2.800 |
   | **19:48–19:49** | **0** (parada; nenhuma totalização de 19:48 a 19:50) |
   | 19:53–19:58 | cerca de 3.800 |
   | 20:01–20:07 | cerca de 4.750 |
   | 20:10–20:21 | cerca de 5.290 |
   | 20:22–20:52 | cerca de 5.830 |
   | 20:53–21:09 | cerca de 5.400 |
   | 21:10 | 2.058, e a fila esvazia |

   Uma fila cheia nesse tempo todo quer dizer que **sempre houve BU esperando registro** entre 19:03 e 21:09.

**Ressalvas ao texto do autor (Fato):**
- **Parada omitida.** A parada de 19:48–19:50 não aparece no doc. Ela não coincide com mudança de sentido da curva: o 22 tinha passado à frente às 19:44 e continuou subindo depois (50,10% → 50,52% às 20:02).
- **"Os mesmos degraus" do 1º turno é exagero.** No 1º turno, a vazão começa em cerca de 470/min e sobe em passos de cerca de 480 a cada 6 min, até cerca de 2.880. Depois da pausa de 18:01–18:07, o teto deixa de aparecer: 1.898 a 6.304 por minuto, sem patamar. O 2º turno começa em cerca de 100/min, dobra a cada degrau até cerca de 1.850 e fica com teto até o fim. O que os dois turnos têm em comum é a cadência de cerca de 6 min e o registro em lotes.
- **Ordem de emissão (Fato).** Dentro da UF, a correlação de postos entre a hora de fim e a de recebimento tem mediana de **0,10** no 2º turno e **0,41** no 1º. No 2º turno, o registro quase não seguiu a ordem em que as urnas fecharam. Isso é o esperado se todos esperaram até as 19h. Também mostra que a ordem foi decidida **depois** da espera, num ponto que os arquivos não mostram.
- **O lote das 19:03 já tem a ordem de UFs do resto da noite.** DF teve 8,6% das seções da UF no lote, AM 6,5%, PA 5,0%, TO 4,8% e PB 4,6%. SP teve 0,02%, RJ 0,01% e SE nenhuma. O primeiro registro do SE foi às 19:34:10. O RJ só chegou a 1% das seções às 20:04:12, e o SE às 19:51:07. No 1º turno, o RJ também estava entre os últimos (mediana às 19:08).

**Isso muda a leitura da hipótese do André?** Em parte, sim. A frase do autor "nenhum ficou recebido e parado esperando liberação" é verdadeira só na definição do campo. Pelos três sinais acima, existiu um estoque de BUs esperando antes do registro, liberado em vazão controlada. O doc diz isso no item b, mas a resposta curta ("O TSE registra como recebidos só 0,38%") deixa o leitor pensar que os outros 99,6% ainda não tinham chegado. O correto é: **não se sabe onde estavam; sabe-se que havia uma fila.**

**Veredito: sustentado com ressalvas** (números certos; leitura do campo e omissão da parada a corrigir).

## 3. Totalização × recebimento

**Reprodução (Fato):** correlação de postos de 0,999978; 238.232.694 pares invertidos de 123.631.771.064 (0,19%); 2.721 seções ultrapassadas por outra recebida mais de 60 s depois; 0 por recebida mais de 5 min depois; mediana de 24 s (p99 de 61 s). O máximo, 6.755 s, é registro de seção não instalada do exterior. Bug de leitura: nenhum (as colunas `DT_RECEBIMENTO_BU_HOR_TSE` e `DT_PRIM_TOT_PARCIAL_HOR_TSE` são lidas pelo nome; 0 linhas sem valor).

**Limite (método):** os dois horários parecem marcados pela mesma cadeia de processamento. Que um siga o outro mostra que nada foi represado **entre** o registro e a totalização. Não diz nada sobre a ordem **antes** do registro, que é onde uma liberação controlada agiria.

**Veredito: sustentado.**

## 4. O teste de liberação controlada

**Reprodução (Fato):** os 10 testes da tabela c reproduzem com os mesmos coeficientes e z. Por local, −0,04 min por 10 p.p. de 22 (z = −1,37); por zona, −0,70 (z = −5,54); base do 1º turno por local, −0,67 (z = −9,08). O poder com efeito injetado também reproduz (15 s → z = 7,1).

**Explicações alternativas testadas (`cetico-chegada-bu.mjs`, bloco 4):**

| Teste novo | Coeficiente por 10 p.p. de 22 | z | Leitura |
|---|---|---|---|
| 1º turno, dentro do local, com o fim da votação | +0,04 min | +0,67 | o z = −9,08 do 1º turno **some**: as seções com mais 22 fecharam antes (fila menor). A frase do autor "mesmo assim não é sinal de nada" agora tem teste |
| 2º turno, dentro da zona, com fim + recebimento no 1º turno | +0,14 min | +1,17 | o z = −5,54 **some**: o 22 chega antes onde as seções sempre chegam antes |
| idem, dentro do município | +0,23 min | +1,44 | idem |
| virada (p22 2T − p22 1T), dentro da zona / município / UF | −0,20 / +0,34 / +1,22 min | −1,16 / +0,93 / +1,45 | nenhuma dependência da mudança entre turnos, em nenhum nível |
| 2º turno, dentro da zona, com a parcela do 22 **do 1º turno** no lugar | −0,65 min | −5,29 | o voto antigo da seção prevê a ordem tão bem quanto o do dia: é geografia |

**Atenuação entre turnos (correlação de postos dentro da zona, hora de totalização × variável):**

| Variável | 2T | 1T |
|---|---|---|
| parcela do 22 | −0,051 | −0,105 |
| aptos | 0,001 | 0,231 |
| comparecimento | −0,004 | −0,049 |
| hora de fim | 0,086 | 0,343 |

Os efeitos que passavam pela hora de fechar (aptos, comparecimento) sumiram no 2º turno, porque todos esperaram até as 19h. O da parcela do 22 caiu à metade, e o controle de geografia o explica.

**Dentro do local (Fato):** no 2º turno, o recebimento segue o número da seção (correlação de postos de 0,19; no 1º turno, 0,03). Isso combina com BUs transmitidos ou processados em sequência de número depois da espera. Não combina com uma escolha pelo voto: o teste por local dá zero.

**O desenho é adequado?** Para uma liberação **seção a seção** guiada pelo voto, sim: é o melhor teste do estudo, com poder medido. **O que ele não enxerga:**
- **Reordenação de lugares inteiros** (locais, zonas, municípios, UFs). Contra ela só há a comparação com o 1º turno. Essa comparação é cega a uma ordem igual nos dois turnos ([parecer 16](16-topico-8-virada.md), defeito B), e o controle "recebimento no 1º turno" absorve exatamente essa ordem.
- **Ordem das UFs (Fato):** a correlação entre a mediana de recebimento da UF e a parcela do 22 é −0,28 (p = 0,16) no 2º turno e **−0,49 (p = 0,010)** no 1º. Com o tamanho da UF, é de +0,45 e +0,43. As UFs grandes e as do Nordeste chegam por último nos dois turnos. Com 27 pontos, não há como separar escolha de infraestrutura.
- **O que o site mostrou.** A "divulgação" foi medida pela hora de totalização, não pelos arquivos publicados (ver Pendente).
- **Poder contra reordenar locais dentro da zona:** não foi medido pelo autor. O teste por zona tem sinal, mas sua linha de base não é zero.

**Princípio 8:** nenhuma explicação aqui depende de pessoa. A explicação benigna ("fila de capacidade limitada") tem rastro técnico (lotes por segundo, patamares e paradas nos dois turnos), mas a **regra de atendimento da fila** não tem rastro público. "O TSE processou por ordem de chegada" é suposição, não teste.

**Veredito: sustentado com ressalvas.** O texto deve declarar na resposta curta que a ordem de lugares inteiros e de UFs não foi testada contra escolha deliberada.

## 5. Curvas e embaralhamento

**Reprodução (Fato):** totalização × recebimento com diferença máxima de 0,08 pp a partir de 1,5%. Embaralhamento por local: p = 0,3234, 13 pontos de 200 fora do leque, maior salto real de 0,17 pp (p = 0,83). Embaralhamento por UF, município e zona: p = 0,005 nos dois turnos. Gerador mulberry32 com semente fixa, como pedido no parecer 16.

**A explicação "blocos do mesmo local" (testada).** O autor diz que embaralhar dentro da zona dá p < 0,005 porque quebra os blocos de seções do mesmo local. Testei mantendo os blocos: troquei a hora mediana dos **locais inteiros** entre si dentro da zona, mantendo o espalhamento interno de cada local. Fiz o mesmo com locais dentro do município e da UF, e com zonas e municípios inteiros dentro da UF. Foram 200 réplicas (`cetico-chegada-bu.mjs`, bloco 5):

| Lugares inteiros trocados | 2T: p do desvio da curva | 2T: p do maior salto | 2T: p da maior queda | 1T: p do desvio | 1T: p da maior queda |
|---|---|---|---|---|---|
| locais dentro da zona | 0,005 (171 de 200 pontos fora) | 0,25 | 0,86 | 0,005 (199 fora) | 0,08 |
| locais dentro do município | 0,005 (116 fora) | 0,32 | 0,80 | 0,005 | 0,04 |
| locais dentro da UF | 0,005 | 0,88 | 1,00 | 0,005 | 0,28 |
| zonas dentro da UF | 0,005 | 1,00 | 0,68 | 0,005 | 0,04 |
| municípios dentro da UF | **0,31** (12 fora) | 1,00 | 0,75 | 0,005 | 0,08 |

Leitura:
- **A explicação do autor está incompleta (Fato).** Com os blocos preservados, a curva real ainda sai do leque, nos dois turnos e mais no 1º. O que falta é a ordem geográfica dos locais dentro da zona, em que o 22 chega antes. É o mesmo efeito do item 4, que o controle de geografia explica. Os blocos explicam o salto; a geografia explica o nível.
- **Os saltos e as quedas do 2º turno são comuns (Fato).** Em todas as trocas de lugares inteiros, o maior salto real (0,17 pp) e a maior queda real (−0,12 pp) ficam dentro do que a sorte produz (p de 0,25 a 1). No 1º turno, a maior queda (−0,16 pp) é **mais** rara (p de 0,04 a 0,28). Esse é o turno sem represamento.
- **"Variações e quedas impossíveis" está refutada** contra três referências: ordem aleatória dentro do local, ordem aleatória de lugares inteiros e o 1º turno.

**Veredito: sustentado com ressalvas** (números certos; explicação dos p < 0,005 corrigida).

## 6. O lote das 19:03

**Reprodução (Fato, `cetico-chegada-bu-lote.mjs`):** 5.651 seções, totalizadas de 19:03:53 a 19:05:07. Correlação de −0,40 entre a hora mediana da UF e a parcela do 22 (p = 0,042, com outra semente; o autor tem −0,41 e p = 0,037).

**Alternativa testada: é a ordem de sempre das UFs?**
- Usando a parcela do 22 da UF **no 1º turno**, que já se sabia antes do 2º: −0,47 (p = 0,014). Fica mais forte, não mais fraco.
- No primeiro lote do 1º turno, as primeiras 5.651 seções recebidas (17:08:57 a 17:22:05): −0,24 (p = 0,22) com as 26 UFs; **−0,43 (p = 0,045)** com as 22 UFs de 20 seções ou mais.
- A ordem das UFs dentro do lote não depende do tamanho no 2º turno (−0,05). No 1º, depende (−0,59).

**Leitura:** o mesmo sentido aparece no 1º turno, sem represamento, e o voto antigo da UF prevê melhor do que o do dia. É uma propriedade estável das UFs (Norte e Centro-Oeste antes, Nordeste depois), não uma seleção feita no 2º turno. Continua exploratório: o autor fez 44 testes, e o corte de Bonferroni (p < 0,0011) não é atingido.

**Veredito: sustentado como Hipótese exploratória**, com a nota de que não é próprio do 2º turno. Fica fora da perícia.

## 7. Riscos

- **Hora de envio e histórico do site:** os arquivos públicos não têm essas informações. Confirmo os dois limites.
- **MT, 1º turno, recebimento antes da emissão.** O texto diz "60 casos, 53 deles em MT 90069". Está errado na distribuição (Fato): são 35 em MT 90069 (Querência), 13 em MT 90905 e 5 em MT 90921. Os 53 são de MT, mas de três municípios. Os outros 7 casos estão no AM (2), MA, PA, PB, PR e RS (1 cada).
- **A pendência do fuso se resolve** (`cetico-chegada-bu-mt.mjs`, log do dia das 78 seções desses três municípios nos dois turnos). Pelo relógio da urna, "Gerando arquivo de resultado" × recebimento oficial:
  - lendo o relógio como hora local (−1 h, como no 2º turno), **55 das 78 seções** teriam o BU recebido pelo TSE antes de ser gerado, até 55,6 min antes. Isso é impossível;
  - lendo o relógio como **hora de Brasília**, nenhuma: a folga vai de 4,4 a 120,8 min;
  - no 2º turno, as mesmas urnas abriram às 07:00:01 local e as duas leituras são possíveis.

  **Fato:** só a leitura "relógio em Brasília no 1º turno" é possível. **Hipótese:** a carga do 1º turno nesses três municípios usou a hora de Brasília.
- **Consequência nova para a H06 do 1º turno (Hipótese a examinar).** Pelo relógio em Brasília, nessas 78 seções:
  - "Urna pronta" foi das **07:06:47** às 08:28:36;
  - houve **3 votos antes das 08:00** (MT 90069);
  - houve **842 votos depois das 17:00** (799 entre 17h e 18h e 43 depois das 18h, o último às 18:26:13), em 59 seções.

  No 2º turno, com o relógio na hora local, o último voto nessas seções foi às 17:02:06 de Brasília. A linha do tempo do 1º turno, que converte essas seções com −1 h (`fuso-municipio.csv` do 2º turno), conta essas seções errado em 1 h. Isso não é prova de nada sobre o voto. É hora de urna a corrigir antes de qualquer conta de "voto fora do horário" no 1º turno.

---

## Afirmação revisada, pronta para a perícia (só número completo e conferido)

> **Fato.** No 2º turno, às 19h de Brasília, 98,64% dos BUs do Brasil já tinham sido emitidos pelas urnas (491.127 das 497.897 seções com hora de emissão). O TSE tinha registrado como recebidos 1.909 BUs (0,38% das 499.248 seções). Todos os que tinham voto foram registrados até as 17:10. Das 17:10 às 19:03:37, o TSE não registrou nenhum BU com voto. Às 19:03:37 começou o registro: 5.651 BUs em 19 segundos e depois uma vazão limitada, que subiu em degraus e ficou no teto até as 21:09, com uma parada de 19:48 a 19:50. Dos BUs emitidos antes das 19h, 99,78% só foram registrados depois das 19h.
>
> **Fato.** Depois de registrado, cada BU entrou na totalização em 24 segundos (mediana). Nenhum foi ultrapassado por outro registrado mais de 5 minutos depois. A ordem em que o público recebeu os resultados é, portanto, a ordem de registro.
>
> **Fato.** O horário de "recebimento" do arquivo oficial é a hora em que o sistema do TSE registrou o BU, e não a hora em que o BU saiu da seção. O registro começou no mesmo segundo (17:05:10) em 15 UFs com fusos diferentes, e é feito em lotes. Os arquivos públicos não dizem onde os BUs esperaram, nem em que ordem a fila foi atendida.
>
> **Fato.** A ordem de liberação não muda o resultado final. O total é a soma dos BUs, e o BU é igual ao resultado oficial em todas as seções com voto.
>
> **Fato.** No 1º turno, sem prorrogação, o registro também foi feito em lotes e com degraus de vazão (17:14 a 18:01), com uma parada de 18:01 a 18:07.
>
> **Pendente (sem número):** se a ordem de registro dependeu do voto das seções. Os testes estatísticos estão em `docs/analysis/linha-do-tempo/06` e neste parecer e não entram na perícia.
>
> **Pendente (sem número):** o que o site de resultados mostrou minuto a minuto, onde os BUs esperaram entre 17:10 e 19:03 e a regra de atendimento da fila. Depende de arquivos que o TSE não publicou.

## Recomendações

1. **Ao autor** (no doc dele, não aqui):
   - trocar o argumento do fuso pelo do "mesmo segundo em 15 UFs";
   - explicar os 4% do aux com a tabela do item 1;
   - incluir a parada de 19:48–19:50;
   - trocar "os mesmos degraus" por "a mesma cadência";
   - na resposta curta, dizer que havia fila antes do registro e que a ordem de lugares inteiros e de UFs não foi testada contra escolha;
   - corrigir a explicação dos p < 0,005 (item 5);
   - corrigir "53 em MT 90069".
2. **À linha do tempo do 1º turno:** usar a hora de Brasília nas 78 seções de MT 90069, 90905 e 90921 e recontar votos antes das 8h e depois das 17h. Há 3 votos antes das 8h e 842 depois das 17h nessas seções, pela leitura que os dados permitem.
3. **Ao TSE**, além das recomendações do autor:
   - pedir os registros da fila de recepção (hora de chegada × hora de registro, por BU) e a regra de atendimento;
   - perguntar por que 10.774 seções têm, no aux publicado, um registro "Recebido" posterior à totalização (3.109 delas dias depois), e se o hash recebido depois é o mesmo que foi totalizado.

## Reprodução

```bash
# autor (saídas idênticas por md5, exceto o tempo de execução)
node scripts/auditoria/estatistico-chegada-bu-aux.mjs
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu-dados.mjs
node --max-old-space-size=8192 scripts/auditoria/estatistico-chegada-bu.mjs
# este parecer (saídas em data/parsed/auditoria/cetico-revisor/28-chegada-bu*.json)
node --max-old-space-size=8192 scripts/auditoria/cetico-chegada-bu.mjs --replicas 200   # ~6 min; blocos 1 a 6
node --max-old-space-size=4096 scripts/auditoria/cetico-chegada-bu-lote.mjs             # lote das 19:03 × 1º turno
node scripts/auditoria/cetico-chegada-bu-mt.mjs                                          # ~50 s; log das 78 seções de MT nos dois turnos
# conferência no bruto (1º turno, relógio da urna)
node src/exportar.js --turno 1 --uf mt --municipio 90069 --zona 0053 --secao 0113 --log dia --stdout
```

Na seção conferida no bruto, o log do 1º turno tem "Urna pronta" às 08:02:50, último voto às 17:49:55 e "Gerando arquivo de resultado" às 18:10:20 no relógio da urna. O recebimento oficial é às 19:03:50 de Brasília. Com o relógio lido como local, o BU teria sido recebido 6,5 min antes de ser gerado.
