# 16. Parecer: tópico 8 da perícia (a virada do 2º turno), itens marcados com ⚠

Revisado: [docs/pericia/08-virada-do-2-turno.md](../../pericia/08-virada-do-2-turno.md), com as fontes do autor: [modelos/T14/sintese.md](../modelos/T14/sintese.md), [comparacao-turnos/02](../comparacao-turnos/02-resultado-nacional.md), [teste-integridade/01](../teste-integridade/01-poder-de-deteccao.md) e [pesquisas/01](../pesquisas/01-vespera-1t-2t.md). Pedido da sessão −64. Revisão em 29/10/2026.

**Universo (princípio 9): completo.** Todos os números deste parecer saem das 499.207 seções pareadas das 28 unidades (27 UFs e exterior), lidas dos perfis dos BUs dos dois turnos. Os perfis do 1º turno já têm SP, TO e o exterior (103.656, 4.384 e 1.310 seções, iguais ao 2º turno). Nenhuma seção existe em um turno só e nenhuma tem pacote duplicado. A única exclusão são as 31 seções do Sistema de Apuração (tipo 3: 2 em MG e 29 no exterior), que não têm comparecimento no BU. O 1º turno do banco ainda está sem SP, TO e exterior, e por isso **não** foi usado. Do banco usei só dados do 2º turno: a tabela `voto_oficial`, para a curva, e o local de votação da tabela `secao`. O extrator independente reproduz os totais oficiais exatamente: 13 com 53.879.538 e 64.256.232 votos, 22 com 56.104.503 e 59.826.041, eliminados com 9.321.993, brancos e nulos com 5.969.801 e 4.153.801.

Várias fontes do autor ainda são **parciais**, de antes de o 1º turno de SP entrar: a regressão de Goodman (27 UFs, sem SP), os eliminados nas seções limpas (34.218 seções), a habilitação (480.635) e o parecer 06 (25 UFs). Abaixo estão os números refeitos com o universo completo.

## Vereditos

| # | Item ⚠ do tópico 8 | Veredito | Em uma linha |
|---|---|---|---|
| 1 | Flávio reteve 100%; passagem 22→13 "praticamente zero em todas as 27 UFs" | **Refutado como Fato** (o número reproduz) | O estimador dá taxas negativas, que são impossíveis (até −7,6% por UF). Tem viés de vários pontos, e a especificação muda o coeficiente de 1% para 3,2%. O teste direto mostra o 22 **perdendo** de 0,7% a 4% da sua base nas seções limpas com poucos eliminados |
| 2 | Eliminados: 51% para Lula, 49% para Flávio | **Refutado como Fato** (o número reproduz) | É um artefato do modelo. Sem regressão, nas mesmas 47.306 seções, o 13 ficou com **73,2%** do saldo. Os itens 1 e 2 não podem ser verdadeiros ao mesmo tempo |
| 3 | O ganho de Lula acompanha os votos do Flávio "só em 1%"; teto de 1,1 milhão; "Lula ainda venceria por mais de 3 milhões" | **Coeficiente sustentado; teto refutado** | O 1% só limita uma troca uniforme proporcional ao 22, e só nessa especificação. Uma troca proporcional aos votos do 13, ou concentrada onde o 13 é forte, não aparece nesse coeficiente: o termo da base do 13 vale 4,2%, ou ~4,2 milhões na margem. O teste citado em `test/comparar-turnos.test.js` não existe |
| 4 | Modelo da urna e dia da carga: "os únicos desvios fora do acaso são pequenos e contra Lula" | **Sustentado com ressalvas** (conclusão de que não há padrão técnico); **frase refutada** | Com SP, o UE2022 dá +0,105 pp **a favor** de Lula, fora do acaso pelo desenho do autor. O "acaso" foi mal calculado. Dentro do mesmo local de votação, nenhum modelo se desvia (\|desvio\| ≤ 0,06 pp, p ≥ 0,2) e nenhum dia de carga sai do acaso (\|desvio\| ≤ 0,17 pp; menor p = 0,04 em 17 datas) |
| 5 | A "queda regular" da curva vem da ordem de chegada dos municípios | **Sustentado com ressalvas**; a "contraprova" (o teste acharia fraude) é **refutada** | A forma reproduz. Mas o teste tem poder zero contra votos alterados: com uma troca de 3,7% injetada, a comparação continua igual (0,90 × 0,96 pp) |
| 6 | Teste de Integridade: "1 em 10¹⁶" para desvio de 2,3% | **Sustentado com ressalvas** (a conta) | A aritmética está certa. Mas a premissa não está documentada: o resultado do teste com biometria não foi obtido, e só há declaração de TSE, SP e AL. O "2,3%" é parcela do total de votos, não dos votos do 22. O modelo voto a voto não cobre desvio condicionado |

## Dois defeitos que atravessam os itens

