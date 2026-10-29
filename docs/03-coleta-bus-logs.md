# 03. Coleta de BUs, RDVs e logs

## Objetivo

Baixar todos os arquivos de urna do 2º turno de 2026, com integridade verificável e retomada. Depois, repetir para o 1º turno (`--turno 1`), que serve de linha de base.

## Como rodar

```
node src/coleta.js                    # todas as UFs + ZZ, todas as etapas
node src/coleta.js --uf ac,rr         # só algumas UFs
node src/coleta.js --etapas conferir  # só verificar e completar o que falta
node src/coleta.js --ajuda
```

Código de saída `0` **somente** se a conferência fechar 100% das seções com urna e 100% das agregadas nas UFs processadas. O programa pode ser interrompido e rodado de novo a qualquer momento: cada etapa retoma de onde parou.

## Etapas (implementadas em `src/`)

| Etapa | O que faz | Saída |
|---|---|---|
| `indice` | Baixa o `{uf}-p003221-cs.json` das 27 UFs + ZZ e separa seções **com urna** (principais) de **agregadas** (`nsp` → principal) | `data/raw/2t/config/` |
| `zips` | Baixa os zips por UF da CDN, com retomada por `Range` + `If-Range` (ETag) e SHA-256 do zip no manifesto | `data/raw/2t/zip/`, `data/manifest/2t/zips.jsonl` |
| `extrair` | Leitor de ZIP próprio (com ZIP64) que confere o CRC-32 de cada arquivo e grava por seção, já no diretório do hash | `data/raw/2t/urnas/{uf}/{mun}/{zona}/{secao}/{hash}/` |
| `aux` | Baixa o `aux.json` oficial de cada seção com urna: lista de hashes e arquivos esperados | `.../{secao}/aux.json` |
| `conferir` | Confere cada seção contra o `aux.json` e o `vota.vsc`. Baixa por seção o que faltar ou divergir e gera a cobertura | `data/manifest/2t/cobertura/{uf}.jsonl`, `resumo.json` |

## Cadeia de integridade (Fato, verificado no AC em 29/10/2026)

1. `hash` do `aux.json` = hex de base64(SHA-256(`-vota.vsc`)), **com `/` trocado por `-`** no base64 (`+` e `=` ficam). Sem essa troca, 1040 das 2270 seções do AC não batem.
2. O `-vota.vsc` é DER e lista os arquivos da urna como `{nome, SEQUENCE{INTEGER, SHA-512, assinatura}}`. O `SHA-512` de `bu.dat`, `rdv.dat`, `log.jez` e `imgbu.dat` precisa bater com o arquivo baixado.
3. O vota.vsc também lista arquivos que **não são publicados** (`jufa.dat`, `imgze.dat`, `hash.dat`, `wsqbio.jez`, `wsqman.jez`, `wsqmes.jez`, `mr.ver`). Eles não entram como exigência.
4. Arquivo divergente nunca é sobrescrito: vai para `{nome}.invalido-{data}` (quarentena) e é baixado de novo por seção.
5. **Assinaturas (passo seguinte à coleta):** `node src/lacres.js <diretório-do-hash>` confere o certificado da urna contra a AC do TSE, a assinatura da urna em cada arquivo e a cadeia de hashes do BU. AC inteiro: 2.270 seções, 0 falhas (29/10/2026). Detalhes no doc 06.
6. **Registro de evidências:** ao fechar cada UF, rodar `node src/evidencias.js indexar --turno <t> --uf <uf>` e registrar a verificação com `node src/evidencias.js executar --nome lacres-<t>t-<uf> -- node src/lacres.js data/raw/<t>t/urnas/<uf>`. Ver [pericia/evidencias](pericia/evidencias/README.md).

## Critério de "100%"

- Toda seção do índice é **contabilizada**: `completa` (todos os arquivos do `aux.json` presentes e conferidos; manifesto pelo hash, demais pelo SHA-512) ou `sem_arquivos_oficiais` (o próprio TSE diz que não há arquivo). As duas contagens aparecem separadas no `resumo.json` e no terminal.
- Toda seção **agregada** aponta para uma principal contabilizada.
- `imgbu.dat` / `imgbusa.dat` só existem no zip por UF (por seção dá 404). São conferidos quando presentes e contados à parte, sem ser exigência.
- Situações possíveis no `cobertura/{uf}.jsonl`: `completa`, `incompleta`, `sem_aux`, `sem_arquivos_oficiais`, `erro`.

