# 57. Parecer: fechamento da H02 e da H05

Achado revisado: [estatistico-eleitoral/30-h02-h05-resultado-final.md](../estatistico-eleitoral/30-h02-h05-resultado-final.md) (commit d2d63cd), com o plano pré-registrado [29](../estatistico-eleitoral/29-h02-h05-plano-final.md) (commit 45dc471; adendo de SP no 1989f56), os scripts `scripts/auditoria/estatistico-h02-h05-final-*.mjs` e as saídas em `data/parsed/auditoria/estatistico-eleitoral/h02-h05-final/`. Base anterior: pareceres [01](01-b1a-sem-biometria-acima-do-cadastro.md) (errata), [27](27-h05-28ufs.md), [31](31-mesa-e-leitor.md) e [54](54-h13-fechamento.md).

Data: 02/11/2026. Base: cópia de leitura `eleicao2026-20261029T105000` (28 UFs nos dois turnos), zips públicos do `perfil_eleitor_secao` de 2022 e 2026, `votacao_secao_2022_BR.zip`, diários e boletins de 2022 de PR e SP (frente H13) e os diários de 2026 pelo `src/exportar.js`.

Rótulos: **Fato** (script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**.

## Resposta curta

| # | Afirmação do doc 30 | Veredito |
|---|---|---|
| 1 | H02(a)(c): a foto explica 98,64% do excesso (sobram 493 em 423 seções; 1º turno 447 em 383) | **Sustentado.** Reproduz exatamente com cadastro lido direto dos zips públicos. A foto confere no diário bruto em 30 de 30 seções. Com a correção da foto que já existe entre eleitores sem biometria legítimos, o resíduo dobra (927), mas a parcela explicada fica em 97,45%, ainda acima de 95% |
| 2 | O defeito de denominador do parecer 54 atinge a H02? | **Não atinge.** E corrige o parecer 54: as 14 seções de MG não têm "perfil de julho fora de data". São **seções principais de agregadas** cujo perfil não foi somado ao da agregada. A H02 soma as agregadas, e nenhuma seção do país tem aptos acima do cadastro |
| 3 | H02(d): 159 fora do normal; 46 sem explicação técnica (4.709); 3 com desvio | **Números reproduzidos exatamente; a classificação é frágil.** 18 das 46 tiveram **urna trocada no próprio dia** (rastro técnico no BU, 2.415 liberações, 34 vezes a taxa do país). 28 das 46 já estavam fora da própria zona no 1º turno (p < 0,01), 20 delas com a mesma urna. Só ficaram de fora do "crônico" porque o corte do 1º turno é o de 497 mil testes. As 3 com desvio estão entre essas: já eram altas no 1º turno, com a mesma urna |
| 4 | H02: "fato que pede explicação" | **Sustentado com ressalvas, em escala bem menor.** Pela letra do plano, é isso. No fato, o que fica sem rastro técnico e novo no 2º turno são cerca de 4 seções e 300 liberações à mão, mais as 3 seções em que o comparecimento subiu junto com a liberação à mão (no máximo 123 liberações). "46 seções e 4.709 liberações" superestima o fato |
| 5 | H05(a): tamanho mínimo de 33.993 a 500.098 | **Sustentado com ressalvas.** Reproduzi a célula P1 com gerador e código próprios: zΔ de 2,46 e 7,70, contra 2,48 e 7,75. As 20 réplicas bastam, porque em todas as células aprovadas a detecção foi 20 de 20, com folga. Mas o teste quase não vê **1 ou 2 votos por seção espalhados ao acaso**: 1 voto em metade das seções (248.805 votos) e 3 votos em todas (1.492.692) passam sem sinal. A tabela vale só para inserções de vários votos por seção |
| 6 | O desconto do "sinal que já existia" (D2) é justo? | **Justo para tirar a carona do PR; otimista em dois pontos que aqui não mudam nada.** (i) Ele trata o dado como sem ruído: "16 de 20 réplicas" não é poder de 80%; no limiar, o poder real é de cerca de 50%. (ii) Numa UF com sinal contrário, como SP com t = −5,59, ele dá como "visto" o que o teste de verdade não acusaria. Nas células publicadas, o Brasil sozinho passa, com zΔ de 4,1 a 7,8. Por isso os números ficam |
| 7 | H05(b): SP explicado dentro do local (t −0,50) | **Sustentado.** Reproduz: t −0,50 dentro do local, contra −5,64 entre locais na **mesma** amostra. O sinal some pelo efeito fixo do local, e não pela amostra. Ressalva: "explicado por perfil" quer dizer "explicado pela diferença entre locais". O controle de local também absorveria uma ação feita no local inteiro. O sinal favorece o 22 |
| 8 | H05(b): PR novo em 2026 (z 3,04); não decidível | **Sustentado.** O z exato é 3,07; o 3,04 vem de calcular sobre valores já arredondados. Testei seis leituras benignas com dado público, e nenhuma o elimina. Com quatro controles de perfil de cada ano, o z cai para 2,56 e deixa de passar o corte de 2,81. Com cada controle isolado, fica entre 2,80 e 3,12. Dentro do local, cai para 2,05. É sinal pequeno, sensível à composição, e fica não decidível |
| 9 | Exploratório: 623.302 eleitores (2026 × 2022) | **Reproduzido em PR (38.573) e SP (276.867); as outras 3 UFs não conferi.** É diferença de parcelas multiplicada pelo comparecimento, com uma eleição só de base. Não é contagem de pessoas e não entra na perícia como número |

**Vereditos finais que sustento:**

- **H02: fato que pede explicação, restrito.**
  - O excesso sobre o cadastro está explicado pela foto: refutado como liberação irregular.
  - Resta um punhado de seções em que a liberação à mão subiu no 2º turno sem rastro técnico. Nas 3 mais claras, o comparecimento subiu junto.
  - Frase simples: "Quase todo o excesso de eleitores liberados sem digital é de eleitores que a urna mostrou com foto e sem digital no arquivo. Sobram poucas seções, com algumas centenas de liberações, em que a mesa liberou mais gente à mão no 2º turno e só o caderno de votação explica por quê."
- **H05: não decidível com dados públicos.** A parte concentrada (vários votos por seção) fica **sem sinal**, com o tamanho mínimo do doc 30.
  - Frase simples: "O teste veria uma fraude concentrada em poucas seções, e ela não aparece. Mas não veria 1 a 3 votos a mais em cada seção do país, e isso pode chegar a mais de um milhão de votos. Com os dados públicos, não dá para dizer se houve ou não."
  - Diferença para o doc 30: ele põe "sem sinal com tamanho mínimo" como forma principal. Eu ponho "não decidível" na frente, porque a forma que poderia mudar o vencedor é justamente a que o teste não vê. O doc 30 diz isso na seção 2.4, mas o rótulo de cima pode ser lido como absolvição.

**Nenhuma das duas muda o vencedor dentro do que o dado mede:**

- na H02, o teto é 36.340 + 4.709 = 41.049 votos;
- na H05, a aritmética não exclui. Há 16.264.910 votos sem digital no 2º turno, contra uma margem de 4.430.191.

## 1. Reprodução com código próprio

Nenhum script meu importa `estatistico-h02-h05-final-*` nem `estatistico-lib.mjs`. Os caminhos são próprios:

- cadastro lido direto dos zips do TSE;
- beta-binomial com log-gama de Lanczos e soma direta da cauda;
- regressão de efeito fixo e erro agrupado CR1 escritos de novo (`cetico-57-lib.mjs`);
- gerador xorshift, diferente do mulberry32 do autor;
- diário lido pelo `src/exportar.js`, diferente do `lerLogs` usado pelo autor.

| Medida | Doc 30 | Revisor | Script |
|---|---|---|---|
| Excesso, 2º turno: seções; ΣE; ΣE′; seções com E′ > 0; parcela | 16.011; 36.340; 493; 423; 98,64% | **iguais** | `cetico-57-h02a.mjs` |
| Excesso, 1º turno | 15.027; 33.319; 447; 383; 98,66% | **iguais** | idem |
| Foto e V2 no diário bruto: 15 seções de maior resíduo + 15 sorteadas por hash entre as explicadas | — | **30 de 30 iguais** ao arquivo de horário e ao BU | `cetico-57-bruto.mjs` |
| H02(d), 1º turno: fora do normal; confirmadas | 221 (28.369); 144 (22.071) | **iguais** | `cetico-57-h02d.mjs` |
| H02(d), 2º turno | 159 (22.096); 102 (15.795) | **iguais** | idem |
| Classes: leitor; crônico; sem explicação | 94 (14.881); 19 (2.506); 46 (4.709; 21,3%) | **iguais** | idem |
| Percentil 10 de p1 por modelo | 0,617; 0,597; 0,686; 0,686 | **iguais** | idem |
| Grupo 3 com desvio (138 testes, \|z\| ≥ 3,57) | AM 02054/0042/0037, AM 02631/0043/0047, PR 74950/0016/0083 | **as mesmas 3** | idem |
| E2 Brasil; SP; PR | −0,0039 (t −2,60); −5,59; 2,74 | **iguais** | `cetico-57-e2.mjs` |
| B1, dentro do local: Brasil; SP; PR | 1,25; −0,50; 2,13 | **iguais** | idem |
| B2 no PR: sem biometria; manual | +0,1920 (t 3,52); +0,0104 (2,51) | **iguais** | idem |
| B3 PR: d 2022; d 2026; diferença | −0,0052 (−1,51); +0,0114; z 3,04 | −0,0052; +0,0114; **z 3,07** | `cetico-57-b3.mjs` |
| B3 SP: diferença; dentro do local | z −4,41; −0,97 | z −4,42; −0,95 | idem |
| Detector N em eleitores, PR e SP | 38.573; 276.867 | **iguais** | idem |

**A diferença no z do PR (3,04 × 3,07)** vem do código do autor: `dDe` arredonda d e ep para 4 casas antes de calcular a diferença. Não muda a leitura, porque os dois passam o corte de 2,81.

## 2. H02

### 2.1 O defeito de denominador do parecer 54 não atinge a H02, e o parecer 54 erra a causa (Fato)

- O parecer 54 achou 14 seções de MG com 1 a 23 eleitores no perfil e de 139 a 419 aptos no BU. Ele levantou a hipótese de que o perfil, gerado em julho, estivesse fora de data.
- **A causa é outra.** As duas seções do exemplo do parecer 54 são principais de seções agregadas:
  - MG 50350/0350/0247 tem 4 eleitores no perfil e recebe a agregada 0239, que tem 335. A soma dá 339, igual aos aptos do BU;
  - a 0248 tem 1 eleitor e recebe a 0178, que tem 340. A soma dá 341, igual aos aptos.
- No país, há 16.142 seções principais com agregada no 2º turno, com 5.701.762 aptos. O defeito do parecer 54 é não ter somado as agregadas ao perfil. **Recomendação:** registrar essa correção no parecer 54. A conclusão dele (as 14 seções criam o sinal de MG) não muda. Muda só a causa.
- A H02 soma as agregadas, tanto no autor quanto no meu caminho.
  - Resultado: **nenhuma** seção do país tem aptos acima do cadastro, nos dois turnos. A soma de max(0, aptos − cadastro) é 0.
  - O motivo é que o cadastro fecha em maio, e o perfil de 14/07 já é o final.
  - A "folga" da H02 é, então, só o trânsito: 522.576 eleitores no 2º turno e 532.003 no 1º. A folga não esconde excesso.
- **Onde o defeito ainda pode pesar (Pendente):** as covariáveis de perfil por seção, sem as agregadas somadas. Elas entram nas 9 especificações do D3 (via `carregarIdade`), no teto da via "sem biometria" da simulação e nas covariáveis do parecer 27. Para cerca de 16 mil seções principais, essas parcelas saem de um punhado de pessoas. Não refiz o D3 com as agregadas somadas.

### 2.2 A foto explica o excesso, inclusive com uma correção que o doc não faz

- **Correção S3 (minha).** Parte da foto que aparece nas seções com excesso não é do excesso. Ela é de eleitores que o cadastro já dá como sem biometria e que também têm foto.
  - Nas seções sem excesso, a foto aparece em 4% dos V2 no país e em 31% no PR.
  - Descontando só a foto acima dessa base sobre a parte coberta pelo cadastro (F − r_UF · (sb − E)), o resíduo passa de 493 para **927 eleitores** (623 seções). A parcela explicada cai de 98,64% para **97,45%**. No 1º turno, passa de 447 para 802, com 97,59%.
  - A leitura do plano (≥ 95%) não muda. O resíduo cresce sobretudo na BA (352), na PB (69, 84% explicado) e no PI (48, 91%). PB 21393/0073 continua sendo a zona de maior resíduo.
  - A versão mais dura, que desconta a foto de base sobre todo o sb, dá 93,97%. Ela desconta também o próprio excesso e não é a correta. Fica como limite.
- **Foto no bruto (Fato):** 30 de 30 seções conferidas no diário pelo `exportar.js`, com o mesmo número de V2 com foto, de V2 e de sb do BU. Inclui a SP 65110/0211/0438 (Indaiatuba): 65 V2, 58 com foto, cadastro com 100% de biometria.
- **Alternativas para o excesso:**
  - testada: a parte de agregadas e aptos acima do cadastro (é zero);
  - testada: a foto de base (S3);
  - não testável com dado público: a origem da falta de digital no arquivo da urna (coleta pendente, rejeitada ou digital tirada na geração da mídia). Pelo princípio 8, quem votou só com foto (339.963 no 2º turno) votou sem controle técnico de identidade. Isso fica como **fato do TSE**, como o doc 30 já diz.

### 2.3 H02(d): as 46 "sem explicação técnica" têm, na maioria, rastro técnico ou já estavam assim

**(a) Urna trocada no dia (Fato).** 18 das 46 seções têm no 2º turno um BU de `reservaSecao`: a urna da seção foi substituída durante a votação. Elas somam **2.415 das 4.709** liberações à mão.

| Grupo | Seções | Com urna de reserva no 2º turno | Liberações à mão nessas |
|---|---:|---:|---:|
| País (2º turno, com comparecimento) | 497.897 | 5.672 (1,14%) | — |
| Classe "leitor" | 94 | 12 (12,8%) | 2.249 |
| Classe "crônico" | 19 | 4 | 875 |
| **Classe "sem explicação técnica"** | **46** | **18 (39%)** | **2.415** |

- O plano olha a troca de urna **entre** os turnos. Não olha a troca **no dia**, que é registrada no BU e é o rastro técnico mais direto de falha de equipamento.
- Exemplo conferido no bruto, RJ 60011/0009/0262:
  - o BU do 2º turno é de `reservaSecao`, com 339 votantes e 200 liberações à mão;
  - o diário da urna de reserva tem 135 votos, com 27 liberações à mão, todos das 13h em diante;
  - os outros 204 votos foram na urna original, com 173 liberações à mão (85%);
  - a urna original liberava quase tudo à mão e foi trocada; depois da troca, a taxa caiu para 20%.
- A p1 do dia (0,66) parece "normal" porque mede só quem foi reconhecido, e quase todos esses votaram na urna de reserva.
- Pelo princípio 8, a troca de urna também é feita por gente. Ela não absolve. Mas é rastro técnico, e a regra do plano diz que só o que não tem rastro é "sem explicação técnica".

**(b) Corte assimétrico entre os turnos (Fato).**

- "Crônico" exige que a seção esteja fora do normal **também no 1º turno** pelo mesmo corte (BH q < 0,01 em 497.895 testes, cerca de p < 4 × 10⁻⁶).
- Uma seção perto do corte passa num turno e não no outro por acaso. Nas 46:
  - **todas** tinham, no 1º turno, taxa de liberação à mão acima da média da zona;
  - **28** já tinham p < 0,01 no 1º turno, **20** delas com a mesma urna (1.473 liberações);
  - só **14** tinham p ≥ 0,05 no 1º turno (1.605 liberações). Essas são as de fato novas no 2º turno.
- Caso extremo: BA 39330/0128/0190, mesma urna nos dois turnos.
  - Liberou à mão 276 de 296 no 1º turno (93%) e 297 de 320 no 2º.
  - O p do 1º turno (1,5 × 10⁻⁵) não passou o BH, porque a zona tem outras seções de liberação em massa, que inflam a dispersão.
  - Ela entra nas "sem explicação técnica" do 2º turno. É obviamente crônica.

**(c) Hora a hora (Fato; arquivo de horário da frente H13, conferido no diário bruto em 7 seções).** Classes do revisor, só com rastro técnico:

| Classe | Seções | Liberações à mão | Das quais já com p < 0,01 no 1º turno e mesma urna | Novas (p ≥ 0,05 no 1º turno) |
|---|---:|---:|---:|---:|
| R: urna de reserva no dia | 18 | 2.415 | 0 | 8 (990) |
| B: o leitor "parou" numa parte do dia (≥ 70% das manuais em horas com ≤ 10% de reconhecimento) | 5 | 803 | 1 | 3 (336) |
| M: liberação à mão em horas em que a urna reconhecia a maioria | 23 | 1.491 | **19 (1.176)** | 3 (279) |

- Exemplos de B, conferidos no bruto, todos com a mesma urna nos dois turnos:
  - PR 75914/0080/0083: de 8h a 11h, 14 liberações à mão em 177 votos; de 12h a 16h, 111 em 114, com quase ninguém reconhecido;
  - SP 64777/0394/0417: 1 por hora até 12h; de 14h a 16h, 69 em 72;
  - SP 71072/0392/0040: o inverso, quase tudo à mão de 8h a 11h e normal à tarde.

  É o desenho de leitor que para, ou que volta, num horário. Também é compatível com falha induzida (H19). Não absolve, mas é rastro técnico de que o leitor parou de reconhecer **todos**, e não de que a mesa escolheu quem liberar.
- **O que sobra sem rastro técnico e novo no 2º turno:** cerca de 4 seções da classe M (as 3 com p ≥ 0,05 e 1 entre 0,01 e 0,05), com algo como 300 liberações, 1,4% das 22.096.
  - Pelo critério de 5% do plano, isso não bastaria para "pede explicação".
  - O que mantém o "pede explicação" é a outra perna da regra: as seções com desvio. Ver (d).
- **Sensibilidade ao corte do leitor (Fato):** com o percentil 20 em vez do 10, ficam 40 seções (4.359; 19,7%); com o 25, 39 (4.159; 18,8%). O corte de p1 pesa pouco. O que pesa é a troca no dia e o corte do 1º turno.
- **Idade (teste benigno; Fato descritivo):**
  - nas 46, a parcela de 70 anos ou mais no perfil fica, na mediana, 2,75 pontos acima da mediana da zona;
  - nas 94 de "leitor", fica 0,96 ponto acima;
  - 28 das 46 estão acima da zona e 18 abaixo.

  A idade explica pouco e não explica a mudança de um turno para o outro, porque o eleitorado é o mesmo.

**(d) As 3 seções com desvio, no bruto (Fato; BU = banco nos dois turnos; mesma urna nos dois turnos).**

| Seção (urna) | Comparecimento 1º → 2º | Por biometria | Sem biometria | Manual | 13 / 22 (1º → 2º) | p1 (1º → 2º) | p no 1º turno contra a zona | "Já votou" (1º / 2º) |
|---|---|---|---|---|---|---|---|---|
| AM 02054/0042/0037 (Atalaia do Norte; UE2022) | 107 → 128 (+21) | 88 → 87 | 9 → 12 | 10 → 29 (+19) | 105/0 → 122/0 | 0,86 → 0,78 | 0,0066 | 1 / 1 |
| AM 02631/0043/0047 (UE2022) | 262 → 274 (+12) | 211 → 196 | 13 → 14 | 38 → 64 (+26) | 259/0 → 271/1 | 0,77 → 0,70 | 0,00018 | 0 / 0 |
| PR 74950/0016/0083 (UE2020) | 102 → 119 (+17) | 81 → 87 | 2 → 2 | 19 → 30 (+11) | 54/30 → 83/30 | 0,64 → 0,70 | 0,00052 | 0 / 0 |

- As três **já liberavam à mão acima da zona no 1º turno**, com a mesma urna. Pelo corte usual (p < 0,01), seriam "crônicas".
- O desvio de voto nas três é o **nível** do 13 no 2º turno. É reduto, não mudança: a variação da parcela do 13 não passa o corte em nenhuma (z de −1,20, −0,97 e 2,32).
- O que de fato desvia é o **comparecimento** (z de 4,22 a 4,64).
- O que mais chama atenção é a AM 02054/0042/0037: dos 21 eleitores a mais, 19 vieram pela liberação à mão.
  - Na hora a hora, a liberação à mão cresce para o fim do dia: 9 de 11 na última hora com voto, contra 4 de 4 no 1º turno.
  - A maior sequência é de 6 liberações à mão seguidas.
- Na AM 02631/0043/0047, a liberação à mão sobe mais que o comparecimento (+26 contra +12). É, em boa parte, troca de categoria (por biometria −15), e não eleitor a mais.
- No PR, dos 17 a mais, 6 vieram por biometria e 11 à mão. O 22 ficou em 30 e o 13 ganhou 29.
- **Leitura:** é o padrão "ausente liberado pela mesa", em escala de dezenas de votos. As explicações benignas (comunidade indígena ou rural com transporte organizado no 2º turno, dedo gasto) **não foram testadas, só supostas**. Elas dependem de pessoas e não contam como controle. Isso sustenta o "pede explicação", em escala pequena.
- **Recomendação:** o caderno de votação dos dois turnos dessas 3 seções, como o doc 30 pede, mais as 3 ou 4 "novas" da classe M (ms/90131/0049/0110 e ma/09490/0020/0172 entre elas).

### 2.4 Veredito da H02

- **Fato que pede explicação, sustentado com ressalvas.**
- Pela letra do plano, a forma está certa. Mas o tamanho publicado ("46 seções, 4.709 liberações à mão, sem explicação técnica") não deve ir para a perícia.
- Dessas 46:
  - 18 têm urna trocada no dia;
  - 5 têm o leitor parado numa parte do dia;
  - 19 já estavam acima da zona no 1º turno com a mesma urna.
- O que sobra novo e sem rastro técnico é da ordem de 4 seções e 300 liberações, mais as 3 com comparecimento subindo junto (123 liberações no 2º turno, das quais cerca de 56 a mais que no 1º).

## 3. H05

### 3.1 Poder: as 20 réplicas e o desconto D2

- **20 réplicas bastam para o que foi publicado (Fato).**
  - Em todas as células que definem um tamanho mínimo, a detecção foi de 20 em 20 (Clopper-Pearson de 95%: de 0,83 a 1).
  - A mediana de zΔ no Brasil vai de 4,08 (P4) a 7,75 (P1, manual).
  - A grade é grossa (25 mil → 50 mil → 100 mil). Por isso, cada "tamanho mínimo" é um **limite de cima**: o ponto real de 80% fica entre dois pontos da grade.
  - Reproduzi P1 manual com código e gerador próprios (30 réplicas): zΔ de 2,46 e 7,70 em 29.844 e 54.655 votos, contra 2,48 e 7,75 do autor.
- **O D2 trata a linha de base como sem ruído.** Ele dá "visto" quando o deslocamento passa de 3,32 erros-padrão. Num dado novo sem sinal prévio, o ruído também entra: nesse ponto, o teste acusaria em cerca de 50% das vezes, e não em 80%.
  - Recalculei a detecção somando esse ruído (cada unidade tem chance Φ(zΔ − 3,32); vale se alguma unidade dispara):
    - em P1 com 29.844 votos, o poder real é de **31%**;
    - em P1 com 54.655 votos, é de 100%.
  - Nas células publicadas, a folga é grande. Só P3 e P4 (zΔ ≈ 4,1 a 4,2) ficam com poder real perto de 80%.
- **O D2 tira a carona do PR, mas dá uma carona ao contrário.** Numa UF com sinal a favor do 22, como SP (t = −5,59), o D2 dá "visto" a um deslocamento de 3,32 erros-padrão, que levaria SP a t ≈ −2,3. O teste de verdade não acusaria nada a favor do 13. Nas células publicadas, isso não pesa, porque o Brasil sozinho passa.
- **O ponto cego que a tabela não mostra (Fato, simulação própria, via manual, 30 réplicas):**

| Padrão | Votos inseridos | zΔ do Brasil (mediana) | Detectado (D2) | Poder com ruído |
|---|---:|---:|---|---:|
| 1 voto em 50% das seções, ao acaso | 248.805 | 1,59 | 0 de 30 | 10% |
| 2 votos em 50% das seções | 497.592 | 6,42 | 30 de 30 | 100% |
| 1 voto em todas as seções | 497.610 | 0,17 | não | 1% |
| 3 votos em todas as seções | 1.492.692 | 1,37 | não | 9% |
| 9 votos em todas (≈ margem) | 4.474.188 | 11,17 | sim, só porque bate no teto de ausentes | 100% |

- O E2 enxerga a **variação** da taxa de inserção entre seções do mesmo município. O sinal cresce mais ou menos com o quadrado dos votos por seção.
- Por isso, 1 a 3 votos por seção, mesmo ao acaso e mesmo somando mais de um milhão, passam sem sinal. Isso vai além do "espalhado proporcional ao comparecimento" (P7) que o doc 30 declara cego.
- **Recomendação:** a frase "o teste exclui as formas concentradas acima dos tamanhos" deve dizer "acima desses tamanhos, **com vários votos por seção**". Com 1 a 3 votos por seção, a forma fica não decidível até mais de 1 milhão de votos.

### 3.2 SP dentro do local

- Reproduzido: dentro do local, d = −0,0014 (t −0,50).
- Na mesma amostra (sem as 362 seções sozinhas no local), o efeito fixo de município dá t −5,64. A queda vem do controle de local, e não de quem saiu da amostra.
- 2026 × 2022 entre locais dá z −4,42. Dentro do local, dá z −0,95.
- **Explicações alternativas:**
  - perfil entre locais: compatível. O parecer 27 mostrou que covariáveis de perfil apagam o sinal de SP;
  - ação no local inteiro: compatível. O efeito fixo de local também a absorveria. Não testada, e não testável com dado público.
- O sinal é a favor do 22, então não ajuda a explicar um resultado a favor do 13. **Sustentado.** "Explicado" quer dizer "não é diferença entre eleitores do mesmo prédio".

### 3.3 O sinal do PR: leituras benignas testadas com dado público

| Leitura benigna | Teste | Resultado |
|---|---|---|
| Um município puxa o sinal | tirar um município por vez (399) | t de 2,38 a 3,07. Nenhum município sozinho explica |
| Eleição extra no 2º turno (consulta em 75035 e 78719; prefeito suplementar em 78557) | sem esses 3 municípios | t 2,74, igual |
| Urna trocada entre os turnos | só a mesma urna | t 2,68 |
| Poucas seções com Δ sem biometria absurdo | sem o 1% de maior \|Δsb\| | t 2,71 |
| Composição do eleitorado (idade, escolaridade, biometria), medida no perfil de cada ano | diferença 2026 − 2022 com controles | z 3,08 (sem controle); 3,12 (60+); 2,80 (escolaridade baixa); 2,90 (biometria); 3,02 (16 a 24); **2,56 (os quatro)**. Corte: 2,81 |
| Diferença entre prédios | dentro do local | z 2,05 |

- Nenhuma leitura benigna testável **elimina** o sinal. Duas o levam abaixo do corte: os quatro controles de perfil juntos e a comparação dentro do local.
- O Δ líquido da via "sem biometria" no PR é de **3.000** eleitores. A soma dos módulos é 6.898.
- Isso pede **não decidível com dados públicos**, como o doc 30 diz. **Sustentado.**
- Dado que falta: a via de habilitação por eleitor nos dois turnos.

### 3.4 O exploratório de 623.302

- Reproduzi PR (38.573) e SP (276.867), com Δ de 2026 e de 2022 iguais aos do autor. Não refiz MG, RS e SC.
- É Δ de parcela vezes comparecimento, com uma eleição de base. Por isso, não é "eleitores a mais". O próprio doc diz que não se separa "2022 atípico" de "2026 com eleitor a mais sem digital".
- Fica **exploratório e Pendente, sem número na perícia**.

### 3.5 Veredito da H05

- **Não decidível com dados públicos**, com a parte concentrada **sem sinal** nos tamanhos do doc 30, válidos para vários votos por seção.
- O teste não vê:
  - 1 a 3 votos por seção, nem espalhados ao acaso (até 1,49 milhão);
  - a inserção proporcional (até a margem);
  - a inserção igual nos dois turnos;
  - o exterior.
- O PR é não decidível.
- As 97 seções de liberação em massa não foram revistas a fundo neste parecer. As 3 da H02(d) e a BA 39330/0128/0190, que está entre as 12 "seletivas", foram conferidas no bruto. A BA libera à mão mais de 90% nos dois turnos, com a mesma urna e de forma uniforme ao longo do dia. O rótulo "seletivo" dela vem da hora das 11h, em que 13 dos 55 votos não passaram pela liberação à mão. Não refiz a regra hora a hora do autor para ela.

## 4. Explicações alternativas: testadas × supostas

| Explicação | Hipótese | Situação |
|---|---|---|
| Agregadas e aptos acima do cadastro escondem o excesso | H02 | **Testada:** zero seções; folga só de trânsito |
| Foto de base inflando a parte explicada | H02 | **Testada:** 97,45% (resíduo de 927) |
| Erro de leitura da foto no arquivo de horário | H02 | **Testada:** 30 de 30 no bruto |
| Troca de urna no dia | H02(d) | **Testada:** 18 de 46 (2.415) |
| Leitor que para numa parte do dia | H02(d) | **Testada:** 5 de 46 (803) |
| Seção crônica abaixo do corte do 1º turno | H02(d) | **Testada:** 28 de 46 com p < 0,01 |
| Idade (dedo gasto) | H02(d) | **Testada:** efeito pequeno; não explica a mudança entre turnos |
| Comunidade indígena ou rural com transporte no 2º turno | H02(d) | **Só suposta.** Depende de pessoas |
| Perfil entre locais em SP | H05 | **Testada** (B1, parecer 27). A ação no local inteiro não é separável |
| Composição e município único no PR | H05 | **Testada:** reduz, não elimina |
| Mesma pessoa trocando de via × eleitor a mais | H05 | **Não testável** sem a via por eleitor |

## 5. Riscos que ficam

- **H05, forma fina e forma espalhada:** de 1 a 3 votos por seção, até mais de 1 milhão de votos, e a inserção proporcional, até a margem, ficam invisíveis ao único teste disponível. É o limite principal.
- **D3 e covariáveis de perfil:** as parcelas de perfil por seção não somam as agregadas (cerca de 16 mil seções principais). Não refiz o D3 nem as 9 especificações do parecer 27 com a soma.
- **Arquivo de horário da frente H13:** fonte única das horas e da foto fora das 30 seções conferidas no bruto. Totais e foto reproduzem. As horas conferem nas 7 seções exportadas.
- **Exportador em urna de reserva:** o `exportar.js` mostra só o diário da urna de reserva (RJ 60011/0009/0262: 135 de 339 votos). O arquivo do leitor (doc 08) tem os 339. Quem usar o exportador nessas seções precisa saber disso.
- **97 seções:** a classificação do autor não foi refeita aqui.
- **Princípio 8:** urna trocada, leitor parado e seção crônica são rastros técnicos, não absolvição. Cada um pode ter sido provocado por gente. A brecha (liberação pela mesa sem controle técnico de identidade) continua aberta como risco, e nenhum dado público fecha.

## 6. Como reproduzir

```sh
# H02(a)(c) com cadastro dos zips públicos (~10 min) e a sensibilidade da foto de base
node --max-old-space-size=8192 scripts/auditoria/cetico-57-h02a.mjs
node scripts/auditoria/cetico-57-h02a-s3.mjs
# H02(d): beta-binomial própria, classes, sensibilidades, idade (~7 min); hora a hora; urna de reserva
node --max-old-space-size=8192 scripts/auditoria/cetico-57-h02d.mjs
node scripts/auditoria/cetico-57-h02d-horas.mjs
node scripts/auditoria/cetico-57-reserva.mjs
# E2, B1, leituras benignas do PR, poder em padrões finos (~2 min)
node --max-old-space-size=8192 scripts/auditoria/cetico-57-e2.mjs 30
# B3 (PR e SP, 2022 × 2026), PR com controles de perfil, detector N (~3 min)
node --max-old-space-size=8192 scripts/auditoria/cetico-57-b3.mjs
# bruto (BU + diário do dia, só contagens)
node scripts/auditoria/cetico-57-bruto.mjs am/02054/0042/0037 am/02631/0043/0047 pr/74950/0016/0083 pr/75914/0080/0083 sp/71072/0392/0040 sp/64777/0394/0417 rj/60011/0009/0262 ba/39330/0128/0190
```

Saídas em `data/parsed/auditoria/cetico/57/`:

- `h02a.json` e `h02a-s3.json`;
- `h02d.json`, `h02d-46.csv`, `h02d-horas.json` e `reserva.json`;
- `e2.json` e `b3.json`;
- `bruto-3.json`, `bruto-h02d.json` e `bruto-foto.json`.

Funções comuns próprias em `scripts/auditoria/cetico-57-lib.mjs`. Nenhum CPF nem título foi lido para fora do processo ou gravado. A busca de sequências de 12 dígitos nas saídas só acha decimais.
