# 46. H13: o sinal V2 fora do Nordeste (doc 19)

Parecer do revisor cético, 30/10/2026. Revisa:

- [estatistico-eleitoral/19](../estatistico-eleitoral/19-h13-v2-composicao.md), com o adendo de 30/10 ao [plano 16](../estatistico-eleitoral/16-h13-log-plano.md) e `estatistico-h13-v2-{perfil,horario,analise,bruto}.mjs`;
- o próprio sinal: onde mais eleitores liberados pelo ano de nascimento (V2, sem digital na urna) votaram no 2º turno do que no 1º, o 13 cresceu mais.

O [parecer 42](42-h08-h13-log.md) já tratou do sinal pelo lado mecânico: terceiros candidatos, regressão à média, troca de urna, cadastro e a forma de medir a exposição. Este parecer **não refaz** essas contas. Ele cobre três frentes:

1. o que o doc 19 traz de novo: idade, horário, sequência, concentração e as 20 seções no bruto;
2. as explicações políticas no Sul, em MG e no RS;
3. se o sinal pode entrar na perícia, e com que texto.

**Caminho próprio.**

- **Motor de regressão escrito para este parecer** (`cetico-46-modelos.mjs`). Ele tira a média ponderada dentro do local, padroniza as colunas, escolhe as colunas por Cholesky incremental com tolerância relativa, resolve por Gauss-Jordan e calcula o erro robusto por local (CR1). Não usa o código do doc 19 nem o do parecer 42.
- **Dados montados de novo** (`cetico-46-dados.mjs`):
  - BU da cópia de leitura, inclusive `sem_biometria`, que é a V2 contada pela urna;
  - perfil do eleitorado relido dos zips do TSE, com idade, escolaridade, estado civil e gênero, no eleitorado inteiro e entre os sem biometria;
  - a leitura independente dos diários do parecer 42 (vias, votos por hora, V2 com foto);
  - do doc 19, só a última hora antes do encerramento e o V2 em sequência, para refazer B1 e B2.
- **Restrições respeitadas.** Nenhum CPF nem número de título foi lido ou gravado. `data/raw` não foi varrido com `find`. No máximo 2 processos pesados. Sem rede.

Tudo depois da reprodução é **exploratório**: foi decidido depois de ver os dados, e há muitas especificações (caminhos que se bifurcam). Os z servem para ordenar a força dos resultados. Não são testes confirmatórios.

## Vereditos

| Item | Veredito | Em uma linha |
|---|---|---|
| R. β de base e testes (a), (b), (d) | **Sustentado** | Reproduz até a 2ª casa. Também reproduz com a V2 tirada só do BU (6,445 contra 6,446). |
| (a) Idade | **Sustentado com ressalvas** | Os números batem. Mas "Fato: a idade não explica" é forte demais, e a leitura das interações com 70+ está invertida. A hipótese "jovens" cai. A de eleitores sem digital mais velhos fica de pé e não foi testada como tal. |
| (b) Horário e sequência | **Sustentado com ressalvas** | Pela última hora do relógio, o "prêmio" da última hora passa do corte (z 4,3). Mas ele vale para qualquer eleitor da última hora, não só para a V2: com esse controle, some (z 1,5). B2 reproduz. As 627 seções com rajada são seções de V2 alto, sem ganho do 13 sobre as vizinhas. |
| (c) As 20 seções no bruto | **Sustentado com ressalvas** | Conferi 3 seções no bruto: os números batem. Mas o critério de escolha (contribuição ao β) pega seções de grande oscilação do 13, não de V2 a mais. Esse teste tem pouco poder para achar inserção. |
| (d) Concentração | **Sustentado** | Reproduz: sem os 10 maiores municípios, β 5,67 (z 8,0); sem cada UF, entre 6,14 e 6,67. |
| Explicações políticas no Sul, MG e RS | **Nenhuma explica** | Mobilização por perfil, foto, perfil dos sem biometria, seção nova, transferência temporária e tamanho do município: o coeficiente fica no lugar. Migração e título recente vão no sentido **contrário** ao do sinal. |
| Magnitude | **Pequena diante da margem (Fato aritmético)** | Mesmo que todo V2 a mais do 2º turno (452.032, contado nas seções onde subiu) fosse voto falso no 13, o 13 manteria 3.978.159 votos de vantagem. |
| O sinal, no todo | **Sustentado com ressalvas** | Existe, é pequeno e difuso, e não tem as marcas de inserção pela mesa. Continua sem causa identificada. O nacional depende da medida (parecer 42); o que resiste é Sul, MG e RS. |

