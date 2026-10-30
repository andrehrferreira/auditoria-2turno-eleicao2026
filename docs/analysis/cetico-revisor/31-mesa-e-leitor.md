# 31. Parecer: H15/H17 (mesa) e H05 (falha do leitor de digital)

Achados revisados:

- **A. H15 e H17:** [estatistico-eleitoral/09-h15-h17-mesa.md](../estatistico-eleitoral/09-h15-h17-mesa.md), scripts `estatistico-h15-h17-*.mjs` (commit fe2133a), saídas em `data/parsed/auditoria/h15-h17/`.
- **B. H05, falha do leitor:** [estatistico-eleitoral/08-h05-falha-do-leitor.md](../estatistico-eleitoral/08-h05-falha-do-leitor.md), scripts `estatistico-h05-leitor*.mjs` (commit 9a31f38), saídas em `data/parsed/auditoria/estatistico-eleitoral/`.

Data: 30/10/2026. Base: cópia de leitura `eleicao2026-20261029T105000` (28 UFs nos dois turnos). Rótulos: **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**.

## Resposta curta

- **Os números dos dois documentos se reproduzem exatamente.** Rodei de novo as duas análises. Os arquivos de saída saíram iguais aos do autor, salvo a data e o tempo de execução. Depois devolvi os arquivos originais.
- **A. H15 (votos em bloco no lugar de ausentes): "sem sinal" se sustenta, mas a absolvição é estreita.**
  - O teste só vê um tipo de bloco: votos **seguidos**, liberados pelo **mesmo mesário registrado**, em ritmo **quase de máquina** e de **10 votos ou mais**.
  - Essa via cobre só 36% dos votos sem digital do 2º turno. Os outros 64% são liberados por ano de nascimento ou por digital não associada a mesário. Por essas vias, a bandeira H15 **não pode acender**: a regra exige mesário registrado.
  - Para essas vias, fiz o teste pareado que faltava: 34 seções só no 2º turno contra 39 só no 1º (p = 0,64). Não há excesso no 2º turno. Mas esse teste acha um bloco de 10 votos em só 18% das seções.
  - O "poder de 78%" foi medido com um bloco mais regular que **qualquer** sequência real sinalizada. O ritmo de uma pessoa fazendo o bloco à mão não foi simulado.
  - Por isso, a frase "cabem no máximo ~180 votos" não pode ir para a perícia.
- **A. H17 (supressão e roubo de voto na mesa): os números se sustentam. A bandeira por seção tem um ponto cego, e o caso do PR é mais forte do que o documento diz.**
  - Das 16 seções que passam o primeiro critério no 2º turno, 13 não podem ser julgadas pela "concentração num mesário": a liberação anterior não tem mesário gravado. Então "nenhuma passa" é, em boa parte, efeito da regra.
  - No 1º turno, 9 seções passam a regra completa, e o documento não diz isso. Uma delas é a própria **PR 78573/0083/0101**. Ela é a única das 9 que continua anômala com a taxa da própria seção.
  - No 2º turno, as 19 liberações manuais dessa seção foram autorizadas por digitais que a urna **não associou a nenhum mesário registrado**.
- **B. H05 (falha do leitor): os números se sustentam. Três leituras precisam de correção.**
  - (1) O controle M1 quase não acompanha a troca de categoria (correlação 0,07 no Brasil). Por isso, o "não explica" do M1 é quase garantido pela construção do teste.
  - (2) O sobrecontrole M2 é, na prática, o modelo sem o canal "liberado sem digital": a reclassificação registrada e o Δ "por biografia" têm correlação de 0,99. O que sobra no d do M2 é o canal "ano de nascimento".
  - (3) A "reclassificação mínima" não é mínimo, mas **também não é teto**. Ela não limita nada, em nenhum sentido.
  - O gráfico desenha dois pontos fora da escala na borda, como se valessem ±0,12.

## Como reproduzir

