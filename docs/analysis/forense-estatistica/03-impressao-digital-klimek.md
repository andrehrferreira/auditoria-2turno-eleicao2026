# 03. Impressão digital comparecimento × votação (Klimek et al., PNAS 2012)

`node scripts/auditoria/forense-klimek.mjs 2` → `forense/klimek-2t.json`, histograma 2D em `forense/klimek-2t-matriz-13.csv` e `-22.csv` (50 × 50 faixas de 2 p.p.), figura `forense/klimek-2t-13.svg` (escala log, canto de enchimento marcado) e lista do canto `forense/klimek-2t-canto.csv`.

**Método.** Por seção: comparecimento = comparecimento / aptos (BU) e parcela do candidato nos válidos. Duas marcas de enchimento de urna: (1) aglomerado em comparecimento ≈ 100% com votação ≈ 100%; (2) correlação positiva forte entre comparecimento e parcela do beneficiado **dentro da mesma zona** (enchimento sobe as duas juntas). Nulo para (1) e para a fração de zonas com r > 0,5: o comparecimento é permutado entre as seções da zona (20×). Para (2) também há a correlação parcial, que tira o efeito linear de 60+, escolaridade baixa e superior.

**Hipótese nula.** Dentro da zona, comparecimento e voto variam sem ligação entre si, além do que o perfil do eleitorado explica.

## Resultado, 2º turno (Fato)

- **Comparecimento:** mediana 81,5%, p1 64,4%, p99 91,9%. **Nenhuma seção acima de 100%.** 12 seções com exatamente 100% (26 a 163 aptos) e 639 com ≥ 95%.
- **Figura:** a massa forma uma nuvem única, com pico em comparecimento de 80–84% (156 mil seções nessas duas faixas), espalhada na vertical do 5% ao 95% de parcela. Não há um segundo aglomerado em (100%, 100%), que é a assinatura de Rússia e Uganda no artigo.
- **Mas a cauda direita pende para o 13 (Fato):** a parcela média do 13 por faixa de comparecimento (país inteiro, entre zonas) é 50,3% em 80–82%, 54,6% em 86–88%, 59,6% em 90–92%, 63,5% em 94–96%, 65,9% em 96–98% e 79,7% em 98–100%. A fração de seções com ≥ 90% para o 13 sobe de 1,0% para 12,4% (94–96%), 17,1% (96–98%) e 31,8% (98–100%). São poucas seções: 1.214 com comparecimento ≥ 94% (0,24%), e só 66 em 98–100%. A parcela média do 13 também sobe na cauda esquerda (59% em 50–60%), o que aponta para composição regional, e não só para efeito do comparecimento. Esse padrão existe **entre** zonas. Dentro da zona, a correlação é negativa (abaixo).
- **Canto (comparecimento ≥ 95%, parcela ≥ 95%):** 13 = 64 seções (permutação 6,6 ± 1,9); 22 = 2 (0,1). Canto ≥ 90%/≥ 90%: 13 = 761 (271 ± 13); 22 = 90 (27 ± 6). Das 64 do 13: 34 em aldeia, 2 em quilombo, 1 em presídio e 29 "comuns". Ex.: Confresa-MT 0028/0200, aldeia Tapi'itawa: 309 de 315 aptos votaram, 309 votos no 13. O BU está conferido e os lacres também (doc 02).
- **Correlação dentro da zona (2.640 zonas com ≥ 20 seções):** parcela do 13 × comparecimento, r = **−0,078** (parcial com controles −0,055). Mediana por zona −0,094 (p10 −0,37; p90 +0,22). Para o 22, os mesmos números com sinal trocado: **+0,078**. Zonas com r > 0,5: 13 em 20, 22 em 69 (a permutação dá ~0,02% e ~0%).
- **Por UF (r dentro da zona | parcial):** o 22 tem a correlação positiva mais forte em SC +0,26|+0,28, RS +0,24|+0,26, PR +0,25|+0,21, GO +0,19|+0,14 e RJ +0,15|+0,11. O 13 tem a dele em RR +0,25|+0,32, AP +0,03|+0,23 e RO −0,09|+0,16. No exterior (zz) o 13 tem +0,23, mas cai para +0,06 com controles.

## Linha de base: 1º turno (Fato, 15 UFs)

Comparecimento: nenhuma seção acima de 100%, 12 com 100%. Canto ≥ 95/≥ 95: 13 = 22 (permutação 3,0), 22 = 0. Correlação dentro da zona do 13: −0,050 (parcial +0,017). AP já tinha +0,30|+0,36 no 1º turno e MS −0,28. O padrão por UF é parecido nos dois turnos.

## Explicações benignas

- Comparecimento alto com voto homogêneo é o perfil esperado de aldeia e comunidade pequena: eleitorado estável, pouca gente que mudou e não transferiu o título, local de votação na própria comunidade. A permutação dentro da zona mistura essas seções com as urbanas, então ela **subestima** o canto sem que isso indique fraude.
- Correlação positiva do 22 com o comparecimento no Sul e no Centro-Oeste: dentro de uma zona urbana, bairros de renda maior comparecem mais e votam mais à direita. Os controles do cadastro (idade e escolaridade) tiram pouco desse efeito porque não medem renda.

## Interpretação honesta

- **Fato:** não aparece a impressão digital clássica de enchimento (nuvem esticada até 100% × 100%, comparecimento acima de 100%, correlação forte dentro da zona). As correlações dentro da zona são fracas (|r| < 0,1 no país) e mudam de sinal conforme a região.
- **Fato:** existe uma cauda pequena e real de comparecimento alto com voto forte no 13 (1.214 seções ≥ 94%), maior que a do 22. É o achado que precisa de explicação.
- **Hipótese:** o excesso de seções no canto do 13 (64 contra ~7) e a cauda vêm de aldeias, comunidades e regiões de comparecimento alto. Para confirmar: mapear as 29 "comuns" do canto contra terras indígenas e quilombos e comparar com 2022.
- A falta da assinatura não exclui fraude pequena e espalhada. O método só vê manipulação grande o bastante para deformar a distribuição.

## Recomendação

Repetir com o 1º turno completo. Para as zonas do Sul com r > 0,5 para o 22 e as de RR e AP para o 13, controlar por renda (Censo por setor) antes de chamar de anomalia.