---

## R. Reprodução (Fato)

Amostra: 497.473 seções. Exclusões iguais às do doc: 326 sem perfil, 76 com menos de 20 votos em 13 + 22, 20 com diário diferente do BU e 2 sem a seção nos dois turnos.

| Unidade | Doc 19 | Revisor (vias do diário) | Revisor (V2 e V3 só do BU) |
|---|---|---|---|
| Fora do Nordeste | +6,45 (10,4) | +6,446 (10,38); 344.144 seções em 47.340 locais | +6,445 (10,38) |
| Sudeste | +6,32 (8,4) | +6,322 (8,41) | +6,321 (8,41) |
| Sul | +9,66 (6,0) | +9,658 (6,04) | +9,642 (6,03) |
| Nordeste | −0,17 (−0,2) | reproduz | reproduz |

Os outros resultados também saem iguais:

- **A1 e A2:** os 12 coeficientes de interação e os β com a interação. Exemplos fora do Nordeste: A2 70+ +8,87 (z 2,33); A2 jovens −0,25 (−0,08).
- **B1 e B2** do doc: fora do Nordeste, +1,92 (2,71) e −0,40 (−0,72).
- **D:** β pela decomposição Frisch-Waugh igual ao da regressão. Sem os 10 municípios do topo: 5,67 (8,01), Sudeste 5,14 (5,69), Sul 7,07 (3,76). Sem cada UF: de 6,14 (sem RS) a 6,67 (sem PA).

**A V2 tirada só do BU dá o mesmo β.** Isso mostra que o sinal não depende do leitor do diário: o `sem_biometria` do boletim de cada seção já o produz.

## (a) Idade: os números batem, a conclusão vai longe demais

- **"Fato: a idade do eleitorado não explica o sinal".** Isto não é um Fato. É a ausência de rejeição num teste de interação. O certo seria: "a hipótese dos jovens não tem apoio".
- **A leitura das interações com 70+ está invertida.** O doc diz que elas "apontam no sentido oposto ao da composição" porque os idosos dessas seções puxam para o 22. Mas a composição fala de **quem a mais** foi votar no 2º turno, não de como vota o grupo inteiro. Se os idosos sem digital que voltaram no 2º turno são, por exemplo, os mais pobres, eles podem pender para o 13 mesmo que os idosos em geral pendam para o 22. A interação positiva com 70+ é, então, compatível com composição.
- **Os testes novos apontam todos para o mesmo lado.** Exposição por eleitor do cadastro, comparecimento fixo; exploratório.
  - **Fora do Nordeste e no Sudeste:** o sinal é maior onde os sem biometria são menos solteiros (fora do Nordeste −20,2, z −4,7), mais mulheres (+22,7, z 3,6) e de escolaridade mais baixa (+15,8, z 3,8).
  - **Em todos os recortes:** o sinal é maior nas seções mais **antigas** do local (interação com a posição da seção no local: fora do Nordeste −12,5, z −3,9; MG −9,3, z −3,4).
  - **Leitura:** o sinal pesa mais onde os eleitores sem digital tendem a ser mais velhos, casados, mulheres e de menor escolaridade.
- **Ressalva:** no Sul, em MG e no RS, separados, nenhum desses traços passa de |z| 2,9, e o coeficiente da V2 não se move. A composição por idade e perfil é uma **Hipótese aberta**: não foi confirmada nem descartada.

**Pedido ao estatístico.** Na próxima versão:

- trocar o "Fato" por "a hipótese dos jovens não tem apoio";
- corrigir a leitura das interações com 70+;
- incluir um teste de composição por "sem digital mais velho, de baixa escolaridade", com plano registrado antes.

## (b) Horário e sequência

### B1 depende de como se define a última hora

O doc mede a "última hora" como a hora antes do `Inicio do Encerramento` de cada urna. Refiz a medida pelo relógio, usando a leitura independente do parecer 42:

- a última hora é a abertura mais 8 horas, ou seja, as 16 h de Brasília no fuso de cada urna;
- a abertura é a primeira hora com voto entre 5 h e 9 h.