```sh
# A: análise do estatístico (16 s; reescreve resumo.json etc.; o diff contra o original só muda geradoEm/segundos)
node --max-old-space-size=12000 scripts/auditoria/estatistico-h15-h17-analise.mjs
# B: análise do estatístico (45 s; o diff contra o original só muda geradoEm)
node --max-old-space-size=6144 scripts/auditoria/estatistico-h05-leitor.mjs
# hash do pré-registro, recalculado sobre o documento atual
node -e "import('./scripts/auditoria/estatistico-h15-h17-varrer.mjs').then(async m=>console.log(await m.hashPreRegistro()))"
# checagens deste parecer (21 s): poder por via de liberação, RunA pareado, última hora, balde das 17h, M2 separado
node --max-old-space-size=8192 scripts/auditoria/cetico-31-mesa-e-leitor.mjs
#   saída: data/parsed/auditoria/cetico-revisor/31-mesa-e-leitor.json
# bruto
node scripts/auditoria/estatistico-h15-h17-bruto.mjs --secao pr/78573/0083/0101 --filtro "já votou|Identificador digitado|computado|habilit|Digital coletada|Ano de nascimento|Dado digitado"
node scripts/auditoria/estatistico-h15-h17-bruto.mjs --secao pr/78573/0083/0101 --dia 04/10/2026 --votos
node scripts/auditoria/estatistico-h15-h17-bruto.mjs --secao sp/64017/0391/0164 --votos --de 08:25:00 --ate 09:30:00
node scripts/auditoria/estatistico-h15-h17-bruto.mjs --secao rj/60011/0008/0074 --votos --de 14:30:00 --ate 15:10:00
node scripts/auditoria/estatistico-h15-h17-bruto.mjs --secao sp/64017/0391/0164 --padroes   # atendimentos sem desfecho
node src/exportar.js --turno 2 --uf pr --municipio 78573 --zona 0083 --secao 0101 --log nao --stdout
node src/exportar.js --turno 1 --uf sp --municipio 64017 --zona 0391 --secao 0164 --log nao --stdout   # e --turno 2
```

---

## A. H15 e H17

### A1. Pré-registro com hash: **sustentado com ressalvas**

- **Fato:** o hash do bloco entre os marcadores no documento atual é `41d388e7…bd56f5a3`. É igual ao de `pre-registro.sha256`, ao de `resumo.json` e à primeira linha de `varredura.log`. O texto não mudou depois de gravado.
- **Ressalva 1:** o arquivo `pre-registro.sha256` tem data de 02:00:43. A varredura começou às 01:16: o MG terminou às 01:47:28 depois de 1.856 s. Ele foi regravado pela retomada lançada por engano, que o próprio documento cita. Ele prova que o bloco não mudou de 02:00 até a análise (03:12). Não prova que o bloco existia às 01:16.
- **Ressalva 2:** o bloco não foi para um commit antes do resultado. O primeiro commit do documento (fe2133a, 03:17) já traz os resultados. Um pré-registro só tem prova de data se for commitado ou tiver carimbo externo **antes** de rodar.
- **Ressalva 3 (operacional):** `varredura.log` tem linhas embaralhadas ("sp: 1036pr: 27142…"), porque dois processos escreveram nele ao mesmo tempo. Conferi o resultado pelo número de linhas: o SP tem 103.656 linhas, igual ao banco, e o total é 499.207, também igual ao banco.
- **Recomendação:** commitar o pré-registro antes de rodar a varredura.

### A2. "H15 sem sinal: 24 no 2º turno × 20 no 1º, p = 0,76": **sustentado com ressalvas**

- **Reproduzido (Fato):** 23 seções só no 2º turno, 20 só no 1º, 0 nos dois. McNemar p = 0,7608. Limite superior de 95% do excesso: 13,79 seções.
- **O que o teste não vê** (absolvição falsa possível):
  - A bandeira exige "mesmo título" (S3). Por isso, **só vale para liberações com mesário registrado**. No 2º turno, as vias de liberação sem digital foram:

    | Via | Votos | Parcela |
    |---|---:|---:|
    | Ano de nascimento (eleitor sem biometria cadastrada) | 7.632.421 | 47% |
    | Manual com mesário registrado | 5.841.108 | **36%** |
    | Manual com digital não associada a mesário | 2.791.363 | 17% |

    Fonte: `resumo.json`, `turno2.classes`.
  - A via mais barata para um bloco de ausentes é o **ano de nascimento**. Ela não pede digital nenhuma, nem 4 capturas, e não grava quem liberou. Por essa via, a bandeira H15 nunca acende.
  - O teste secundário RunA (sequência sem digital, qualquer via) vê essa via. O documento dá só contagens soltas (39 × 39). **Fiz o pareamento (exploratório, Fato):** RunA com S1 ∧ S2, 34 seções só no 2º turno × 39 só no 1º, 0 nas duas, p = 0,64. Não há excesso no 2º turno.
  - **Poder do RunA (meu cálculo, analítico):** bloco de k votos sem mesário registrado, no fim do dia, com a fórmula de sequência da própria varredura. O critério S1 acende em:

    | Bloco | Seções em que S1 acende |
    |---|---:|
    | 5 votos | 0% |
    | 10 votos | **18,5%** |
    | 20 votos | 94,2% |

    Isto vale só para o S1; o ritmo (S2) só pode baixar estes números. Com 13% dos votos sem digital numa seção típica, 10 seguidos sem digital acontecem por acaso com frequência demais para o limiar corrigido.
  - **Bloco intercalado** (um voto de ausente entre eleitores reais, ao longo do dia): poder zero por construção. Nenhum teste do documento olha isso.
