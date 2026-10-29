# 13. Parecer: os seis testes forenses não mostram marca de fraude (2º turno, presidente)

Achado revisado: [docs/analysis/forense-estatistica/](../forense-estatistica/), docs 02 a 07, com a síntese em [07-assimetria-e-sintese.md](../forense-estatistica/07-assimetria-e-sintese.md). Scripts: `scripts/auditoria/forense-*.mjs`.
A revisão foi feita em 29/10/2026 por três lentes independentes: reprodução, definições e explicações alternativas. Depois disso, conferi por conta própria os pontos em que as lentes divergiram (`cetico-forense-sem-marca-consolidacao.mjs`).
**1º turno parcial:** a cópia de leitura tem 22 UFs (ac, al, am, ap, ba, ce, df, es, go, ma, mg, ms, mt, pa, pb, pe, pi, pr, rj, rn, ro, rr), com 339.061 seções. Faltam rs, sc, se, sp, to e o exterior. A rodada do autor usou 15 UFs.

## Afirmação original

> Nenhum dos 6 testes forenses mostra a marca estatística clássica de fraude em larga escala no 2º turno (presidente, 499.205 seções): 110 seções com 100% e 7.283 com ≥90%, explicadas por aldeias, quilombos e presídios (beta-binomial dentro da zona), todas já ≥90% no 1º turno; sem aglomerado de Klimek em (100%,100%) e correlação comparecimento×parcela do 13 dentro da zona r=−0,078; último dígito e 2º dígito sem desvio contra modelo simulado sem fraude; sem excesso de números redondos; com controles de perfil, cauda simétrica entre candidatos (p=0,25).

## Veredito final: sustentado com ressalvas

As três lentes deram o mesmo veredito, e a minha conferência o confirma. A frase só vale no sentido estreito. Lida como absolvição, ela não se sustenta.

- **O que se sustenta (Fato).** Os números reproduzem com código independente. A forma clássica de fraude não aparece nos dados: enchimento concentrado de urnas, segundo aglomerado em (100%, 100%), correlação positiva dentro da zona, números inventados e excesso de redondos. Os controles positivos mostram que os testes pegariam essa forma, e por isso a ausência dela tem valor.
- **O que não se sustenta: a leitura de absolvição.** Os testes têm **poder praticamente nulo** contra fraude espalhada ou proporcional. Nas simulações das três lentes, feitas com os dados reais, uma troca de 3,7% dos votos de um candidato para o outro em todas as seções (2,21 milhões de votos) não move nenhum dos seis testes. Essa troca muda a margem em 4,43 milhões, exatamente a margem real. O motivo é que todo modelo nulo do autor é ajustado nos próprios dados: taxa e rho da zona, permutação na zona, mediana e MAD da zona, regressão de perfil. Esse ajuste absorve qualquer deslocamento uniforme. O limite vale nos dois sentidos: estes testes não excluem nem confirmam uma fraude desse tamanho a favor de qualquer um dos dois candidatos.
- **Três trechos da afirmação estão errados ou exagerados:**
  1. "explicadas por aldeias, quilombos e presídios": 49 das 110 seções com 100%, 6.153 das 6.899 seções do 13 com ≥ 90% e 27 das 64 do canto de Klimek são de categoria "comum". Para elas, a explicação é Hipótese.
  2. "2º dígito sem desvio": o próprio autor registra desvio em 9 de 56 testes do 2º dígito (todos do 13) e o atribui, sem teste, a desajuste do modelo.
  3. "p = 0,25": esse valor usa o nulo errado, a parcela nacional. Para comparar as duas caudas da mesma variável, o nulo é 0,5, que dá p ≈ 0,81. A conclusão não muda.

## Afirmação revisada (alcance que os dados sustentam)

