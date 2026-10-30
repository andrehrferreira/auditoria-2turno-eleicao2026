# 08. H05: o sinal do PR e de SP é o mesmo eleitor trocando de categoria (falha do leitor)?

Estatístico eleitoral, 30/10/2026. Pedido do [parecer cético 27](../cetico-revisor/27-h05-28ufs.md) (recomendação 7): separar a "reclassificação mecânica" de um viés real no teste do H05 ([doc 06](06-h05-28ufs.md)).

## Pré-registro (escrito em 30/10/2026 00:47, antes de rodar qualquer modelo)

### O problema

O teste do H05 mede o "eleitor a mais sem biometria" pela diferença, entre os turnos, das categorias de habilitação do BU. Uma seção pode mudar de categoria sem mudar de eleitor:

- no 1º turno, o leitor reconhece a digital de 137 eleitores;
- no 2º turno, o leitor falha e os mesmos eleitores são liberados pelo mesário, com "digital não reconhecida".

O Δ "sem biometria" sobe e o Δ "por biometria" desce, sem nenhum eleitor a mais. Se essa troca acontece mais em seções de certo perfil, e esse perfil vota diferente, o teste mostra um sinal falso.

### A dificuldade (princípio 8)

A taxa de "digital não reconhecida" (tentativas esgotadas) sobe por dois motivos que o BU não distingue:

1. o leitor falhou;
2. o mesário liberou alguém sem digital (a brecha do H05). Para o log, isso também é "digital capturada 4 vezes e não reconhecida".

Por isso, controlar pela taxa de falha **contada** apaga as duas coisas juntas: a reclassificação e uma eventual inserção pela brecha. É um sobrecontrole.

Para separar, uso uma medida do leitor que a inserção não move: **entre os eleitores que passaram pela digital, quantos passaram na 1ª tentativa**. Um leitor ruim pede mais tentativas também de quem acaba reconhecido. Uma inserção pela brecha acrescenta liberações manuais, mas não muda as tentativas de quem foi reconhecido.

### Medidas no log (por seção e turno, dia da votação daquele turno)

Cada atendimento termina em "O voto do eleitor foi computado". Classes, como no doc 06 da biometria:

- **biometria:** `Tipo de habilitação do eleitor [biométrica]`;
- **manual:** `Dado digitado confere` (digital pedida e não reconhecida; no BU, "por biografia");
- **ano de nascimento:** `Ano de nascimento digitado é igual ao do cadastro` (eleitor sem biometria na urna; no BU, "sem biometria").

Tentativas: o maior n de `Solicita digital. Tentativa [n] de [m]` no atendimento.

| Medida | Definição |
|---|---|
| B | biometria + manual (eleitores a quem a urna pediu digital) |
| f, falha registrada | manual ÷ B (tentativas esgotadas, "digital não reconhecida") |
| p1, leitura na 1ª | reconhecidos na 1ª tentativa ÷ reconhecidos |
| a | ano de nascimento ÷ votos |
| m | manual ÷ votos |

Fonte do log: o pacote do 2º turno traz também o dia do 1º turno quando a urna é a mesma. Uso esse dia se ele bate com o BU do 1º turno (votos, biometria = por biometria, manual = por biografia, ano de nascimento = sem biometria). Se não bate, leio o pacote do 1º turno. Seção cujo log não bate com o BU em algum turno fica fora dos modelos, com contagem.

### Passo 1: classificação do leitor

Em ordem:

1. **urna trocada:** número interno da urna do BU diferente entre os turnos (o mesmo critério do doc 06).
2. **sem medida:** B < 20 em algum turno.
3. **sem leitura:** B ≥ 20 e menos de 10 reconhecidos num turno. Se for num turno só, a seção vai para "pior" naquele turno, marcada. Se for nos dois, fica em "sem leitura nos dois turnos".
4. Nas demais, comparo p1 entre os turnos com teste binomial de duas proporções:
   - **leitor pior no 2º:** z ≥ 3 e p1 cai 0,10 ou mais;
   - **leitor pior no 1º:** z ≤ −3 e p1 sobe 0,10 ou mais;
   - **leitor normal nos dois turnos:** o resto.

Classificação B, pela falha registrada f (descritiva, sobrecontrole): a mesma regra, com f no lugar de p1 (teste binomial em B). Cruzo A × B.

### Passo 2: o teste do H05 com o controle

