# T14: a virada do 2º turno de 2026 é possível sem fraude? Síntese da discussão

29/10/2026. Participantes: GPT Astra (estatístico forense), Kimi 3 (engenheiro de segurança), Grok (cientista político) e Claude (coordenador). Duas rodadas: posições independentes e depois resposta às posições dos outros. Prompts, respostas e hashes ficam nas subpastas.

## A pergunta

No 1º turno, Flávio Bolsonaro (22) liderou por 2.224.965 votos. No 2º turno, Lula (13) venceu por 4.430.191. É a primeira virada num 2º turno presidencial desde 1989. O auditor considera a virada impossível e pediu prova incontestável do contrário.

## Resposta curta

- **A virada é aritmeticamente possível e não exige voto impossível.** Os quatro participantes concordam.
- **Não dá para afirmar "está tudo certo" de forma incontestável com os dados públicos.** Os quatro concordam. O que falta está listado no fim.
- **Nenhum dos testes feitos achou rastro de fraude capaz de explicar a virada.** O maior canal ainda aberto (habilitação sem biometria) tem tamanho conhecido, e a parte dele que mudou entre os turnos é menor que a margem.

## Fatos (medidos neste projeto)

| Teste | Resultado | O que descarta |
|---|---|---|
| Conta nacional (dados abertos do TSE) | Ganhos de Lula (+10,38 mi) e Flávio (+3,72 mi) = eliminados (9,32 mi) + aumento de comparecimento (2,96 mi) + queda de brancos/nulos (1,82 mi). Aptos idênticos nos dois turnos (158.745.502) | Votos sem origem |
| Soma dos BUs × resultado oficial, 2º turno, presidente | Igual em 499.205 de 499.205 seções | Alteração na transmissão ou totalização, **se** o BU publicado for o BU da seção (ver "o que falta") |
| Soma dos votos × comparecimento, por seção | Igual em todas as 357.845 seções comparadas, nos dois turnos | Urna com mais votos que votantes |
| Troca mínima obrigatória, mesma seção | 9 seções exigem troca para o 13 (17 eleitores no total), 1 para o 22 (24). Nenhuma seção com voto impossível | Inversão grosseira de votos dentro da urna |
| Regressão por seção (27 UFs, sem SP) | Retenção: Lula 1,01, Flávio 1,00. Troca 22→13 entre −0,08 e +0,04 em todas as UFs. Eliminados divididos (Renan 0,50 e Caiado 0,44 para Lula; Cury 0,57), com variação regional (Caiado→Lula 0,91 na BA, 0,20 no MS) | Desvio proporcional aos votos do Flávio. **Limite:** inferência ecológica, com coeficientes fora de [0,1]; não prova comportamento individual |
| Horário | 458 votos depois das 18h de Brasília no 2º turno (26 UFs) | A prorrogação até 19h como fonte da virada |
| Carga das urnas | Mesma carga nos dois turnos em todas as urnas que serviram nos dois | Recarga de software entre os turnos, salvo contingência |
| Habilitação, aumento de comparecimento (27 UFs, sem SP) | +2,03 mi votantes: 74,3% por biometria do próprio eleitor; 23,7% (480.635) sem biometria (ano de nascimento ou liberação manual), contra 12,7% na base; 39.635 no exterior, sem detalhe. Liberações manuais sem mesário associado caíram 337.664 | — (canal aberto, abaixo) |
| Liberação sem biometria acima do cadastro (B1a, outra equipe) | 2º turno: 16.011 seções com mais liberações "sem biometria cadastrada" do que o cadastro registra, somando 36.340 eleitores; 1º turno: 12.276 seções | — (canal aberto; pode ser defasagem do cadastro, **[a confirmar]**) |

## O canal ainda aberto

Pela premissa 8 (nunca confiar em pessoas), um mesário conivente pode liberar alguém no lugar de um eleitor ausente usando título e ano de nascimento. Isso não deixa biometria e não aparece na contagem nem na regressão.

