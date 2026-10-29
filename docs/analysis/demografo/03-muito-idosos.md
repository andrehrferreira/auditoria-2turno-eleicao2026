# 03. Eleitores muito idosos: cadastro × população e comparecimento

Comando: `node --max-old-space-size=8192 scripts/auditoria/demografo-analise.mjs` (seções `t2_muito_idosos`, `t2_comparecimento_idosos` e `t2_composicao_comparecimento` de `resumo.json`; listas `secoes-idosos-<t>t.tsv`).

## 1. O cadastro tem muito mais eleitores de 100 anos do que pessoas vivas com essa idade

| Faixa em 2026 | Eleitores (perfil, jul/2026) | Coorte no Censo 2022 | Razão |
|---|---|---|---|
| 70+ | 17.213.498 | 66+: 20.344.340 | 0,85 |
| 80+ | 5.508.398 | 76+: 7.502.338 | 0,73 |
| 90+ | 1.299.590 | 86+: 1.772.099 | 0,73 |
| **100+** | **297.977** | **96+: 149.424** | **1,99** |

- **Fato:** há 297.977 eleitores aptos com 100 anos ou mais. O Censo 2022 contou 37.814 residentes com 100+ e 149.424 com 96+. Mesmo que **ninguém** da coorte 96+ tivesse morrido em 4 anos, o cadastro teria o dobro.
- **Fato:** com a mortalidade anual do grupo 90+ (19,3%: 151.350 óbitos/ano em 2023–2024 ÷ 782.721 residentes 90+ em 2022, IBGE), a coorte 96+ chegaria a 2026 com cerca de **63 mil** pessoas, uma estimativa generosa (aos 96–100 anos a mortalidade é maior; para 100+ é 31,2% ao ano). Ficam **cerca de 235 mil títulos de 100+ além do que a população comporta**.
- **Fato:** 92,0% dos eleitores 100+ (274.143) **não têm biometria cadastrada**; para 90–99 anos são 55,4%; 80–89, 27,9%; 18–69, 9,7%.
- **Fato:** em 1.068 municípios o número de eleitores 100+ é maior que a coorte 96+ do Censo. Casos extremos: Toledo (MG) 68 eleitores 100+ e 1 residente 96+ em 2022; Munhoz (MG) 48 e 0; Santa Rita de Caldas (MG) 47 e 1; Capetinga (MG) 70 e 3; Sant'Ana do Livramento (RS) 1.020 e 58. Lista em `resumo.json` (`top_100mais`).

**Leitura.** Explicações que não envolvem fraude: data de nascimento errada em registro antigo (ano mal digitado, data padrão); eleitor que mora fora e mantém o título. Pelo princípio 8, **não** vale "o cartório comunica o óbito": a baixa depende de gente. **Hipótese:** a maior parte desses ~235 mil títulos é de pessoas mortas ou de cadastros com idade errada, e quase todos só exigem o ano de nascimento para habilitar. É a afirmação **A** do doc 04 (falha de higiene do cadastro) medida em agregado. **Não prova voto.**

## 2. Esses títulos foram usados? (comparecimento por composição etária)

Teste ecológico por seção, com efeito fixo de município (cada seção comparada à média do seu município, o que neutraliza diferenças regionais de comparecimento). Variável: comparecimento de Presidente ÷ aptos. Explicativas: parcela de cada faixa etária no eleitorado da seção, separando 90–99 com e sem biometria e o grupo 18–69 sem biometria. Base: 18–69 com biometria. Seções com 50+ eleitores.

- **Hipótese nula (títulos de mortos nunca usados):** o coeficiente da parcela 100+ fica perto de **−0,83**, isto é, o grupo tem comparecimento ≈ 0 contra ≈ 83% do grupo base.
- **Hipótese alternativa (títulos usados):** coeficiente bem menos negativo.

| Coeficiente (efeito fixo de município) | 1º turno | 2º turno |
|---|---|---|
| parcela 100+ | **−1,11** | **−1,20** |
| parcela 90–99 sem biometria | −0,85 | −0,97 |
| parcela 90–99 com biometria | −0,35 | −0,32 |
| parcela 80–89 | −0,31 | −0,25 |
| parcela 70–79 | −0,09 | −0,01 |
| parcela 16–17 | +0,12 | +0,07 |
| parcela 18–69 sem biometria | −0,11 | −0,11 |
| n seções / R² | 497.385 / 0,21 | 497.385 / 0,18 |