**A. Gerador aleatório quebrado (Fato).** Os scripts `separa-desvio-de-transferencia.mjs`, `virada-por-atributo-tecnico.mjs` e `curva-totalizacao.mjs` usam `semente = (semente * 1103515245 + 12345) % 2 ** 31`. O produto passa de 2⁵³, e o número perde os bits baixos em ponto flutuante. O gerador entra em ciclo depois de ~0,5 a 6 mil passos, com ciclo de ~10,5 mil valores, e 99,6% dos estados são pares (sementes 777, 12345 e 2026 entram em ciclo nos passos 4.092, 5.937 e 451; o teste está no fim deste parecer). O bootstrap e as permutações sorteiam centenas de milhares de vezes dentro de um ciclo de 10 mil, então as réplicas não são independentes. Consequências medidas:
- o intervalo de b sai [0,007; 0,010] no autor e [0,007; **0,012**] com gerador correto (mulberry32, 500 réplicas);
- as permutações do item 4 subestimam o acaso, ver o item 4.

A curva quase não muda (2,59 e 0,96 pp com os dois geradores). **Recomendação:** trocar o gerador nos três scripts.

**B. Todo teste entre turnos é cego a fraude de mesmo nível nos dois turnos (Fato, por construção).** Os itens 1 a 4 medem a **mudança** do 1º para o 2º turno. Uma troca constante de x% dos votos do 22 nos dois turnos entra quase inteira nos dois lados da diferença e some. Isso não é detalhe:
- uma troca constante de 3,7% nos dois turnos decidiria o 2º turno (o 22 venceria por ~0,17 milhão) e deixaria a "virada" quase igual;
- o tópico 8 declara esse ponto cego só para a biometria (Limites 1) e precisa declará-lo para todos os testes entre turnos;
- só testes de nível, dentro de um turno, alcançam essa fraude. O Teste de Integridade é um deles.

---

## Item 1. "Quem votou no Flávio no 1º turno continuou com ele: permanência 1,00 e passagem 22→13 praticamente zero em todas as 27 UFs"

**Reprodução (Fato).** `scripts/transferencia-votos.mjs`, agora com as 28 unidades (499.176 seções):
- 22→22 = 1,001, 22→13 = −0,031, 13→13 = 1,019 e 13→22 = −0,039;
- por UF, 22→13 vai de **−0,076 (BA)** a **+0,042 (AP)**;
- a síntese, sem SP, dava de −0,08 a +0,04. O número reproduz.

**Bug ou método.** Não há bug de leitura. O estimador de Goodman (regressão por seção, sem restrição a [0, 1]) dá taxas negativas para 22→13 e 13→22 no nacional. Por UF, 22→13 é negativo em 23 das 28 unidades. Taxa negativa não existe: é viés do estimador, de pelo menos 3 a 4 pontos no nacional e de até 7,6 pontos por UF. Um coeficiente com viés desse tamanho não mostra que a passagem real é "praticamente zero". Ele só mostra que ela não é grande o bastante para aparecer **acima** do viés. Os outros sinais vão na mesma direção:
- outros coeficientes fora de [0, 1]: "outros" → 22 = 0,728 e abstenção = −0,252; brancos e nulos → abstenção = −0,272;
- o cientista político apontou o mesmo ([cientista-politico/01](../cientista-politico/01-balanco-turnos.md)).

**Explicação alternativa testada (fora do texto): "troca pequena e espalhada do 22 para o 13, legítima ou não".** Nas seções limpas (|Δcomparecimento| e |Δbrancos e nulos| ≤ 0,5% dos aptos, ≥ 50 votantes), sem regressão (`cetico-t8-regressao.mjs`, bloco 5):

| Votos de eliminados no 1T | Seções | Votos do 22 no 1T | Δ22 | Δ13 | Parte do saldo com o 13 |
|---|---:|---:|---:|---:|---:|
| 0–1% | 109 | 3.765 | **−151 (−4,0%)** | +277 | 220% |
| 1–2% | 235 | 12.658 | **−302 (−2,4%)** | +1.068 | 139% |
| 2–4% | 1.270 | 108.460 | **−745 (−0,7%)** | +9.791 | 108% |
| 4–6% | 2.313 | 264.609 | +3.200 (+1,2%) | +24.606 | 89% |
| 6–10% | 5.209 | 687.934 | +25.433 (+3,7%) | +77.451 | 75% |
| ≥ 10% | 2.753 | 363.720 | +33.713 (+9,3%) | +56.716 | 63% |

Onde quase não havia voto de eliminado e nada mais mudou, o 22 **perdeu** votos líquidos e o 13 ganhou mais do que todos os eliminados juntos. Nas seções dominadas pelo 13 (13 ≥ 70%, eliminados < 4%, 766 seções), o 13 ganhou 763 votos além de **todos** os eliminados, e o 22 perdeu 600 (−2,2%). Isso exige troca líquida 22→13 ou rotatividade de eleitores (gente diferente votando em cada turno). É o mesmo fenômeno que o [parecer 05](05-h10-crescimento-cabe-no-disponivel.md) encontrou em MA, AM e TO. **Fato:** a "permanência de 100%" não vale nessas seções. **Hipótese:** o tamanho é pequeno, e a causa (troca de voto, rotatividade ou desvio) não se separa com os arquivos públicos.

