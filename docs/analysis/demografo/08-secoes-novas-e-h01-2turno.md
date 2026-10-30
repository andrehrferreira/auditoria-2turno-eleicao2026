# 08. Seções novas com 95% ou mais e H01 no 2º turno (linha de base de 2022)

Data: 30/10/2026. Duas frentes ligadas à H01 (títulos de falecidos), pedidas pelo coordenador:

1. as seções criadas depois de 2022 com comparecimento de 95% ou mais (parecer cético 38, item 5), agora com o comparecimento por seção de 2022;
2. o comparecimento oficial por idade dos eleitores de 100+ no 2º turno.

Tudo agregado por seção, local, zona, município ou UF. Nenhum CPF, nenhum número de título, nada de `data/private/`. O banco foi lido pela cópia imutável (`abrirLeitura()`, cópia `2026-10-29T10:50`). `data/raw` não foi varrido. Rótulos: **Fato**, **Hipótese**, **Estimativa** (número que sai de modelo), **Pendente**, **Recomendação**.

## Arquivos baixados (rede liberada pelo coordenador, só TSE)

Lista com URL, Last-Modified, ETag, tamanho e SHA-256: [08-arquivos-baixados.csv](08-arquivos-baixados.csv). O SHA-512 fica em `data/raw/dadosabertos/demografo-manifesto.json`. Os arquivos de `odsele` não têm `.sha512` publicado ao lado (o pedido devolve 404), então só existe o hash calculado aqui.

| Arquivo | SHA-256 | Para quê |
|---|---|---|
| `detalhe_votacao_secao_2022.zip` (31/07/2026) | `ad22c50b…02c03da` | comparecimento por seção de 2022, os dois turnos |
| `detalhe_votacao_secao_2020.zip` | `10a50a46…bc71a30` | lista das seções de 2020 (define "nova em 2022") |
| `detalhe_votacao_secao_2018.zip` | `de35b08d…f70` | lista das seções de 2018 (define "nova em 2022") |
| `perfil_comparecimento_abstencao_2022.zip` (30/04/2025) | `fb4e03d9…a7df` | comparecimento por idade de 2022, os dois turnos |
| `perfil_comparecimento_abstencao_2026.zip` | não rebaixado | ETag `"da985e4-65e5c6781db46"` igual ao da cópia do disco (Last-Modified 21/10/2026) |

**Fato (conferência de fonte):** as 472.024 seções do CEFT do 1º turno de 2022 estão todas no `detalhe_votacao_secao_2022`; o detalhe tem 51 a mais (472.075), que não têm local no CEFT.

---

## Frente 1. Seções novas com comparecimento de 95% ou mais

### O que se testou

- **Hipótese do parecer 38:** a seção nova não carrega eleitor morto, nem eleitor que se mudou sem transferir o título. Esse "peso morto" (título que fica no cadastro mas nunca vota) puxa para baixo o comparecimento das seções antigas. Sem ele, a seção nova teria um teto mais alto e chegaria a 95% com mais facilidade.
- **Previsões dessa hipótese, se ela for o mecanismo principal:**
  1. no mesmo local de votação, a seção nova vota **mais**, em média, do que as antigas;
  2. o perfil do cadastro (parcela sem biometria, parcela de 90+ e 100+) explica a diferença;
  3. o excesso das novas aparece só na cauda de cima (95% ou mais), não na de baixo.
- **Hipótese nula (que não envolve fraude nem peso morto):** a seção nova é menor e mais homogênea (um grupo de eleitores recém-chegados, um condomínio, uma comunidade, uma seção com eleitores em trânsito). Por isso ela se espalha mais para os dois lados: mais seções muito altas e mais seções muito baixas.
- **Definição de "nova"** (a mesma do parecer 38): chave UF/município/zona/seção ausente do CEFT do 1º turno de 2022 ou, fora de DF e do exterior, ausente do CEFT do 1º turno de 2024. Aptos do BU (`secao_eleicao`, Presidente) e comparecimento do BU (`secao`).
- **Exclusões, por turno:** 41 seções sem pacote (`sem_arquivo`) e 31 (1º turno) e 29 (2º turno) seções do Sistema de Apuração. Para o perfil, as agregadas foram somadas na seção principal. Seções sem perfil: 296 novas e 93 antigas, que ficam fora só das partes que usam o perfil.

### 1. Reprodução e perfil do cadastro (Fato)

| 2º turno | Seções | Aptos médios | Comparecimento | Com 95% ou mais | Sem biometria no cadastro | 80+ | 90+ | 16–17 |
|---|---|---|---|---|---|---|---|---|
| Novas | 40.740 | 279 | **79,02%** | 433 (1,06%) | 7,39% | 2,03% | 0,49% | 3,45% |
| Antigas | 458.438 | 321 | **80,92%** | 206 (0,045%) | 11,26% | 3,59% | 0,85% | 0,84% |
| Novas com 95%+ | 433 | 168 | 96,24% | — | **0,27%** | 0,73% | 0,07% | 9,89% |
| Antigas com 95%+ | 206 | 206 | 95,91% | — | 5,07% | 2,22% | 0,29% | 1,55% |

