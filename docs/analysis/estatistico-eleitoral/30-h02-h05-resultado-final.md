# 30. H02 e H05: resultado final só com dados públicos

Estatístico eleitoral, 02/11/2026. Executa o plano pré-registrado [29](29-h02-h05-plano-final.md):

- plano: commit **45dc471**, feito antes de qualquer cálculo novo;
- adendo 1 (SP 2022): commit **1989f56**, feito antes de baixar e de ler qualquer arquivo de SP de 2022.

Base: cópia de leitura `eleicao2026-20261029T105000` (28 UFs nos dois turnos), diários de urna extraídos dos dois turnos e diários e boletins de 2022 de MG, PR, RS, SC e SP. O que foi decidido depois de ver um resultado está marcado **exploratório**. O que fugiu do plano está em "Desvios do plano".

Rótulos: **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**.

## Resposta curta

**H02 (seções com quantidade fora do normal de eleitores liberados sem digital).** Conclusão final: **fato que pede explicação.**

- **Fato:** o excesso de liberados "sem biometria cadastrada" sobre o cadastro público está explicado pelo rastro técnico, nos dois turnos e em todas as seções:
  - 2º turno: 16.011 seções, 36.340 eleitores;
  - 1º turno: 15.027 seções, 33.319 eleitores.

  Em 98,6% dos dois turnos, o diário mostra que a urna exibiu a foto do eleitor e não pediu digital. O arquivo de eleitores da urna tinha foto e não tinha digital desses eleitores. O que sobra (493 eleitores no 2º turno, 447 no 1º) se repete entre os turnos e não tem forma de ação de mesa. Como sinal de liberação irregular, essa parte fica **refutada**.
- **Fato que pede explicação (parte d):**
  - na liberação manual, a que passa pela mesa, 159 seções do 2º turno ficam fora do normal contra a própria zona;
  - 46 delas (4.709 liberações à mão, 21,3% dessas seções) não têm explicação técnica no dado público: o leitor reconhecia normalmente quem passava pela digital, e a seção não estava assim no 1º turno com a mesma urna;
  - 3 dessas 46 têm também comparecimento ou voto fora do padrão da zona, com 123 liberações à mão no total.
- **Efeito máximo:** não muda o vencedor.
  - Mesmo que todo o excesso do 2º turno (36.340) e todas as 4.709 liberações das 46 seções fossem votos indevidos do 13, a soma (41.049) é menos de 1% da margem de 4.430.191.
  - O grupo exposto (votou só com foto e ano de nascimento, sem digital no arquivo) tem 339.963 eleitores no 2º turno. Ele também fica abaixo da margem. Esse número mede exposição ao risco, não voto indevido.

**H05 (mesários liberando outras pessoas sem digital).** Conclusão final: **sem sinal nos dados públicos, com tamanho mínimo que o teste enxerga.** A parte espalhada por igual fica **não decidível com dados públicos**.

- **Fato:** o teste do eleitor a mais (E2) enxerga inserção concentrada. O tamanho mínimo, com a linha de base descontada e em 16 de 20 réplicas, é:
  - 54.650 votos em 1% das seções, pela liberação manual;
  - 33.993 pela via "sem biometria no arquivo";
  - 124.369 votos em 5% das seções;
  - 199.038 em 20%;
  - 74.619 nos redutos do 13;
  - 500.098 em zonas inteiras.

  Para não ser confundido com a escolha de modelo (critério D3), o tamanho mínimo sobe para 103.872 (1%), 273.289 (5%), 596.875 (20%) e 999.795 (zonas inteiras).
- **Fato:** o teste **não** enxerga inserção espalhada por igual no país inteiro. Com 4.431.384 votos inseridos em proporção ao comparecimento de cada seção, nenhum critério dispara. Em municípios inteiros, só dispara na margem inteira, e porque o teto de ausentes quebra a uniformidade.
- **Sinais de SP e PR:**
  - SP (a favor do 22) **some** quando se comparam seções do mesmo local de votação: t de −5,59 para −0,50. É diferença de perfil entre locais. Esse contraste entre locais não existia em 2022 (z = −4,41), mas dentro do local 2026 é igual a 2022 (exploratório). O sinal é de composição, ou seja, de que locais veio o eleitor a mais.
  - PR (a favor do 13) fica pela metade dentro do local (t = 2,13). Não existia em 2022: d = −0,0052 em 2022 contra +0,0114 em 2026, diferença com z = 3,04, que passa o corte. Pela regra fixada, o PR fica **não decidível com dados públicos**. Nenhuma das explicações testadas o elimina, e o teste não separa a mesma pessoa trocando de via de um eleitor a mais.
- **As 97 seções de liberação em massa:**
  - 47 têm padrão de leitor ruim desde a abertura e 2 têm falha nova no 2º turno com a mesma urna;
  - 12 têm uma hora em que a urna reconhecia normalmente uma parte dos eleitores e liberava à mão a maioria (padrão compatível com uso da brecha). Em 4 delas, essa hora é a hora em que o leitor mudou de comportamento;
  - 36 ficam indeterminadas;
  - **nenhuma** das 12 tem comparecimento ou voto fora do padrão da zona;
  - no 2º turno houve 19 avisos de "já votou" em 23.050 votos.

  A inspeção física da urna e do leitor não é possível com dados públicos.
- **Efeito máximo × vencedor:**
  - o teto aritmético não exclui: o 2º turno teve 16.264.910 votos sem digital, contra uma margem de 4.430.191;
  - as 97 seções somam 23.050 votantes, 0,5% da margem;
  - o exterior (380.612 votos, todos sem digital) também fica abaixo da margem;
  - o teste exclui as formas concentradas acima dos tamanhos acima;
  - ele **não** exclui uma inserção espalhada por igual do tamanho da margem, nem uma inserção igual nos dois turnos.

  Para fechar isso, falta um dado: o registro por eleitor da via de habilitação (inscrição, via e hora), por seção e turno, e o caderno de votação assinado. Isso não é ausência de prova de fraude nem prova de fraude. É o limite do que o dado público mede.

## 1. H02

