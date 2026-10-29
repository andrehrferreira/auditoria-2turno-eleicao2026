# 14. Parecer: linha de base 2018 e 2022 do balanço entre turnos

Revisor cético, 29/10/2026. Achado revisado: [cientista-politico/04-linha-de-base-historica.md](../cientista-politico/04-linha-de-base-historica.md).
Consolida três revisões independentes (lentes: reprodução, definições e explicações alternativas) e uma conferência própria dos pontos em que elas divergiam.
Rótulos: **Fato**, **Hipótese**, **Recomendação**.

## Veredito: sustentado com ressalvas

- Todos os números reproduzem, com três scripts independentes e leitores de zip diferentes.
- O que não se sustenta é a leitura tranquilizadora:
  - "73,6% não é raro" e "a geografia repete 2018 (0,51)" foram apresentados como sinais contra manipulação;
  - as duas métricas não teriam detectado uma troca de votos capaz de virar o resultado.
- O "novo de 2026" (+4,0% de votos nominais) se confirma. Ele se divide em duas partes, e as duas vão no sentido contrário de 2018 e 2022.
- Há dois erros de texto no doc 04.

## Afirmação original

> Os 73,6% do disponível que foram para o 13 em 2026 não são raros (2018: 64,8% para Haddad; 2022: 69,8% para Bolsonaro); a queda de comparecimento no interior do Norte (AC, AP, RR) se repete em 2018 e 2022 qualquer que seja o lado que cresce; a geografia da virada de 2026 repete a de 2018 (correlação 0,51). O novo de 2026 é o crescimento de +4,0% nos votos nominais entre os turnos (2022: +0,3%; 2018: −2,1%), em todas as regiões menos o Norte.

## Afirmação revisada (o alcance que os dados sustentam)

**Parte do disponível (Fato).**
- O finalista que mais cresceu ficou com 64,8% do disponível em 2018, 69,8% em 2022 e 73,6% em 2026.
- Com só dois anos de base, essa métrica não distingue 2026 de um cenário com troca de votos do 22 para o 13.
  - Cada 141 mil votos trocados sobem a parte do 13 em 1 p.p.
  - Uma troca de 2,2 mi de votos, o bastante para virar o resultado, levaria uma parte verdadeira de 57,9% aos 73,6% observados.
- Ela não serve como evidência a favor nem contra manipulação.

**Interior do Norte (Fato).**
- A queda de 10% a 13% dos votos nominais no interior de AC, AP e RR se repete nos três anos.
- Em 2026, ela também aparece no comparecimento.

**Geografia da virada (Fato, mas não absolve).**
- As viradas municipais de 2026 têm correlação de 0,51 com as de 2018 e de 0,14 com as de 2022.
- A correlação com 2018 cai para 0,14 quando se controla, nos dois anos, a fatia dos eliminados e a fatia do 13 no 1º turno.
- Uma troca uniforme capaz de virar o resultado ainda deixaria a correlação em 0,475.

**O que é novo em 2026 (Fato).**
- Os votos nominais crescem +4,0% entre os turnos, contra +0,3% em 2022 e −2,1% em 2018.
- O crescimento é positivo em todas as regiões menos o Norte. Mesmo assim, 2026 fica acima de 2018 e de 2022 em **todas** as regiões, inclusive no Norte.
- Ele tem duas partes, com os mesmos aptos nos dois turnos:
  - **62% vem do comparecimento:** +2,96 mi, de 78,92% para 80,78% dos aptos;
  - **38% vem da queda de brancos e nulos:** −1,82 mi, de 4,77% para 3,24% do comparecimento.
- Sozinha, cada parte já daria um crescimento de +2,36% e de +1,60%.

**Comparação com 2018 e 2022 (Hipótese).**
- Pelos totais oficiais desses anos, as duas partes vão no sentido contrário:
  - o comparecimento variou +0,46% em 2022 e −1,22% em 2018;
  - brancos e nulos subiram nos dois anos.
