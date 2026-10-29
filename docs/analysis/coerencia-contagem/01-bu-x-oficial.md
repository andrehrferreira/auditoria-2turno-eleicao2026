# 01. Soma dos BUs × resultado oficial, todos os cargos (teste 1, H03, doc 07 A1/B2)

Auditor A (contagem e coerência), 29/10/2026.

## Pergunta e hipótese nula

- **Pergunta.** O resultado oficial publicado pelo TSE (dados abertos) é a soma dos BUs assinados, em todos os cargos e nos dois turnos?
- **H0.** Para cada seção (presidente) e para cada município × zona × candidato (todos os cargos), o oficial é igual à soma dos BUs.
- **Explicações benignas para divergência, se houvesse:**
  - seções não instaladas;
  - Sistema de Apuração (SA);
  - BU gerado pelo Recuperador de Dados (RED);
  - votos de legenda;
  - candidatos sem registro válido na totalização;
  - votos anulados em apuração separada;
  - atraso na geração dos arquivos.

## Fontes

| Arquivo | Conteúdo | Gerado em |
|---|---|---|
| `votacao_secao_2026_BR.zip` | votos por seção e votável, só presidente, 2 turnos | 26/10/2026 12:07:25 |
| `votacao_candidato_munzona_2026.zip` | votos nominais por candidato, município e zona, todos os cargos (sem branco, nulo e legenda) | 28/10/2026 19:31:39 |
| `detalhe_votacao_secao_2026.zip` | totais por seção e cargo (doc 02) | 26/10/2026 09:49:06 |
| Banco `data/db/eleicao2026.sqlite` | BUs dos dois turnos (`voto_bu`) | carga de 29/10/2026 |

Brancos, nulos e legenda de todos os cargos, seção a seção, estão no doc 02 (0 divergência).

## Resultado: 2º turno (país inteiro)

**Fato.**

- **Presidente por seção:** 499.205 seções, 0 divergência (já registrado em H03 por `scripts/h03-bu-x-oficial.mjs`).
- **Munzona:**

| Cargo | Pares zona×candidato | Iguais | Soma BU | Soma oficial | Diferença |
|---|---:|---:|---:|---:|---:|
| Presidente | 12.584 | 12.584 | 124.082.273 | 124.082.273 | 0 |
| Governador (AC, AM, DF, ES, RN, TO) | 1.026 | 1.026 | 9.404.837 | 9.404.837 | 0 |

## Resultado: 1º turno (parcial: 13 UFs carregadas, AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT)

**Fato. Presidente por seção (`votacao_secao`):**

- 196.730 seções com BU e as mesmas 196.730 no oficial. 0 divergência em todos os votáveis, inclusive branco (95) e nulo (96).
- 13: 23.178.070; 22: 19.810.220; nulos: 1.425.396; brancos: 797.198. Valores iguais no BU e no oficial.

**Fato. Munzona (votos nominais):**

| Cargo | Pares | Iguais | Soma BU | Soma oficial | BU − oficial | Pares só no BU |
|---|---:|---:|---:|---:|---:|---:|
| Presidente | 32.022 | 31.152 | 46.425.582 | 46.423.597 | 1.985 | 870 |
| Governador | 20.950 | 20.931 | 44.298.124 | 44.289.668 | 8.456 | 19 |
| Senador | 31.074 | 30.903 | 80.882.811 | 80.816.197 | 66.614 | 171 |
| Dep. Federal | 1.111.495 | 1.108.988 | 43.468.799 | 43.455.883 | 12.916 | 2.507 |
| Dep. Estadual | 1.533.935 | 1.532.378 | 39.907.237 | 39.902.897 | 4.340 | 1.557 |
| Dep. Distrital | 7.935 | 7.885 | 1.628.400 | 1.627.913 | 487 | 50 |

- **Todas** as 5.174 divergências são do mesmo tipo: o BU tem votos para um número e o munzona não tem linha para aquele número. Não há nenhum par com valores diferentes dos dois lados, nem par só no oficial.
- São **107 números** (UF × cargo × número) que faltam no munzona inteiro e também na referência de candidatos do banco (`candidato`, de `resultados.tse.jus.br`). Somam 94.798 votos no BU: presidente 13 (1.985 votos), governador 1 (8.456), senador 3 (66.614), dep. federal 38 (12.916), dep. estadual 49 (4.340), dep. distrital 3 (487).
- Os mesmos votos **estão** no `votacao_secao` (ex.: presidente nº 28, 1.985 votos, BU = oficial seção a seção) e no `detalhe_votacao_secao`, contados como nominais (doc 02).
- **Hipótese:** são candidaturas canceladas, renunciadas ou indeferidas depois da carga das urnas. O número continua na urna e o voto é nominal no BU, mas a totalização o trata como nulo e não publica o candidato no munzona. **[a confirmar]** em `consulta_cand_2026` (situação da candidatura), que não está baixado. Isso não muda nenhum total do BU; muda só como o oficial classifica esses votos.
- O munzona separa a destinação dos votos: "Válido", "Anulado sub judice", "Anulado" e "Válido (legenda)". A coluna `QT_VOTOS_NOMINAIS` inclui todas, e é ela que bate com o BU.

## Conclusão

- **Fato:** H0 vale para todos os cargos e os dois turnos testados. Onde o oficial publica o número, o valor é igual à soma dos BUs. A diferença no munzona é de cobertura: 107 números omitidos, sempre a favor do "BU tem mais". Nenhum caso em que o oficial tenha voto que o BU não tem, ou valor diferente.
- **Fato:** não há variação sistemática a favor de nenhum candidato (B2). A diferença é zero em todos os candidatos publicados.
- **Recomendação:** baixar `consulta_cand_2026` e confirmar a situação dos 107 números. Somar à parte esses 94.798 votos (13 UFs) quando se comparar o total de nulos do BU com a totalização.

## Reproduzir

```bash
node scripts/auditoria/contagem-munzona.mjs --turno 2
node scripts/auditoria/contagem-munzona.mjs --turno 1            # todas as UFs já carregadas no banco
node scripts/auditoria/contagem-secao-presidente.mjs --turno 1   # presidente por seção, lendo o CSV direto do zip
node scripts/auditoria/contagem-detalhe.mjs --turno 1            # totais por seção e cargo (doc 02)
```

Saídas: `data/parsed/auditoria/contagem/munzona-*`, `secao-presidente-*`, `detalhe-*`.

## Pendente

- 1º turno: 14 UFs (PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO) e ZZ, quando a carga do banco terminar. Mesmos comandos, sem `--uf`.
