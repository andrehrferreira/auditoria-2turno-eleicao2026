# 19. Parecer: H13 (voto dos liberados sem biometria), lente de poder

Revisado: [hipotese-liberacao-mesario/00-sintese.md](../hipotese-liberacao-mesario/00-sintese.md) e os métodos 02, 03 e 04. Revisão em 29/10/2026. A reprodução número a número está no parecer [18](18-h13-liberacao-reproducao.md). Este parecer pergunta outra coisa: **se houvesse fraude, estes métodos teriam visto?**

**Limite estrutural.** O voto é secreto. O log grava como o eleitor foi habilitado, não em quem votou, e o RDV não liga voto a eleitor. Por isso todo número abaixo é limite aritmético ou estimativa ecológica. Nenhum é observação do voto de um liberado.

**Princípio 8.** A liberação pelo mesário é uma brecha humana. Não aceito "o mesário conferiu o documento" como explicação. O que testo aqui é se a brecha, caso tivesse sido usada, deixaria marca nestes dados.

## Vereditos

| # | Afirmação | Veredito | Motivo em uma linha |
|---|---|---|---|
| 1 | NE, M2: 69,9% (L1) e 70,7% (L2) contra 69,2%; dif. −0,5 [−1,8; +0,8] e +0,8 [−0,5; +2,1] | **Sustentado com ressalvas** | Reproduz no `ecologico-tabela.csv`. A "dif." é contra o contrafactual da própria seção (70,4% em L1), não contra os 69,2% impressos ao lado. **Sem poder** para fraude pró-13 de 28 mil votos (z 0,71). |
| 2 | M1 sem perfil: +6,1 (contra todos) e +9,3 (contra biométricos) | **Sustentado** | Reproduz (+6,13 e +9,26). É uma comparação sem controle de perfil, não um teste de fraude. |
| 3 | Painel: f ≤ 1,4% (L1) e 1,7% (L2), poder de 80% para 1,6% e 2,1% | **Sustentado com ressalvas** | Os números batem. Mas a conversão "≈ 4.000 votos" do doc 04 está errada: 28.170 votos inseridos dão f = 2,6%. O painel também é cego para fraude difusa, fraude igual nos dois turnos e fraude igual em toda a zona. |
| 4 | Faixa 1,0–100,0% (L1) e 3,4–99,9% (L2); 1.811 seções forçadas contra 1.635 esperadas (1,11); 1º turno 1,20 | **Sustentado com ressalvas** | Brancos e nulos estão certos e os números reproduzem. A contagem de seções forçadas **não tem poder**: com a fraude simulada, a razão vai de 1,115 para 1,106. |
| 5 | Cópia de leitura com o 1º turno em 22 UFs (`secao`) e 20 (`perfil_log`) | **Não reproduzido (desatualizado)** | A cópia atual (`eleicao2026-20261029T105000.sqlite`) tem 28 UFs nos dois turnos, nas duas tabelas. O método 03 rodou na cópia `…T092711`, que era parcial. |
| 6 | BU bruto: BA 34290/0127/0335 e PR 79111/0086/0218 | **Sustentado** | Conferido no bruto: BU, RDV e log batem, e os mínimos forçados (221 no 13 e 88 no 22) também. |

## 1. Simulação de fraude (o teste de poder)

Script: `scripts/auditoria/cetico-liberacao-poder.mjs`. Saída: `data/parsed/auditoria/liberacao/cetico-poder.json` e o log `cetico-poder.stderr`.

```
node --max-old-space-size=8192 scripts/auditoria/cetico-liberacao-poder.mjs --reps 20 --semente 7
```

**Universo (Fato).** Todas as seções do Nordeste no 2º turno:

- 140.828 seções lidas, das quais 140.822 entram no método 02 e 140.643 no 03;
- 140.757 seções no painel entre turnos (04).

Os seis descartes do método 02 são seções em que o log diverge do BU, e os 185 do método 03 vêm do filtro de 20 votantes e do perfil. São os mesmos filtros dos métodos de origem. Não há amostra.

