# 18. H13 pelo diário da urna: resultado

Estatístico eleitoral, **30/10/2026**. Plano registrado antes de rodar: [16](16-h13-log-plano.md). O que não estava no plano está marcado **exploratório**. Vias contadas pela leitura própria dos diários ([17](17-h08-resultado.md)), ciclo a ciclo, por fluxo de urna, sem reordenar linhas.

## Resposta curta

- **Fato (cerco, sem modelo):** com a liberação contada no diário, os 5.841.108 eleitores liberados à mão **com mesário identificado** (V3m) no 2º turno, no Brasil sem o exterior, podem ter dado ao 13 de 0,35% a 99,91% dos seus votos. No pior caso para o 13, anulando-os, a margem nacional iria de 4.430.191 para **−1.401.371**. Só no Nordeste (1.795.037 liberados V3m), o pior caso deixa a margem em **2.636.659**: o 13 ainda venceria. A aritmética não fecha a porta nacional; a do Nordeste, sozinha, não decide.
- **Fato (estimativa testada, 204 testes, Bonferroni):** no **Nordeste**, nenhuma das três vias se associa ao voto no 13 dentro do mesmo local de votação, nem no nível do 2º turno nem na variação entre turnos. O que passa no teste vai **contra** a hipótese "favoreceu o 13": no Brasil e no Sudeste, as seções que liberam mais sem digital votam **menos** no 13 que as vizinhas do mesmo prédio, e isso já era assim no 1º turno.
- **Um sinal a explicar (Hipótese, não é do Nordeste):** no Sudeste e no Sul, as seções em que mais eleitores **pelo ano de nascimento** (sem digital na urna) foram votar no 2º turno do que no 1º ganharam mais voto no 13 (Brasil: z = 9,2). Não some ao controlar a variação do comparecimento. Se fosse fraude, equivaleria a cerca de 62 mil votos no país; também é compatível com a composição de quem voltou a votar. Ver "Sinal V2 no painel".
- **Limite:** o voto é secreto. Nada aqui mede o voto de quem foi liberado; só a associação entre seções do mesmo local. O tamanho de fraude que o teste veria está na tabela "Efeito mínimo detectável".

## Comandos

```bash
node scripts/auditoria/estatistico-h08-varredura.mjs --turno 1 --paralelo 3   # diários → vias por seção
node scripts/auditoria/estatistico-h08-varredura.mjs --turno 2 --paralelo 3
node --max-old-space-size=14000 scripts/auditoria/estatistico-h13-log-analise.mjs
```

Saídas em `data/parsed/auditoria/estatistico/h13-log/`: `resultado.json`, `testes.csv` (os 204 testes, com β, erro, z, p, Bonferroni, BH e efeito mínimo detectável), `cerco.csv` (por região, UF e via), `conferencia.csv` (as seções em que o diário difere do BU).

## Vias pelo diário (Fato)

| | 1º turno | 2º turno |
|---|---|---|
| V1 digital | 109.650.552 | 111.970.297 |
| V2 ano de nascimento (sem digital na urna) | 7.281.286 | 7.632.421 |
| V3m manual, mesário identificado | 5.120.426 | 5.841.108 |
| V3s manual, sem mesário associado | 3.221.798 | 2.791.363 |
| outra marca | 0 | 0 |

Com o exterior (lá, todos pela V2: 380.612 no 2º turno). Diário e BU dão as mesmas vias em 499.162 seções do 1º turno e 499.172 do 2º; as 14 e 6 restantes têm diário com menos votos que o BU (doc 17). Por isso os totais do Brasil sem exterior ficam 18 abaixo dos do BU no 2º turno (15.884.280 contra 15.884.298 sem digital).

## Parte A. Cerco aritmético por via, 2º turno (Fato)

Brasil sem o exterior, 497.897 seções. "Parte no 13" = mínimo e máximo exatos, somados seção a seção. "Margem no pior caso" = margem nacional (4.430.191) depois de anular, só na região da linha, os votos desses liberados no pior caso para o 13.

