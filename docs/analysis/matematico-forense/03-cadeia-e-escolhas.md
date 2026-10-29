# 03. Cadeia de hashes do BU e `quantidadeEscolhas`, no país inteiro

Matemático forense, 29/10/2026. Script: `scripts/auditoria/matematico-brutos.mjs` (uma passada pelos arquivos brutos, pacote por pacote) e `matematico-resumo-brutos.mjs` (consolidação). Invariantes I1 a I5 do [catálogo](01-catalogo.md).

## O que se testa

- **I1, cadeia de hashes (doc 06):**
  - `h0 = SHA-512("pleito|eleição|município|zona|seção|códigoCarga")`;
  - cada tupla: `hN = SHA-512(hN-1|ordem|cargo|tipo|qtd[|código|partido])`;
  - conferido: o hash de cada tupla, `ordemGeracaoHash` = posição da tupla no cargo, e o último hash = `ultimoHashVotosVotavel`.
  - **A assinatura não é conferida aqui.** Ela fica com `integridade-lacres.mjs`.
- **I2:** `quantidadeEscolhas` de cada cargo no RDV.
- **I3:** registros do RDV no cargo = escolhas × comparecimento do tipo de cargo (majoritário ou proporcional) no BU.
- **I4:** Σ votos do BU no cargo = escolhas × comparecimento.
- **I5:** os cargos do RDV são os do BU.

Hipótese nula: em arquivos honestos, todos valem sem exceção (prova no catálogo). Uma exceção seria arquivo corrompido ou adulterado, urna fora da especificação ou erro de leitura nosso.

## 2º turno: país inteiro (28 UFs, 499.207 pacotes com BU)

**Fato.**

| Invariante | Testados | Violações |
|---|---:|---:|
| I1 hash de cada tupla | 2.091.951 tuplas em 539.817 eleições | **0** |
| I1 `ordemGeracaoHash` = posição | 2.091.951 | **0** |
| I1 último hash = gravado | 539.817 | **0** |
| I2 escolhas | 539.817 cargos: presidente 499.207, governador 39.739, prefeito (eleição suplementar) 476, consultas 25/26/27: 86/97/212 | **0**: todos com 1 escolha |
| I3 registros do RDV = escolhas × comparecimento | 539.817 | **0** |
| I4 Σ BU = escolhas × comparecimento | 539.817 | **0** |
| I5 cargos RDV = BU | 499.207 | **0** |

- Os 29 pacotes do Sistema de Apuração (exterior, `-busa.dat`) entram em I1 a I5 e também fecham. Todos têm RDV; 27 têm tuplas (72 no total) e 2 não têm voto nenhum.
- Nenhum pacote deu erro de leitura.

## 1º turno: país inteiro (28 UFs, 499.207 pacotes com BU)

**Fato.**

| Invariante | Testados | Violações |
|---|---:|---:|
| I1 hash de cada tupla | 67.858.974 tuplas em 997.114 eleições | **0** |
| I1 `ordemGeracaoHash` = posição | 67.858.974 | **0** |
| I1 último hash = gravado | 997.114 | **0** |
| I2 escolhas | registros de cargo: presidente 499.209, governador 497.899, senador 497.899, deputado federal 497.899, deputado estadual 490.930, deputado distrital 6.969, consulta 10 | **0**: senador com 2 escolhas em todos os registros; os demais cargos, 1 |
| I3 registros do RDV = escolhas × comparecimento | todos os cargos | **0** |
| I4 Σ BU = escolhas × comparecimento | todos os cargos | **0** |
| I5 cargos RDV = BU | 499.207 | **0** |

- Cada cargo tem 2 registros a mais que o número de seções: presidente 499.209 para 499.207 seções; governador, senador e deputado federal 497.899 para 497.897 (as 1.310 do exterior só votam para presidente). São as 2 seções do Sistema de Apuração misto em MG (41238/0039/0168 e 50075/0047/0041): o RDV delas traz cada eleição uma vez por origem dos votos (20 de cédula + 261 da urna = 281 = BU).
  - Na 1ª passada, esses 20 pares pacote×cargo apareceram como violação de I3, porque cada parte era comparada com o total. Corrigido: as partes do mesmo cargo se somam (spec/rdv.asn1, `eleicoesSA`). Era regra entendida errado, não achado.
- Os 31 pacotes do Sistema de Apuração do 1º turno entram e fecham.

## Leitura pelo princípio 8

- **I1 com 0 divergência (Fato)** mostra que nenhuma das 69,95 milhões de linhas de votos dos dois turnos (2,09 milhões no 2º, 67,86 milhões no 1º) foi alterada sem também se refazer a cadeia, e que o nosso leitor de BU está certo.
- Isso **não** prova que nenhum BU foi alterado: a cadeia não tem chave, e quem altera o BU pode recalculá-la (catálogo, classe S). O que fecha a porta é a assinatura sobre o último hash.
- I2 a I5 são garantidos pelo software da urna. Com 0 violação, não há sinal de urna fora do padrão nem de BU montado fora dela com contagem incoerente.
- Nenhum deles pega voto dado por outra pessoa no lugar de um eleitor que existe no cadastro (catálogo, "Limite do método").

## Reproduzir

```bash
node scripts/auditoria/matematico-brutos.mjs --turno 2 --procs 4      # ~1 h com o disco disputado; retomável por UF
node scripts/auditoria/matematico-brutos.mjs --turno 1 --procs 4
node scripts/auditoria/matematico-resumo-brutos.mjs                   # brutos-resumo.json e brutos-casos.jsonl
```

Saídas em `data/parsed/auditoria/matematico/`:

- `<t>t/<uf>.jsonl`: uma linha por pacote, com cadeia, cargos do BU e do RDV, ciclo do log e violações;
- `brutos-resumo.json`;
- `brutos-casos.jsonl`: os pacotes com violação.