**Fraude sintética: voto inserido com liberação do mesário.** Numa seção sorteada, somo k ao comparecimento, a L1, a L2 (por biografia) e aos votos de um lado. O BU e o log continuam coerentes, como ficariam numa fraude real desse tipo. Depois refaço a estatística de cada método:

- **02:** conta as seções em que o limite inferior obriga votos num lado, contra o nulo de embaralhar a taxa de liberação dentro da zona (30 sorteios).
- **03 M2:** Goodman com efeito fixo de uf/município/zona e os controles de perfil. Ficam de fora `dInd` e `dQuil` e a soma das seções agregadas, por isso a linha de base dá +0,15 em vez de −0,49 (L1). Uso o **deslocamento** causado pela fraude, somado à estimativa publicada, e o erro-padrão do bootstrap do 03. O critério é Bonferroni sobre 4 (|z| > 2,50), aplicado ao corte do 2º turno e à variação entre turnos.
- **04:** Δmargem ~ ΔC + ΔL + E1 + BN1, com efeito fixo de zona e erro agrupado por município, como no original. O critério é |t| > 2,24 (α = 0,025). Rodo também com efeito fixo de UF.

M1 do 03 reproduz exatamente (+9,26 em L1 e +7,27 em L2) e o painel também (t 0,45 e 0,34).

### Resultado (Fato: média de 20 sorteios, salvo onde indicado)

| Cenário (Nordeste, só 2º turno) | Votos inseridos | 02: seções forçadas a mais | 03 M2 L1: deslocamento, z do 2º t, z da variação | 04 painel L1: t (zona) | 04 painel L1: t (UF) |
|---|---|---|---|---|---|
| **2% das seções, +10, todas no 13** (pedido) | 28.170 | +82 (razão 1,115 → 1,106) | +0,95 pt; z 0,71; z 0,01 → **não detecta** | **4,07: detecta** | 3,01: detecta |
| **2% das seções, +10, todas no 22** (pedido) | 28.170 | +0 no 22 | −2,22 pt; z −4,17; z −7,09 → detecta | −9,03: detecta | −6,52: detecta |
| 5%, +10, no 13 | 70.410 | +200 | +2,19; z 2,61; z 2,78 → no limiar | 7,59 | 5,84 |
| 10%, +10, no 13 | 140.830 | +399 | +3,87; z 5,19 → detecta | 11,01 | 8,71 |
| 2%, +30, no 13 (mesário concentrado) | 84.510 | +412 | +6,17; z 8,73 → detecta | 14,26 | 11,07 |
| 2% das seções que já mais liberam, +10, no 13 (1 sorteio) | 28.170 | +484 | +2,21; z 2,64 → no limiar | 6,93 | 4,85 |
| 10% das seções de escolaridade mais baixa, +10, no 13 (1 sorteio) | 140.830 | +1.522 | +2,11; z 2,48 → **não detecta** | 7,90 | 5,22 |
| **Todas as seções de 10% das zonas, +10, no 13** | 142.670 | +390 | +0,25; z −0,37 → **não detecta** | **0,45: cego** | 8,07: detecta |
| **Todas as seções, +3, no 13** (1 sorteio) | 422.484 | +800 | +0,37; z −0,19 → **não detecta** | **0,45: cego** | **0,42: cego** |
| **Todas as seções, +10, no 13** (1 sorteio) | 1.408.280 | +3.980 | +1,73; z 1,90 → **não detecta** | **0,45: cego** | **0,42: cego** |
| **2%, +10, no 13, a mesma fraude nos dois turnos** | 28.170 por turno | (como acima) | (só o corte do 2º turno, como acima) | **0,45: cego** | não rodado |

Votos mínimos para o painel (L1, zona) detectar com 80% de poder, isto é, t a 3,08 ou mais acima da linha de base (1 sorteio por ponto, `votosMinimosPainel`):

