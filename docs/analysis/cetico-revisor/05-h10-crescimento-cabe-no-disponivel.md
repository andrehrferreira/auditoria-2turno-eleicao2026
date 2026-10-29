# 05. Parecer: o crescimento dos finalistas cabe no disponível (cientista político, H10)

Achado revisado: [docs/analysis/cientista-politico/01-balanco-turnos.md](../cientista-politico/01-balanco-turnos.md), resumido na linha H10 de [hipoteses.md](../../hipoteses.md).
Revisão em 29/10/2026. Três lentes independentes (reprodução, definições e explicações alternativas) e uma conferência minha dos pontos em que elas divergiram ou ficaram pendentes. Os três revisores deram **sustentado com ressalvas**.

## Afirmação original

> H10 ("crescimento de um finalista maior que o disponível em todos os estados") é falsa no nacional. O 13 ganhou +10.376.694 e o 22, +3.721.538. Disponível = eliminados 9.321.993 + queda de brancos e nulos 1.816.000 + aumento de comparecimento 2.960.239 = 14.098.232, e o 13 levou 73,6%. O ganho do 13 só passa do disponível em AC, AP, RR, MA, AM e TO. Ali o 22 perdeu votos com queda de comparecimento proporcional à composição local (abstenção diferencial no interior e no meio ribeirinho), e a queda foi maior nas seções pró-13.

## Veredito final: sustentado com ressalvas

- **A conta se sustenta.** Todos os números foram reproduzidos exatamente por três scripts independentes. A soma dos BUs é igual ao dado oficial seção a seção no 2º turno inteiro e no 1º turno das 25 UFs já carregadas.
- **A refutação da H10 se sustenta, e vai além do nacional.** Pela definição bruta da própria H10 (eliminados + abstenção + brancos e nulos do 1º turno), nenhum município do país passa do limite.
- **A explicação benigna só vale para AC, AP e RR.** Em MA, AM e TO o 22 perdeu votos em seções onde o comparecimento não caiu. Lá, "queda de comparecimento proporcional" não explica a perda. O que a explica é troca líquida 22→13 ou rotatividade de eleitores, e nenhuma das duas foi testada.
- **O teste não serve como absolvição.** "Cabe no disponível" é uma identidade contábil: o ganho só "não cabe" quando o outro finalista perde votos. Uma troca 22→13 grande o bastante para virar o resultado passaria sem alarme no nacional.

## Afirmação revisada (alcance que os dados sustentam)

> **Fato.** Do 1º para o 2º turno, o 13 ganhou +10.376.694 votos e o 22, +3.721.538. A soma é exatamente o saldo líquido disponível: eliminados 9.321.993 + queda de brancos e nulos 1.816.000 + aumento de comparecimento 2.960.239 = 14.098.232. O 13 ficou com 73,6% desse saldo; em 2018 o maior finalista ficou com 64,8% e em 2022 com 69,8%. A H10, como foi escrita, é falsa em todo o país. Pelo disponível bruto (com a abstenção do 1º turno) sobra folga em todos os 5.757 municípios.
>
> **Fato.** Com o disponível líquido, "o ganho do 13 passa do disponível" quer dizer o mesmo que "o 22 perdeu votos". Isso aconteceu em 6 UFs: AC −15.092, AP −13.604, RR −11.647, MA −9.069, AM −1.519 e TO −1.405. Em todas elas o comparecimento caiu.
>
> **Fato.** Em AC, AP e RR a queda de comparecimento proporcional à composição de cada seção explica cerca de 80% a 88% da perda do 22. Ali o 22 quase não perdeu votos em seções onde o comparecimento não caiu (148, 0 e 59 votos).
>
> **Fato, com leitura em Hipótese.** Em MA, AM e TO a perda do 22 não se explica pela queda de comparecimento. Seção a seção, a perda além do que a queda explica (29.315, 13.112 e 6.395 votos) é várias vezes o saldo da UF. O 22 também perdeu 10.652, 2.841 e 1.778 votos em seções onde o comparecimento não caiu. Isso exige troca líquida de voto 22→13 ou troca de eleitores entre os turnos (rotatividade). Nenhuma das duas é, por si, indício de fraude.
>
> **Fato.** A queda de comparecimento foi maior nas seções pró-13 em AP, AM, MA e TO, em qualquer especificação. Em AC e RR isso depende da especificação. Em nenhuma UF ela foi maior nas seções pró-22.
>
> **Limite.** O balanço é uma identidade e não tem poder contra voto inserido com comparecimento coerente, nem contra uma troca 22→13 abaixo de 6,2% dos votos do 22.