### Casos especiais (Fato, exterior/ZZ do 2º turno, 29/10/2026)

| Caso | Seções | Como aparece | Tratamento |
|---|---|---|---|
| **Sistema de Apuração (SA)** | 29 | Arquivos `-sa.vsc`, `-busa.dat`, `-logsa.jez`, `-imgbusa.dat`, `-rdv.dat` (aux: `tp` = `sa`, `busa`, `logsa`, `rdv`) | Mesma cadeia: hash = SHA-256(`sa.vsc`) e SHA-512 de busa/rdv/logsa/imgbusa dentro do `sa.vsc`. Conferidas como completas |
| **Não instalada** | 41 | `aux.json` com `st: "Nao instalada"` e um hash `"0"`, `st: "Sem arquivo"`, `arq: [{nm: "", tp: ""}]`. No `cs.json`, só `ns` (sem data/hora) | `sem_arquivos_oficiais`. Ausentes do zip, como esperado |

Resultado no ZZ: 1310 completas (1281 urna + 29 SA) + 41 não instaladas = 1351/1351, e 1364/1364 agregadas. **[a confirmar]** se o SA aparece fora do exterior e no 1º turno.

## Regras do downloader

- **HTTP direto** (`fetch` nativo do Node), sem Puppeteer e sem dependências externas.
- **Concorrência limitada:** `--concorrencia` (padrão 16) e `--zips-paralelos` (padrão 2). Backoff exponencial com jitter em 408/425/429/5xx, respeitando `Retry-After`. 404 não é repetido.
- **Idempotente:** o que já está íntegro não é baixado de novo. A extração grava `{zip}.extraido.json`; `--reextrair` força refazer.
- **Gravação atômica** (`.part` + rename): nunca fica arquivo final pela metade.
- **Falhas** vão para `data/manifest/2t/ocorrencias.jsonl` e nunca são ignoradas em silêncio.
- **Arquivos brutos são somente-leitura** para as análises. Nenhum conteúdo baixado é executado.

## Limite de acesso do resultados.tse.jus.br (Fato, 29/10/2026)

- Os zips vêm da CDN (`cdn.tse.jus.br`), que não mostrou limite. Já `aux.json`, `cs.json` e os arquivos por seção vêm de `resultados.tse.jus.br`, que **bloqueia o IP** com HTTP 429, sem `Retry-After`. Depois do bloqueio, até requisições isoladas recebem 429 por um tempo que não medimos.
- Com 16 conexões (~60–70 req/s), 80 mil `aux.json` passaram sem nenhum 429. Com 96 conexões, veio o bloqueio em segundos. Num IP novo, partir de 50 req/s também foi bloqueado.
- Por isso, `aux` e `conferir` usam um **controle de taxa adaptativo** (`criarControleTaxa` em `src/http.js`): taxa compartilhada entre as conexões; no 429, pausa global (30 s, dobrando até 10 min) e taxa pela metade; a cada 200 respostas sem 429, +10%. Opções: `--taxa-inicial`, `--taxa-maxima`.
- O `aux.json` **não é necessário** para a integridade dos arquivos: sem ele, a etapa `conferir` usa o disco (`fonte: "disco"`). Confere o nome do diretório de hash = hash do manifesto e o SHA-512 de cada arquivo. O aux acrescenta o **status oficial** da seção no site de resultados (`Totalizada`, `Recebida`, `Nao instalada`) e os pacotes reenviados. Ele baixa em segundo plano, devagar: `--etapas aux --concorrencia 8 --taxa-inicial 10 --taxa-maxima 20`.
- **Fato.** Dos primeiros 82.157 `aux.json` do 2º turno, 81.028 estão `Totalizada`, **1.088 `Recebida`** (740 no AM, 348 na BA) e 41 `Nao instalada`. O pacote "Recebido" é o mesmo do zip (mesmo hash nas 1.088) e foi recebido entre 26/10 08h e 28/10 12h, depois do dia da eleição.
- **Fato (cruzamento com dados abertos).** As 1.088 seções "Recebida" estão todas em `votacao_secao_2026_BR.csv` (gerado em 26/10 às 12:07), com votos para presidente **idênticos aos do BU** em todas. **Hipótese:** o BU foi transmitido e totalizado na noite da eleição, e o pacote completo (log, RDV, assinaturas) chegou depois. Script: `scripts/recebidas-x-votacao-secao.mjs`.

