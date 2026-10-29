# A9/H02: liberação sem biometria × parcela de cada finalista

**Resposta curta.** Existe associação positiva e pequena entre a taxa de liberação sem biometria e a parcela do 13 (entre os votos no 13 e no 22). Com efeito fixo de zona e controles, 1 desvio-padrão a mais de liberação por ano de nascimento acompanha +1,0 ponto na parcela do 13 no 2º turno. A associação tem o **mesmo tamanho no 1º turno** nas mesmas UFs (+1,17 ponto contra +1,28). A variação da taxa entre os turnos, na mesma seção, quase não se relaciona com a variação da parcela (β = 0,017). Não há sinal de liberações sem biometria **extras no 2º turno** indo para um lado. A associação estrutural tem explicação demográfica possível, mas os dados não a provam.

## Desenho

- Unidade: seção com ≥ 20 votos em 13 + 22 e ≥ 20 eleitores no cadastro. 497.500 seções no 2º turno; exterior fora (sem detalhamento no BU).
- y = parcela do 13 = votos 13 ÷ (13 + 22). A parcela do 22 é 1 − y: todo coeficiente vale com sinal trocado para o 22.
- Regressores principais:
  - `taxaAno`: liberados por ano de nascimento, sem biometria na urna ÷ comparecimento;
  - `taxaManual`: liberados manualmente, com ou sem digital de mesário ÷ comparecimento.
- Controles:
  - % sem biometria no cadastro, % com 70 anos ou mais, % de 60 a 69, % de 16 a 20, log do eleitorado;
  - modelo da urna (base UE2022), urna de contingência.
  - **Urbano/rural não existe nos dados abertos.** O efeito fixo de zona é o substituto parcial, porque compara seções da mesma zona.
- Erro-padrão agrupado por município.
- **H0:** com os controles, a taxa sem biometria não se associa à parcela de nenhum finalista. Pela premissa 8, a fila de idosos e a conferência de documento não contam como explicação. Contam só os controles demográficos e técnicos medidos.

## Resultados (Fato, 29/10/2026; `biometria-a9-h07.mjs`)

| Modelo | 2º turno, país | 2º turno, mesmas UFs do 1º | 1º turno, 26 UFs (sem SP e exterior) |
|---|---|---|---|
| Spearman bruto `taxaAno` × parcela 13 | 0,080 | 0,033 | 0,032 |
| Spearman bruto `taxaManual` × parcela 13 | 0,046 | 0,061 | 0,037 |
| M0, sem controle: β `taxaAno` / `taxaManual` | 0,016 (t 0,4) / 0,30 (t 4,4) | −0,07 (t −1,8) / 0,32 (t 4,5) | −0,09 (t −2,1) / 0,25 (t 3,5) |
| M2, efeito fixo de zona | 0,005 (t 0,5) / 0,048 (t 3,2) | 0,007 (t 0,6) / 0,096 (t 8,7) | −0,002 (t −0,2) / 0,121 (t 11,6) |
| M3, zona + controles | 0,142 (t 4,9) / 0,110 (t 11,5) | 0,167 (t 5,0) / 0,116 (t 11,3) | 0,155 (t 5,2) / 0,101 (t 10,8) |
| **Efeito de 1 DP em M3** (pontos na parcela do 13) | **+1,00 / +0,43** | +1,28 / +0,47 | +1,17 / +0,41 |
| M4: excesso de comparecimento do grupo sem biometria sobre o com biometria, zona | β 0,056 (t 18) | 0,063 (t 17) | 0,063 (t 17) |

- R² dentro da zona: 0,02 a 0,03. A liberação sem biometria explica quase nada da variação da parcela.
- **Variação na mesma seção, 1º → 2º turno** (393.900 seções, efeito fixo de zona): Δ parcela do 13 × Δ `taxaAno`: β = 0,017 (t 2,5); × Δ `taxaManual`: β = −0,001 (t −0,6). Spearman 0,02 e −0,01. Uma seção que liberou 10 pontos a mais sem biometria no 2º turno mudou a parcela do 13 em 0,17 ponto, em média.
- Modelo da urna, dentro da zona e com controles: UE2013 −2,2 pontos e UE2015 −1,4 ponto na parcela do 13 em relação à UE2022, nos dois turnos. As urnas antigas ficam em seções da zona que votam **menos** no 13 (ver [06](06-h07-modelo-urna.md)).

## Leitura

- **Fato:** a associação entre liberação sem biometria e parcela do 13 é pequena e quase toda estrutural. Ela aparece igual no 1º turno e não cresce onde a liberação cresceu entre os turnos.
- **Hipótese (benigna, demográfica):** as seções com mais liberação sem biometria têm perfil socioeconômico que vota mais no 13, e os controles de idade e cadastro não capturam isso. Sem dado de renda ou urbano/rural por seção, não dá para testar.
- **Hipótese (risco):** fraude constante nos dois turnos, sempre a favor do mesmo lado, produziria o mesmo padrão. O teste da variação entre turnos não a detecta. Limite de tamanho: β = 0,14 em M3 quer dizer que 1 liberação a mais por ano de nascimento acompanha 0,14 voto a mais na parcela do 13. Se as liberações extras fossem todas votos no 13, o esperado seria perto de 0,5 (metade do efeito, porque a parcela é sobre 13 + 22). O observado é compatível com no máximo uma fração pequena dessas liberações ligada a voto num lado só. É inferência, não prova.
- **Recomendação:** juntar renda e situação urbano/rural por local de votação (IBGE por setor censitário, a partir das coordenadas do `eleitorado_local_votacao`) e refazer M3. Rodar de novo com o 1º turno de SP quando o perfil ficar pronto.
