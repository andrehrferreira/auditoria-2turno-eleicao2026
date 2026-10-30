# 43. Salto dos votantes de 85–99 (demógrafo 09) e correções das seções novas (demógrafo 08)

Data: 30/10/2026. Revisão do commit `4ac218d`: `docs/analysis/demografo/09-salto-votantes-85-99.md` com `scripts/auditoria/demografo-85-99-salto.mjs`, o item 5b de `docs/analysis/demografo/08-secoes-novas-e-h01-2turno.md` com `scripts/auditoria/demografo-secoes-novas.mjs`, e a linha H01 de `docs/hipoteses.md`.

Tudo agregado (Brasil, UF, município, zona, seção). Nenhum CPF, nenhum título, nada de `data/private/`, sem rede. `data/raw` não foi varrido: só os zips nomeados foram abertos. Banco pela cópia de leitura (`2026-10-29T10:50`). No máximo 1 processo pesado por vez. Rótulos: **Fato**, **Estimativa** (sai de modelo), **Hipótese**, **Pendente**, **Recomendação**.

## Vereditos

| Item | Veredito | Motivo curto |
|---|---|---|
| 1. Números do doc 09 (série, Censo, municípios, zonas, piso sem biometria) | **sustentado** | Reproduzidos por outro caminho, iguais até a unidade |
| 2a. "Votante" mudou de definição | **refutada** (a explicação alternativa) | Total por idade = total por seção nos 3 anos; aptos = comparecimento + abstenção em todas as linhas |
| 2b. Data de referência da idade mudou | **refutada** | Faixas do comparecimento = faixas do perfil em **todas** as 6.106 zonas; e uma troca de data não muda a taxa da faixa |
| 2c. Transferência de títulos | **refutada** para o salto nacional | Transferência não cria votante no país; zonas com a mesma chave sobem igual (+72%) |
| 2d. Abstenção atípica em 2022 | **refutada** | 2022 ficou **acima** de 2018 nos idosos; o atípico é 2026 |
| 2e. Liberação sem digital por idade (diário de 2026) | **não testável com dado público** | O diário não grava idade; a regressão ecológica não tem poder (resultados impossíveis). **Pendente (LAI)** |
| 3. "Salto menor onde há mais títulos sem biometria" (−0,80) como argumento contra títulos de falecidos | **sustentado com ressalvas** só para títulos **sem** biometria; **não sustentado** para títulos de falecidos em geral | A mesma correlação aparece em 25–69 anos (geografia); com o cadastro fixo (2022, 1º → 2º turno) o sinal se inverte; nada diz sobre título **com** biometria; o 1º quinto "+103%" é artefato de empate |
| 4. Seções novas: tamanho (433 × 90,5) e juventude (80,1) | **sustentado com ressalvas** | Reproduzido exatamente; a juventude tem pouca base no estrato mais jovem; o excesso cresce no extremo da cauda (≥ 98%: 56 × 2) |
| Conclusão do demógrafo: "descarta uso em massa de títulos de falecidos; não descarta uso pequeno e espalhado" | **sustentado com ressalvas** | Vale para títulos **sem** biometria e para "a maior parte do salto". O canal "título com biometria + liberação manual" não foi testado |

## Scripts e saídas (caminho próprio)

```
node --max-old-space-size=6000 scripts/auditoria/cetico-43-pca.mjs       # ~3 min: BRASIL.csv de 2018, 2022 e 2026; detalhe por seção; BU
node --max-old-space-size=6000 scripts/auditoria/cetico-43-analise.mjs   # série, coorte, Censo, UF, municípios, zonas, regressão por contagem
node --max-old-space-size=6000 scripts/auditoria/cetico-43-extra.mjs     # zonas em todas as faixas, UF por população, 2022 entre turnos, piso/teto do canal, municípios × Censo, estimativa por vivo
node --max-old-space-size=6000 scripts/auditoria/cetico-43-novas.mjs     # seções novas: tamanho, juventude, limiar
```

Saídas em `data/parsed/auditoria/cetico-revisor/p43/` (`pca.json`, `pca-zonas.json`, `analise.json`, `extra.json`, `novas.json`).

Diferenças de caminho em relação ao demógrafo:
- lê o `BRASIL.csv` também em 2026 (ele leu os 28 CSV por UF);
- tira a faixa do **texto** `DS_FAIXA_ETARIA`, não do código, e guarda o par código → texto de cada ano;
- soma **todas** as colunas de quantidade (TTE, facultativo, obrigatório, deficiência), não só aptos e comparecimento;
- confere o total de votantes contra o `detalhe_votacao_secao` e o BU;
- confere a idade simples do Censo contra os grupos de 5 anos do próprio arquivo;
- confere o perfil por seção do demógrafo contra o `cadastro-secao.jsonl` (outra leitura do bruto, feita por outro auditor).

