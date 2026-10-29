# 22. Parecer: o aumento de comparecimento entre turnos é difuso (estatístico eleitoral)

Revisado: [estatistico-eleitoral/01 a 05](../estatistico-eleitoral/01-dados-e-metodo.md). Revisão em 29/10/2026, sobre a cópia de leitura `eleicao2026-20261029T105000` (28 UFs nos dois turnos) e os dados abertos das 28 UFs. Três lentes independentes (reprodução, dados e definições, explicações alternativas), consolidadas aqui. Onde as lentes divergiram, conferi o ponto nos arquivos de saída e no banco (seção "Pontos em disputa").

## Afirmação original

> O aumento de comparecimento entre turnos tem forma de mobilização difusa, não de inserção concentrada. Mediana do Δ +1,91 p.p., uma moda; contra o nulo binomial calibrado na zona, z ≥ 4: 105 seções (8 no nulo), z ≤ −4: 439 (34 no nulo); nenhuma UF com cauda direita maior que a esquerda; as 1.113 seções com z ≥ 3 somam 21.402 eleitores de excesso (0,7% de 2,96 milhões). Correlação excesso × Δ parcela do 13 dentro da zona = +0,002. O eleitor do excesso é MAIS biométrico (0,848 × 0,758, t = +10,2) e tem MENOS liberação manual (0,154 × 0,255, t = −10,3). 0 de 42 testes E2 por UF passam em BH. Poder: detecta ~33 mil votos concentrados em ≤ 1% das seções e ~85 mil espalhados; NÃO detecta inserção uniforme em zonas inteiras (340 mil votos). Resíduo pró-13: +0,141 p.p. por +10 p.p. de parcela do 13 depois de descontar a volta de quem faltou, 17.649 eleitores no decil mais pró-13, sobretudo no Nordeste. Partes 2 e 5 rodaram com o 1º turno do banco em 22 UFs; partes 1, 3 e 4 com dados abertos, 28 UFs, 498.964 seções pareadas.

## Veredito final: sustentado com ressalvas

As três lentes chegaram ao mesmo veredito.

- **O que se sustenta.** O centro do achado se reproduz número a número, com código independente e outra fonte: o aumento não tem a forma de inserção concentrada em poucas seções.
- **O que cai.** Três frases caem com as 28 UFs:
  - "0 de 42 testes E2";
  - "~33 mil / ~85 mil / 340 mil";
  - "nenhuma zona passa de 5 seções com z ≥ 3".
- **O que é leitura de referência, não de dados.** Duas conclusões dependem da referência escolhida:
  - "a cauda que existe é a esquerda / nenhuma UF com cauda direita maior";
  - "o eleitor do excesso é mais biométrico".
- **O que está subdimensionado.** O resíduo pró-13 sobrevive aos controles. Medido dentro da zona, ele fica de 2,4 a 3,8 vezes acima dos 17.649 citados.

## Afirmação revisada (alcance que os dados sustentam)

**Fato (28 UFs, 498.964 seções pareadas; partes de biometria em 27 unidades e 497.656 seções).** Saem da parte de biometria o exterior, cujo BU não traz o detalhamento, e 27 seções do Sistema de Apuração.

1. **Distribuição.** O aumento de comparecimento entre os turnos (mediana +1,91 p.p.) tem uma moda só e não tem cauda direita acima da que o modelo espera:
   - em z ≥ 4 há 105 seções acima e 439 abaixo;
   - a parte da direita (0,193) é igual ou menor que a do próprio nulo do autor (0,19 a 0,23, conforme o sorteio e a raiz escolhida);
   - a assimetria entre as caudas vem do próprio nulo. Que ela venha de "choques locais de queda" não está demonstrado.
2. **O nulo descreve o centro, não as caudas.** As duas caudas são cerca de 13 vezes as do nulo (curtose em excesso de 8,3 contra 0,02). As contagens "105 contra 8" e "439 contra 34" não medem anomalia num lado só.
3. **Tamanho e direção do excesso.** As 1.113 seções com z ≥ 3 somam 21.402 eleitores de excesso (0,7% do aumento de 2,96 milhões). Dentro da zona, o excesso não puxa a parcela do 13 (correlação +0,002).
4. **Por UF, o resultado depende do nulo.**

   | Referência | z ≥ 3 | z ≥ 4 |
   |---|---|---|
   | Metade (p = 1/2), o teste do autor | nenhuma UF | nenhuma UF |
   | Parte direita do nulo da própria UF | BA, MG, PE, RJ e RS, com q < 0,05 nas três versões do nulo. ES e SP ficam na fronteira | nenhuma UF |
   | Nulo superdisperso | nenhuma UF | nenhuma UF |

