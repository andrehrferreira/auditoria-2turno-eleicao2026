# Revisão: 06-titulos-de-falecidos.md

| # | Trecho exato | Problema (tipo) | Conta refeita / explicação | Gravidade |
|---|---|---|---|---|
| 1 | "descartam uso acima de cerca de 10% desses títulos (cerca de 30 mil votos)" + "um título de 100+ usado em cada uma das 86.934 seções... somaria 87 mil votos e mal mexeria no resultado do teste" | 3 (contradição interna) e 5 (afirmação mais forte que evidência) | Teste declarado descarta uso acima de ~10% (~29.824 votos), mas exemplo próprio do texto mostra 87 mil votos (29% dos títulos, 3× o limite) indetectáveis, espalhados 1 por seção — padrão **difuso**, não "concentrado em poucas seções" que o texto lista como exceção. Limiar de 10% só vale para uso concentrado por seção; texto não qualifica. Resposta curta repete afirmação sem ressalva. | Alta |
| 2 | "Títulos de 100+ sem pessoa correspondente, com a mortalidade do IBGE: **entre cerca de 235 mil e 260 mil**" + "Coorte ainda viva: entre cerca de 38 mil e 63 mil" | 4 (violação regra 100%) | Estimativa de modelo ("essa parte é estimativa de modelo, e não contagem") publicada com número. Regra dura: estimativa fica fora ou vira "Pendente", sem número. Está na Resposta curta, destaque máximo. Conta interna fecha (297.977−63.000=234.977; 297.977−38.000=259.977), mas isso não resolve violação. | Alta |
| 3 | "ainda sobrariam cerca de 202 mil títulos pela estimativa com mortalidade... (**Fato**, teste de sensibilidade)" | 4 e 1 | (a) Cenário de modelo rotulado **Fato** com "cerca de" — estimativa deve ser Pendente. (b) Conta: sobreviventes máx = 1,5×63.000 = 94.500; 297.977−94.500 = 203.477, não 202 mil. Desvio ~1,5 mil. | Média |
| 4 | "O efeito máximo dessa dúvida é de cerca de 3.000 títulos na estimativa (**Fato**)" | 4 | Limite de modelo, arredondado ("cerca de"), rotulado Fato. Não é contagem de arquivo. Pendente ou fora. | Média |
| 5 | "Pela estimativa do revisor (modelo que supõe que os moradores votam à taxa do estado), os títulos excedentes comparecem a algo entre 42% e 71%" — dentro de parágrafo rotulado "**Fato:**" | 4 | Estimativa de modelo com números sob rótulo Fato. Texto admite "estimativa". Pendente ou fora. | Média |
| 6 | "uso uniforme de cerca de 40% dos títulos (cerca de 119 mil votos)" | 4 (forma) | 0,40×298.239 = 119.295,6 → 119 mil ok, mas "cerca de" rotulado Fato. Potência de teste vem de simulação, é inerentemente aproximada — declarar como limite aproximado de simulação, não Fato com número redondo. | Baixa |
| 7 | "Em 1.068 municípios há mais eleitores de 100+ do que moradores de 96+, mas em 4.186 acontece o contrário" vs. tabela "Sem essa sobra (só os municípios com algum eleitor de 100+)": 3.329 | 2 (denominador) | 4.186 ≠ 3.329. Compatível só se 857 municípios "com contrário" têm zero eleitores 100+. Texto não declara; 1.068+4.186 = 5.254 ≠ 5.570, sobram 316 sem classificação. Esclarecer denominadores. | Baixa |
| 8 | "Exterior (sem município no IBGE) | 59 | 262 | 0 | 0%" | 2 (unidade) | Coluna "Municípios" com valor 59 para exterior — 59 não é município IBGE. Unidade não declarada (zonas? localidades?). | Baixa |
| 9 | "cerca de 10% dos títulos de 100+ (cerca de 30 mil votos)" (2º turno) | 4 (forma) | 0,10×298.239 = 29.824. "30 mil" arredondado; texto usa 29.824 exato no 1º turno. Inconsistência de precisão entre seções. | Baixa |

## Números conferidos sem problema: 24

- 297.977 − 149.424 = **148.553** ✓ (piso)
- 298.239 − 297.977 = **262** exterior ✓
- 274.143 / 297.977 = **92,0%** ✓
- (105.262+79.874+52.424+21.022) / 297.977 = 258.582/297.977 = **86,8%** ✓
- 68.142 − 6.786 = **61.356** ✓
- 275.334 + 22.643 + 262 = **298.239** ✓
- 717 + 1.424 + 0 = **2.141** ✓
- 2.141 / 298.239 = **0,72%** ✓
- 717 / 275.334 = **0,26%** ✓
- 1.424 / 22.643 = **6,3%** ✓
- 0,05 × 298.239 = **14.912** ✓
- 0,10 × 298.239 = **29.824** ✓
- 125.277.230 − 125.275.835 = **1.395** ✓
- 16.011 / 497.508 = **3,2%** ✓
- 36.340 / 128.235.243 = **0,03%** ✓
- 6.761 / 7.970 = **84,8%** ✓
- 82.894 / 83.472 = **99,3%** ✓
- (5.560−54) / 5.560 = **99%** a menos ✓
- 2.898 / 5.570 = **52%** ✓
- 37 / 84 = **44%** ✓
- 7 + 1 = **8** (máximo caso RJ 0005/0001) ✓
- 149.424 / 297.977 = 50,2% → "cerca de metade" para zerar piso ✓
- 6.761 > 5.560 ✓ (atendimentos com foto > excesso)
- 86.934 ≈ "87 mil" ✓ (arredondamento declarado)

Não conferíveis sem dados (taxas por faixa de comparecimento 87,3%/82,3%/62,1%/32,7%/10,4%, biometria por UF e faixa, 51%/43%/38% homens, 1.212 datas inválidas, contagens das zonas): sem contradição interna detectada.