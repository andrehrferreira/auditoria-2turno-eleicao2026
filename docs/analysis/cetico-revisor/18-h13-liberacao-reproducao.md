# 18. Parecer: H13 (voto dos liberados sem biometria), lente de reprodução

Revisado: [hipotese-liberacao-mesario/00-sintese.md](../hipotese-liberacao-mesario/00-sintese.md) e os métodos 01 a 05, com a conferência `scripts/auditoria/liberacao-sintese-conferencia.mjs`. Revisão em 29/10/2026.

**Universo (princípio 9): completo.** Li as 499.207 seções de cada turno nos perfis `data/parsed/<t>t/perfil/` (28 unidades nos dois turnos), com código próprio, sem importar os scripts `liberacao-*`. Do banco usei só a cópia de leitura atual (`eleicao2026-20261029T105000.sqlite`): `secao_agregada` (17.931 agregadas por turno) e `voto_oficial` (cargo = 1, conferência dos votos).

**Limite estrutural.** O voto é secreto. O log diz como o eleitor foi habilitado, não em quem votou, e o RDV não liga voto a eleitor. Tudo abaixo é limite aritmético ou estimativa ecológica. Nada é observação do voto de um liberado.

## Vereditos

| # | Afirmação da síntese | Veredito | Em uma linha |
|---|---|---|---|
| 1 | Nordeste, M2: liberados 69,9% (L1) e 70,7% (L2) × biométricos 69,2%; dif. −0,5 [−1,8; +0,8] e +0,8 [−0,5; +2,1] | **Sustentado com ressalvas** | Reproduz com código independente: −0,49 [−1,83; +0,50] e +0,78 [−0,60; +2,14]. A coluna "lib × bio" e a coluna "Dif." usam referências diferentes, e o teste só enxerga excesso acima de ~1,8 ponto |
| 2 | M1 sem perfil: +6,1 (L1 contra todos os outros) e +9,3 (L1 contra biométricos) | **Sustentado com ressalvas** | Reproduz: +9,26 (3 grupos) e +5,77 a +6,13 (2 grupos, conforme o efeito fixo). "78,7 × 68,4" dá 10,3, não 9,3: o 9,3 é contra o contrafactual da mesma zona (69,4) |
| 3 | Painel entre turnos: f ≤ 1,4% (L1) e 1,7% (L2), poder 80% para 1,6% e 2,1% | **Sustentado com ressalvas** (conferido no JSON, não refeito) | f e IC batem com `entreturnos-resumo.json`; o poder confere (2,8 × erro-padrão). Só mede as 250 mil liberações **a mais** no Nordeste |
| 4 | Faixa 1,0–100,0 (L1) e 3,4–99,9 (L2); 1.811 forçadas contra 1.635 esperadas (1,11); 1º turno 1,20 | **Sustentado com ressalvas** | Tudo reproduz. O excesso é estatisticamente real (0 de 100 sorteios o alcançam) e a síntese não diz isso. A explicação por perfil só era suposta: testei, e ela explica o 2º turno (1,02, p 0,11), mas sobra resíduo no 1º turno em L1 (1,08, p 0,01) |
| 5 | Cópia de leitura com 1º turno em 22 UFs (`secao`) e 20 (`perfil_log`), ponteiro diz 25 | **Refutado para a cópia atual** (verdadeiro para a anterior) | A cópia `…T092711` tem exatamente essas lacunas. A cópia atual `…T105000`, publicada às 10:50, antes da conferência da síntese (11:03), tem as 28 unidades e 499.207 seções nos dois turnos e nas duas tabelas. A pendência 1 já pode ser fechada |
| 6 | BU bruto: BA 34290/0127/0335 e PR 79111/0086/0218 | **Sustentado** | BU e log conferidos no bruto (abaixo) |

## 1. Reprodução independente

Script: `scripts/auditoria/cetico-liberacao-reproducao.mjs` (saída `data/parsed/auditoria/cetico-revisor/liberacao-reproducao.json`).

