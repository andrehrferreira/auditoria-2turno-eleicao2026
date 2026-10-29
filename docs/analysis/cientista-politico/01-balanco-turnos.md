# 01. Balanço de votos para presidente do 1º para o 2º turno (H10 / doc 07 B5)

Cientista político, 29/10/2026. Regra de rótulos: **Fato** (sai de script do repo sobre arquivo público), **Hipótese**, **Recomendação**. Princípio 8 (doc 01): nenhuma explicação abaixo usa procedimento humano como controle. Explicação política só entra como hipótese com previsão testada nos dados.

## Como reproduzir

```bash
node --max-old-space-size=8192 scripts/auditoria/politico-balanco-turnos.mjs   # ~90 s, 3 CSVs dos dados abertos
node scripts/auditoria/politico-biometria-crescimento.mjs                    # ~90 s, banco (UFs com o 1º turno carregado)
node scripts/auditoria/politico-locais-comparecimento.mjs ap 6050 200        # comparecimento por local de votação (Macapá)
```

Saídas em `data/parsed/auditoria/cientista-politico/`: `balanco-resumo.json` (país, regiões, UFs, porte, transição, abstenção), `balanco-municipios.jsonl` (5.757 municípios, incluindo cidades do exterior), `biometria-crescimento.json`.

Fontes: `votacao_candidato_munzona_2026_BR.csv` (gerado em 28/10/2026 19:31, votos por município e zona), `detalhe_votacao_secao_2026_BR.csv` (26/10 09:49, aptos, comparecimento, brancos e nulos por seção), `votacao_secao_2026_BR.csv` (26/10 12:07, votos por seção). No 2º turno o `votacao_secao` é igual à soma dos BUs (H03). No 1º turno essa igualdade ainda não foi conferida no país.

## Conferências dos dados

- **Fato.** A soma por seção (`votacao_secao`) é igual ao `munzona` em todos os candidatos e municípios. Em todas as 998.496 linhas seção × turno, nominais + brancos + nulos = comparecimento.
- **Fato (qualidade de dado, para a frente de contagem).** O número **28** teve **5.246 votos** no 1º turno no `votacao_secao` e no `detalhe` (somados nos nominais), mas **não tem nenhuma linha** no `votacao_candidato_munzona`. O script inclui esses votos entre os eliminados. Depois disso, a identidade contábil fecha nos 5.757 municípios. Por que o candidato some do munzona está **[a confirmar]**: situação da candidatura no `consulta_cand` ou no leiame.

## Identidade usada

Para cada município: `ΔL + ΔF = eliminados + (brancos/nulos do 1º − brancos/nulos do 2º) + (comparecimento do 2º − comparecimento do 1º)`. L é o 13 e F é o 22. Isso é contabilidade, não identifica eleitor nenhum. Por isso **"o ganho de um finalista não cabe no disponível" equivale exatamente a "o outro finalista perdeu votos"**. O teste fica simétrico.

## Resultado nacional (Fato)

| | 1º turno | 2º turno | Δ |
|---|---|---|---|
| 13 (LULA) | 53.879.538 | 64.256.232 | **+10.376.694** |
| 22 (FLAVIO BOLSONARO) | 56.104.503 | 59.826.041 | **+3.721.538** |
| Eliminados (10 candidatos + o 28) | 9.321.993 | — | |
| Brancos + nulos | 5.969.801 | 4.153.801 | −1.816.000 |
| Comparecimento | 125.275.835 (78,92%) | 128.236.074 (80,78%) | +2.960.239 |
| **Disponível** (eliminados + queda de BN + aumento de comparecimento) | | | **14.098.232** |

- **O ganho do 13 é maior que todos os votos dos eliminados juntos** (+10,38 mi contra 9,32 mi). Ele só cabe no disponível somando o aumento de comparecimento e a queda de brancos e nulos. O 13 ficou com **73,6%** do disponível e o 22 com 26,4%.
- Limite bruto da comparação de turnos (ganho maior que eliminados + BN do 1º + abstenção do 1º + novos aptos): **0 votos** de migração mínima obrigatória nos municípios, para os dois finalistas.

