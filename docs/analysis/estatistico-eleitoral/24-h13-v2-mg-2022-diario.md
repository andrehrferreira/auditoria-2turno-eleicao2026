# 24. H13, sinal V2 em MG: teste direto com os diários de urna de 2022

Estatístico eleitoral, **30/10/2026**. O plano foi fixado antes de ler qualquer diário de 2022 e antes de rodar, no **adendo 5** do [plano 16](16-h13-log-plano.md). O que veio depois de ver o resultado está marcado **exploratório**. Este doc continua o [doc 23](23-h13-v2-2022.md), que usou um substituto, e o [doc 22](22-h13-v2-sul-mg-rs.md), que mediu o sinal de 2026.

## Resposta curta

- **Teste declarado (MG):**

  | | 2022 | 2026 |
  |---|---|---|
  | Parte própria da V2 | **+5,94 (z 5,10)** | +5,68 (z 4,19) |

  - A diferença 2026 − 2022 é **−0,27 (z −0,15)**.
  - Pela regra fixada antes, a leitura é **estrutural**: o sinal já existia em MG em 2022, do mesmo tamanho.
  - 2026 reproduz o doc 22 exatamente.
- **Isso reverte a leitura do doc 23 para MG.** Lá, "próprio de 2026" veio do substituto (Δc × sb), não da V2.
  - **Exploratório:** na mesma amostra, o substituto repete o doc 23 (2026 +14,45; 2022 +2,29).
  - Dentro do local, ele se correlaciona 0,73 com a V2 real em 2022, mas só 0,33 em 2026.
  - Em 2026, então, o substituto carregava outra coisa além da V2. O que mudou entre os anos foi essa outra coisa, não o sinal V2.
- **Leitura:** em MG, o sinal V2 é um traço de quem volta a votar no 2º turno sem digital, que já existia em 2022. Não é uma novidade de 2026.
  - Pela regra do adendo 3, o critério (d) ("mesma associação em 2022") agora **favorece composição** em MG.
  - Isso não prova composição nem exclui fraude, mas tira de MG o argumento "o sinal é novo".
- **Coleta (Fato):** 16.910.525.578 bytes em 62 min, sem nenhum HTTP 429.
  - 49.981 seções por turno, as mesmas do `detalhe_votacao_secao_2022`.
  - Todo arquivo de cada seção foi conferido contra o `.vsc` da própria seção: o 2º turno fecha 100%, e o 1º turno também, exceto uma seção que não tem diário no zip oficial.
- **Diário × BU (Fato):** os votos do diário batem com o comparecimento do BU:
  - em 49.974 das 49.981 seções no 1º turno;
  - em 49.979 das 49.981 no 2º.

## Comandos e arquivos

```bash
node scripts/auditoria/coleta-2022-mg.mjs --etapas catalogo,zips       # catálogo oficial + zips (um por vez, com retomada)
node scripts/auditoria/coleta-2022-mg.mjs --etapas conferir           # SHA-512 contra o .vsc; seções contra o detalhe (_BR.csv)
node scripts/auditoria/estatistico-h13-v2-diario2022.mjs --turno 1
node scripts/auditoria/estatistico-h13-v2-diario2022.mjs --turno 2
node scripts/auditoria/estatistico-h13-v2-diario2022.mjs --juntar     # → h13-v2/secoes-mg-2022-diario.csv
node --max-old-space-size=8000 scripts/auditoria/estatistico-h13-v2-mg2022-analise.mjs
```

- **Código novo:**
  - `scripts/auditoria/leitor-7z.mjs`: leitor de 7z/LZMA sem dependências;
  - `coleta-2022-mg.mjs`, `estatistico-h13-v2-diario2022.mjs` e `estatistico-h13-v2-mg2022-analise.mjs`.