---

## 1. Reprodução (Fato)

### 1.1 Série, 1º turno, Brasil sem exterior e sem VT

| Faixa | Votantes 2018 | 2022 | 2026 | Aptos 2022 → 2026 | Taxa 2018 / 2022 / 2026 |
|---|---:|---:|---:|---|---|
| 25–59 | 81.608.379 | 84.930.861 | 83.710.450 | −0,2% | 84,2 / 83,7 / 82,6 |
| 70–74 | 2.628.207 | 3.586.278 | 4.785.687 | +18,3% | 55,3 / 61,1 / 68,9 |
| 75–79 | 1.187.990 | 1.611.724 | 2.487.406 | +23,5% | 37,5 / 41,8 / 52,3 |
| 80–84 | 475.771 | 653.575 | 1.019.734 | +13,3% | 24,1 / 27,0 / 37,2 |
| 85–89 | 148.661 | 209.762 | 356.147 | 1.333.976 → 1.464.715 | 13,3 / 15,7 / 24,3 |
| 90–94 | 33.682 | 49.745 | 89.530 | 738.244 → 664.482 | 4,9 / 6,7 / 13,5 |
| 95–99 | 5.082 | 7.591 | 14.661 | 466.703 → 337.136 | 1,9 / 1,6 / 4,3 |
| 100+ | 1.506 | 1.675 | 2.141 | 184.330 → 297.977 | 3,9 / 0,91 / 0,72 |

- Igual ao doc 09 em todas as faixas, até a unidade. 0 linha torta nos três arquivos (8.377.682, 8.785.738 e 11.060.908 linhas).
- **Censo:** a idade simples (códigos 6618 = 65 anos a 6652 = 99 anos, 6653 = 100+) soma exatamente os grupos de 5 anos do mesmo arquivo, em todas as faixas de 65 a 99. Teto de 2026 sem mortes: 85–89 2.202.470, 90–94 1.161.588, 95–99 461.087. Votantes ÷ teto: 16,17%, 7,71%, 3,18%. Igual ao doc 09.
- **Municípios:** 5.570 com código IBGE (1 sem). **0** com votantes de 85–99 em 2026 acima das pessoas de 80 a 95 anos no Censo de 2022; a maior razão é 0,61 (município pequeno de MG, 14 votantes). Igual ao doc 09.
- **Zonas:** 6.082 com a mesma chave nos dois anos; votantes de 85–99 de 266.644 para 459.207 (+72,2%). Igual.
- **Piso de votos com título sem biometria (1º turno de 2026):** 80–89 **12.004** em 307 zonas; 90–99 **970** em 222 zonas. Igual.
- **Estimativa por vivo:** vivos de 2026 (85–89 1.547.217; 90–94 657.955; 95–99 187.835) e mortalidade anual (6,56 / 10,82 / 16,77 / 25,63%) iguais aos do doc 09, por implementação própria.

### 1.2 Caso conferido no bruto

ES, município 56995, zona 0053, a zona com o maior piso de 80–89:
- `perfil_eleitor_secao_2026_ES.zip`, lido direto: 80–84 com 1.764 eleitores, 238 com biometria; 85–89 com 1.000, 74 com biometria. Total de 80–89: 2.764, sendo 312 com biometria.
- `perfil_comparecimento_abstencao_2026.zip`, CSV do ES: 619 + 215 = **834** votantes de 80–89.
- Piso: 834 − 312 = **522**. Confere.
- BU da zona (401 seções): 43.881 habilitados sem biometria cadastrada, de 102.082 votantes.
- Leitura: é uma zona onde os idosos quase não têm digital cadastrada (89% dos de 80–89) e votam a 30%. O piso aqui é o que se espera de idosos vivos sem biometria. **Não é indício por si.**

---

## 2. Explicações alternativas

### 2a. Mudou o que se conta como "votante"? Não (Fato)

| | Votantes no perfil por idade (sem exterior) | Comparecimento por seção (detalhe, Presidente, sem exterior) | Diferença |
|---|---:|---:|---:|
| 2018, 1º turno | 117.160.873 | 117.161.888 | −1.015 |
| 2022, 1º turno | 123.377.429 | 123.378.340 | −911 |
| 2026, 1º turno | 124.932.569 | 124.934.069 (BU no banco: 124.933.510) | −1.500 |