- **Argumento que eu recuso:** "um bloco no lugar de ausentes teria de ser feito de manhã, antes de se saber quem falta" (sobre as 16 sequências das 8h). Quem frauda pode escolher ausentes **conhecidos**, como quem não votou no 1º turno, mortos ou mudados. Não precisa esperar o fim do dia. O horário não absolve. O pré-registro diz isso ("fim do dia não é exigido"), mas o texto do resultado usa o horário como argumento.
- **Veredito:** o número se sustenta. "Sem sinal" vale para blocos contíguos de 10 ou mais votos do mesmo mesário registrado, e, com poder baixo, para blocos de 10 a 20 pelas outras vias.

### A3. "Poder: bloco regular de 10 detectado em 77,9%, de 20 em 99,7%": **sustentado com ressalvas**

- **Reproduzido (Fato):**

  | Bloco | S1 ∧ S2 |
  |---|---:|
  | 10 regular | 0,7794 |
  | 20 regular | 0,9973 |
  | 10 disfarçado | 0,0154 |
  | 20 disfarçado | 0,0424 |
  | 5 regular | 0,00013 |

- **Onde o bloco foi inserido:** depois do último voto do dia, com o mesário que mais liberou na seção, em cada uma das 499.178 seções do 2º turno.
  - A posição não importa para S1 e S2: eles não usam a hora.
  - O mesário importa. Com um mesário **novo**, o poder do S1 sobe para 99,4% (k = 10), no meu cálculo analítico. A escolha do autor é a conservadora, e isso está certo.
- **O bloco "regular" é mais regular que qualquer caso real.**
  - O bloco simulado tem intervalos de 60 s ± 10%, uniformes. Isso dá um coeficiente de variação (CV, o desvio dos intervalos dividido pela média) de cerca de 0,06.
  - As 24 sequências reais sinalizadas no 2º turno têm CV de 0,07 a 0,40, com mediana 0,17. As 20 do 1º turno vão de 0,10 a 0,28.
  - Uma pessoa liberando à mão, com 4 capturas por eleitor, fica nessa faixa. É o caso de SP 64017/0391/0164, com CV 0,27 e p do ritmo 0,016.
  - O poder para esse ritmo humano **não foi medido**. Fica entre 1,5% (disfarçado) e 78% (regular).
- **Por isso, o "efeito compatível" ("no máximo ~18 seções com bloco de 10, ~180 votos") vale só para o bloco quase mecânico.**
  - Com o poder do bloco disfarçado (1,5%), o mesmo cálculo dá 13,8 ÷ 0,015 ≈ 900 seções com bloco de 10.
  - O pareamento exploratório só com S1 (50 × 85) é o argumento mais forte contra blocos de 10 ou mais do mesmo mesário registrado, em qualquer ritmo. Mas não é confirmatório.
- **Recomendação:** refazer a simulação com o ritmo tirado das sequências manuais reais da própria seção (as 4 capturas) e com blocos por ano de nascimento.

### A4. "Excesso de comparecimento +5,0 contra +20 esperado": **sustentado como número; a leitura é Hipótese**

- **Reproduzido (Fato):** média de +4,991 (IC 95% de 1,906 a 8,077) nas 24 seções. A sequência média tem 20,33 votos. A média de todas as seções é +0,146.
- **A conta não exclui uma mistura.**
  - Se só parte das 24 fosse bloco inserido, cada uma com cerca de 20 votos, a média seria 20 × fração + base.
  - Com a base do controle do 1º turno (+3,7) e o teto do IC (+8,1), cabem até cerca de 20% das 24 (umas 5 seções).
  - "O excesso é do tipo de seção, não do bloco" é **Hipótese** plausível, não Fato.