Regressão em razão com intercepto (Δ22/F = intercepto + d·E/F, seções limpas com F ≥ 20): intercepto = **−1,8%**. Isso indica uma perda uniforme de 1,8% da base do 22 que não depende dos eliminados. Com o termo L/F, o intercepto cai para −0,8%.

**Poder.** O estimador descarta passagem grande, de mais de ~5 pontos, se o viés não a compensar. Ele **não** descarta uma passagem de 3,7% da base do 22, que é o tamanho que vira o resultado. As especificações razoáveis dão de −3,1% a +3,2% para a mesma grandeza (item 3).

**Veredito: refutado como Fato.** É estimativa ecológica (deduz comportamento a partir de totais por seção) com viés demonstrado. Deve ser rotulada Hipótese, e a frase "continuou com ele" deve sair da "Resposta curta".

## Item 2. "Para onde foram os votos dos eliminados? Cerca de metade para cada lado (51% / 49%)"

**Reprodução (Fato).** O `separa-desvio-de-transferencia.mjs` do autor e o meu `cetico-t8-regressao.mjs`, escrito do zero, dão o mesmo nas 47.306 seções limpas (4.609 municípios, 28 UFs): a = 0,507 [0,484; 0,532] e d = 0,485 [0,461; 0,508].

**Bug ou método.** O 51/49 vem do modelo Δ13 = a·E + b·F + c·L, sem intercepto (E = votos dos eliminados no 1T, F = votos do 22 e L = votos do 13). O modelo atribui ao "voto dos eliminados" só a parte do ganho do 13 que é **proporcional a E**. O resto vai para os termos da base do 13 e da base do 22. Nas seções limpas, o ganho do 13 se divide assim:
- 486.107 votos pelo termo dos eliminados (a·E);
- 58.282 pela base do 22 (b·F);
- **191.813 pela base do 13 (c·L, c = 0,042)**.

Numa seção sem mudança de comparecimento nem de brancos e nulos, o eleitor do 13 já votava no 13, e c·L não pode ser "o 13 ganhando os próprios eleitores". Esses 191.813 votos são uma de três coisas:
- eleitores dos eliminados que foram mais para o 13 onde o 13 já era forte (efeito de contexto);
- troca 22→13 concentrada onde o 13 é forte;
- desvio proporcional aos votos do 13.

**Medida direta, sem regressão (Fato):** nas mesmas 47.306 seções, o 13 ficou com **73,2%** do saldo (Δ13 = 736.015 e Δ22 = 269.291, contra 958.586 votos de eliminados). O `eliminados-secoes-limpas.mjs` do autor, agora com SP, dá 40.369 seções e **71,7%**; a síntese, parcial, dava 34.218 e 72,5%. A parcela vai de 54% a 95% conforme o peso dos eliminados na seção. Se o voto dos eliminados se dividisse sempre na mesma proporção, ela seria constante.

Com um termo de contexto (o eleitor dos eliminados se divide conforme a fatia local do 13), o eliminado iria 42% para o 13 onde o 13 não tem votos e **115%** onde só ele tem. Taxa acima de 100% também é impossível: o modelo linear não capta o que acontece.

**Contradição interna (Fato).** O tópico afirma ao mesmo tempo que "o Flávio reteve 100%" (item 1) e que "os eliminados se dividiram 51/49" (item 2). Nas seções limpas, as duas coisas juntas são impossíveis:
- se o 22 reteve tudo e nada mais mudou, o ganho do 13 só pode ter vindo dos eliminados, e então foram cerca de 73%, não 51%;
- se foram 51%, cerca de 250 mil votos dessas seções (~4% da base do 22) vieram de eleitores do 22 ou de rotatividade.

A síntese T14 traz os 72,5% na Objeção 1 e os 51% no "teste da proporção" sem conciliar os dois.

**Veredito: refutado como Fato.** A divisão do voto dos eliminados não é identificável com dados agregados. O que se mede é que o 13 ficou com ~72–73% do saldo onde só havia voto de eliminado para disputar. Quanto disso é eleitor dos eliminados e quanto é eleitor do 22, os arquivos não separam.

## Item 3. "O ganho de Lula acompanha os votos do Flávio? Só em 1%. Mesmo que fosse fraude, mudaria a diferença em ~1,1 milhão"

**Reprodução (Fato).** b = 0,010; com gerador correto, IC [0,007; 0,012]. O intervalo do autor, [0,007; 0,010], é estreito demais por causa do defeito A. Os 1,1 milhão saem de 2 × 0,0098 × 56,1 milhões. Pelo próprio modelo, a perda do 22 é e = −0,005, não −b, e o efeito na margem seria 0,83 milhão. Com o limite superior do IC (0,012), seria 1,35 milhão.