### Taxa de liberação (Fato)

| | 2º turno | Síntese | 1º turno | Síntese |
|---|---|---|---|---|
| L1 Nordeste | 1.795.037 ÷ 36.335.632 = **4,94%** | 4,94 | 1.545.121 ÷ 35.508.871 = **4,35%** | 4,35 |
| L2 Nordeste | 4.269.379 ÷ 36.335.632 = **11,75%** | 11,75 | 4.064.707 = **11,45%** | 11,45 |
| L1 Sul | 1.015.209 = **5,43%** | 5,43 | **5,11%** | 5,11 |
| L2 Brasil sem ZZ | 15.884.298 ÷ 127.854.631 = **12,42%** | 12,42 | | |

Os votos do BU nos perfis batem com `voto_oficial` nas 499.205 seções com voto do 2º turno (0 divergências).

### Limites determinísticos, Nordeste (Fato)

| | L1 2º t | L2 2º t | L1 1º t |
|---|---|---|---|
| Faixa do 13, % de **todos** os liberados | 1,01–99,95 | 3,41–99,93 | 0,50–99,98 |
| Faixa do 13, em 13/(13+22) | 1,01–99,96 | 3,48–99,95 | 0,50–99,98 |
| Homogêneo, 13/(13+22) | 70,5 | 70,0 | 68,6 |
| Obrigam o 13: observado / esperado (meu sorteio, 100 rep.) | 1.811 / 1.635,4 (**1,107**) | 10.121 / 9.643,1 (1,050) | 628 / 524,8 (**1,197**) |
| Repetições ≥ observado | 0 de 100 | 0 de 100 | 0 de 100 |

Brasil, L1: 2.054 / 1.945,7 no 13 e 272 / 195,8 (1,39) no 22. Sul, L1: 221 / 143,5 (1,54) no 22.

### Diferença liberados − biométricos, Nordeste, 2º turno (Hipótese de modelo)

| Modelo | Meu valor | Síntese |
|---|---|---|
| M1, L1 contra biométricos (3 grupos): nível, contrafactual, dif. | 78,66 · 69,40 · **+9,26** (total +10,26) | 78,7 × 68,4 · +9,3 |
| M1, L1 contra todo o resto (2 grupos) | +5,77 (zona = UF+município+zona) | +6,1 (zona = UF+zona) |
| M1, L2 | +7,26 | +7,3 |
| M2, L1 (grupo M) | **−0,49 [−1,83; +0,50]**; nível 69,93; bio 69,15 | −0,5 [−1,8; +0,8]; 69,9 × 69,2 |
| M2, L2 | **+0,78 [−0,60; +2,14]**; nível 70,69 | +0,8 [−0,5; +2,1]; 70,7 |
| M2, "outros sem digital" (L2 − M) | **+2,41 [+0,64; +3,73]** | +2,4 [+0,8; +4,0] |
| M2 sem o controle "% sem biometria no cadastro", L2 | −1,40 | (M2s) |
| M2, L1, 1º turno, **com SE** | +0,37 [−0,97; +1,72] | +0,48 (sem SE) |

O meu M2 não tem as duas variáveis indicadoras de local indígena e quilombola, e o bootstrap tem 200 repetições. Mesmo assim, os pontos coincidem até o décimo. Por UF, o M2 reproduz a tabela da síntese com diferença de no máximo 0,1 ponto (RN e SE, por causa das indicadoras que faltam).

## 2. Leitura do código: o que procurei e o que achei