- O "votante" do arquivo por idade é quem compareceu à urna, nos três anos. Justificativa não entra.
- Em todas as linhas dos três arquivos, aptos = comparecimento + abstenção.
- De 70 anos para cima, 100% do comparecimento é "facultativo" nos três anos.
- A parcela de TTE (transferência temporária) entre os votantes de 85–89 é de 0,53% em 2022 e 0,13% em 2026: não pesa.
- A parcela "com deficiência" de 85–89 foi de 3,1% para 3,4%: também não pesa.

### 2b. Mudou a data de referência da idade? Não (Fato)

- Os pares código → texto das faixas são os mesmos em 2018, 2022 e 2026 ("85 a 89 anos" = 8589 etc.).
- 2022, gerado em 2025, tem 2.114.946 aptos de 16–17 anos. A idade é a da eleição, como o doc 09 diz.
- **Teste novo:** em 2026, os aptos por faixa do comparecimento (70–79, 80–89, 90–99, 100+) são **iguais** aos do perfil do eleitorado por seção em **todas** as 6.106 zonas, diferença 0. As duas fontes usam a mesma data de idade.
- **Por que isso não explicaria o salto de qualquer jeito:** uma troca de data move pessoas de uma faixa para a vizinha. Ela muda aptos e votantes juntos, na mesma proporção. Não pode fazer a **taxa** de 85–89 passar de 15,7% para 24,3% com os aptos subindo só 9,8%.

### 2c. Transferência de títulos? Não, para o salto nacional (Fato)

- Transferência muda o eleitor de zona; não cria votante no país.
- O exterior (ZZ) está fora dos números, e o VT não tem linha nos arquivos.
- Nas 6.082 zonas com a mesma chave nos dois anos, o salto é de +72%, o mesmo do país (267.098 → 460.338, +72,3%, nas faixas de 85–99 somadas).

### 2d. 2022 teve abstenção atípica? Não; o atípico é 2026 (Fato e Estimativa)

- **Fato:** em 2022 os idosos votaram **mais** que em 2018 (70–74: 55,3% → 61,1%; 85–89: 13,3% → 15,7%). Os de 25–59 ficaram parecidos (84,2% → 83,7%). 2022 não foi um ano de idoso em casa.
- **Fato, mesma geração quatro anos depois:**

| A geração que estava em... | 2018 → 2022 | 2022 → 2026 |
|---|---:|---:|
| 70–74 → 75–79 | −13,4 pontos | −8,8 |
| 75–79 → 80–84 | −10,5 | −4,7 |
| 80–84 → 85–89 | −8,4 | −2,7 |
| 85–89 → 90–94 | −6,5 | −2,3 |
| 90–94 → 95–99 | −3,3 | −2,4 |
| 95–99 → 100+ | −1,0 | −0,9 |

- **Fato:** a referência que não depende de cadastro é o 2º turno de 2022. O cadastro é o mesmo do 1º turno, nenhum título entra ou sai. Mesmo assim, os votantes subiram mais quanto mais velha a faixa:

| Faixa | 2022, votantes 2º turno ÷ 1º turno |
|---|---:|
| 25–59 | 1,00 |
| 70–74 | 1,07 |
| 80–84 | 1,17 |
| 85–89 | 1,23 |
| 90–94 | 1,28 |
| 95–99 | 1,34 |
| 100+ | 1,25 |

  Uma subida maior nas faixas mais velhas é, portanto, o que a mobilização produz, sem nenhuma mudança de cadastro.
- **Estimativa (fica fora da perícia):** na escala logística (a escala em que uma mesma "força" de mobilização se compara entre faixas com taxas muito diferentes), a subida de 2022 para 2026 **por pessoa viva** foi de 1,9 a 2,1 vezes a subida do 1º para o 2º turno de 2022, em **todas** as faixas de 70 a 99:

| Faixa | Razão |
|---|---:|
| 70–74 | 1,92 |
| 75–79 | 2,06 |
| 80–84 | 2,09 |
| 85–89 | 1,90 |
| 90–94 | 1,96 |
| 95–99 | 1,90 |

  Nas faixas de 70 a 84, aptos ≈ população do Censo, e a conta usa a taxa. Nas de 85 a 99, usa os vivos estimados.
  - O perfil por idade é regular: o salto tem a forma de uma mobilização maior que a de 2022, e não a de votos somados numa faixa.
  - Uso de títulos de mortos se concentraria em 95–99 e 100+, onde está o estoque de títulos sem pessoa (aptos de 95–99 eram 283% da população do Censo em 2022). Isso tiraria 95–99 do padrão. Exemplo: 3 mil votos falsos em 14.661 levariam a razão de 1,9 para cerca de 1,1.
  - Limite: depende da mortalidade e do Censo nas idades altas. Um erro de 10% nos vivos de 95–99 muda a razão em cerca de ±0,35.
