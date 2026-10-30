# 02. H26: resultado da triagem das zonas (30/10/2026)

Plano e corte: [01-plano.md](01-plano.md). Script: `scripts/auditoria/virada-zonas.mjs` (~2 min). Dados: `data/parsed/auditoria/virada-zonas/`. **Aguarda revisão cética.** Rótulos: **Fato**, **Hipótese**, **Pendente**.

## Resposta curta

- **Fato:** nenhuma das 2.641 zonas passa do corte fixado no plano a favor do 13. Quatro passam a favor do 22, isto é, o 13 cresceu nelas **menos** do que o esperado.
- **Fato:** a virada para o 13 aconteceu em quase todo o país, sem concentração: o 13 melhorou a margem em 2.626 das 2.641 zonas (mediana +5,1 p.p.).
- **Fato:** o modelo da urna não muda a virada dentro da mesma zona. A seção que passou a votar mais tarde no dia virou **menos** para o 13, não mais.
- **Hipótese:** as zonas que mais se aproximam do corte para o 13 são de capitais e regiões metropolitanas (Salvador, Lauro de Freitas, São Paulo, Santos, Rio), onde o comparecimento subiu mais que na UF. Nelas, 82% dos eleitores a mais foram identificados pela digital (78% nas demais zonas).

## Universo e conferências (Fato)

| Conferência | Resultado |
|---|---|
| Seções pareadas nos dois turnos | 499.207, 28 UFs (27 + exterior), 2.641 zonas |
| Votos do 13 e do 22 das seções × resultado oficial (`voto_oficial`) | iguais nos dois turnos: 53.879.538 e 56.104.503 no 1º; 64.256.232 e 59.826.041 no 2º |
| Votos dos eliminados (14, 30, 55, 70 e demais) × coluna `out1` dos pares | iguais em todas as seções; nenhum voto sem seção |
| Horas de votação no log | 497.897 seções no 1º turno e 497.896 no 2º; 1.310 do exterior sem fuso, 1 sem perfil no 2º. Soma das horas ≠ comparecimento em 15 e 9 seções |

## 1. Virada por região e UF

Virada bruta = margem do 13 sobre o 22 no 2º turno menos a margem no 1º, em p.p. dos votos nominais de cada turno.

| Região | Zonas | Margem 1º turno | Margem 2º turno | Virada bruta | Zonas em que o 22 vencia e o 13 passou a vencer | Fora da curva (13 / 22) |
|---|---|---|---|---|---|---|
| Norte | 252 | −4,50 | +0,01 | +4,51 | 19 | 0 / 0 |
| Nordeste | 808 | +32,92 | +38,74 | +5,82 | 7 | 0 / 3 |
| Centro-Oeste | 217 | −23,89 | −20,03 | +3,87 | 2 | 0 / 0 |
| Sudeste | 912 | −11,68 | −5,52 | +6,16 | 78 | 0 / 1 |
| Sul | 451 | −28,80 | −25,15 | +3,65 | 22 | 0 / 0 |
| Exterior | 1 | +4,07 | +7,71 | +3,64 | 0 | — |
| **Brasil** | **2.641** | **−1,86** | **+3,57** | **+5,44** | **128** | **0 / 4** |

- Distribuição da virada bruta entre as zonas: 1% abaixo de +0,51 p.p., mediana +5,09, 99% abaixo de +9,08. Só 15 zonas tiveram virada para o 22 (RS, SC, GO, PR), a maior de −1,47 p.p. (RS 0129, Nova Petrópolis).
- As 128 zonas que viraram tinham o 22 à frente por no máximo 7,77 p.p. no 1º turno. Há 127 zonas com o 22 à frente por menos que a virada nacional (5,44 p.p.). Virar ali é o esperado de um deslocamento geral. Nenhuma zona virou do 13 para o 22.
- Por UF: `por-regiao.csv`.

## 2. Virada além do esperado

O esperado de cada seção sai dos votos do 1º turno da própria seção (13, 22, cada eliminado, brancos+nulos e abstenção), com pesos estimados por UF. Os pesos são ecológicos: servem para prever, não dizem para onde foi cada eleitor.

- **Fato:** o peso do voto do 22 no 1º turno sobre o voto do 13 no 2º fica entre −0,08 e +0,04 em todas as UFs. Não há sinal de eleitor do 22 que passou para o 13, o mesmo resultado da H10.
- **Fato:** corte do plano (q < 0,01 e pelo menos 2 p.p.): **0 zonas para o 13, 4 para o 22.**

| UF | Zona | Município principal | Seções | Virada bruta | Além do esperado | z |
|---|---|---|---|---|---|---|
| MA | 0032 | Humberto de Campos | 186 | +6,73 | −6,72 | −5,73 |
| SP | 0002 | São Paulo | 439 | +0,88 | −3,37 | −5,32 |
| CE | 0020 | Crateús | 250 | +0,83 | −4,46 | −4,99 |
| BA | 0105 | Piatã | 150 | +1,55 | −5,74 | −4,36 |

