# B1a: liberados "sem biometria cadastrada" × eleitores sem biometria no cadastro

**Resposta curta.** O teste de impossibilidade **não fecha**, porque as duas fontes do TSE não usam o mesmo critério de "biometria cadastrada". No 2º turno, em 16.011 seções (3,2%), o BU registra mais votantes "sem biometria cadastrada" do que o cadastro tem de eleitores sem biometria, mesmo com folga para trânsito. São 36.340 eleitores além do limite, 0,03% dos votos. A divergência também aparece no sentido oposto, em escala maior: 229.717 votantes com biometria além do que o cadastro permite, em 17.621 seções. A mesma seção repete o excesso nos dois turnos. Isso aponta para o arquivo de eleitores da urna, e não para um evento do dia. Os casos conferidos no log mostram a urna indo direto ao ano de nascimento, sem pedir digital. Ou seja, quem decidiu o caminho foi o arquivo carregado na urna, não a mesa.

## Hipótese nula e teste

- **H0:** em cada seção, `semBiometriaCadastrada` do BU ≤ eleitores aptos sem biometria no cadastro (`QT_ELEITORES_PERFIL − QT_ELEITORES_BIOMETRIA`, somando as seções agregadas) + folga.
- **Folga:** aptos em trânsito (`aptosTTE`) + o que os aptos do dia excedem o cadastro de 14/07.
- **Fontes:** BU (detalhamento oficial, spec v2) × `perfil_eleitor_secao_2026_<UF>` (leiame do TSE: "aptos, com biometria cadastrada").
- **Join conferido (Fato):** em 2º turno, aptos da seção (BU) − cadastro: mediana −1, p99 0, máximo 0; 209.913 de 497.508 seções iguais. O cadastro casa com a seção certa.
- **Excluídas:** 1.281 seções do exterior, onde o BU não tem detalhamento (ver [07](07-exterior-sem-biometria.md)), 389 sem cadastro e 29 sem comparecimento.

## Resultados (Fato, 29/10/2026)

| | 2º turno (país) | 1º turno (26 UFs, sem SP) |
|---|---|---|
| Seções analisadas | 497.508 | 393.912 |
| Comparecimento do grupo sem biometria (BU ÷ cadastro) | 43,3% | 44,9% |
| Comparecimento do grupo com biometria | 85,5% | 84,0% |
| Seções acima de 100%, sem folga | 21.921 | 18.382 |
| **Seções acima de 100%, com folga** | **16.011** | 12.276 |
| Eleitores além do limite | 36.340 | 24.864 |
| Tamanho do excesso por seção: mediana / p99 / máximo | 1 / 13 / 65 | 1 / 11 / 38 |
| Seções com excesso ≥ 10 | 378 | 187 |
| Seções com cadastro de 100% com biometria e algum voto "sem biometria" | 11.928 | 10.118 |
| **Excesso inverso** (votantes com biometria > cadastrados com biometria + folga) | 17.621 seções, 229.717 eleitores | 12.082 seções, 154.673 eleitores |

- **Repetição entre turnos (Fato).** Nas 393.912 seções com os dois turnos, 11.059 têm excesso nos dois. Spearman do excesso 1º × 2º turno: 0,87. Spearman de `semBiometriaCadastrada` 1º × 2º turno: 0,99.
- **Diferença por UF (Fato).** O comparecimento do grupo sem biometria vai de 22% (PR) e 26% (MS) a 74% (BA). O do grupo com biometria fica entre 75% e 92%. O excesso inverso se concentra em MG (159 mil), ES (31 mil), MS (13 mil) e RJ (11 mil): ali a urna trata como **com** biometria muitos eleitores que o cadastro de julho dá como sem.
- **Concentração (Fato).** As 100 zonas com mais excesso somam 36% dele. As maiores no 2º turno, todas também no topo do 1º turno:

| Zona | Seções com excesso / total | Excesso |
|---|---|---|
| ES 57053/0052 | 126 / 401 | 680 |
| SP 65110/0211 | 84 / 571 | 600 |
| PA 04324/0084 | 52 / 69 | 561 |
| PR 75698/0092 | 51 / 72 | 363 |
| SC 83917/0001 | 17 / 20 | 347 |
| SP 67490/0016 | 33 / 47 | 346 |
| ES 57053/0001 | 115 / 398 | 340 |
| CE 14958/0057 | 96 / 184 | 325 |