- **Fato que destoa:** a geografia é outra. A subida do 1º para o 2º turno de 2022, por UF, não se correlaciona com o salto de 2022 para 2026 (−0,22). Em 2022 a subida entre turnos foi maior em MG, GO e CE; o salto de 2026 foi maior no Norte e no Nordeste. A causa da subida de 2026 continua **Hipótese**: mobilização, transporte, coorte.

### 2e. Liberação sem digital por faixa etária no diário de 2026 (não testável com dado público)

- **Fato:** o diário da urna registra o tipo de habilitação ("biométrica", "Ano de nascimento digitado é igual ao do cadastro", "Dado digitado confere" com mesário), mas **não** a idade nem o ano digitado (doc 06, `src/perfil-secoes.js`).
- **Fato:** o piso de 12.004 (80–89) e 970 (90–99) nunca passa do número de habilitados sem biometria cadastrada do BU da própria zona (0 zona em 6.106). As três fontes são coerentes.
- **Fato:** o teto do mesmo canal, zona a zona (menor entre votantes da faixa, aptos sem biometria da faixa e habilitados sem biometria do BU), é de **516.592** (80–89) e **50.345** (90–99). Entre piso e teto cabe quase tudo: os dados públicos não dizem quantos idosos votaram sem digital.
- **Tentativa ecológica (fica fora; sem poder):** regressão por zona, com efeito fixo de UF, dos habilitados sem digital (BU) contra os votantes por faixa (comparecimento por idade).
  - Por contagem, os coeficientes saem impossíveis: frações negativas e acima de 1, como −5,8 e 34,9.
  - Por taxa, ponderada, a parcela 80+ tem coeficiente 0,79 na liberação manual, e o "aumento dos 80+ além do ritmo dos 70–79" tem +0,32. Somados, passam de 1 (impossível). No desfecho "sem biometria cadastrada", o sinal se inverte (−1,70).
  - As faixas são quase colineares entre zonas. Esse caminho **não responde** se o idoso a mais votou com a própria digital.
- **Pendente (LAI), e é o teste que decide:** por zona ou seção, votantes de 80+ por tipo de habilitação (biometria do próprio eleitor, ano de nascimento, liberação pelo mesário), em 2022 e 2026. O TSE liga título a habilitação; os arquivos públicos não.

---

## 3. A correlação de −0,80 refuta o uso de títulos de falecidos?

### 3.1 O número reproduz, mas mede principalmente geografia (Fato)

Correlação entre UFs da parcela sem biometria dos 90–99 (perfil, jul/2026) com a variação dos votantes de 2022 para 2026:

| Faixa dos votantes | Ponderada (votantes 85–99 de 2022) | Sem peso | Por posto (Spearman) |
|---|---:|---:|---:|
| **25–59** (sem título de morto relevante) | **−0,74** | −0,69 | −0,73 |
| **60–64** | **−0,83** | −0,83 | −0,73 |
| 65–69 | −0,74 | −0,66 | −0,62 |
| 70–74 | +0,11 | −0,16 | −0,25 |
| 75–79 | +0,03 | −0,13 | −0,14 |
| 80–84 | −0,32 | −0,27 | −0,21 |
| **85–99** (doc 09) | **−0,80** | −0,66 | −0,48 |
| Excesso de 85–99 sobre 70–79 (log da razão de votantes) | −0,84 | −0,64 | −0,44 |
| Excesso por população (votantes ÷ Censo; teto sem mortes em 2026) | −0,79 | −0,63 | — |

- **Fato:** a parcela sem biometria separa Sul/Sudeste (RJ 88%, SP 77%, MG 77%, RS 60%) de Norte/Nordeste (abaixo de 6%). A mesma correlação, do mesmo tamanho, aparece em 25–69 anos, onde não há estoque de título de morto que faça diferença. O −0,80 sozinho não isola efeito de cadastro.
- **Fato, referência com cadastro fixo:** do 1º para o 2º turno de 2022, a subida dos votantes de 85–99 por UF teve correlação **+0,28** com a mesma parcela sem biometria (+0,24 no excesso sobre 70–79). Sem nenhuma mudança de cadastro, o sinal dessa correlação muda de uma eleição para outra. Ela acompanha a conjuntura política regional.
- **Fato, o que sobra:** tirando a subida dos 70–79 da própria UF, o excesso de 85–99 continua **menor** onde há mais títulos sem biometria (−0,84 ponderado, −0,44 por posto). Dentro de Sul+Sudeste+Centro-Oeste, com 11 UFs, a correlação é −0,73; dentro de Norte+Nordeste, com 16 UFs, −0,34. O que se pode afirmar é a forma fraca: **o salto não se concentra onde estão os títulos sem biometria**. A forma forte, "a correlação refuta o uso", não se sustenta.