## O que foi reproduzido (Fato)

| Medida | Autor | Três revisores |
|---|---|---|
| 13: 1º → 2º turno | 53.879.538 → 64.256.232 (+10.376.694) | igual nos três |
| 22: 1º → 2º turno | 56.104.503 → 59.826.041 (+3.721.538) | igual nos três |
| Eliminados (com os 5.246 votos do 28) | 9.321.993 | igual |
| Brancos + nulos | 5.969.801 → 4.153.801 (−1.816.000) | igual |
| Comparecimento | 125.275.835 → 128.236.074 (+2.960.239) | igual |
| Disponível líquido / parte do 13 | 14.098.232 / 73,6% | igual; ΔL + ΔF = disponível fecha |
| UFs em que o 22 perdeu votos | AC, AP, RR, MA, AM, TO | mesmas 6, mesmos números |
| Municípios em que o 22 / o 13 perdeu votos | 950 / 89 | 950 / 89 |
| Aptos no país | idênticos | 158.745.502 nos dois turnos |

Conferências de fonte:
- O `detalhe_votacao_secao` é igual ao `votacao_secao` em nominais, brancos e nulos, por UF e nos dois turnos. Nominais + brancos + nulos = comparecimento.
- O `munzona` é igual ao `votacao_secao` em todos os candidatos, menos o 28. Os 5.246 votos do 28 estão nos BUs, no `votacao_secao` e no `detalhe`, mas não no `munzona`. O `consulta_cand` tem dois registros 28 do PRTB, o que indica substituição de candidatura. O autor somou esses votos aos eliminados, o que está correto. Se fossem nulos, o disponível total seria o mesmo.
- Nenhuma seção existe em um turno só (499.248 nos dois). Voto em trânsito, datas de geração diferentes (munzona de 28/10, os outros de 26/10) e a eleição usada no comparecimento (6257/6258) foram conferidos pela lente de definições e não mudam nada.
- **Caso no arquivo bruto.** O `bu.dat` da seção AP 06009/0001/0042 (Pracuúba) foi decodificado nos dois turnos: 1º turno com 294 aptos, 232 votantes, 13=100 e 22=110; 2º turno com 130 votantes, 13=78 e 22=52. Bate com a saída do autor. O banco confirmou outro caso, AC 1040/4/223: mesma urna e 270 aptos nos dois turnos; comparecimento caiu de 232 para 127 e o 22 de 167 para 74.

### Conferência própria dos pontos em disputa

Script `cetico-h10-consolidacao.mjs`, rodado às 07h de 29/10 com o banco em somente leitura.

**1. BU × oficial no 1º turno.** As lentes divergiam porque rodaram em momentos diferentes da carga: 18, 19 e 22 UFs. Agora o banco tem 25 UFs no 1º turno. **Fato:** nas 25 UFs, 389.857 seções têm o BU igual ao `votacao_secao` em todos os números (candidatos, 95 e 96). São 0 diferentes, 0 só no BU, 0 só no oficial e 97.536.881 votos, cerca de 78% do comparecimento do 1º turno. Isso inclui 5 das 6 UFs do achado (AC, AP, RR, MA e AM). **Faltam SP, TO e o exterior.** No 2º turno a igualdade vale nas 28 unidades (27 UFs + exterior).

**2. A perda do 22 nas 6 UFs, seção a seção.** Nas seções em que o comparecimento caiu, a perda esperada do 22 é a fatia dele no 1º turno × a queda, sem nenhum ganho dos eliminados. A "perda além da queda" é a soma, seção a seção, do que o 22 perdeu acima disso.

| UF | Saldo do 22 | Perda esperada pela queda | Perda além da queda (seções) | Perda do 22 em seções sem queda (seções) | Mesma perda para o 13 | Leitura |
|---|---|---|---|---|---|---|
| AC | −15.092 | 21.697 | 3.037 (721) | 148 (23 de 188) | 98 | queda explica |
| AP | −13.604 | 19.894 | 2.058 (555) | 0 (0 de 15) | 0 | queda explica |
| RR | −11.647 | 16.906 | 1.462 (356) | 59 (18 de 75) | 3 | queda explica |
| MA | −9.069 | 20.011 | **29.315** (8.263) | **10.652** (3.023 de 8.284) | 63 | **não explica** |
| AM | −1.519 | 21.222 | **13.112** (2.982) | **2.841** (644 de 2.878) | 136 | **não explica** |
| TO | −1.405 | 7.795 | **6.395** (1.729) | **1.778** (490 de 1.738) | 111 | **não explica** |