**Bug ou método.**
1. **O teste citado não existe.** A "Contraprova" diz que "com dados simulados, uma troca de x% aparece como coeficiente de cerca de x (`test/comparar-turnos.test.js`)". Esse arquivo tem 6 testes: resíduo, migração mínima, aptos, MAD, marcação e finalistas. Nenhum testa a regressão. A propriedade vale, e eu a verifiquei por injeção nos dados reais: uma troca uniforme de 1% move b em +0,010 e uma de 3,7% move b em +0,037. A citação precisa mudar.
2. **O 1% não é um teto de fraude.** A injeção mostra para onde vai cada tipo de troca (`cetico-t8-regressao.mjs`, bloco 4):

| Troca injetada nas seções limpas | Votos movidos | Δb | Δc | Δa |
|---|---:|---:|---:|---:|
| 1% de todos os votos do 22 | 62.374 | **+0,010** | −0,001 | +0,005 |
| 3,7% de todos os votos do 22 (vira o resultado) | 229.877 | **+0,037** | −0,001 | +0,018 |
| 3,7% do 22 só onde o 13 teve ≥ 50% no 1T | 42.602 | **−0,006** | +0,017 | +0,001 |
| 4% dos votos do 13, tirados do 22 | 213.716 | +0,001 | **+0,041** | +0,021 |
| 20% dos votos de eliminados, tirados do 22 | 191.750 | 0,000 | 0,000 | **+0,200** |

   O teste só enxerga a troca **uniforme e proporcional aos votos do 22**. Uma troca concentrada onde o 13 é forte faz b **cair**. Uma troca proporcional aos votos do 13 aparece em c, e o c real é 0,042. Extrapolado para o país, c vale **+2,24 milhões para o 13 e −1,94 milhão para o 22, ou 4,18 milhões na margem**, quase toda a diferença final (4,43 milhões). O autor declarou como "único caso não coberto" a troca proporcional aos eliminados. Faltaram as proporcionais à base do 13 e as concentradas por reduto, que são justamente as que um ataque "que segue proporções locais" teria ([cientista-politico/03](../cientista-politico/03-plausibilidade-achados.md)).
3. **O coeficiente depende da especificação.** Com o termo de contexto (E × fatia do 13), b sobe para **0,032** e e cai para −0,026. A mesma conta do autor daria (0,032 + 0,026) × 56,1 milhões ≈ **3,25 milhões** na margem: Lula ainda venceria, por ~1,2 milhão, não "por mais de 3 milhões". Pelo intercepto em razão, 1,8% dá ~2,0 milhões.
4. **O coeficiente varia por UF:** b vai de −0,008 (GO) a **+0,057 (RN)**, com RJ +0,042, CE +0,042 e DF +0,044. As UFs com b alto coincidem com as do intercepto negativo do 22 no [parecer 05](05-h10-crescimento-cabe-no-disponivel.md): RN −8,2% e RJ −5,2%. **Hipótese a examinar** (RN, RJ, CE e DF), não Fato de troca.
5. **Extrapolação.** O teto aplica um coeficiente das seções limpas (9,5% das seções e 4,6 milhões de votos do 22) ao país inteiro. Ele vale só se as seções limpas forem representativas, e elas não são: são selecionadas pela estabilidade. Pelo princípio 9, a conta precisa ser declarada como extrapolação.

**Explicações alternativas.** A transferência dos eliminados com efeito de contexto foi testada: ela explica c, mas eleva b. A troca proporcional à base do 13 foi testada por injeção e o teste não a separa do efeito de contexto. A rotatividade não é testável com arquivo público ([parecer 05](05-h10-crescimento-cabe-no-disponivel.md)).

**Veredito: o coeficiente se sustenta com ressalvas; o teto de 1,1 milhão é refutado como limite de fraude.** O texto correto é: "o ganho do 13 não acompanha a base do 22 de forma uniforme, o que descarta uma troca uniforme de mais de ~1–3% dos votos do 22, conforme o modelo. Trocas que sigam a força local do 13 não são descartadas por este teste".

## Item 4. "O ganho de Lula muda com o modelo da urna ou com o dia de preparação? Não a favor de Lula. Os únicos desvios fora do acaso são pequenos e contra Lula"

**Reprodução (Fato).** `virada-por-atributo-tecnico.mjs` com as 28 UFs (492.964 seções) dá: UE2013 +0,03 pp, UE2015 −0,04, UE2020 −0,07 e **UE2022 +0,11**, com "acaso" (p95) de 0,07. **Pelo critério do próprio autor, o UE2022 está fora do acaso e a favor de Lula.** Os números da síntese (UE2020 −0,18; demais de +0,06 a +0,08) eram parciais, sem SP. Na carga, 17/09 continua com −1,07 pp.