### 3.2 Quintos de município: o "+103%" é artefato de empate (Fato)

- O 1º e o 2º quintos do doc 09 têm municípios com 0% sem biometria. O script ordena por essa parcela, e o empate em 0% fica na ordem de leitura. Qual município de 0% cai no 1º ou no 2º quinto depende dessa ordem.
- Com a minha ordem, os dois quintos ficam em **+73,7%** e **+88,2%**. No doc 09, eram +103% e +70%.
- Somados, são iguais nas duas leituras: 51.379 → 94.460, **+83,9%**.
- A tabela correta tem 4 grupos:

| Grupo de municípios (sem biometria 90–99) | Municípios | Votantes 85–99, variação | 70–74 (controle) | 25–59 |
|---|---:|---:|---:|---:|
| 0% a 0,9% (1º + 2º quintos) | 2.227 | +83,9% | +33,3% | +1,8% |
| 0,9% a 5,1% | 1.114 | +79,6% | +34,2% | −0,1% |
| 5,2% a 27% | 1.114 | +73,4% | +33,2% | −2,2% |
| 27% a 100% | 1.114 | +60,7% | +33,0% | −4,2% |

- O gradiente existe, mas é de +84% a +61%, e não de +103% a +61%. A frase "5º quinto +61% contra +103% no 1º" (doc 09, tabela d) deve sair.

### 3.3 Zonas: o doc 09 mostra 3 das 6 faixas, e só a taxa (Fato)

Mesmas zonas em 2022 e 2026, faixa pela parcela sem biometria dos 90–99 em 2026:

| Sem biometria 90–99 | Zonas | Aptos 90–99, 2022 → 2026 | Votantes 90–99 | Taxa | Votantes 70–79 |
|---|---:|---|---:|---|---:|
| 0–10% | 4.055 | −4,7% | +93,8% | 7,8 → 15,9 | +39,8% |
| **10–30%** | 693 | **−75,9%** (186.627 → 44.949) | +74,2% | **3,5 → 25,2** | +40,6% |
| **30–50%** | 69 | −68,8% | +66,8% | **4,3 → 23,2** | +39,5% |
| **50–70%** | 70 | +5,5% | +84,6% | 5,3 → 9,3 | +34,7% |
| 70–90% | 558 | −5,7% | +60,1% | 4,9 → 8,3 | +33,3% |
| 90–100% | 635 | −6,5% | +78,5% | 2,3 → 4,3 | +45,0% |

- **Fato:** nas faixas omitidas, a taxa de 90–99 multiplicou por 5 a 7. A causa é o denominador: os aptos caíram três quartos (limpeza do cadastro nessas zonas, sobretudo de SP, BA, SC e MG). Os votantes subiram como nas outras faixas.
- **Fato:** em **número de votantes**, a subida vai de +60% a +94% em todas as faixas, sem ordem. A faixa de 90–100% sem biometria sobe +78,5%, mais do que a de 70–90%.
- **Recomendação ao demógrafo:**
  - mostrar as 6 faixas;
  - comparar votantes, não taxa, porque a taxa mistura limpeza do cadastro com comparecimento;
  - trocar "a taxa praticamente dobrou tanto... quanto..." por "os votantes subiram de 60% a 94% em todas as faixas de zona, sem concentração nas zonas de idosos sem biometria".

### 3.4 E se o uso estiver justamente onde há biometria? (Hipótese não testada)

- Título de pessoa morta **com** digital cadastrada não passa pela urna com a digital de outra pessoa. O caminho é a liberação pelo mesário ("Dado digitado confere", com a digital do mesário no diário). Esse caminho existe onde o cadastro foi revisado (Norte e Nordeste), para quem morreu depois da revisão e ainda não teve o título cancelado.
- O salto é **maior** justamente nessas UFs. A correlação negativa é compatível com esse canal, e não o refuta.
- Contra ele há só a Estimativa da seção 2d: perfil por idade regular, por pessoa viva. Ela não exclui uso de alguns milhares de votos espalhados em 85–89, a faixa grande (356.147 votantes).
- O teste ecológico com liberação manual (2e) não tem poder. **Pendente (LAI):** mesmo pedido do item 2e, mais os títulos cancelados por óbito depois do fechamento do cadastro, com a data e se houve voto.

### 3.5 O piso de 12.004 (Fato e limite)