- **Única mudança em código existente:** `processarFluxo` de `estatistico-h08-varredura.mjs` passou a ser exportada. O comportamento não mudou. `src/coleta.js` não foi tocado.
- **Saídas** em `data/parsed/auditoria/estatistico/h13-v2/`:
  - `secoes-mg-2022-diario.csv` (vias por seção e turno);
  - `diario2022/<t>t.jsonl` e `<t>t.mensagens.json`;
  - `resultado-mg-2022-diario.json`.
- **Manifesto** em `data/manifest/2022/`: `zips.jsonl`, `catalogo.json`, `conferencia-<t>t.json` e `ocorrencias.jsonl`. A lista de arquivos vai em [24-arquivos-baixados.csv](24-arquivos-baixados.csv).

## 1. Coleta (Fato)

**De onde vieram os arquivos.** O ciclo de 2022 saiu do resultados.tse.jus.br: o `cs.json`, o `ele-c.json` e o `aux.json` de `ele2022`, pleitos 406 e 407, respondem 404 (NoSuchKey).
- A URL dos zips foi conferida no catálogo oficial de dados abertos, no conjunto `resultados-2022-arquivos-transmitidos-para-totalizacao` (56 recursos). Os recursos de MG aparecem lá:
  - "MG – … Primeiro turno – 06.10.2022";
  - "… Segundo turno – 02.11.2022".
- O catálogo não publica hash desses arquivos.
- A lista das seções vem do `detalhe_votacao_secao_2022`, lendo só `_BR.csv`.

| Turno | Arquivo | Bytes | Tempo | SHA-256 (início) | Last-Modified |
|---|---|---|---|---|---|
| 1º (pleito 406, 02/10/2022) | `bu_imgbu_logjez_rdv_vscmr_2022_1t_MG.zip` | 7.639.923.232 | 32,5 min | 8542face5f98a8ba… | 06/10/2022 |
| 2º (pleito 407, 30/10/2022) | `bu_imgbu_logjez_rdv_vscmr_2022_2t_MG.zip` | 9.270.602.346 | 29,7 min | a64dbf05d7386425… | 02/11/2022 |

- **Como foi baixado:** um pedido por vez, com pausa de 30 s entre os arquivos e retomada (`.part` + If-Range). A rede só foi usada para o TSE.
- **Velocidade e bloqueio:** a velocidade ficou entre 3,7 e 4,9 MB/s, e não houve nenhum 429.
- **Guarda:** os zips estão em `data/raw/2022/<t>t/zip/` e não foram extraídos. A conferência e a leitura leem direto do zip, com o CRC-32 de cada entrada conferido. Assim, nenhum arquivo solto vai para `data/raw`.

**Formato de 2022, diferente de 2026:**
- **Nome das entradas:** `o00406-4051700130027.logjez`, sem UF e com o tipo na extensão. Em 2026 é `o03221mg4445801030221-log.jez`.
- **Diário:** o `.logjez` é um **7z (LZMA)**, não um zip. Dentro dele vêm o `logd.dat` e as cópias aninhadas (`…ME.jez`, também 7z).
- **Verificação do leitor:** o leitor novo foi comparado com o 7-Zip em 300 diários sorteados do 1º turno (310 arquivos, contando os aninhados). Os 310 saíram iguais byte a byte.

**Conferência (`conferencia-<t>t.json`):**

| | 1º turno | 2º turno |
|---|---|---|
| Seções no zip | 49.981 | 49.981 |
| Seções de MG com comparecimento no detalhe (`_BR.csv`, presidente) | 49.981 | 49.981 |
| No detalhe sem zip / no zip sem detalhe | 0 / 0 | 0 / 0 |
| Completas (todo arquivo com SHA-512 igual ao do `.vsc` da seção) | 49.980 | 49.981 |
| Apuradas pelo Sistema de Apuração (`busa`, `logsajez`, `vscsa`) | 2 | 0 |
| Incompletas | 1: MG 51390/0244/0091, cujo zip oficial não traz o `.logjez` (só bu, imgbu, rdv e vscmr) | 0 |
| Entradas fora de seção | `leiame.pdf` | `leiame.pdf` |

