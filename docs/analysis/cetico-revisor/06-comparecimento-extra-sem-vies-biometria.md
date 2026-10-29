# 06. Parecer: comparecimento a mais sem viés pela habilitação sem biometria

Achado revisado: E2 de [cientista-politico/01-balanco-turnos.md](../cientista-politico/01-balanco-turnos.md) (script `scripts/auditoria/politico-biometria-crescimento.mjs`).
Revisão: lente de reprodução (um revisor) e consolidação (este parecer). Data: 29/10/2026. O 1º turno ainda está sendo carregado no banco: na consolidação havia 25 UFs (faltam SP, TO e exterior).

## Afirmação original

> O comparecimento a mais do 1º para o 2º turno se dividiu igualmente entre habilitados por biometria e sem biometria (coeficientes 0,577 e 0,571 para o 13; 0,385 e 0,390 para o 22; diferença ≤ 0,033 por UF), em 12 UFs com 1º turno carregado (188 mil seções): não há sinal agregado de votos inseridos via liberação sem biometria a favor de um lado.

## Veredito: sustentado com ressalvas

Os números se reproduzem exatamente e a conclusão vale nas 25 UFs carregadas agora, inclusive no RS, que o autor apontou como a UF onde o teste mais importa. Ressalvas:

1. O modelo do autor, que junta todas as seções sem efeito fixo de UF, é frágil. Nas 25 UFs ele dá t = 3,4 a favor do 13, e esse sinal é falso: some quando se controla a UF.
2. O texto não traz erro-padrão. O critério "≤ 0,033 por UF" não é um teste.
3. O teste não enxerga três formas de inserção: a uniforme numa UF inteira, a difusa pequena e a que tem o mesmo nível nos dois turnos. O texto não declara esses pontos cegos.

## Afirmação revisada (alcance que os dados sustentam)

> **Fato.** Nas 25 UFs com o 1º turno carregado (389.827 seções pareadas), comparando seções da mesma UF (efeito fixo de UF), cada eleitor a mais habilitado sem biometria se dividiu entre 13 e 22 como cada eleitor a mais habilitado por biometria. Aqui, "sem biometria" junta quem não tem biometria cadastrada e quem foi liberado pelo ano de nascimento. A diferença entre os coeficientes (sem biometria − por biometria) é +0,002 ± 0,002 para o 13 e −0,001 ± 0,002 para o 22. Com efeito fixo de município, é −0,002 e +0,001. Nas 12 UFs originais: 0,577 × 0,571 (diferença −0,006 ± 0,006) e 0,385 × 0,390 (+0,005 ± 0,006). A liberação por ano de nascimento, analisada sozinha, também não difere: d = +0,001 com efeito fixo de UF (22 UFs).
>
> **Alcance.** O teste exclui inserção pela brecha que varie entre seções da mesma UF a partir de cerca de 34 mil votos concentrados, por exemplo 40 votos em 0,25% das seções ou 10 votos em 1% delas. Ele **não** exclui:
> - inserção uniforme ou proporcional em todas as seções de uma UF (até cerca de 355 mil votos na BA passam sem sinal);
> - inserção difusa pequena (5 votos em 5% das seções mais favoráveis ao 13: t = 2,5);
> - fraude de mesmo nível nos dois turnos, que se cancela na diferença;
> - uso local da brecha em poucas seções.
>
> **Exceção local.** No PR, d = +0,025 (t = 4,2) a favor do 13; com efeito fixo de município, +0,012 (t = 2,8). O efeito é pequeno em votos, e a parcela sem biometria do PR caiu de 8,15% para 7,68%. É Hipótese a examinar, não Fato de inserção.

## O que foi reproduzido (Fato)