- **Tamanho do canal que mudou entre os turnos:** no máximo +480.635 votos sem biometria a mais no 2º turno (27 UFs). Mesmo no pior caso, todos fraudulentos e todos para um lado, ficam abaixo da margem de 4,43 milhões e do ganho de 10,38 milhões de Lula.
- **Tamanho total do canal:** cerca de 13 milhões de votos sem biometria por turno (12,8–12,9% nos dois). Esse universo não pode ser validado só com dados públicos. Para ter produzido a virada, a fraude precisaria mudar de direção entre os turnos, o que o padrão de retenção (~1,00 para os dois finalistas) não mostra.
- **Direção do sinal:** o ganho de Lula se correlaciona mais que o de Flávio com o aumento sem biometria (0,18 × 0,09), mas também com o aumento por biometria (0,50 × 0,41). Os modelos leram isso como mobilização maior de eleitores de Lula em todos os canais, o que não é assinatura típica de injeção por mesário. A correlação é fraca e não separa as hipóteses.

## Onde os participantes divergiram

| Ponto | Divergência | Como fica |
|---|---|---|
| Prior histórico (nunca houve virada) | Grok deu peso; Kimi e Astra disseram que 8 eleições não formam base de probabilidade | É argumento político, não técnico. Não entra como prova de nada |
| Confiança do Astra (0,95) | Grok: mistura aritmética com lisura | O próprio Astra esclareceu que 0,95 é sobre a possibilidade matemática, não sobre a lisura |
| Teto de trocas pequenas (Kimi: 10 × 357.845 ≈ 3,6 mi) | Astra: a troca mínima não limita a troca real | A medição mostra só 17 + 24 eleitores de troca obrigatória; trocas escondidas em seções com muita abstenção só são limitadas pela regressão |
| 5.246 votos | Astra apontou que eu chamei de arredondamento | Erro meu, corrigido: é diferença entre dois arquivos oficiais do TSE, a reconciliar pelos BUs |

## Posição final do Claude

**Plausível, confiança 0,70; "incontestável" não.** A contagem, a soma e a totalização não mostram rastro de fraude, e a virada se explica pelos eliminados, pelos ex-brancos/nulos e pelo comparecimento. O canal que a premissa 8 deixa aberto (habilitação sem biometria) existe nos dois turnos, mas a parte que mudou é pequena demais para virar a eleição sozinha. Ainda precisa de teste por seção para saber se foi usado.

## O que falta para chegar perto de "incontestável"

1. Incluir SP (22% do eleitorado) em todos os testes por seção. Depende do perfil do 1º turno, que está rodando.
2. Regressão por seção com os canais de habilitação separados (biometria, ano de nascimento, manual), com controles e por UF (proposta convergente dos quatro).
3. Teto por seção: liberações sem biometria ÷ aptos sem biometria no cadastro, nos dois turnos; e a data do cadastro usado.
4. Estimador de transferência com restrição a [0,1] e incerteza (King/Rosen) no lugar de Goodman.
5. Verificação nacional de assinaturas e hashes (hoje só o AC inteiro).
6. **Fora do alcance dos dados públicos:**
   - comparar os BUs publicados com cópias impressas ou digitais obtidas por partidos e fiscais;
   - verificar o bloco de software CEPESC;
   - cruzar nominalmente quem se absteve no 1º turno e votou no 2º.

   Isso só é possível com o TSE ou por via judicial.
7. Reconciliar os 5.246 votos entre os arquivos oficiais do 1º turno.

## Depois da discussão: objeções do auditor e testes adicionais (29/10/2026)

**Objeção 1: "os eliminados eram de direita; não faz sentido irem para Lula".** Teste direto, sem regressão, em 34.218 seções "limpas" (comparecimento e brancos/nulos variaram ≤ 1% dos aptos), onde o ganho dos finalistas só pode vir dos eliminados. Os votos que eles liberaram terminaram **72,5% com Lula**: 65% onde Caiado dominou, 72% onde Renan Santos dominou, 78% onde Cury dominou; 57% em GO. `scripts/eliminados-secoes-limpas.mjs`. **Fato:** o resultado reforça a pergunta do auditor. **Limite:** saldo líquido não exclui renovação de eleitores dentro da seção.