- Esses totais são referência externa ao repo. Ficam como Hipótese até serem reproduzidos por script.

**Causa (não testada).**
- O único controle técnico com rastro é o E2, de biometria. Ele cobre parte das UFs e não cobre a queda de brancos e nulos.

## O que foi reproduzido (números)

| | 2018 | 2022 | 2026 |
|---|---|---|---|
| Finalistas (A / B) | 13 / 17 | 22 / 13 | 13 / 22 |
| ΔA | +15.698.855 | +7.134.009 | +10.376.694 |
| ΔB | +8.520.837 | +3.086.495 | +3.721.538 |
| Eliminados | 26.431.688 | 9.897.870 | 9.316.747 |
| Parte do disponível com A | 64,8% | 69,8% | 73,6% |
| ΔA ÷ eliminados | 59,4% | 72,1% | 111,4% |
| Votos nominais 1º → 2º | −2,07% | +0,27% | +4,01% |
| Nominais N / NE / SE / S / CO / exterior | −6,31 / +1,01 / −3,48 / −1,44 / −1,80 / −4,13 | −3,11 / −0,26 / +0,99 / +0,88 / +0,70 / +1,24 | −1,41 / +4,58 / +4,96 / +3,92 / +2,79 / +12,32 |

**Conferências de consistência (Fato).**
- **Identidade exata:** ΔA + ΔB = eliminados + Δnominais nos três anos. O "disponível" não depende do comparecimento.
- **Finalistas:** os números com voto no 2º turno coincidem com os marcados "2º TURNO" no 1º turno.
  - Os totais conferem com o resultado oficial: Bolsonaro 49.277.010 → 57.797.847 e Haddad 31.342.051 → 47.040.906 em 2018; Lula 57.259.504 → 60.345.999 e Bolsonaro 51.072.345 → 58.206.354 em 2022.
- **Dados limpos:** zero linhas duplicadas e destinação só "Válido". QT_VOTOS_NOMINAIS é igual a QT_VOTOS_NOMINAIS_VALIDOS.
  - Os leiames de 2022 e 2026 são idênticos byte a byte. O de 2018 tem o mesmo texto.
- **Norte, capital / interior:** a tabela da seção 2 do doc 04 bate nos três anos (AC, AP, RR e AM).
  - Em 2026, a variação dos nominais no interior acompanha o comparecimento com até cerca de 1 p.p. de diferença: AC −11,5% / −10,5%, AP −12,7% / −13,3%, RR −11,9% / −12,6%.
- **Correlações das viradas:** 2026 × 2018 = 0,512 em 5.648 municípios; 2026 × 2022 = 0,136 em 5.657; 2022 × 2018 = 0,216.

**Decomposição de 2026** (detalhe_votacao_secao_2026_BR, universo completo: 499.248 seções nos dois turnos, nenhuma só num turno):

| | 1º turno | 2º turno | Δ |
|---|---|---|---|
| Aptos | 158.745.502 | 158.745.502 | 0 |
| Comparecimento | 125.275.835 (78,92%) | 128.236.074 (80,78%) | +2.960.239 (+2,36%) |
| Brancos | 2.300.798 | 1.430.496 | |
| Nulos | 3.669.003 | 2.723.305 | |
| Brancos + nulos (% do comparecimento) | 4,77% | 3,24% | −1.816.000 (−1.821.246 com o nº 28 como nulo) |
| Nominais, detalhe | 119.306.034 | 124.082.273 | +4,003% |
| Nominais, munzona | 119.300.788 | 124.082.273 | +4,008% |

- **A conta fecha:** comparecimento = nominais + brancos + nulos em todas as seções, nos dois turnos. Legenda e anulados com apuração em separado são 0.
- **Contrafactuais:**
  - com o comparecimento do 1º turno e só a queda de brancos e nulos, os nominais cresceriam +1,60%;
  - com a fração de brancos e nulos do 1º turno e só o comparecimento, cresceriam +2,36%.
