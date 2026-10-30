# 11. H03 no 2º turno: Governador e os demais campos do boletim, seção a seção, por zona, por UF e no país

Matemático forense, 30/10/2026. Banco: cópia de leitura de 29/10 10:50 UTC (`src/banco-leitura.js`), com as 28 UFs dos dois turnos. Completa o que o [tópico 5](../../pericia/05-soma-dos-boletins.md) ainda não tinha no 2º turno: Presidente já conferia número a número em 499.205 seções; faltavam Governador seção a seção e os campos brancos, nulos, nulo técnico, aptos e comparecimento. Refaz com programa próprio a medida do Auditor A ([coerencia-contagem/01](../coerencia-contagem/01-bu-x-oficial.md)), que ainda não tinha revisão.

## Resposta curta

- **Fato.** No 2º turno, a soma dos boletins é igual ao resultado oficial em **todos os campos**, nos dois cargos, em **todos os níveis**: seção, zona, município, UF e país. Diferença zero em todos.
- **Fato.** Seção a seção (detalhe oficial por seção): 499.207 seções de Presidente e 39.739 de Governador iguais ao BU em aptos, comparecimento, nominais, brancos, nulos e legenda. São 538.946 pares seção × cargo, 0 divergência.
- **Fato.** Presidente número a número por seção (tabela `voto_oficial`): 499.205 seções, 0 divergência em 13, 22, 95 (branco) e 96 (nulo).
- **Fato.** Governador candidato a candidato: por zona (1.026 pares), município (938) e UF (12), 0 divergência. O oficial não publica Governador por seção e candidato no 2º turno (abaixo).
- **Fato.** Divulgação (Presidente no país e Governador nas 6 UFs com 2º turno): 7 de 7 totais iguais em 19 campos, inclusive seções, eleitorado, abstenção, nulo técnico e o voto de cada candidato.
- **Fato.** Nulo técnico = 0 no 2º turno, em cada seção e em cada total. Nenhum voto do BU foi para um número fora da lista de candidatos da divulgação.
- **Fato.** A única "diferença" que aparece numa soma é de universo, e é explicada: as 41 seções do exterior não instaladas estão no oficial com 423 aptos, comparecimento 0, e não têm BU.

## Universo

| Medida | Valor |
|---|---|
| Seções do 2º turno no banco | 499.248 (28 UFs) |
| Com BU completo | 499.207 |
| Sem arquivo (não instaladas, todas no exterior) | 41 |
| Seções com eleição de Governador (6260) no BU | 39.739, nas 6 UFs: AC 2.270, AM 8.157, DF 6.969, ES 9.844, RN 8.115, TO 4.384 |
| Linhas do 2º turno no `detalhe_votacao_secao_2026_BRASIL.csv` | 538.987 (Presidente 499.248; Governador 39.739); 0 linha duplicada |
| Linhas do 2º turno no `votacao_candidato_munzona` (28 arquivos lidos) | BR 12.584 (Presidente); AC 46, AM 148, DF 38, ES 170, RN 344, TO 280 (Governador). Nenhuma de outro cargo ou de outra UF |

**Fora da H03, com motivo (Fato):** as 10 consultas populares do 2º turno (eleições 6282 a 6290 e 6293, 871 pares seção × consulta) não estão no `detalhe`, no `munzona` nem na divulgação de cargos. O BU delas confere com o RDV (C1 do tópico 2), mas não há referência oficial para comparar. Fica **Pendente**, como a consulta de PE no 1º turno.

## Teste S1: seção a seção, os seis campos (`detalhe_votacao_secao`)

`scripts/auditoria/matematico-h03-2t-secao.mjs` lê o arquivo nacional do detalhe (todas as UFs e cargos, de dentro do zip, sem extrair) e compara cada seção × cargo com o BU. Aptos e comparecimento vêm de `secao_eleicao` da eleição do cargo (6258 Presidente, 6260 Governador). Nas seções do Sistema de Apuração, o comparecimento comparado é o da eleição, porque a seção grava 0 (tópico 2).