5. **Biometria (um fato só).** As três categorias de habilitação somam o comparecimento.
   - O eleitor do excesso entrou por biometria em 0,853, contra 0,764 do aumento esperado (t = 12,3).
   - Contra a composição do 1º turno das mesmas seções, ele entrou **mais** sem digital: 14,7% contra 12,2% (t = 14).
   - Ele fica entre as duas referências. Isso não absolve nem acusa.
6. **E2 com 28 UFs.** 2 dos 52 testes por UF passam em BH, ambos em SP e a favor do 22, na ordem de 1,7 mil votos.
7. **Poder.** Medido com 28 UFs e 5 réplicas, com a inserção toda para um lado e registrada sem biometria.
   - Detecta: inserção concentrada a partir de cerca de 48 a 50 mil votos (≤ 1% das seções) e espalhada a partir de cerca de 125 mil (+5 em 5% das seções).
   - Não detecta:
     - inserção uniforme em zonas inteiras: 250 mil votos (+10 em 5%) e cerca de 500 mil (+5 em 20%);
     - inserção registrada como "por biometria", no E2;
     - inserção numa UF só, de até cerca de 18 mil votos, no teste por UF contra 1/2.
8. **Resíduo pró-13.** Fica +0,144 p.p. por +10 p.p. de parcela do 13 (t = 8,1), e sobrevive aos controles.
   - Controles usados: idade, escolaridade, biometria cadastrada, voto e abstenção do 1º turno. Com eles, +0,123 (t = 6,6) no país e +0,191 (t = 7,8) no Nordeste.
   - O tamanho no decil mais pró-13 depende da referência:

     | Referência | Eleitores de excesso no decil 10 |
     |---|---|
     | Contra zero (a conta do autor) | 17,6 mil |
     | Contra os outros decis ou a média nacional | 26 a 28 mil |
     | Dentro da zona, com todos os controles | 42,5 a 43 mil |
     | Dentro da zona, sem controles | 65 a 66 mil |

   - O excesso do decil 10 é mais biométrico que o aumento esperado (84% contra 76%). Não sustenta nem refuta H13.

**Hipótese (conta hipotética, não medida).** Mesmo no teto, se todo o excesso do decil 10 fosse falso e votasse como a seção (82,6% no 13), o saldo seria de cerca de 43 mil votos. É cerca de 1% da diferença de 4.430.191 votos.

**Pendente.** Não dá para excluir com este desenho:
- inserção uniforme em zonas inteiras;
- inserção igual nos dois turnos;
- inserção proporcional aos faltosos do 1º turno.

## O que foi reproduzido (Fato)

| Número | Autor | Reprodução (código próprio, BU do banco) | Definições (código do autor, abertos) | Alternativas (abertos) |
|---|---|---|---|---|
| Seções no modelo | 498.964 | 498.964 | 498.964 | 498.964 |
| Δ total / esperado | +2.961.430 / +3.054.352 | iguais | iguais | — |
| Mediana do Δ | +1,91 p.p. | +1,914 | +1,914 | — |
| z ≥ 2 (acima/abaixo) | 11.693 / 14.367 | 11.692 / 14.365 | — | — |
| z ≥ 3 | 1.113 / 2.125 | 1.113 / 2.125 | 1.113 / 2.125 | 1.113 / 2.125 |
| z ≥ 4 | 105 / 439 | 105 / 439 | 105 / 439 | 105 / 439 |
| z ≥ 5 | 16 / 155 | 16 / 155 | — | 16 / 155 |
| Nulo z ≥ 4 (média de sorteios) | 7,9 / 33,8 | 8,7 / 28,9 | 8,65 / 31,1 (40 sorteios) | 7,9 / 33,8 |
| Excesso das 1.113 (z ≥ 3) | 21.402 (Δ bruto 29.895) | 21.402 (29.895) | 21.402 | — |
| Excesso das 105 (z ≥ 4) | 2.894 (Δ bruto 3.782) | 2.894 (3.782) | — | — |
| Covariáveis do modelo | p60 +0,019; log aptos +0,015; 2.310 zonas com transição própria | iguais | — | — |
| Gradiente pró-13 | +0,141 | +0,144 | +0,144 (315 seções sem perfil) | — |
| Excesso no decil 10 | 17.649 | 17.621 | 17.649 | 17.649 |