| Fora do Nordeste | Última hora | Resto do dia | Diferença (z) |
|---|---|---|---|
| Doc (antes do encerramento) | 8,17 | 6,25 | +1,92 (2,71) |
| Revisor (relógio) | 8,58 | 6,13 | **+2,45 (4,27)** |
| Revisor (relógio) + Δ(parcela de **todos** os votos na última hora) | 7,18 | 6,28 | +0,91 (1,47) |

No Sudeste a mudança é a mesma: +2,79 (3,99) pelo relógio, que cai para +1,07 (1,40) com o controle.

- **Pelo relógio, o "prêmio" da última hora passa do corte de Bonferroni.** A conclusão "não está na última hora" dependia, portanto, da definição escolhida.
- **O teste placebo derruba o prêmio como marca da V2.** Qualquer eleitor a mais na última hora acompanha ganho do 13: o coeficiente da parcela de todos os votos na última hora é +0,76 (z 6,8).
- **Medido por eleitor**, comparei o prêmio da V2 com o prêmio dos outros eleitores na última hora (diferença em diferenças). O resultado é +0,47 (z 0,45) fora do Nordeste, +2,25 (1,0) no Sul, +0,50 (0,45) em MG e +2,82 (0,96) no RS.

**Leitura.** Os eleitores do fim do dia pendem um pouco mais para o 13, sejam V2 ou não. O ponto B1 que o doc deixou "a acompanhar" é isso. A conclusão do doc fica, mas por um motivo que ele não testou.

### Descritivo pelo relógio (Fato, leitura independente; fora do Nordeste, 356.795 seções)

| | 1º turno | 2º turno |
|---|---|---|
| Parcela dos V2 na última hora | 11,89% | 5,93% |
| Parcela de todos os votos na última hora | 10,03% | 5,08% |
| V2 nas 3 primeiras horas | 1.616.993 | 2.354.112 |

- A V2 já pesava um pouco mais no fim do dia no 1º turno. A razão entre as duas parcelas quase não muda: 1,19 no 1º turno e 1,17 no 2º.
- O V2 do 2º turno andou para a manhã, como o resto do eleitorado.

### B2 (sequência)

Reproduz: −0,40 (z −0,72) fora do Nordeste. Sem reparo.

### As 627 seções com 10 ou mais V2 em 10 minutos (teste novo, `cetico-46-rajada.mjs`)

O doc atribui essas 627 seções ao ritmo de um cargo, mas não confere isso. Conferi:

- a parcela média de V2 nelas, no 2º turno, é **57,5%**, contra 6,1% no resto de fora do Nordeste;
- 622 das 627 têm 30% ou mais de V2: são seções em que metade do eleitorado vota sem digital;
- comparadas com as outras seções do **mesmo local**, a variação do V2 é igual (diferença −0,0001) e o 13 cresceu **0,31 ponto a menos**.

Rajada, ali, é o que se espera de uma seção com metade dos eleitores sem digital e um só cargo. Não há ganho do 13 nessas seções.

## (c) As 20 seções no bruto

Conferi 3 seções com `src/exportar.js` e `cetico-46-caso.mjs`, que não imprime título:

| Seção | 1º → 2º turno | O que o bruto mostra |
|---|---|---|
| **RJ 58041/0152/0084** (Belford Roxo) | V2 20 → 27, igual ao `sem_biometria` do BU; 13 de 91 → 136; 22 de 147 → 137 | No 2º turno, V2 das 08:22 às 16:15, 2 na última hora, maior sequência 2, menor intervalo 60 s, 0 com foto, 0 pedido de digital |
| **ES 56332/0040/0007** | V2 93 → 105, metade dos votantes | Maior sequência 13 no 2º turno (7 no 1º); V2 em sequência 53 contra 51; menor intervalo 45 s |
| **MG 40339/0009/0031** | — | Menor intervalo de 30 s, como no doc |

- Nas duas seções em que procurei, a linha ERRO `Problema ao desmontar a MR` aparece às 07 h do 2º turno e não aparece no 1º. Isso confirma o doc.
- **O critério de escolha das 20 seções tem pouco poder.** A contribuição ao β é o produto entre a variação do V2 e a variação do 13, já sem o efeito do local. Ela escolhe seções em que o 13 oscilou muito, não seções com muito V2 a mais.
  - A primeira da lista (MG 53872/0273/0102) teve o V2 **caindo** (51 → 45) e o 13 caindo junto.
  - Na RJ 58041/0152/0084, o 13 ganhou 45 votos com só 7 V2 a mais. Mesmo que os 7 fossem falsos, explicariam cerca de 1 dos 11,6 pontos de ganho. O resto vem dos 31 votos que, no 1º turno, foram para outros candidatos, branco e nulo.