- Sem o corte de q, 39 zonas têm |z| ≥ 3: 22 para o 13 e 17 para o 22. As 22 do lado do 13 têm q entre 0,014 e 0,18. A maior: BA 0014 (Salvador), +2,77 p.p. além do esperado, z 4,13.
- As 22 zonas com z ≥ 3 do lado do 13 são, na maioria, de capitais e regiões metropolitanas: 5 de Salvador e região (0003, 0011, 0014, Simões Filho 0033, Lauro de Freitas 0180), 5 de São Paulo e Baixada Santista (0020, 0372, 0418, Santos 0118, São Vicente 0340), 2 do Rio (0161, 0179), Brasília (DF 0006), Águas Lindas de Goiás, 2 de Petrolina, Juazeiro, Campos dos Goytacazes, Ituiutaba, João Monlevade, Santa Cruz do Sul e Viamão.
- **Fato:** nessas 22 zonas o comparecimento subiu 3,90 p.p. (mediana), 1,28 p.p. acima da mediana da própria UF. Nas 17 do lado do 22, subiu 1,65 p.p. Todas as 19 zonas de Salvador subiram acima da mediana da Bahia (2,94 p.p.).
- **Fato:** dos 99.232 eleitores a mais nessas 22 zonas, 82,1% foram habilitados pela digital, 10,5% não têm digital cadastrada e 7,4% foram liberados por ano de nascimento. Nas demais zonas: 78,3%, 10,5% e 9,8%.
- **Hipótese:** a cauda do 13 é volta de eleitor urbano às urnas. Salvador e Lauro de Freitas são municípios da decisão do STF sobre falta de transporte público no 2º turno (H06). Voto inserido sem digital deixaria a parte sem digital maior, e ela é menor.

## 3. Modelo da urna

Dentro da mesma zona, desvio da virada além do esperado da seção em relação à zona, por modelo da urna do 2º turno (p.p. dos nominais; erro-padrão agrupado por zona).

| Modelo (Brasil) | Seções | Desvio na zona | Erro-padrão | z |
|---|---|---|---|---|
| UE2013 | 11.763 | +0,035 | 0,039 | 0,90 |
| UE2015 | 87.351 | −0,026 | 0,010 | −2,50 |
| UE2020 | 200.312 | +0,004 | 0,006 | 0,72 |
| UE2022 | 198.575 | +0,006 | 0,005 | 1,01 |
| Trocou de modelo entre turnos (7 combinações) | 1.206 | −2,78 a +1,82 | — | −2,77 a +0,96 |

- **Fato:** nenhum desvio passa de 0,04 p.p. nos modelos com mais de mil seções. Nas 56 linhas de Brasil e região × grupo de modelo (`por-modelo.csv`), o maior |z| é 2,77 (7 seções do Sudeste que trocaram UE2013 por UE2022), o que se espera de 56 testes sem efeito.
- **Fato:** as 4 zonas fora da curva têm menos urnas UE2013/UE2015 (9,85% das seções) que as demais (20,04%).
- Coerente com a H25 (urnas UE2013/UE2015) e a H14 (urnas de reserva), que também não acharam desvio de voto por modelo.

## 4. Horário dos picos

Votos por hora de Brasília, soma do país (`por-hora.csv`):

| Hora | 1º turno | 2º turno |
|---|---|---|
| 8h | 9,47% | 16,75% |
| 10h | 11,63% | 15,04% |
| 12h | 11,89% | 10,04% |
| 14h | 10,74% | 8,27% |
| 16h | 8,95% | 5,18% |
| 17h ou depois | 2,98% | 0,03% |

- **Fato:** o pico mudou de hora. No 1º turno, a hora de maior votação foi 11h em 1.309 zonas, e 15h ou 16h em 275. No 2º turno, foi 8h em 1.897 zonas e nunca depois das 12h.
- **Hipótese:** no 1º turno o eleitor digita 6 ou 7 cargos e a fila anda devagar; no 2º turno são 2 cargos e a fila da manhã acaba cedo. Vale para as duas pontas da triagem: as 4 zonas fora da curva têm o mesmo perfil de horas do país.
- **Fato:** dentro da mesma zona, a seção cuja parcela de votos depois das 15h cresceu mais virou **menos** para o 13: −0,017 p.p. de virada por p.p. de parcela tardia (erro-padrão 0,001; 2.640 zonas). Depois das 17h: −0,035 (0,002). O efeito é pequeno: 10 p.p. a mais de votos tardios = 0,17 p.p. a menos de virada.
- **Fato (conciliação com a linha do tempo):** a tabela soma só seções com log nos dois turnos (497.896). Fica fora SP 64777/0395/0298, cujo log do 2º turno o perfil não leu ([cetico-revisor/21](../cetico-revisor/21-invariantes-sem-violacao.md)). Ela tem 2 votos no 1º turno depois das 17h. Com ela, o 1º turno dá 3.723.360 votos depois das 17h, igual à perícia (tópico 03). O 2º turno dá 34.330, igual a [linha-do-tempo/02](../linha-do-tempo/02-votos-apos-17h.md). Os 3.672.406 da H06 são outro recorte: só as urnas da própria seção, sem as de contingência, e com o exterior na hora local. Os perfis de hora do banco e os gravados em disco são idênticos nas 499.207 seções do 1º turno, e o fuso por município também.

## Limites

- O esperado é ajustado por UF. Uma virada igual em toda a UF fica dentro do esperado e não aparece como zona fora da curva. Essa pergunta é a da H10 (balanço por UF) e da linha de base histórica.
- As zonas próximas umas das outras não são independentes, e o z robusto não tem taxa de falso alerta calibrada por simulação.
- O exterior é uma zona só (sem comparação de z).
- Linha de base de 2018 e 2022: [03](03-linha-de-base.md). 10 das 22 zonas da cauda do 13 já eram cauda do PT em 2018, e a cauda do 22 no Maranhão se repete em 2018 e 2022.
- As 4 zonas fora da curva para o 22, seção a seção: [04](04-casos.md). Efeito espalhado pela zona, em todos os modelos de urna, junto com mudanças de comparecimento.
- **Pendente:** se "data de pico" quis dizer a hora de chegada do boletim ao TSE, rodar a mesma comparação com `recebido_tse`.