| Votos inseridos por seção afetada (k) | Menor volume testado que detecta |
|---|---|
| 30 | 21.120 votos (0,5% das seções) |
| 10 | 28.170 votos (2% das seções); 14.080 (1%) não detecta (t 2,17) |
| 3 | 168.993 votos (40% das seções); 84.498 (20%) não chega (t 3,20, Δt 2,75) |
| 1 | **nenhum**: até 112.662 votos (80% das seções), t no máximo 1,08 |

### Leitura

1. **Fato.** O painel entre turnos (04) é o método com poder. Ele detecta fraude concentrada, de 10 ou mais votos por seção afetada, a partir de cerca de 20 a 30 mil votos inseridos no Nordeste, desde que a fraude exista só no 2º turno. Esse volume é 0,5% a 0,7% da margem nacional (4.430.191).
2. **Fato.** O teste ecológico com perfil (03 M2) tem pouco poder **justamente no sentido da H13**. A mesma fraude que ele pega quando favorece o 22 (z −4,17), ele não vê quando favorece o 13 (z 0,71). O painel tem a mesma assimetria: o t sai da linha de base por −9,5 quando a fraude favorece o 22 e por +3,6 quando favorece o 13. A causa é aritmética. Os dois testes medem o excesso **sobre o voto local**, e no Nordeste o eleitor comum já vota cerca de 70% no 13. Um voto inserido no 13 só se afasta desse padrão em cerca de 0,3, enquanto um voto inserido no 22 se afasta em cerca de 0,7. Por isso **a fraude a favor de quem já vence no lugar se camufla cerca de 2,5 vezes melhor.** A síntese não diz isso.
3. **Fato.** A contagem de seções forçadas (02) não tem poder. Com a fraude de 2% e +10, sobem tanto o observado (1.811 → 1.890) quanto o esperado (1.624 → 1.709), e a razão até cai (1,115 → 1,106). Quando a fraude favorece o 22, o número de seções forçadas para o 22 não se move (19 → 19). Uma seção típica do Nordeste só obriga votos no 13 com mais de cerca de 30% de liberação. A faixa 1%–100% também não informa nada sobre fraude, por construção.
4. **Fato.** Há três pontos cegos, agora medidos e não só supostos:
   - **Fraude difusa** (1 a 3 votos por seção). O painel não vê 1 voto por seção nem com 112 mil votos. Com 3 votos por seção, só vê a partir de cerca de 170 mil.
   - **Fraude igual em todas as seções.** Nenhum método vê +3 por seção, que somam 422 mil votos, 9,5% da margem. O painel não vê nem +10 por seção, que somam 1,4 milhão. Com +10 por seção, o M2 em L1 também não rejeita (z 1,90); só o M2 em L2 rejeitaria (z 3,06).
   - **A mesma fraude nos dois turnos.** O painel fica com t 0,45, exatamente o da linha de base.
5. **Fato (absolvição falsa ao contrário).** A síntese põe a fraude de **zona inteira** entre o que não se pode ver. Mas o próprio método 04 rodou com efeito fixo de UF (`entreturnos-resumo-efuf.json`: Nordeste, f em L1 de +0,34% [−1,25; +1,93]), e essa versão detecta a fraude em 10% das zonas (t 8,07). A síntese não usa esse resultado. A porta que continua aberta é a da fraude **igual em toda a UF**, não a de zona.

## 2. Pontos por afirmação

### Afirmação 1 (M2, Nordeste)

- **Fato.** A afirmação reproduz: em L1, tp 0,6993, contrafactual 0,7042, difCond −0,0049 [−0,0175; +0,0075]; em L2, 0,7070 e +0,0078 [−0,0047; +0,0206]; biométricos 0,6915 e 0,6920.
- **Ressalva.** A frase põe "69,9% contra 69,2%" e "dif. −0,5" lado a lado, mas 69,9 − 69,2 dá +0,7. Esse +0,7 é a diferença total (difTotal, +0,77). A diferença condicional compara com o que os biométricos votariam **nas seções dos liberados**: 70,4% em L1 e 69,9% em L2.
- **Ressalva.** O sinal em L1 depende da especificação. Sem `dInd` e `dQuil` e sem a soma das agregadas, minha versão do M2 dá +0,15 (L1) e +1,30 (L2), dentro do intervalo publicado.
- **Ressalva de poder (seção 1).** "Não foi encontrado excesso além do perfil" vale para fraude pró-13 a partir de cerca de 70 mil votos (5% das seções com +10, z 2,61). Abaixo disso, o teste não tinha poder.