**Limite:** a assinatura do `.vsc` não foi verificada. Só os resumos que ele lista foram conferidos. E não há hash oficial do zip.

## 2. O diário de 2022 e as vias (Fato; decisão tomada só pelo texto e pela contagem das mensagens)

As mensagens foram conferidas num diário e depois contadas em todas as seções de MG nos dois turnos (`diario2022/<t>t.mensagens.json`, números trocados por N e títulos por #). A tabela traz o que muda entre os anos:

| Papel no ciclo | 2026 | 2022 | 1º turno 2022 | 2º turno 2022 |
|---|---|---|---|---|
| Identificador digitado (I) | `Identificador do eleitor digitado pelo mesário` | `Título digitado pelo mesário` | 14.074.389 | 14.145.103 |
| Início de novo ciclo | `Aguardando digitação do identificador do eleitor` | `Aguardando digitação do título` | 14.458.362 | 14.525.590 |
| V1 digital | `Tipo de habilitação do eleitor [biométrica]` | igual | 7.589.228 | 7.731.727 |
| **V2** | `Ano de nascimento digitado é igual ao do cadastro` (0 em 2022) | **`O eleitor não possui biometria`** | 4.073.992 | 4.165.089 |
| V3, manual | `Dado digitado confere` (0 em 2022) | `Solicitação de dado pessoal do eleitor para habilitação manual` | 1.057.609 | 1.013.682 |
| V3m, mesário identificado | `Mesário # habilitou o eleitor` (0 em 2022) | `Biometria do mesário # encontrada nos arquivos coletados (N)` / `… em eleitores (N)` | 425.839 + 57.603 | 502.719 + 65.250 |
| V3s, sem mesário associado | sem mensagem de mesário | igual: `Digital coletada bate com uma digital gravada … Não é possível associar …` ou `… vai salvar a digital em novo arquivo` | — | — |
| Foto | `Foto do eleitor apresentada` | não existe (0) | 0 | 0 |

- **V2 em 2022:** o eleitor sem biometria no cadastro era liberado só pelo título. A urna não pedia o ano de nascimento.
  - Em 2026, o mesmo eleitor digita o ano de nascimento.
  - O grupo é o mesmo nas duas eleições (eleitor sem digital cadastrada), mas a conferência é outra.
  - Em 2022 esse grupo era muito maior: 48% do cadastro das seções da amostra, contra 23% em 2026.
- **V3 em 2022:** a urna pede o dado pessoal (o ano de nascimento) e só registra o erro: `Ano de nascimento inválido` aparece 2.323 vezes no 1º turno e 1.767 no 2º. O acerto não é registrado. Por isso, a marca de V3 em 2022 é o pedido.
- **V3m em 2022:** não existe `Mesário # habilitou`. A identificação do mesário é a linha `Biometria do mesário # encontrada …`. Em 2026, essa linha vem logo antes do `habilitou`.
- **Como a tradução foi aplicada:** cada linha de 2022 recebe a mensagem de 2026 equivalente (tabela `TRADUCAO` no script). O ciclo é o mesmo `processarFluxo` da leitura de 2026: fluxo por urna, só a seção declarada, união das cópias e prioridade V1 > V2 > V3m > V3s.
- **Votos que não caem em nenhuma via ("outra"):** 0 nos dois turnos.

**Diário × BU** (votos do diário contra o comparecimento de presidente no `detalhe`, que vem do BU):

| | 1º turno 2022 | 2º turno 2022 | 1º turno 2026 | 2º turno 2026 |
|---|---|---|---|---|
| Seções iguais / diferentes | 49.974 / 7 | 49.979 / 2 | 52.060 / 0 | 52.062 / 0 |
| Votos no BU / no diário | 12.655.228 / 12.654.755 | 12.866.284 / 12.866.282 | 12.636.715 / 12.636.715 | 13.044.203 / 13.044.203 |

- Das 7 seções que diferem no 1º turno, 3 não têm diário de urna: as 2 do Sistema de Apuração (`logsajez`, não lido) e a que não tem log no zip.
- A união das cópias da mesma urna recuperou linhas fora da cópia maior em 714 seções no 1º turno e em 456 no 2º.

**Parcela de cada via** (seções do modelo):

| | 1º turno 2022 | 2º turno 2022 | 1º turno 2026 | 2º turno 2026 |
|---|---|---|---|---|
| V1 digital | 59,9% | 60,1% | 82,1% | 81,7% |
| V2 sem biometria | 32,2% | 32,4% | 11,2% | 11,5% |
| V3m | 3,8% | 4,4% | 3,9% | 4,4% |
| V3s | 4,1% | 3,1% | 2,7% | 2,4% |

## 3. Amostra

| | 2026 | 2022 |
|---|---|---|
| Seções no painel | 52.044 | 49.960 |
| Em locais com 2 ou mais seções (entram no modelo) | 49.462 | 47.242 |
| Locais | 7.493 | 7.257 |
| Fora: menos de 20 votos em 13 + 22 | 9 | 5 |
| Fora: sem perfil | 7 | 7 |
| Fora: diário diferente do BU | 0 | 9 |
| Fora: sem a seção nos dois turnos | 2 | 2.503 |
| Modelos de urna (base: o mais recente) | UE2013, 2015, 2020, **2022** | UE2009, 2010, 2011, 2013, 2015, **2020** (301 seções sem modelo no detalhe ficam na base) |
| Sem biometria no cadastro (média ponderada) | 22,7% | 48,0% |
| e_V2 médio / desvio dentro do local | 0,0055 / 0,0112 | 0,0060 / 0,0098 |

As 2.503 linhas de 2022 "sem a seção nos dois turnos" existem só no perfil do eleitorado (338.988 eleitores). Elas não têm comparecimento nem voto em nenhum turno. Todas as 49.981 seções com urna estão contadas. Que essas linhas sejam seções agregadas, que votam na urna de outra, é uma suposição: não está conferido.

## 4. Resultado (teste declarado)

Modelo do doc 22, igual nos dois anos: efeito fixo de local, peso 13 + 22 do 2º turno e CR1 por local. Os valores são pontos de parcela do 13 por 100% do cadastro (entre parênteses, o z).

| Termo | 2026 | 2022 |
|---|---|---|
| **e_V2 (parte própria da V2)** | **+5,68 (4,19)**, erro 1,35 | **+5,94 (5,10)**, erro 1,17 |
| e_V3m | +1,93 (4,15) | −1,21 (−2,59) |
| e_V3s | +0,85 (1,14) | −1,24 (−2,73) |
| Δc | +0,91 (1,25) | −0,21 (−0,30) |
| e_V2 descontada a regressão à média (com Y do 1º turno e x_V2 do 1º turno) | +5,12 (3,92) | +6,11 (5,51) |

**Testes: 2; Bonferroni |z| ≥ 2,24.**

| Teste | Valor | z | p | Passa? |
|---|---|---|---|---|
| T1: e_V2 em 2022 | +5,94 | 5,10 | 3,5 × 10⁻⁷ | **sim** |
| T2: diferença 2026 − 2022 | −0,27 (erro 1,79) | −0,15 | 0,88 | não |

- **Poder:** com 80% de poder, T1 veria um efeito de 3,59 em 2022. O de 2026 (5,68) cabe com folga.
- **Leitura pela regra do adendo 5: estrutural.** T1 é positivo e passa; T2 não passa.
- **Faixa da diferença:** o intervalo de 95% da diferença vai de cerca de −3,8 a +3,2 pontos. Os dados não comportam um sinal de 2026 muito maior que o de 2022.

## 5. Exploratório (depois de ver o resultado)

**Por que o doc 23 leu "próprio de 2026".** Na mesma amostra deste doc:

| | 2026 | 2022 |
|---|---|---|
| Substituto Δc × sb (modelo do doc 23) | +14,45 (7,02) | +2,29 (1,29) |
| V2 real (este doc) | +5,68 (4,19) | +5,94 (5,10) |
| Correlação dentro do local, substituto × e_V2 real | 0,33 | 0,73 |

- Em 2022, o substituto acompanha bem a V2 real, mas carrega um coeficiente menor que o dela.
- Em 2026, ele acompanha mal a V2 real e carrega 2,5 vezes o sinal dela.
- O "salto" de 2022 para 2026 que o doc 23 viu está na parte do substituto que **não** é V2. A conclusão do doc 23 para MG não vale para o sinal V2. O que mudou nessa outra parte (Δc × sem biometria, fora da V2) fica sem explicação aqui.

**V3m.**
- O achado exploratório do doc 22 para MG (V3m +1,93) não aparece em 2022, onde a V3m dá −1,21. A diferença é +3,14 (z ≈ 4,8, com erros independentes).
- **Cautela:** a marca de V3m mudou entre os anos (seção 2), então essa comparação é mais fraca que a da V2. Ela fica como pergunta aberta: liberação manual com mesário identificado em MG, 2026.

## Leitura

- **MG, sinal V2:** do 1º para o 2º turno, as seções onde mais eleitores sem digital voltaram a votar ganharam mais voto no 13, dentro do mesmo prédio. O padrão tem o mesmo tamanho em 2022 e em 2026 (+5,9 e +5,7).
  - Em 2022, a liberação desses eleitores nem pedia o ano de nascimento.
  - O padrão vem de **quem** volta a votar no 2º turno sem digital, não de algo próprio da eleição de 2026.
- **Isso muda a leitura do doc 23 para MG.** O argumento "o padrão é novo em 2026" vinha do substituto e não se sustenta com a V2 real.
- **Sobre inserção:** o resultado não a exclui. Uma fraude que reproduzisse um padrão estrutural, do mesmo tamanho e na mesma direção, não seria vista. Mas a explicação mais simples para o sinal de MG passa a ser comportamento de eleitor, e os docs 19 e 22 não acharam nenhuma marca de inserção.
- **Sul e RS:** continuam sem teste com 2022. A autorização foi só para MG.

## O que isto permite e o que não permite afirmar

**Permite:**
- **Fato:** em MG, nas duas eleições, a parte própria da V2 é positiva e do mesmo tamanho: +5,94 (z 5,10) em 2022 e +5,68 (z 4,19) em 2026. A diferença é −0,27 (z −0,15).
- **Fato:** os diários de MG de 2022 estão completos e conferidos: 49.981 seções por turno, as mesmas do detalhe oficial, com os resumos do `.vsc` conferidos (uma seção do 1º turno sem log no zip). O diário bate com o BU em 49.974 e em 49.979 seções.
- **Fato:** em 2022 não existe a conferência do ano de nascimento para o eleitor sem biometria. A liberação era só pelo título.

**Não permite:**
- dizer que o sinal de 2026 em MG é composição demonstrada: ele é igual ao de 2022, mas o traço que o explica não foi medido;
- dizer que não houve fraude: uma fraude com o mesmo formato do padrão estrutural não seria vista;
- estender a conclusão ao Sul e ao RS.

## Pendências

- Revisão independente deste doc, sobretudo da tradução das marcas de 2022 (seção 2) e da comparabilidade da V2 entre os anos (sem ano de nascimento em 2022; grupo sem biometria duas vezes maior).
- O doc 23 deve receber uma nota: para MG, a leitura "próprio de 2026" vale para o substituto e não para a V2.
- Sul e RS 2022, se houver autorização para os diários dessas UFs.
- V3m em MG, de 2022 para 2026: pergunta aberta (exploratório).
