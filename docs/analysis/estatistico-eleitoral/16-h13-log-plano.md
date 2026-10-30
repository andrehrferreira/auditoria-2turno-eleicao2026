# 16. H13 pelo diário da urna: plano (registrado antes de rodar)

Estatístico eleitoral, **30/10/2026**. Hipótese H13 de [hipoteses.md](../../hipoteses.md): os eleitores liberados sem digital votaram majoritariamente no 13, sobretudo no Nordeste. Este plano foi escrito **antes** de qualquer conta de liberação contra voto. Os cortes não mudam depois de ver os dados; o que vier depois fica marcado como **exploratório** no resultado ([18](18-h13-log-resultado.md)).

## O que já existe e o que falta

- Os cinco métodos de [hipotese-liberacao-mesario](../hipotese-liberacao-mesario/00-sintese.md) usaram o BU (L2 = todo liberado sem digital) e o perfil de log anterior à correção da ordem das linhas (L1 = liberação com mesário identificado). A perícia (tópico 4, item 6.4) deixa **pendente** "a mesma conta aritmética com a liberação contada no log (mesário identificado), depois que os resumos dos logs forem refeitos com a ordem das linhas corrigida".
- Os perfis em `data/parsed/<t>t/perfil/` (e a tabela `perfil_log` da cópia de 29/10 10:50) foram gerados às 04:13 (2º turno) e 06:07 (1º turno) de 29/10, **antes** do commit 329d484 (08:45, "perfis sem reordenar logs"). Por isso a contagem por via sai de uma **leitura própria do diário**, a mesma da H08 ([15](15-h08-plano.md)), por fluxo de urna, sem reordenar linhas; o `perfil_log` e o BU servem de conferência (diferenças relatadas, seção a seção).

## Limite estrutural (vale para tudo)

O voto é secreto. O diário diz **como** cada eleitor foi liberado; o RDV não liga voto a eleitor. Nada aqui mede o voto de quem foi liberado. Só se mede:

1. **cerco aritmético** por seção (o que os totais da própria seção obrigam ou permitem); e
2. **associação entre seções**: se as seções que liberam mais por uma via votam mais no 13 do que seções comparáveis.

## Vias (por ciclo de eleitor que termina em voto computado, pela leitura própria)

| Via | Regra no diário | Corresponde no BU |
|---|---|---|
| V1 digital | `Tipo de habilitação do eleitor [biométrica]` | por biometria |
| V2 ano de nascimento | sem V1, com `Ano de nascimento digitado é igual ao do cadastro` | sem biometria cadastrada |
| V3m manual com mesário | sem V1/V2, com `Dado digitado confere` e `Mesário … habilitou o eleitor` | habilitados por biografia (parte) |
| V3s manual sem mesário | sem V1/V2, com `Dado digitado confere` e sem mesário associado | habilitados por biografia (parte) |
| outra | nenhuma das marcas (contada e relatada) | — |

Exposição x_v = (ciclos da via v) / (votos computados no diário da seção).

## Dados

- Diários: leitura própria (H08), dois turnos, 28 UFs.
- BU (cópia de leitura `eleicao2026-20261029T105000.sqlite`, `abrirLeitura()`): `voto_bu` presidente (cargo 1), votos do 13, do 22, branco e nulo; `secao` (comparecimento, detalhamento, `local`, `modelo_urna`).
- Perfil do eleitorado por seção (`data/parsed/auditoria/forense/perfil/<uf>.csv`, tirado de `perfil_eleitor_secao_2026`): eleitores, com biometria, 60+, 16–24, escolaridade baixa, superior.
- **Exclusões declaradas:** exterior (lá não há V1; entra só no descritivo e no cerco); seções sem log ou com votos do diário ≠ comparecimento do BU (relatadas; sensibilidade com elas); seções sem perfil do eleitorado; seções com menos de 20 votos em 13 + 22 no turno usado; seções sozinhas no seu local de votação (sem comparação dentro do local).

## Parte A. Cerco aritmético por via (Fato, sem modelo)