### 1.1 H02(a): a marca da foto em todas as seções com excesso (Fato)

Excesso E = sem biometria do BU − sem biometria do cadastro − folga (trânsito + aptos acima do cadastro). E′ é o mesmo excesso depois de tirar os atendimentos com foto e sem digital (V2 com `Foto do eleitor apresentada`).

| | 1º turno | 2º turno |
|---|---:|---:|
| Seções analisadas (27 UFs; o exterior não tem as categorias) | 497.506 | 497.508 |
| Seções com excesso | 15.027 | 16.011 |
| Excesso ΣE | 33.319 | 36.340 |
| Excesso sem a foto ΣE′ | 447 | 493 |
| Seções com E′ > 0 | 383 | 423 |
| **Parcela explicada pela foto** | **98,66%** | **98,64%** |
| Seções em que a foto cobre todo o excesso (F ≥ E) | 14.644 | 15.588 |
| Foto entre os V2 das seções com excesso | 63,2% | 60,5% |
| Foto entre os V2 das seções sem excesso (controle) | 4,07% | 4,00% |
| Atendimentos V2 com pedido de digital | 0 | 0 |
| Seções com o diário diferente do BU no V2 | 0 | 0 |

- **Leitura pela regra do plano:** a parcela explicada é de 95% ou mais nos dois turnos. **A foto explica o excesso.**
- **Grupo das 378 do parecer cético 01** (E ≥ 10, 2º turno): reproduzido exatamente. São 378 seções, o excesso cai de 5.560 para 54 e a foto aparece em 6.761 de 7.970 atendimentos (84,8%). No 1º turno, o grupo equivalente tem 321 seções, e o excesso cai de 4.762 para 37.
- **Tamanho do grupo exposto, no país inteiro (Fato, universo completo):**
  - no 2º turno, 339.963 eleitores votaram pela via sem digital com a foto na tela, de 7.251.732 atendimentos V2 (4,69%);
  - no 1º turno, foram 327.700 de 6.940.253 (4,72%).

  Esses números substituem as estimativas por amostra do parecer 01:
  - nas 16.011 seções com excesso, o grupo é de 53.240 no 2º turno (48.505 no 1º), o que confirma a estimativa de cerca de 53 mil da errata;
  - no país, 339.963, bem acima de "talvez mais de 100 mil".
- **Por UF (2º turno):** o excesso fica em SP (2.836 seções, 9.244 eleitores, 99,2% explicado), BA (2.964; 5.897; 97,8%), PR, PA, MG e CE, todos com 97,8% ou mais explicado. A foto entre os V2 sem excesso varia de 0,8% (ES) a 30,8% (PR).
- **Seções com excesso nos dois turnos:** 13.695, com 33.571 eleitores de excesso no 2º turno.

### 1.2 H02(b): o resíduo que a foto não explica, inclusive Indaiatuba

**Concentração (Fato).** Teste de Poisson por zona eleitoral, com a taxa nacional de resíduo por eleitor apto. São 6.106 zonas por turno, com corte de Bonferroni p < 8,2 × 10⁻⁶.

| | 1º turno | 2º turno |
|---|---:|---:|
| Zonas com resíduo | 253 | 273 |
| Passam no corte (Poisson) | 12 zonas, 122 eleitores | 14 zonas, 147 eleitores |
| Passam na sensibilidade (binomial negativa) | 1 (PB 21393/0073, 24) | 1 (PB 21393/0073, 35) |
| BH q < 0,05 (Poisson) | 23 | 24 |

- A dispersão entre zonas é grande (1/θ ≈ 19 a 23). Com ela, só uma zona continua fora do esperado nos dois turnos: PB 21393/0073, com 35 eleitores em 12 seções no 2º turno.
- As zonas que passam no Poisson incluem SP 65110/0211 (Indaiatuba: 20 eleitores no 2º turno, 17 no 1º), RJ 58408/0172, PI 11592/0010, cinco zonas da BA (38490, 39098, 36013) e três do PR.

**Forma, nas 166 seções-turno com resíduo dessas zonas, mais todas as de Indaiatuba (Fato):**

- **Persistência:** 143 de 166 (86,1%) têm resíduo também no outro turno, e 159 têm excesso no outro turno. No país inteiro, 79,9% das seções com resíduo no 2º turno o têm no 1º, e 88,3% no sentido inverso. A correlação de E′ entre os turnos é 0,61.
- **Ritmo:** a maior sequência de V2 sem foto na mesma urna é **3**, e nenhuma chega a 5. A maior rajada em 10 minutos é 5. Na última hora antes do encerramento caem 42 dos 613 V2 sem foto (6,9%), contra 2.202 de 42.242 votos (5,2%) nas mesmas seções.
- **Desvio contra a zona:** z robusto (mediana e MAD das outras seções da zona) da variação de comparecimento, da parcela do 13 no 2º turno e da variação dessa parcela. São 498 testes, com corte |z| ≥ 3,89. **Nenhuma seção passa.**
- **Seção nova:** não existir no cadastro de 2022 não muda a taxa de resíduo. A razão de taxas por eleitor é 1,03 (IC 95% de 0,69 a 1,56) no 2º turno e 1,20 (0,80 a 1,79) no 1º.

**Leitura pela regra do plano: propriedade do arquivo.** O resíduo se repete nos dois turnos (≥ 80%), não aparece em sequência e não acompanha desvio de comparecimento nem de voto.

**Indaiatuba, SP 65110/0211 (Fato; as seções com resíduo foram conferidas no BU bruto dos dois turnos):**

- a zona tem 84 seções com excesso no 2º turno: 600 eleitores de excesso, 687 V2 com foto entre 739 V2;
- em 66 delas, o cadastro público diz que **todos** os eleitores têm biometria;
- o resíduo é de 20 eleitores no 2º turno, em 7 seções, e de 17 no 1º, em 6;