- **Caso conferido no bruto: SP 64017/0391/0164.** É o único das 7 em que o excesso (+20,4) é igual à sequência (20).

  | | 1º turno | 2º turno |
  |---|---|---|
  | Urna | 1668429 | 1668429 (a mesma) |
  | Comparecimento | 239 | 271 |
  | Por biometria / por biografia / sem biometria (BU bruto) | 101 / 135 / 3 | 213 / 54 / 4 |

  - O log do 2º turno mostra biometria normal até 08:38. Das 08:40 às 09:18 vêm 20 liberações seguidas do mesmo mesário, todas depois de 4 capturas, com 74 a 123 s do identificador ao voto. Às 09:19 a biometria volta.
  - **Rastro técnico a favor do leitor:** a mesma urna liberou 56% dos eleitores sem digital no 1º turno.
  - **Contra:** o excesso bate exatamente com o bloco.
  - Pelo princípio 8, o log não diz de quem é o dedo. Este é o caso em que o caderno de votação decide.
  - A recomendação 2 do documento (registro de manutenção do leitor) deve incluir esta seção com prioridade.

### A5. "Sem subida no fim do dia": **sustentado (com teste melhor) e uma correção no texto**

- **Meu teste (Fato).** Comparei, em cada seção, a parcela sem digital na **última hora com voto** com a das horas anteriores. Isso não depende do fuso nem da hora de fechamento:

  | Turno | Última hora com voto | Horas anteriores |
  |---|---|---|
  | 2º | 12,64% (787.713 de 6.229.601) | 12,69% |
  | 1º | 12,14% | 12,49% |

  Não há subida no fim do dia.
- **Correção no texto.** No gráfico por hora do relógio, o balde das **17h do 2º turno** tem **17,6%** sem digital (5.220 de 29.656 votos, em 26.210 seções), contra 12,8% às 16h.
  - O documento diz só que essas horas "variam mais". É uma subida, pequena em votos (cerca de 1.400 acima da parcela do dia).
  - Ela some na medida pela última hora da própria seção.
  - O texto deve dar o número em vez de "variam mais".

### A6. "H17-supressão sem sinal": **sustentado com ressalvas**

- **Reproduzido (Fato):**
  - atendimentos perdidos: 0,58% no 2º turno (805.368 de 139.310.955) e 0,88% no 1º;
  - C17.3: 497.515 seções, diferença −0,3155 ponto (IC −0,319 a −0,312);
  - conjunção: 67 → 31 → 19 → 0.
- **Ressalva 1:** cerca de 8,68 milhões de atendimentos por turno terminam "sem desfecho". Eles ficam fora de "perdidos".
  - Conferi o padrão no bruto em 4 seções (AL 28894/0031/0139, SP 64017/0391/0164, RJ 60011/0008/0074 e PR 78573/0083/0101): são "identificador inválido" (erro de digitação) e "justificativa recebida". São benignos e técnicos.
  - Mas não existe contagem nacional desses padrões. Fica **Pendente**.
- **Ressalva 2:** cancelamento não tem autor no log. A concentração por mesário só vale para suspensões, e o documento diz isso.

### A7. "'Já votou' depois de voto sem digital: razão 1,13 no 2º turno × 1,39 no 1º": **sustentado; a bandeira por seção tem ponto cego**

- **Reproduzido (Fato):**

  | | 2º turno | 1º turno |
  |---|---|---|
  | Razão de chances (IC 95%) | 1,128 (1,103 a 1,155) | 1,389 (1,359 a 1,421) |
  | Eventos depois de voto sem digital | 9.215 | 10.893 |
  | Excesso | 850 | 2.308 |

  - Razão 2º ÷ 1º = 0,81 (0,79 a 0,84).
  - O desenho com a seção como estrato está correto: as mesas que dão "já votou" depois de todo voto não criam sinal.
- **Nota de texto.** Os denominadores da tabela (15.884.094 votos sem digital no 2º turno) são só os das seções que têm as duas classes. É o certo para a razão de chances, mas fica 380.798 abaixo do total de votos sem digital (16.264.892). A tabela deve dizer isso.
- **"Consulta" (rajada de "já votou").**
  - A separação é razoável: 3 ou mais "já votou" entre dois votos (24.028 atendimentos no 2º turno).
  - A regra não usa tempo, ao contrário do texto do pré-registro, que fala do "padrão a cada ~10 s".
  - Uma consulta só tira o evento se vier logo depois do voto. Isso é raro e não muda o resultado.