## Por região e UF (Fato)

| Região | Comparecimento 1º → 2º | Parte do disponível que foi para o 13 | Municípios onde o 22 perdeu votos | Municípios onde o 13 perdeu votos |
|---|---|---|---|---|
| Norte | 80,6% → 78,8% | 97,2% | 305 de 450 | 57 |
| Nordeste | 81,6% → 83,5% | 88,2% | 585 de 1.794 | 19 |
| Sudeste | 77,3% → 79,7% | 71,2% | 19 de 1.668 | 1 |
| Centro-Oeste | 78,3% → 80,0% | 62,1% | 25 de 468 | 2 |
| Sul | 79,5% → 81,8% | 60,6% | 4 de 1.191 | 0 |
| Exterior | 37,3% → 41,6% | 60,9% | 12 de 186 | 10 |

- **H10 como foi escrita ("maior do que o disponível, em todos os estados") é falsa.** Em 21 UFs e no exterior, o ganho de cada finalista cabe no disponível.
- O ganho do 13 passa do disponível em **6 UFs**, onde o 22 perdeu votos: AC (−15.092), AP (−13.604), RR (−11.647), MA (−9.069), AM (−1.519) e TO (−1.405). O ganho do 22 não passa do disponível em nenhuma UF.
- Nas 6 UFs **o comparecimento caiu**: AC −5,7 p.p., AP −8,1, RR −6,0, AM −1,5, TO −0,9, MA −0,7. Nas 3 primeiras o disponível líquido é negativo (−5.349, −3.139 e −2.562).
- Nos municípios: o 22 perdeu votos em 950 e o 13 em 89. **Em 627 dos 950** (82% do excesso, 109.469 de 133.924 votos), a queda de comparecimento sozinha já é maior que a perda do 22. Nos casos simétricos, 82 dos 89 (15.550 de 16.239 votos). Sobram **323 municípios / 24.455 votos** em que o ganho do 13 só fecha com troca líquida 22 → 13 ou rotatividade de eleitores, contra **7 municípios / 689 votos** no sentido inverso.

## Explicações políticas testadas

### E1. Abstenção diferencial no Norte (Hipótese testada, compatível)

**Previsão.** Se o 22 perdeu votos porque parte do eleitorado deixou de votar, cada eleitor a menos tira de cada finalista mais ou menos a fatia dele no 1º turno. A queda deve se concentrar onde votar é mais difícil, não em seções escolhidas.

**Dados (Fato).**

- Regressão por seção, ΔF/comparecimento em função de Δcomparecimento, eliminados e BN. Coeficiente de Δcomparecimento × fatia do 1º turno:

| UF | 22 | 13 |
|---|---|---|
| AC | 0,613 × 0,620 | 0,349 × 0,276 |
| RR | 0,704 × 0,695 | 0,263 × 0,224 |
| AP | 0,447 × 0,446 | 0,523 × 0,446 |

  Quem deixou de votar tinha a composição do eleitorado local. O 22 perdeu mais porque era maioria ali.