| Região | Via | Liberados | Parte no 13 | Margem nacional no pior caso |
|---|---|---|---|---|
| Brasil | V2 | 7.251.809 | 0,75% a 98,56% | −2.643.875 |
| Brasil | V3m | 5.841.108 | 0,35% a 99,91% | −1.401.371 |
| Brasil | V3s | 2.791.363 | 0,49% a 99,91% | 1.643.223 |
| Brasil | V3 (V3m + V3s) | 8.632.471 | 0,58% a 99,85% | −4.179.880 |
| Brasil | V2 + V3 | 15.884.280 | 1,37% a 98,78% | −11.119.093 |
| Nordeste | V2 | 1.658.303 | 1,67% a 99,99% | 2.772.228 |
| Nordeste | V3m | 1.795.037 | 1,01% a 99,95% | 2.636.659 |
| Nordeste | V3s | 816.022 | 1,42% a 99,97% | 3.614.587 |
| Nordeste | V3 | 2.611.059 | 1,69% a 99,93% | 1.822.532 |
| Nordeste | V2 + V3 | 4.269.362 | 3,41% a 99,93% | 166.161 |
| Sudeste | V3m | 2.219.057 | 0,05% a 99,97% | 2.212.488 |
| Sudeste | V2 + V3 | 7.389.540 | 0,76% a 97,92% | −2.692.865 |

Norte, Centro-Oeste e Sul, e cada UF: `cerco.csv`. A linha V2 + V3 reproduz a conta da perícia (tópico 4, item 6.4), que usa o BU: 166.161 contra 166.144 no Nordeste e −11.119.093 contra −11.119.111 no Brasil. A diferença de 17 e 18 vem das 6 seções em que o diário tem menos votos que o BU.

## Parte B. Associação entre seções do mesmo local (estimativa; Hipótese de modelo)

Modelo do plano: mínimos quadrados ponderados por 13 + 22, efeito fixo de local de votação, controles do perfil (sem biometria no cadastro, 60+, 16–24, escolaridade baixa, superior, log do eleitorado) e modelo da urna, erro robusto por local. β em **pontos de parcela do 13 por 100% de liberados pela via**: β = −1,66 quer dizer que uma seção com 10 pontos a mais de V3m que as vizinhas do mesmo prédio dá, em média, 0,17 ponto a menos ao 13.

Amostras: nível do 2º turno 497.494 seções (475.671 em locais com 2 seções ou mais, 72.404 locais); painel 497.473; nível do 1º turno 497.481. Exclusões: sem perfil do eleitorado 993, menos de 20 votos em 13 + 22 198, diário diferente do BU 12 (nível do 2º turno; as do painel e do 1º turno em `resultado.json`). Onde o subconjunto não tem urna UE2022, um indicador de modelo sai (soma 1 dentro do local); o resto dos controles fica.

**Número de testes: 204.** Bonferroni a 5%: |z| ≥ 3,67. Passam **21** por Bonferroni e 31 por BH.

### Brasil e regiões

| Unidade | Desfecho | V2 β (z) | V3m β (z) | V3s β (z) |
|---|---|---|---|---|
| Brasil | nível 2º turno | **−4,54 (−11,7)** | **−1,66 (−7,4)** | **−1,41 (−5,7)** |
| Brasil | linha de base 1º turno | −3,73 (−9,3) | −1,83 (−7,8) | −1,69 (−6,9) |
| Brasil | painel (2º − 1º) | **+4,98 (+9,2)** | +0,20 (+1,4) | +0,18 (+1,2) |
| Nordeste | nível 2º turno | −0,99 (−0,9) | −0,62 (−1,8) | −0,25 (−0,7) |
| Nordeste | linha de base 1º turno | −3,63 (−3,2) | −0,37 (−1,0) | −0,30 (−0,8) |
| Nordeste | painel | −0,17 (−0,2) | +0,26 (+1,2) | +0,14 (+0,6) |
| Norte | nível / painel | −5,20 (−2,4) / +2,71 (+1,3) | −1,68 (−1,9) / +0,08 (+0,1) | −2,19 (−2,2) / −0,73 (−1,2) |
| Centro-Oeste | nível / painel | **+7,06 (+4,7)** / +5,95 (+2,7) | −0,39 (−0,5) / +0,41 (+0,7) | −0,60 (−0,6) / +0,08 (+0,1) |
| Sudeste | nível / painel | **−3,12 (−5,7)** / **+6,32 (+8,4)** | **−2,65 (−6,9)** / +0,08 (+0,3) | **−2,47 (−5,8)** / +0,16 (+0,7) |
| Sul | nível / painel | −4,47 (−3,5) / **+9,66 (+6,0)** | −2,02 (−3,3) / +0,29 (+0,8) | −1,46 (−2,2) / +0,55 (+1,5) |

Em negrito, o que passa por Bonferroni.