## Resultado da coleta do 2º turno (Fato, 29/10/2026)

- **499.248/499.248 seções com urna contabilizadas**: 499.207 completas (arquivos presentes; manifesto pelo hash; SHA-512 de cada arquivo conferido) + 41 `Nao instalada` (exterior). **17.931/17.931 agregadas** cobertas. `resumo.json`: `coberturaTotal: true`.
- Na conferência, 415.566 seções foram verificadas só pelo disco, porque o aux ainda estava baixando. O aux continua em segundo plano, para registrar o status oficial.
- **1º turno (Fato, 29/10/2026):** 499.248/499.248 seções contabilizadas (499.207 completas + 41 `Nao instalada`, confirmadas pelo aux) e 17.931/17.931 agregadas.
- **Caso MA 07846/0074/0228 (1º turno):** o zip do MA não traz o `-rdv.dat` dessa seção, mas o aux o lista e ele está publicado por seção (13.573 bytes; o SHA-512 confere com o `vota.vsc`). Foi baixado e gravado.
- **Caso SP 64777/0395/0298:** o zip de SP não traz o `-log.jez` dessa seção, e o `aux.json` oficial lista só bu, rdv e vota. Mesmo assim, o log está publicado no endereço por seção (192.093 bytes) e o SHA-512 dele confere com o `vota.vsc`. Foi baixado e gravado. **Hipótese:** falha pontual na montagem do zip e do aux pelo TSE.

## Medições no AC (29/10/2026)

| Item | Valor |
|---|---|
| Seções no índice | 2411 (2270 com urna + 141 agregadas) |
| Zip | 488 MB, baixado a ~49 MB/s |
| Extraído | ~490 MB (≈ tamanho do zip) |
| `aux.json` | ~50/s com concorrência 16 |
| Conferência | ~500 seções/s |
| Resultado | 2270/2270 completas, 141/141 agregadas cobertas, 2270 imgbu ok, 0 ocorrências |
| Zip × por seção | 1040 `vota.vsc` baixados por seção são idênticos aos do zip (mesmo SHA-256) |

**Projeção nacional (Recomendação, a confirmar na rodada completa):** os zips somam ~132 GB (HEAD em 29/10/2026). Extraídos, ~265 GB no total. O gargalo previsto é o `aux.json`, uma requisição por seção.

## Pendências

- [x] Confirmar o caminho `{hash}/{arquivo}` no primeiro download real (doc 02). Confirmado em 29/10/2026
- [x] Confirmar o formato do `.jez` de 2026. É **ZIP** com um `logd.dat` em ISO-8859-1. O 7-Zip abre os dois formatos
- [x] Confirmar que existe ZZ (exterior) no 2º turno. Zip `_2t_ZZ` presente (HEAD 200)
- [x] Medir o espaço em disco depois de baixar 1 UF pequena (AC) e projetar o restante
- [x] Localizar a especificação ASN.1 do BU/RDV. Pacote oficial v2 do TSE (doc 02); o `.vsc` de 2026 difere em detalhes (doc 06)
- [ ] Rodar `src/lacres.js` em todas as seções ao fim da coleta
- [ ] Rodada nacional completa, com `resumo.json` em `coberturaTotal: true`

## Tamanho por seção (referência)

**Fato.** Seção ES 57037/0055/0372, 363 aptos, 263 votantes: `bu.dat` 1,5 KB, `rdv.dat` 4,9 KB, `vota.vsc` 61 KB, `log.jez` 174 KB (log descompactado: 940 KB, 9.916 linhas, cobrindo carga, 1º e 2º turno). Cerca de 240 KB compactado por seção.

## Conferência de integridade por seção

- SHA-256 do `-vota.vsc` = `hash` do `aux.json` decodificado (doc 02).
- O log de cada turno tem que bater com o BU: horários de abertura e encerramento, número interno da urna, serial da MV e contagem de habilitações (doc 06).