- **Fato:** os coeficientes de 100+ e de 90–99 sem biometria são iguais ou mais negativos que −0,83. **Em agregado, esses grupos se comportam como quem não vota.** O resultado é o oposto do que se veria com uso sistemático desses títulos.
- **Fato:** em 22.389 seções com 5 ou mais eleitores de 100+, em **nenhuma** o comparecimento obrigou algum deles a ter votado (comparecimento ≤ aptos − eleitores 100+). Idem para seções com 10+ eleitores 90+. É um limite fraco: a abstenção dos demais eleitores é grande.
- **Hipótese:** o coeficiente abaixo de −0,83 indica que seções com muitos títulos de 100+ também têm outros eleitores ausentes (cadastro velho em geral, migração).
- **Limite do teste:** o teste é ecológico e nacional. Não detecta uso **localizado** (poucas seções, poucos títulos). Uso de 1 ou 2 títulos por seção não aparece no agregado.

## 3. Comparecimento dos idosos (limite inferior por seção)

Se todos os eleitores abaixo de 70 anos de uma seção votassem, quantos idosos precisariam ter votado? `lb70 = max(0, comparecimento − (aptos − eleitores 70+)) ÷ eleitores 70+` (idem para 80+). Grupos com 20+ eleitores.

| | 1º turno | 2º turno |
|---|---|---|
| seções com lb70 > 50% | 678 | 2.246 |
| seções com lb70 > 80% | 2 | 9 |
| seções com lb80 > 50% | 0 | 2 |
| seções com lb80 > 80% | 0 | 0 |

Comparecimento por parcela de 70+ na seção (2º turno): 81,1% (0–5%), 82,2% (5–10%), 80,4% (15–20%), 76,0% (25–30%), 73,2% (35–40%), 71,4% (45%+). Cai com a idade, como esperado.

- **Hipótese:** as 9 seções com lb70 > 80% no 2º turno e as 2 com lb80 > 50% são candidatas a exame (lista em `secoes-idosos-2t.tsv`, ordenada). As duas com lb80 > 50%, conferidas no BU do banco (os valores batem com o `detalhe_votacao_secao`):
  - **MA, Arame (09679), zona 0104, seção 0070:** 242 aptos, 28 eleitores 80+ (26 deles 80–99). Comparecimento 214 (88,4%) no 1º turno e 231 (95,5%) no 2º; ao menos 15 dos 26 eleitores 80+ votaram no 2º turno. Habilitação por ano de nascimento com digital falha (`por_biografia`) subiu de 7 para 16; sem biometria cadastrada, de 20 para 23 (o perfil tem 30 sem biometria). Candidata a exame do log (mesário, horário, rajadas).
  - **RS, Aratiba (85170), zona 0020, seção 0014:** 197 aptos, 47 eleitores 70+ (22 com 80+), comparecimento 188 (95,4%) no 2º turno; 48 habilitações `por_biografia`. O 1º turno do RS ainda não estava no banco. Comparecimento muito alto é comum em municípios pequenos do RS (contexto para o cientista político). A linha de base do comparecimento de 70+ e 80+ por município é publicada pelo TSE (`perfil_comparecimento_abstencao`), mas esse arquivo **não estava no disco** quando este documento foi escrito. Ele foi baixado depois e analisado no [doc 07](07-comparecimento-oficial-idosos.md), que confirma com dado oficial: no 1º turno, 0,72% dos eleitores 100+ votaram.

## Recomendação

- Pedir ao TSE, por LAI: quantos títulos aptos com 100+ anos existem por município, quantos tiveram comparecimento registrado em 2026 e quantos foram cancelados por óbito depois de 07/05/2026. É a afirmação **B** do doc 04, que os arquivos públicos não respondem.
- Baixar `perfil_comparecimento_abstencao` 2026 do CDN do TSE (fora do escopo de rede deste agente) para ter o comparecimento oficial por faixa etária e por município.
- Examinar no log as seções de `secoes-idosos-2t.tsv` com lb80 > 50%: horário e rajadas de habilitação por ano de nascimento.