- **Universo:** as 497.622 seções do teste principal do doc 06, com os mesmos filtros, menos as que não têm log que bate com o BU nos dois turnos.
- **Desfecho:** ganho do 13 ÷ c1 (e do 22).
- **Base (M0):** Δpor biometria ÷ c1, Δsem biometria ÷ c1, eliminados do 1º ÷ c1, brancos e nulos do 1º ÷ c1. Efeito fixo de município, peso c1, erro-padrão agrupado por município (no DF, por zona). d = coeficiente sem biometria − coeficiente por biometria.
- **M1 (principal, robusto a inserção):** M0 + R̃ ÷ c1.
  - R̃ = (f̃₂ − f̃₁) × B₁ é a reclassificação **esperada pelo desempenho do leitor**.
  - f̃ de um turno é a falha média das seções-turno com o mesmo modelo de urna e a mesma faixa de p1. São 20 faixas de largura 0,05.
  - Com B ≥ 10 e menos de 10 reconhecidos, f̃ vem da faixa "sem leitura" do modelo. Com B < 10, f̃ é a média do modelo.
  - A tabela f̃ sai só das contagens de habilitação, sem olhar voto.
- **M2 (sobrecontrole):** M0 + R ÷ c1, com R = (f₂ − f₁) × B₁ pela falha **registrada**. Isso apaga a reclassificação e também qualquer inserção pela brecha "digital não reconhecida".
- **Estrato:** M0 só nas seções de "leitor normal nos dois turnos" (classificação A).
- **Sem covariável de perfil.** O parecer 27 mostrou que o perfil muda o resultado para os dois lados. Este documento isola uma pergunta só: a falha do leitor. Qualquer outra especificação será rotulada como exploratória.

### Regra de decisão (para PR, SP, Brasil e as trocadas de MG)

Comparo d de M1 com d de M0 na mesma amostra:

| Leitura | Condição |
|---|---|
| **a reclassificação explica** | \|t(M1)\| < 1,96 e \|d(M1)\| ≤ metade de \|d(M0)\| |
| **a reclassificação não explica** | mesmo sinal, \|d(M1)\| ≥ metade de \|d(M0)\| e \|t(M1)\| ≥ 1,96 |
| **inconclusivo** | o resto |

- A mesma regra se aplica a M2 e ao estrato, como leituras secundárias.
- Δd = d(M1) − d(M0) vai com erro-padrão agrupado conjunto: os dois ajustes, com os escores somados por município.
- **Família confirmatória:** M1 em 27 UFs + Brasil, para o 13 e o 22, são 56 testes. Bonferroni a 5% dá |t| ≥ 3,32, como no doc 06.
- **Trocadas de MG:** o recorte do doc 06 (MG, urna trocada, efeito fixo de município, d = +0,070 com t = 7,5), com M0, M1 e M2.

---

## Resultado (rodado em 30/10/2026, depois do pré-registro acima, que não foi alterado)

### Resposta curta

- **SP (Fato):** a troca de categoria **não explica** o sinal a favor do 22.
  - Com o controle pelo leitor, d fica igual: −0,0163 (t = −5,58) com e sem controle.
  - Só nas seções de leitor normal, fica em −0,0187 (t = −5,76).
  - Com o sobrecontrole, que apaga toda a troca de categoria (e também a brecha), ele **cresce**: −0,149 (t = −6,83).
  - Pela regra declarada, as três leituras dão "não explica".
- **PR (Fato, com limite):** a **quebra de leitor** não explica o sinal a favor do 13.
  - Com o controle pelo leitor, d = +0,0108 (t = 2,54), contra +0,0114 (t = 2,74) sem controle.
  - Só nas seções de leitor normal, d = +0,0124 (t = 2,76).
  - Mas o PR tem outra mudança que o teste **não separa**. A falha registrada caiu no estado inteiro, de 7,5% para 7,0% dos eleitores com biometria. Ao mesmo tempo, o leitor não piorou nem melhorou: a leitura na 1ª tentativa ficou em 0,759 nos dois turnos.
  - O sobrecontrole, que apagaria essa queda, não tem precisão no PR: d = −0,054 ± 0,054 (t = −1,0), **inconclusivo**.
  - O sinal do PR continua **Hipótese**, abaixo do limiar (como no doc 06).
- **Brasil (Fato):** a falha do leitor não mexe no resultado.
  - Com o controle pelo leitor, vai de −0,0039 (t = −2,60) para −0,0041 (t = −2,70).
  - Só no leitor normal, −0,0050 (t = −2,85).
  - O sobrecontrole é inconclusivo: −0,013 (t = −0,83).
