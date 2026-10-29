# 02. Comparecimento e votos por seção: BU × `detalhe_votacao_secao` (teste 2)

Auditor A (contagem e coerência), 29/10/2026. Princípio 8 (doc 01) aplicado: só controles técnicos contam.

## Pergunta e hipótese nula

- **Pergunta.** O arquivo oficial de detalhe por seção (aptos, comparecimento, abstenção, nominais, brancos, nulos, legenda) bate com o BU assinado de cada seção, em todos os cargos?
- **H0.** Para toda seção e todo cargo, os 6 campos do oficial são iguais aos do BU.
- **Explicações benignas para divergência, se houvesse:** seção não instalada; Sistema de Apuração; BU gerado pelo Recuperador de Dados (RED); seções agregadas; atraso na geração do arquivo oficial.

## Método

- Oficial: `detalhe_votacao_secao_2026.zip`, CSVs `_BR` (presidente) e `_<UF>` (cargos estaduais), gerados em 26/10/2026 09:49:06 (CDN, `Last-Modified` 26/10/2026 15:35:35 GMT).
- BU: banco `data/db/eleicao2026.sqlite` (`secao_eleicao`, `voto_bu`). Aptos = `qtdEleitoresAptos` da eleição do cargo; comparecimento = comparecimento majoritário (cargos 1, 3, 5) ou proporcional (6, 7, 8) da eleição.
- Chave: UF, município, zona, seção, cargo. Agregadas não têm linha no oficial: os votos estão na principal, como no BU.

## Resultado

**Fato. 2º turno, país inteiro.** 538.987 linhas do oficial: 499.248 de presidente e 39.739 de governador (AC, AM, DF, ES, RN, TO).

| Cargo | Seções com BU | Idênticas nos 6 campos | Divergentes |
|---|---:|---:|---:|
| Presidente | 499.207 | 499.207 | 0 |
| Governador | 39.739 | 39.739 | 0 |

- Comparecimento de presidente: oficial 128.236.074, BU 128.236.074.
- Aptos: o oficial tem 423 a mais, que são os aptos das **41 seções não instaladas** do exterior (ZZ). Elas aparecem no oficial com origem "Totalização", `ST_SECAO_INSTALADA = Não` e comparecimento 0, e o `aux.json` diz "Nao instalada", sem arquivo de urna.
- Origem do voto no oficial:
  - "Urna Eletrônica": 538.898 linhas;
  - "Sistema de apuração": 29 (todas ZZ);
  - "BU gerado por RED": 16 em urna de seção e 3 em urna de contingência;
  - "Totalização": 41, as não instaladas.
- 0 seções do banco faltando no oficial.

**Fato. 1º turno, parcial (13 UFs carregadas no banco até 08:40 UTC: AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT).** 983.650 linhas, divididas por cargo assim:

| Cargo | Seções | Idênticas | Comparecimento (oficial = BU) |
|---|---:|---:|---:|
| Presidente | 196.730 | 196.730 | 48.648.176 |
| Governador | 196.730 | 196.730 | 48.591.092 |
| Senador | 196.730 | 196.730 | 48.591.092 |
| Dep. Federal | 196.730 | 196.730 | 48.591.092 |
| Dep. Estadual | 189.761 | 189.761 | 46.773.171 |
| Dep. Distrital | 6.969 | 6.969 | 1.817.921 |

- Brancos, nulos e legenda também iguais em todas as linhas. O oficial informa 0 votos "anulados em apuração em separado".
- O comparecimento de presidente é maior que o dos cargos estaduais (48.648.176 contra 48.591.092, ou seja, 57.084 a mais). A mesma diferença está no BU, então não é efeito do arquivo oficial.
  - **Fato** (AC): aptos federais − aptos estaduais = TTE federal − TTE estadual = 426.
  - **Hipótese:** são eleitores em trânsito vindos de outra UF, que só votam para presidente. **[a confirmar]** a regra na resolução do TSE sobre voto em trânsito.

## Conclusão

- **Fato:** H0 não é rejeitada em nenhum caso. O arquivo oficial de detalhe por seção reproduz o BU assinado de cada seção em todos os campos e cargos testados. A única diferença (423 aptos) vem de seções sem urna instalada.
- **Hipótese:** nada indica que o arquivo oficial tenha sido montado a partir de outra fonte que não os BUs.
- **Limite:** isso prova coerência BU → arquivo público. Não prova que o BU reflete a vontade dos eleitores na cabine; esse ponto fica com os testes de log e biometria.

## Reproduzir

```bash
node scripts/auditoria/contagem-detalhe.mjs --turno 2
node scripts/auditoria/contagem-detalhe.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt   # sem --uf: todas as UFs carregadas
```

Saídas: `data/parsed/auditoria/contagem/detalhe-<t>t*.txt|csv` (divergências e linhas sem BU).

## Pendente

- 1º turno das 14 UFs restantes e ZZ, quando a carga do banco terminar (mesmo comando, sem `--uf`).
