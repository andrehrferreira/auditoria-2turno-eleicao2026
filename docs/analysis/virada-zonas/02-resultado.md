# 02. H26: resultado da triagem das zonas (30/10/2026)

Plano e corte: [01-plano.md](01-plano.md). Script: `scripts/auditoria/virada-zonas.mjs` (~1 min). Dados: `data/parsed/auditoria/virada-zonas/`. **Revisado pelo cético** ([parecer 34](../cetico-revisor/34-h26-virada-zonas.md)), que reproduziu os números por um caminho independente. Esta versão incorpora as correções do parecer. Rótulos: **Fato**, **Hipótese**, **Pendente**.

## Resposta curta

- **Fato:** pelo corte do plano, nenhuma zona isolada desviou para o 13 o bastante para aparecer. Quatro desviaram para o 22, isto é, nelas o 13 cresceu **menos** do que o esperado.
- **Fato (alcance, parecer 34):** a triagem enxerga uma inserção de 3 a 7 p.p. dos votos de uma zona: 4,6 p.p. na mediana, cerca de 1.600 votos ou 11 por seção. Menos que isso ela não enxerga. Também não enxerga algo espalhado por uma capital (o esperado absorve cerca de metade) ou por uma UF inteira (absorve tudo).
- **Fato:** a virada para o 13 aconteceu em quase todo o país: o 13 melhorou a margem em 2.626 das 2.641 zonas (mediana +5,1 p.p.). Isso descreve a distribuição. Não é argumento contra uma inserção espalhada, que esta triagem não vê.
- **Fato:** o modelo da urna não muda a virada dentro da mesma zona. O teste enxergaria desvios a partir de 0,11 a 0,18 p.p.
- **Fato:** dentro da mesma zona, a seção que teve mais votos depois das 17h no 2º turno virou um pouco **mais** para o 13. São cerca de 12.900 votos de margem no país, nas 5 regiões, com explicação **Pendente**.
- **Hipótese:** as zonas mais perto do corte para o 13 são de capitais e regiões metropolitanas, onde o comparecimento subiu mais que na UF. O aumento delas passou pela digital um pouco mais que nas outras zonas.

## Universo e conferências (Fato)

| Conferência | Resultado |
|---|---|
| Seções pareadas nos dois turnos | 499.207, 28 UFs (27 + exterior), 2.641 zonas |
| Votos do 13 e do 22 das seções × resultado oficial (`voto_oficial`) | iguais nos dois turnos: 53.879.538 e 56.104.503 no 1º; 64.256.232 e 59.826.041 no 2º. O parecer 34 conferiu candidato a candidato: 0 divergência |
| Votos dos eliminados (14, 30, 55, 70 e demais) × coluna `out1` dos pares | iguais em todas as seções; nenhum voto sem seção |
| Horas de votação no log | 497.897 seções no 1º turno e 497.896 no 2º; 1.310 do exterior sem fuso; 1 seção com o log do 2º turno não lido (SP 64777/0395/0298) |

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

- Distribuição da virada bruta entre as zonas: 1% abaixo de +0,51 p.p., mediana +5,09, 99% abaixo de +9,08. Só 15 zonas tiveram virada para o 22 (RS, SC, GO, PR); a maior foi de −1,47 p.p. (RS 0129, Nova Petrópolis).
- As 128 zonas que viraram tinham o 22 à frente por no máximo 7,77 p.p. no 1º turno. Há 127 zonas com o 22 à frente por menos que a virada nacional (5,44 p.p.). Virar ali é o esperado de um deslocamento geral. Nenhuma zona virou do 13 para o 22.
- Por UF: `por-regiao.csv`. A coluna `alemEsperado` por UF é zero por construção, porque o esperado é ajustado na própria UF. Ela não pode ser lida como "nenhuma UF além do esperado".

## 2. Virada além do esperado

O esperado de cada seção sai dos votos do 1º turno da própria seção: 13, 22, cada eliminado, brancos+nulos e abstenção. Os pesos são estimados por UF. Eles servem para prever e não dizem para onde foi cada eleitor: 132 dos 504 pesos ficam fora de [0, 1]. Exemplo: o peso de Zema para o 13 é negativo em 10 UFs.