| Campo | Presidente: BU | Presidente: oficial | Seções divergentes | Governador: BU = oficial | Seções divergentes |
|---|---:|---:|---:|---:|---:|
| Aptos | 158.745.079 | 158.745.502 | **0** | 12.478.054 | **0** |
| Comparecimento | 128.236.074 | 128.236.074 | **0** | 10.086.066 | **0** |
| Nominais | 124.082.273 | 124.082.273 | **0** | 9.404.837 | **0** |
| Brancos | 1.430.496 | 1.430.496 | **0** | 228.427 | **0** |
| Nulos | 2.723.305 | 2.723.305 | **0** | 452.802 | **0** |
| Legenda | 0 | 0 | **0** | 0 | **0** |
| Seções iguais nos 6 campos | 499.207 de 499.207 com BU | | | 39.739 de 39.739 | |

- **A diferença de 423 aptos no Presidente não é divergência de seção.** São as 41 seções do exterior não instaladas (origem "Totalização", instalada = "Não"): estão no oficial com 423 aptos e comparecimento 0, e não têm BU. É o mesmo `esni` = 423 da divulgação (Teste A3). Nenhuma seção com BU diverge.
- **Cobertura nos dois sentidos:** 0 par seção × cargo com voto no BU sem linha no oficial; 0 par seção × eleição do BU sem linha no oficial; 0 linha do oficial de seção completa sem BU.
- **Origem do voto no oficial:** 538.898 urna eletrônica, 41 totalização (não instaladas), 29 Sistema de Apuração, 16 RED em urna de seção e 3 RED em urna de contingência. Todas as linhas com BU são iguais ao BU.
- **Votos anulados em apuração separada:** 0 em todas as linhas. O BU da urna não tem esse tipo de voto, e o oficial também não registra nenhum.
- **Conta interna do próprio oficial:** abstenções = aptos − comparecimento nas 538.946 linhas de seção instalada, 0 violação. Nas 41 não instaladas, o oficial grava abstenção 0 com 423 aptos. Isso é regra de definição, não erro: a divulgação também calcula a abstenção só sobre o eleitorado das seções instaladas (`a` = `esi` − `c` = 30.509.005, Teste A3). Na primeira versão do script, essas 41 linhas apareciam como violação de "abstenção = aptos − comparecimento"; a regra foi corrigida para "abstenção = 0 na seção não instalada".

### Por UF (soma das seções; BU = oficial em todos os campos)