**Bug ou método.**
1. **O gerador quebrado (defeito A) e o nulo errado.** Com gerador correto, a permutação seção a seção dá p < 0,005 para UE2015 (−0,040), UE2020 (−0,074) e UE2022 (+0,105). Na carga, 13 de 18 dias ficam "fora do acaso", nos dois sentidos. Isso diz mais sobre o nulo do que sobre as urnas: modelo e dia de carga são distribuídos **por local de votação**, e os locais diferem politicamente dentro do município. Permutar seção a seção quebra esse agrupamento e encolhe o acaso.
2. **Controle correto: comparar dentro do mesmo local de votação** (`cetico-t8-atributo-tecnico.mjs`, só locais com mais de um modelo ou mais de uma data):

| Atributo | Dentro do município (desenho do autor) | Dentro do local de votação |
|---|---|---|
| UE2013 | +0,032 (p 0,40) | +0,055 (p 0,20) |
| UE2015 | −0,040 (p < 0,005) | −0,020 (p 0,24) |
| UE2020 | −0,074 (p < 0,005) | +0,000 (p 0,98) |
| UE2022 | **+0,105 (p < 0,005)** | −0,000 (p 0,99) |
| Carga 17/09 | **−1,066 (p < 0,01)** | −0,173 (p 0,18) |
| Menor p da carga, dentro do local | — | 25/09: +0,048 (p 0,04), 1 em 17 datas, o esperado por acaso |

   Dentro do mesmo local, **nada** sai do acaso: modelos com \|desvio\| ≤ 0,06 pp e datas de carga com \|desvio\| ≤ 0,17 pp. Os desvios do desenho do autor, a favor ou contra Lula, são geografia abaixo do município, não atributo da urna.
3. **Poder (Fato, por injeção):** uma troca de 0,5% dos votos do 22 só nas UE2020 muda o desvio do UE2020 em +0,28 pp; com 1%, em +0,46 pp; com 3,7%, em +1,72 pp. O ruído dentro do local é ~0,03 pp. O teste pega desvio **ligado a um modelo ou a um lote de carga** a partir de ~0,2–0,5% dos votos do 22.

**O que o teste não descarta:** alteração igual em todas as urnas (todas rodam a versão 10.23, como o autor declara) e fraude de mesmo nível nos dois turnos (defeito B).

**Veredito: sustentado com ressalvas.** A conclusão (não há padrão técnico a favor de Lula) fica **mais forte** com o controle por local. A frase "os únicos desvios fora do acaso são pequenos e contra Lula" é falsa com o universo completo e deve ser trocada.

## Item 5. "A queda regular do Flávio durante a apuração é estranha? Não. Ela se repete mantendo só a ordem em que cada município transmitiu"

**Reprodução (Fato).** `curva-totalizacao.mjs` dá:
- 499.205 seções;
- totais iguais aos oficiais;
- pico de 50,46% aos 22% apurados (19:59);
- final de 48,25% aos 98%;
- diferença máxima de 2,59 pp mantendo a ordem das UFs e de 0,96 pp mantendo a ordem dos municípios.

Com gerador correto e 100 embaralhamentos (`cetico-t8-curva.mjs`), os resultados são os mesmos. A contagem em ordem aleatória fica entre 48,0% e 48,25%, quase reta. Pela hora média de totalização, chegaram por último, além do Nordeste, do Rio e de São Paulo, também **MG** (20:27). MA, AL, RN e PB chegaram antes (19:45–20:12).

**Bug ou método.** Nenhum na leitura. O teste, porém, é **circular contra fraude**: a curva real e a contrafactual são montadas com os **mesmos votos**, e só a ordem muda. Ele responde se a forma da curva exige algo além da ordem de chegada. Não responde se os votos estão certos. Agrupar por 5.570 municípios conserva quase toda a variação política entre seções, e a curva contrafactual já nasce parecida com a real.

**Explicação alternativa testada: "a curva esconde troca de votos".** Injetei uma troca uniforme de 3,7% do 22 para o 13 (vira o resultado). O final do 22 cai para 46,43%, e a diferença máxima entre a curva real e a embaralhada por município fica em 0,90 pp, contra 0,96 pp sem troca. Com a troca só nas seções que chegaram depois da mediana do próprio município, a diferença é de 0,62 pp. **O teste não enxerga nenhuma das duas.**

**Veredito: sustentado com ressalvas** para a afirmação restrita: a forma da curva vem da ordem de transmissão. Fica **pendente** a diferença de até 0,96 pp nos primeiros 2–6% apurados. **Refutado** o uso como contraprova: o bullet "Teste da curva" da seção "Contraprova (o teste é capaz de achar fraude?)" deve sair dali ou dizer que esse teste não tem poder contra votos alterados.

## Item 6. "Se uma urna desviasse 2,3% dos votos do Flávio, a chance de o teste com biometria não perceber seria de 1 em 10¹⁶"

**Reprodução (Fato).** Com (1 − x)^n, n = 1.574 e x = 2,3%, a chance é 1,2 × 10⁻¹⁶. Com n = 156 (TSE), é 0,027. A tabela de [teste-integridade/01](../teste-integridade/01-poder-de-deteccao.md) reproduz inteira (`cetico-t8-teste-integridade.mjs`).