### Afirmação 3 (painel)

- **Fato.** O limite superior de f é 1,36% (L1) e 1,73% (L2), e o poder confere: 2,8 × EP(f) dá 1,58% e 2,11%.
- **Ressalva.** O poder foi calculado com α = 0,05. O próprio método declarou α = 0,025 (Bonferroni sobre 2). Com α = 0,025, a fração detectável com 80% de poder é **1,74% (L1) e 2,32% (L2)**.
- **Ressalva grave na conversão para votos.** O doc 04 traduz o poder em "cerca de 4.300 e 4.000 votos no Nordeste" (f × ΔL líquido), e a síntese faz o mesmo para PE ("f = 4,7% ≈ 1.920 votos"). Essa conta só vale se toda seção tiver fraude proporcional ao seu ΔL, inclusive com fraude **negativa** onde a liberação caiu. Na fraude simulada, 28.170 votos inseridos produzem f = 2,6%, enquanto a conta do doc daria 2,6% × 278 mil ≈ 7 mil votos. A conta subestima o volume em cerca de 4 vezes.
  - O f é uma inclinação de regressão, não a fração dos votos.
  - O volume detectável depende de como a fraude se distribui: cerca de 21 mil votos com k = 30, cerca de 28 mil com k = 10, cerca de 170 mil com k = 3, e nenhum volume testado com k = 1.
  - **Recomendação:** retirar "≈ 4.000 votos" e "≈ 1.920 votos" e pôr no lugar a tabela de votos mínimos por k.

### Afirmação 4 (limites)

- **Fato.** Os brancos e nulos estão certos. O script põe em O = T − V13 − V22 os brancos, os nulos e, no 1º turno, os outros candidatos. As fórmulas min13 = max(0, L − (T − V13)), max13 = min(L, V13) e dMax = max13 − max(0, L − max13 − O) estão corretas, e o par (Σmin13, Σmax22) é atingível ao mesmo tempo em cada seção, então a faixa agregada é exata.
- **Fato.** L1 conta só habilitação que terminou em voto (`src/perfil-secoes.js`, contador no "O voto do eleitor foi computado").
- **Fato no bruto.**
  - BA: 279 − (314 − 256) = **221**.
  - PR: 146 − (175 − 117) = **88**.
- **Ressalva.** O excesso de seções forçadas é estatisticamente real nos dois turnos: 0 de 200 sorteios chegam ao observado (`fracaoRepsMaiorOuIgual` = 0). Mas, como mostra a simulação, essa estatística não separa fraude de perfil.
- **Ressalva.** A comparação "1,20 no 1º turno contra 1,11 no 2º" compara estruturas diferentes. No 1º turno, O inclui os outros candidatos, o que derruba a contagem: 628 forçadas no 1º turno contra 1.811 no 2º. Não serve como linha de base de fraude.
- **Ressalva menor (teto de impacto, doc 02).** O "pelo menos 166.144" (L2) subtrai a capacidade do Nordeste, calculada só nas seções com detalhamento, da margem nacional inteira. As seções do país sem detalhamento são 1.308 e não entram no teto. **Hipótese:** o piso pode ser um pouco menor; não conferi quantas dessas seções ficam no Nordeste.

### Afirmação 5 (cobertura do banco)

- **Fato.** `node scripts/sql.mjs`, na cópia `eleicao2026-20261029T105000.sqlite` (ponteiro: 1º turno 28 UFs, 2º turno 28 UFs), dá 28 UFs em `secao` e em `perfil_log` nos dois turnos.
- **Fato.** O `ecologico-resumo.json` registra a cópia `eleicao2026-20261029T092711.sqlite`. Nessa cópia o 1º turno não tinha AM (só em L1), RS, SC, SE, SP e TO.
- **Consequência.** A variação entre turnos do 03 no Nordeste ficou **sem SE**. Agora pode ser refeita com o universo completo. **Recomendação:** refazer o 03 e fechar a pendência 1 da síntese.

