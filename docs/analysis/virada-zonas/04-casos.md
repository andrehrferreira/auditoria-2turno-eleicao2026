# 04. H26: as 4 zonas fora da curva para o 22, seção a seção (30/10/2026)

Script: `scripts/auditoria/virada-zonas-casos.mjs` (lê `secoes-caudas.csv`, `zonas.csv` e `historico-zonas.csv`). Saída: `data/parsed/auditoria/virada-zonas/casos.json`. Para olhar outra zona das caudas: `node scripts/auditoria/virada-zonas-casos.mjs ba/0014`. **Aguarda revisão cética.**

Nas quatro zonas, o 13 cresceu do 1º para o 2º turno, mas **menos** do que o esperado. Nenhuma delas teve 2º turno para governador (só AC, AM, DF, ES, RN e TO tiveram).

## Resumo (Fato)

| Zona | Seções | Além do esperado | Seções do mesmo lado | Parte das 10% piores seções | Δ comparecimento (mediana da UF) | Percentil em 2018 / 2022 |
|---|---|---|---|---|---|---|
| MA 0032 Humberto de Campos | 186 | −6,72 p.p. | 166 (89%) | 29,7% | **−9,62 p.p.** (−0,61) | 0,19 / 0,04 |
| SP 0002 São Paulo | 439 | −3,37 p.p. | 350 (80%) | 38,4% | +3,64 p.p. (+2,65) | 93 / 96 |
| CE 0020 Crateús | 250 | −4,46 p.p. | 215 (86%) | 26,5% | +1,27 p.p. (+1,61) | 42 / 9,7 |
| BA 0105 Piatã | 150 | −5,74 p.p. | 130 (87%) | 30,8% | +2,12 p.p. (+2,94) | 18 / 83 |

Em nenhuma zona o efeito sai de poucas seções. As 10% piores seções explicam de 26% a 38% do total. Se o efeito fosse espalhado por igual, explicariam cerca de 10%, e se viesse de poucas seções, quase 100%.

## MA 0032, Humberto de Campos (3 municípios)

- **Fato:** o comparecimento caiu 9,62 p.p. entre os turnos, a maior queda do Maranhão. A mediana da UF foi −0,61. A queda aparece nos 3 municípios: −7,5, −10,8 e −12,6 p.p.
- **Fato:** o 13 perdeu votos (29.007 → 27.868) e o 22 também (6.687 → 5.569). O esperado era 30.970 para o 13 e 6.424 para o 22. O 13 ficou 3.102 votos abaixo e o 22, 855 abaixo.
- Seção que mais pesa: 07978/0035, onde o comparecimento foi de 156 para 84 e o 13 de 129 para 71.
- **Fato:** 6 zonas do Maranhão estão entre as 49 do país com queda de comparecimento de mais de 5 p.p. (0030, 0031, 0032, 0039, 0052, 0110). As outras 43 são do Norte.
- **Hipótese:** abstenção que cresce no 2º turno numa zona rural onde o 13 tem cerca de 80% dos votos. O esperado supõe que o eleitor do 1º turno volta no ritmo médio da UF, e aqui ele não voltou. É o padrão do interior do Norte já descrito pelo cientista político ([cientista-politico/04](../cientista-politico/04-linha-de-base-historica.md)). A zona estava no mesmo extremo em 2018 e 2022 ([03](03-linha-de-base.md)).

## SP 0002, São Paulo

- **Fato:** o comparecimento subiu 3,64 p.p., acima de 91% das zonas de SP. O 22 subiu de 43.876 para 52.340 (esperado 50.060). O 13 subiu de 57.126 para 67.291 (esperado 69.037).
- **Fato:** o efeito é maior em alguns locais de votação: Colégio Equipe (7 seções, −17,3 p.p., comparecimento +12,7 p.p.), FAAP (31 seções, −8,8 p.p., +7,9 p.p.), Colégio Sion (20 seções, −7,2 p.p.) e Colégio Rio Branco (33 seções, −4,1 p.p.). Nas 5 seções mais extremas, todas do Colégio Equipe, o 22 passou de cerca de 75 para cerca de 135 votos por seção, com 41 a 64 eleitores a mais.
- Todos os modelos de urna da zona vão na mesma direção: UE2013 −4,3, UE2015 −4,0, UE2020 −1,9 e UE2022 −4,3 p.p.
- **Hipótese:** eleitor de renda alta que não votou no 1º turno e voltou no 2º para votar no 22. Para o esperado, quem volta vota como a média de SP, onde quem volta pende para o 13. A zona era cauda do PT em 2018 e 2022 e mudou de lado em 2026.

## CE 0020, Crateús, e BA 0105, Piatã

- **Fato:** comparecimento abaixo da mediana da UF nas duas. Um único modelo de urna em cada zona (UE2020 em Crateús, UE2022 em Piatã), e o efeito espalhado pelos municípios: Crateús −4,5 e −4,0 p.p.; Piatã −6,2, −7,0 e −4,2 p.p.
- **Fato:** o 13 ficou abaixo do esperado (Crateús −1.545 votos, Piatã −1.159) e o 22 acima (+1.037 e +383).
- **Hipótese:** efeito político local, por exemplo apoio de prefeitos ou de lideranças. Os arquivos do TSE não mostram isso. Crateús já estava entre as 10% mais extremas para o rival em 2022.

## O que isto diz da H26

- Nenhuma das 4 zonas tem a assinatura de manipulação a favor do 13. Todas têm o 13 **abaixo** do esperado.
- Também não há sinal de manipulação a favor do 22: o efeito é espalhado pela zona, vale para todos os modelos de urna e acompanha mudanças de comparecimento ou um padrão que já existia em 2018 e 2022.
- **Pendente (fora dos arquivos públicos):** contexto político local de Crateús e Piatã.