| UF | Seções | Aptos | Comparecimento | Nominais | Brancos | Nulos |
|---|---:|---:|---:|---:|---:|---:|
| AC | 2.270 | 613.715 | 453.654 | 432.228 | 5.016 | 16.410 |
| AL | 7.101 | 2.442.081 | 1.951.632 | 1.896.761 | 16.983 | 37.888 |
| AM | 8.157 | 2.798.661 | 2.192.059 | 2.121.028 | 18.324 | 52.707 |
| AP | 1.914 | 576.910 | 429.975 | 421.642 | 3.320 | 5.013 |
| BA | 35.476 | 11.312.891 | 9.422.047 | 9.094.019 | 92.721 | 235.307 |
| CE | 23.765 | 6.996.521 | 6.024.843 | 5.855.602 | 56.386 | 112.855 |
| DF | 6.969 | 2.258.995 | 1.868.280 | 1.804.766 | 22.386 | 41.128 |
| ES | 9.844 | 2.991.515 | 2.409.214 | 2.296.469 | 33.080 | 79.665 |
| GO | 15.686 | 5.080.385 | 4.047.280 | 3.930.889 | 43.214 | 73.177 |
| MA | 18.093 | 5.183.049 | 4.127.771 | 4.038.202 | 30.855 | 58.714 |
| MG | 52.062 | 16.372.144 | 13.044.203 | 12.592.885 | 164.141 | 287.177 |
| MS | 7.106 | 2.024.437 | 1.594.460 | 1.556.865 | 14.958 | 22.637 |
| MT | 8.287 | 2.637.879 | 2.085.334 | 2.045.266 | 15.431 | 24.637 |
| PA | 20.827 | 6.262.063 | 4.989.573 | 4.890.389 | 36.501 | 62.683 |
| PB | 10.712 | 3.248.434 | 2.743.560 | 2.659.269 | 25.943 | 58.348 |
| PE | 21.418 | 7.223.227 | 6.126.467 | 5.950.067 | 56.758 | 119.642 |
| PI | 10.225 | 2.704.695 | 2.239.830 | 2.179.848 | 16.137 | 43.845 |
| PR | 27.142 | 8.613.628 | 7.059.339 | 6.857.948 | 82.572 | 118.819 |
| RJ | 37.675 | 12.857.526 | 10.077.449 | 9.734.426 | 111.682 | 231.341 |
| RN | 8.115 | 2.659.867 | 2.232.823 | 2.151.005 | 19.939 | 61.879 |
| RO | 4.698 | 1.265.926 | 988.489 | 968.828 | 8.361 | 11.300 |
| RR | 1.519 | 401.540 | 308.597 | 303.180 | 2.176 | 3.241 |
| RS | 27.547 | 8.522.318 | 6.889.638 | 6.698.930 | 89.463 | 101.245 |
| SC | 17.326 | 5.734.687 | 4.762.303 | 4.638.385 | 48.674 | 75.244 |
| SE | 5.923 | 1.740.093 | 1.466.659 | 1.422.395 | 13.135 | 31.129 |
| SP | 103.656 | 34.123.591 | 27.364.389 | 26.258.452 | 389.606 | 716.331 |
| TO | 4.384 | 1.182.041 | 954.763 | 910.878 | 8.059 | 35.826 |
| Exterior (ZZ) | 1.351 (1.310 com BU) | 916.260 (oficial 916.683) | 381.443 | 371.651 | 4.675 | 5.117 |

Tabela de Presidente. No exterior, os 423 aptos a mais no oficial são as 41 seções não instaladas; as 1.310 com BU são iguais nos 6 campos.

**Governador, por UF (BU = oficial em todos os campos, todas as seções iguais):**

| UF | Seções | Aptos | Comparecimento | Nominais | Brancos | Nulos |
|---|---:|---:|---:|---:|---:|---:|
| AC | 2.270 | 613.336 | 453.334 | 411.743 | 11.979 | 29.612 |
| AM | 8.157 | 2.796.187 | 2.189.860 | 2.074.303 | 39.610 | 75.947 |
| DF | 6.969 | 2.244.176 | 1.854.323 | 1.726.272 | 55.771 | 72.280 |
| ES | 9.844 | 2.987.603 | 2.405.654 | 2.207.937 | 64.871 | 132.846 |
| RN | 8.115 | 2.656.286 | 2.229.510 | 2.113.423 | 35.873 | 80.214 |
| TO | 4.384 | 1.180.466 | 953.385 | 871.159 | 20.323 | 61.903 |

Os aptos de Governador são menores que os de Presidente na mesma UF porque o eleitor em trânsito vindo de outra UF é apto só para Presidente (doc 05, I9b).

## Teste S2: Presidente número a número, por seção (`voto_oficial`)

Mesmo script. A tabela `voto_oficial` tem o `votacao_secao_2026_BR.csv` (gerado em 26/10/2026 12:07:25).

| Número | BU | Oficial |
|---|---:|---:|
| 13 | 64.256.232 | 64.256.232 |
| 22 | 59.826.041 | 59.826.041 |
| 95 (branco) | 1.430.496 | 1.430.496 |
| 96 (nulo) | 2.723.305 | 2.723.305 |

- 499.205 seções com voto de Presidente dos dois lados, 0 só de um lado, 0 divergência em qualquer número. As 2 seções com BU e sem voto (499.207 − 499.205) são do exterior, apuradas no Sistema de Apuração sem nenhum votante: ZZ 29564/0001/0091 (72 aptos) e ZZ 30686/0001/0443 (30 aptos). Estão no `detalhe` com comparecimento 0 e são iguais lá.
- **Fato.** O `votacao_secao` de 2026 só traz Presidente: a tabela `voto_oficial` tem só o cargo 1 nos dois turnos (1.931.103 linhas no 2º turno). Para Governador, o oficial não publica voto por seção e candidato. Por isso o candidato de Governador é conferido por zona (Teste A1) e a seção, pelos seis totais (Teste S1).