- **Por região**, o comparecimento variou: NE +2,33%, SE +3,15%, S +2,85%, CO +2,12%, exterior +11,6%, Norte −2,25%.
  - No Norte, a queda de brancos e nulos (de 3,44% para 2,61%) amorteceu a queda dos nominais.
- **2018 e 2022 (Hipótese, referência externa):**
  - 2018: comparecimento −1,22%; brancos e nulos de 8,79% para 9,57% do comparecimento (+7,6%); com o comparecimento fixo, nominais −0,86%.
  - 2022: comparecimento +0,46%; brancos e nulos de 4,41% para 4,59% (+4,5%); com o comparecimento fixo, −0,19%.
  - Validação parcial: válidos = comparecimento − brancos − nulos bate exato com o munzona em 2022 e no 2º turno de 2018. No 1º turno de 2018 a diferença é de 763 votos.
- **Caso no arquivo bruto:** RJ, Campos dos Goytacazes, município 58190, zona 0098, seção 0026. O BU decodificado é idêntico ao detalhe nos dois turnos.
  - 1º turno: aptos 332, comparecimento 257, nominais 234, brancos 12, nulos 11.
  - 2º turno: comparecimento 251, nominais 238, brancos 6, nulos 7.

## Pontos em que os revisores divergiam (conferidos por mim)

1. **Tamanho da queda de brancos e nulos.** A revisão de reprodução escreveu "−1,85 mi". O valor certo é −1.816.000 no detalhe, ou −1.821.246 contando os 5.246 votos do nº 28 como nulos (eles entram como nominais no detalhe e ficam fora do munzona). O próprio JSON daquela revisão (4,77% → 3,24%) dá −1,82 mi. É erro de digitação, sem efeito na conclusão.
2. **"+1,6%" × "+2,36%" com ajuste.** Não há contradição: são contrafactuais diferentes. Com o comparecimento fixo, sobra +1,60% (só a queda de brancos e nulos). Com a fração de brancos e nulos fixa, sobra +2,36% (só o comparecimento). A faixa de +1,5% a +2,4% da revisão de definições cobre os dois. As duas partes saem da linha de base de 2018 e 2022.
3. **A correlação de 0,51 "resiste" ou "cai"?** As duas medidas valem e respondem perguntas diferentes:
   - **controle de UF:** dentro de cada UF, a correlação fica em 0,392 (Spearman sem peso: 0,601). Ela não vem só de diferenças entre UFs;
   - **controle de estrutura:** com a fatia dos eliminados, a fatia do 13 no 1º turno e f1·(1−f1) nos dois anos, a correlação parcial cai para 0,137, o mesmo nível de 2026 × 2022 (0,158). Só a fatia dos eliminados em 2026 tem correlação de 0,507 com a virada de 2026.
   - **leitura:** o mapa da virada é, sobretudo, o mapa de onde estavam os votos dos eliminados. Uma alteração proporcional a esses votos, ou uniforme, reproduziria o mesmo mapa. A frase do doc 04 "uma manipulação localizada não teria por que reproduzir o mapa de 2018" só vale contra manipulação concentrada em poucos municípios sorteados.
4. **Aptos "iguais" nos dois turnos.** São iguais no Brasil (158.745.502), mas não seção a seção:
   - 55.722 seções mudaram de aptos entre os turnos, somando 74.692 eleitores em valor absoluto e saldo exatamente zero;
   - as UFs variam de −334 (PA) a +699 (SP) e +675 (DF);
   - Hipótese benigna, não testada: voto em trânsito habilitado para um só turno, que move o eleitor de seção sem mudar o total. O efeito no comparecimento nacional é nulo, e nas regiões fica abaixo de 0,01 p.p.;
   - nenhuma das três revisões tinha visto isso.

## Problemas encontrados