A lente de reprodução tinha razão em dizer que "no agregado" a queda cobre a perda em MA e AM: a perda esperada (20.011 e 21.222) passa do saldo. Isso, porém, é efeito de somar ganhos e perdas. Em MA, quase metade das seções (8.284 de 18.093) não teve queda de comparecimento, e mesmo nelas o 22 perdeu 10.652 votos. Uma perda numa seção onde o comparecimento subiu só fecha com troca de voto ou troca de eleitor. As lentes de reprodução e de alternativas chegaram, cada uma por um caminho, à mesma conclusão sobre MA, AM e TO. Meus números reproduzem os delas (AC 3.037, AP 2.058, RR 1.462, MA 29.315, AM 13.112; 10.652, 2.841 e 1.778 nas seções sem queda).

**3. A inclinação "queda maior nas seções pró-13".** Δ(comparecimento ÷ aptos) contra a fatia do 22 no 1º turno:

| UF | Do autor (ponderada por aptos, fatia no confronto 13 × 22) | Lente de reprodução (mesma especificação, IC 95% por bootstrap) | Minha (sem peso, fatia no comparecimento; ± erro-padrão) |
|---|---|---|---|
| AP | +0,19 | 0,19 [0,16; 0,22] | 0,189 ± 0,013 |
| AC | +0,065 | 0,064 [0,036; 0,094] | **0,007 ± 0,012** |
| RR | +0,026 | 0,026 [0,001; 0,052] | **0,006 ± 0,010** |
| AM | — | 0,061 | 0,069 ± 0,003 |
| MA | — | 0,023 | 0,025 ± 0,002 |
| TO | — | — | 0,016 ± 0,003 |

**Fato:** a inclinação é robusta em AP, AM, MA e TO. Em AC e RR ela depende da especificação: some quando as seções não são ponderadas por aptos. Em nenhuma especificação nem UF ela é negativa. Por isso a previsão "eleitores do 22 impedidos de votar" (queda maior nas seções pró-22) continua sem apoio. Mesmo assim, a frase do autor "a queda foi maior nas seções pró-13" deve sair para AC e RR.

## Problemas encontrados

1. **O teste não tem poder: risco de absolvição falsa (as três lentes).** Com o disponível líquido, ΔL + ΔF = disponível por construção. "Não cabe" é só "o outro perdeu votos". A lente de alternativas simulou:
   - uma troca uniforme 22→13 só acusaria no nacional acima de 3,72 milhões de votos (6,22% dos votos do 22);
   - a troca que viraria o resultado (2,215 milhões, 3,7%) passaria sem alarme no nacional. Ela acenderia 13 UFs em vez de 6 e 1.940 municípios em vez de 950;
   - a linha de base de municípios em que o outro finalista perde votos vai de 138 (2018) a 997 (2022), o que impede calibrar um limiar;
   - pelo limite bruto (com a abstenção) a folga nacional é de 38,4 milhões de votos, e o poder é praticamente nulo.

   Votos inseridos junto com comparecimento inflado "cabem" por definição. Isso só se testa com biometria e logs (E2, hoje em 12 UFs).
