# 01. Forense estatística: dados, método e limites

Auditor D (forense estatística eleitoral), 29/10/2026. Presidente, 2º turno (país inteiro) e 1º turno (UFs já carregadas no banco).

## O que estes testes podem e não podem dizer

- Os testes abaixo são **indícios estatísticos**. Uma anomalia estatística sozinha **não prova fraude**, e a ausência de anomalia também não prova que não houve fraude. Ela só diz que os números não têm as marcas que esses métodos conhecidos detectam.
- Explicações benignas aceitas aqui (princípio 8 de `docs/01-premissas.md`): só as **estatísticas, geográficas e demográficas** (seção pequena, aldeia, quilombo, reduto, presídio, exterior, perfil de idade e escolaridade) e os **controles técnicos que deixam rastro nos arquivos** (lacres e assinaturas da urna, BU = RDV = resultado oficial). Nenhum procedimento feito por pessoas (mesário, fiscal, junta) foi usado como explicação.

## Dados (só disco local, nada da rede)

| Arquivo | Origem | Comando |
|---|---|---|
| `data/parsed/auditoria/forense/secoes-<t>t.csv` | banco `data/db/eleicao2026.sqlite` (`secao`, `secao_eleicao`, `voto_bu`), só leitura | `node scripts/auditoria/forense-base.mjs 2` (e `1`) |
| `forense/perfil/<uf>.csv` | `perfil_eleitor_secao_2026_<UF>.zip` (cadastro de 17/07/2026): eleitores, 60+, 16–24, escolaridade baixa (analfabeto, lê e escreve, fundamental incompleto), superior, raça/cor indígena, quilombola | `node scripts/auditoria/forense-eleitorado.mjs perfil` |
| `forense/locais.csv` | `eleitorado_local_votacao_2026.zip`: nome e tipo do local, seção principal/agregada | `node scripts/auditoria/forense-eleitorado.mjs local` |

- **Fato:** a tabela do 2º turno tem 499.207 seções (499.205 com voto válido); 13 = 64.256.232, 22 = 59.826.041, comparecimento 128.236.074. É igual à soma de H03 (BU = oficial). Em todas as seções, votos de presidente = comparecimento.
- **Fato:** 1º turno, 15 UFs carregadas na hora da rodada (ac, al, am, ap, ba, ce, df, es, go, ma, mg, ms, mt, pa, pb), 228.269 seções. É a linha de base parcial: falta o resto do país.
- O perfil das seções agregadas foi somado ao da principal (`locais.csv`). O perfil cobre 478 mil seções de 499 mil (exterior e algumas sem casamento ficam sem controle).

## Categorias de seção (para as explicações benignas)

`forense-lib.mjs → categoria()`, por prioridade: `exterior` (UF zz), `prisional` (tipo de local "Preso provisório"), `transito`, `indigena` (nome do local com ALDEIA/INDÍGENA ou ≥ 50% do eleitorado indígena no cadastro), `quilombola` (nome com QUILOMBO ou ≥ 50% quilombola), `temporario`, `comum`.

**Limite (Fato):** a raça/cor do cadastro vem "não informado" para boa parte dos eleitores e muitos locais em aldeia não têm "aldeia" no nome (ex.: "E. M. BRAZ TUKUNA", Atalaia do Norte). Então `comum` ainda contém aldeias, comunidades ribeirinhas, quilombos e assentamentos. A categoria **subestima** as explicações benignas.

## Modelos nulos usados

| Teste | Nulo |
|---|---|
| A3/A4 | Binomial com a taxa da zona ou do município (sem a própria seção); beta-binomial com a taxa e a sobredispersão (ρ) da zona |
| Klimek | Permutação do comparecimento entre seções da mesma zona (20×) |
| Dígitos | Uniforme / Benford, e votos simulados pela beta-binomial da zona (10×), que não têm fraude por construção |
| z robusto | Normal (referência), e z do resíduo depois do perfil do eleitorado |
| Redondos | Vizinhos não redondos do histograma; reamostragem binomial com n e parcela de cada seção (20×) |

O binomial supõe eleitores homogêneos dentro da zona e **sempre** subestima a cauda. A beta-binomial admite a heterogeneidade real entre seções (bairros, povoados) e é o nulo mais honesto dos três, mas um ρ único por zona ainda subestima a cauda quando a zona mistura cidade e aldeia.

## Scripts (Node 24, sem dependências)

`scripts/auditoria/forense-{lib,base,eleitorado,a3a4,klimek,digitos,zscore,redondos,assimetria,conferir}.mjs`. Saídas em `data/parsed/auditoria/forense/` (JSON, CSV, SVG e logs `log-*.txt`). Ordem para reproduzir:

```bash
node scripts/auditoria/forense-base.mjs 2 && node scripts/auditoria/forense-base.mjs 1
node scripts/auditoria/forense-eleitorado.mjs perfil && node scripts/auditoria/forense-eleitorado.mjs local
for t in 2 1; do for s in a3a4 klimek digitos zscore redondos; do node scripts/auditoria/forense-$s.mjs $t; done; node scripts/auditoria/forense-assimetria.mjs $t; done
```

Simulações com semente fixa: a rodada repete os mesmos números.