> **Fato.** No 2º turno de presidente, em 499.205 seções, nenhum dos seis testes forenses mostra a marca clássica de fraude **concentrada**:
> - nenhuma seção tem comparecimento acima de 100%, e não há segundo aglomerado em (100%, 100%);
> - a correlação entre comparecimento e parcela do 13 dentro da zona é r = −0,078;
> - o último dígito não desvia do modelo sem fraude, e não há excesso de números redondos;
> - com controles de perfil, as caudas de z ≥ 5 são simétricas, 318 × 325 (320 × 327 com a mediana corrigida), p ≈ 0,81 contra 0,5.
>
> Controles positivos simulados nos dados reais mostram que esses testes detectariam enchimento clássico, enchimento de redutos e troca de número fixo de votos em quase todas as seções.
>
> **Fato (limite).** Os mesmos testes **não detectam** fraude espalhada nem proporcional. Exemplos: +5 votos em 10% a 30% das seções (249 mil a 747 mil votos); troca proporcional de 3,7% do voto de um candidato em todas as seções (2,21 milhões de votos, o bastante para criar a margem real de 4,43 milhões a partir de um empate); fraude que acompanhe uma variável de controle, como a escolaridade baixa. "Sem marca" **não é absolvição**. Esse tipo de fraude só é alcançado por controles de integridade (assinatura, BU = RDV = resultado oficial) e pela comparação seção a seção com outra eleição.
>
> **Fato.** Há excesso de concentração a favor do 13:
> - 110 seções com 100% dos válidos, 106 do 13 e 4 do 22, contra 8,0 e 4,1 esperadas;
> - 6.899 seções do 13 com ≥ 90%, contra 4.664 esperadas pela beta-binomial;
> - 64 seções no canto ≥ 95/≥ 95, contra cerca de 7.
>
> Parte do excesso está em aldeias, quilombos e presídios (57 das 106 com 100% do 13; 37 das 64 do canto). O tamanho da seção explica cerca de um terço do canto: com permutação por zona e faixa de tamanho, o esperado sobe para 23 a 24. Com tamanho e categoria juntos, sobra um excesso de cerca de 17 a 20 seções. A explicação para as seções "comuns" é **Hipótese**: voto em bloco de comunidade homogênea, não testada contra linha de base externa.
>
> **Fato (parcial, 22 UFs do 1º turno).** As 99 seções com 100% que têm 1º turno carregado (97 do 13 e 2 do 22) já davam ≥ 90% ao mesmo candidato no 1º turno, com mínimo de 90,3%. Isso mostra estabilidade entre turnos. **Não** exclui fraude presente nos dois turnos.
>
> **Hipótese em aberto.** Há uma cauda de comparecimento ≥ 94% com 1.214 seções, das quais 1.078 são "comuns"; o 13 vence 927 do total e 800 das comuns. O 2º dígito desvia do modelo em 9 de 56 testes, todos do 13. Os dois pontos estão atribuídos pelo autor, mas não explicados.

## O que foi reproduzido (Fato)

| Medida (2º turno) | Autor | Reprodução | Definições | Alternativas | Conferência própria |
|---|---|---|---|---|---|
| Seções / totais 13 e 22 | 499.205; 64.256.232 × 59.826.041 | igual | igual | igual | igual (margem 4.430.191) |
| 100% dos válidos (13 / 22) | 106 / 4 | 106 / 4 | 106 / 4 | 106 / 4 | 106 / 4 (49 comuns) |
| ≥ 90% (13 / 22) | 6.899 / 384 | igual | igual | igual | 6.899 (6.153 comuns) |
| Beta-binomial ≥ 90% do 13 | 4.664 (razão 1,479); 100%: 8,0 | igual | 4.664,2 | igual | — |
| Canto ≥ 95/≥ 95 do 13 | 64 (perm. 6,6) | 64 (7,6 ± 1,5) | 64 (6,6) | 64 (6,5) | 64 |
| r dentro da zona (13) | −0,078 | −0,0777 | −0,0777 | −0,0777 | — |
| z ≥ 5 bruto | 715 × 135 | igual | igual | igual | — |
| z ≥ 5 com controles | 318 × 325 | 320 × 327 | 318 × 325 | 320 × 327 | — (ver divergência 1) |
| Último dígito contra o modelo | 0 UFs | χ² dentro do crítico | — | 0 UFs | — |
| 2º dígito contra o modelo (13) | 9 de 56 | — | — | 9 UFs | — |
| Redondos (v13 × 10) | sem excesso | z 0,57 | — | z +0,58 | — |
| 100% com 1º turno ≥ 90% | 87 de 87 (15 UFs) | 97 de 97 do 13 (22 UFs) | 99 de 99 (22 UFs) | 87 de 87 | 99 de 99 (97 do 13 + 2 do 22), mínimo 90,3% |