1º turno: novas 78,09% (448 com 95% ou mais), antigas 78,98% (111). Os números 433 × 206 e 448 × 111 do parecer 38 foram reproduzidos exatamente.

- **Fato:** no país, a seção nova vota **menos** do que a antiga, nos dois turnos (−1,9 ponto no 2º turno), apesar de ter cadastro mais limpo (menos sem biometria, menos idosos).
- **Fato:** das 433 novas com 95% ou mais, **385 não têm nenhum eleitor sem biometria**. Entre todas as novas, 16.917 (41,5%) não têm nenhum. Nas antigas, 23.456 (5,1%). Taxa de 95% ou mais nesse grupo "100% com biometria": novas 2,28% (385 de 16.917), antigas 0,14% (34 de 23.456).
- **Fato (eleitor em trânsito e afins, TTE):** 239 das 433 têm eleitores TTE entre os aptos, somando 11.585 dos 72.735 aptos delas (15,9%). Em 40, o TTE é a maioria. Pelo tipo oficial do local (`eleitorado_local_votacao_2026`), 19 são de voto em trânsito, 6 de presos provisórios e 408 convencionais. Pelo nome do local, 25 ficam em aldeia ou terra indígena, 3 em quilombo e 2 em assentamento.
- **Fato:** sem as seções com TTE, as novas com 95% ou mais caem para 194 de 24.080 (0,81%) e as antigas ficam em 158 de 324.346 (0,049%). A razão cai de 23,7 para 16,5 vezes.

### 2. Mesmo local de votação, 2022 × 2026 (Fato)

Locais de 2026 (UF/município/zona/local) que têm ao menos uma seção nova e uma antiga: **19.375**. As antigas desses locais foram procuradas no `detalhe_votacao_secao_2022` pela mesma chave: todas as 94.784 têm par.

| Locais mistos | Seções | Comparecimento 2022 | Comparecimento 2026 | Com 95%+ em 2022 | Com 95%+ em 2026 |
|---|---|---|---|---|---|
| **2º turno**, antigas | 94.784 | 79,05% | 80,06% | 25 | 24 |
| **2º turno**, novas | 28.195 | (não existiam) | **78,71%** | — | **193** |
| 1º turno, antigas | 94.783 | 78,68% | 78,31% | 31 | 10 |
| 1º turno, novas | 28.195 | — | 77,94% | — | 189 |

- **Fato:** no mesmo local, a nova vota em média 1,35 ponto **abaixo** das antigas no 2º turno (78,71% × 80,06%). Diferença por local (nova − antigas): mediana −0,33 ponto, metade dos locais entre −3,9 e +3,1 pontos. A nova vota mais do que as antigas em 9.187 locais e menos em 10.182.
- **Fato:** as antigas desses locais não mudaram de padrão entre 2022 e 2026: comparecimento de 79,05% para 80,06% no 2º turno e 25 para 24 seções com 95% ou mais.
- **Fato (universo das antigas, mesma seção):** as 458.438 antigas foram de 79,47% (2022) para 80,92% (2026) no 2º turno. Seções com 95% ou mais: 219 em 2022 e 206 em 2026; só 40 nos dois anos.

**O comparecimento de 2022 não mostra nada de diferente nos locais que receberam seções novas.** O que mudou foi a criação das seções novas, e elas, no mesmo local, ficam em média abaixo das antigas.

### 3. As duas caudas, no mesmo local (Fato)

Para cada seção cujo local tem 100 ou mais aptos em **outras** seções antigas, comparou-se o comparecimento dela com o das outras antigas do local.

| 2º turno | Seções | 15 pontos ou mais **acima** do local | 15 pontos ou mais **abaixo** do local | Abaixo de 60% | 95% ou mais |
|---|---|---|---|---|---|
| Novas | 28.194 | 321 (1,14%) | 372 (1,32%) | 518 (1,84%) | 193 (0,68%) |
| Antigas | 435.852 | 172 (0,039%) | 372 (0,085%) | 1.418 (0,33%) | 74 (0,017%) |
| Novas sem TTE | 16.798 | 161 (0,96%) | 248 (1,48%) | 401 (2,39%) | 71 (0,42%) |
| Antigas sem TTE | 308.088 | 122 (0,040%) | 256 (0,083%) | 1.181 (0,38%) | 52 (0,017%) |

No 1º turno, o padrão é o mesmo: novas 463 acima e 331 abaixo; antigas 176 e 579.