| Seção | Excesso E (1º / 2º) | V2 (2º) | V2 com foto (2º) | Resíduo E′ (1º / 2º) |
|---|---|---:|---:|---|
| 0425 | 12 / 13 | 15 | 11 | 1 / 2 |
| 0426 | — / 13 | 13 | 12 | — / 1 |
| 0430 | 23 / 21 | 21 | 19 | 2 / 2 |
| 0437 | 40 / 39 | 41 | 36 | 3 / 3 |
| 0438 | 59 / 65 | 65 | 58 | 6 / 7 |
| 0440 | 22 / 24 | 25 | 21 | 3 / 3 |
| 0444 | 35 / 36 | 36 | 34 | 2 / 2 |

- **Leitura (Hipótese, a mais provável):** o bloco de seções 0425 a 0444 tem, no arquivo da urna, de 4% a 22% dos eleitores sem digital, e o cadastro público diz 100% com biometria. Quase todos esses eleitores têm foto. Uns poucos, de 1 a 7 por seção, não têm nem foto nem digital, nos dois turnos. É propriedade do arquivo, que é o mesmo nos dois turnos, e não ação de mesa.
- **O que o dado público não separa:** coleta pendente ou rejeitada, de um lado, e digitais tiradas do arquivo na geração da mídia, de outro. Os dois deixam o mesmo rastro.

### 1.3 H02(c): o 1º turno com as 27 UFs (Fato)

- 15.027 seções e 33.319 eleitores de excesso, com as agregadas do 1º turno lidas da cópia atual.
- Isso é **igual** ao número da errata do parecer 01 pela lente "alternativas". O número antigo do autor (12.276 e 24.864, com 26 UFs e sem SP) fica superado.
- A parcela explicada pela foto é de 98,66%, contra 98,64% no 2º turno, uma diferença bem abaixo de 5 pontos.

### 1.4 H02(d): seções fora do normal na liberação manual

Referência: beta-binomial da zona eleitoral, ajustada pelo método dos momentos nas outras seções da zona. Todas as seções tinham 10 ou mais vizinhas na zona, então os níveis de reserva não foram usados. Para o 2º turno, BH com q < 0,01 dá a triagem e Bonferroni (p < 1,0 × 10⁻⁷) dá a confirmação.

| | 1º turno | 2º turno |
|---|---:|---:|
| Seções testadas | 497.895 | 497.897 |
| Fora do normal (BH q < 0,01) | 221 (28.369 liberações à mão) | 159 (22.096) |
| Confirmadas (Bonferroni) | 144 (22.071) | 102 (15.795) |
| Liberação manual no país | 8.342.249 | 8.632.488 |
| Fora do normal por modelo de urna | UE2013 128, UE2015 56, UE2020 19, UE2022 18 | UE2013 93, UE2015 42, UE2020 10, UE2022 14 |

**Explicação das 159 do 2º turno (regra do plano):**

| Classe | Seções | Liberações à mão |
|---|---:|---:|
| Leitor: p1 abaixo do percentil 10 do modelo, ou menos de 10 reconhecidos | 94 | 14.881 |
| Crônico: também fora do normal no 1º turno, com a mesma urna | 19 | 2.506 |
| **Sem explicação técnica** | **46** | **4.709 (21,3%)** |

- p1 é a parcela, entre os eleitores reconhecidos, dos que a urna reconheceu na 1ª tentativa. O percentil 10 de p1 no 2º turno é 0,617 (UE2013), 0,597 (UE2015), 0,686 (UE2020) e 0,686 (UE2022).
- **Leitura pela regra do plano: pede explicação.** O grupo 3 passa de 5% das liberações à mão.
- Nas 46: o leitor reconhecia normalmente (p1 de 0,60 a 0,86), 19 trocaram de urna entre os turnos e 6 também estavam fora do normal no 1º turno, mas com outra urna.
- **Com desvio contra a zona** (138 testes, |z| ≥ 3,57): 3 seções, todas conferidas no BU bruto dos dois turnos:

| Seção | Modelo | Comparecimento 1º → 2º | Liberação manual 1º → 2º | p1 (2º) | z comparecimento | z parcela do 13 | 13 / 22 (2º) |
|---|---|---|---|---:|---:|---:|---|
| AM 02054/0042/0037 | UE2022 | 107 → 128 | 10 → 29 | 0,78 | 4,64 | 3,52 | 122 / 0 |
| AM 02631/0043/0047 | UE2022 | 262 → 274 | 38 → 64 | 0,70 | 4,27 | 4,02 | 271 / 1 |
| PR 74950/0016/0083 | UE2020 | 102 → 119 | 19 → 30 | 0,70 | 4,22 | 4,46 | 83 / 30 |

- Nas três, o comparecimento sobe entre os turnos mais do que na zona. A liberação manual sobe junto, e o leitor funciona para quem passa pela digital.
- Nas duas do AM, o 13 já tinha quase todos os votos no 1º turno (105 de 105 e 259 de 259 entre 13 e 22). A parcela alta é de reduto, não de mudança.
- **Hipóteses benignas** (não testáveis aqui): comunidade indígena ou rural com transporte organizado no 2º turno e digital gasta. A **maligna** é a brecha da H05.
- **Recomendação:** pedir o caderno de votação dos dois turnos dessas três seções.

### 1.5 Conclusão final da H02

Pela regra do plano: (a) explica, (b) dá "propriedade do arquivo" e (d) dá "pede explicação". Logo, **fato que pede explicação**.

| Parte | Resultado |
|---|---|
| Excesso sobre o cadastro (a, b, c) | **Refutado como sinal de liberação irregular.** O rastro técnico (foto sem digital no arquivo, 0 pedidos de digital, repetição entre turnos) explica 98,6% nos dois turnos, e o resíduo tem forma de arquivo. A divergência entre o cadastro público e o arquivo da urna continua sem explicação do TSE. Dado que falta para fechá-la: número de eleitores com digital e com foto **carregados na mídia da urna**, por seção; critério de `QT_ELEITORES_BIOMETRIA`; lista de zonas em revisão biométrica |
| Liberação manual fora do normal (d) | **Fato que pede explicação:** 46 seções, 4.709 liberações à mão, sem explicação técnica no dado público. 3 delas com comparecimento e voto fora do padrão da zona (123 liberações) |