O caso concreto foi conferido no arquivo bruto: MT 90280/0028/0200, Confresa, aldeia Tapi'itawa (`src/exportar.js`, lente de reprodução).
- O BU tem 315 aptos, 309 comparecimentos e 309 votos nominais no 13.
- O RDV tem 309 votos "nominal 13".
- Lacres: 22 conferências, nenhuma falha.
- Bate com o banco. Pelo princípio 8, vale anotar que 33 eleitores dessa seção votaram sem biometria conferida (31 liberados por biografia e 2 sem biometria cadastrada).

### Pontos em que as lentes divergiram, decididos pela conferência própria

Script: `cetico-forense-sem-marca-consolidacao.mjs`. Saída: `data/parsed/auditoria/cetico/forense-sem-marca-consolidacao.json`.

1. **z com controles: 318 × 325 ou 320 × 327.** A lente de reprodução achou a causa em `forense-zscore.mjs`: a mediana e o MAD do resíduo são calculados num vetor que contém NaN (seções sem perfil). O sort põe esses NaN no fim e desloca a mediana em 250 zonas e 389 seções. Com a correção, o resultado é 320 × 327. **Decisão:** é bug real, com efeito desprezível. Vale o número corrigido.
2. **Canto por categoria: 29 ou 27 comuns.** O doc 03 diz "34 aldeia, 2 quilombo, 1 presídio e 29 comuns", o que soma 66, não 64. Conferi: com os valores exatos, o canto tem 64 seções (34 indígenas, 27 comuns, 2 quilombolas, 1 prisional). Com os percentuais arredondados a 1 casa, que é o filtro de `cantoPorCategoria` em `forense-klimek.mjs`, aparecem 66 (29 comuns). **Decisão:** 27 comuns e 37 de categoria especial. O doc 03 deve ser corrigido.
3. **Cobertura do 1º turno: 87, 97 ou 99.** As contagens diferem só pelo estado da carga e pelo recorte. Com as 22 UFs de agora, 99 das 110 têm 1º turno: 97 das 106 do 13 e 2 das 4 do 22. Todas as 99 já davam ≥ 90% ao mesmo candidato, com mínimo de 90,3%. Faltam 11, sendo 4 do RS e 7 do TO. **Decisão:** a afirmação "todas já ≥ 90%" vale nas 22 UFs. Continua **parcial**.
4. **Circularidade pelas categorias: até onde ela vai.** A lente de reprodução tratou a circularidade como risco geral. As de definições e alternativas mostraram que ela tem teto. Conferi o teto:
   - as 1.611 seções indígenas, quilombolas e prisionais têm 284.007 votos válidos, 0,23% do país;
   - nelas há 56.571 votos no 22 e 67.078 abstenções;
   - trocar todos os votos do 22 para o 13 moveria a margem em no máximo 113 mil; somando o enchimento de todas as abstenções, cerca de 180 mil. É 4% da margem.

   **Decisão:** a circularidade por categoria esconde fraude local, mas não uma inversão do resultado. O risco grande de circularidade está em dois lugares. O primeiro são os **controles contínuos**: na lente de definições, uma troca dirigida a seções de escolaridade baixa levou o coeficiente de 0,27 para 0,37, a cauda ficou simétrica (259 × 253) e a margem cresceu 4,6 milhões. O segundo é a categoria **"comum"** explicada por "comunidade homogênea", uma hipótese aberta que absorve qualquer resultado.