- **Fato:** a seção nova se afasta do próprio local **para os dois lados**, mas **a cauda de cima infla mais**. Ela fica 15 pontos acima 29 vezes mais do que a antiga e 15 pontos abaixo 16 vezes mais. Sem TTE, 24 contra 18 vezes. Em números absolutos, sem TTE, a nova fica mais vezes abaixo (248) do que acima (161). "Para os dois lados" não torna a cauda de cima inteiramente benigna (correção do parecer cético 41).
- **Fato (sobre o método):** a binomial (o modelo em que cada eleitor decide sozinho, com a taxa do local) prevê quase zero seções a 15 pontos do local, tanto nas novas (0,29 e 1,32) quanto nas antigas (0,01 e 0,05). As seções reais variam muito mais do que esse modelo. Por isso a comparação válida é entre novas e antigas, e não contra a binomial. Os valores esperados estão em `novas-resumo.json` (`caudaPorLocal`).
- **Hipótese (que não envolve fraude):** a seção nova junta um grupo parecido, seja um conjunto de transferências recentes, um bairro novo, uma comunidade ou uma seção com TTE. Grupos parecidos têm comparecimento extremo para os dois lados. A seção antiga, misturada ao longo de anos, fica perto da média do local.

### 4. O perfil explica a diferença? Regressão com efeito fixo de local (Estimativa)

Seções sem TTE e com perfil (2º turno: 325.606 seções em 59.853 locais com 2 ou mais seções). Ponderada por aptos. Erro-padrão agrupado por local. Variável de resposta: comparecimento ÷ aptos. "Efeito fixo de local" quer dizer que cada seção é comparada só com as outras do mesmo local, como comparar irmãos da mesma família.

| Coeficiente de "seção nova" (pontos de comparecimento) | 1º turno | 2º turno |
|---|---|---|
| Só "nova" | −0,62 (EP 0,07) | −1,23 (EP 0,06) |
| + parcela por faixa (16–17, 70–79, 80–89, 90–99, 100+) e sem biometria por faixa | −2,99 (0,07) | −3,11 (0,07) |
| + tamanho (log dos aptos) | −3,08 (0,07) | −3,15 (0,07) |
| + faixas finas 18–20 e 60–69 + tamanho | −0,89 (0,09) | −0,76 (0,09) |

- **Estimativa:** o sinal é negativo em todos os modelos. **Com o mesmo perfil e no mesmo local, a seção nova vota menos, não mais.** O tamanho do efeito depende do modelo (de −0,8 a −3,1 pontos); o sinal não depende.
- **Estimativa (decomposição, locais mistos, 2º turno):** diferença bruta nova − antiga de −2,16 pontos (77,70% × 79,86%, seções do modelo). A parte que o perfil explica, com os coeficientes das antigas, é de **+0,19 ponto** a favor da nova; no 1º turno, +0,65 ponto. O resto vai no sentido contrário ao da hipótese.

### 5. Medida indireta do "peso morto" (Estimativa)

Com os coeficientes das antigas (efeito fixo de local, 2º turno), somou-se só a parte que vem do cadastro envelhecido: sem biometria em todas as faixas, 90–99 e 100+.

| 2º turno | Comparecimento a menos atribuível ao cadastro envelhecido |
|---|---|
| Antigas (todas) | 1,72 ponto |
| Novas (todas) | 1,21 ponto |
| Antigas nos locais mistos | 1,73 ponto |
| Novas nos locais mistos | 1,00 ponto |

- **Estimativa:** o "peso morto" visível no perfil custa às antigas cerca de 0,5 a 0,7 ponto de comparecimento **a mais** do que às novas. Para uma seção sair de 80% e chegar a 95%, faltam 15 pontos. **O peso morto medido pelo perfil do cadastro explica uma fração pequena da cauda de 95% ou mais.** A outra forma da mesma ideia, a "recência" (a seção nova reúne quem se alistou ou se transferiu há pouco tempo, gente viva que mora ali), não se mede pelo perfil; ver o item 5b.
- **Limite:** é regressão ecológica, que usa a composição de cada seção e não o voto de cada eleitor. O coeficiente da faixa 16–17 muda de sinal entre o modelo das antigas (−0,36) e o modelo completo (+0,14), sinal de instabilidade quando a faixa é rara. Os coeficientes de 90–99 e 100+ são estáveis entre modelos e coerentes com o doc 03 (100+ sem biometria praticamente não vota).

### 5b. Controle pelo tamanho da seção e o proxy de recência (correção do parecer cético 41)

A seção nova é menor, e seção pequena oscila mais, como uma moeda jogada 50 vezes oscila mais do que uma jogada 300 vezes. Padronização indireta: para cada faixa de 25 aptos, a taxa de 95% ou mais das **antigas** daquela faixa. O "esperado" é quantas novas passariam de 95% se tivessem a taxa das antigas do mesmo tamanho.