**Universo (Fato).** Os 499.207 pares dão c1 = 125.275.835 e c2 = 128.236.074, um Δ de 2.960.239, igual ao tópico 8 da perícia. A diferença para os 2.961.430 do modelo é de +1.191 e vem só das exclusões:

| Exclusão | Seções | Δ |
|---|---|---|
| Aptos mudam mais de 10 entre os turnos | 237 | −1.196 |
| Comparecimento do 1º turno abaixo de 10 | 6 | +5 |

**Casos conferidos no BU bruto (`src/exportar.js --stdout`, dois turnos).**

| Seção | Comparecimento | Votos do 13 | Votos do 22 | Por biometria | Por ano de nascimento |
|---|---|---|---|---|---|
| PA 04421/0101/0163 | 263 → 310 | 260 → 308 | 0 → 1 | 261 → 309 | 2 → 1 |
| PE 23752/0130/0112 | 312 → 374 | 258 → 325 | 29 → 37 | 269 → 324 | 43 → 50 |

Os dois casos batem com o banco e com o doc 02.

**Gerador.** Os scripts do autor usam `aleatorio()` de `forense-lib.mjs`: mulberry32 com `Math.imul`, sementes 20261025, 7, 99 e 5. `sortearBinomial` inverte por enumeração, de forma exata. Não há LCG quebrado no achado.

**Partes 2 e 5 com 28 UFs (Fato).** A reprodução rodou os passos do `estatistico-dc-refazer --sem-abertos` um a um, com heap de 4096.

| Componente do aumento | Excesso | Aumento esperado | t | Universo |
|---|---|---|---|---|
| Por biometria | 0,853 ± 0,003 | 0,764 ± 0,008 | +12,3 | 497.656 seções, 27 unidades |
| Sem biometria cadastrada | 0,071 | 0,101 | −9,9 | idem |
| Por ano de nascimento | 0,077 | 0,135 | −10,9 | idem |
| Sem digital (os dois anteriores) | 0,147 | 0,236 | −12,3 | idem |
| Nas 22 UFs do autor, por biometria | 0,846 | 0,762 | — | 338.884 seções |
| Nas 22 UFs do autor, sem digital | 0,154 | 0,238 | — | idem |

Com o pipeline do autor sem correção, a biometria do excesso sai 0,835 contra 0,754. É o efeito do bug do exterior (problema 2).

## Pontos em disputa entre as lentes, e como decidi

1. **Parte direita do nulo nacional.** As lentes deram valores diferentes. Em z ≥ 4: 0,231 (reprodução), 0,217 (definições) e 0,189 (alternativas). Em z ≥ 3: 0,36, 0,357 e 0,355.
   - A diferença é ruído de sorteio: são cerca de 40 seções por sorteio em z ≥ 4, e o erro da proporção fica em torno de 0,02.
   - O observado (0,193 e 0,344) fica dentro dessa faixa ou um pouco abaixo.
   - **Decisão:** a assimetria nacional é a do nulo. Não há excesso à direita, e "mais choques de queda" não está demonstrado. Com a raiz menor (17.665 seções viáveis), a parte direita do nulo sobe para 0,40; com a normal, para 0,49. O nulo não fixa a forma das caudas.
2. **Quais UFs têm cauda direita pesada em z ≥ 3 (contra o próprio nulo).** Conferi nos três arquivos:

   | UF | Acima | Abaixo | q (reprodução) | q (definições, 40 sorteios) | q (alternativas) |
   |---|---|---|---|---|---|
   | MG | 167 | 165 | 0,0012 | 0,0003 | 0,0007 |
   | RJ | 103 | 107 | 0,0045 | 0,0021 | < 0,05 |
   | BA | 80 | 123 | 0,0049 | 0,024 | < 0,05 |
   | PE | 55 | 67 | 0,0049 | 0,027 | < 0,05 |
   | RS | 70 | 66 | 0,048 | 0,027 | < 0,05 |
   | ES | 27 | 21 | 0,036 | 0,109 | 0,077 |
   | SP | 207 | 252 | 0,063 | 0,077 | 0,035 |

   **Decisão:**
   - Cinco UFs (BA, MG, PE, RJ e RS) aparecem nas três versões; ES e SP dependem do sorteio.
   - Em z ≥ 4, nenhuma UF passa contra o nulo da própria UF. A menor é MG, com q de 0,056 a 0,085; contra a parte nacional, MG dá q = 0,012.
   - Sob um nulo superdisperso (mistura de escala Gama(6)), nenhuma UF passa. Esse nulo, porém, prevê cauda direita demais (1.726 contra 1.113 em z ≥ 3), então nenhum dos dois nulos descreve as duas caudas.
   - Em z ≥ 3, a frase "nenhuma UF com cauda direita maior que a esquerda" é falsa até na leitura literal: MG tem 167 contra 165, RS 70 contra 66 e ES 27 contra 21.