- **Ponto cego da bandeira (Fato).**
  - Das 16 seções S1 do 2º turno, **13** têm os eventos depois de liberação sem mesário registrado. Nelas, a "concentração num mesário" não pode ser avaliada.
  - "Nenhuma passa a concentração" é, em boa parte, efeito da regra.
  - No 1º turno, 75 das 92 S1 estão nessa situação.
- **O que o documento não diz (Fato).** No 1º turno, **9 seções passam a conjunção completa** (S1 e concentração).
  - 8 delas têm o padrão da mesa que digita "já votou" depois de quase todo voto, inclusive depois de biometria. Com a taxa da própria seção, o p vai de 0,036 a 0,96.
  - A nona é a **PR 78573/0083/0101**: 4 de 4 eventos depois de liberações do mesmo mesário registrado. Com a taxa da própria seção, p = 2,6 × 10⁻⁷.

### A8. Caso PR 78573/0083/0101: **sustentado e reforçado**

Conferido no log bruto (os dois dias) e no BU bruto do 2º turno.

- **BU (Fato).**

  | | 1º turno | 2º turno |
  |---|---|---|
  | Urna | 2399070 (UE2022) | 2399070 (a mesma) |
  | Comparecimento | 284 | 296 |
  | Por biometria / por biografia / sem biometria | 258 / 19 / 7 | 270 / 19 / 7 |
  | Aptos | | 346 |

  O log do 2º turno bate com o BU: 270 por biometria, 19 manuais e 7 por ano de nascimento.
- **2º turno (Fato).**
  - Há 16 "já votou" logo depois de voto sem digital: 4 depois de voto por ano de nascimento e 12 depois de manual sem mesário registrado.
  - No atendimento seguinte, até 20 s depois do voto, 10 foram identificados pelo CPF e 6 pelo título. Nos 8 que medi, o intervalo foi de 9 a 16 s.
  - Há 0 depois dos 270 votos por biometria.
- **Novo (Fato).** As **19 liberações manuais** do 2º turno foram autorizadas por digitais que a urna não associou a nenhum mesário registrado.
  - Os mesários foram registrados às 07:13.
  - Às 08:06:59 e às 12:46:05, a urna "não encontrou a digital coletada em nenhum arquivo" e criou um arquivo novo.
  - As outras 17 liberações "batem com uma digital gravada após o registro inicial de mesário".
  - Ou seja, uma ou duas digitais fora do registro da mesa liberaram os 19 eleitores.
  - No 1º turno, as 18 liberações manuais foram de um único mesário registrado.
- **Hipóteses.**
  - **Benigna:** a mesa confere a habilitação logo depois do voto, e um mesário cuja digital não casou com o próprio registro libera os eleitores.
  - **De risco:** liberação feita por quem não está registrado como mesário, com conferência de que o voto "entrou".
  - O "já votou" mostra que o número digitado em seguida é de quem **já tinha votado**. É compatível com conferir o próprio eleitor recém-liberado. O log não grava o número.
- **Recomendação:** pedir a ata e o caderno de votação desta seção, para os dois turnos: quem liberou e a ordem das assinaturas. O padrão aparece nos dois turnos e, no 1º, passa a conjunção pré-declarada completa.

---

## B. H05: falha do leitor

### B1. "O leitor mudou de forma clara em 1.982 de 497.607 seções": **sustentado com ressalvas**

- **Reproduzido (Fato):**
  - 1.447 seções com leitor pior no 2º turno e 535 com leitor pior no 1º;
  - 491.169 normais;
  - 4.404 com urna trocada;
  - 14 sem leitura nos dois turnos;
  - 38 sem medida;
  - universo de 497.607 seções; 9 + 6 excluídas porque o log não bate com o BU.
- **Ressalva 1:** a contagem depende dos limiares declarados (z ≥ 3 e variação de 0,10). É um número "pelo critério", não um fato do leitor. Seções com menos de 10 reconhecidos num turno entram em "pior" por regra.
- **Ressalva 2 (princípio 8):** "leitor pior" é uma classificação do log, não uma causa benigna.
  - Exemplo: RJ 60011/0008/0074, mesma urna 1671293 nos dois turnos. A urna reconheceu 181 eleitores no 1º turno e 3 no 2º, com 269 liberações manuais.
  - Pela regra do script, ela cai em "pior no 2º". É a seção de liberação em massa já listada no doc 01 da hipótese de liberação pelo mesário.
  - Um leitor sabotado de propósito para justificar a liberação manual cai na mesma classe.