| | Observadas | Esperadas pelo tamanho | Razão com o tamanho controlado | Excesso (observadas − esperadas) | Parecer 41 (razão) |
|---|---:|---:|---:|---:|---:|
| 2026, 2º turno | 433 | 90,5 | **4,8** | 343 | 5,1 |
| 2026, 2º turno, sem TTE | 194 | 46,5 | **4,2** | 148 | 4,3 |
| 2026, 1º turno | 448 | 62,2 | **7,2** | 386 | 7,9 |
| 2022, 2º turno | 118 | 63,7 | **1,9** | 54 | 1,8 |
| 2022, 1º turno | 168 | 57,7 | **2,9** | 110 | 2,8 |

- **Fato:** o tamanho explica boa parte da razão bruta (23,7 vezes), mas não toda. Com o tamanho controlado, a nova de 2026 ainda chega a 95% cerca de 5 vezes mais que a antiga.
- **Fato:** o excesso de 2026 continua maior que o de 2022: cerca de 340 seções a mais do que o esperado no 2º turno de 2026, contra cerca de 50 em 2022. As pequenas diferenças para o parecer 41 vêm do corte das faixas de 25 aptos e do arquivo de 2022 (ver item 6).

**Proxy de recência.** A data de alistamento ou de transferência por seção não é pública. O melhor substituto no perfil é a parcela de eleitores de 16 a 20 anos, que em geral acabaram de tirar o título.

| 2º turno, parcela de 16–20 anos na seção | Novas | Novas com 95%+ | Antigas | Antigas com 95%+ |
|---|---:|---:|---:|---:|
| menos de 5% | 9.538 | 14 (0,15%) | 297.025 | 100 (0,034%) |
| 5–10% | 6.868 | 70 (1,02%) | 137.497 | 82 (0,060%) |
| 10–20% | 7.929 | 119 (1,50%) | 22.376 | 17 (0,076%) |
| 20% ou mais | 16.109 | 205 (1,27%) | 1.447 | 3 (0,21%) |

- **Fato:** **40% das seções novas** (16.109) têm 20% ou mais de eleitores de 16–20 anos; entre as antigas, 0,3%. A seção nova é, em boa parte, uma seção de eleitores recém-alistados.
- **Fato:** com o mesmo grau de juventude, a nova ainda passa de 95% muitas vezes mais que a antiga (por exemplo, 1,50% contra 0,076% na faixa de 10–20%). Controlando tamanho **e** juventude, a razão fica em 5,3 (2º turno, 80,1 esperadas) e 4,2 sem TTE (46,3 esperadas). Somando a parcela sem biometria ao estrato, fica em 4,8 (65,1 esperadas; 6.459 novas e 120 de 95%+ caem em estratos sem nenhuma antiga).
- **Leitura:** a juventude, como medida de recência, não explica o excesso. Isso **não** testa a recência de fato, porque o eleitor que se transfere de cidade também é "recente" e pode ter qualquer idade. **Pendente:** a data da última operação no cadastro (alistamento, transferência, revisão), agregada por seção, via LAI.

### 6. Linha de base histórica: o mesmo fenômeno em 2022 (Fato)

"Nova em 2022" = chave ausente do `detalhe_votacao_secao` de 2018 ou, fora de DF e do exterior, de 2020. É a mesma regra de 2026, deslocada uma eleição para trás.

**Nota de fonte (parecer 41):** este documento lê o `_BR.csv` do detalhe (votação de Presidente) de cada ano. O parecer leu o `BRASIL.csv`, que em 2022 tem 306 chaves a mais. Daí a diferença de 369 seções na classificação de 2022 (85.893 × 85.524 novas). Não muda a conclusão: a razão bruta é 4,7 aqui e 4,5 no parecer.

| | Novas de 2022 | Antigas de 2022 | Razão (taxa de 95%+) |
|---|---|---|---|
| Seções | 85.893 | 386.182 | |
| 2022, 1º turno: com 95%+ | 168 (0,196%) | 94 (0,024%) | 8,0 vezes |
| 2022, 2º turno: com 95%+ | 118 (0,137%) | 114 (0,030%) | 4,7 vezes |
| 2022, 2º turno, só locais mistos (40.292 locais) | 39 de 76.240 (0,051%) | 22 de 213.638 (0,010%) | 5,0 vezes |
| 2022, 2º turno: comparecimento médio | 79,42% | 79,42% | |
| **Mesmas seções em 2026**, 2º turno: com 95%+ | 41 de 81.749 (0,050%) | 171 de 379.447 (0,045%) | 1,1 vez |
| Mesmas seções em 2026: sem biometria no cadastro | 11,42% | 11,22% | |