3. **Seções do exterior sem categoria.** As lentes citaram 1.310, 1.306, 1.281 e 1.308. Conferi no banco:

   | Grupo de seções | 1º turno | 2º turno |
   |---|---|---|
   | Exterior (UF ZZ), total | 1.351 | 1.351 |
   | Exterior com comparecimento 0 | 70 | 70 |
   | Exterior com votos e categorias nulas (`votacaoUE`) | 1.281 | 1.281 (1.280 `votacaoUE` e 1 `votacaoRED`) |
   | Sistema de Apuração no exterior (`saManual`, comparecimento 0 no banco) | 29 | 29 |
   | Sistema de Apuração em MG (`saMistaBUImpressoCedula`) | 2 | — |

   **Decisão:** no modelo de 498.964 seções ficam 1.308 sem categoria: 1.306 do exterior e 2 de MG. Delas, 1.281 são de urna sem detalhamento e 27 do Sistema de Apuração. A diferença de números entre as lentes é só de recorte.
4. **"Nenhuma zona passa de 5 seções com z ≥ 3".** Conferi no `biometria.json` de 28 UFs: SP zona 0002 tem 7 seções com z ≥ 3 entre 433, com 1 esperada. Isso é raro para uma zona isolada (Poisson, P ≈ 8 × 10⁻⁵), mas não entre 2.640 zonas (p corrigido ≈ 0,2). A frase cai, e o achado não muda.
5. **Linha de base da biometria.** Só a lente de definições testou a composição do 1º turno, e as outras não a contradizem. Conferi no `acd-dados.json` (Fato):
   - em relação à composição do 1º turno, o excesso tem +2,6 p.p. de entrada sem digital (t = 14) e o aumento esperado tem +9,1 p.p. (t = 14,2);
   - as duas comparações são verdadeiras ao mesmo tempo.

## Problemas

1. **Números desatualizados pelo princípio 9 (Fato).** Com as 28 UFs:
   - o E2 por UF dá 2 de 52 testes em BH, e não 0 de 42. Os dois são de SP e a favor do 22: no 13, d = −0,012 (t = −4,0, q = 0,003); no 22, d = +0,014 (t = +3,7, q = 0,006);
   - no E2 separado aparecem RS (sem biometria cadastrada, a favor do 13: t = 5,1, q = 3,5 × 10⁻⁵, cerca de 3,7 mil votos) e SP (ano de nascimento, a favor do 22: t = 3,6);
   - o E2 nacional fica em t = −2,4 (13) e +1,9 (22);
   - o poder sobe para cerca de 48 a 50 mil (concentrado), 125 mil (espalhado) e 500 mil (zonas inteiras). Em % do ganho do 13 é o mesmo: 0,46%, 1,2% e 4,8%;
   - "Nenhuma zona passa de 5" cai (SP 0002 com 7).
2. **Bug: nulo vira 0 (Fato).** Em `estatistico-dc-biometria.mjs:48`, `s.dsb = s.sb2 - s.sb1` com `sb` nulo dá `null − null = 0` em JavaScript.
   - Com 28 UFs, as 1.281 seções do exterior entram na regressão das partes com Δcategoria = 0 e comparecimento variando.
   - As partes deixam de somar 1 (0,980 no excesso, 0,985 no esperado), e a biometria do excesso cai para 0,835. Corrigido, dá 0,853.
   - O sentido do resultado não muda. Com 22 UFs o bug não aparecia, porque o exterior não estava no banco.
   - O mesmo vício entra no E2 nacional, que roda com 498.902 seções, exterior incluído.
