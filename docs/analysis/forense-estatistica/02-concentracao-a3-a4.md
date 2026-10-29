# 02. A3/A4: seções com 100% e com ≥ 90% dos votos válidos

`node scripts/auditoria/forense-a3a4.mjs 2` → `forense/a3a4-2t.json`, `forense/a3a4-2t-secoes.csv` (todas as seções ≥ 90%, com p-valores, perfil e a parcela do outro turno).

**Método.** Por seção: x = votos do candidato, n = votos válidos. Faixas 90–95, 95–99, 99–100 e 100%. Esperado = soma, em todas as seções, da probabilidade de cair na faixa sob o nulo (doc 01). Seção "surpreendente": P(X ≥ x) < 0,05 / (2 × 499.205) = 5,0e-8 (Bonferroni).

**Hipótese nula.** Dentro da zona, a parcela de cada seção varia como a beta-binomial da zona.

## Resultado, 2º turno (Fato)

| | 90–95 | 95–99 | 99–100 | 100% | Total ≥ 90% |
|---|---|---|---|---|---|
| 13 observado | 5.150 | 1.545 | 98 | 106 | 6.899 |
| 13 binomial zona / município | 409 / 824 | 3 / 12 | 0 / 0 | 0 / 0 | 412 / 836 |
| 13 beta-binomial zona | 4.039 | 601 | 17 | 8 | 4.664 |
| 22 observado | 343 | 34 | 3 | 4 | 384 |
| 22 beta-binomial zona | 507 | 97 | 7 | 4 | 615 |