- **Trocadas de MG (Fato):** o efeito não vem da troca de leitor.
  - No conjunto das 326 trocadas de MG, a falha registrada ficou igual (8,74% → 8,54%), e a leitura na 1ª também (0,724 → 0,729).
  - Com o controle pelo leitor, d = +0,079 (t = 8,46), contra +0,070 (t = 7,51) sem controle.
  - O sobrecontrole é inconclusivo: +0,23 ± 0,23.
- **Fato (corrige o parecer 27):** a "reclassificação mínima" de 1.047.500 eleitores no Brasil (72.416 no PR) **não mede o mesmo eleitor trocando de categoria**.
  - 97% dela está em seções em que o leitor não mudou entre os turnos.
  - A conta (o menor entre \|Δpor biometria\| e \|Δsem biometria\| quando eles têm sinais opostos) também soma eleitores **diferentes**: por exemplo, um eleitor com digital que faltou no 2º turno e outro, sem digital, que veio.
  - Por isso ela não é um mínimo: é um teto grosseiro.
- **Fato:** quebra de leitor entre os turnos é rara.
  - Pelo critério declarado, o leitor piorou ou melhorou de forma clara em 1.982 das 497.607 seções (0,4%).
  - Nessas seções, o Δ sem biometria líquido é de +2.522 eleitores.
- **Família confirmatória (56 testes, controle pelo leitor, \|t\| ≥ 3,32):** só SP passa, a favor do 22, para o 13 (t = −5,58) e para o 22 (t = +5,14). É o mesmo resultado do doc 06.

![d por recorte e modelo](../../../data/parsed/auditoria/estatistico-eleitoral/h05-leitor.svg)

O gráfico `h05-leitor.svg` (dados em `h05-leitor-grafico.csv`) mostra cada recorte em quatro versões: sem controle, com o desempenho do leitor, com a falha registrada e só nas seções de leitor normal.

**Como ler:**
- se o ponto azul encosta no zero, a falha do leitor explica o sinal;
- o ponto laranja é o limite, porque apaga também a brecha. Nele, os intervalos do PR, do Brasil e de MG são largos demais para decidir.

### Universo e conferências (Fato)

| Item | Valor |
|---|---:|
| Seções do teste do doc 06 | 497.622 |
| Log não bate com o BU do 1º turno | −9 |
| Log não bate com o BU do 2º turno | −6 |
| **No teste** | **497.607** (27 UFs, 5.589 conglomerados) |
| Seções lidas no log (27 UFs, sem o exterior) | 497.897; 0 erros de leitura |
| Dia do 1º turno lido do pacote do 1º turno (o do 2º não batia) | 1.632 |
| Urna trocada entre os turnos | 4.404 |

- **Reprodução do doc 06.** O modelo base, no universo do doc 06, dá os mesmos números:
  - Brasil −0,0039 (t = −2,60);
  - PR +0,0114 (2,74);
  - SP −0,0163 (−5,59);
  - MG −0,0024 (−0,62).

  Excluir as 15 seções não muda nada: SP fica em −0,0163 (t = −5,58).
- **O log confirma o BU.** Nas 497.607 seções, as classes contadas no log (biometria, manual, ano de nascimento) batem com o detalhamento do BU nos dois turnos. Esse foi o critério de entrada.
- **Tentativas (os dois turnos somados):**
  - liberações manuais: 16.974.708 com as 4 tentativas de digital e 3 com menos;
  - reconhecidos sem pedido de digital: 0;
  - reconhecidos por tentativa: 165.733.213 na 1ª, 35.256.554 na 2ª, 14.364.277 na 3ª e 6.267.043 na 4ª. Na 1ª tentativa passam 74,8% dos reconhecidos.
- **BU bruto conferido** nas três seções do parecer 27, com `node src/exportar.js --turno <1|2> --uf .. --municipio .. --zona .. --secao .. --log nao --stdout`. As contagens batem com o banco:

| Seção | 1º turno: por biometria / por biografia / sem biometria (urna) | 2º turno (urna) | Classe A / B | Leitura na 1ª (1º → 2º) | Falha registrada (1º → 2º) |
|---|---|---|---|---|---|
| PR 74993/0159/0009 | 137 / 54 / 0 (1661675) | 13 / 196 / 0 (mesma urna) | normal / pior no 2º | 0,75 → 0,46 | 0,28 → 0,94 |
| PR 77399/0124/0080 | 31 / 197 / 10 (1658906) | 221 / 12 / 13 (reserva 1651521) | trocada | 0,61 → 0,75 | 0,86 → 0,05 |
| MG 52752/0268/0068 | 199 / 29 / 13 (1751846) | 148 / 89 / 12 (reserva 1653283) | trocada | 0,53 → 0,59 | 0,13 → 0,38 |

A primeira seção mostra um limite da classificação A (ver o item 3 de "O que o teste ainda não separa"):
- a falha foi de 28% para 94%, na mesma urna;
- sobraram só 13 reconhecidos;
- com 13, o teste da leitura na 1ª não tem força para marcar "pior no 2º".

### Passo 1: classes do leitor (Fato)

Classe A (pela leitura na 1ª tentativa), Brasil:

| Classe | Seções | Falha registrada 1º → 2º | Leitura na 1ª 1º → 2º | Δ sem biometria | Δ por biometria | "Reclassificação mínima" (parecer 27) |
|---|---:|---|---|---:|---:|---:|
| normal nos dois turnos | 491.169 | 7,05% → 7,14% | 0,751 → 0,745 | +593.738 | +2.290.862 | 1.017.231 |
| pior no 2º | 1.447 | 7,08% → 7,69% | 0,830 → 0,686 | +3.200 | +3.132 | 5.747 |
| pior no 1º | 535 | 10,31% → 9,21% | 0,659 → 0,802 | −678 | +4.487 | 2.758 |
| urna trocada | 4.404 | 8,89% → 8,91% | 0,735 → 0,733 | +5.143 | +21.793 | 21.736 |
| sem leitura nos dois | 14 | 97,0% → 97,4% | — | +204 | −6 | 12 |
| sem medida (B < 20) | 38 | — | — | −45 | −273 | 16 |

- **Classe B (pela falha registrada):**
  - 492.750 normais;
  - 142 com falha maior no 2º;
  - 273 com falha maior no 1º.
- **Cruzamento A × B:** só 18 seções são "pior no 2º" pelos dois critérios.
- **Por recorte (classe A):**
  - PR: 26.787 normais, 32 pior no 2º, 44 pior no 1º e 264 trocadas;
  - SP: 102.588 normais, 105 pior no 2º, 95 pior no 1º e 817 trocadas;
  - MG: 326 trocadas.

**PR, o que mudou (Fato):**
- Nas seções de leitor normal, a falha registrada caiu de 7,50% para 7,01%.
- A leitura na 1ª ficou em 0,759 nos dois turnos.
- As liberações manuais foram de 502.791 para 485.188.
- A reclassificação registrada (Δfalha × eleitores com biometria do 1º turno) soma −33.276.

É uma queda espalhada, não quebra de leitor. Causas possíveis (**Hipótese**, sem teste aqui):
- quem entrou no 2º turno (mais jovem, digital melhor);
- a condição dos dedos no dia;
- o comportamento na mesa. Pelo princípio 8, este não é explicação benigna.

Uma queda das liberações sem digital vai **contra** o H05, que as aumentaria.

**Leitor normal, falha registrada maior no 2º (exploratório, princípio 8):**
- **O que é:** 123 seções, em 20 UFs, em que quem passou pela digital passou tão bem quanto no 1º turno, mas as liberações manuais subiram 10 pontos ou mais: de 3.384 para 7.940 (+4.556).
- **Por que importa:** é o desenho que a brecha também produz. O leitor não piorou, e mais gente saiu como "digital não reconhecida".
- **Tamanho:** é pouco no país, e aqui não há teste de voto.
- **Onde está:** a lista fica em `h05-leitor.json` (`normalComFalhaMaior2`). Nenhuma seção é citada, porque não conferi o bruto delas.
- **Pendente** (frente de biometria): horário e mesário dessas liberações.

### Passo 2: o teste do H05 com e sem o controle (Fato)

- **Modelo:** efeito fixo de município, peso c1, erro-padrão agrupado por município.
- **d:** diferença para o 13 entre o eleitor a mais sem biometria e o eleitor a mais com biometria. Negativo = a favor do 22.
- Entre parênteses, o t.

