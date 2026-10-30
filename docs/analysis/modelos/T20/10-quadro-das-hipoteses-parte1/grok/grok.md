Reviso só texto. Margem `4.430.191` do resumo entra só pra refazer conta de diferença Presidente.

| # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade (alta/média/baixa) |
|---|---|---|---|---|
| 1 | «5.714 seções votaram com reserva no 2º turno: 2.818 trocas novas e 2.893 com a mesma reserva do 1º turno» | 1 | `2.818 + 2.893 = 5.711`, não `5.714`. Faltam 3 seções na partição. | alta |
| 2 | «Nas trocas novas, os votos mudaram do 1º para o 2º turno como os das vizinhas sem troca (parcela do 13: −0,05 ponto, intervalo de −0,12 a +0,03)» | 4 | Estimativa com intervalo (IC). Não é contagem 100% do universo. Viola regra dura deste relatório/tópico. | alta |
| 3 | «Nordeste: de 3,41% a 99,93% dos 4.269.379 liberados sem digital podem ter votado no 13; no pior caso para o 13 ele ainda venceria por 166.144» | 1 e 4 | `0,0341 × 4.269.379 = 145.585,82` (não inteiro). `0,9993 × 4.269.379 = 4.266.390,37` (não inteiro). `166.144` não reproduz com `4.269.379` nem com margem `4.430.191` (`4.430.191 − 4.269.379 = 160.812`; troca 13→22 muda margem de 2 em 2 e não cai nesse valor). Revisão do próprio quadro chama parecer 15 de «estimativas». | alta |
| 4 | «27 UFs (497.622 seções)» vs «parecer 27 (28 UFs … substitui o 06, de 25 UFs)» | 3 | Mesma linha de H05: resultado no quadro = 27 UFs; parecer que «sustenta» = 28 UFs. Universo trocado na própria célula. | média |
| 5 | «t = −2,60; limite 3,32»; «idade: t = +5,93»; «escolaridade: t = −3,81» | 4 | Estatística de modelo, não contagem. Texto admite que lado vira com controle. Não cabe como número 100%. | média |
| 6 | «499.207 seções com boletim»: «0 divergência seção a seção nos seis totais»; «Presidente igual candidato a candidato em 499.206 seções» | 3 | `499.207 − 499.206 = 1` seção. Texto não identifica a seção nem fecha essa 1 com os «250 números e 4 legendas». | média |
| 7 | «2.490.766 de 2.490.766 no 1º estão em ordem de tipo e número. Exceção: 2 seções de MG com cédula no 1º turno» | 3 | Mesmo parágrafo: 100% das listas em ordem e 2 seções-exceção. Não pode ser `2.490.766 / 2.490.766` se há exceção. | média |
| 8 | «Fora de 3 seções cujo diário a ferramenta da auditoria leu errado … o menor intervalo entre dois votos no país é 16 segundos» | 2 e 5 | Mínimo não é do país: 3 seções fora (falha da ferramenta). «No país» é universo maior que o medido. | média |
| 9 | «Cadastro com pelo menos 148.553 títulos de 100+ sem pessoa correspondente»; «compareceram 0,72% dos 100+ (contagem do TSE)» | 4 | `148.553` vem de cadastro × Censo 2022, não de arquivo de urna. «Pelo menos» é bound. `0,72%` sem numerador/denominador, quase certo arredondado. | média |
| 10 | «números de título que não são de nenhum mesário, presidente ou servidor do país: 55.483 linhas e 31.764 números no 1º turno, 5.564 e 3.801 no 2º» | 4 | Afirmação exige base nacional de mesário/presidente/servidor. Não sai só dos arquivos de urna. «Servidor do país» é universo externo não mostrado. | média |
| 11 | «Explicação mais provável, conferida em grupos de seções e ainda não em todas» | 4 | Explicação do `16.011` é parcial (grupos, não todas as seções). Amostra no texto de leigo. | média |
| 12 | «34.330 votos … (0,027% dos votos)»; «às 19h, 98,64% dos boletins do Brasil emitidos e 0,38% das seções registradas» | 4 | Porcentagem arredondada. `0,9864 × 499.207 = 492.337,79` (não inteiro). `0,0038 × 499.207 = 1.896,99` (não inteiro). `0,027%` sem total de votos no tópico. | baixa |
| 13 | «Nas reservas dos dois turnos, a parcela do 13 é igual à das urnas do mesmo local» | 5 | «Igual» absoluto. Na linha anterior, trocas novas usam `−0,05` com intervalo que cruza zero. Duas réguas no mesmo bloco. | baixa |
| 14 | «Sem uso sistemático no 1º turno» | 5 | `0,72%` de comparecimento dos 100+ não prova ausência de uso; só sugere que não é massivo. Conclusão > evidência desta célula. | baixa |
| 15 | «1.750 no dia do 2º» (encerramento) vs «5.564 e 3.801 no 2º» (suspensão) | 2 | Encerramento 2º turno cortado em «dia»; suspensão em «2º». Denominador temporal diferente no mesmo achado H09, sem aviso de que o recorte muda a conta. | baixa |

H04, H07, H10, H12: texto interno não quebra. H12 sem número, correto. H07/H10 sem conta neste recorte. H04 `499.207` / `0 falha` bate com universo declarado.

Números conferidos sem problema: 8

- `14` (H01–H14)
- `499.205` (Presidente 2º turno; bate com universo do enunciado)
- `499.207` (pacotes; H03, H04, universo)
- `2.944.849` = `4.430.191 − 2 × 742.671`
- `34.330` < 1% de `4.430.191` (1% = `44.301,91`; `34.330 / 4.430.191 ≈ 0,775%`)
- `54` em `6` seções e `159` em `9` seções (H03 = H08)
- `274.411 > 147.771` (desigualdade do texto)
- Status: H07 e H10 refutadas; nenhuma sustentada (bate com o quadro)