- O teste das 627 rajadas, acima, é mais forte que o das 20 seções.

**Fora do escopo, mas a registrar.** O `Problema ao desmontar a MR` aparece no 2º turno de todas as 20 seções e de nenhuma no 1º. A frequência no país não foi medida. Fica com o engenheiro de segurança (H05/H14).

## (d) Concentração

Reproduz exatamente (ver R). Concordo com o parecer 42: tirar quem mais contribui reduz o β de modo mecânico, então este é um teste conservador. Também concordo que a concentração por zona não tem referência nula.

**Uma frase do doc a tirar.** "Uma operação difusa em quase 3.800 municípios" usa o número de municípios **da amostra** (3.776), não o número de municípios onde o efeito está. É retórica, sem base em conta.

## Explicações políticas no Sul, em MG e no RS (exploratório)

**Medida.** A do parecer 42: votos de cada via por eleitor do cadastro, com a variação do comparecimento no modelo. Assim, o coeficiente da V2 mede só a parte **própria** da V2 (V2 menos digital). A partida reproduz o parecer 42:

| Unidade | Sul | MG | RS | SP | Sudeste | Fora do Nordeste |
|---|---|---|---|---|---|---|
| Parte própria da V2 | 8,39 (4,34) | 5,70 (4,21) | 9,66 (3,69) | 5,63 (3,58) | 2,70 (2,24) | 3,36 (2,30) |

### O que entrou e o que aconteceu com o coeficiente

| Variante | Pergunta política | Sul | MG | RS |
|---|---|---|---|---|
| Q1. Δcomparecimento × perfil da seção (sem biometria, escolaridade baixa, jovem, 60+, superior) | mobilização da periferia e dos menos engajados | 9,23 (4,5) | 5,29 (3,8) | 9,79 (3,6) |
| Q4. Δcomparecimento + controle de seção nova no local | título novo ou transferido (as seções novas recebem quem chegou depois) | 8,06 (4,2) | 6,21 (4,5) | 9,54 (3,6) |
| Q5. Sem nenhuma seção com eleitor em transferência temporária | trânsito, migração temporária | 9,03 (4,1) | 6,13 (3,8) | 9,50 (3,2) |
| Q7. Tudo junto (Q1 + seção nova + transferência temporária + perfil dos sem biometria) | — | 9,10 (4,4) | 5,21 (3,7) | 9,55 (3,5) |

### Interações e cortes

- **Seção nova (título recente, transferência).** A interação é **negativa**: Sul −10,3 (z −2,2), MG −9,3 (−3,4), RS −6,4 (−1,1). O sinal é maior nas seções antigas do local, e não nas que recebem quem chegou depois. Migração e título novo vão **contra** o sinal.
- **Adultos de 25 a 59 anos entre os sem biometria.** A interação também é negativa: Sul −18,2 (−1,9), RS −22,5 (−1,8). Esse é o grupo que mais tem transferência ou segunda via.
- **V2 com foto × sem foto.** O sinal está todo na V2 **sem foto**: Sul 8,74 (4,4), MG 7,21 (5,1), RS 9,59 (3,6).
  - A V2 com foto é pequena: 2.970, 2.625 e 963 votos a mais, contra 54.707, 97.184 e 34.305 sem foto.
  - Ela vai a zero ou fica negativa (fora do Nordeste −20,0, z −3,7).
  - O grupo "foto sem digital" da perícia (tópico 4, item 3) não explica o sinal.
- **Tamanho do município (seções no painel).**

  | Unidade | Até 200 | 201 a 2.000 | Mais de 2.000 |
  |---|---|---|---|
  | RS | 10,8 | 10,5 | 9,4 |
  | MG | 4,7 | 4,0 | 9,6 (z 2,2) |
  | Sul | 5,5 | 10,0 | 11,4 |

  No RS, o sinal é igual em cidade pequena e grande. "Periferia de cidade grande" não é a explicação no RS; em MG, a diferença não passa no teste.
- **Transferência temporária.** O coeficiente próprio dela é positivo fora do Nordeste (+13,2, z 5,8), mas não muda o da V2.

### Veredito