- **Fato: sem dupla contagem.** Nenhuma seção aparece duas vezes nos perfis. As 1.040 seções do 2º turno com mais de um pacote têm cópias idênticas, e `perfil-secoes.js` já conta cada cópia uma vez pelo hash do VSC.
- **Fato: as definições L1 e L2 batem com o código.** L1 só conta "Mesário … habilitou o eleitor" num ciclo que terminou em voto, por dado pessoal e sem biometria. L1 > porBiografia: 0 seções nos dois turnos. O log e o BU divergem no detalhamento em 2 a 11 seções por campo, o que é desprezível.
- **Fato: o exterior fica fora.** As 1.310 seções do exterior não têm detalhamento de habilitação no BU (380.612 votantes no 2º turno) e têm L1 = 0. Elas ficam fora de L2 por falta de dado, não porque não houve liberação. A síntese diz isso.
- **Fato: os filtros diferem entre métodos sem mudar o resultado.** O método 02 exige que o log some o total de votos (36 seções fora no 2º turno). O método 03 não exige isso e descarta L1 > L2. No Nordeste, L1 sai 1.795.037 sem filtro, 1.794.975 no método 02 e 1.793.877 no método 03: menos de 0,1% de diferença.
- **Fato: o método 03 usa `cargo = 1` literal** em `voto_bu` e soma o perfil das seções agregadas na principal. Fiz o mesmo.
- **Fato: o 1º turno do método 03 saiu da cópia antiga** (sem RS, SC, SE, SP e TO). Refiz o Nordeste com SE, a partir dos perfis completos, e a variação entre turnos não muda: −0,86 contra −0,9.

## 3. Ressalvas

**3a. Referências misturadas nas tabelas (Fato, de apresentação).**
- Na tabela B, "lib × bio" mostra o nível dos biométricos da região. Já "Dif." é contra o **contrafactual**: o que os biométricos das mesmas zonas e perfis dariam.
  - Em M1, L1: 78,7 − 68,4 = 10,3, mas a coluna diz +9,3.
  - Em M2, L1: 69,9 − 69,2 = +0,7, mas a coluna diz −0,5.
  - A diferença entre as duas é o efeito de composição (+1,0 e +1,3 pontos), que é significativo. O leitor precisa ver as duas colunas.
- Na tabela A, a "Faixa 13" está em % de **todos** os liberados, com branco e nulo. "Homog." está em 13/(13+22). Exemplo, Brasil L2: o teto é 98,8% de L e 99,1% em dois partidos.

**3b. O excesso de seções forçadas é real, e a explicação benigna não tinha sido testada (agora foi).** Script: `scripts/auditoria/cetico-liberacao-estratos.mjs`.
- **Fato:** no nulo do método 02, nenhum sorteio alcança o observado (0 de 200 no autor, 0 de 100 no meu). A razão 1,11 não é ruído.
- **Fato:** sorteei a taxa só entre seções da mesma zona **e** do mesmo quintil de taxa prevista pelo perfil do eleitorado. O excesso cai:

| | Só zona | Zona + quintil de perfil |
|---|---|---|
| L1, 2º turno | 1.808 / 1.641,8 (1,10), p < 0,01 | 1.808 / 1.771,5 (**1,02**), p 0,11 |
| L2, 2º turno | 10.106 / 9.626,6 (1,05), p < 0,01 | 10.106 / 10.055,9 (**1,005**), p 0,17 |
| L1, 1º turno | 626 / 523,6 (1,20), p < 0,01 | 626 / 580,9 (**1,08**), p 0,01 |
| L2, 1º turno | 4.381 / 4.103,6 (1,07) | 4.381 / 4.369,1 (1,003), p 0,38 |

  No 2º turno, o perfil explica o excesso. Sobra um resíduo pequeno no 1º turno em L1, com p 0,01 sem correção. Pelo princípio 8, um resíduo maior no 1º turno não absolve: ele só não é efeito do 2º turno. **Recomendação:** citar o nulo estratificado ao lado do nulo por zona.