**Bug ou método.**
1. **A premissa não está nos autos.** O próprio documento do autor diz que o relatório do teste com biometria "traz só a participação, não as divergências". Os 3.280 são participantes da 2ª parcial (18h), não votos conferidos com resultado publicado. O "1 em 10¹⁶" é condicional a um resultado que o projeto não obteve. É **Hipótese condicional**, não Fato.
2. **"Segundo o TSE e os TREs" exagera.** Há declaração do TSE (389 votos), de SP (só o título da notícia; a página dá 403) e de AL. Não há declaração dos outros 24 TREs.
3. **Princípio 8.** O resultado é declarado pela própria Justiça Eleitoral, que executa o teste. Pelo doc 01, procedimento humano não conta como controle, e "fiscais acompanharam" não reduz o risco. Só o relatório por urna (cédulas × BU × RDV), conferível nos arquivos, conta. O tópico 8 já rotula "Fato (declarado pelo TSE)", mas em "Limites 2" escreve "o que descarta isso: o Teste de Integridade". A frase correta é "o que **poderia** descartar, quando os relatórios forem obtidos".
4. **"2,3% dos votos do Flávio" está errado.** Os 2,8 milhões da síntese são 2,2% de **todos** os votos, mas 4,5% dos votos que o 22 teria. A troca mínima que vira o resultado é de 2,215 milhões, ou 3,6–3,7% dos votos do 22. O erro é conservador: com x = 3,7%, a chance cai para 10⁻²⁶. Mesmo assim, o número precisa ser corrigido.
5. **n = 1.574 supõe 48% de cédulas para o 22.** A composição das cédulas sorteadas não está documentada.

**Explicação alternativa testada (fora do texto): desvio que só começa depois do k-ésimo voto da urna.** O modelo (1 − x)^n supõe que cada voto tem a mesma chance de ser desviado. Um desvio que só age a partir do k-ésimo voto nunca seria exercitado numa urna de teste com menos de k votos. São ~195 cédulas por urna no teste comum (estimativa do autor) e ~55 a 110 votantes por urna no teste com biometria (3.280 votantes em ~30 a 60 urnas: 5–10% das urnas do teste, mínimo de 1 por UF). No 2º turno, 24% dos votos estão depois do 200º voto da seção e 61% depois do 100º. Para virar o resultado, esse desvio teria de pegar 6,1% (k = 100), 8,8% (k = 150) ou 15,3% (k = 200) dos votos do 22 dados depois do k-ésimo voto. **O rastro existiria nos dados:** o ganho líquido do 13 por votante cresceria com o tamanho da seção. Dentro do município:

| Votantes da seção (2T) | Seções | Real | Simulado k = 100 | k = 150 | k = 200 |
|---|---:|---:|---:|---:|---:|
| 30–150 | 17.587 | −0,38 pp | −2,33 | −2,90 | −2,53 |
| 150–200 | 54.474 | −0,37 | −1,01 | −1,80 | −2,58 |
| 200–250 | 126.716 | −0,05 | −0,21 | −0,42 | −1,13 |
| 250–300 | 193.521 | +0,13 | +0,24 | +0,34 | +0,48 |
| 300–350 | 96.245 | −0,02 | +0,24 | +0,49 | +1,06 |
| ≥ 350 | 10.438 | −0,11 | +0,24 | +0,56 | +1,30 |

O gradiente real (~0,5 pp, que volta a cair acima de 300) é 4 a 8 vezes menor que o de qualquer desvio desse tipo grande o bastante para virar o resultado. **Fato:** um desvio por limiar de votos, uniforme e do tamanho da virada, fica descartado por este rastro. **Não descartado:** limiar combinado com seleção de seções, e desvios menores. O gradiente real de 0,5 pp equivale a poucas centenas de milhares de votos, se fosse desvio, e fica como Hipótese fraca.

**Veredito: sustentado com ressalvas.** A conta está certa. A frase do tópico precisa dizer que (a) o resultado do teste com biometria não foi obtido, (b) a declaração é de TSE, SP e AL, (c) x é fração dos votos do 22, de 3,7% para virar, e (d) a conta supõe desvio voto a voto.

---

## Divergências com outros pareceres