**Efeito máximo × vencedor (Fato, aritmética):** 36.340 + 4.709 = 41.049 votos. Mesmo se todos fossem indevidos e do 13, a margem cairia para 4.389.142. **Não muda o vencedor.**

## 2. H05

### 2.1 H05(a): que tamanho de inserção o teste enxerga

**Base reproduzida (Fato):**

- Brasil: d = −0,0039, t = −2,60, com 497.622 seções. O estimador próprio e o da biblioteca (`mqEfeitoFixo`) dão o mesmo valor;
- SP: t = −5,59; PR: t = 2,74;
- as 9 especificações do parecer 27 dão exatamente: −2,60; +5,93; −3,81; −3,20; −0,03; −2,39; −2,22; +5,06; +5,09;
- o maior d de base entre as 9 é +0,0084.

**Simulação.** Na seção sorteada: +k votos do 13, +k comparecimento e +k na via, sem passar dos ausentes. Gerador mulberry32, semente 20261102, seções em ordem de chave, 20 réplicas por célula sorteada. Os padrões determinísticos (P7 e P8) são uma rodada só.

| Padrão | Via | D1 (o teste como está) | **D2 (linha de base descontada)** | D3 (robusto ao modelo) |
|---|---|---:|---:|---:|
| P1: 1% das seções | manual | 29.844 | **54.650** | 103.872 |
| P1: 1% das seções | sem biometria no arquivo | 33.993 | **33.993** | 81.983 |
| P2: 5% das seções | manual | 74.634 | **124.369** | 273.289 |
| P2: 5% das seções | sem biometria no arquivo | 60.721 | **94.356** | 169.902 |
| P3: 20% das seções | manual | 199.038 | **199.038** | 596.875 |
| P4: redutos do 13, 5% das seções | manual | 49.752 | **74.619** | 272.819 |
| P5: municípios inteiros (20% das seções) | manual | 4.265.292 | **4.265.292** | não vê até a margem |
| P6: zonas inteiras (20% das seções) | manual | 500.098 | **500.098** | 999.795 |
| **P7: todas as seções, proporcional** | manual | **não vê** | **não vê até 4.431.384** | **não vê** |
| P8: SP inteira (1 rodada) | manual | 4.385.283 | **4.385.283** | não vê |
| P8: MG inteira (1 rodada) | manual | 1.977.787 | **1.977.787** | 3.192.616 |
| P8: BA inteira (1 rodada) | manual | 1.709.253 | **1.709.253** | 1.709.253 |
| P8: PR inteira (1 rodada) | manual | 991.907 | **991.907** | 1.504.108 |

Cada número é o total de votos realmente inseridos (mediana das réplicas) no primeiro ponto da grade com detecção em 16 de 20 réplicas, ou em 1 de 1 no caso determinístico.

- **Fato:** a "detecção" pelo D1 em tamanhos pequenos (P1 com 29.844, P4 com 49.752) vem do PR, que já parte de t = 2,74. Com a linha de base descontada (D2), o tamanho mínimo sobe para 54.650 e 74.619.
- **Fato:** em P5 e P8 com SP, o teste só dispara quando a inserção é tão grande que bate no teto de ausentes de muitas seções. Aí ela deixa de ser uniforme. Inserção uniforme por município ou por UF é, na prática, invisível.
- **Fato (ponto cego principal):** a inserção espalhada por igual no país inteiro (P7) não move d em nenhum tamanho até a margem. O efeito fixo de município absorve tudo: z da diferença de 0,64 com 4.431.384 votos inseridos.
- **Fato (cego por desenho):** a inserção igual nos dois turnos e o exterior.

**Detector de nível N (Fato pré-registrado; o resultado o torna inútil como régua).** Ele mede a variação, entre os turnos, da parcela sem digital no comparecimento, em 2026 menos em 2022. Corte |z| ≥ 2,58 para 5 UFs.

| UF | Δ 2026 (p.p.) | Δ 2022 (p.p.) | z | Passa sem inserção? |
|---|---:|---:|---:|---|
| MG | +0,43 | −0,14 | 6,98 | sim |
| PR | −0,47 | −1,02 | 7,32 | sim |
| RS | +0,43 | −2,00 | 23,24 | sim |
| SC | +0,12 | −1,26 | 13,28 | sim |
| SP | +0,09 | −0,92 | 24,73 | sim |

- **Fato:** o detector N dispara **sem nenhuma inserção** em todas as UFs. Por isso ele não mede tamanho mínimo: qualquer inserção "passa" a partir de 1.000 votos, e isso não informa nada.
- **Exploratório (decomposição por via, feita depois de ver o resultado):**
  - a diferença entre os anos está quase toda na **liberação manual de 2022**, que caiu do 1º para o 2º turno: −2,0 p.p. no RS, −1,4 em SC, −1,0 no PR, −1,0 em SP e −0,3 em MG. Em 2026, a manual ficou estável: +0,23, −0,05, −0,49, −0,06 e +0,12;
  - a via "sem biometria no arquivo" subiu um pouco nos dois anos;
  - o comparecimento subiu mais em 2026 (+2,5% a +3,5%) do que em 2022 (+0,6% a +1,7%);
  - em eleitores, a diferença contra o padrão de 2022 soma 623.302 nas 5 UFs: SP 276.867, RS 167.367, MG 74.803, SC 65.692, PR 38.573.
- **Hipótese:** em 2022, algo reduziu a falha do leitor no 2º turno (procedimento, equipamento ou quem voltou a votar), e em 2026 isso não se repetiu. Com uma eleição só de base, não se separa "2022 foi atípico" de "2026 tem eleitor a mais sem digital".
- **Pendente:** decidir isso pede uma segunda linha de base. Seriam os diários do 2º turno de 2024 (capitais com 2º turno) ou de 2018, que não estão no disco.
- Mesmo que toda a diferença fosse inserção, 623.302 votos nas 5 UFs não chegam à margem. Nas seções do teste, essas 5 UFs somam 59.094.724 votantes no 2º turno.

### 2.2 H05(b): a explicação dos sinais de SP e do PR

**B1, comparando só seções do mesmo local de votação (Fato).**