| Conjunto | Seções | Modelo | 13: por biometria × sem biometria (d ± EP, t) | 22: d (t) |
|---|---:|---|---|---|
| 12 UFs do autor | 188.425 | autor (sem efeito fixo) | 0,577 × 0,571 (−0,006 ± 0,006, −0,99) | +0,005 (0,81) |
| 12 UFs do autor | 188.425 | efeito fixo de UF | 0,628 × 0,620 (−0,008 ± 0,003, **−2,29**) | +0,007 (2,20) |
| 12 UFs do autor | 188.425 | efeito fixo de município | 0,610 × 0,606 (−0,004 ± 0,002, −1,93) | +0,003 (1,52) |
| 10 UFs novas do revisor | 150.611 | autor | 0,533 × 0,585 (+0,052 ± 0,008, **6,4**) | −0,057 (−7,1) |
| 10 UFs novas | 150.611 | efeito fixo de UF | +0,012 ± 0,004, **3,1** | −0,010 (−2,25) |
| 10 UFs novas sem PR | 123.469 | efeito fixo de UF | +0,004 ± 0,004, 1,21 | −0,004 (−0,94) |
| 22 UFs (revisor) | 339.036 | autor | 0,556 × 0,576 (+0,020 ± 0,005, **3,7**) | −0,022 (−4,16) |
| 22 UFs | 339.036 | efeito fixo de UF | +0,001 ± 0,003, 0,4 | 0,000 (−0,08) |
| 25 UFs (agora) | 389.827 | autor | 0,550 × 0,566 (+0,016 ± 0,005, **3,4**) | −0,017 (−3,62) |
| 25 UFs | 389.827 | efeito fixo de UF | +0,002 ± 0,002, 0,66 | −0,001 (−0,34) |
| 25 UFs | 389.827 | efeito fixo de município | −0,002 ± 0,001, −1,13 | +0,001 (0,55) |
| 25 UFs sem PR | 362.685 | autor | +0,002 ± 0,004, 0,44 | −0,002 (−0,56) |
| só RS | 27.544 | por UF | 0,613 × 0,618 (+0,005 ± 0,010, 0,52) | −0,005 (−0,51) |
| só SC | 17.324 | por UF | +0,010 ± 0,009, 1,19 (efeito fixo de município: −0,013, −2,23) | −0,009 (−1,16) |
| só SE | 5.923 | por UF | −0,005 ± 0,012, −0,45 | −0,004 (−0,42) |
| só PR | 27.142 | por UF | 0,500 × 0,525 (+0,025 ± 0,006, **4,19**); efeito fixo de município: +0,012, 2,76 | −0,018 (−3,28) |
| só MG | 52.056 | por UF | −0,011 ± 0,005, −2,02 | **+0,019 (3,69)**; efeito fixo de município: +0,008 (2,02) |

EP = erro-padrão agrupado por município. d = coeficiente sem biometria − coeficiente por biometria. Peso = comparecimento no 1º turno. Seções com menos de 20 votantes no 1º turno ficam de fora.

- **Invariantes (revisor, 22 UFs).** Votos de presidente = comparecimento em todas as seções, exceto 2 de MG no 1º turno (Sistema de Apuração, comparecimento 0, saem pelo filtro c1 < 20). Sem biometria + por biometria + por biografia = comparecimento em 100% das seções. Todas as seções do 1º turno têm par no 2º.
- **Caso bruto conferido de novo nesta consolidação** (BU .dat dos dois turnos, CE 14397/0010/0006):

  | Turno | Sem biometria | Por biometria | Por biografia | Comparecimento | 13 | 22 | 14 | Branco | Nulo |
  |---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
  | 1º | 5 | 116 | 60 | 181 | 160 | 13 | 1 | 1 | 6 |
  | 2º | 4 | 16 | 167 | 187 | 169 | 13 | – | – | 5 |

  Bate com o banco.
- **Nível da parcela sem biometria por UF** (1º → 2º turno): RJ 14,12% → 14,67%, MG 17,89% → 18,32%, RS 16,14% → 16,57%, PE 13,92% → 14,33%, BA 12,01% → 12,26%, PR 8,15% → 7,68%, AC 8,65% → 8,37%. Nas 25 UFs, a parcela sem biometria cresceu em 485.259 pessoas, para um aumento de comparecimento de 1.998.516.

## Problemas encontrados