### Afirmação 6 (bruto)

**Fato.** `node src/exportar.js --turno 2 --uf ba --municipio 34290 --zona 0127 --secao 0335 --log dia --stdout`, e o mesmo comando para PR 79111/0086/0218:

| Seção | Comparecimento | Por biometria | Por biografia | Sem biometria | 13 | 22 | Branco | Nulo | RDV | "Mesário … habilitou" no log |
|---|---|---|---|---|---|---|---|---|---|---|
| BA 34290/0127/0335 | 314 | 7 | 281 | 26 | 256 | 51 | 0 | 7 | 256/51/7 | 279 (314 votos computados) |
| PR 79111/0086/0218 | 175 | 19 | 153 | 3 | 51 | 117 | 2 | 5 | 51/117/2/5 | 146 (175 votos computados) |

Na BA, a verificação de assinatura não conclui (`DER: comprimento ausente`, defeito de leitura conhecido, parecer 08). Por isso os números dessa seção são Fato de conteúdo, mas não de integridade. No PR, as 22 conferências da cadeia de assinatura passam, com 0 falhas.

## 3. Explicações alternativas e o que foi testado

| Explicação | Situação |
|---|---|
| Os liberados votam no 13 por perfil (idade, escolaridade, lugar) | **Testada** no 03 (M2), mas com poder baixo para fraude pró-13 abaixo de cerca de 70 mil votos |
| A liberação cresce entre turnos por reclassificação (o manual sem mesário caiu) | **Testada** no 01 e no 05 (contagens). Pelo princípio 8, a reclassificação é técnica de registro, não absolvição |
| A fraude estaria na zona inteira | **Coberta** pelo painel com efeito fixo de UF (este parecer), que a síntese não usa |
| A fraude estaria por igual na UF inteira, ou igual nos dois turnos | **Não testável** com estes dados. Precisa de linha de base externa (2022) |
| A fraude seria difusa (1 a 3 votos por seção) | **Não testável** com estes dados. Precisa de verificação nominal por amostragem com probabilidade conhecida, ou de rastro no log por eleitor (horário, tentativas de digital) |
| "O mesário conferiu o documento" | **Recusada** (princípio 8) |

## 4. Alcance da conclusão (Recomendação para a síntese)

- **Trocar** "Grau de certeza: alto para excesso dentro da zona e para excesso que cresce entre os turnos" por:
  - alto para fraude **concentrada** (10 ou mais votos por seção afetada), **só no 2º turno**, a partir de cerca de 20 a 30 mil votos no Nordeste (painel);
  - médio para o mesmo tipo de fraude a partir de cerca de 70 mil votos no corte do 2º turno (M2);
  - **nenhum** para fraude difusa (1 a 3 votos por seção, até cerca de 85 mil a 170 mil votos), para fraude igual em toda a UF (pelo menos até 1,4 milhão de votos no painel) e para fraude igual nos dois turnos.
- **Dizer** que, no Nordeste, os testes são cerca de 2,5 vezes menos sensíveis a fraude pró-13 do que a fraude pró-22 do mesmo tamanho.
- **Retirar** as conversões de f em votos (cerca de 4.000 no Nordeste e 1.920 em PE) e corrigir o poder para α = 0,025.
- **Usar** o painel com efeito fixo de UF para fechar a porta da fraude de zona inteira.
- **Não levar a `docs/pericia/`** nenhum número de poder deste parecer: a simulação depende de cenários escolhidos, e os sorteios de 1 repetição estão marcados como tais.

**Anomalia estatística não é prova de fraude, e ausência de anomalia não é prova de ausência.** Estes dados descartam com boa confiança uma fraude concentrada só no 2º turno, de dezenas de milhares de votos no Nordeste. Eles não descartam fraude difusa nem fraude estável, nem do tamanho da margem nacional.