- O mesmo E2, com efeito fixo de uf, município, zona e local do 2º turno: 475.585 seções em 72.420 locais. Ficam de fora 22.037 seções sozinhas no local.
- 56 testes, corte |t| ≥ 3,32. **Nenhum passa.**

| Recorte | d (13), mesmo município | t | d (13), mesmo local | t | Leitura |
|---|---:|---:|---:|---:|---|
| Brasil | −0,0039 | −2,60 | +0,0016 | 1,25 | — |
| **SP** | −0,0163 | **−5,59** | −0,0014 | −0,50 | **explicado por perfil entre locais** |
| **PR** | +0,0114 | 2,74 | +0,0098 | 2,13 | **inconclusivo** |

- Dentro do mesmo prédio, o sinal de SP desaparece. Ele vinha de comparar locais de perfil diferente no mesmo município.
- O do PR perde só 14% do tamanho e fica abaixo dos dois cortes.

**B2, as vias separadas, com o efeito fixo de município (Fato).** 6 testes, corte |t| ≥ 2,64.

| Recorte | Sem biometria no arquivo − biometria | t | Manual − biometria | t | Δ sem biometria / Δ manual (eleitores) |
|---|---:|---:|---:|---:|---|
| Brasil | +0,0089 | 0,86 | −0,0049 | **−3,49** | +311.284 / +290.322 |
| SP | −0,0423 | −2,51 | −0,0143 | **−4,35** | +80.736 / +40.140 |
| PR | **+0,1920** | **3,52** | +0,0104 | 2,51 | +3.000 / −18.338 |

- SP: o sinal passa pela via manual. A via do arquivo aponta para o mesmo lado, mas não passa no corte.
- PR: o sinal mais forte está na via "sem biometria no arquivo", que o leitor não afeta. Ele vem de um Δ líquido de só 3.000 eleitores, e o coeficiente é grande sobre uma base pequena.

**B3, linha de base de 2022 (Fato).**

- Mesmo E2, com efeito fixo de município, com as vias do diário de 2022 (V1 = digital; V2 + V3 = sem digital) e os votos do boletim de 2022.
- O E2 com as vias tiradas do boletim de 2022 dá o mesmo valor em todas as UFs.
- Universo de 2022 (MG, PR, RS, SC e SP): 220.218 seções. Saem:
  - 8 sem BU num turno: 2 urnas do Sistema de Apuração de SP no 1º turno e as demais do Sul e de MG;
  - 1 com aptos < 20;
  - 153 com aptos mudando mais de 10;
  - 62 com o diário diferente do comparecimento, inclusive SP 71072/0002/0310. O diário do 2º turno dessa seção confere com o `.vsc`, mas o 7z não abre ("cabeçalho truncado"): o arquivo publicado já está assim;
  - 18 com comparecimento do 1º turno < 20.

  Ficam 219.976.
- SP 2022: o zip de cada turno tem as 101.073 seções do `detalhe_votacao_secao_2022`, com SHA-512 de cada arquivo igual ao `.vsc` da seção. A V2 do diário confere com o boletim em 99,4% (1º turno) e 99,9% (2º) das seções, acima do corte de 99% do doc 26.
- Corte |z| ≥ 2,81 (10 testes).

| UF | d 2022 (t) | d 2026 (t) | 2026 − 2022 (z) | Leitura | Exploratório: 2026 − 2022 dentro do local (z) |
|---|---|---|---|---|---|
| MG | +0,0059 (1,78) | −0,0024 (−0,62) | −0,0083 (−1,65) | inconclusivo | +0,0052 (0,99) |
| **PR** | −0,0052 (−1,51) | +0,0114 (2,74) | **+0,0166 (3,04)** | **novo em 2026** | +0,0111 (2,06) |
| RS | −0,0027 (−0,79) | −0,0048 (−1,07) | −0,0021 (−0,37) | já existia em 2022 | +0,0011 (0,18) |
| SC | −0,0013 (−0,30) | −0,0131 (−2,29) | −0,0118 (−1,64) | inconclusivo | −0,0049 (−0,59) |
| **SP** | +0,0006 (0,26) | −0,0163 (−5,59) | **−0,0169 (−4,41)** | **novo em 2026** | −0,0032 (−0,97) |

- **Exploratório (dentro do local, feito depois de ver SP "explicado" em B1 e "novo" em B3):**
  - em SP, comparando seções do mesmo local, 2026 é igual a 2022 (d = +0,0018 em 2022, −0,0014 em 2026). O que mudou entre os anos foi o contraste **entre locais** do mesmo município. O eleitor a mais sem digital de 2026 veio mais de locais de perfil diferente;
  - no PR, dentro do local, a diferença cai para z = 2,06 e não passa no corte.

**Conclusão de (b), pela regra fixada:**

- **SP: explicado.** B1 dá "explicado por perfil entre locais". B3 mostra que esse contraste entre locais é novo em 2026 (z = −4,41). Dentro do local, 2026 é igual a 2022 (exploratório). O sinal de SP é de **composição**: de que locais veio o eleitor a mais. Não é de voto diferente entre eleitores comparáveis.
- **PR: não decidível com dados públicos.**
  - B1 é inconclusivo, então não é "persiste dentro do local", e a regra de "pede explicação" exige isso.
  - B3 diz que o sinal é **novo em 2026**, e B2 mostra o sinal na via que o leitor não afeta.
  - É um sinal pequeno, a favor do 13, que nenhuma explicação testada elimina.
  - **Dado que falta:** a via de habilitação de cada eleitor nos dois turnos. Só ela separa a mesma pessoa que muda de via de um eleitor a mais. Não é público.
  - **Tamanho (Fato pela simulação, não pelo d):** uma inserção que produzisse o salto do PR ficaria na casa de 3 mil votos ou mais (parecer 27). Mesmo dez vezes isso é menos de 1% da margem.

### 2.3 H05(c): as 97 seções de liberação em massa, uma a uma pelo diário

**Conferência (Fato):** 97 seções, 69 zonas, 23.050 votantes e 18.452 liberações à mão, iguais às do documento da liberação em massa. 96 delas têm 50 votos ou mais, o que explica a diferença para as 96 do doc 04 da biometria.

