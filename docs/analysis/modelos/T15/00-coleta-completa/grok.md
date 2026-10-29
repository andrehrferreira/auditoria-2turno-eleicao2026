| # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade (alta/média/baixa) |
|---|---|---|---|---|
| 1 | «as **499.248 seções com urna** do país e do exterior foram baixadas e conferidas uma a uma» | 3 e 5 | Tabela do mesmo tópico: 499.207 (arquivos completos) + 41 (sem urna) = 499.248. 499.248 é total de seções, não seções com urna. Com urna = 499.207. As 41 sem urna não têm arquivo para baixar. Frase trata 41 como urna baixada. | alta |
| 2 | «**Total** \| **499.248 de 499.248** \| **499.248 de 499.248**» sob a linha «Seções com arquivos completos e íntegros» | 5 | Soma 499.207+41 fecha 499.248 como seções *contabilizadas*. «499.248 de 499.248» no bloco de arquivos completos lê-se como 100% com pacote. 41 não têm arquivo. Cobertura de seções ≠ cobertura de arquivos. | média |
| 3 | «(cerca de 132 GB no 2º turno e 95 GB no 1º)» | 4 | «cerca de» é estimativa. Viola regra do 100%. Tamanho não conferível no texto. Cabe Pendente, sem número, ou byte exato. | média |
| 4 | «Para cada uma das quase 500 mil seções» | 4 | Aproximação. O próprio tópico já tem 499.248 / 499.207. «Quase 500 mil» não entra. | baixa |
| 5 | «A confirmação de que **o pacote publicado é o que o TSE totalizou** está feita em 82 mil seções» | 4 | «82 mil» arredondado, não 100% correto. Sem inteiro reproduzível (ex.: 82.000 exato seria milagre). Cabe contagem exata ou Pendente sem número. | alta |
| 6 | «Seções com arquivos completos e íntegros \| 499.207» + «impressão digital de cada arquivo (boletim, registro dos votos, **diário** e boletim impresso)» vs tabela nacional «**Total com exterior** \| **499.177**» seções com log | 3 | 499.207 − 499.177 = 30. 30 = 29 (Sistema de Apuração) + 1 (diário SP faltando no pacote estadual). Se diário de 499.207 está íntegro e no mesmo universo, «seções com log» = 499.207 não fecha. Ou diário da seção SP / 29 SA não está no banco do `nacional-resumo.mjs`, e aí «completos» do tópico 00 não é o universo da tabela nacional. | média |
| 7 | «**Fato:** sim, de todas» + `coberturaTotal: true` vs «lista oficial de cada seção (`aux.json`) … ainda está sendo baixada» e confirmação TSE só em «82 mil seções» | 5 | «Arquivos obtidos» pode ser verdade para 499.207. «Fato / cobertura total / íntegros para o país» é mais forte que o próprio Limite: sem `aux.json` não está fechado que o pacote publicado é o totalizado. Tópico 00 mistura obtenção, integridade da nota fiscal da urna e identidade com o pacote totalizado. | média |

Números conferidos sem problema: 2

- 499.207 + 41 = 499.248 (1º e 2º)
- 41 na tabela-resumo = 41 em «Casos especiais»

17.931, 29, 1 por turno, 1.088: texto não dá parcela para recontar. 17.931 não soma no total (subconjunto, ok). 1º turno 499.207/41/17.931 idêntico ao 2º: coerente na página, não conferível aqui.