- **Hipótese (rebaixada pelo parecer 34):** o peso do voto do 22 no 1º turno sobre o voto do 13 no 2º fica entre −0,08 e +0,04 em todas as UFs, o que sugere pouca troca direta do 22 para o 13 (o mesmo da H10). Como os pesos são ecológicos, isso não mede quem trocou de lado.
- **Fato:** corte do plano (q < 0,01 e pelo menos 2 p.p.): **0 zonas para o 13, 4 para o 22.**

| UF | Zona | Município principal | Seções | Virada bruta | Além do esperado | z |
|---|---|---|---|---|---|---|
| MA | 0032 | Humberto de Campos | 186 | +6,73 | −6,72 | −5,73 |
| SP | 0002 | São Paulo | 439 | +0,88 | −3,37 | −5,32 |
| CE | 0020 | Crateús | 250 | +0,83 | −4,46 | −4,99 |
| BA | 0105 | Piatã | 150 | +1,55 | −5,74 | −4,36 |

As 4 zonas, seção a seção: [04](04-casos.md). Nelas o efeito é espalhado pela zona e acompanha mudanças de comparecimento ou um padrão que já existia em 2018 e 2022.

**O resultado depende do método (Fato, parecer 34, seção B).**
- **A régua do z tem cauda pesada:** |z| ≥ 3 aparece em 22 zonas do lado do 13 e 17 do lado do 22, contra 3,6 esperadas de cada lado numa curva normal. A régua também cresce com o tamanho da zona. Zonas do mesmo município se parecem: as 19 zonas de Salvador têm z mediano de +1,94.
- **Outras escolhas razoáveis dão de 0 a 9 zonas para o 13:**
  - régua por UF: 5 (Petrolina 0083 e 0145, Santos 0118, São Vicente 0340, São Paulo 0418);
  - régua por região e tamanho: 1 (GO 0047);
  - régua em p.p.: 2 (AM 0042, Atalaia do Norte, +7,04 p.p. em 32 seções; GO 0047);
  - pesos restritos a [0, 1]: 9 (BA 0014, GO 0028, SC 0013 e 6 zonas de São Paulo).
- Em geral, as zonas que aparecem são as mesmas da lista z ≥ 3 abaixo. As exceções (GO 0047, AM 0042, SC 0013) pedem uma olhada, não um alarme.

**A cauda do lado do 13** (22 zonas com z ≥ 3; q entre 0,014 e 0,18):
- **Onde ficam:** são, na maioria, de capitais e regiões metropolitanas.
  - 5 de Salvador e região: 0003, 0011, 0014, Simões Filho 0033, Lauro de Freitas 0180;
  - 5 de São Paulo e Baixada Santista: 0020, 0372, 0418, Santos 0118, São Vicente 0340;
  - 2 do Rio: 0161, 0179;
  - Brasília (DF 0006), Águas Lindas de Goiás, 2 de Petrolina, Juazeiro, Campos dos Goytacazes, Ituiutaba, João Monlevade, Santa Cruz do Sul e Viamão.
- **Fato (`resumo.json` → `cauda`):** nessas 22 zonas, o comparecimento subiu 3,93 p.p. (mediana), 1,29 p.p. acima da mediana da própria UF. Nas 17 zonas do lado do 22, subiu 1,65 p.p. Todas as 19 zonas de Salvador subiram acima da mediana da Bahia (2,94 p.p.).
- **Fato:** dos 99.232 eleitores a mais nessas 22 zonas, 82,15% foram habilitados pela digital, 10,50% não têm digital cadastrada e 7,35% foram liberados pelo ano de nascimento. Nas demais zonas das mesmas UFs: 78,63%, 11,62% e 9,75%. Os três campos vêm do próprio BU. A soma deles bate com o comparecimento, e o campo de digital bate com o log em 99,997% das seções.
- **Fato:** a heterogeneidade é grande.
  - RJ 0161 e 0179: cerca de um terço do aumento sem digital.
  - RJ 0075, Campos dos Goytacazes, z 3,48: o comparecimento **caiu** (−1.255 eleitores), então ali "volta do eleitor" não explica.
