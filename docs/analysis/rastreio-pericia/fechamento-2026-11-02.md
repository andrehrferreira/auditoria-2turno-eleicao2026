# Rastreio do fechamento de 02/11/2026 (vereditos finais só com dados públicos)

Índice técnico dos números e vereditos que entraram na perícia em 02/11/2026. **Este arquivo não entra no relatório.** Cada número vem de um documento de análise reproduzido por uma revisão cética independente. Os scripts estão em `scripts/auditoria/` e as saídas em `data/parsed/auditoria/`, fora do git.

## Vereditos

Os vereditos vêm de [`docs/analysis/modelos/T25/sintese.md`](../modelos/T25/sintese.md) (contagem em `contagem.json`) e estão registrados em [`docs/hipoteses.md`](../../hipoteses.md). Na perícia aparecem como "veredito final", sem citar a votação.

## Por tópico

| Tópico | O que entrou | Fonte (análise e revisão) | Scripts |
|---|---|---|---|
| 1 | H04: 0 voto sem verificação completa do programa (125.275.244 no 1º turno; 128.235.724 no 2º); 72 inicializações com troca da mídia de votação | [engenheiro 13](../engenheiro-seguranca-urna/13-fechamento-h04-h09-h12-h20.md) (errata 6); [parecer 56](../cetico-revisor/56-fechamento-h04-h09-h12-h20.md) | `seguranca-fechamento-*.mjs`, `cetico-56-h09b.mjs` |
| 2 | C3 = 539.817 (com consultas), C6/C6b/C7 do 2º turno, contraprova com 9 alterações, 29 boletins / 27 com voto | [parecer 52](../cetico-revisor/52-contraprova-c36-2t.md) | `cetico-52-ber.mjs`, `cetico-52-c36-2t.mjs`, `cetico-52-amostras.mjs` |
| 4 | H02: 98,64% e 98,66% explicados pela foto; resíduo de 493 em 423 seções (2º turno) e 447 (1º); 1º turno com 15.027 seções e 33.319 eleitores; 3 seções AM/AM/PR | [estatístico 30](../estatistico-eleitoral/30-h02-h05-resultado-final.md) (plano [29](../estatistico-eleitoral/29-h02-h05-plano-final.md)); [parecer 57](../cetico-revisor/57-fechamento-h02-h05.md) | `estatistico-h02-h05-final-*.mjs`, `cetico-57-*.mjs` |
| 4 | H05: SP explicado dentro do local; PR não decidível; ponto cego de 1 a 3 votos por seção (em palavras) | idem | idem |
| 4 | H13: não decidível; 14 seções agregadas; 1.502.075 + 559.431 = 2.061.506 → 4.123.012; 580.336 → 1.160.672 | [estatístico 28](../estatistico-eleitoral/28-h13-resultado-final.md) (planos [27](../estatistico-eleitoral/27-h13-plano-final.md) e adendo 1); [parecer 54](../cetico-revisor/54-h13-fechamento.md) (adendo e errata da causa) | `estatistico-h13-final-*.mjs`, `cetico-54-*.mjs` |
| 8 | H26: 76,2% / 88,7% / 99,4% das zonas (628, 298, 15 sem melhora); só entre finalistas 83,7% / 98,1% / 99,05%; local 1546 de SP 0002; Santo Antônio de Lisboa | [cientista político 06](../cientista-politico/06-h26-resultado-final.md) (plano [06](../cientista-politico/06-h26-plano-final.md); errata do local); [parecer 53](../cetico-revisor/53-h26-fechamento.md) | `politico-h26-*.mjs`, `cetico-53-*.mjs` |
| 8, 10 | H10: excesso em 6 UFs, 52.336 votos (AC 15.092; AP 13.604; RR 11.647; MA 9.069; AM 1.519; TO 1.405); 32 votos em 16 seções com troca certa | [matemático 14](../matematico-forense/14-fechamento-h10-h17-h23-h24.md) (errata 1); [parecer 55](../cetico-revisor/55-fechamento-h10-h17-h23-h24.md) | `matematico-fechamento-h10.mjs`, `cetico-55-h10.mjs` |
| 11 | H14: déficit do 1º turno pela interrupção (3.033 seções); 912 e 444 comparações com escore 0 (RJ 60011/0188/0082; BA 37150/0078/0158) | [estatístico 32](../estatistico-eleitoral/32-h14-h19-resultado-final.md) (plano [31](../estatistico-eleitoral/31-h14-h19-plano-final.md)); [parecer 58](../cetico-revisor/58-fechamento-h14-h19.md) | `estatistico-h14-h19-final-*.mjs`, `cetico-58-*.mjs` |
| 12 | H09: 20.087 / 1.868 sessões; 20.062 / 1.866 números; desfechos 6.664/786, 6.385/77, 6.920/985; mesários 103/6; 0 × 44.565 e 0 × 4.287 | engenheiro 13 (erratas 1–3); parecer 56 | `seguranca-fechamento-varredura.mjs` (classe corrigida), `cetico-56-h09b.mjs`, `cetico-56-unanimes.mjs` |
| 13 | H17: 8.683.417 sem desfecho (5.774.186; 2.321.187; 586.672; 1.372); teto 3.698.065; 91,8% redigitados; 80,9%; abstenção 30.509.005 | matemático 14 (errata 2); parecer 55 | `matematico-fechamento-h17-*.mjs`, `cetico-55-h17-*.mjs` |
| 14 | H23: 502 recargas sem motivo em 275 zonas; 55 com mídia refeita (52 no PA); 75.235 votos do 13 no pior caso | matemático 14 (erratas 3–4); parecer 55 | `matematico-fechamento-h23.mjs`, `cetico-55-h23-*.mjs` |
| 14 | H24: contraprova com alterações em memória; ponto cego | matemático 14 (errata 5); parecer 55 | `matematico-fechamento-h24-contraprova.mjs`, `cetico-55-h24-contraprova.mjs` |
| 14 | H19: 26.933 seções, 24 recortes; ES 56995/0053/0316 (47 de 54) | estatístico 32; parecer 58 | `estatistico-h14-h19-final-*.mjs`, `cetico-58-h19.mjs`, `cetico-58-bruto.mjs` |
| 3, 14 | H20: BA 34134/0171/0166 com relógio atrasado pelo menos 54 min (10:02:38 contra 10:56:03) | engenheiro 13 (errata 5); parecer 56 | `seguranca-fechamento-h20-midia.mjs` |

## Ficou fora da perícia

Números de teste estatístico ficaram fora pela regra T22: z, p, coeficientes, intervalos e tamanhos mínimos detectáveis. Também ficaram fora:
- o "cerca de 900" do Norte;
- os 623.302 de 2022 × 2026;
- o resíduo ajustado de 927 / 97,45%;
- as "8 de 14" reservas com escore 0, porque a contagem foi exploratória;
- os 339.963 com foto, que têm uma leitura só;
- a parte (c) da H26 e o teste das seções sem mobilização, que não foram reproduzidos;
- a H19 contra 2022, que não foi reproduzida;
- a busca de título em formas codificadas da H09(a), cujo código foi revisado, mas sem reprodução da varredura.