## Teste S3: nulo técnico por seção

**Invariante:** no 2º turno a urna só aceita os números dos dois candidatos do cargo; qualquer outro número digitado vira nulo. Então todo voto nominal do BU tem de ser para um número que a divulgação lista. Um voto nominal para número fora da lista seria nulo técnico.

**Fato.** 0 par seção × número com voto nominal fora da lista, em Presidente (13, 22) e em Governador (AC 10/11, AM 22/55, DF 11/13, ES 10/15, RN 13/44, TO 44/45). As 6 UFs com voto de Governador no BU são exatamente as 6 da divulgação.

## Teste A1/A2: candidato por zona, município e UF (`votacao_candidato_munzona`)

`scripts/auditoria/matematico-h03-2t-agregados.mjs` soma as linhas do munzona (com e sem voto em trânsito; no 2º turno só há "N") e compara com a soma dos BUs da zona.

| Nível | Cargo | Pares (local × candidato) | Iguais | Só no BU | Só no oficial | Valores diferentes |
|---|---|---:|---:|---:|---:|---:|
| Zona | Presidente | 12.584 | 12.584 | 0 | 0 | 0 |
| Zona | Governador | 1.026 | 1.026 | 0 | 0 | 0 |
| Município | Presidente | 11.514 | 11.514 | 0 | 0 | 0 |
| Município | Governador | 938 | 938 | 0 | 0 | 0 |
| UF | Presidente | 56 | 56 | 0 | 0 | 0 |
| UF | Governador | 12 | 12 | 0 | 0 | 0 |

- Todos os votos do munzona do 2º turno têm destino "Válido", e nominais válidos = nominais em todas as linhas.
- Diferente do 1º turno ([doc 06](06-h03-1turno-todos-cargos.md)), não há número com voto no BU e sem linha no munzona.

## Teste A3: total da divulgação (UF e país)

Mesmo script. Lê os JSON da divulgação já baixados (`data/raw/2t/referencia`, sem rede): Presidente nacional (`br-c0001-e006258-u.json`) e Governador das 6 UFs (`<uf>-c0003-e006260-u.json`). Cada voto do BU recebe o destino que a divulgação dá ao candidato; número fora da lista vai para nulo técnico. O eleitorado das 41 seções não instaladas (`esni`) vem do detalhe de Presidente, porque elas não têm BU.

19 campos comparados: seções (`ts`, `si`, `sni`), eleitorado (`te`, `esi`, `esni`), comparecimento `c`, abstenção `a`, brancos `vb`, nulos `vn`, nulo técnico `vnt`, total de nulos `tvn`, nominais válidos `vnom`, anulados `van`, anulados sub judice `vansj`, válidos `vv`, total `tv`, `vsan` e `vscv`.

| Total | Gerado em | Campos iguais | Eleitorado | Comparecimento | Abstenção | Brancos | Nulos | Nulo técnico | Candidato eleito (BU = oficial) | Outro candidato (BU = oficial) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| País, Presidente | 25/10 23:27:02 | 19/19 | 158.745.502 (423 em não instaladas) | 128.236.074 | 30.509.005 | 1.430.496 | 2.723.305 | 0 | 13: 64.256.232 | 22: 59.826.041 |
| AC, Governador | 25/10 21:26:35 | 19/19 | 613.336 | 453.334 | 160.002 | 11.979 | 29.612 | 0 | 11: 272.635 | 10: 139.108 |
| AM, Governador | 25/10 22:10:45 | 19/19 | 2.796.187 | 2.189.860 | 606.327 | 39.610 | 75.947 | 0 | 55: 1.273.975 | 22: 800.328 |
| DF, Governador | 25/10 21:28:25 | 19/19 | 2.244.176 | 1.854.323 | 389.853 | 55.771 | 72.280 | 0 | 11: 987.142 | 13: 739.130 |
| ES, Governador | 25/10 21:32:45 | 19/19 | 2.987.603 | 2.405.654 | 581.949 | 64.871 | 132.846 | 0 | 10: 1.151.818 | 15: 1.056.119 |
| RN, Governador | 25/10 21:24:45 | 19/19 | 2.656.286 | 2.229.510 | 426.776 | 35.873 | 80.214 | 0 | 13: 1.073.024 | 44: 1.040.399 |
| TO, Governador | 25/10 21:45:15 | 19/19 | 1.180.466 | 953.385 | 227.081 | 20.323 | 61.903 | 0 | 45: 562.083 | 44: 309.076 |