1. **Leitura tranquilizadora sem poder (absolvição falsa parcial, Fato).**
   - "Não é raro" não mostra que os votos são legítimos. A parte do disponível é calculada sobre um disponível que já inclui os +4,78 mi de nominais novos.
   - Com dois anos de base (65% a 74%), a métrica não detecta uma troca de até cerca de 2,2 mi de votos.
   - Para sair do nível de 2022 até o observado bastam 536 mil votos trocados; do nível de 2018, 1,24 mi.
2. **A correlação de 0,51 não discrimina (Fato).**
   - Na simulação, uma troca uniforme de 4% dos votos do 22 (2,39 mi, o bastante para virar a margem de 4,43 mi) leva a correlação de 0,512 para 0,475.
   - Uma troca que segue o mapa de 2018 (1,27 mi) a sobe para 0,748.
   - Só uma troca localizada e aleatória a derruba: 10% dos votos do 22 em 5% dos municípios, cerca de 309 mil votos, dá mediana de 0,345.
   - Falta uma distribuição nula: existe só um par de anos com o mesmo lado crescendo.
3. **O doc 04 não decompõe o +4,0% (Fato).**
   - O repo já tinha o detalhe_votacao_secao de 2026. A decomposição (62% comparecimento, 38% brancos e nulos) deveria constar no achado.
   - Com ela, a parte "mobilização + menos brancos/nulos" da Hipótese do autor vira Fato quanto à divisão. A causa continua sem teste.
4. **"Quatro vezes o de 2022" está errado (Fato).** +4,01% contra +0,27% é cerca de 15 vezes. Com uma base perto de zero, a razão não tem significado; o certo é falar em p.p.
5. **"Fica acima dos dois anos anteriores em todas, menos no Norte" está errado (Fato).** O Norte de 2026 (−1,41%) também fica acima de 2022 (−3,11%) e de 2018 (−6,31%). O Norte é só a única região com sinal negativo. A afirmação original ("crescimento em todas as regiões menos o Norte") está certa quanto ao sinal, mas subestima o achado.
6. **A comparação de comparecimento e brancos/nulos com 2018 e 2022 depende de constantes externas** (Hipótese). O munzona não traz comparecimento. Os totais oficiais usados pelos revisores batem com os válidos do munzona (exato em 2022 e no 2º turno de 2018; 763 votos no 1º turno de 2018), mas não há arquivo no repo.
7. **Robustez do código do autor (Fato, sem efeito aqui).**
   - `politico-linha-de-base.mjs` soma QT_VOTOS_NOMINAIS sem filtrar NM_TIPO_DESTINACAO_VOTOS e sem checar duplicatas. Em outro ano, votos "Anulado" entrariam em silêncio. Nos três anos tudo é "Válido", com 0 duplicatas.
   - A divisão capital × interior depende de o NM_MUNICIPIO bater com um texto fixo. Bateu nos três anos.
8. **Fontes de 2026 com o nº 28 tratado de forma diferente (Fato, efeito desprezível).** Os 5.246 votos do 28 contam como nominais no detalhe e não aparecem no munzona. O efeito é de 0,005 p.p. no +4,0%, mas o doc 04 não registra isso na seção do crescimento.

## Explicações alternativas