## Conferência no log bruto (Fato)

Em 3 das seções com maior excesso, nos dois dias, contei os atendimentos que terminaram em voto com `Ano de nascimento digitado é igual ao do cadastro`:

| Seção | Cadastro sem biometria | Dia | Sem biometria (log = BU) | Com pedido de digital antes | Com `Foto do eleitor apresentada` |
|---|---|---|---|---|---|
| SP 65110/0211/0438 | 0 de 337 | 25/10 | 65 | 0 | 58 |
| | | 04/10 | 59 | 0 | 53 |
| PA 04324/0084/0179 | 13 de 315 | 25/10 | 48 | 0 | 41 |
| | | 04/10 | 51 | 0 | 44 |
| SC 83917/0001/0087 | 22 de 314 | 25/10 | 57 | 0 | 48 |
| | | 04/10 | 58 | 0 | 49 |

- Em nenhum desses atendimentos a urna pediu digital (`Solicita digital`). Logo depois do identificador, ela foi direto ao ano de nascimento.
- Pelo fluxo descrito no doc 06, a mesa não escolhe o caminho. Quem decide é a urna, a partir do arquivo de eleitores carregado nela. Se o eleitor tivesse digital no arquivo, a urna pediria a digital, e a falha levaria à liberação manual, que aparece com outra mensagem no log.
- A maioria desses eleitores tem foto no arquivo da urna, mas não tem digital utilizável.

Script: `biometria-b1a.mjs`, `biometria-b1a-diagnostico.mjs`. A conferência acima usa a mesma lógica de ciclo da varredura sobre o log de cada seção (`lerLogs` de `src/perfil-secoes.js`).

## Leitura

- **Fato:** BU e cadastro divergem sobre quem tem biometria, nos dois sentidos: 16.011 + 17.621 seções no 2º turno. A divergência é estável entre os turnos e concentrada em zonas específicas.
- **Fato:** nas seções conferidas, os votantes "sem biometria" acima do cadastro passaram por um caminho que a urna escolheu sozinha, sem pedido de digital.
- **Hipótese (técnica, a confirmar com o TSE):** `QT_ELEITORES_BIOMETRIA` conta eleitores com coleta biométrica registrada, mas o arquivo da urna só leva digital utilizável. Coleta pendente de processamento, rejeitada ou só com foto ficaria fora. No sentido inverso, a urna teria digitais que o cadastro de julho não reflete. Explica as duas direções e a repetição entre turnos. Não explica por que algumas zonas concentram o problema.
- **Hipótese (risco, pela premissa 8):** a divergência deixa um grupo de eleitores **que o cadastro diz ter biometria** sendo liberado só com título e ano de nascimento. Isso amplia a brecha humana para além do que o cadastro público mostra. Nessas seções, quem conhecer título e ano de nascimento de um eleitor do grupo vota no lugar dele sem passar por controle técnico nenhum. O excesso não diz se isso ocorreu. Só diz que a porta existe para mais gente do que o dado público indica.
- **Relação com o voto (Fato):** excesso por votante × parcela do 13 entre 13 e 22, com efeito fixo de zona: β = 0,31 (t = 2,6) no 2º turno e 0,43 (t = 2,4) no 1º. O excesso médio é de 0,03% dos votos, então o efeito sobre a parcela é de centésimos de ponto percentual. Não há sinal de que o excesso tenha mudado o resultado.

## Recomendações

1. Pedir ao TSE o critério de "biometria cadastrada" do `perfil_eleitor_secao` e do arquivo de eleitores da urna, e o número de eleitores **com digital carregada na urna** por seção. Com esse número, o teste de impossibilidade fecha de verdade.
2. Priorizar as zonas da tabela acima: nelas, o grupo liberado sem digital é maior do que o cadastro público mostra.
3. Cruzar com H01 (falecidos): eleitor sem digital utilizável na urna é o perfil por onde um título de falecido passaria.