| Classe (regra do plano) | Seções | Votantes | Liberação à mão |
|---|---:|---:|---:|
| Padrão de leitor (falha desde a abertura, sem quebra no dia, p1 baixo) | 47 | 10.649 | 9.508 |
| Falha nova no 2º turno (mesma urna, abaixo de 20% no 1º turno) | 2 | 532 | 486 |
| Seletivo (compatível com uso da brecha) | 12 | 3.405 | 2.527 |
| Indeterminado | 36 | 8.464 | 5.931 |

**O que o diário mostra (Fato):**

- **Ponto de mudança no dia:** 34 seções têm quebra significativa na taxa de liberação manual (2.000 permutações, p < 0,05 ÷ 97). Entre as 36 indeterminadas, 26 têm quebra. Em 17 dessas 26, o leitor **melhora** depois da quebra: falha de manhã e volta a funcionar.
- **Quem autoriza:**
  - 11.357 liberações foram feitas por mesário registrado e 7.095 por digital que a urna não associou a nenhum mesário (`Digital coletada bate com uma digital gravada após o registro inicial…`);
  - em todas, a digital de quem autoriza foi reconhecida pelo mesmo leitor que não reconheceu as 4 capturas do eleitor. Isso não separa sensor ruim de brecha. A digital do mesário é batida contra poucos registros gravados naquela urna, e a do eleitor contra o cadastro (doc 04 da biometria).
- **"Já votou":** 19 avisos em 23.050 votos, 12 deles logo depois de uma liberação manual. A taxa nacional é de cerca de 0,09% dos votos, o que daria cerca de 21.
- **Mesma urna nos dois turnos:** 77 de 97.

**As 12 seletivas (Fato; todas conferidas no BU bruto do 2º turno):**

| Seção | Hora marcada | Quebra no dia (hora; manual antes → depois; p1 antes → depois) | Manual 1º → 2º | Mesário registrado / sem associação | Desvio |
|---|---|---|---|---|---|
| BA 36854/0180/0175 | 11h | não significativa | 51/306 → 260/339 | 183 / 77 | não |
| BA 36854/0180/0232 | 8h | 9h14; 0,60 → 0,97; 0,90 → 0,13 | 265/295 → 288/339 | 2 / 286 | não |
| BA 39136/0033/0228 | 10h | não significativa | 236/279 → 242/293 | 234 / 8 | não |
| BA 39330/0128/0179 | 11h | 9h07; 0,18 → 0,91; 0,51 → 0,73 | 190/206 → 162/234 | 151 / 11 | não |
| BA 39330/0128/0190 | 11h | não significativa | 276/296 → 297/320 | 277 / 20 | não |
| CE 14753/0047/0036 | 8h | não significativa | 157/212 → 177/223 | 170 / 7 | não |
| PR 75574/0065/0006 | 10h e 15h | 15h28; 0,59 → 1,00 | 74/237 → 155/243 | 148 / 7 | não |
| RJ 60011/0010/0302 | 8h | 10h58; 0,69 → 0,92; 0,68 → 0,79 | 224/284 → 241/312 | 229 / 12 | não |
| RJ 60011/0180/0113 | 12h e 13h | 9h23; 0,12 → 0,81; 0,70 → 0,65 | 27/263 → 164/268 (urna trocada) | 7 / 157 | não |
| SP 65110/0211/0302 | 11h | 11h17; 0,14 → 0,93; 0,74 → 0,22 | 15/249 → 131/256 | 12 / 119 | não |
| SP 68411/0155/0067 | 12h | 12h29; 0,94 → 0,63; 0,56 → 0,69 | 210/241 → 205/259 | 202 / 3 | não |
| SP 71072/0006/0427 | 10h | 10h49; 0,94 → 0,55; 0,17 → 0,84 | 40/309 → 205/319 (urna trocada) | 199 / 6 | não |

- **Exploratório:** em 4 das 12 (PR 75574/0065/0006, SP 65110/0211/0302, SP 68411/0155/0067, SP 71072/0006/0427), a hora marcada é a hora em que o leitor mudou de comportamento. A hora mistura antes e depois da quebra, e a regra por hora lê isso como seletividade. Em SP 65110/0211/0302, a p1 dos reconhecidos cai de 0,74 para 0,22 depois das 11h17, o que é compatível com degradação do leitor. Nas outras 8, a urna reconhecia na mesma hora 10 ou mais eleitores com p1 igual ou acima da mediana do modelo, enquanto liberava à mão a maioria.
- **Desvio contra a zona** (291 testes, |z| ≥ 3,76): 2 seções, ambas indeterminadas e nenhuma seletiva. BA 36854/0180/0149 tem comparecimento z = +4,38; PA 05436/0050/0432 tem comparecimento z = −3,77 (queda). Pelo BH (q < 0,05) são 5, nenhuma seletiva. Todas foram conferidas no BU bruto.
- **Limite declarado:** a inspeção física das urnas e dos leitores não é possível com dados públicos. O diário mostra o que a urna registrou, não o estado do sensor nem de quem era o dedo. "Padrão de leitor" é compatível com sensor degradado, inclusive degradado de propósito (princípio 8). Não é absolvição.
- **Recomendação:** pedir o caderno de votação dos dois turnos das 8 seletivas que não são hora de transição e das 2 com desvio.

### 2.4 Conclusão final da H05

Pela regra do plano, na ordem de precedência:

1. **Fato que pede explicação?** Não. SP está explicado (B1). O PR é não decidível pela regra, porque B1 não persiste. Nenhuma das 97 seletivas tem desvio.
2. **Refutada?** Inalcançável, como o plano já declarava (inserção igual nos dois turnos e exterior).
3. **Sem sinal nos dados públicos, com tamanho mínimo: sim.** As formas concentradas com tamanho mínimo finito estão na tabela de 2.1, com D2 de 33.993 a 500.098 votos e D3 de 81.983 a 999.795.
4. **Não decidível**, para as formas que o teste não vê:
   - inserção espalhada por igual (município, UF ou país);
   - inserção igual nos dois turnos;
   - o exterior;
   - o sinal do PR.

   **Dado que falta:** registro por eleitor da via de habilitação (inscrição + via + hora), por seção e turno, e o caderno de votação assinado. Só com eles se cruza quem foi liberado sem digital com óbitos, eleitores no exterior e reclamações de "já votou".