5. **Arquivo de saída perdido.** A lente de reprodução gravou sem querer no mesmo nome que a lente de alternativas (`forense-poder.json`) e depois renomeou o próprio arquivo. Com isso, o JSON da lente de alternativas deixou de existir. Rodei `cetico-forense-poder.mjs` de novo: o resultado é determinístico e os nove cenários saíram idênticos ao log original (`log-forense-poder.txt` contra `log-forense-poder-rerun.txt`).

## Problemas encontrados

1. **Absolvição falsa por falta de poder (Fato, simulação; as três lentes concordam).** Ver "Poder do teste" abaixo. Este é o problema principal. O doc 07 admite o limite numa frase da "conclusão honesta". A síntese e o título do achado não trazem o número que dá a medida do limite: 2,2 milhões de votos.
2. **Nulos ajustados nos próprios dados (Fato).** A beta-binomial usa taxa e rho estimados na zona, a permutação é feita dentro da zona e o z usa mediana e MAD da zona. Com isso, uma fraude uniforme se incorpora ao nulo. Na troca proporcional, a razão A4 observado/esperado **cai** de 1,479 para 1,444: o teste fica mais tranquilo justamente com a fraude dentro.
3. **Controles que absorvem a fraude (Fato, simulação).** A regressão de perfil é ajustada nos próprios votos. Uma fraude que acompanhe uma variável de controle é absorvida pelo coeficiente dela. Exemplos:
   - indígena: 0,511 → 0,567 → 0,618 com 10 e 30 votos trocados em aldeias, quilombos e presídios;
   - escolaridade baixa: 0,27 → 0,37.

   Em ambos os casos a cauda com controles continua simétrica.
4. **Filtro silencioso no z com controles (Fato).** As 243 seções prisionais sem perfil ficam com z_ctrl = null e saem da conta. Entre elas estão 89 das 715 extremas brutas do 13, todas de presídio. A simetria 318 × 325 vale **sem os presídios**, e o texto não diz isso. Isso fere o princípio 9: toda exclusão tem de ter contagem e motivo.
5. **Bug do NaN na mediana em `forense-zscore.mjs` (Fato).** Efeito desprezível: 318/325 → 320/327.
6. **Soma inconsistente no doc 03 (Fato).** As categorias do canto somam 66, por causa do arredondamento. O certo é 27 comuns, não 29.
7. **Valor-p da simetria com o nulo errado (Fato).** p = 0,25 é contra 51,79%. Para as duas caudas, o nulo é 0,5 e dá p ≈ 0,81. A conclusão não muda, mas o número publicado deve ser trocado.
8. **"Explicadas por aldeias, quilombos e presídios" é exagero (Fato).** Ficam de fora:
   - 49 das 110 seções com 100%;
   - 6.153 das 6.899 seções do 13 com ≥ 90%: o excesso das comuns é 6.153 contra 4.477 esperadas;
   - 27 das 64 do canto;
   - 1.078 das 1.214 seções da cauda de comparecimento ≥ 94%.

   Uma seção comum do canto (Fernando Falcão-MA, local com nome indígena Kapertyc Canela) é indígena e foi mal classificada. A categoria depende do nome do local, porque raça/cor só está informada para 28% a 38% do eleitorado no AM, MT e RR, e o limite "indígena ≥ 50%" quase nunca dispara.