3. **Exclusão silenciosa com o motivo errado (Fato).** No banco, as seções do Sistema de Apuração têm `comparecimento = 0`. O filtro do pipeline do banco as tira como `comp1Menor10`: 33 = 6 reais + 27 do Sistema de Apuração (`poder-banco.json`, `filtro`). O princípio 9 pede contagem e motivo. Nos dados abertos e na soma dos votos do BU elas têm comparecimento e voltam.
4. **Teste de simetria por UF mal calibrado (Fato).** O teste `R ~ Bin(R+L, 1/2)` ignora que o próprio nulo põe só 19% a 23% da cauda z ≥ 4 à direita (36% em z ≥ 3). Uma UF precisaria de cauda direita cerca de 4 vezes acima do nulo para disparar.
   - Na simulação da lente de alternativas, ele deixou passar +10 votos em 5% das seções da BA (17,7 mil votos) e +10 em 1% das seções de MG, SP e RS (2,7 a 10,4 mil).
   - Contra a parte do nulo, ele detecta quase todos esses cenários.
   - O R1 nacional não detecta nenhum cenário de UF única, nem +20 em 1% de SP (20,6 mil votos).
5. **O nulo não serve para contagem absoluta nas caudas (Fato).** O φ pela mediana acerta o centro, mas a curtose em excesso do z é 8,3 (nulo: 0,02), e as caudas inflam por igual dos dois lados: 13,3 vezes à direita e 13,0 à esquerda em z ≥ 4.
   - Isso é mistura de escalas entre seções. Uma beta-binomial com ρ fixo não corrige, e em quase todas as UFs φ < 1, onde ela nem é possível.
   - O autor reconhece o problema no doc 02, mas "105 (8 no nulo)" e "439 (34)" aparecem no achado como se medissem anomalia. Não devem ser citados como resultado.
6. **Biometria: um fato contado duas vezes, com rótulo diferente da perícia (Fato).**
   - "Mais biométrico (0,848 × 0,758)" e "menos liberação manual (0,154 × 0,255)" são o mesmo número, porque sb + pb + pg = comparecimento.
   - Além disso, eles vêm de universos diferentes: 22 UFs com 338.884 seções e 20 UFs com 295.275.
   - O autor chama de "liberação manual" a soma de sem biometria cadastrada e ano de nascimento. Na perícia 04, "liberação manual" é só o caminho 3, e a soma se chama "sem digital".
7. **A absolvição pela biometria depende da referência (Fato).**
   - Contra o eleitor que volta (o aumento esperado), o excesso é mais biométrico.
   - Contra a composição do 1º turno das mesmas seções, ele tem mais entrada sem digital: 14,7% contra 12,2% (t = 14). Na cauda z ≥ 3, 15,3% do Δ entrou sem digital, contra 12,3% de composição.
   - O argumento do princípio 8 no doc 04 só vale contra a primeira referência: "se mesários inflassem, haveria mais liberação manual, não menos".
   - Qual é a referência certa depende de supor que o eleitor a mais se parece com o faltoso do 1º turno, e isso não está demonstrado.
8. **O resíduo pró-13 está subdimensionado (Fato).** Os 17.649 do autor não estão em nenhum arquivo de saída: são a soma do resíduo no decil 10 contra o zero. Mas o modelo erra para cima no total, com excesso nacional de −92.922 (−0,059 p.p.).

   | Referência | Decil 10 (eleitores) |
   |---|---|
   | Contra a média nacional | 25,9 mil |
   | Contra os decis 1 a 9 | 28,4 mil |
   | Dentro da zona, sem controles (+0,473 p.p., t = 12,7) | 65 a 66 mil |
   | Com idade (60+ e 16 a 24) | 64 a 65 mil |
   | Com idade e voto e abstenção do 1º turno (+0,441, t = 12,4) | 58 a 62 mil |
   | Com todos os controles, incluindo escolaridade, indígena, log dos aptos e modelo de urna (+0,30 a +0,31, t = 7,1 a 7,5) | 42,5 a 43 mil |
   | Nordeste, com todos os controles (+0,223 p.p., t = 6,3) | 27 mil |

   No Nordeste, é um gradiente linear (+0,20 p.p. por 10 p.p., t = 8,3), sem salto no decil 10. O "0,3% da diferença" do doc 04 deve subir para cerca de 1% no teto.