2. **Explicação benigna generalizada além dos dados.** O autor mostrou a regressão só para AC, RR e AP, mas escreveu a explicação para as 6 UFs. Em MA, AM e TO ela não vale (tabela acima). A soma por município (323 municípios, 24.455 votos de troca obrigatória) esconde isso, porque compensa perdas e ganhos dentro do município. Os critérios de `politico-limites-municipios.mjs` ("a queda de comparecimento cobre" = −Δcomp ≥ perda do 22) não olham a composição local.
3. **O "troca 22→13 ≈ 0" dado como Fato não é robusto (Hipótese, uma lente).** Na regressão do próprio autor (ΔF/comp1 em função de 1, Δcomp, eliminados e brancos/nulos), o intercepto do 22 é negativo e o do 13 é positivo em várias UFs. Isso implica uma perda líquida do 22 independente de Δcomp: MA −6,0%, RN −8,2%, RJ −5,2% e AM −4,1% dos votos do 22 no 1º turno. Isso é inferência ecológica (deduzir comportamento do eleitor a partir de totais por seção) e depende do modelo, porque o intercepto extrapola para seções sem eliminados. Ainda assim, aponta na mesma direção das perdas determinísticas em seções sem queda em MA, AM e TO. A frase de hipoteses.md "troca 22→13 ≈ 0 em todas as UFs" vem da sessão −64 (`transferencia-votos.mjs`) e precisa ser revista. Não editei o documento.
4. **"Aptos idênticos" vale só para o total do país.** 55.722 de 499.248 seções mudam de aptos, somando 74.692 em valor absoluto, por transferência temporária e voto em trânsito. Por UF a diferença vai até +699 (SP) e +675 (DF). O efeito medido é pequeno: no máximo 762 dos 133.924 votos que o 22 perdeu nos municípios (0,57%). Não há eleitor novo.
5. **Duas definições de "disponível".** A H10 usa o fluxo bruto (com a abstenção do 1º turno); o autor usa o saldo líquido. A redefinição está declarada, mas o resumo ("só excede o disponível em 6 UFs") dá a impressão de que essas UFs confirmam a H10. Pela definição da H10, nenhuma UF e nenhum município confirma: a menor folga é de 1 voto, num município do exterior com 1 apto.
6. **Os 73,6% são uma razão entre saldos, não entre eleitores.** O saldo esconde 33,5 milhões de abstenções no 1º turno contra +2,96 milhões no saldo. A frase não deve ser lida como "73,6% dos eleitores livres escolheram o 13".
7. **Defeito de ferramenta.** `src/exportar.js` não lê o 1º turno: as pastas não têm `aux.json` e a saída vem com `pacotes=[]`. A conferência no arquivo bruto teve de decodificar o `bu.dat` direto (`cetico-h10-bu-bruto.mjs`). O documento do autor não cita nenhum caso conferido no arquivo bruto.
8. **Menores.**
   - No exterior há 41 seções não instaladas por turno (origem "Totalização") com 423 aptos sem comparecimento nem abstenção. Afeta só o limite que usa a abstenção, e em 423 votos.
   - A queda de comparecimento do MA é −0,63 p.p., não −0,7.
   - O comando do autor usa `--max-old-space-size=8192`. Ninguém reexecutou o script dele; os números foram reproduzidos com scripts próprios limitados a 4 GB.

## Explicações alternativas

| Explicação | Situação | Resultado |
|---|---|---|
| Bug de junção ou de fonte (munzona × detalhe × votacao_secao, seções agregadas, RED, Sistema de Apuração, exterior, duplicação) | **Testada** | Descartada. As fontes fecham entre si (exceto o 28), o BU é igual ao oficial e nenhuma seção existe de um lado só |
| Eleitores novos entre os turnos | **Testada** | Descartada: aptos idênticos no país, mesmas seções; variação local ≤ 0,57% da perda do 22 |
| Candidato 28 mal classificado | **Testada** | Efeito zero no disponível total |
| Abstenção diferencial proporcional à composição local | **Testada** | Compatível em AC, AP e RR. **Não explica** MA, AM e TO |
| Troca líquida de voto 22→13 (persuasão, dinâmica local, 2º turno estadual) | **Testada só por modelo** | Intercepto da regressão indica −4% a −8% do 22 em MA, AM, RJ, RN e outras (Hipótese). Perdas em seções sem queda dão um piso determinístico em MA, AM e TO |
| Rotatividade de eleitores (pessoas diferentes votando em cada turno) | **Não testável** com arquivo público | O voto não identifica o eleitor. Os logs (habilitação por seção) poderiam dar um indício |
| Eleitores do 22 impedidos de votar (princípio 8) | **Testada** | Não se confirma: inclinação nunca negativa. Poder contra supressão dirigida dentro de seções mistas não avaliado |
| Votos inseridos pela liberação sem biometria (princípio 8) | **Testada pelo autor em 12 UFs** | Sem assinatura a favor de um lado nas 12 UFs. Fora do teste: RR, TO, PA, SP e o Sul/Sudeste restantes |
| Troca 22→13 maliciosa na totalização | **Testada** | Afastada nesse trecho: BU = oficial no 2º turno inteiro e no 1º turno de 25 UFs. Dentro da urna a troca não aparece nesta igualdade |
| Votos inseridos com comparecimento inflado, coerentes no BU | **Não testada** (o balanço não tem poder) | Depende de biometria e logs |
| 1º turno do 22 inflado no Norte, criando "perda" no 2º | **Não testada** | A igualdade BU = oficial cobre só a totalização, não o que ocorre dentro da urna |
| Transporte fluvial, estiagem, transporte de eleitores por candidatos locais no 1º turno | **Só suposta** | Comportamento humano sem rastro no arquivo: é risco (princípio 8), não explicação. A queda no interior de AC, AP e RR se repete em 2018 e 2022, o que é compatível com causa estrutural |