9. **"2º dígito sem desvio" contradiz o próprio autor (Fato).** São 9 de 56 testes contra o modelo, todos do 13. O autor atribui a desajuste do modelo, o que é Hipótese não testada. Na simulação de troca fixa de 5 votos em 90% das seções, esse número sobe para 15. O sinal de base não é zero e não está explicado.
10. **Estabilidade entre turnos não é evidência independente (Fato de método).** O 1º turno foi apurado pelo mesmo sistema. Fraude persistente, ou trocas em redutos que já davam ≥ 90%, passaria igual na checagem. No cenário de troca de 5 votos em 10% das seções, as novas seções com 100% (106 → 225) passariam nela.
11. **Último dígito contra a uniforme (Fato).** O último dígito do 13 já é rejeitado contra a uniforme sem fraude nenhuma (χ² = 347). O critério válido é o modelo simulado do autor, e contra ele não há desvio. Somar uma constante, como +5 votos, quase não mexe nos dígitos: o teste não tem poder contra fraude aditiva.
12. **Procedimento (Fato).** `forense-base.mjs` abre o banco primário direto (`new DatabaseSync(BANCO)`), não pela cópia `abrirLeitura()`, o que contraria a regra 2 do doc 10. Os totais conferem com a cópia de leitura, então o achado não muda.
13. **r dentro da zona sem valor de referência calibrado (Fato, simulação).** O enchimento de 30% das abstenções em 20% das seções (1,84 milhão de votos) leva r de −0,078 para +0,011. Pelo critério do autor (|r| < 0,1 = fraco), isso não seria apontado. Já o enchimento proporcional às abstenções em todas as seções torna r **mais negativo** (−0,12). Só reage o enchimento de redutos (r +0,19, 653 zonas com r > 0,5).

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| **Benigna: tamanho de seção.** Seção pequena tem comparecimento e parcela mais dispersos. | Sim (definições, alternativas) | Explica cerca de um terço do canto: o esperado vai de 6,5 para 23,1–23,5 (zona × faixa de tamanho) e 26,6 (município × faixa). Sozinha não basta. |
| **Benigna: categoria (aldeia, quilombo, presídio).** | Sim, por contagem (autor e definições) | Com zona e categoria, o esperado do canto vai a 34,5. Com tamanho e categoria, a 44–47. Sobra um excesso de 17 a 20 (z ≈ 6–7). Esse nulo é otimista: 16 das 64 estão em estrato de uma seção só. Explicação parcial. |
| **Benigna: eleitores TTE** (mesários, policiais) inflam o comparecimento. | Sim (definições) | 19 das 64 têm TTE. Mesmo supondo que todos votaram, só 2 saem do canto. Não explica. |
| **Benigna: perfil em outra unidade ou data, ou seções agregadas.** | Sim (definições) | Bate: a razão entre perfil e aptos − TTE tem mediana 1,003, e só 21 seções ficam fora de ±10%. Nenhuma definição produz o achado sozinha. |
| **Benigna: regressão à média, comparecimento alto só neste turno.** | Sim (definições) | 46,6% do canto já tinha ≥ 95% de comparecimento no 1º turno, contra 46,2% das outras seções com ≥ 95%. Sem comportamento especial. |
| **Benigna: voto em bloco de comunidade homogênea, estável entre turnos** (explicação do autor). | Só em parte | Estável no 1º turno (99 de 99; 54 de 58 do canto já com ≥ 90% para o 13, mas só 16 no mesmo canto 95/95). **Não testada** contra linha de base externa (2022). Para as "comuns", é suposição. |
| **Maligna (princípio 8): comparecimento a mais por liberação sem digital** (mesário votando por ausente). | Sim (alternativas) | Refutada no agregado. O canto tem 8,9% de votantes sem digital, 2,7 p.p. **abaixo** da zona. A cauda ≥ 94% fica 3,1 p.p. abaixo. Os cerca de 1.768 votantes a mais do canto passaram pela biometria. Isso coincide com o parecer [10](10-a7-comparecimento-alto-sem-digital.md). Não testa fraude que dispense a digital (compra de comparecimento, coação). |
| **Maligna: fraude pequena e espalhada** (+5 votos em 10% a 30% das seções). | Sim (três lentes) | Indetectável. Nenhuma estatística sai do ruído. |
| **Maligna: troca proporcional do tamanho da margem** (3,7% a 3,8% em todas as seções). | Sim (três lentes) | Indetectável pelos seis testes. |
| **Maligna: fraude dirigida a variável de controle ou categoria.** | Sim (três lentes) | Absorvida pela regressão. Pelas categorias especiais, o teto é de cerca de 180 mil na margem. Pelos controles contínuos (escolaridade), não há teto prático. |
| **Maligna: enchimento clássico ou de redutos** (controle positivo). | Sim (três lentes) | Detectado. A ausência dessa forma nos dados reais é Fato. |