- **A queda está no interior.** Comparecimento no interior: AP 80,7% → 70,0%, RR 83,2% → 72,7%, AC 79,4% → 71,0%. Nas capitais a queda foi de 2 a 6 p.p.
- Em Macapá, 7 dos 8 locais de votação com as maiores quedas (−16 a −23 p.p.) ficam em vilas ribeirinhas, ilhas e comunidades quilombolas: Rio Ipixuna, Vila de São Sebastião da Boa Vista, Vila de Maruanum, Rio Pedreira, Carapanatuba Ribeirinha, Foz do Gurijuba, Ilha do Brigue. A exceção fica numa avenida urbana (Cabralzinho). As seções são agrupadas pelo local do 1º turno, e as 5 seções que mudaram de local entre os turnos ficam de fora. Comando: `node scripts/auditoria/politico-locais-comparecimento.mjs ap 6050 200`.
- **Previsão alternativa testada (princípio 8): impedir eleitores do 22 de votar.** Se fosse isso, a queda de comparecimento seria maior nas seções pró-22. Medido: a inclinação de Δcomparecimento sobre a fatia do 22 é **positiva** em todas as UFs do Norte (AP +0,19, AC +0,065, RR +0,026). A queda foi **maior nas seções pró-13**. A previsão não se confirma.
- **Hipótese não testada:** a causa da queda no interior (transporte fluvial, estiagem, transporte oferecido por candidatos locais no 1º turno). Ter 2º turno para governador **não segurou o comparecimento**. UFs com 2º turno estadual: 80,3% → 80,9%. UFs sem: 79,1% → 81,0%. O AC teve 2º turno de governador e caiu 5,7 p.p.

### E2. Os eleitores a mais no 2º turno foram habilitados como os de antes? (princípio 8, Fato em 12 UFs)

Se o aumento de comparecimento que favoreceu o 13 no Nordeste viesse de mesários liberando eleitores sem biometria para votar, o voto a mais estaria concentrado nas habilitações sem biometria. Nas 12 UFs com o 1º turno no banco (AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS; 188.425 seções):

- **A parcela sem biometria no comparecimento quase não muda:** BA 12,01% → 12,26%, CE 10,90% → 11,17%, MG 17,89% → 18,32%, AC 8,65% → 8,37%.
- Regressão por seção, ganho de cada finalista em função de Δhabilitados por biometria e Δhabilitados sem biometria (ano de nascimento + sem biometria cadastrada):
  - 13: **0,577 por biometria × 0,571 sem**;
  - 22: **0,385 × 0,390**.
  - Em cada uma das 12 UFs, a diferença entre os dois coeficientes é de no máximo 0,033 para os dois finalistas.
- Nas 902 seções com 20 ou mais habilitações sem biometria a mais do que no 1º turno, o 13 ficou com 75,3% do ganho dos dois finalistas. Nas 12 UFs inteiras, ficou com 76,9%.
- **Leitura.** O eleitor a mais se dividiu do mesmo jeito, qualquer que tenha sido a forma de habilitação. Não há, no agregado, assinatura de voto inserido pela brecha da liberação sem biometria **a favor de um lado**. Isso não exclui uso local da brecha, que é tema da frente de biometria. Também não cobre o que não deixa rastro no arquivo: compra de voto, coação e transporte de eleitor.
- **Falta (Recomendação):** rodar de novo quando o 1º turno de PR, RS, SC, SP, RJ e Norte/Nordeste restantes estiver no banco. No Sul, o aumento de comparecimento puxou mais para o 13 (RS: 0,616 para o 13 contra fatia de 0,342 no 1º turno). É lá que este teste mais importa.

## Para onde foram os votos dos eliminados

A sessão −64 já estimou a transferência por seção (`scripts/transferencia-votos.mjs`, Goodman, 27 UFs sem SP). O `politico-balanco-turnos.mjs` repete a mesma regressão **só como réplica, com SP e por região**. Os números nacionais batem com a −64: 14 → 13: 0,46 (−64: 0,50); 55 → 13: 0,42 (0,44); 70 → 13: 0,58 (0,57); BN → 13: 0,75 (0,82); abstenção → 13: 0,07 (0,06). Lealdade dos finalistas: 13 → 13 = 1,01 e 22 → 22 = 1,00.

**Ressalva:** regressão de Goodman é inferência ecológica. Ela supõe taxas iguais em todas as seções da região. Coeficientes fora de [0, 1] mostram que essa suposição falha:

- Zema → 22 = 1,07 e → abstenção = −0,41;
- 55 no Nordeste: 0,70 + 0,51;
- quase todas as categorias pequenas no Norte.

Os números abaixo são **Hipótese**, não contagem.