## Poder do teste

- **Hipótese nula da H10:** o ganho de cada finalista cabe no disponível. **Fato:** cabe no país e em todos os municípios pelo disponível bruto; no líquido, só não cabe onde o outro finalista perdeu votos.
- **Detecta:** só uma troca 22→13 acima de cerca de 6% dos votos do 22, uniforme no país. Ou um ganho que exceda até o disponível bruto, o que exigiria votos acima dos aptos.
- **Não detecta:** uma troca que viraria o resultado (3,7%), voto inserido com comparecimento coerente, ou troca concentrada em seções pró-22 (que acenderia 10 UFs e 2.304 municípios, sem linha de base que diga se isso é anormal).
- **Leitura correta:** o achado derruba a H10 como foi escrita. Ele **não** é evidência de que não houve inserção nem troca de votos. Concluir "a conta fecha, então está tudo certo" seria absolvição falsa.

## Pendências

1. **BU × oficial no 1º turno de SP, TO e exterior.** TO é uma das 6 UFs do achado. Rodar de novo `cetico-h10-consolidacao.mjs` quando a carga terminar.
2. **MA, AM e TO.** Separar troca líquida de rotatividade:
   - cruzar, por seção, a perda do 22 com a variação das habilitações no log (biometria × sem biometria), quando o 1º turno de TO estiver no banco;
   - procurar concentração por zona, local e município (troca dispersa sugere persuasão; troca concentrada em poucas seções é um caso para a frente de integridade).
3. **Rever "troca 22→13 ≈ 0"** na regressão da sessão −64. Reportar o intercepto e testar a robustez com outra especificação (por exemplo, só seções sem queda de comparecimento).
4. **E2 (biometria) nas UFs que faltam** (RR, TO, PA, RJ, RN, RO, RS, SC, SE e, quando entrar, SP). Esse é o único teste com poder contra comparecimento inflado.
5. **Candidato 28:** confirmar no leiame do `munzona` por que o candidato não aparece (substituição de candidatura, dois registros no `consulta_cand`).
6. **Defeito de `src/exportar.js` no 1º turno** (sem `aux.json`). Fica para o dono do código; não editei.
7. Linha de base 2018/2022 de municípios e UFs em que o outro finalista perde votos, para calibrar o poder por UF (o `detalhe_votacao_munzona` 2018/2022 depende de rede).

## Comandos que reproduzem a revisão

```bash
# consolidação (este parecer): BU × oficial no 1º turno das UFs carregadas; perda do 22 seção a seção nas 6 UFs; inclinação
node --max-old-space-size=4096 scripts/auditoria/cetico-h10-consolidacao.mjs   # ~5 min; saída data/parsed/auditoria/cetico/h10-consolidacao.json

# lente de reprodução
node --max-old-space-size=4096 scripts/auditoria/cetico-h10-reproducao.mjs      # balanço, fontes, BU × oficial; h10-reproducao.json
node scripts/auditoria/cetico-h10-abstencao.mjs ac,ap,rr,am,ma                  # atrito proporcional por seção e inclinação com bootstrap
node scripts/auditoria/cetico-h10-aptos.mjs                                     # aptos sem comparecimento nem abstenção (exterior)
node scripts/auditoria/cetico-h10-bu-bruto.mjs ap 06009 0001 0042              # bu.dat bruto nos dois turnos

# lente de definições
node scripts/auditoria/cetico-h10-dados.mjs                                     # h10-dados.json

# lente de alternativas
node --max-old-space-size=4096 scripts/auditoria/cetico-h10-crescimento-cabe-no-disponivel-alternativas.mjs   # poder, troca, perda sem queda
node scripts/auditoria/cetico-h10-crescimento-cabe-no-disponivel-base2018-2022.mjs                            # linha de base

# conferência no banco (somente leitura)
node scripts/sql.mjs "select turno, uf from carga order by turno, uf"
```

Saídas em `data/parsed/auditoria/cetico/`: `h10-consolidacao.json`, `h10-reproducao.json`, `h10-abstencao.json`, `h10-dados.json`, `h10-alternativas.json`, `h10-base2018-2022.json`, `h10-aptos-sem-comparecimento.json` e `h10-bu-bruto-ap-06009-0001-0042.txt`.