## Poder do teste (Fato, simulação nos dados reais)

Cada lente injetou fraude conhecida nas 499.205 seções reais e recalculou as seis estatísticas com as definições do autor. A linha base sem fraude reproduz o autor. Números da lente de alternativas (`forense-poder.json`, conferido de novo). As outras duas lentes dão resultados equivalentes.

| Cenário | Votos alterados | Margem 13−22 | Razão A4 | 100% do 13 | Canto 95/95 (perm.) | r zona | z ctrl alto × baixo (z assim.) | 2º díg. 13 | Detecta? |
|---|---|---|---|---|---|---|---|---|---|
| S0 sem fraude | 0 | 4,43 mi | 1,479 | 106 | 64 (6,5) | −0,078 | 320 × 327 (−0,28) | 9 | — |
| S1 +5 votos em 10% das seções | 249 mil | 4,68 mi | 1,478 | 106 | 73 (8,3) | −0,071 | 320 × 316 (0,16) | 9 | não |
| S2 troca de 5 em 10% | 250 mil | 4,93 mi | 1,472 | 225 | 69 (7,1) | −0,079 | 320 × 309 (0,44) | 8 | não (só os 100% dobram) |
| S3 +5 em 30% | 747 mil | 5,18 mi | 1,473 | 106 | 92 (11,9) | −0,062 | 317 × 327 (−0,39) | 9 | não |
| **S4 troca proporcional de 3,7%, todas as seções** | **2,21 mi** | **8,86 mi** | **1,444** | 109 | 66 (6,9) | −0,077 | 307 × 321 (−0,56) | 8 | **não** |
| S5 troca fixa de 5 em 90% | 2,24 mi | 8,92 mi | 1,396 | 1.046 | 104 (12,6) | −0,090 | 401 × 277 (**4,76**) | **15** | sim |
| S6 enchimento de redutos ≥ 70% | 2,35 mi | 6,78 mi | 1,204 | 106 | **293** (62) | **+0,192** (653 zonas > 0,5) | 399 × 356 | 15 | sim |
| S7 enchimento só em aldeia, quilombo e presídio | 33 mil | 4,46 mi | 1,474 | 106 | 166 (19,7) | −0,056 | 329 × 326 (0,12) | 10 | não: o canto sobe, mas tudo na categoria "benigna" |
| S8 clássico: 1% das seções levadas a 100% | 311 mil | 4,74 mi | 1,467 | 106 | 97 (23,7) | −0,017 | comparecimento z ≥ 5: 40 → **2.374** | 10 | sim |

O último dígito fica em 0 UFs significativas em **todos** os cenários, inclusive nos que os outros testes detectam.

**Leitura.**
- Os testes são **sensíveis à forma** da fraude, não ao tamanho dela. Fraude concentrada é vista mesmo pequena (S8, 311 mil votos).
- Fraude uniforme não é vista mesmo do tamanho da margem (S4, 2,21 milhões).
- A lente de definições chegou ao mesmo resultado com 3,8% (+4,55 milhões na margem) e com 15% das abstenções postas no 13 (+4,58 milhões). Nesse último caso, r ficou mais negativo, o oposto da marca de Klimek.

Portanto, "nenhum teste mostra marca" é compatível tanto com eleição limpa quanto com fraude proporcional capaz de decidir o resultado, para qualquer um dos lados.

## Pendências