| Documento | O que diz | Relação com o tópico 8 |
|---|---|---|
| [cetico 05](05-h10-crescimento-cabe-no-disponivel.md), problema 3 | "Troca 22→13 ≈ 0" não é robusta: intercepto do 22 de −4% a −8% em MA, RN, RJ e AM; o 22 perde votos em seções sem queda de comparecimento em MA, AM e TO | **Contradiz** o item 1 como Fato. Confirmado aqui: b por UF chega a +0,057 (RN) e +0,042 (RJ); intercepto nacional de −1,8%; o 22 perde de 0,7% a 4% nas seções limpas com poucos eliminados. O tópico 8 não cita o parecer 05 |
| [cetico 05](05-h10-crescimento-cabe-no-disponivel.md), poder | O balanço não detecta troca abaixo de 6,2% dos votos do 22; a que vira o resultado é de 3,7% | **Confirma** a ressalva do item 3: "a conta fecha" não é absolvição |
| [cetico 06](06-comparecimento-extra-sem-vies-biometria.md) | Cego a fraude de mesmo nível nos dois turnos; números de 25 UFs (sem SP, TO e exterior) | O tópico 8 reproduz o 06 como Fato **sem a marca de parcial** (princípio 9). O ponto cego vale para todos os testes entre turnos (defeito B), não só para a biometria |
| [cientista-politico/01](../cientista-politico/01-balanco-turnos.md) | Goodman com SP: 14→13 0,46; 55→13 0,42; 70→13 0,58; coeficientes fora de [0, 1] tornam os números Hipótese. Em GO, pelo menos 37% dos votos de Caiado, ou de eleitores do 22, foram para o 13 (limite determinístico) | **Contradiz** o rótulo Fato dos itens 1 e 2. O limite de GO não separa eleitor de Caiado de eleitor do 22, o mesmo problema de identificação do item 2 |
| [cientista-politico/03](../cientista-politico/03-plausibilidade-achados.md) | Retenção de 1,0 e redutos estáveis são "compatíveis com voto real, mas não excluem um ataque desenhado para seguir proporções locais" | **Confirma** o item 3: a troca que segue a força local do 13 vai para c (0,042), não para b |
| [cientista-politico/04](../cientista-politico/04-linha-de-base-historica.md) | 73,6% do disponível com o maior finalista está na faixa histórica (65–74%); o que é novo em 2026 é o volume (+4,0% de votos nominais) | Compatível. Nada no tópico 8 o contradiz |
| [T14/sintese](../modelos/T14/sintese.md) | Objeção 1: 72,5% para o 13 (parcial); teste da proporção: 51/49 | Contradição interna não conciliada (item 2) |

## Correções sugeridas ao texto do tópico 8

1. **Resposta curta, 3º marcador.** Trocar "Fato: os votos de quem votou no Flávio no 1º turno continuaram com ele" por: "**Fato:** a virada fecha com os votos dos eliminados, com os ex-brancos e nulos e com quem não tinha ido votar. Nas seções em que nada mais mudou, Lula ficou com cerca de 73% do saldo. **Hipótese:** quanto disso veio de eleitores dos eliminados e quanto de eleitores do Flávio mudando de lado não dá para separar com dados por seção. As estimativas não mostram uma passagem grande do Flávio para Lula, mas têm erro de alguns pontos".
2. **Tabela, linha "Quem votou no Flávio continuou com ele?"** Rótulo **Hipótese**. Texto: "A estimativa não mostra passagem grande do 22 para o 13 (no país, −3,1%; por UF, de −7,6% a +4,2%). Taxas negativas são impossíveis e mostram que a estimativa erra por alguns pontos. Onde quase não havia voto de eliminado, o 22 perdeu de 0,7% a 4% dos votos ([cético 16](../analysis/cetico-revisor/16-topico-8-virada.md), [cético 05](../analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md))". Trocar "27 UFs" por "28 unidades (27 UFs e exterior)".
3. **Linha "Para onde foram os votos dos eliminados?"** Rótulo **Hipótese**. Texto: "Nas 47.306 seções em que nada mais mudou, Lula ficou com 73% do saldo, que nelas é quase todo voto dos eliminados. Um modelo estatístico chega a 51/49, atribuindo parte do ganho de Lula à força dele em cada seção. Os dados não decidem entre as duas leituras".
4. **Linha "O ganho de Lula acompanha os votos do Flávio?"** Texto: "Pouco: 1% (intervalo de 0,7% a 1,2%). Isso descarta uma troca uniforme proporcional aos votos do Flávio de mais de ~1 a 3%, conforme o modelo. Mesmo no modelo menos favorável, essa troca mudaria a diferença em até ~3,3 milhões, e Lula ainda venceria. **Não descarta** uma troca que siga a força local de Lula (proporcional aos votos dele ou concentrada nos redutos dele): esse tipo de troca não aparece neste teste". Rótulo: Fato para o número e **Limite** declarado.
5. **Linha "modelo da urna / dia de preparação".** Texto: "Não. Comparando urnas do mesmo local de votação, nenhum modelo e nenhum dia de carga se afasta do acaso (desvios de até 0,06 pp por modelo e 0,17 pp por dia). Os desvios que aparecem comparando o município inteiro, para os dois lados (UE2022 +0,11 pp a favor de Lula; carga de 17/09 −1,07 pp), vêm da geografia: cada local recebe urnas de um modelo e de um dia. O teste pegaria troca ligada a um modelo a partir de ~0,5% dos votos do Flávio; não pega alteração igual em todas as urnas".
6. **Linha da curva.** Manter a resposta, acrescentando: "A comparação usa os mesmos votos e só muda a ordem; por isso ela explica a forma da curva, mas não testa se os votos estão certos". Trocar "Nordeste, Rio e São Paulo" por "BA, SP, SE e RJ, depois PI, CE, PE e MG".
7. **Linha do Teste de Integridade.** Trocar "Não, segundo o TSE e os TREs" por "Não, segundo o TSE, o TRE-SP e o TRE-AL. Os outros TREs e o resultado do teste com biometria ainda não foram obtidos". Trocar "2,3% dos votos do Flávio" por "3,7% dos votos do Flávio (o que viraria o resultado)" e "1 em 10¹⁶" por "1 em 10²⁶, **se** o teste com biometria não teve divergência e **se** o desvio agisse voto a voto". Rótulo do cálculo: **Hipótese condicional**.
8. **Contraprova, 1º bullet.** Tirar a referência a `test/comparar-turnos.test.js`, que não contém esse teste. Citar a injeção em `scripts/auditoria/cetico-t8-regressao.mjs` (bloco 4) e acrescentar que o teste só enxerga troca uniforme proporcional aos votos do 22.
9. **Contraprova, 3º bullet (curva).** Tirar da lista de testes "capazes de achar fraude", ou dizer explicitamente que ele não tem poder contra votos alterados: uma troca de 3,7% injetada não muda a comparação.
10. **Limites.** Acrescentar um item: "Todos os testes que comparam o 1º com o 2º turno são cegos a uma fraude do mesmo tamanho nos dois turnos. Uma troca constante de 3,7% decidiria o 2º turno sem deixar marca na 'virada'. Contra isso só valem testes de um turno só, como o Teste de Integridade". Em Limites 2, trocar "O que descarta isso" por "O que poderia descartar isso, quando os relatórios por urna forem obtidos".
11. **Limites 1 (fora dos ⚠, número parcial).** "Cerca de 480 mil votos a mais sem digital" era sem SP. Com as 28 unidades, a variação é de +311.361 sem biometria cadastrada e +290.182 liberados por ano de nascimento, **+601.543** no total. Dos +2.960.096 votantes a mais, 78,3% entraram por biometria (não 74,3%), e as liberações manuais sem mesário caíram 430.423 (não 337.664) (`scripts/habilitacao-1t-2t.mjs`). Também é preciso dizer que a variação líquida **não** é o tamanho máximo da porta: substituições que se compensam não aparecem no saldo. O texto do parecer 06 (25 UFs, 389.827 seções) precisa da marca **parcial** até ser refeito com SP, TO e o exterior.
12. **Rótulos.** "Fato ⚠ (estimativa estatística)" é contraditório: estimativa ecológica é Hipótese (doc 01, princípio 4).