- **Hipótese:** a cauda do 13 é, na maior parte, volta de eleitor urbano às urnas. Salvador e Lauro de Freitas são municípios da decisão do STF sobre falta de transporte público no 2º turno (H06). 10 das 22 zonas já eram cauda do PT em 2018 ([03](03-linha-de-base.md)).
- **Até onde vai o argumento:**
  - **O que ele afasta:** a liberação em massa pelo mesário. Esse caminho deixaria maior a parte liberada pelo ano de nascimento, e ela é menor.
  - **O que ele não afasta:** uma manipulação dentro da urna, que escreveria o BU e o log do mesmo jeito. Essa é a pergunta das H05/H16.
  - **Por que o comparecimento não decide:** comparecimento acima da UF também é o que uma inserção produziria.

## 3. Modelo da urna

Contraste de cada modelo com as outras urnas da **mesma zona** (efeito fixo de zona, só zonas com mais de um modelo, peso = nominais do 2º turno, erro-padrão agrupado por zona; `por-modelo.csv`). O parecer 34 mostrou que a primeira versão deste teste diluía o desvio, porque somava zonas de um só modelo, onde o desvio é zero por construção.

| Grupo (Brasil) | Seções nas zonas mistas | Zonas mistas | Contraste (p.p.) | Erro-padrão | z | Menor desvio visível (3 × EP) |
|---|---|---|---|---|---|---|
| UE2013 | 10.523 | 655 | +0,069 | 0,061 | 1,13 | 0,18 |
| UE2015 | 78.250 | 788 | −0,097 | 0,039 | −2,50 | 0,12 |
| UE2020 | 69.461 | 709 | +0,026 | 0,037 | 0,69 | 0,11 |
| UE2022 | 69.888 | 702 | +0,034 | 0,035 | 0,95 | 0,11 |
| Trocou de modelo entre turnos | 1.206 | 583 | −0,003 | 0,112 | −0,02 | 0,34 |

- **Fato:** nenhum |z| ≥ 3 nos 30 testes (Brasil e 5 regiões × 5 grupos). O maior é o da UE2015 no Brasil (−2,50), que aponta para **menos** 13. Nas regiões, o maior |z| é 2,19.
- O teste não vê um desvio igual em todas as urnas de uma zona, por modelo ou não. É o mesmo limite das H14 e H25, que também não acharam desvio de voto por modelo.

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
- **Hipótese:** no 1º turno o eleitor digita 6 ou 7 cargos e a fila anda devagar; no 2º turno são 2 cargos e a fila da manhã acaba cedo. As 4 zonas fora da curva têm o mesmo perfil de horas do país.
- **Fato (conciliação com a linha do tempo):**
  - A tabela soma só as 497.896 seções com log nos dois turnos. Fica fora SP 64777/0395/0298, cujo log do 2º turno o perfil não leu ([cetico-revisor/21](../cetico-revisor/21-invariantes-sem-violacao.md)); ela tem 2 votos depois das 17h no 1º turno.
  - Com ela, o 1º turno dá 3.723.360 votos depois das 17h, igual à perícia (tópico 03). O 2º turno dá 34.330, igual a [linha-do-tempo/02](../linha-do-tempo/02-votos-apos-17h.md).
  - Os 3.672.406 da H06 são outro recorte: só as urnas da própria seção, sem as de contingência, e com o exterior na hora local.
  - Os perfis de hora do banco e os gravados em disco são idênticos nas 499.207 seções do 1º turno, e o fuso por município também.

**Voto tardio e virada, dentro da zona (`resumo.json` → `horario`).** A primeira versão media a diferença entre a parcela tardia do 2º turno e a do 1º. O parecer 34 mostrou que essa diferença mede sobretudo o 1º turno, e que a leitura "a seção que votou mais tarde virou menos para o 13" estava errada. Agora cada turno entra com a sua parcela na mesma regressão, com efeito fixo de zona e controles: log dos aptos, variação do comparecimento, parcela do 13 e abstenção no 1º turno.