1. **1º turno completo** (faltam rs, sc, se, sp, to e o exterior). Refazer a estabilidade das 110 seções e do canto. **Recomendação:** acrescentar uma diferença-em-diferenças seção a seção entre turnos (variação do comparecimento junto com a do 13). É o único teste desta família com algum poder contra enchimento proporcional.
2. **Linha de base de 2022** nas mesmas seções. Ela separa reduto estável de padrão novo nas 110 seções com 100%, nas 27 comuns do canto e na cauda ≥ 94% (1.078 seções comuns).
3. **Integridade, e não estatística, para fraude proporcional.** A troca uniforme só é alcançada por BU = RDV = resultado oficial, pela assinatura e pela cadeia de hashes em todas as seções. Este achado deve remeter a esses resultados, e não sugerir que os testes forenses cobrem esse caso.
4. **Correções no achado do autor** (cabe ao autor ou ao coordenador; este parecer não edita):
   - trocar p = 0,25 por p ≈ 0,81 (nulo 0,5);
   - corrigir a mediana com NaN (320 × 327);
   - declarar a exclusão das 243 seções prisionais sem perfil, que incluem 89 extremas;
   - corrigir 29 → 27 comuns no canto;
   - retirar "2º dígito sem desvio";
   - trocar "explicadas por" por "concentradas em parte em";
   - pôr o resultado de poder (2,2 milhões) na síntese;
   - abrir o banco pela cópia de leitura.
5. **Categoria indígena por coordenada** (terras indígenas), não pelo nome do local. Reclassificar as comuns do canto. Já há um caso mal classificado: Fernando Falcão-MA.
6. **2º dígito do 13 em 9 UFs:** testar com um nulo mais flexível antes de chamar de desajuste do modelo.
7. **Pendências do autor que continuam abertas:**
   - Ipixuna-AM 0045/0063, onde o 22 caiu de 61 para 2 votos (logs);
   - CE 15989/0055/0160, lacre não lido;
   - redondos do 22 no 1º turno (z +3,7);
   - governador não testado.

## Comandos que reproduzem a revisão

```bash
# autor (ordem do doc 01 do forense)
node scripts/auditoria/forense-base.mjs 2
node scripts/auditoria/forense-a3a4.mjs 2
node scripts/auditoria/forense-klimek.mjs 2
node scripts/auditoria/forense-digitos.mjs 2
node scripts/auditoria/forense-zscore.mjs 2
node scripts/auditoria/forense-redondos.mjs 2
node scripts/auditoria/forense-assimetria.mjs 2
# lente de reprodução (código próprio, cópia de leitura)
node scripts/auditoria/cetico-forense-reproducao.mjs
node --max-old-space-size=4096 scripts/auditoria/cetico-forense-reproducao-zctrl.mjs
node --max-old-space-size=4096 scripts/auditoria/cetico-forense-reproducao-poder.mjs
node --max-old-space-size=4096 scripts/auditoria/cetico-forense-reproducao-circular.mjs
node src/exportar.js ... --log nao --stdout      # caso MT 90280/0028/0200 (ver forense-reproducao-mt-90280-0028-0200-2t-export.json)
# lente de definições
node scripts/auditoria/cetico-forense-dados-definicoes.mjs
node scripts/auditoria/cetico-forense-dados-canto.mjs
node scripts/auditoria/cetico-forense-dados-poder.mjs
node scripts/auditoria/cetico-forense-dados-racacor.mjs AM,MT,RR
# lente de alternativas
node scripts/auditoria/cetico-forense-poder.mjs > data/parsed/auditoria/cetico/log-forense-poder-rerun.txt
node scripts/auditoria/cetico-forense-alternativas.mjs
# conferência própria dos pontos em disputa (só CSVs já gerados, sem banco)
node scripts/auditoria/cetico-forense-sem-marca-consolidacao.mjs   # → data/parsed/auditoria/cetico/forense-sem-marca-consolidacao.json
```

Rode um script pesado por vez. As saídas ficam em `data/parsed/auditoria/cetico/forense-*.json|stdout|csv`. Os resultados do 1º turno são **parciais** (22 UFs) e devem ser refeitos com a carga completa antes do relatório de perícia.