- Seções: país `ts` 499.248, `si` 499.207, `sni` 41 = banco. Nas 6 UFs, todas as seções foram instaladas (`sni` = 0), e `ts` = seções com eleição 6260 no BU.
- Anulados, anulados sub judice, `vsan` e `vscv`: 0 nos dois lados, nos 7 totais.
- Válidos = nominais (não há legenda no 2º turno); total = válidos + brancos + nulos = comparecimento, nos 7 totais.

## Cadeia completa: seção = zona = município = UF = país

Juntando os testes: cada seção bate com o oficial (S1, S2); a soma das seções de cada zona bate com o munzona (A1); as somas por município e por UF também (A2); e a soma das UFs bate com o total nacional da divulgação (A3). Somar só o total do país poderia esconder erros que se compensam; a comparação em cada nível não deixa isso passar.

## Contraprova (o teste acusa quando há diferença)

**Fato.** `matematico-h03-2t-secao.mjs --contraprova` altera em memória 3 valores do BU, sem tocar o banco: em AC 01007/0009/0003 (Presidente), +1 branco e +1 voto no nº 99; em AC 01007/0009/0001 (Governador), +1 apto. Resultado: S1 acusa exatamente 3 divergências (brancos, nominais, aptos); S2 acusa 2 (nº 95 e nº 99); S3 acusa 1 voto em número fora da lista. As saídas da contraprova têm o sufixo `-contraprova`.

## Comparação com medidas anteriores

- **Fato.** O Auditor A ([coerencia-contagem/01](../coerencia-contagem/01-bu-x-oficial.md)) contou 538.946 pares seção × cargo iguais no `detalhe` do 2º turno e 0 divergência no `munzona`. Este doc chega aos mesmos 538.946 (538.987 linhas − 41 não instaladas) com programa próprio, lendo o arquivo nacional `BRASIL` em vez da soma dos arquivos por UF.
- **Fato.** O Presidente por seção repete o `scripts/h03-bu-x-oficial.mjs` (499.205 seções, 0 divergência) com outro código.

## Limites

- Isto mostra que os arquivos publicados pelo TSE concordam entre si e com os BUs. Que os BUs não mudaram depois de assinados é o teste das assinaturas (tópico 1), e a coerência BU × RDV × log é o tópico 2.
- Governador por seção e candidato não é publicado; a seção é conferida pelos seis totais e o candidato, por zona. Se a totalização tivesse lido, numa seção, um voto de Governador para o candidato errado e, noutra seção da mesma zona, o inverso, nenhum total publicado mudaria. Esse caso não se testa com os arquivos públicos; o que se testa é que os totais publicados, em todos os níveis, são a soma dos BUs.
- As consultas populares do 2º turno ficam sem referência oficial (**Pendente**).

## Reproduzir

```bash
node scripts/auditoria/matematico-h03-2t-secao.mjs                # S0–S4, ~40 s → data/parsed/auditoria/matematico/h03-2t-secao-{resumo.txt,uf.csv,divergencias.csv}
node scripts/auditoria/matematico-h03-2t-secao.mjs --contraprova  # contraprova → h03-2t-secao-contraprova-*
node scripts/auditoria/matematico-h03-2t-agregados.mjs            # A1–A4, ~35 s → h03-2t-agregados-{resumo.txt,divulgacao.csv,candidatos.csv}
```

Entradas: cópia de leitura do banco; `data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip`; `data/raw/dadosabertos/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip`; `data/raw/2t/referencia/*-u.json`. Sem rede.