**Nordeste − resto do Brasil** (diferença de β): nível V3m **+1,69 (z 3,8)** e V3s **+1,84 (z 3,7)**; painel V2 **−6,62 (z −5,2)**; os outros três não passam. A diferença no nível é o Nordeste ser **menos negativo** que o resto, não positivo; e a mesma diferença já existia no 1º turno (V3m: −0,37 no Nordeste contra −2,48 no resto). No painel, que é o que mudou no 2º turno, a diferença do V3 é zero.

### UFs que passam por Bonferroni (de 162 testes de UF)

Nível do 2º turno: ES V2 −11,89 (−5,4), RJ V2 −6,96 (−5,3), SP V2 −5,15 (−5,3), SP V3m −3,59 (−6,4), SP V3s −3,27 (−5,2). Painel: MG V2 +6,26 (+5,1), SP V2 +6,68 (+5,4), RS V2 +9,90 (+4,7). **Nenhuma UF do Nordeste passa**, em nenhuma via e em nenhum desfecho. Tabela completa: `testes.csv`.

### Sensibilidade (exploratória, Brasil e Nordeste)

| Variante | Brasil nível V3m | Nordeste nível V3m | Brasil painel V2 | Nordeste painel V3m |
|---|---|---|---|---|
| Plano (local + controles) | −1,66 (−7,4) | −0,62 (−1,8) | +4,98 (+9,2) | +0,26 (+1,2) |
| Sem controles | +6,55 (+26,0) | +7,01 (+16,4) | +3,53 (+6,5) | −0,14 (−0,6) |
| Efeito fixo de zona | −4,78 (−9,8) | +0,12 (+0,2) | +4,32 (+8,5) | +0,30 (+1,5) |
| Com as seções diário ≠ BU | −1,66 (−7,4) | −0,62 (−1,8) | +4,98 (+9,2) | +0,26 (+1,2) |

**Leitura:** sem controles, as seções que liberam mais à mão votam muito mais no 13 (+7 pontos por 100% no Nordeste). Com o perfil do eleitorado (idade e escolaridade), isso some: é o perfil de quem tem a digital gasta, não a liberação. É o mesmo resultado dos métodos 03 e 05 de [hipotese-liberacao-mesario](../hipotese-liberacao-mesario/00-sintese.md), agora com a via do diário corrigido e comparando dentro do prédio.

## Efeito mínimo detectável (o que o teste veria)

Fraude simulada nos dados reais: uma fração f dos liberados pela via vira voto a mais (no lugar de ausente) num candidato. "f" = fração mínima que o teste pegaria com 80% de poder no corte de Bonferroni; "votos" = f × liberados da base.

| Unidade | Desfecho | Via | Base (liberados) | A favor do 13: f / votos | A favor do 22: f / votos |
|---|---|---|---|---|---|
| Brasil | nível | V2 | 7.249.838 | 4,0% / 292.540 | 3,0% / 215.485 |
| Brasil | nível | V3m | 5.839.327 | 2,1% / 121.815 | 1,9% / 110.346 |
| Brasil | nível | V3s | 2.790.433 | 2,3% / 65.101 | 2,1% / 57.447 |
| Brasil | painel | V2 | 451.922 a mais | 6,8% / 30.721 | 6,3% / 28.547 |
| Brasil | painel | V3m | 1.768.615 a mais | 2,4% / 41.693 | 2,1% / 37.227 |
| Brasil | painel | V3s | 1.001.342 a mais | 3,4% / 33.724 | 3,1% / 31.033 |
| Nordeste | nível | V2 | 1.657.318 | 23% / 382.488 | 5,8% / 96.346 |
| Nordeste | nível | V3m | 1.793.821 | 5,1% / 91.420 | 2,1% / 38.094 |
| Nordeste | nível | V3s | 815.464 | 5,9% / 48.309 | 2,3% / 18.872 |
| Nordeste | painel | V2 | 96.114 a mais | 21% / 20.120 | 11% / 10.605 |
| Nordeste | painel | V3m | 542.915 a mais | 6,1% / 33.032 | 2,4% / 13.188 |
| Nordeste | painel | V3s | 301.038 a mais | 9,2% / 27.826 | 3,7% / 11.156 |

"A mais" no painel = soma, seção a seção, do aumento da via do 1º para o 2º turno (só onde subiu). Por UF: `testes.csv` (nas UFs pequenas, f passa de 20% e o teste é cego).

**Leitura do tamanho:**
- No Nordeste, o teste é **2 a 4 vezes menos sensível a fraude pró-13 que pró-22**: com o 13 em 69%, um voto a mais no 13 muda pouco a parcela. Um esquema que pusesse no 13 ~5% dos liberados à mão do Nordeste (cerca de 90 mil votos, 2% da margem nacional) ficaria **abaixo** do que o nível vê; no painel, ~33 mil votos.
- O nível compara com zero, mas a associação de base não é zero (é negativa no Brasil, nos dois turnos). Uma fraude do mesmo tamanho nos dois turnos ficaria escondida nessa base; por isso o desfecho que testa o 2º turno é o painel.