- **Fato:** o excesso de seções novas com 95% ou mais **já existia em 2022** (de 4,7 a 8 vezes) e **sumiu em 4 anos**: em 2026, essas mesmas seções têm a taxa das antigas (0,050% × 0,045%) e o mesmo perfil de cadastro (11,4% × 11,2% sem biometria).
- **Fato:** o fenômeno de 2026 é maior. Em 2026, 1,06% das novas passam de 95% no 2º turno; em 2022, 0,137%. Com o tamanho controlado (item 5b), a razão contra as antigas é 4,8 em 2026 e 1,9 em 2022, com excesso de cerca de 340 seções em 2026 e cerca de 50 em 2022. A comparação das razões brutas (23,7 × 4,7) exagera a diferença e não deve ser usada.
- **Hipótese:** a seção nova "envelhece". Com o tempo entram nela transferências, mudanças, idosos e títulos de quem morreu, e ela converge para o padrão das antigas. Isso é coerente tanto com o peso morto como processo lento quanto com a recência. O peso morto medido pelo perfil (item 5) é pequeno demais para explicar a cauda sozinho, e a recência está pendente (item 5b).

### O que a frente 1 permite e não permite afirmar

**Permite (Fato):**
- O comparecimento de 2022 das seções antigas, inclusive nos 19.375 locais que receberam seções novas, não mostra mudança de padrão: no 2º turno, foi de 79,05% para 80,06% nesses locais, e as seções com 95% ou mais foram de 25 para 24.
- A seção nova, no mesmo local, vota em média **menos** do que a antiga e se afasta do local para os dois lados, muito mais do que a antiga. A cauda de cima infla mais (29 contra 16 vezes).
- O tamanho explica boa parte do excesso, mas não todo: com o tamanho controlado, a nova de 2026 passa de 95% cerca de 5 vezes mais que a antiga (4,8; sem TTE, 4,2).
- Seção nova com excesso de 95% ou mais aconteceu também em 2022, em escala menor (1,9 vez com o tamanho controlado), e se desfez até 2026.

**Permite (Estimativa):**
- O peso morto **medido pelo perfil do cadastro** (sem biometria, 90+, 100+) explica pouco: cerca de 0,2 a 0,7 ponto de diferença a favor da nova, contra os 15 pontos que separam uma seção média dos 95%.

**Não permite:**
- Descartar o peso morto como um todo. O que os dados derrubam é: (i) a previsão de que a nova vota mais em média; (ii) o peso morto medido pelo perfil. A forma "recência" (a seção nova reúne quem se alistou ou se transferiu há pouco tempo) não foi testada. A juventude, usada como proxy, não explica o excesso, mas não substitui a data das operações no cadastro. **Pendente.**
- Dizer por que o excesso de 2026 (cerca de 340 seções acima do esperado pelo tamanho) é maior que o de 2022 (cerca de 50). **Pendente.**
- Dizer se algum voto dessas seções foi irregular. O teste é de cadastro e comparecimento, não de quem votou.

**Ligação com a H07, que fica com quem cuida dela:** nas novas com 95% ou mais, 7,17% dos votantes foram liberados sem digital, contra 0,27% do cadastro delas sem biometria (no 1º turno, 7,46% × 0,33%). É a mesma ressalva do parecer 38: a liberação sem digital nessas seções é de eleitor **com** biometria cadastrada.

---

## Frente 2. H01 no 2º turno: comparecimento oficial dos eleitores de 100+

### 2026: o arquivo do 2º turno ainda não existe (Fato)

- O TSE não publicou versão nova do `perfil_comparecimento_abstencao_2026.zip`. Em 30/10/2026 o ETag (`"da985e4-65e5c6781db46"`) e o Last-Modified (21/10/2026 16:40 GMT) são os mesmos da cópia do disco. O pacote CKAN `comparecimento-e-abstencao-2026` foi modificado pela última vez em 21/10/2026.
- O arquivo traz só `NR_TURNO` = 1 (`DT_GERACAO` 13/10/2026). Números do 1º turno, refeitos agora: 100+ com 2.141 votantes de 297.977 aptos com domicílio no Brasil (0,72%). Conferem com o doc 07.
- **Pendente:** comparecimento 100+ do 2º turno de 2026, por UF e nos municípios citados. Quando sair, basta baixar de novo (`demografo-baixar-tse.mjs --so pca2026`) e rodar `demografo-h01-turnos-idade.mjs --zip <nova versão>`. A comparação entre turnos zona a zona já está no script.

### Linha de base de 2022: como o comparecimento dos idosos muda do 1º para o 2º turno (Fato)

Arquivo oficial de 2022 (gerado em 29/04/2025, os dois turnos). O zip de 2022 **não tem** os CSV de DF e do exterior separados por UF. Por isso o script leu o `BRASIL.csv` (universo completo). Valores sem o exterior:

| Faixa | Aptos 2022 | 1º turno 2022 | 2º turno 2022 | 2º ÷ 1º | 1º turno 2026 |
|---|---|---|---|---|---|
| 18–69 | 138.768.765 | 83,23% | 83,21% | 1,00 | 82,57% |
| 70–79 | 9.725.630 | 53,45% | 57,95% | 1,08 | 62,1% (*) |
| 80–89 | 3.756.328 | 22,98% | 27,25% | 1,19 | 32,7% (*) |
| 90–94 | 738.244 | 6,74% | 8,61% | 1,28 | 13,47% |
| 95–99 | 466.703 | 1,63% | 2,18% | 1,34 | 4,35% |
| **100+** | **184.330** | **0,909% (1.675)** | **1,135% (2.092)** | **1,25** | **0,719% (2.141)** |

(*) 70–79 e 80–89 de 2026: soma das faixas de 5 anos do doc 07.

- **Fato:** em 2022, o comparecimento dos idosos **subiu** do 1º para o 2º turno, tanto mais quanto mais velha a faixa (de 8% a 34% a mais). Entre 18 e 69 anos, não mudou. No grupo 100+, foram 417 votantes a mais no país (de 1.675 para 2.092).
- **Fato (zona a zona, 100+, 2022):** de 4.901 zonas com eleitor 100+, o número de votantes 100+ subiu em 495, caiu em 194 e ficou igual em 4.212. As maiores subidas foram de +13 (PA, município 04898, zona 99) e +11 (PA 04219, zona 15). Em Belo Horizonte (41238), as zonas 26 a 38 subiram de 3 a 9 cada.
- **Fato (estoque):** os aptos 100+ com domicílio no Brasil passaram de **184.330** (2022) para **297.977** (2026), 61,7% a mais. No mesmo período, 90–94 caiu de 738.244 para 664.482 e 95–99 de 466.703 para 337.136. É o que se espera quando os títulos de quem passou dos 95 anos sem baixa "envelhecem" para a faixa de 100+ (doc 03). A taxa de comparecimento 100+ caiu de 0,909% (1º turno de 2022) para 0,719% (1º turno de 2026), coerente com mais título sem pessoa nesse grupo.
- **Recomendação:** quando o TSE publicar o 2º turno de 2026, comparar a subida entre turnos com a de 2022, como contexto e não como limiar: é uma eleição só, com as circunstâncias dela. O que pediria exame é uma subida concentrada nas zonas ou municípios com sobra de títulos de 100+ (os 1.068 do doc 03), onde a taxa do 1º turno foi de 0,26%, ou nas 133 zonas do doc 07 com voto 100+ obrigatoriamente sem biometria.
- **Atenção (parecer cético 41):** a mesma série mostra que os **votantes** de 85 a 99 anos quase dobraram do 1º turno de 2022 para o de 2026. 2022 não serve como prova de normalidade de 2026 antes de esse salto ser explicado. O exame está no [doc 09](09-salto-votantes-85-99.md).

### UFs: 100+ em 2022 (1º e 2º turno) e em 2026 (1º turno) (Fato)

Votantes / aptos (taxa):

| UF | 2022, 1º turno | 2022, 2º turno | 2026, 1º turno |
|---|---|---|---|
| AC | 9/343 (2,6%) | 15 (4,4%) | 12/225 (5,3%) |
| AL | 20/362 (5,5%) | 17 (4,7%) | 21/673 (3,1%) |
| AM | 44/2.775 (1,6%) | 58 (2,1%) | 77/719 (10,7%) |
| AP | 1/95 (1,1%) | 1 (1,1%) | 4/180 (2,2%) |
| BA | 144/12.839 (1,1%) | 189 (1,5%) | 217/2.565 (8,5%) |
| CE | 53/6.453 (0,8%) | 72 (1,1%) | 97/1.925 (5,0%) |
| DF | 12/217 (5,5%) | 14 (6,5%) | 30/563 (5,3%) |
| ES | 29/2.101 (1,4%) | 40 (1,9%) | 39/4.890 (0,8%) |
| GO | 52/672 (7,7%) | 69 (10,3%) | 46/1.336 (3,4%) |
| MA | 129/7.253 (1,8%) | 160 (2,2%) | 204/2.438 (8,4%) |
| MG | 248/26.437 (0,9%) | 365 (1,4%) | 296/52.424 (0,6%) |
| MS | 17/1.666 (1,0%) | 22 (1,3%) | 22/2.017 (1,1%) |
| MT | 56/1.576 (3,6%) | 62 (3,9%) | 59/1.327 (4,4%) |
| PA | 59/7.678 (0,8%) | 112 (1,5%) | 109/2.370 (4,6%) |
| PB | 38/547 (6,9%) | 48 (8,8%) | 60/1.044 (5,7%) |
| PE | 76/6.016 (1,3%) | 94 (1,6%) | 98/8.722 (1,1%) |
| PI | 36/474 (7,6%) | 41 (8,6%) | 69/1.200 (5,8%) |
| PR | 50/1.613 (3,1%) | 56 (3,5%) | 55/877 (6,3%) |
| RJ | 192/39.850 (0,5%) | 207 (0,5%) | 150/105.262 (0,14%) |
| RN | 31/630 (4,9%) | 36 (5,7%) | 48/1.484 (3,2%) |
| RO | 8/423 (1,9%) | 9 (2,1%) | 9/238 (3,8%) |
| RR | 8/44 (18,2%) | 7 (15,9%) | 5/116 (4,3%) |
| RS | 100/8.605 (1,2%) | 105 (1,2%) | 97/21.022 (0,5%) |
| SC | 47/3.607 (1,3%) | 54 (1,5%) | 43/3.431 (1,3%) |
| SE | 6/308 (1,9%) | 7 (2,3%) | 13/601 (2,2%) |
| SP | 191/51.518 (0,4%) | 212 (0,4%) | 229/79.874 (0,29%) |
| TO | 19/228 (8,3%) | 20 (8,8%) | 32/454 (7,0%) |