- Reproduz exatamente; faixas alinhadas; nunca passa do BU.
- É compatível com idosos vivos sem biometria: 27,9% dos aptos de 80–89 não têm digital, e o caso do ES mostra zonas inteiras assim.
- Sozinho, **não é indício**. O que daria sentido a ele é a comparação com 2022 (Pendente, perfil por seção de 2022 não baixado).
- O teto do canal é de 516.592. **Fato:** o arquivo público não diz se o canal "sem biometria" de 80–89 foi de 12 mil ou de 500 mil votos.

### 3.6 Poder dos outros dois testes do doc 09

- **"Votantes abaixo da população do Censo":** a barra é muito alta. O maior município chega a 61% do teto, e o país a 16% em 85–89. O teste derruba a ideia de que "não havia gente viva para tantos votos". Não detecta uso de títulos de mortos em escala de dezenas de milhares no país. O doc 09 o usa assim ("há gente viva de sobra"), corretamente.
- **"Não aparece em 100+":** vale como fato (1.675 → 2.141 votantes com o estoque subindo 61,7%). É argumento fraco contra quem evita de propósito o grupo de 100+, o mais vigiado. O Censo de 100+ (37.814) também é pouco confiável, pela idade declarada a mais.

---

## 4. Seções novas: controle por tamanho e juventude (doc 08, 5b)

### Reprodução (Fato)

Mesma definição de "nova". Exclusões: 41 seções sem pacote e 29 do Sistema de Apuração no 2º turno (31 no 1º). Juventude tirada de outra leitura do perfil (`cadastro-secao.jsonl`).

| 2º turno | Observadas | Esperadas | Razão | Doc 08 |
|---|---:|---:|---:|---|
| Tamanho, faixas de 25 aptos (método do doc 08) | 433 | **90,5** | 4,78 | 90,5 / 4,8 |
| Tamanho, teto de 600 e ≥ 50 antigas (método do parecer 41) | 433 | 84,5 | 5,09 | — |
| Tamanho, faixas de 10 aptos | 433 | 90,4 | 4,79 | — |
| Tamanho, sem TTE | 194 | 46,5 | 4,18 | 46,5 / 4,2 |
| Tamanho + juventude (4 faixas) | 433 | **80,1** | 5,31 | 80,1 / 5,3 |
| Tamanho + juventude, sem TTE | 194 | 46,3 | 4,16 | 46,3 / 4,2 |
| 1º turno, tamanho | 448 | 62,2 | 7,21 | 62,2 / 7,2 |

Tudo igual. A versão com a parcela sem biometria (65,1 esperadas) não foi refeita aqui.

### Ressalvas

1. **Pouca base no estrato mais jovem.** Na faixa de 20% ou mais de eleitores de 16–20 anos estão 16.109 novas e 205 das 433 com 95% ou mais. A comparação ali tem só **1.447 antigas, com 3 casos** de 95% ou mais. O "esperado" de metade dos casos repousa em 3 seções.
   - Com 10 faixas de juventude, 3.573 novas (109 com 95%+) caem em estratos sem nenhuma antiga.
   - Na versão do doc 08 com a parcela sem biometria, são 120 dos 433 casos.
   - A conclusão se mantém, porque nas faixas com base boa a nova continua muito acima: abaixo de 5% de jovens, 14 de 9.538 contra 100 de 297.025; de 5–10%, 70 de 6.868 contra 82 de 137.497; de 10–20%, 119 de 7.929 contra 17 de 22.376. Mas "a juventude não explica" vale para quem tem com quem comparar. Na seção nova muito jovem, quase não há antiga igual.
2. **O excesso depende do limiar e cresce no extremo** (tamanho + juventude, 2º turno):

| Limiar | Observadas | Esperadas | Razão |
|---|---:|---:|---:|
| 90% ou mais | 3.180 | 1.900 | 1,65 |
| 95% ou mais | 433 | 80 | 5,3 |
| 98% ou mais | 56 | 2 | 28 |

   "Cerca de 5 vezes" é uma propriedade do corte de 95%, e não do fenômeno. O que existe é uma cauda extrema muito mais pesada nas novas. As 56 novas com 98% ou mais (21 com TTE, mediana de 109 aptos, CE 9, PE 8, BA 6, MA 5, MG 5) são poucas para olhar uma a uma.
   **Recomendação:** conferir caso a caso tipo de local, TTE, liberação sem digital e diário.
3. **Absolvição falsa, repetida do parecer 41:** nenhum destes testes vê voto com título de outra pessoa. A liberação sem digital nas novas com 95% ou mais (7,17%) contra 0,27% de eleitores sem biometria no cadastro delas continua com a H07/H13.

---

## 5. A linha H01 de `docs/hipoteses.md` (para o coordenador corrigir; não editei)