**Efeito máximo × vencedor (Fato):**

- Para virar o 2º turno com inserção a favor do 13, seria preciso inserir pelo menos 4.430.191 votos (margem do BU, igual à oficial: 64.256.232 × 59.826.041).
- **Teto aritmético:** 16.264.910 votos sem digital no 2º turno (7.251.810 sem biometria no arquivo, 8.632.488 liberações à mão e 380.612 do exterior). **A aritmética não exclui.**
- **As 97 seções e o exterior,** mesmo inteiros, não chegam à margem: 23.050 e 380.612.
- **O teste exclui** as formas concentradas acima dos tamanhos de 2.1. A margem é de 9 vezes (zonas inteiras) a mais de 100 vezes (1% das seções) o tamanho mínimo detectável.
- **O teste não exclui** uma inserção espalhada por igual do tamanho da margem (P7), nem uma inserção igual nos dois turnos.
- **Resposta:** com os dados públicos, **não dá para dizer** que o efeito máximo da H05 não muda o vencedor. Dá para dizer que nenhuma forma concentrada com esse tamanho passaria sem sinal e que nenhum sinal desse tipo aparece. Pelo princípio 8, a brecha continua aberta como risco.

## 3. Quantos testes, e o que é confirmatório

| Parte | Testes | Correção | Tipo |
|---|---:|---|---|
| H02(a) | 2 decisões (1 por turno) | — | confirmatório |
| H02(b) concentração | 6.106 zonas × 2 turnos | Bonferroni por turno; BH e binomial negativa como sensibilidade | confirmatório |
| H02(b) forma | 498 (166 seções-turno × 3) | Bonferroni (\|z\| ≥ 3,89) | confirmatório |
| H02(c) | contagem | — | descritivo |
| H02(d) | 497.895 + 497.897 seções; 138 de desvio | BH q < 0,01 (triagem), Bonferroni (confirmação); Bonferroni (\|z\| ≥ 3,57) | confirmatório |
| H05(a) | simulação | limiar de 56 testes (3,32) | calibração |
| H05(a) detector N | 5 | Bonferroni (2,58) | confirmatório (inútil como régua) |
| H05(b) B1 | 56 | Bonferroni (3,32) | confirmatório |
| H05(b) B2 | 6 | Bonferroni (2,64) | confirmatório |
| H05(b) B3 | 10 | Bonferroni (2,81) | confirmatório |
| H05(c) | 97 (quebra) + 291 (desvio) | Bonferroni; BH secundário | confirmatório |
| Exploratórios | decomposição de N por via; leitura das horas de transição; B3 com as vias do boletim; B3 dentro do local | — | exploratório |

## 4. Desvios do plano

1. **H05(a), D3 em toda a grade.** O plano previa D3 só no V em que D2 passasse e no seguinte. Calculei D3 em todos os pontos até ele também passar de 80%. É só mais cálculo, com os mesmos critérios. O tamanho mínimo D2 não muda.
2. **H05(a), V nominal × votos inseridos.** Com k inteiro por seção, arredondamento e teto de ausentes, o total inserido difere do V da grade. Em padrões proporcionais com V pequeno, dá 0 voto. As tabelas usam os votos realmente inseridos (mediana das réplicas).
3. **Detector N.** Ele dispara sem inserção em todas as UFs e não serve para medir tamanho mínimo. A decomposição por via e o tamanho em eleitores foram feitos depois de ver isso e estão marcados exploratórios.
4. **B3, sensibilidade com as vias do boletim de 2022.** Não estava no plano. Dá o mesmo d em todas as UFs.
   - Na primeira rodada, a leitura do boletim usava `compBio` como "por biometria" e dava d muito diferente do diário (PR +0,065).
   - O certo é `compBio − lib`: no boletim de 2022, `compBio` conta os com biometria cadastrada (V1 + V3) e `lib` os liberados à mão (V3), como em `estatistico-h13-v2-bu2022.mjs`.
   - Corrigi depois de ver a divergência. A versão pelo diário, que é a do plano, não mudou.
5. **H02(b), persistência também no país inteiro.** O plano pedia a persistência só nas seções das zonas que passam no corte. Relato as duas. A decisão usa a do plano (86,1%). A do país é 79,9% (2º → 1º) e 88,3% (1º → 2º).
6. **H02(d), "zona".** Usei a zona eleitoral (uf + zona). Nenhuma seção precisou dos níveis de reserva (município, ou UF com modelo).
7. **Código de coleta.** `sp` entrou na lista de UFs autorizadas de `coleta-2022-mg.mjs` (commit 1989f56, junto com o adendo).
8. **Ordem de execução.** B1, B2 e B3/N sem SP rodaram antes de SP 2022 chegar (`sinais-sem-sp.json`). Os números de MG, PR, RS e SC não mudam com SP, porque cada UF é estimada só com as próprias seções. A versão final (`sinais.json`) tem as 5 UFs e os cortes do adendo.
9. **B3 dentro do local.** Não estava no plano. Foi feito depois de ver SP "explicado" em B1 e "novo em 2026" em B3, e está marcado exploratório.

## 5. Conferências rodadas