| Recorte | Seções | Sem controle (M0) | Com o leitor (M1) | Δ M1 − M0 (t) | Falha registrada (M2, sobrecontrole) | Só leitor normal | Decisão (M1 / M2 / estrato) |
|---|---:|---|---|---|---|---|---|
| **SP** | 103.615 | −0,0163 (−5,58) | −0,0163 (−5,58) | 0,0000 (0,02) | −0,149 (−6,83) | −0,0187 (−5,76) | não explica / **não explica** / não explica |
| **PR** | 27.130 | +0,0114 (2,74) | +0,0108 (2,54) | −0,0006 (−0,86) | −0,054 ± 0,054 (−1,01) | +0,0124 (2,76) | não explica / inconclusivo / não explica |
| **Brasil** | 497.607 | −0,0039 (−2,60) | −0,0041 (−2,70) | −0,0002 (−1,73) | −0,013 ± 0,016 (−0,83) | −0,0050 (−2,85) | não explica / inconclusivo / não explica |
| **MG, urna trocada** | 214 comparáveis (de 326) | +0,070 (7,51) | +0,079 (8,46) | +0,009 (1,82) | +0,23 ± 0,23 (1,01) | — | não explica / inconclusivo / — |
| MG inteiro (contexto) | 52.033 | −0,0024 (−0,62) | −0,0024 (−0,63) | 0,0000 (−0,11) | −0,031 (−2,38) | −0,0042 (−0,95) | — |

Para o 22, o resultado é quase espelho:

| Recorte | M0 | M1 | M2 |
|---|---|---|---|
| SP | +0,0172 (5,15) | +0,0173 (5,14) | +0,155 (11,96) |
| PR | −0,0106 (−2,33) | −0,0099 (−2,11) | — |
| Brasil | +0,0034 (2,34) | +0,0036 (2,46) | — |
| MG trocadas | −0,039 (−4,64) | −0,050 (−5,42) | — |

A tabela por UF está em `h05-leitor-por-uf.csv`.

**Força do controle (diagnóstico, sem voto). Ela muda a leitura do "não explica" do M1:**
- **O controle acompanha mal a troca registrada.** A reclassificação esperada pelo leitor tem correlação baixa, por seção, com a reclassificação registrada:
  - Brasil: 0,07;
  - PR: 0,14;
  - SP: −0,02;
  - MG trocadas: 0,17.
- **Por quê:** como o passo 1 mostrou, quase toda a variação da falha registrada entre os turnos não vem de mudança do leitor.
- **O que o "não explica" do M1 diz:** só que a parte da troca de categoria causada por **quebra de leitor** não explica o sinal.
- **O que fica de fora:** a troca de categoria que acontece sem o leitor mudar. Ela só sai com o M2, e o M2 tem alcance desigual:
  - em SP, decide: a troca de categoria não explica o sinal;
  - no PR, no Brasil e em MG trocadas, perde precisão. Quando a reclassificação registrada entra no modelo, as duas categorias quase se confundem. No PR, só 0,7% dos votantes não têm biometria cadastrada, então quase não sobra variação própria.

**Testes feitos neste documento:**
- **Passo 2:** cerca de 240 regressões:
  - 3 modelos mais o estrato;
  - 28 recortes (27 UFs + Brasil), para o 13 e o 22;
  - mais MG trocadas, MG mantidas e MG inteiro.

  São confirmatórios os 56 do M1 e as 4 decisões declaradas (cada uma com 3 leituras).
- **Exploratório:** d dentro de cada classe A (Brasil, PR, SP e MG). Nada passa em correção:
  - trocadas do Brasil: +0,005 (t = 0,96);
  - trocadas de SP: +0,015 (t = 2,5);
  - trocadas do PR: +0,021 (t = 1,86);
  - pior no 2º, Brasil: +0,010 (t = 0,68).

### O que o teste ainda não separa

1. **A queda (ou subida) espalhada da falha registrada, sem mudança do leitor.** É o caso do PR: −33 mil eleitores-equivalentes, falha de 7,5% para 7,0% e leitura na 1ª igual. O M1 não a vê e o M2 não tem precisão no PR. Explicações possíveis:
   - composição: quem votou num turno e não no outro tem dedo diferente;
   - condição do dia;
   - mesa: mesário mais ou menos paciente antes de desistir da digital. Pelo princípio 8, não é explicação benigna.