Corrigir:
- "o salto é **menor** onde há mais títulos sem biometria (correlação entre UFs −0,80)". Acrescentar: "a mesma correlação aparece em 25–69 anos (efeito regional) e, com o cadastro fixo (2022, 1º → 2º turno), tem sinal contrário; o que se sustenta é que o salto não se concentra onde estão os títulos sem biometria (parecer 43)".
- "Descarta uso em massa de títulos sem biometria" está correto se ficar explícito: (i) "em massa" quer dizer "a maior parte do salto"; (ii) **não** cobre títulos com biometria liberados pelo mesário.

Acrescentar:
- Fato: a definição de votante e a data da idade não mudaram (seções 2a e 2b).
- Pendente (LAI): habilitação por tipo e idade, em 2022 e 2026.

## 6. O que corrigir no doc 09 (para o demógrafo; não editei)

1. Tabela de quintos: o 1º e o 2º quintos empatam em 0%. Juntar os dois (+83,9%) e tirar "+103% no 1º" da tabela (d).
2. Tabela de zonas: mostrar as 6 faixas e os votantes em número. As faixas omitidas têm a taxa multiplicada por 5 a 7, pela queda dos aptos.
3. Tabela (d), linha "onde há mais título antigo sem biometria": acrescentar que a correlação se repete em 25–69 anos e muda de sinal com o cadastro fixo. Trocar "os quatro testes apontam no mesmo sentido... e não um sinal de cadastro" por "...não um sinal de títulos **sem biometria**; o canal com biometria e liberação pelo mesário não foi testado".
4. Acrescentar a referência de 2022 entre turnos (cadastro fixo, subida maior nas faixas mais velhas) e a conferência faixa a faixa com o perfil em todas as zonas.

---

## 7. Textos para leigos (tópico 6 da perícia)

Sem nome de agente, sem arquivo, sem número de teste estatístico. Todos os números abaixo vêm de todas as seções e foram conferidos por dois caminhos independentes.

### 7.1 Os eleitores de 85 a 99 anos que votaram em 2026

> Do 1º turno de 2022 para o 1º turno de 2026, o número de eleitores de 85 a 99 anos que foram votar quase dobrou. De 85 a 89 anos, passou de 209.762 para 356.147. De 90 a 94, de 49.745 para 89.530. De 95 a 99, de 7.591 para 14.661. No mesmo tempo, o número de eleitores cadastrados nessas idades ficou parecido ou caiu. Um aumento assim chama a atenção, porque poderia ser sinal de alguém votando com o título de pessoas que já morreram. Por isso ele foi examinado por vários lados.
>
> **A régua não mudou.** O total de votantes contado por idade é o mesmo contado seção por seção, nas eleições de 2018, 2022 e 2026. A diferença foi de 1.015 votos em 2018, 911 em 2022 e 1.500 em 2026, em mais de 117 milhões de votantes a cada eleição. A idade é sempre a do dia da eleição. Em todas as zonas eleitorais, o número de eleitores de cada idade bate exatamente com o cadastro publicado antes da eleição. Ninguém "mudou de faixa" por causa de uma troca na forma de contar.
>
> **O aumento começou aos 70 anos.** De 70 a 74 anos, os votantes passaram de 3.586.278 para 4.785.687. De 75 a 79, de 1.611.724 para 2.487.406. De 80 a 84, de 653.575 para 1.019.734. Nessas idades quase não há títulos de pessoas mortas no cadastro. Quem tem 70 anos ou mais não é obrigado a votar, e esse grupo inteiro foi votar muito mais em 2026. Os de 85 a 99 seguiram o mesmo movimento.
>
> **Já tinha acontecido antes, com o cadastro parado.** Entre o 1º e o 2º turno de 2022, nenhum eleitor entrou ou saiu do cadastro. Mesmo assim, os idosos foram votar mais no 2º turno, e tanto mais quanto mais velhos: de 85 a 89 anos, de 209.762 para 257.033; de 95 a 99, de 7.591 para 10.161. Entre os eleitores de 25 a 59 anos, quase nada mudou. Quando uma eleição mobiliza, os mais velhos são os que mais mudam de comportamento. É como uma maré: ela sobe mais onde a água estava mais baixa.
>
> **Há gente viva de sobra.** Pelo Censo de 2022, havia 2.202.470 pessoas com idade para ter de 85 a 89 anos em 2026, contando como se ninguém tivesse morrido. Os 356.147 votantes dessa idade são 16 em cada 100 delas. Para 95 a 99 anos, são 3 em cada 100. Nenhum dos 5.570 municípios teve mais votantes de 85 a 99 anos do que moradores dessas idades no Censo.
>
> **Os centenários não subiram.** O grupo de 100 anos ou mais é onde está a maior parte dos títulos de pessoas que já morreram e não foram retiradas do cadastro. O cadastro desse grupo cresceu de 184.330 para 297.977. Os votantes foram de 1.675 para 2.141. Não houve salto ali.
>
> **O aumento não se concentrou nos títulos antigos sem digital.** Os estados onde a maioria dos idosos não tem digital cadastrada tiveram aumento menor que os estados onde quase todos têm. Exemplos: Rio de Janeiro +56%, São Paulo +61%, Minas Gerais +63%, Rio Grande do Sul +60%, contra Ceará +103%, Pará +106% e Piauí +102%, para os votantes de 85 a 99 anos. Essa diferença entre estados também tem causas regionais, que aparecem em outras idades. Por isso ela mostra só que o aumento não está onde estão os títulos sem digital, e não a causa do aumento.
>
> **O que isso permite dizer:** o aumento dos votantes de 85 a 99 anos faz parte de uma subida geral do comparecimento de quem tem 70 anos ou mais. Ele não precisa de títulos de pessoas mortas para existir, e não se concentra nos títulos sem digital.
>
> **O que isso não permite dizer:** que nenhum título de pessoa morta foi usado. Um uso pequeno e espalhado não apareceria nesses números. Também não foi possível ver se os idosos a mais votaram com a própria digital ou foram liberados pelo mesário: o registro da urna anota como o eleitor foi liberado, mas não a idade dele. Pelo menos 12.004 votos de eleitores de 80 a 89 anos e 970 de 90 a 99 anos vieram de títulos sem digital cadastrada. Podem ser de idosos vivos sem digital, que são muitos nessas idades (em algumas zonas, quase todos), ou de alguém usando o título de outra pessoa. Os arquivos públicos não separam um caso do outro. Esses dados foram pedidos à Justiça Eleitoral.