**Objeção 2: "eleitor do Bolsonaro não migra para Lula".** Os dados concordam: retenção de Flávio ≈ 1,00 e troca 22→13 ≈ 0 em todas as UFs; a virada não exige eleitor do Flávio mudando de lado. A disputa é sobre os 9,3 milhões que não votaram no Flávio no 1º turno.

**O que os arquivos não separam:** (a) eleitores dos eliminados votaram em Lula ou (b) a urna gravou 13 para quem digitou 22. Se os eliminados tivessem ido 70% para Flávio, um desvio de ~2,8 milhões (~2,3% dos votos) explicaria o resultado com BU, RDV e log coerentes entre si, porque saem do mesmo software. **Hipótese, não afirmação.**

**Teste técnico (dentro do mesmo município):** o ganho Lula − Flávio não varia com o modelo da urna (UE2013, UE2015 e UE2022 entre +0,06 e +0,08 pp; UE2020 −0,18 pp, contra Lula; acaso até 0,08 pp) nem com o dia da carga (único desvio fora do acaso, 17/09, −1,07 pp, contra Lula). `scripts/virada-por-atributo-tecnico.mjs`. **Fato:** não há padrão técnico a favor de Lula. **Limite:** todas as urnas rodam a mesma versão (10.23); uma alteração uniforme do software não apareceria neste teste.