2. **Inserção pela brecha × falha real.** Na contagem, as duas são a mesma coisa ("digital capturada 4 vezes e não reconhecida"). O M2 apaga as duas juntas. Por isso ele é limite: um "explica" vindo dele não absolveria nem acusaria.
3. **Quebra forte de leitor com poucos reconhecidos.** A leitura na 1ª perde força quando quase ninguém passa. A PR 74993/0159/0009, com 13 reconhecidos, ficou como "normal" na classe A. A classe B a pega, mas não distingue a brecha. Esse caso também é compatível com liberação em massa pelo mesário (princípio 8).
4. **Quem é quem.** O log não diz qual eleitor veio em cada turno, então não há como seguir a mesma pessoa. A troca de categoria é sempre inferida das contagens.
5. **O perfil da seção (parecer 27).** O controle pelo leitor não resolve a dependência do perfil. Em SP, a explicação candidata continua sendo o perfil (a parcela 60+ apaga o sinal) e segue como **Hipótese**. Este documento só tira a falha do leitor da lista de explicações para SP.
6. **O que já estava fora do teste:** inserção pelo canal "sem biometria cadastrada", fraude igual nos dois turnos e o exterior (doc 06, limites 1 a 6).

### Leitura para a auditoria

- **Fato:** a quebra do leitor de digital entre os turnos é rara (0,4% das seções). Ela não explica nenhum dos sinais do H05: nem o de SP (a favor do 22), nem o do PR (a favor do 13), nem o do Brasil, nem o das trocadas de MG.
- **Fato:** em SP, nem a troca de categoria toda (sobrecontrole) explica o sinal. A troca de categoria sai da lista de explicações para SP.
- **Fato:** a "reclassificação mínima" do parecer 27 mistura eleitores diferentes e não mede o mesmo eleitor trocando de categoria. Não deve ser citada como tamanho da reclassificação.
- **Hipótese:** no PR, o sinal pequeno a favor do 13 convive com uma queda espalhada das liberações sem digital (−17.603 manuais nas seções de leitor normal). Este teste não separa as duas coisas. A queda vai contra a leitura de inserção pela brecha.
- **Princípio 8:** nenhuma conclusão aqui usa procedimento humano como controle. A brecha "digital não reconhecida" continua aberta. As 123 seções em que a liberação manual subiu sem o leitor piorar são o rastro a examinar.

### Pendências e recomendações

1. **Pendente (frente de biometria):** no PR, ver se a queda da falha registrada é igual ao longo do dia e entre as mesas (o que indicaria composição ou condição do dia) ou se concentra em mesas específicas.
2. **Pendente (frente de biometria):** as 123 seções de leitor normal com liberação manual 10 pontos maior no 2º turno (`normalComFalhaMaior2`): horário, mesário e conferência no bruto antes de citar qualquer uma.
3. **Recomendação (cético):** revisar no parecer 27 o texto sobre a "reclassificação mínima" (é um teto grosseiro, não um mínimo). Revisar também a classificação A para seções com poucos reconhecidos.
4. **Recomendação (perícia):** nada deste documento entra na perícia como número de inserção ou de reclassificação. O que tem universo completo e é reproduzível:
   - as contagens de tentativas e de classes;
   - o número de seções por classe;
   - a frase "a quebra do leitor não explica os sinais do H05".

### Como reproduzir

```sh
# varredura dos logs: pacote do 2º turno, com o dia do 1º turno; pacote do 1º turno quando o dia não bate com o BU
# ~70 min com 3 processos; retomável por UF; saída data/parsed/auditoria/estatistico-eleitoral/leitor/<uf>.jsonl
node scripts/auditoria/estatistico-h05-leitor-varrer.mjs --paralelo 3
# análise (~1 min): classes, M0/M1/M2, estrato, família de 56 testes e gráfico
node --max-old-space-size=6144 scripts/auditoria/estatistico-h05-leitor.mjs
#   saída: h05-leitor.json, h05-leitor-por-uf.csv, h05-leitor-grafico.csv, h05-leitor.svg
# BU bruto das seções citadas (turnos 1 e 2)
node src/exportar.js --turno 1 --uf pr --municipio 74993 --zona 0159 --secao 0009 --log nao --stdout
node src/exportar.js --turno 2 --uf pr --municipio 74993 --zona 0159 --secao 0009 --log nao --stdout
# idem para pr 77399/0124/0080 e mg 52752/0268/0068
```

**Seções citadas:** PR 74993/0159/0009, PR 77399/0124/0080 e MG 52752/0268/0068. As três foram conferidas no BU bruto dos dois turnos, e as contagens do log também batem com o BU. Nenhuma outra seção é citada.