9. **O resíduo não é o que H13 mede (Fato e Hipótese).**
   - **Fato:** contra o aumento esperado, o excesso do decil 10 é mais biométrico (84,0% contra 76,3%; no Nordeste, 83,8% contra 76,8%). Por ano de nascimento são 9,7%, contra 15,5% esperados.
   - **Fato:** contra a composição da própria seção, ele tem +4,0 p.p. a mais de entrada sem digital (decil 1: +0,8). O gradiente cresce com a parcela do 13.
   - **Fato:** no decil 10 do Nordeste, o Δ a mais em relação à zona é de cerca de 49 mil por biometria e 12 mil por ano de nascimento.
   - **Hipótese:** no máximo a fatia de ano de nascimento (cerca de 12 mil) é do tipo que H13 mede. Isso fica como Hipótese a passar para H13, não como Fato de inserção.
10. **Exclusões mal descritas (Fato).**
    - O doc 01 diz "saem 237 seções", mas são 243 (237 + 6), além das 41 não instaladas.
    - "Quase todas de voto em trânsito" não foi verificado: nenhum campo identifica trânsito. Das 237, 180 perderam aptos e 57 ganharam.
    - 55.722 seções têm aptos diferentes entre os turnos, embora o total nacional seja idêntico (158.745.079).
11. **O refazer do autor passa do teto de memória e sobrescreve as saídas (Fato).** O `estatistico-dc-refazer.mjs` (linha 24) chama os filhos com `--max-old-space-size=12288`. Os passos rodam bem com 4096.
    - A reprodução regravou `pares-banco`, `biometria`, `conferencia-bruto` e `poder-banco` em `data/parsed/auditoria/estatistico-eleitoral/`, que agora estão com 28 UFs.
    - Os docs 03, 04 e 05 citam números de 22 e 20 UFs que já não estão nesses arquivos. A cópia de 22 UFs ficou em `data/parsed/auditoria/cetico/acd-autor-22uf/`.
12. **Linha de base do poder no lado do 22 (Fato).** Sem nenhuma inserção, na leitura a favor do 22, R3 dispara (t = 13,8) e R4uf também (SP).
    - Os cenários a favor do 22 que usam R3 ou R4uf não medem poder.
    - O poder sai de 5 réplicas, então "1" ou "0" tem intervalo largo.
    - Toda inserção simulada vai inteira para um lado e numa categoria só. Não há cenário de voto dividido como a seção vota, nem proporcional aos faltosos do 1º turno.
13. **Achado à parte (Fato).** `scripts/auditoria/liberacao-entreturnos-painel.mjs:262` ainda usa o LCG `(semente * 1103515245 + 12345) % 2147483648`, que estoura o double. Ele não pertence a este achado, mas afeta o painel de H13 (parecer 19).

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| O número central vem de bug de leitura ou de junção dos dados abertos | Sim | **Refutada.** Outra fonte (BU do banco), código próprio: números idênticos. Dois casos conferidos no bruto |
| Mudança de definição do comparecimento entre fontes ou turnos | Sim | **Refutada.** 0 diferenças entre banco e abertos nas 497.656 seções fora do exterior e do Sistema de Apuração. sb + pb + pg = c em todas |
| Agregação de seções diferente entre os turnos | Sim | **Refutada.** 17.931 seções agregadas em cada turno, mesmas principais |
| A cauda direita é leve por limite físico (não passa dos faltosos) | Sim | **Explica pouco.** Só 3.940 seções (0,8%) não alcançam z = 4. O zMax mediano é 10,2 |
| A assimetria das caudas é do próprio nulo (binomial com p perto de 0,8) | Sim | **Confirmada.** Parte direita do nulo de 0,19 a 0,23 em z ≥ 4; observado 0,193. A leitura "choques de queda mais frequentes" não está demonstrada |
| Excesso à direita escondido em algumas UFs pelo teste com p = 1/2 | Sim | **Em parte.** Em z ≥ 3, BA, MG, PE, RJ e RS ficam acima do nulo da UF; em z ≥ 4, nenhuma. Sob nulo superdisperso, nenhuma. São UFs de lados políticos opostos |
| Nulo superdisperso (beta-binomial, mistura de escala) mudaria as caudas | Sim | A superdispersão é simétrica (12 a 15 vezes). A beta-binomial não se aplica (φ < 1). A mistura Gama(6) acerta a cauda total, mas prevê cauda direita demais. Contagens absolutas contra o nulo não valem como prova |
| O resíduo pró-13 é efeito de idade, escolaridade, indígena, biometria cadastrada, voto ou abstenção do 1º turno, ou modelo de urna | Sim | **Explica só parte**, cerca de um terço. Sobram +0,123 p.p. por 10 p.p. (t = 6,6) e 42 a 43 mil eleitores no decil 10 |
| O resíduo pró-13 é a brecha sem digital (H13) | Sim | **Não apoiada** contra o aumento esperado (mais biométrico). Contra a composição, há +4 p.p. de sem digital. No máximo cerca de 12 mil, por ano de nascimento, são do tipo H13 |
| Composição 22 × 28 UFs muda a parte 2 | Sim | O sentido se mantém. O E2 por UF muda: SP passa, a favor do 22, e RS aparece no teste separado |
| Exclusões (243 + 41) mudam o resultado | Sim | Δ líquido de −1.191: irrelevante. O motivo "trânsito" não foi verificado |
| Gerador aleatório quebrado | Sim | **Descartado** no achado (mulberry32) |
| Inserção uniforme em zonas inteiras | Simulada (poder) | **Não detectada** até cerca de 500 mil votos (28 UFs). Ponto cego do desenho |
| Inserção proporcional aos faltosos do 1º turno (mesma forma do termo s_z) | Não | Só suposta. Pela estrutura do modelo, seria absorvida |
| Inserção igual nos dois turnos | Não | Só suposta. Pede a linha de base de 2022 por seção, que não está no repositório |
| Klimek-Δ insensível nos redutos (voto inserido no 13 onde o 13 já tem 82% quase não move a parcela) | Não | Só suposta. Reduz o poder justamente no decil 10, onde está o resíduo |
| Mobilização de 2º turno, transporte de eleitor, choques locais | Não | **Só suposta.** Pelo princípio 8, transporte e mobilização são comportamento humano sem rastro e contam como risco, não como explicação. O rastro técnico (biometria) cobre cerca de 84% do excesso do decil 10, não 100% |