Nenhuma variável pública por seção explica o sinal no Sul, em MG e no RS. As explicações "migração", "segunda via ou título recente" e "periferia de cidade grande" não têm apoio. As duas primeiras vão no sentido contrário. Isso **não** prova inserção: a composição por um traço que o perfil público não tem (renda, vínculo com programa social, transporte no dia) continua possível, e o voto é secreto.

**Achado lateral (exploratório, Hipótese).** Em MG, a liberação manual **com mesário identificado** (V3m) também tem parte própria positiva: +1,94 (z 4,16). No RJ, ela vai para o outro lado (−1,53, z −2,43). Fora do Nordeste, +0,79 (2,11). O parecer 42 viu "|z| ≤ 2,2" só nos agregados. O caso de MG merece plano próprio: é o caminho em que a mesa decide.

## Magnitude

**Fato (contagem completa do BU, todas as seções, os dois turnos).**

| | V2 no 1º turno | V2 no 2º turno | Soma do V2 a mais, nas seções onde subiu |
|---|---|---|---|
| Brasil sem exterior | — | — | **452.032** (variação líquida +311.361) |
| Fora do Nordeste | 5.337.730 | 5.593.391 | 355.877 |
| Sul | 815.665 | 861.228 | 56.845 |
| MG | 1.415.926 | 1.501.960 | 98.707 |
| RS | 530.597 | 559.431 | 34.831 |
| SP | 1.149.154 | 1.229.906 | 100.080 |

Margem nacional do 13 no 2º turno: **4.430.191**.

- **Limite superior aritmético.** Suponha que **todo** V2 a mais do 2º turno, em todas as seções onde ele subiu, fosse voto falso no 13. A margem cairia para **3.978.159**, e o 13 continuaria à frente.
  - Só Sul + MG (o RS está no Sul) somam 155.552, ou 3,5% da margem.
  - Este limite vale para o canal que o sinal mede, o V2 **a mais** entre turnos. Uma inserção igual nos dois turnos não aparece aqui; para ela vale o cerco do doc 18 e do parecer 42, em que o pior caso da V2 inteira inverte o resultado.
- **Equivalente do modelo (estimativa; não vai à perícia).** Pergunta: quantos votos no 13 teriam de ser **somados**, nas seções onde o V2 subiu, para produzir a inclinação observada?
  - Fora do Nordeste: cerca de 28 mil pela medida em parcela e cerca de 17 mil pela medida por eleitor (β × variação positiva × votos, dividido por 1 − parcela do 13).
  - O doc 18 chega a ~62 mil por outro caminho (casando o z da fraude injetada).
  - Em qualquer medida, é menos de 1,5% da margem.

## O que foi testado e o que só foi suposto

**Testado:**

- reprodução completa;
- V2 só do BU;
- última hora pelo relógio, com placebo de todos os eleitores;
- rajadas contra as vizinhas do mesmo local;
- 3 seções no bruto;
- mobilização por perfil, foto, perfil dos sem biometria, seção nova, transferência temporária e tamanho do município;
- limite aritmético.

**Só suposto, no doc 19:**

- que a composição benigna "não se confirma" porque a idade não interage. Só foi testada a versão "jovens";
- que o B1 é marca de inserção. O placebo mostra que é marca de horário.

**Não testável com dados públicos:**

- o voto do eleitor V2;
- renda e programa social por seção;
- se o arquivo de digitais da urna é o mesmo nos dois turnos.

**Princípio 8.** Nada aqui usa "o mesário conferiu" ou "o fiscal viu" como controle. A ausência de marcas de mesa (rajada, fim do dia, sequência) só exclui a inserção **com essas marcas**. Uma inserção em ritmo humano, espalhada, continua não excluída por teste nenhum. Ela fica limitada só pela aritmética acima.

## Perícia: o que pode entrar

O sinal é uma associação estatística sem causa conhecida. Pela regra do relatório, não entra número de modelo: nem β, nem z, nem "por 100%", nem "62 mil". Entra como **Hipótese em aberto**, sem número de teste, ao lado do **Fato aritmético** do limite, que sai de contagem completa do BU.

### Tópico 4 (liberação sem digital): pode entrar, com este texto

