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

## Critério de "100%"

- Toda seção **com urna** do índice tem `situacao: completa`: todos os arquivos do `aux.json` presentes e conferidos (vota.vsc pelo hash; demais pelo SHA-512).
- Toda seção **agregada** aponta para uma principal completa.
- `imgbu.dat` só existe no zip por UF (por seção dá 404). É conferido quando presente e contado à parte, sem ser exigência.
- Situações possíveis no `cobertura/{uf}.jsonl`: `completa`, `incompleta`, `sem_aux`, `sem_arquivos_oficiais` (aux sem hashes), `erro`.

## Regras do downloader

- **HTTP direto** (`fetch` nativo do Node), sem Puppeteer e sem dependências externas.
- **Concorrência limitada:** `--concorrencia` (padrão 16) e `--zips-paralelos` (padrão 2). Backoff exponencial com jitter em 408/425/429/5xx, respeitando `Retry-After`. 404 não é repetido.
- **Idempotente:** o que já está íntegro não é baixado de novo. A extração grava `{zip}.extraido.json`; `--reextrair` força refazer.
- **Gravação atômica** (`.part` + rename): nunca fica arquivo final pela metade.
- **Falhas** vão para `data/manifest/2t/ocorrencias.jsonl` e nunca são ignoradas em silêncio.
- **Arquivos brutos são somente-leitura** para as análises. Nenhum conteúdo baixado é executado.

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
- [ ] Localizar a especificação ASN.1 do BU/RDV de 2026. Enquanto isso, usar o mapa observado em [06-leitura-bu-rdv-log.md](06-leitura-bu-rdv-log.md)
- [ ] Rodada nacional completa, com `resumo.json` em `coberturaTotal: true`

## Tamanho por seção (referência)

**Fato.** Seção ES 57037/0055/0372, 363 aptos, 263 votantes: `bu.dat` 1,5 KB, `rdv.dat` 4,9 KB, `vota.vsc` 61 KB, `log.jez` 174 KB (log descompactado: 940 KB, 9.916 linhas, cobrindo carga, 1º e 2º turno). Cerca de 240 KB compactado por seção.

## Conferência de integridade por seção

- SHA-256 do `-vota.vsc` = `hash` do `aux.json` decodificado (doc 02).
- O log de cada turno tem que bater com o BU: horários de abertura e encerramento, número interno da urna, serial da MV e contagem de habilitações (doc 06).