## Poder do teste (Fato, 28 UFs, `poder-banco.json`, 5 réplicas)

Inserção para o 13, registrada como "sem biometria cadastrada", salvo onde indicado:

| Cenário | Votos | % do ganho do 13 | Detecta? |
|---|---|---|---|
| 5% das seções, +10 | 249.146 | 2,4% | Sim, em todas as regras |
| 5% das seções, +10, como ano de nascimento | 249.163 | 2,4% | Sim |
| 5% das seções, +10, por biometria | 249.185 | 2,4% | R1, R2, R3 e R5 sim. O E2 (R4) não: t = −9,3, no sentido oposto |
| 5% dos redutos do 13, +10 | 248.784 | 2,4% | Sim (R3 não) |
| 1% das seções, +10 | 49.830 | 0,48% | Sim (R2 t = 7,3; R4 t = 5,1) |
| 0,25% das seções, +40 | 48.131 | 0,46% | Sim |
| 5% das seções, +5 | 124.701 | 1,2% | Sim (R2 t = 6,5; R4 t = 6,2) |
| 20% dos redutos do 13, +5 | 498.552 | 4,8% | Só R4 e R4uf |
| **5% das seções em zonas inteiras, +10** | 250.185 | 2,4% | **Não** |
| **20% das seções em zonas inteiras, +5** | 499.254 | 4,8% | **Não** (só R4uf em 2 de 5 réplicas) |
| Uma UF só, +10 em 1% a 5% das seções (lente de alternativas, 2 réplicas) | 2,7 mil a 17,7 mil | — | Não pelo teste por UF contra 1/2 nem pelo R1 nacional. Sim contra a parte do nulo, exceto BA com 1% |

Limites do poder:
- todo voto inserido vai para um lado só;
- a mesma fraude nos dois turnos some na diferença;
- inserção por biometria escapa do E2;
- 5 réplicas por cenário.

## Pendências

1. **Recomendação ao autor:**
   - corrigir o nulo que vira 0 em `estatistico-dc-biometria.mjs:48` (exterior);
   - listar as 27 seções do Sistema de Apuração com o motivo certo;
   - baixar o heap do refazer para 4096;
   - refazer os docs 03, 04 e 05 com 28 UFs, que é o que os arquivos de saída já contêm.