| Eliminado (partido, votos no 1º turno) | Previsão pelo perfil (Hipótese) | Estimativa: 13 / 22 / BN | Consistente? |
|---|---|---|---|
| 70 Augusto Cury (AVANTE, 3,45 mi) | Centro, sem lado claro | 0,58 / 0,29 / 0,14; o 13 fica entre 0,44 e 0,68 em todas as regiões | Sem previsão firme. O sinal é estável em todas as regiões |
| 14 Renan Santos (MISSÃO, 2,68 mi) | Direita liberal, contra os dois polos: divisão + mais BN | 0,46 / 0,45 / 0,16 (maior BN entre os grandes) | Sim |
| 55 Ronaldo Caiado (PSD, 2,61 mi) | Direita, governador de GO: maioria para o 22 | 0,42 / 0,53 / 0,07. Sul 0,29 / 0,60; SE 0,37 / 0,58; NE instável | Parcial: maioria para o 22 só no Centro-Sul |
| 30 Zema (NOVO, 0,33 mi) | Direita liberal: 22 | 0,16 / 1,07 (instável) | Sim, na direção |
| Outros (PSTU, PCB, PCO, UP, DC, DEMOCRATA, 28; 0,27 mi) | Maioria à esquerda: 13 | 0,81 / 0,06 | Sim |
| Brancos e nulos do 1º turno (5,97 mi) | Sem previsão firme | 0,75 / 0,13 / 0,39 | **Suspeito de viés de agregação** (BN alto onde o 13 é forte). Ver Recomendação |
| Abstenção do 1º turno (33,5 mi) | Volta pequena | 0,07 / 0,04 / 0,89 fica de fora | Sim, inclina para o 13 |

**Limite determinístico, sem inferência ecológica (Fato):** em **Goiás**, o reduto de Caiado (11,9% dos votos, contra 2,1% no país), o ganho do 13 passa, município a município, de tudo o que não é voto de Caiado: outros eliminados + aumento de comparecimento + queda de BN. A diferença é de **pelo menos 174.506 votos (37% dos 472.041 de Caiado em GO)**. Eles têm de vir de eleitores de Caiado ou de eleitores do 22 no 1º turno. O mesmo limite para o 22 é 86.709 (18%). No DF, o 2º maior percentual de Caiado (4,6%), o mínimo para o 13 é 10.167 (12%). Em MG (Zema) e SP (Renan, Cury), o limite é praticamente zero, ou seja, não informa. Comando: `node scripts/auditoria/politico-limites-municipios.mjs`, que gera `limites-municipios.json` e também as contagens de "não cabe" e capital × interior acima.

- **Hipótese:** uma parte grande do eleitorado de Caiado em GO votou no 13. Isso contraria a previsão ideológica simples. A explicação política depende da campanha do 2º turno (apoio declarado de Caiado ou do PSD, voto de máquina estadual e não ideológico), que é **[a confirmar]** em fonte de imprensa, sem rede nesta sessão.
- **Teste possível nos dados (Recomendação):** se é voto de máquina estadual, a transferência para o 13 deve ser maior nos municípios onde o voto em Caiado ficou mais acima da média de GO.

## Pendências

1. **Linha de base de 2022 e 2018** (`votacao_candidato_munzona` 2022, 2º turno). Sem ela não dá para dizer se 73,6% do disponível para um lado é comum ou raro, nem se a queda de comparecimento no Norte entre turnos se repete. O acesso depende do coordenador (rede).
2. Teste E2 nas UFs que faltam no 1º turno do banco.
3. BN do 1º turno → 13: testar a hipótese de "nulo por erro ou cansaço no 1º turno, com cinco cargos", que prevê BN maior onde a escolaridade é mais baixa (`perfil_eleitor_secao`). Isso explicaria o coeficiente sem fraude e sem viés.
4. Conferir que o `votacao_secao` do 1º turno é igual à soma dos BUs (H03 no 1º turno), porque este balanço usa o dado oficial.