1. **A especificação manda no resultado (alarme falso e absolvição falsa).** O modelo do autor junta seções de UFs diferentes com uma só constante. A diferença de nível entre UFs (quanto o 13 cresceu e quanto a parcela sem biometria mudou em cada uma) entra nas inclinações. Com 12 UFs ele deu quase zero. Com 22 e com 25 UFs, o mesmo modelo dá t = 3,7 e 3,4 "a favor do 13", e o sinal some com efeito fixo de UF ou de município. O quase-zero das 12 UFs não validava o modelo: foi coincidência de composição. **O modelo a usar é o de efeito fixo de UF ou de município.**
2. **Com efeito fixo, o "igualmente" das 12 UFs fica no limite.** Nas 12 UFs do autor, com efeito fixo de UF, d = −0,008 (t = −2,29) para o 13 e +0,007 (t = 2,2) para o 22: quem foi habilitado sem biometria pesou um pouco **menos** para o 13. O efeito é pequeno, não sobrevive à correção por múltiplas comparações e cai para t = −1,93 com efeito fixo de município. Mesmo assim, o texto do autor não deveria ter apresentado esse resultado como igualdade sem dar o erro-padrão.
3. **Sem erro-padrão.** O critério "diferença ≤ 0,033 por UF" não é teste. O EP agrupado por município vai de 0,004–0,006 (BA, MG, PR, RJ) a 0,024–0,055 (RR, AP, AC). No AC, uma diferença de ±0,1 passaria. No DF, que tem um só município, o EP agrupado não existe.
4. **A ressalva das UFs novas.** O revisor escreveu que o sinal "some com efeito fixo de UF", e isso vale para o conjunto de 22 UFs. Mas, só nas 10 UFs novas, o efeito fixo de UF ainda dava d = +0,012 (t = 3,1). A consolidação mostra que **isso vem do PR**: sem o PR, t = 1,21. No conjunto das 22 UFs, esse sinal das novas se cancelava com o sinal oposto das 12 do autor (−0,008). O nulo agregado com efeito fixo é real, mas é soma de partes com sinais opostos. Por isso a leitura por UF continua obrigatória.
5. **Pontos cegos não declarados pelo autor:**
   - inserção uniforme ou proporcional numa UF inteira cai na constante ou no efeito fixo. Na simulação do revisor, 5 ou 10 votos por seção em toda a BA (177 mil e 355 mil votos), ou 3% do comparecimento (272 mil), deixam t ≤ 0,7;
   - fraude de mesmo nível nos dois turnos se cancela na diferença entre turnos;
   - o texto diz "não há sinal agregado" sem dizer que esse teste não veria esses dois casos.
6. **Duas brechas juntas numa variável só.** O autor somou "sem biometria cadastrada" e "liberado por ano de nascimento". Separadas e sem efeito fixo, a liberação por ano de nascimento dá d = +0,024 (t = 5,7). Com efeito fixo de UF, +0,001 (t = 0,24). É mais um caso em que a especificação, e não os dados, produz o sinal.
7. **Filtro silencioso** (efeito desprezível): 2 seções de MG do Sistema de Apuração saem pelo filtro c1 < 20 sem aviso. Excluir está certo; faltou declarar.
8. **Não revisado:** a afirmação do autor sobre "902 seções com 20 ou mais habilitações sem biometria a mais (13 com 75,3% do ganho)" não foi reproduzida por nenhum revisor.
9. **Fora do foco, mas registrado:** ao exportar o 2º turno da CE 14397/0010/0006 (urna ue2013), a verificação de lacre falha com "DER: comprimento ausente". É o mesmo erro já anotado em forense-estatistica/02 para a CE 15989/0055/0160. O `src/exportar.js` não abre o 1º turno, que veio dos dados abertos sem aux.json.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| O sinal nas 22 e 25 UFs com o modelo do autor (t = 3,7 e 3,4 a favor do 13) é efeito de composição entre UFs, não inserção | **Testada** | Confirmado. Some com efeito fixo de UF (+0,002, t = 0,66) e de município (−0,002). Sem o PR, até o modelo do autor dá +0,002 (t = 0,44). |
| O sinal das UFs novas com efeito fixo de UF (t = 3,1) é generalizado | **Testada** | Não. Vem do PR; sem ele, t = 1,21. |
| O sinal do PR (13) e o de MG (22) são inserção local | **Testada em parte** | Hipótese fraca. Os sinais vão em direções opostas. São cerca de 50 testes por UF (25 UFs × 2 finalistas); com Bonferroni o limiar é \|t\| > 3,3. Com efeito fixo de município, os dois caem abaixo do limiar (PR 2,76; MG 2,02). No PR, a parcela sem biometria **caiu** (−15.377 pessoas, 8,15% → 7,68%), o que não combina com inserção pela liberação. Pelo revisor, o efeito é de cerca de 3 mil votos no PR e 5 mil em MG (estimativa dele, não refeita aqui). |
| Juntar as duas brechas diluiria o efeito da liberação por ano de nascimento | **Testada** | Não diluiu. Com efeito fixo de UF ou de município, a liberação por ano de nascimento dá d = +0,001 / −0,001. |
| O RS, onde o aumento de comparecimento puxou mais para o 13, esconderia o sinal | **Testada** (nesta consolidação) | Não há sinal: d = +0,005 ± 0,010 (t = 0,52); com efeito fixo de município, −0,005. |
| O teste sem achado não tinha poder | **Testada** (simulação do revisor) | Tinha poder só para inserção concentrada que varie dentro da UF (ver "Poder do teste"). |
| Fraude de mesmo nível nos dois turnos | Só suposta | Não dá para testar com a diferença entre turnos. Exige o nível em cada turno: frente de biometria e logs. |
| Inserção uniforme numa UF, limitada pela variação do nível da parcela sem biometria | Só suposta | Serve como teto descritivo. A parcela sem biometria cresceu 485.259 pessoas para 1.998.516 a mais no comparecimento, ou seja, 24% do eleitor a mais, contra cerca de 13% no total. Sem uma linha de base (por exemplo, 2022, do 1º para o 2º turno), não se sabe se essa proporção é normal. É Hipótese, nem a favor nem contra. |