2. **Recomendação:** testar a simetria por UF contra a parte do nulo, não contra 1/2, e declarar que o resultado depende do nulo. Tirar "105 (8 no nulo)" e "439 (34)" do texto de conclusão.
3. **Recomendação:** juntar "mais biométrico" e "menos liberação manual" num número só, trocar o rótulo para "sem digital" e informar as duas referências: o aumento esperado e a composição do 1º turno.
4. **Recomendação:** trocar os 17.649 pela faixa por referência, de 17,6 mil a 66 mil, com 42,5 a 43 mil com todos os controles. Passar a parte "ano de nascimento no decil 10 do Nordeste", de cerca de 12 mil, para a frente H13 como Hipótese.
5. **Pendente:** simular inserção proporcional aos faltosos do 1º turno e inserção com o voto dividido como a seção vota.
6. **Pendente:** linha de base de 2022 por seção (`votacao_secao_2022`, `detalhe_votacao_secao_2022`), para saber se o gradiente pró-redutos é estrutural. Pede rede e o coordenador.
7. **Pendente:** verificar o motivo das 237 seções com aptos que mudam mais de 10 (o autor diz "trânsito", sem campo que confirme).
8. **Pendente para o coordenador:** em `docs/hipoteses.md` (H05), a nota "Estatístico ... aguarda cético 22" tem três frases que não valem com 28 UFs:
   - "cauda de queda maior que a de alta em todas as UFs" é falsa em z ≥ 3 para MG, RS e ES;
   - "0 de 42 testes por UF" passa a ser 2 de 52, SP, a favor do 22;
   - "340 mil" passa a ser cerca de 500 mil.
9. **Pendente (outra frente):** o LCG em `liberacao-entreturnos-painel.mjs:262`.

## Perícia

Nenhum número deste achado aparece em `docs/pericia/`. Procurei: 1,91, 105, 439, 21.402, 17.649, 0,141, 0,848, 0,154, "42 testes", 33 mil, 85 mil, 340 mil, "difuso", "mobilização", Klimek-Δ e decil. Não há correção a fazer lá.

Os números de E2 e de poder da perícia (tópico 4, item 136; tópico 7, linha 67; tópico 10, H05) vêm do parecer 06, que é outro método. Eles estão corretamente rotulados como parciais (25 UFs).

## Comandos que reproduzem esta revisão

```
# lente de reprodução: código próprio, BU do banco, 28 UFs
node --max-old-space-size=4096 scripts/auditoria/cetico-acd-reproducao.mjs 10
# lente de dados e definições: universo, banco × abertos, composição, resíduo dentro da zona
node --max-old-space-size=4096 scripts/auditoria/cetico-acd-dados.mjs
node --max-old-space-size=4096 scripts/auditoria/cetico-acd-simetria.mjs 40
# lente de alternativas: simetria contra o nulo, nulo superdisperso, controles do resíduo, poder por UF
node --max-old-space-size=4096 scripts/auditoria/cetico-acd-alternativas.mjs 10
node --max-old-space-size=4096 scripts/auditoria/cetico-acd-h13.mjs
# partes 2 e 5 do autor com 28 UFs, um passo por vez, com o heap no teto desta revisão
# (atenção: sobrescreve data/parsed/auditoria/estatistico-eleitoral/; cópia de 22 UFs em data/parsed/auditoria/cetico/acd-autor-22uf/)
node --max-old-space-size=4096 scripts/auditoria/estatistico-pares.mjs banco
node --max-old-space-size=4096 scripts/auditoria/estatistico-dc-biometria.mjs
node --max-old-space-size=4096 scripts/auditoria/estatistico-conferir.mjs
node --max-old-space-size=4096 scripts/auditoria/estatistico-dc-poder.mjs banco 5
# conferências curtas desta consolidação
node scripts/sql.mjs "select turno, (uf='zz') ext, count(*) n, sum(comparecimento is null or comparecimento=0) comp0, sum(sem_biometria is null) sbnull from secao group by 1,2"
node scripts/sql.mjs "select turno, tipo_arquivo, (uf='zz') ext, count(*) from secao where tipo_arquivo not like '%urna%' group by 1,2,3"
# casos no bruto
for t in 1 2; do
  node src/exportar.js --turno $t --uf pa --municipio 04421 --zona 0101 --secao 0163 --log nao --stdout
  node src/exportar.js --turno $t --uf pe --municipio 23752 --zona 0130 --secao 0112 --log nao --stdout
done
```

Saídas:
- `data/parsed/auditoria/cetico/`:
  - `acd-reproducao.json`, `acd-reproducao-z4.csv` e `acd-refazer-28uf.log`;
  - `acd-dados.json` e `acd-simetria.json`;
  - `acd-alternativas.json` e `acd-h13.json`;
- `data/parsed/auditoria/estatistico-eleitoral/`: `biometria.json` e `poder-banco.json`, agora com 28 UFs.