## Recomendações (para quem for refazer os testes)

- Trocar o gerador aleatório em `separa-desvio-de-transferencia.mjs`, `virada-por-atributo-tecnico.mjs` e `curva-totalizacao.mjs`.
- No `virada-por-atributo-tecnico.mjs`, comparar dentro do local de votação, ou permutar por bloco de local.
- Estimador de transferência com restrição a [0, 1] e incerteza (King/Rosen), já listado na síntese, item 4. Até lá, as taxas são Hipótese.
- Examinar RN, RJ, CE e DF, onde b é alto (+0,042 a +0,057), cruzando com o intercepto negativo do parecer 05 e com a habilitação no log.
- Teste de nível, de um turno só, contra troca que siga a força local do 13. A cadeia de assinaturas e o Teste de Integridade por urna são os únicos com poder contra ela.

## Comandos

```sh
node --max-old-space-size=8192 scripts/auditoria/cetico-t8-extrair.mjs             # ~3 min; data/parsed/auditoria/cetico/t8-secoes.jsonl (499.207 seções pareadas)
node --max-old-space-size=8192 scripts/auditoria/cetico-t8-regressao.mjs           # itens 1–3; saída t8-regressao.stdout
node --max-old-space-size=8192 scripts/auditoria/cetico-t8-atributo-tecnico.mjs   # item 4 (usa a cópia de leitura do banco); t8-atributo-tecnico.stdout
node --max-old-space-size=8192 scripts/auditoria/cetico-t8-curva.mjs               # item 5; t8-curva.stdout
node --max-old-space-size=8192 scripts/auditoria/cetico-t8-teste-integridade.mjs   # item 6; t8-teste-integridade.stdout
# scripts do autor, rodados sem alteração com as 28 unidades:
node scripts/separa-desvio-de-transferencia.mjs; node scripts/teste-desvio-uniforme.mjs; node scripts/transferencia-votos.mjs
node scripts/virada-por-atributo-tecnico.mjs; node scripts/eliminados-secoes-limpas.mjs; node scripts/habilitacao-1t-2t.mjs
node --max-old-space-size=8192 scripts/curva-totalizacao.mjs
```

O teste do gerador (o ciclo do LCG do autor) está em três linhas: `semente = (semente * 1103515245 + 12345) % 2 ** 31`, repetido até um estado se repetir. Com as sementes 777, 12345 e 2026, a repetição aparece depois de 14.558, 16.403 e 10.917 passos.