| Conferência | Resultado |
|---|---|
| Excesso do 2º turno contra o parecer 01 | 16.011 seções e 36.340 eleitores, iguais |
| Grupo das 378 (E ≥ 10) | 84,8% de foto; 5.560 → 54, iguais |
| 1º turno contra a errata do parecer 01 | 15.027 e 33.319, iguais |
| Foto e V2: arquivo do horário (frente H13) × releitura independente dos diários (caminho de `cetico-b1a-log.mjs`) | 15.027 de 15.027 (1º) e 16.011 de 16.011 (2º) seções iguais em V2 e em foto; V2 = BU em todas |
| sha256 dos arquivos de horário usados | `horario-1t.jsonl` 3a54fd59…bbde6e; `horario-2t.jsonl` 360a2825…fb2812 (em `foto.json`) |
| E2 e as 9 especificações do parecer 27 | iguais nas duas casas decimais; o estimador próprio da simulação é igual ao da biblioteca |
| 97 seções | 97, 69 zonas, 23.050 e 18.452, iguais |
| 2022: seções por UF | MG, PR, RS e SC iguais às dos docs 24 e 26; SP com 101.073 por turno, igual ao `detalhe_votacao_secao_2022`, com SHA-512 conferido contra o `.vsc` em todas; votos do 13 no `votacao_secao_2022` iguais ao BU de 2022 nas 219.976 seções do teste |
| Margem do 2º turno | BU = resultado oficial: 64.256.232 × 59.826.041 = 4.430.191 |
| BU bruto (`src/exportar.js --log nao`) | 36 seções-turno citadas como extremas (Indaiatuba, as 3 da H02(d), as 12 seletivas, as com desvio), 36 de 36 iguais ao banco. Em 9, o exportador marca `_erroVerificacao: DER: comprimento ausente` na verificação do lacre, limitação de ferramenta já registrada nos pareceres 06 e 08. O conteúdo do BU não é afetado |
| Gate | `node --check` em todos os scripts novos; `npm test`: 139 de 139; busca de sequências de 12 dígitos nas saídas |

## 6. Riscos e limites que ficam

- **H05, forma espalhada:** nenhum teste com dados públicos enxerga inserção uniforme do tamanho da margem. É o limite principal deste fechamento.
- **Detector N:** a diferença entre 2026 e 2022 na liberação manual entre os turnos (623.302 eleitores nas 5 UFs) fica sem explicação. Uma segunda linha de base resolveria.
- **PR:** sinal pequeno, novo em 2026 e não explicado. O tamanho dele é de milhares de votos, não de milhões.
- **H02(d):** as 46 seções sem explicação técnica só se fecham com o caderno de votação.
- **Arquivo da urna × cadastro:** a divergência (339.963 eleitores com foto e sem digital, só no 2º turno) é fato do TSE. Pelo princípio 8, esse grupo votou sem nenhum controle técnico de identidade.
- **Fonte de terceiros dentro do repo:** os arquivos de horário são da frente da H13. A releitura independente bateu 100% nas seções com excesso. Fora delas (a parcela de foto no país), o número vem só do arquivo do horário, sem segunda leitura.
- **Escolha de modelo:** o E2 continua dependente de especificação (parecer 27). Os tamanhos D3 são o que resiste a isso.

## 7. Como reproduzir

```sh
# H02(a)(b)(c): excesso, foto e concentração (~15 min; lê os perfis de 2022)
node --max-old-space-size=8192 scripts/auditoria/estatistico-h02-h05-final-foto.mjs
# releitura dos diários das seções com excesso e forma do resíduo (~30 min)
node --max-old-space-size=6144 scripts/auditoria/estatistico-h02-h05-final-foto-log.mjs
# H02(d): seções fora do normal na liberação manual (~1 min)
node --max-old-space-size=8192 scripts/auditoria/estatistico-h02-h05-final-outliers.mjs
# H05(a): poder (~35 min)
node --max-old-space-size=8192 scripts/auditoria/estatistico-h02-h05-final-poder.mjs 20
# SP 2022: coleta, conferência e diário (adendo 1)
node scripts/auditoria/coleta-2022-mg.mjs --uf sp --etapas catalogo
node scripts/auditoria/coleta-2022-mg.mjs --uf sp --etapas zips --pausa-s 30
node scripts/auditoria/coleta-2022-mg.mjs --uf sp --turno 1 --etapas conferir   # e --turno 2
node --max-old-space-size=8192 scripts/auditoria/estatistico-h13-v2-diario2022.mjs --uf sp --turno 1   # e --turno 2, depois --juntar
node scripts/auditoria/estatistico-h13-v2-bu2022.mjs --uf sp
# H05(b) e detector N (~2 min)
node --max-old-space-size=8192 scripts/auditoria/estatistico-h02-h05-final-sinais.mjs
# H05(c): as 97 seções (~1 min)
node --max-old-space-size=6144 scripts/auditoria/estatistico-h02-h05-final-massa.mjs
# tetos e margem; números derivados; BU bruto das seções citadas
node scripts/auditoria/estatistico-h02-h05-final-teto.mjs
node scripts/auditoria/estatistico-h02-h05-final-resumo.mjs
node scripts/auditoria/estatistico-h02-h05-final-bruto.mjs <lista "turno uf/mun/zona/seção">
```

## 8. Arquivos

- **Scripts** (`scripts/auditoria/`):
  - `estatistico-h02-h05-final-foto.mjs`, `-foto-log.mjs`, `-outliers.mjs`, `-poder.mjs`, `-sinais.mjs`, `-massa.mjs`, `-teto.mjs`, `-resumo.mjs` e `-bruto.mjs`;
  - `-diario.mjs`, o leitor de diário por atendimento usado em `-foto-log` e `-massa`.
- **Saídas** (`data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/`):
  - H02: `foto.json`, `foto-secoes-<t>t.jsonl`, `foto-zonas-<t>t.csv`, `foto-residuo-alvo.jsonl`, `foto-log.json`, `outliers.json`, `outliers-2t.csv`;
  - H05: `poder.json`, `sinais.json` (e `sinais-sem-sp.json`, a rodada antes de SP), `massa.json`, `massa.csv`;
  - comuns: `teto.json`, `resumo.json`, `bruto.json`, os logs de cada rodada e da coleta de SP.
- **SP 2022:**
  - zips em `data/raw/2022/<t>t/zip/`, com o manifesto em `data/manifest/2022/`;
  - diário e boletim em `data/parsed/auditoria/estatistico/h13-v2/` (`secoes-sp-2022-diario.csv`, `sul2022/bu2022-sp.csv`).

Nenhum título de eleitor ou de mesário nem CPF foi gravado. As seções citadas foram conferidas no BU bruto.