- **Fato:** entre 2022 e 2026, os aptos 100+ caíram muito nas UFs com recadastramento biométrico (BA de 12.839 para 2.565; CE de 6.453 para 1.925; MA de 7.253 para 2.438; PA de 7.678 para 2.370; AM de 2.775 para 719) e a taxa subiu (BA de 1,1% para 8,5%). Nas UFs sem limpeza, os aptos 100+ cresceram de 55% a 164% (RJ de 39.850 para 105.262; MG de 26.437 para 52.424; RS de 8.605 para 21.022; SP de 51.518 para 79.874) e a taxa caiu (RJ de 0,5% para 0,14%). É o retrato do doc 03 visto no tempo: onde há limpeza, o grupo 100+ encolhe e passa a votar como centenário vivo; onde não há, o grupo cresce com títulos que não votam.

### Municípios citados (tópico 6 da perícia e doc 07): 100+ (Fato)

Votantes / aptos. "2022" usa a mesma divisão municipal do TSE.

| Município | 100+ 2022, 1º t. | 100+ 2022, 2º t. | 100+ 2026, 1º t. | 90–99 2022, 1º t. | 90–99 2022, 2º t. | 90–99 2026, 1º t. |
|---|---|---|---|---|---|---|
| Alto Boa Vista/MT | 1/14 | 2/14 | **9/10** | 4/45 | 3/45 | 7/16 |
| Arame/MA | 2/96 | 2/96 | 5/20 | 24/420 | 24/420 | **37/84** |
| Benjamin Constant do Sul/RS | 1/7 | 1/7 | 3/8 | 3/10 | 3/10 | 0/9 |
| Campinápolis/MT | 33/144 | 34/144 | 32/224 | 66/266 | 71/266 | 46/250 |
| Curralinho/PA | 4/96 | 6/96 | 11/44 | 11/206 | 15/206 | 19/83 |
| Florianópolis/SC | 1/8 | 1/8 | 7/24 | 200/584 | 210/584 | 334/1.134 |
| Guaribas/PI | 1/1 | 1/1 | 1/1 | 3/7 | 3/7 | 6/19 |
| Icatu/MA | 0/8 | 1/8 | 7/22 | 10/38 | 12/38 | 34/82 |
| Mococa/SP | 0/80 | 0/80 | 3/6 | 18/499 | 24/499 | 13/75 |
| Montes Claros/MG | 4/353 | 8/353 | 10/48 | 139/2.292 | 198/2.292 | 230/1.127 |
| Niterói/RJ | 2/61 | 3/61 | 5/151 | 353/2.051 | 389/2.051 | 595/3.289 |
| Pilão Arcado/BA | 1/60 | 3/60 | 6/21 | 18/337 | 23/337 | 42/157 |
| Pirapemas/MA | 4/17 | 6/17 | 7/24 | 10/32 | 9/32 | 14/54 |
| Recife/PE | 6/66 | 6/66 | 17/233 | 564/2.560 | 669/2.560 | 1.040/4.846 |
| Redentora/RS | 0/13 | 0/13 | 6/20 | 9/72 | 9/72 | 6/47 |
| Santo Antônio do Leste/MT | 0/4 | 0/4 | 3/5 | 6/23 | 5/23 | 2/5 |
| São Fidélis/RJ | 1/117 | 1/117 | 3/16 | 25/610 | 26/610 | 33/247 |
| Uberaba/MG | 1/34 | 1/34 | 5/48 | 149/940 | 204/940 | 252/1.348 |
| Uberlândia/MG | 2/45 | 3/45 | 7/84 | 235/1.515 | 312/1.515 | 426/2.362 |
| Vargem Grande do Rio Pardo/MG | 0/0 | 0/0 | 3/7 | 6/34 | 5/34 | 10/42 |
| Vitória/ES | 3/25 | 5/25 | 8/50 | 213/812 | 253/812 | 359/1.418 |