- **Por categoria (13, ≥ 90%, observado / beta-binomial):** comum 6.153 / 4.477; indígena 517 / 64; quilombola 103 / 16; prisional 39 / 3,6; temporário 73 / 54; exterior 14 / 50. **100% do 13:** indígena 52, comum 45, quilombola 7, prisional 2.
- **22:** 384 seções ≥ 90%, **abaixo** do esperado pela beta-binomial (615). 100%: 4 observadas para 4,1 esperadas.
- **Tamanho:** os 110 casos de 100% têm mediana de 123 votos válidos (máx. 354, Confresa-MT, aldeia Tapi'itawa). Não é efeito de seção minúscula: só 19 têm menos de 50 votos.
- **Onde (100%, 13):** AM 30, MA 20, PA 16, RR 8, TO 7, MT 5, BA 4, AC 3. **(22):** RS 2 (Arroio do Padre e Cândido Godói), PA 2 (Chaves e Jacareacanga).
- **Surpreendentes (Bonferroni, beta-binomial):** 125 do 13 e 7 do 22.

## Linha de base: 1º turno (Fato, 15 UFs)

- 13: 2.893 seções ≥ 90% e 30 com 100%, para 1.419 e 2,9 esperados (beta-binomial). 22: 84 seções ≥ 90%, 1 com 100%.
- Nas mesmas 10 UFs da primeira carga (ac…ma): razão observado/esperado ≥ 90% do 13 = **1,85 no 1º turno e 1,46 no 2º**. O excesso de concentração do 13 já existia no 1º turno, com 11 adversários, e foi **menor** no 2º turno.
- Das 87 seções com 100% no 2º turno que têm 1º turno carregado, **todas** já davam ≥ 90% ao mesmo candidato no 1º turno (77 davam ≥ 95%; mínimo 90,3%). Das 5.071 seções do 13 com ≥ 90% e 1º turno carregado, 5.055 já tinham ≥ 80% no 1º. Das 131 do 22, todas as 131 já tinham ≥ 80%. Só 2 saltaram 20 p.p. ou mais: Ipixuna (abaixo) e Cururupu-MA 0014/0075 (22 votos válidos, de 69,6% para 90,9%).

## Conferência no arquivo da urna (Fato)

`node scripts/auditoria/forense-conferir.mjs 2 <uf/mun/zona/secao> ...` → `forense/conferencia-2t.json`. BU lido do arquivo (pelo `src/exportar.js`, ou por `lerBu` de `src/lacres.js` quando falta `aux.json`), lacres conferidos e votos comparados com o banco:

| Seção | Local | Presidente no BU | Lacres |
|---|---|---|---|
| AM 02054/0042/0029 Atalaia do Norte | E. M. Braz Tukuna | 13: 325, branco 1, nulo 9 (comp. 335 de 441) | 0 falha em 25 |
| MT 90280/0028/0200 Confresa | E. E. Tapi'itawa (aldeia) | 13: 309 (comp. 309 de 315) | 0 em 22 |
| RS 89028/0034/0433 Arroio do Padre | Antiga Escola Silveira Martins | 22: 116, branco 2 | 0 em 21 |
| PA 04499/0017/0041 Chaves | EMEIF José Valério Rodrigues | 22: 48, branco 1 (comp. 49 de 82) | 0 em 21 |
| PA 04200/0102/0044 Jacareacanga | EMEF Getúlio Vargas | 22: 50 (comp. 50 de 99) | 0 em 21 |
| RS 85839/0166/0081 Cândido Godói | Escola Sto. Inácio | 22: 82, branco 3 | 0 em 21 |

Nas 25 seções conferidas, o BU do arquivo é igual ao banco. 24 têm 0 falha de lacre. **A CE 15989/0055/0160 não teve o lacre conferido:** `src/lacres.js` para com "DER: comprimento ausente" ao ler o certificado da urna (UE2015). Outra UE2015 do CE (15415/0044/0193) passa. O BU dela confere com o banco. Isso é falha de leitura ainda não explicada e vai para quem cuida da integridade (H04), não para este teste.

## Explicações benignas e interpretação

- **Fato:** o excesso sobre a beta-binomial está concentrado em aldeias (8× o esperado), quilombos (6,5×) e presídios (11×), e nas seções "comuns" de municípios com muitos indígenas, ribeirinhos e assentamentos (Atalaia do Norte, São Gabriel da Cachoeira, Santa Isabel do Rio Negro, Turiaçu-MA, assentamento Maila Sabrina em Ortigueira-PR). Do lado do 22, os 100% estão em dois municípios rurais do RS (Arroio do Padre e Cândido Godói) e dois do PA (Chaves e Jacareacanga). O perfil de colonização alemã e pomerana dos do RS e o garimpeiro de Jacareacanga estão [a confirmar] em fonte pública.
- **Hipótese (benigna, não testada aqui):** voto em bloco de comunidade pequena e homogênea. Isso explica a concentração e também a falta de ajuste da beta-binomial, que tem um ρ só para a zona inteira.
- **Interpretação honesta:** 100% numa seção de 300 votos é raro pelo modelo, mas acontece de forma estável no mesmo lugar nos dois turnos, sempre em comunidades de perfil conhecido, e o arquivo assinado pela urna traz esses números. Isso não prova fraude. Também não exclui pressão sobre o voto dentro da comunidade, que nenhum arquivo público mede.

## Caso para olhar: AM 02399/0045/0063 Ipixuna, "E. M. Marechal Cândido Rondon, Aldeia Piau" (Hipótese)

- **Fato:** 1º turno, 13: 135, 22: 61, outros 12, nulos 19, comparecimento 227. 2º turno, 13: 167, **22: 2**, nulos 28, comparecimento 197. Aptos 335 nos dois. Urna `reservaSecao` nos dois turnos. Lacres 0 falha nos dois. No 1º turno, a abertura foi às 06:48:13 e o encerramento às 18:58:19 (relógio local, UTC−4).
- **Hipótese:** mudança de voto em bloco da aldeia entre os turnos (benigna) **ou** algo a investigar. O 22 perdeu 59 votos e o comparecimento caiu 30.
- **Recomendação:** o auditor de logs deve ler os dois logs (substituição da urna, horário de encerramento às 18:58 no 1º turno, liberações sem biometria, `já votou`). Este teste sozinho não decide.

## Recomendação

Rodar de novo com o 1º turno completo e comparar com 2022 na mesma seção (repositório de 2022). Melhorar a categoria `indigena` com a lista de terras indígenas por coordenada, que existe em `locais.csv` (lat/long), se houver fonte pública local.