**Controle externo à urna** (detalhes e conta em [teste-integridade/01](../../teste-integridade/01-poder-de-deteccao.md))**:** o Teste de Integridade do 2º turno (urnas sorteadas votando com cédulas de papel conferidas) não teve divergência, segundo o TSE: 389 votos em 2 urnas no TSE, testes simultâneos nas 26 capitais e no DF, 23 urnas em AL ([TSE](https://www.tse.jus.br/comunicacao/noticias/2026/Outubro/teste-de-integridade-do-2o-turno-no-tse-confirma-correspondencia-entre-cedulas-e-votos-nas-urnas), [AL](https://www.cadaminuto.com.br/noticia/2026/10/27/eleicoes-2026-23-urnas-eletronicas-foram-auditadas-durante-o-2-turno-em-al)). É o teste desenhado contra desvio de software. Pela premissa 8 ele é executado pela própria Justiça Eleitoral, com fiscais. **Pendente:** obter os relatórios completos (urnas, votos por cédula) e calcular a chance de um desvio de 2,3% passar sem divergência.

**Pesquisas de 2º turno:** não localizadas ainda as da véspera (Datafolha, Quaest). Datafolha de março/2026: Lula 46% × Flávio 43% (via Reuters). **[a confirmar]**.

**Teste da proporção (separa desvio de transferência), 47.306 seções limpas, 28 UFs:** eliminados → 13 = 0,51 [0,50; 0,53], eliminados → 22 = 0,49 [0,46; 0,50]; base do 22 → 13 = 0,010 [0,007; 0,010]. O ganho do 13 acompanha os votos dos eliminados, não a base do 22. Mesmo que o componente de 1% fosse fraude, seriam ~0,56 milhão de votos (efeito de ~1,1 milhão na margem de 4,43 milhões). Único caso não coberto: um algoritmo que desviasse exatamente na proporção dos eliminados daquela seção no 1º turno; só auditoria de código e Teste de Integridade descartam. `scripts/separa-desvio-de-transferencia.mjs`, `scripts/teste-desvio-uniforme.mjs`.

**Curva da totalização (hipótese levantada pelo auditor: subida do 22 e queda regular).** Reconstruída pela hora de totalização de cada seção (`DT_PRIM_TOT_PARCIAL_HOR_TSE`): o 22 sobe de 48,2% (2% apurado) para 50,5% (22%, 19:59) e cai até 48,2%. **Fato:** a curva não é a de uma contagem aleatória (que seria reta em 48,2%). **Fato:** mantendo a hora de chegada de cada UF e embaralhando as seções dentro dela, a queda se reproduz; as últimas UFs (BA, SP, SE, RJ, PE, CE, MG, PI) chegam por volta de 20h30. **Pendente:** diferença de até 2,6 pp no início e ~0,5 pp no meio, que a ordem das UFs não explica (ordem dentro da UF; testar por município). A curva é a soma, na ordem de chegada, dos BUs assinados; o teste decisivo contra "BU manipulado por algoritmo" é a verificação nacional de assinaturas. `scripts/curva-totalizacao.mjs`.

**Pesquisas de véspera ([pesquisas/01](../../pesquisas/01-vespera-1t-2t.md)):** no 2º turno, os grandes institutos tinham Flávio à frente (50,5–51%) e o resultado ficou fora da margem (Flávio 48,21%). Isso é anomalia registrada. No 1º turno o erro foi no sentido contrário (Flávio subestimado em ~3 pontos), e o instituto mais certeiro do 1º turno (Vox) foi o único a dar Lula à frente no 2º. As pesquisas não servem como verdade em nenhum dos dois turnos.

**Curva da totalização, teste por município (29/10/2026):** mantendo a hora em que cada **município** chegou e embaralhando as seções dentro dele, a curva reproduz a subida e a queda do 22. A diferença máxima para a curva real cai de 2,59 pp (ordem das UFs) para 0,96 pp, só nos primeiros 2–6% apurados (ordem das seções dentro da cidade). A partir de ~70% apurado as curvas coincidem (real 48,79% × 48,76–48,78% aos 78%; 48,25% × 48,26–48,27% aos 98%). **Fato:** a forma da curva é a ordem de transmissão dos municípios. `scripts/curva-totalizacao.mjs`.

**Teste de Integridade com biometria ([teste-integridade/01](../../teste-integridade/01-poder-de-deteccao.md)):** pela Portaria TSE 765/2024, eleitores reais da seção habilitam a urna com a própria digital e o voto digitado vem de cédula sorteada. Para o software, é um dia de votação real com resultado conhecido; fecha a brecha do software que "percebe" o teste. 3.280 participantes no 2º turno de 2026.

**Exceção do PR (parecer 06 do cético):** dentro do município, d = +0,015 para o 13 por eleitor a mais sem biometria; somado no estado, 142 votos, em 421 zonas, sem concentração (10 maiores = 22%). SC dá o inverso (+0,016 para o 22). `scripts/pr-sem-biometria-por-zona.mjs`.

**Números com as 28 UFs (princípio 9, 29/10/2026; saídas em `data/parsed/auditoria/coordenador/*-28ufs.txt`):** regressão nacional em 499.176 seções: 13→13 1,019, 22→22 1,001, 22→13 −0,031; 14→13/22 0,457/0,438; 55→13/22 0,428/0,533; 70→13/22 0,569/0,283; brancos/nulos→13 0,765; abstenção→13/22 0,063/0,034. Habilitação: Δcomparecimento +2.960.096, por biometria +2.318.918 (78,3%), sem biometria +601.543 (20,3%; base 1T 12,2%), manual sem mesário −430.423. Seções limpas (40.369): 71,7% para o 13. Atributo técnico: UE2022 +0,11 pp para o 13 dentro do município (acaso p95 0,07), ~20 mil votos na margem; carga 17/09 −1,07 pp (contra o 13). Substituem os números de 27 UFs acima.

**UE2022 dentro do local de votação:** comparando seções do mesmo local (mesmo prédio), o desvio por modelo some (UE2022 −0,00 pp, UE2020 0,00, UE2015 −0,02, UE2013 +0,05; acaso p95 0,09). O +0,11 pp dentro do município vinha da alocação das urnas novas. `scripts/virada-por-atributo-tecnico.mjs --local`.

**MA, AM e TO (parecer 05):** nas seções em que o 22 perdeu sem queda de comparecimento, a entrada a mais foi pela biometria do próprio eleitor no AM (+2.445 por biometria × +259 sem digital) e no TO (+1.567 × −116). No MA, +9.238 × +4.203 (31% sem digital), mas o voto sem digital subiu em todo o MA (+3.669 nas demais seções, onde a biometria caiu 49.682). `scripts/perda-22-sem-queda.mjs`.