**Pendente (sem número):**
- votantes de 80+ por tipo de liberação (digital do próprio eleitor, ano de nascimento, liberação pelo mesário), em 2022 e 2026;
- títulos cancelados por óbito depois do fechamento do cadastro, e se houve voto;
- o mínimo de votos de idosos sem digital em 2022;
- a causa da subida dos idosos em 2026.

### 7.2 Seções novas (atualiza o texto do parecer 41)

> Seções criadas depois de 2022 chegaram a 95% de comparecimento ou mais com muito mais frequência que as antigas. No 2º turno de 2026, isso aconteceu em 433 das 40.740 seções novas e em 206 das 458.438 antigas. A seção nova costuma ser menor, e seção pequena varia mais, como uma moeda jogada 10 vezes varia mais que uma jogada 300 vezes. Também costuma reunir eleitores que acabaram de tirar o título. Mesmo comparando seções do mesmo tamanho e com a mesma parcela de eleitores jovens, a nova ainda chega a 95% bem mais vezes. Entre as seções com 10% a 20% de eleitores de 16 a 20 anos, por exemplo, foram 119 de 7.929 novas contra 17 de 22.376 antigas. A diferença fica maior quanto mais alto o corte: a 98% ou mais, foram 56 seções novas e 10 antigas. No mesmo prédio de votação, a seção nova vota em média um pouco **menos** que as antigas, e as antigas desses prédios votaram em 2026 como em 2022. Esse mesmo excesso de seções novas muito altas já aconteceu em 2022, em escala menor, e desapareceu nos anos seguintes. Ainda não se sabe por que o de 2026 é maior, nem se ele vem de a seção nova reunir eleitores que se cadastraram ou se mudaram há pouco tempo: esse dado foi pedido à Justiça Eleitoral. O exame mede cadastro e comparecimento, não diz se algum voto foi irregular.

### 7.3 Fica fora da perícia

- Vivos estimados com mortalidade (por exemplo, "23% dos vivos de 85–89 votaram") e a razão de cerca de 2 vezes por pessoa viva (seção 2d).
- Os coeficientes de correlação (−0,80 e os outros) e a correlação dentro de região.
- O gradiente por quintos de município (é sensível ao empate) e as taxas por faixa de zona (misturam limpeza do cadastro).
- Toda regressão (ecológica por zona, efeito fixo).
- "Cerca de 5 vezes", 4,8, 5,3, "cerca de 340 seções a mais": são razões de modelo, e o tamanho depende do limiar.
- O teto do canal sem biometria (516.592): é verdadeiro, mas só diz que o dado público não limita o canal. Basta a frase "os arquivos públicos não separam".
- 2014: as faixas de 95–99 e 100+ têm outra regra de cadastro.