> **Um sinal fora do Nordeste, ainda sem explicação.** No 2º turno, 452.032 eleitores a mais do que no 1º turno votaram liberados pelo ano de nascimento, sem digital na urna. A conta soma só as seções em que esse número subiu.
>
> No Sul e em Minas Gerais, as seções em que esse grupo cresceu tiveram um crescimento um pouco maior do 13 do que as vizinhas do mesmo prédio de votação. No Nordeste, isso não aconteceu.
>
> **Procuramos as marcas que uma mesa deixaria ao pôr votos no lugar de eleitores ausentes. Não as encontramos:**
>
> - esses eleitores a mais não se acumularam no fim do dia: votaram mais de manhã, como todo mundo no 2º turno;
> - não vieram em sequência, um atrás do outro, mais do que no 1º turno;
> - as poucas seções em que muitos votaram em poucos minutos são seções em que metade do eleitorado não tem digital, e nelas o 13 não cresceu mais que nas vizinhas;
> - nas seções que mais pesam no resultado, lidas uma a uma no registro da urna, os horários são de gente chegando para votar.
>
> **Também não achamos uma explicação comum.** O sinal não vem de eleitores que mudaram de cidade, nem de títulos novos, nem só das cidades grandes.
>
> **Por que isso não muda o resultado da eleição.** Mesmo que todos os 452.032 votos a mais desse grupo fossem falsos e todos para o 13, o 13 continuaria vencendo, por 3.978.159 votos em vez de 4.430.191.
>
> **O que continua em aberto.** O voto é secreto. Por isso, os dados não dizem se esse grupo apenas votou mais no 13 por ser quem é, ou se houve votos no lugar de ausentes, feitos devagar e espalhados por muitas seções, sem deixar marca no horário. O caso segue em análise.

**Fica fora:**

- β, z, "por 100%", interações e qualquer número de modelo;
- o "62 mil" e os equivalentes de 17 a 28 mil;
- "Fora do Nordeste", Sudeste e SP como regiões do sinal: dependem da medida (parecer 42);
- o "3.800 municípios";
- as 627 seções, cujo número vem da leitura de horário do doc 19 e não foi refeito de forma independente neste parecer;
- o MG V3m (achado lateral, sem plano).

O RS está no Sul. Citar "Sul e Minas Gerais" basta e evita listar UFs com poucas seções.

### Tópico 10 (quadro das hipóteses): uma linha

> **Liberação sem digital a mais no 2º turno, fora do Nordeste.** Situação: em aberto. Nas seções do Sul e de Minas Gerais em que mais eleitores votaram sem digital no 2º turno, o 13 cresceu um pouco mais. Não há marca de votos postos pela mesa, nem explicação comum identificada. Mesmo no pior caso, não muda o resultado.

## Correções pedidas no doc 19 (sem editá-lo)

1. Trocar "**Fato:** a idade do eleitorado não explica o sinal" por "a hipótese dos jovens não tem apoio; a de eleitores sem digital mais velhos e de menor escolaridade não foi testada e tem indícios a favor (exploratório)". Corrigir a leitura das interações com 70+.
2. Em (b), acrescentar a última hora pelo relógio e o placebo de todos os eleitores. O "ponto a acompanhar" (B1, z 2,71) fica explicado como efeito do horário, não da V2.
3. Em (c), dizer que o critério de escolha das 20 seções privilegia a oscilação do 13, não o V2 a mais. Incluir a comparação das rajadas com as vizinhas.
4. Tirar "operação difusa em quase 3.800 municípios" e o "~62 mil votos" do resumo.
5. Ler o resultado à luz do parecer 42: o forte é Sul, MG e RS; "fora do Nordeste" depende da medida.

## Comandos

```bash
node --max-old-space-size=8000 scripts/auditoria/cetico-46-dados.mjs      # 8 min; BU, diários (h08, leitura do parecer 42, horário do doc 19), perfil dos zips
node --max-old-space-size=8000 scripts/auditoria/cetico-46-modelos.mjs    # 2 min; R, A, B, B1 placebo, D, Q, M
node scripts/auditoria/cetico-46-rajada.mjs                               # as 627 seções com rajada × vizinhas do local
node src/exportar.js --turno 2 --uf rj --municipio 58041 --zona 0152 --secao 0084 --saida <dir2>   # idem --turno 1
node scripts/auditoria/cetico-46-caso.mjs <dir1>/rj/58041/0152-0084.json <dir2>/rj/58041/0152-0084.json
```

Saídas em `data/parsed/auditoria/cetico-revisor/46/`:

- `secoes.csv` (uma linha por seção, sem título);
- `modelos.json` e `modelos.log`;
- `rajada.json`;
- `dados.log`.