Por seção, com L liberados pela via, T votos de presidente, v13 e v22: a parte de L no 13 está entre max(0, L − (T − v13)) e min(L, v13). Pior caso para o 13: os liberados dão ao 13 o máximo e ao 22 o mínimo compatível, e esses votos são anulados. Somado por região e Brasil, para V2, V3m, V3s, V3 = V3m + V3s e V2 + V3, no 2º turno. Esta é a conta pendente da perícia 6.4 com a liberação do diário.

## Parte B. Associação entre seções (estimativa; Hipótese de modelo)

**Modelo primário (fixado agora):** mínimos quadrados ponderados (peso n = votos 13 + 22), com **efeito fixo de local de votação** (UF, município, zona, local): cada seção é comparada só com as do mesmo prédio.

- Nível: Y = v13 / (v13 + v22) do 2º turno, sobre x_V2, x_V3m, x_V3s do 2º turno.
- Painel: ΔY = Y(2º) − Y(1º) (13 / (13 + 22) em cada turno), sobre Δx_V2, Δx_V3m, Δx_V3s.
- Controles nos dois: fração sem biometria no cadastro, 60+, 16–24, escolaridade baixa, superior, log do eleitorado, modelo da urna no 2º turno (UE2013, UE2015, UE2020; base UE2022).
- Erro-padrão robusto por agrupamento no local de votação (CR1).
- **Linha de base (fora da família de testes):** o mesmo modelo de nível no 1º turno, com as vias do 1º turno.
- **Sensibilidade (exploratória):** sem controles; efeito fixo de zona em vez de local; com as seções em que diário ≠ BU.

**β_v** = diferença em Y por unidade de x_v, condicional ao local e aos controles. Sob a suposição ecológica de voto constante dentro do local, β_v ≈ (parcela no 13 dos liberados pela via v) − (parcela dos eleitores pela digital), em pontos.

**Família de testes:** {Brasil, 5 regiões, 27 UFs} × {V2, V3m, V3s} × {nível, painel} = 198, mais a diferença Nordeste − resto do Brasil para cada via e desfecho (6): **204 testes**, bicaudais.

- **Bonferroni** α = 0,05 / 204 (|z| ≥ 3,67) para qualquer afirmação confirmatória.
- **Benjamini-Hochberg** a 5% relatado ao lado, como gerador de hipótese.

## Tamanho do efeito que o teste veria (declarado agora)

Modelo de fraude: numa fração f dos liberados pela via v, um voto no 13 entra no lugar de um ausente (voto a mais).

- **Nível:** em cada seção, f·L_v votos a mais no 13.
- **Painel:** em cada seção, f·max(0, L_v(2º) − L_v(1º)) votos a mais no 13 só no 2º turno.

O script injeta a fraude com f = 1% nos dados reais, refaz a regressão e mede o deslocamento de z. O f mínimo detectável com 80% de poder é f_MDE = 0,01 × (3,67 + 0,84) / (deslocamento de z por f = 1%). Em votos: f_MDE × Σ L_v (nível) ou f_MDE × Σ ΔL_v⁺ (painel), por unidade. O mesmo para fraude a favor do 22, por simetria.

## O que este desenho não vê (declarado agora)

- Fraude **igual em todas as seções de um local de votação** (absorvida pelo efeito fixo) ou **alinhada aos controles**.
- Fraude **igual nos dois turnos** (some no painel; no nível, se confunde com a associação estrutural, por isso o 1º turno é linha de base).
- Fraude **não proporcional** à liberação (poucos votos fixos por seção, ou só em poucas seções): o modelo linear tem pouco poder para ela.
- O voto de quem foi liberado: nunca é observado.

## Saídas

- `scripts/auditoria/estatistico-h13-log-analise.mjs` (lê a saída por seção de `estatistico-h08-varredura.mjs` e o banco).
- `data/parsed/auditoria/estatistico/h13-log/`: cerco por via e região, tabela dos 204 testes, MDE, conferência diário × BU × perfil_log.