### B2. "Controlar a troca pelo leitor não muda SP (t = −5,58), PR (2,54) e Brasil (−0,0041)": **sustentado como número; a conclusão "não explica" é fraca por construção**

- **Reproduzido (Fato):**

  | Recorte | M0 | M1 | Só leitor normal |
  |---|---|---|---|
  | SP | −0,0163 (t −5,58) | −0,0163 (t −5,58) | |
  | PR | +0,0114 (2,74) | +0,0108 (2,54) | |
  | Brasil | −0,0039 (−2,60) | −0,0041 (−2,70) | −0,0050 (−2,85) |

  - Na família de 56 testes do M1, só SP passa (para o 13 e para o 22).
- **Por que o "não explica" do M1 diz pouco.**
  - O controle quase não acompanha a troca registrada: correlação de 0,07 no Brasil, −0,02 em SP e 0,14 no PR. Somar ao modelo uma variável quase sem relação com a troca não pode mudar d.
  - O estrato "só leitor normal" tem 98,7% das seções, então também não pode diferir do modelo sem controle.
  - Das três leituras, duas são quase garantidas pela construção. O documento reconhece isso em "força do controle", mas a "Resposta curta" e a "Leitura para a auditoria" falam como se fosse um teste forte.
- **A premissa "leitor ruim → mais liberação manual" vale entre seções, mas quase não vale entre os turnos da mesma seção (Fato).**
  - **Entre seções:** na tabela por faixa (UE2020), quem tem leitura na 1ª de 0,55 a 0,60 tem 12,1% de falha registrada; de 0,75 a 0,80, 5,9%.
  - **Entre turnos, na mesma seção:** nas 1.447 seções "pior no 2º", a leitura na 1ª caiu de 0,830 para 0,686, mas a falha registrada só foi de 7,08% para 7,69%.
  - A reclassificação esperada pelo leitor nessas seções (14.461) é 7,7 vezes a registrada (1.889).
- **Afirmação correta:** "a quebra de leitor medida pela leitura na 1ª tentativa é rara (0,4% das seções) e quase não se liga à troca de categoria; por isso não explica os sinais". A troca de categoria que acontece sem quebra de leitor fica **sem teste** no PR e no Brasil.

### B3. "Em SP, nem a troca de categoria toda (sobrecontrole M2) explica o sinal": **sustentado com ressalvas fortes**

- **Reproduzido (Fato):** o M2 em SP dá −0,149 (t −6,83).
- **O que o M2 mede (meu teste, Fato).** A reclassificação registrada R tem correlação de **0,994** com o Δ "por biografia" em SP, 0,995 no PR e 0,991 no Brasil.
  - Pôr R no modelo é, na prática, tirar o canal "liberado sem digital".
  - O d que sobra vem quase todo do canal "ano de nascimento" (eleitor **sem biometria cadastrada**), condicionado a uma variável quase colinear com outra do modelo.
  - Não é "o mesmo efeito, sem a troca de categoria". É outro alvo.
- **Teste mais limpo (exploratório, não pré-registrado).** O canal "ano de nascimento" **não pode** ser troca de categoria pelo leitor: quem não tem biometria cadastrada não passa pelo leitor. Regressão com os dois canais separados, sem R:

  | Recorte | Ano de nascimento − biometria | Por biografia − biometria |
  |---|---|---|
  | SP | −0,042 (t −2,51) | −0,014 (t −4,35) |
  | PR | +0,192 (t 3,52) | +0,010 (t 2,51) |
  | Brasil | +0,009 (t 0,86) | −0,0049 (t −3,49) |

  - Em SP, o canal imune à troca de categoria aponta para o mesmo lado (22). Isso apoia a conclusão do autor por um caminho que não depende do M2.
  - No PR, o canal "ano de nascimento" aponta forte para o 13, mas com só +3.000 eleitores de Δ. Isso merece cuidado: é um teste fora da família.
- **Leitura:** "a troca de categoria sai da lista de explicações para SP" se sustenta, com o apoio do teste separado. A frase do documento deve trocar "nem a troca de categoria toda (sobrecontrole) explica" por "o canal sem biometria cadastrada, que o leitor não afeta, aponta para o mesmo lado".
- **Nota de código:** o comentário de `prepararBiometria` em `estatistico-lib.mjs` chama `dpg` de "liberado por ano de nascimento". `pg` é "por biografia", a liberação manual depois de 4 capturas. Conferi no BU bruto do PR: 19 por biografia = 19 manuais no log. O código usa o campo certo; só o comentário está trocado.