- **Fato:** nos municípios citados, a taxa 100+ do 1º turno de 2026 é maior do que a de 2022 em 17 dos 21. As exceções são Campinápolis e Recife (menor), Guaribas (igual, 1 de 1) e Vargem Grande do Rio Pardo (sem 100+ em 2022). Os aptos 100+ caíram em vários (Montes Claros de 353 para 48, Mococa de 80 para 6, São Fidélis de 117 para 16).
- **Cuidado (viés de seleção):** esses municípios foram escolhidos **porque** a taxa de 2026 era alta. Compará-los com 2022 tende a mostrar subida mesmo sem mudança real, porque números pequenos oscilam. A comparação com 2022 serve como contexto, não como teste.
- **Hipótese:** quando um grupo é limpo dos títulos sem pessoa, sobra quem está vivo, e a taxa sobe. É o mesmo padrão das UFs.
- **Fato, caso que destoa da própria história:** Alto Boa Vista/MT tinha 1 votante 100+ em 14 (2022, 1º turno) e 2 em 14 (2º turno). Em 2026 tem 9 em 10. Em Arame/MA, a faixa 90–99 foi de 24 em 420 (2022) para 37 em 84 (2026). Os dois continuam como no doc 07: o rastro técnico (digital ou liberação pelo mesário no log) é o próximo passo, e o 2º turno de 2026 é **Pendente**.
- **Hipótese (que não envolve fraude):** em Alto Boa Vista, os 10 eleitores 100+ de 2026 têm biometria (doc 07). A queda de 14 para 10 aptos e a subida da taxa são coerentes com limpeza do cadastro e idade presumida no registro indígena. Isso não foi conferido.

### O que a frente 2 permite e não permite afirmar

**Permite (Fato):** o 2º turno de 2026 ainda não tem contagem oficial por idade. Em 2022, a subida entre turnos dos idosos foi geral e modesta (100+: de 0,909% para 1,135%). O estoque de 100+ do país cresceu 61,7% entre 2022 e 2026. O crescimento ficou nas UFs sem limpeza do cadastro, onde a taxa de comparecimento caiu.

**Não permite:** dizer nada sobre uso de títulos de 100+ no 2º turno de 2026 pelo dado oficial. O que existe para o 2º turno continua sendo o teste indireto do doc 06, que só vê uso amplo e uniforme (parecer cético 03).

---

## Pendente

1. Comparecimento oficial por idade do 2º turno de 2026 (TSE ainda não publicou; ETag conferido em 30/10/2026).
2. Por que o excesso de seções novas com 95% ou mais, com o tamanho controlado, é maior em 2026 (4,8 vezes, cerca de 340 seções acima do esperado) do que em 2022 (1,9 vez, cerca de 50). Testes possíveis: o perfil do eleitorado por seção de 2022 (`perfil_eleitor_secao_2022_*`, não baixado), para comparar o cadastro das novas de 2022 com o das novas de 2026; e o TTE por seção de 2022, que o `detalhe_votacao_secao` não traz.
3. Recência do cadastro (a forma do "peso morto" que não foi testada): data da última operação no cadastro (alistamento, transferência, revisão), agregada por seção, via LAI, pelo menos para as 433 novas com 95% ou mais e para as antigas dos mesmos locais. Se forem seções de operações recentes, o "teto mais alto" fica explicado pela composição. A juventude, usada como proxy, não explicou (item 5b).

## Reproduzir

```
node scripts/auditoria/demografo-baixar-tse.mjs                      # baixa e confere (URL, ETag, SHA-256/512); pca2026 só se o ETag mudar
node --max-old-space-size=6000 scripts/auditoria/demografo-secoes-novas.mjs        # cerca de 2 min
node --max-old-space-size=4000 scripts/auditoria/demografo-h01-turnos-idade.mjs --ano 2026
node --max-old-space-size=4000 scripts/auditoria/demografo-h01-turnos-idade.mjs --ano 2022   # lê o BRASIL.csv (2,5 GB descompactado)
```

Pré-requisitos já no disco: CEFT de 2022 e 2024 (`seguranca-h27-baixar.mjs`), perfil por seção (`demografo-perfil.mjs`), `biometria/cadastro-secao.jsonl`.

Saídas em `data/parsed/auditoria/demografo/`:

- `novas-resumo.json`: frentes 1 a 6, por turno;
- `novas-locais-2t.tsv`: os 19.375 locais mistos, com 2022 e 2026;
- `novas-ge95-2t.tsv`: seções com 95% ou mais em locais com base, com a taxa das antigas do local;
- `turnos-idade-2022.json` e `turnos-idade-2026.json`: comparecimento por idade, por UF, nos municípios citados e zona a zona entre turnos.