| Explicação | Tipo | Testada? | Resultado |
|---|---|---|---|
| Nº 28 anulado (substituição no PRTB) infla o Δnominais | técnica | sim | 5.246 votos, 0,11% do Δ; muda +4,008% para +4,003%. Descartada. |
| Legenda, anulados com apuração em separado ou definição diferente de nulo entre turnos ou anos | técnica | sim | Legenda e anulados são 0; a conta do comparecimento fecha em todas as seções; leiames iguais. Descartada. |
| 1º turno de 2026 incompleto, seções a mais ou a menos, aptos diferentes | técnica | sim | Mesmas 499.248 seções e mesmos aptos no total; munzona = detalhe por UF, exceto o nº 28. Descartada. Os aptos por seção mudam com saldo zero (ver divergência 4). |
| Finalistas trocados ou "disponível" dependente de comparecimento | método | sim | Finalistas certos; identidade exata. Descartada. |
| +4% é só queda de brancos e nulos | definição | sim | Explica 38%; os 62% restantes são comparecimento. Explica parte, não tudo. |
| Nominais aproximam mal o comparecimento no Norte | definição | sim, em 2026 | Diferença de até ~1 p.p. em 2026; em 2018 a aproximação exagera um pouco a queda. Não muda a conclusão. |
| Mapa da virada é geografia política recorrente | benigna | sim | 0,51 com 2018; 0,39 dentro das UFs; 0,14 com controles de estrutura. Compatível com geografia e também com troca proporcional ou uniforme. Não discrimina. |
| Mobilização e polarização elevam o comparecimento no 2º turno | benigna, comportamento | **não** | Só suposta pelo autor. A correlação entre a alta de comparecimento e a virada pró-13 por município é de 0,093: combina com mobilização difusa e com inserção uniforme. Pelo princípio 8, não reduz risco. |
| Queda no interior do Norte por acesso e transporte | benigna, comportamento | **não** (só a repetição) | A repetição em três anos é Fato; a causa é suposta. Transporte de eleitores por candidatos é risco humano (princípio 8). |
| Eleitores de eliminados deixam de anular | benigna, comportamento | **não** | A regressão ecológica dá coeficiente de 1,53 para a queda de brancos e nulos (1,59 em 2018), acima de 1. Não serve como evidência em nenhum sentido. |
| Troca de votos do 22 para o 13 no 2º turno | maligna | poder testado | A métrica do autor não a exclui (ver "Poder do teste"). |
| Comparecimento fictício (inserção de votos) no 2º turno | maligna | **não** | É exatamente o rastro que se esperaria. O controle técnico (E2, biometria) cobre parte das UFs; SP, RS, SC e SE ainda não têm 1º turno na cópia de leitura, e o SE e o S somam a maior parte da alta. |
| Brancos e nulos do 2º turno convertidos em nominais | maligna | **não** | A queda de 30,5% é compatível com isso e com comportamento. A coerência RDV × BU não detecta, porque os dois saem da mesma urna. Nenhum controle técnico cobre esse componente. |

## Poder do teste

- **Parte do disponível:**
  - **Hipótese nula:** a divisão de 2026 é como a de 2018 e 2022.
  - **Linha de base:** 2 pontos (64,8% e 69,8%).
  - **Tamanho do efeito:** +3,8 p.p. sobre 2022.
  - **Sensibilidade:** 1 p.p. a cada 141 mil votos trocados.
  - **Poder:** praticamente nulo contra uma troca do tamanho da margem.
- **Correlação das viradas:**
  - **Hipótese nula:** geografia política repetida.
  - **O que detecta:** só manipulação localizada e aleatória, com centenas de milhares de votos.
  - **O que não detecta:** troca uniforme ou proporcional aos eliminados.
  - **Linha de base:** sem distribuição nula, porque há 1 par de anos com o mesmo lado crescendo.
- **Crescimento dos nominais:**
  - **O que é:** a medida com mais sinal. As duas partes saem da faixa de 2018 e 2022.
  - **Limite:** a série tem 2 anos, e 2018 e 2022 dependem de referência externa. "Fora da série" ainda não é "raro" em sentido estatístico.
  - Anomalia estatística não é prova de fraude.

## Pendências