### B4. "A leitura na 1ª tentativa entre reconhecidos é imune à brecha": **sustentado na parte mecânica**

- **Fato:** uma liberação pela brecha ("digital não reconhecida") entra como manual, e só depois de 4 capturas. Das 16.974.708 liberações manuais, só 3 têm menos de 4. Ela não entra nem no numerador nem no denominador da leitura na 1ª. Uma **inserção** pela brecha não move essa medida.
- **Ressalva:** a medida não é imune a uma **degradação** do leitor, como sujeira, mau contato ou sabotagem para justificar liberação em massa, nem à composição de quem veio. Nesses casos, o M1 trataria a degradação como "falha do leitor", ou seja, como benigna. Para o resultado, isso não importa (o M1 não mudou d). Importa para o texto: "pior no 2º" não é absolvição.

### B5. Correção ao parecer 27: "a 'reclassificação mínima' (72.416 no PR) é teto grosseiro, não mínimo": **"não é mínimo" sustentado; "é teto" refutado**

- **Reproduzido (Fato):** 1.047.500 no Brasil e 72.416 no PR. 1.017.231 delas estão em seções de leitor normal.
- **Não é limite em nenhum sentido.** Numa seção, entre os turnos:
  - Δpor biometria = (chegaram com digital) − (saíram com digital) − X + Y;
  - Δsem = (chegaram sem) − (saíram sem) + X − Y;
  - X e Y são os mesmos eleitores trocando de categoria, num sentido e no outro.

  Com chegadas e saídas livres, a conta min(|Δpb|, |Δsem|) pode ficar abaixo ou acima de X − Y.
  - **Exemplo 1:** X = 50 trocas, com 60 chegadas com digital. Dá Δpb = +10 e Δsem = +50, mesmo sinal, e a conta dá 0 (abaixo de 50).
  - **Exemplo 2:** X = 0, com 30 saídas com digital e 30 chegadas sem digital. A conta dá 30 (acima de 0).
- **O argumento "97% em seções de leitor normal" também não prova o ponto.** Essas seções são 98,7% do total, então 97% é o que se espera em qualquer caso. Por seção, a conta dá 3,97 nas "pior no 2º" e 2,07 nas normais, ou seja, é **maior** onde o leitor piorou. E o mesmo eleitor pode trocar de categoria sem o leitor mudar (dedo, dia).
- **Afirmação correta:** "a 'reclassificação mínima' do parecer 27 é uma soma de mudanças que se compensam, misturando eleitores diferentes. Não é mínimo nem teto da reclassificação e não deve ser citada como tamanho dela." Este parecer corrige o parecer 27 nesse ponto.

### B6. "16.974.708 liberações manuais com as 4 tentativas (3 exceções)": **sustentado como contagem**

- **Reproduzido (Fato):** 16.974.708 com 4 capturas e 3 com menos. Há 0 reconhecidos sem pedido de digital e 0 acima de 4 tentativas.
- Reconhecidos por tentativa:

  | 1ª | 2ª | 3ª | 4ª |
  |---:|---:|---:|---:|
  | 165.733.213 | 35.256.554 | 14.364.277 | 6.267.043 |

- **Universo:** as 497.897 seções lidas (todas, menos o exterior), com o dia de votação de cada turno.
  - Inclui as 15 seções cujo log não bate com o BU.
  - Para o 1º turno, o dia vem do pacote do 2º turno quando ele bate com o BU; se não bate, vem do pacote do 1º turno.
- **Não conferi** as 3 exceções no bruto. Elas não mudam a afirmação ("quase toda liberação manual vem depois de 4 capturas"). Mas, para a perícia, é melhor citá-las depois de conferidas.

### B7. Gráfico com eixo cortado: **aceitável em princípio, defeituoso como está**

- **O corte em ±0,12 se justifica.** A comparação central (M0 × M1) fica na faixa de ±0,02, e os intervalos do M2 vão até ±0,45. O corte foi escolhido depois de ver os dados (comentário no código, fora do pré-registro). Para um gráfico de apresentação, com os valores escritos ao lado, isso é aceitável.
- **Defeito 1 (Fato).** Os **pontos** fora da escala são desenhados na borda.
  - O ponto laranja de SP (−0,149) aparece em −0,12.
  - O de MG trocadas (+0,235) aparece em +0,12.
  - Só o traço do intervalo leva o aviso "cortado". A nota de rodapé fala de "traços cortados", não de pontos.
  - Quem olha o desenho lê um valor errado.