| Parcela de votos da seção | Desde 15h: coeficiente (z) | Desde 17h: coeficiente (z) |
|---|---|---|
| no 2º turno | **+0,068** (21,8) | **+0,392** (7,3) |
| no 1º turno | +0,027 (15,9) | +0,020 (9,8) |

- **Fato:** a seção com mais votos tardios no 2º turno virou mais para o 13. Desde 17h, o coeficiente é positivo em todas as regiões: N +0,65 (z 3,5), NE +0,25 (3,0), CO +0,61 (3,7), SE +0,41 (4,7), S +0,34 (1,7).
- **Fato:** em votos, cada voto depois das 17h no 2º turno vem com +0,38 voto de margem para o 13 além do esperado (z 7,2). São 34.329 votos tardios em 29.853 seções, ou seja, cerca de 12.900 votos de margem, 0,3% da margem nacional de 4.430.191. Mesmo que os 34.330 votos tardios fossem todos do 13, não mudariam o resultado.
- **Fato:** a parcela tardia do **1º** turno também vai com mais virada para o 13. Isso sugere que o efeito é do lugar (seção com fila longa) e não só do voto tardio do 2º turno.
- **Fato (log bruto, leitura da H06 por `cetico-h06-reproducao-logs.mjs`):** dos 34.330 votos depois das 17h no 2º turno, 84,07% foram habilitados pela digital, 7,89% pelo ano de nascimento e 8,05% por dado pessoal conferido pelo mesário. No total do 2º turno, 87,32% foram pela digital. Nas zonas da cauda do 13, 85,05% dos votos tardios foram pela digital.
- **Hipótese:** quem vota tarde no 2º turno é diferente de quem vota cedo: mais jovem, trabalha, depende de transporte. O aumento de comparecimento a favor do 13 se concentra nesse grupo. Pelo princípio 8, a explicação fica como Hipótese até ter rastro técnico.
- **Pendente:** cruzar a associação com os municípios da prorrogação (H06) e com o tipo de habilitação do voto tardio por seção.

## Limites

- **Alcance (parecer 34, seção A):**
  - **Uma zona:** a triagem enxerga uma inserção de 4,6 p.p. na mediana (7,3 nas zonas menores, 2,8 nas maiores), ou 2,25 p.p. se o voto for trocado do 22 para o 13. Com 2 p.p., só 178 das 2.640 zonas acenderiam.
  - **Várias zonas da UF:** com 5 p.p. em 25% das zonas, só cerca de 30% delas acendem (SP, BA, GO).
  - **Capital inteira:** o esperado absorve cerca de metade. 5 p.p. em todas as zonas de Fortaleza (≈ 78 mil votos) não acendem nenhuma; no Rio (≈ 184 mil), acendem 2 de 49.
  - **UF inteira, ou proporcional ao voto do 13 no 1º turno:** absorvida 100%. Essa pergunta é a da H10 e da linha de base histórica.
- **Régua:** as zonas próximas umas das outras não são independentes, e o z robusto não tem taxa de falso alerta calibrada. O q < 0,01 das 4 zonas do 22 também está inflado.
- **Exterior:** é uma zona só, sem comparação de z.
- **Ordem plano → resultado:** o plano foi escrito antes de rodar o script, mas entrou no mesmo commit que o resultado (6d1175a). Não há rastro técnico dessa ordem.
- **Próxima rodada (Recomendação do parecer 34):** registrar o plano em commit próprio antes de rodar. Triar também por município. Usar uma régua que dependa do tamanho, calibrada por simulação ou pela linha de base de 2018/2022, e fixar uma especificação para os pesos.
- Linha de base de 2018 e 2022: [03](03-linha-de-base.md). As 4 zonas do 22, seção a seção: [04](04-casos.md).
- **Pendente:** se "data de pico" quis dizer a hora de chegada do boletim ao TSE, rodar a mesma comparação com `recebido_tse`.