**3c. O que o "não encontrado" consegue ver (absolvição falsa).**
- **Fato:** em M2, o IC de L1 no Nordeste tem meia largura de cerca de 1,3 ponto. O efeito detectável com 80% de poder é de cerca de 1,8 ponto.
- **Hipótese (conta sobre suposição):** se uma fração φ dos liberados L1 fossem votos inseridos no 13, o nível subiria cerca de φ × 0,30. Então só φ ≥ 6% seria visto, o que daria cerca de 110 mil dos 1,79 milhão de L1 do Nordeste.
- Abaixo disso, e em qualquer fraude uniforme na zona, igual nos dois turnos ou alinhada ao perfil, o teste é cego. A síntese declara as três portas. O tamanho mínimo detectável deve vir junto.
- O painel (afirmação 3) é mais fino, cerca de 4 mil votos, mas só mede as **250 mil liberações a mais** entre os turnos, e com um mecanismo específico (voto inserido, que aumenta o comparecimento).

**3d. A soma do Nordeste esconde UFs positivas (Hipótese).**
- No M2 de L2, três das nove UFs têm IC acima de zero: CE +4,6, PB +4,7 e PE +3,0. A soma regional dá +0,8 porque a BA (−0,5) pesa muito.
- Sob o nulo, ter 3 ou mais de 9 UFs positivas e significativas teria probabilidade de cerca de 0,001 (binomial com 2,5% por cauda). A Bonferroni por teste esconde esse padrão conjunto.
- As mesmas três UFs já eram positivas no 1º turno (CE +6,0, PB +3,3, PE +3,1). Isso aponta para perfil mal medido (faltam renda e urbano/rural), mas pelo princípio 8 não absolve.
- **Recomendação:** pôr CE, PB e PE na auditoria nominal ao lado de Candeias e Tapejara.

**3e. A pendência 1 está desatualizada (Fato).** Ver o veredito 5. O método 03 pode ser refeito já com a cópia atual.

## 4. Conferência no bruto (Fato)

`node src/exportar.js --turno 2 --uf <uf> --municipio <m> --zona <z> --secao <s> --stdout`, com os ciclos de habilitação recontados por mim no log do dia 25/10/2026:

| Seção | BU (texto impresso) | Log, ciclos que terminaram em voto |
|---|---|---|
| BA 34290/0127/0335 | 314 votantes; biométrica 7, biográfica 281, sem biometria 26; 13 = 256, 22 = 51, nulos 7 | 314 votos; 7 biometria, 26 ano, 281 dado pessoal, **279 pelo mesário (199 + 80)**. Mínimo forçado no 13: 279 − (314 − 256) = **221** |
| PR 79111/0086/0218 | 175 votantes; biométrica 19, biográfica 153, sem biometria 3; 13 = 51, 22 = 117, brancos 2, nulos 5 | 175 votos; 19, 3, 153, **146 pelo mesário (142 + 4)**. Mínimo forçado no 22: 146 − (175 − 117) = **88** |

As duas são UE2013. Em Candeias, o exportar acusa "DER: comprimento ausente" na verificação da assinatura. Isso é defeito de leitura conhecido (parecer 08), não achado.

## 5. Explicações alternativas

| Explicação | Situação |
|---|---|
| O perfil (idade, escolaridade, cadastro) explica a vantagem bruta | **Testada:** M2 e o nulo estratificado. Explica o 2º turno no Nordeste |
| Composição: os liberados estão em seções mais pró-13 da mesma zona | **Testada:** difComp +1,3 (L1), significativo. Faz parte da vantagem bruta |
| O controle de cadastro sem biometria absorve L2 mecanicamente | **Testada:** sem ele, a dif. de L2 fica em −1,4 |
| Urbano/rural e renda | **Só suposta.** Não há o dado por seção |
| Fraude uniforme na zona, igual nos dois turnos ou alinhada ao perfil | **Não testável com estes dados.** Precisa de linha de base de 2022 e de auditoria nominal |
| "O mesário conferiu o documento" | **Recusada** pelo princípio 8 |

## Reprodução

```
node --max-old-space-size=8000 scripts/auditoria/cetico-liberacao-reproducao.mjs --reps 100 --boot 200
node --max-old-space-size=8000 scripts/auditoria/cetico-liberacao-estratos.mjs --reps 100
```