- **Defeito 2.** O eixo não tem título com unidade. As regras da perícia pedem eixo com unidade.
- **Recomendação:**
  - marcar o ponto fora da escala com seta ou marcador vazado, ou pôr o M2 em painel próprio;
  - dar título ao eixo, por exemplo "d: diferença na fração de votos para o 13 (0,01 = 1 ponto percentual)".
  - Não usar este gráfico na perícia antes disso.

---

## Afirmações revisadas para a perícia

Só o que tem universo completo e foi conferido. Testes e estimativas ficam como **Pendente**, sem número.

1. **Fato (H05, B6):** em todas as seções do Brasil fora do exterior (497.897), nos dias de votação dos dois turnos, os logs registram 16.974.708 votos liberados pelo mesário depois de a digital não ser reconhecida. Destes, 16.974.705 tiveram 4 capturas de digital registradas antes da liberação, e 3 tiveram menos (ainda não conferidas no bruto). A urna registra cada liberação manual. O log não diz de quem é o dedo.
2. **Fato (H15/H17, PR 78573/0083/0101), conferido no log e no BU brutos:**
   - No 2º turno, em 16 dos 26 votos sem digital, o atendimento seguinte, até 20 s depois, termina em "o eleitor já votou". Isso não acontece depois de nenhum dos 270 votos por biometria.
   - As 19 liberações manuais desse dia foram autorizadas por digitais que a urna não associou a nenhum mesário registrado.
   - No 1º turno, a mesma urna tem 4 casos assim, todos depois de liberações de um mesário registrado.
3. **Fato (H17, A6):** as contagens de atendimentos perdidos (805.368 de 139.310.955 no 2º turno; 1.206.250 de 136.390.914 no 1º) podem entrar com a definição do documento ("suspenso sem voto" ou "habilitação cancelada"). Precisam da nota de que os atendimentos "sem desfecho" ficam de fora.
4. **Pendente (sem número):**
   - H15: teste de votos em bloco, com o poder para ritmo humano e para blocos por ano de nascimento;
   - H17: razão de chances do "já votou" e efeito compatível;
   - H05: efeito da falha do leitor sobre o teste do eleitor a mais;
   - a "reclassificação" de qualquer tipo.
5. **Não usar na perícia:**
   - "no máximo ~180 votos em bloco";
   - "a reclassificação mínima é teto";
   - "a falha do leitor não explica nenhum sinal" como teste forte;
   - o gráfico `h05-leitor.svg` como está.

## Recomendações

1. **Estatístico (doc 09):**
   - commitar o pré-registro antes de rodar;
   - simular o poder com ritmo humano e com blocos por ano de nascimento e por manual sem mesário;
   - pôr no texto o RunA pareado (34 × 39);
   - pôr no texto as 9 seções do 1º turno que passam a bandeira H17 completa;
   - dizer que 13 das 16 do 2º turno não podem ser julgadas pela concentração;
   - dar o número das 17h (17,6%);
   - tirar o horário da manhã como argumento de absolvição.
2. **Estatístico (doc 08):**
   - reescrever a "Resposta curta" com a força real do M1;
   - trocar "teto grosseiro" por "não é limite";
   - mostrar o modelo com os canais separados como apoio ao resultado de SP;
   - corrigir o gráfico;
   - corrigir o comentário de `prepararBiometria`.
3. **Coordenador:**
   - pedir ata e caderno de votação dos dois turnos da PR 78573/0083/0101 (quem liberou e a ordem das assinaturas);
   - pedir o mesmo para a SP 64017/0391/0164, onde o excesso de comparecimento é igual ao bloco de 20.

## Pendente

- Contagem nacional dos padrões de atendimento "sem desfecho" (8,68 milhões por turno). Conferi só 4 seções.
- Conferência no bruto das 3 liberações manuais com menos de 4 capturas (H05).
- Origem dos 54 votos de diferença entre o log e o BU no 2º turno (já pendente no doc 09).

## Arquivos deste parecer

- `scripts/auditoria/cetico-31-mesa-e-leitor.mjs`: poder por via de liberação, RunA pareado, última hora com voto, balde das 17h e M2 com os canais separados.
- `data/parsed/auditoria/cetico-revisor/31-mesa-e-leitor.json`: saída do script.
- Nenhum documento de outro agente foi editado. As saídas das análises reproduzidas foram devolvidas ao estado original.
