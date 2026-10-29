# 05. Seções fora do padrão da própria zona (z-score robusto)

`node scripts/auditoria/forense-zscore.mjs 2` → `forense/zscore-2t.json` e `forense/zscore-2t-cauda.csv` (1.446 seções com |z| ≥ 5 em alguma variável, com perfil e z antes e depois dos controles).

**Método.** Zona = (UF, zona eleitoral), só zonas com ≥ 10 seções (2.641 zonas, todas as 499.205 seções). z = (valor − mediana da zona) / (1,4826 × MAD da zona) para a parcela do 13, a do 22 e o comparecimento. **Controle:** regressão única sobre variáveis centradas na zona (60+, escolaridade baixa, superior, indígena, quilombola do cadastro), depois o z robusto do resíduo. Cauda extrema: |z| ≥ 5. Pela normal, |z| ≥ 5 daria ~0,3 seção no país. Dados reais têm caudas grossas, então essa referência é só um piso.

**Hipótese nula.** Uma seção não foge da sua zona mais do que o perfil do seu eleitorado explica.

## Resultado, 2º turno (Fato)

| Variável | Acima (z ≥ 5) bruto → com controles | Abaixo (z ≤ −5) bruto → com controles |
|---|---|---|
| Parcela do 13 | 715 → **318** | 135 → **325** |
| Comparecimento | 40 → 35 | 597 → 626 |

- **Parcela, bruto:** 715 seções muito acima da zona para o 13 e 135 para o 22. Das 715 do 13: 243 em aldeia, 89 em presídio, 6 em quilombo e 374 "comuns". Com o perfil do eleitorado controlado, a cauda fica **simétrica: 318 (13) × 325 (22)**. Os coeficientes têm o sinal esperado: indígena +0,51, quilombola +0,37, escolaridade baixa +0,27 e 60+ −0,11 na parcela do 13.
- **Maiores z do 13 com controles:** aldeias e comunidades indígenas cujo nome do local não diz "aldeia". Brasnorte-MT 0056/0125, escola Myhyinymykyta Skiripi (povo Myky [a confirmar]): 13 = 203 de 212 válidos, z = 22. Também Juara-MT (escola Kayabi), Barra do Garças-MT (Namukura), José Boiteux-SC (escola indígena Laklãnõ), Charrua-RS e Douradina-MS (escola Joãozinho Carapé). Os povos e terras indígenas desses locais estão [a confirmar] em fonte pública (Funai/ISA). Conferido no arquivo: Brasnorte 0125, BU = banco, 0 falha de lacre em 22.
- **Maiores z do 22 com controles:** Arroio do Padre-RS (várias seções com 0–16% para o 13; um local é a Comunidade Evangélica de Confissão Luterana, e o perfil pomerano do município está [a confirmar]), Lábrea-AM, Novo Aripuanã-AM, Muaná-PA, Uruçuí-PI (Nova Santa Rosa, fronteira agrícola), Porto Velho-RO e duas seções indígenas com comparecimento baixo e voto no 22: Barcelos-AM 0018/0039 (13: 11, 22: 47, nulos 16, comparecimento 75 de 173) e Novo Progresso-PA 0091/0073, escola indígena Tapiety (13: 3, 22: 56, comparecimento 59 de 132). Todas conferidas: BU = banco, 0 falha de lacre.
- **Comparecimento alto (z ≥ 5): 40 seções**, quase todas pequenas (26 a 315 aptos) e rurais. Exemplos: Chã de Alegria-PE 0021/0149 (55 de 56), Divinésia-MG 0077 (165 de 166), Vitória da Conquista-BA 0041/0400 (CASE, unidade de internação de adolescentes: 53 de 53). As 12 seções com 100% de comparecimento foram conferidas no arquivo: BU = banco, lacres sem falha (uma do CE com lacre não lido, ver doc 02). Os votos delas são divididos (ex.: Caraúbas-RN 0036/0069, 163 de 163: 13 = 134, 22 = 25), e não têm cara de enchimento.
- **Comparecimento baixo (z ≤ −5): 597.** Hipótese benigna: cadastro com eleitores que mudaram ou morreram e seguem aptos. Não foi testada aqui. Liga com H01 (falecidos), que é a hipótese a que esse lado interessa, e não à de enchimento.

## Linha de base: 1º turno (Fato, 15 UFs)

Parcela do 13 acima da zona: 531 bruto → 252 com controles. Do 22: 89 → 206. Comparecimento: 39 acima e 225 abaixo. O 1º turno tem a mesma forma: excesso bruto do 13 concentrado em aldeias e presídios, que perde a assimetria com os controles.

## Interpretação honesta

- **Fato:** a assimetria bruta a favor do 13 vem do perfil do eleitorado (indígena, escolaridade, presos provisórios). Com o controle, a cauda fica igual para os dois.
- **Hipótese:** as 318 + 325 seções que continuam extremas depois do controle são, na maioria, comunidades homogêneas que o cadastro não identifica. Fraude não é a primeira explicação, porque as seções extremas para o 22 e para o 13 aparecem na mesma quantidade e em regiões de perfil conhecido. Mas cada uma, sozinha, não foi investigada.
- **Recomendação:** cruzar `zscore-2t-cauda.csv` com o 1º turno completo (D5). Seção extrema nos dois turnos e no mesmo sentido é reduto. Seção que só é extrema no 2º turno (como Ipixuna, doc 02) vai para análise de log.