1. **Recomendação:** baixar o `detalhe_votacao_munzona` (ou o `detalhe_votacao_secao`) de 2018 e 2022 e reproduzir por script o comparecimento e os brancos e nulos dos dois turnos. Hoje esses números são constantes externas.
2. **Recomendação:** ampliar a base histórica com 2014, 2010 e 2006. Isso permite dizer se um comparecimento que sobe 1,86 p.p. no 2º turno, com brancos e nulos caindo 30%, tem precedente. Hipótese ainda não verificada: nesses anos o comparecimento caiu entre os turnos.
3. **Recomendação:** rodar o E2 (biometria × sem biometria no eleitor a mais) em todas as UFs quando o 1º turno estiver completo no banco. Na cópia de leitura de 09:27 faltam SP, RS, SC, SE, TO e o exterior, e AM e BA não têm perfil. O resultado atual é **parcial**.
4. **Recomendação:** testar seção a seção o componente de brancos e nulos: como se distribui a queda, se ela se relaciona com o ganho do 13 e se o RDV confirma brancos e nulos contra o BU. Hoje nenhum controle técnico cobre esse componente.
5. **Recomendação:** testar a Hipótese de voto em trânsito para as 55.722 seções com aptos diferentes entre turnos (saldo zero), com o cadastro de trânsito ou o perfil por seção.
6. **Recomendação ao autor (não editado por mim):** corrigir no doc 04 "quatro vezes o de 2022" e "menos no Norte", incluir a decomposição 62/38 e retirar "não teria por que reproduzir o mapa de 2018" como argumento contra manipulação.

## Comandos que reproduzem esta revisão

```bash
# autor
node scripts/auditoria/politico-linha-de-base.mjs
# lente reprodução (leitor de zip próprio, decomposição por região, Norte, caso no BU bruto)
node scripts/auditoria/cetico-lb-reproducao.mjs
node scripts/auditoria/cetico-lb-norte.mjs
node scripts/auditoria/cetico-lb-bu-bruto.mjs
# lente definições (decomposição, leiames, correlação parcial com controles de estrutura)
node scripts/auditoria/cetico-lbh-dados.mjs
node scripts/auditoria/cetico-lbh-dados-leiame.mjs
node scripts/auditoria/cetico-lbh-dados-virada.mjs
# lente alternativas (regressão ecológica, correlação dentro da UF, simulação de poder)
node scripts/auditoria/cetico-linha-de-base-2018-2022-alternativas.mjs
# consolidação (divergências: queda de brancos/nulos, contrafactuais, aptos por seção)
node scripts/auditoria/cetico-lbc-consolidacao.mjs
```

Saídas em `data/parsed/auditoria/cetico/`: `lb-reproducao.json`, `lb-norte.txt`, `lb-bu-bruto-rj-58190-0098-0026.txt`, `cetico-lbh-dados.json`, `cetico-lbh-dados-virada.json`, `linha-de-base-2018-2022-alternativas.txt`, `lbc-consolidacao.json`.

## Errata: gerador aleatório (29/10/2026)

- **Causa:** a simulação de troca localizada e aleatória (seção 5b de `cetico-linha-de-base-2018-2022-alternativas.mjs`) sorteava os municípios com `(semente * 1103515245 + 12345) % 2 ** 31`, que estoura a precisão do double. O gerador foi trocado por mulberry32 (mesma semente, 20261025); nada mais mudou no script. As saídas antigas estão em `data/parsed/auditoria/cetico/antes-gerador/`.
- **Só a simulação localizada mudou.** Reprodução, correlações (0,512, 0,136, 0,216, 0,392 dentro da UF), decomposição, regressão, troca uniforme (0,475) e troca que segue o mapa de 2018 (0,748) saem idênticos.
- **Número citado (problema 2):** 10% dos votos do 22 em 5% dos municípios: votos trocados, média 308.729 → **304.290** ("cerca de 309 mil" → "cerca de 304 mil"); mediana da correlação 0,345 → **0,363** (faixa P5–P95: 0,312–0,420 → 0,333–0,464).
- **Demais cenários (não citados no texto):** 5%/5%: 162.425 → 140.536 votos, mediana 0,446 → 0,449, P95 0,530 → 0,497; 10%/5%: mediana 0,415 → 0,411; 10%/10%: 0,294 → 0,300; 20%/5%: 0,377 → 0,375; 20%/10%: 0,258 → 0,269.
- **Veredito não muda.** A troca localizada e aleatória continua sendo a única que derruba a correlação: no cenário citado, até o P95 (0,464) fica abaixo da base de 0,512. A leitura "a correlação de 0,51 não discrimina troca uniforme ou proporcional" não depende do sorteio.