Nenhuma explicação benigna apresentada depende de procedimento humano (princípio 8). A liberação por ano de nascimento é uma brecha humana e continua registrada como **risco**. Este teste só mostra que, no agregado e dentro de cada UF, essa brecha não puxou o voto para um lado. Ele não mostra que a brecha não foi usada.

## Poder do teste

Simulação do revisor sobre os dados reais de 22 UFs (339.036 seções, efeito fixo de UF, EP de cerca de 0,003). Os votos falsos são inseridos como "sem biometria", todos para o 13:

| Cenário | Votos inseridos | % do ganho do 13 | t |
|---|---:|---:|---:|
| 40 votos em 0,25% das seções (aleatórias) | 33.920 | 0,5% | 11,0 |
| 10 votos em 1% (redutos do 13) | 33.900 | 0,5% | 3,1 |
| 5 votos em 5% (aleatórias) | 84.760 | 1,3% | 4,5 |
| **5 votos em 5% (redutos do 13)** | **84.760** | **1,3%** | **2,5 (não detecta)** |
| 3 votos em 20% (redutos) | 203.421 | 3,0% | 3,5 |
| **5 votos em toda seção da BA** | **177.375** | 2,6% | **−0,04 (não detecta)** |
| **10 votos em toda seção da BA** | **354.750** | 5,3% | **0,68 (não detecta)** |
| **3% do comparecimento em toda a BA** | **271.776** | 4,0% | **0,42 (não detecta)** |

O teste pega inserção concentrada de cerca de 34 mil votos ou mais quando ela varia entre seções da mesma UF. Ele é cego à inserção espalhada por igual numa UF e à inserção que se repete no mesmo nível nos dois turnos. Uma absolvição baseada só neste teste seria falsa para esses casos.

## Pendências

1. Rodar de novo quando SP, TO e o exterior estiverem carregados no 1º turno. SP sozinho tem 103.656 seções.
2. O autor deve trocar o modelo agrupado sem efeito fixo pelo de efeito fixo de UF ou de município e trazer o erro-padrão agrupado. Sem isso, o mesmo script dá alarme falso (t = 3,4) com as 25 UFs.
3. O texto do autor deve declarar os pontos cegos: inserção uniforme numa UF e fraude de mesmo nível nos dois turnos.
4. PR: olhar no log quais seções puxam d = +0,025, com a distribuição de ΔnãoBio por seção e por município. Frente de biometria.
5. Uma linha de base para a variação natural da parcela sem biometria entre turnos, por exemplo 2022 do 1º para o 2º turno. O eleitor a mais foi 24% sem biometria, contra cerca de 13% no total.
6. Reproduzir a afirmação das "902 seções com 20 ou mais habilitações sem biometria a mais".
7. Casos como o da CE 14397/0010/0006 (habilitação por biometria caiu de 116 para 16 e por ano de nascimento subiu de 60 para 167, 89% do comparecimento) passam despercebidos neste teste, porque a divisão do voto não mudou. Pelo princípio 8, são **risco** a examinar no log da urna: horário das liberações, falha do leitor, mesário. Frente de biometria.
8. Erro de lacre "DER: comprimento ausente" no 2º turno da CE 14397/0010/0006 (ue2013): encaminhar à frente de integridade.

## Comandos que reproduzem a revisão

```sh
node scripts/auditoria/politico-biometria-crescimento.mjs        # autor (~90 s)
node scripts/auditoria/cetico-e2bio-reproducao.mjs               # revisor: reprodução, invariantes, efeitos fixos, poder
                                                                 #   saída data/parsed/auditoria/cetico/e2bio-reproducao.json
node scripts/auditoria/cetico-e2bio-bu-bruto.mjs ce 14397 0010 0006   # caso bruto, BU .dat dos dois turnos
node scripts/auditoria/cetico-e2bio-consolidacao.mjs             # consolidação (~3 min): subconjuntos, PR, RS/SC/SE, nível por UF
                                                                 #   saída data/parsed/auditoria/cetico/e2bio-consolidacao.json
```

Banco somente leitura. A consolidação leu o primário em modo só leitura, porque não havia cópia de leitura publicada quando rodou, e usou as UFs que estavam na tabela `carga` naquele momento (25 no 1º turno). Os números mudam quando entrarem mais UFs.