## Sinal V2 no painel (Hipótese)

**O que se vê (Fato).** Brasil +4,98 (z 9,2), Sudeste +6,32 (8,4), Sul +9,66 (6,0), MG, SP e RS passam por Bonferroni; Nordeste −0,17 (−0,2), e a diferença Nordeste − resto é −6,62 (−5,2). Ou seja: onde mais eleitores **pelo ano de nascimento** foram votar no 2º turno do que no 1º, o 13 cresceu mais, fora do Nordeste.

**Tamanho, se fosse fraude (dimensionamento, não estimativa de fraude).** Pela injeção, o z observado equivale a f ≈ 14% dos 451.922 eleitores V2 a mais no país, cerca de **62 mil votos** (Sudeste ~41 mil, Sul ~12,5 mil; MG ~15 mil, SP ~17 mil, RS ~8,6 mil). Margem nacional: 4.430.191.

**Exploratório: controle da variação do comparecimento.** Acrescentando (comparecimento do 2º − do 1º) ÷ eleitores da seção, o β cai pouco: Brasil +4,36 (z 7,8), Sudeste +5,75 (7,4), Sul +7,62 (4,8). Não é só "mais gente votou".

**Explicações compatíveis, nenhuma testada aqui:**
1. **Composição (benigna):** se a via V2 é fixa por eleitor (depende do arquivo de digitais da urna, que se supõe o mesmo nos dois turnos; não conferido), então ΔV2 mede **quais** eleitores sem digital na urna voltaram a votar. Se esse grupo, no Sudeste e no Sul, pende mais para o 13 que os eleitores que ele substitui (por exemplo, jovens que tiraram o título há pouco, ou eleitores com foto e sem digital, o grupo do item 3 da perícia 4), a inclinação sai positiva sem nenhuma fraude. Isso é o mesmo fenômeno do item 6.1 da perícia (o sinal depende do perfil).
2. **Risco (princípio 8):** a V2 é liberada pelo título e pelo ano de nascimento digitados pela mesa. Voto no lugar de ausente sem digital na urna deixaria exatamente este rastro.

**Teste que separa as duas (Recomendação):** (a) refazer o painel com a interação ΔV2 × fração de 16–24 e de 60+ da seção (composição prevê que o efeito se concentre onde há mais jovens); (b) olhar o horário dos V2 a mais (fraude tende a última hora e rajada; composição não); (c) nas seções do topo do resíduo, conferir no diário se os V2 a mais têm `Foto do eleitor apresentada` e intervalos normais.

## O que isto permite e o que não permite afirmar

**Permite:**
- **Fato:** pela aritmética, só os liberados à mão com mesário identificado (5,84 milhões) já bastariam, no pior caso, para inverter o resultado nacional; os do Nordeste, sozinhos, não (margem de 2,64 milhões no pior caso). A aritmética, sozinha, não fecha a porta.
- **Fato (teste declarado antes):** no Nordeste, nenhuma via de liberação sem digital se associa a mais voto no 13 entre seções do mesmo local, nem no 2º turno nem no ganho entre turnos, com o poder da tabela acima.
- **Fato (teste declarado antes):** no Brasil e no Sudeste, a liberação sem digital está associada a **menos** voto no 13 dentro do prédio, nos dois turnos.

**Não permite:**
- dizer em quem votaram os liberados (voto secreto; o β é ecológico);
- excluir fraude pró-13 no Nordeste **abaixo** de ~5% dos liberados à mão (~90 mil votos, nível) ou ~6% dos liberados à mão a mais entre turnos (~33 mil, painel);
- excluir fraude igual em todas as seções de um prédio, igual nos dois turnos, alinhada ao perfil, ou concentrada em poucas seções;
- tratar o sinal V2 do painel no Sudeste e no Sul como fraude ou como benigno: está aberto.

## Pendências

- Separar composição × inserção no sinal V2 do painel (recomendação acima). Revisão independente deste resultado antes de qualquer uso na perícia.
- O `perfil_log` da cópia de 29/10 é anterior à correção da ordem das linhas: a contagem por via deste doc vem da leitura própria e bate com o BU; quem usar `perfil_log` para H13 deve trocá-lo por esta leitura ou regerar os perfis.
