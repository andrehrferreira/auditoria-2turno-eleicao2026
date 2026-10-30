# T16 — Revisão adversarial do método da frente de integridade (H04, H11)

Papel: revisor adversarial de métodos estatísticos e de explicações alternativas. Tente derrubar as conclusões nos DOIS sentidos: (a) falso alarme — algo tratado como anomalia que tem explicação benigna; (b) falsa absolvição — algo explicado como benigno que poderia esconder manipulação, ou teste sem poder para ver o que diz descartar.

Contexto: auditoria independente dos arquivos públicos das urnas das eleições brasileiras de 2026 (TSE; 1º turno 04/10/2026, 2º turno 25/10/2026; 499.207 seções com pacote). Cada pacote de seção tem BU (boletim), RDV, log da urna (log.jez → logd.dat, linhas com data/hora, nível, nº da urna, aplicação, mensagem, hash encadeado) e .vsc (lista lacrada com SHA-512 e assinatura). Os números vêm de scripts Node rodados sobre o universo completo. A auditoria rotula tudo como Fato (script do repo reproduz), Hipótese, Recomendação ou Pendente. Sua resposta é tratada como Hipótese até um script do repo reproduzi-la.

Formato obrigatório da resposta (em português):
- Uma lista numerada; um item por achado, cada um com: **Achado**, **Motivo**, **Trecho de referência** (arquivo + citação curta), **Gravidade** (alta/média/baixa) e **Confiança** (alta/média/baixa).
- Se não achar nada num ponto pedido, diga explicitamente "nada encontrado" e justifique.
- Não invente números: se precisar de um número que não está no texto, diga qual conta/consulta faria.
- Toda norma, resolução ou URL que citar deve vir marcada [a confirmar], com o número/artigo exato se souber.

Pontos que queremos atacados com prioridade:
1. Linha de base de aniversário para seriais de 32 bits (FV: 29 e 30 pares contra 29,0 esperados; entre turnos n1·n2/2³² ≈ 58,0 contra 59 observados). As premissas (uniformidade, independência, n usado) se sustentam? O teste teria poder para detectar reuso deliberado de poucos cartões?
2. A classificação dos 92 períodos de log cruzados em "cópia / relógio acertado / linha corrompida" (doc 03). Há forma de uma escrita simultânea real cair numa dessas classes?
3. Doc 07: erros de "Verificação de assinatura" seguidos de votação sem nova carga (128 eventos no 2º turno; 24.422 e 31.892 votos depois do erro). A hipótese benigna (erro de leitura passageiro) e o que a distinguiria de troca de arquivo que volta ao original. Que teste com os arquivos públicos ainda é possível?
4. Doc 04: coerência de identificadores entre arquivos assinados pelo mesmo software — o que essa coerência prova e não prova; as exceções do RED (14 no 1º turno, 3 no 2º).
5. Entre turnos (doc 03): 1.562 trocas seção→seção de urna sem contingência registrada; 81 urnas que mudaram de seção. Que explicações alternativas e que testes faltam?
6. Qualquer outro buraco de método, número que não fecha entre documentos, ou conclusão maior que a evidência.


===== ARQUIVO: docs/analysis/integridade-nacional/01-metodo.md =====
# Integridade nacional dos arquivos de urna: método

Auditor E (integridade). Pergunta: os arquivos publicados foram adulterados, gerados fora de uma urna oficial, ou usam mídias reaproveitadas? Hipóteses H04 e H11 de [hipoteses.md](../../hipoteses.md); itens A12 e C3 do [checklist](../../07-checklist-auditoria.md).

Modelo de ameaça: princípio 8 de [01-premissas.md](../../01-premissas.md). Neste tema, **só conta como controle o que deixa rastro verificável nos arquivos**: hash, assinatura, certificado, serial. Procedimento humano ("o cartório guardou a mídia", "o TSE seguiu o rito", "a AC foi renovada") não é controle nem explicação benigna. O que a criptografia pública não cobre está registrado como risco em [06-riscos-fora-da-criptografia.md](06-riscos-fora-da-criptografia.md).

## Scripts (Node 24, sem dependências)

| Script | O que faz | Saída (`data/parsed/auditoria/integridade/`) |
|---|---|---|
| `scripts/auditoria/integridade-lacres.mjs` | Para cada diretório de hash de cada seção: verificação completa de `src/lacres.js` (`verificarLacres`) + nome do diretório = `hashDiretorio(.vsc)` + tamanho de cada arquivo = tamanho lacrado + lista SW = lista HW; extrai identificadores do BU, do `.vsc` e do log. Fila de zonas para no máximo 10 processos (`child_process.fork`). `--sem-lacres` extrai só os identificadores | `<t>t/<uf>.jsonl` (1 linha por diretório), `<t>t-identificadores/` |
| `scripts/auditoria/integridade-reverificar.mjs` | Diretórios com falha de **leitura**: reproduz a falha com `verificarDiretorio` (a função da linha de comando), corta o certificado no fim do DER e refaz a verificação completa | `<t>t/reverificacao.jsonl` |
| `scripts/auditoria/integridade-resumo.mjs` | Testes 1 a 4 de um turno | `<t>t/resumo.json`, `<t>t/casos.jsonl`, `<t>t/secoes.jsonl` |
| `scripts/auditoria/integridade-entre-turnos.mjs` | Teste 2 entre turnos, seção a seção | `entre-turnos.json`, `entre-turnos-casos.jsonl` |

Reproduzir:

```bash
node scripts/auditoria/integridade-lacres.mjs --turno 2 --procs 10 --refazer
node scripts/auditoria/integridade-reverificar.mjs --turno 2 --cli 20
node scripts/auditoria/integridade-resumo.mjs --turno 2
node scripts/auditoria/integridade-lacres.mjs --turno 1 --procs 10 --refazer --sem-lacres
node scripts/auditoria/integridade-resumo.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores
node scripts/auditoria/integridade-entre-turnos.mjs
node src/lacres.js <diretório>   # confirmação de qualquer caso
```

## Quais pacotes entram

- **Com `aux.json`** (2º turno): só os hashes que o aux lista com arquivo. Os demais diretórios são **órfãos**: o script registra se o `.vsc` deles é cópia byte a byte de um pacote oficial e se o nome é o formato antigo (base64 com `/`).
- **Sem `aux.json`** (1º turno, extraído dos ZIPs por UF): só os diretórios cujo nome = `hashDiretorio(.vsc)` (`src/vsc.js`).
- Seção com mais de um pacote oficial: entra o `Totalizado` (ou o último), e o caso é listado.

## Conferências por diretório

| Camada | Conferência | Fonte |
|---|---|---|
| nome | nome do diretório = `hex(base64(SHA-256(.vsc)))` = hash do aux | script |
| certificado | certificado da urna assinado pela AC emissora (`data/certificados/ac/`); válido na data da eleição | `src/lacres.js` |
| lista | SHA-512 da lista HW = hash gravado; assinatura da urna sobre a lista | `src/lacres.js` |
| arquivo | SHA-512 de cada arquivo publicado = hash lacrado; assinatura da urna sobre o hash de cada um dos 11 arquivos (inclusive os 7 não publicados) | `src/lacres.js` |
| bu | cadeia de hashes das tuplas recalculada; último hash = gravado; assinatura da urna sobre ele | `src/lacres.js` |
| extra | tamanho do arquivo = tamanho lacrado; lista SW (CEPESC) e lista HW com os mesmos nomes, hashes e tamanhos; nenhum arquivo publicado fora da lista | script |

## Identificadores comparados

| Identificador | BU | `.vsc` | Certificado | Log |
|---|---|---|---|---|
| Nº interno da urna | `numeroInternoUrna` (carga) | usuário `UEAO` + número do bloco HW | CN `UEAOnnnnnnnn` | 3ª coluna de cada linha |
| Flash de votação (FV/MV) | `numeroSerieFV` | — | — | `Serial da MV:` |
| Mídia de resultado (MR) | — | — | — | `Número de série da MR:` (só no 2º turno, ver 03) |
| Mídia de carga (FC) | `numeroSerieFC` | — | — | `Identificador da mídia de carga:` |
| Código de carga | `codigoCarga` | — | — | `Código de carga … gravado` (sem os pontos) |
| Modelo | — | `modeloEquipamento` | — | `Identificação do Modelo de Urna:` |
| Versão | `versaoVotacao` | — | — | `Versão da aplicação:` |

## Rótulos

**Fato**: número saído de um script do repo, com o comando acima. Toda falha de verificação foi reproduzida com `node src/lacres.js <dir>` antes de virar Fato. **Hipótese**: explicação ainda não testada nos arquivos. **Recomendação**: próximo passo.


===== ARQUIVO: docs/analysis/integridade-nacional/02-lacres-h04-2turno.md =====
# Teste 1 (H04): lacres de todas as seções do 2º turno

**Resultado:** **Fato (29/10/2026).** Todas as 499.207 seções com urna do 2º turno passam em todas as conferências criptográficas: 11.100.396 conferências e **0 falha de arquivo**. A única falha encontrada é do **leitor** (`src/lacres.js`), não dos arquivos: em 37.457 diretórios (urnas UE2013/UE2015) o certificado vem com bytes zero a mais e o leitor para antes de conferir. Com o certificado cortado no fim do DER, os 37.457 passam em tudo.

Método e comandos: [01-metodo.md](01-metodo.md). Saídas em `data/parsed/auditoria/integridade/2t/` (`<uf>.jsonl`, `resumo.json`, `casos.jsonl`, `reverificacao.jsonl`, `reverificacao-resumo.json`).

## Hipótese nula e explicações

- **H0:** os arquivos publicados são os que uma urna com certificado das ACs do TSE assinou, sem alteração.
- **Rejeitaria H0:** qualquer hash, assinatura, certificado ou cadeia do BU que não confira, nome de diretório ≠ hash do `.vsc`, tamanho ≠ tamanho lacrado, lista SW ≠ lista HW, ou arquivo publicado fora da lista lacrada.
- O que H0 **não** cobre está no [doc 06](06-riscos-fora-da-criptografia.md) (CEPESC, ACs intermediárias, AC URNA vencida, chave da urna).

## Números (2º turno, país inteiro + exterior)

| Item | Valor |
|---|---|
| Seções com pacote | 499.207 (+ 41 "Nao instalada", sem arquivo) |
| Diretórios oficiais conferidos | 499.207 (nenhuma seção com mais de um pacote; nenhum pacote do aux ausente no disco) |
| Diretórios órfãos (fora do aux) | 1.040, todos no AC: **cópia byte a byte** do `.vsc` oficial, com o nome antigo (base64 com `/`) |
| Conferências | 11.100.396: certificado 998.414; lista 998.414; arquivo 7.484.117; cadeia do BU 1.619.451 |
| Nome do diretório ≠ hash do `.vsc` | 0 |
| Tamanho ≠ lacrado; lista SW ≠ HW; arquivo fora da lista | 0; 0; 0 |
| Falhas de hash ou assinatura | **0** |
| Sistema de Apuração (`-sa.vsc`, `-busa.dat`) | 29 pacotes, todos no exterior, 493 conferências, 0 falha. Dois computadores de apuração: `ueao01808076` (20 pacotes) e `ueao01762246` (9) |

| Emissor | Modelo | Algoritmo | Diretórios |
|---|---|---|---|
| AC UE2020 | UE2020 | Ed521 | 200.504 |
| AC UE2022 | UE2022 | Ed521 | 198.746 |
| AC URNA | UE2015 | ECDSA P-521 | 87.502 |
| AC URNA | UE2013 | ECDSA P-521 | 12.455 |

Nenhum certificado de urna com emissor fora dessas três ACs. Nenhum certificado de urna fora da validade em 25/10/2026: o mais antigo começa em 30/07/2013, e os vencimentos vão de 08/04/2027 a 15/01/2038.

Por UF, todas com 0 falha. As UFs sem urna UE2013/UE2015 são AC, AP, RO e RR. O TO tem 9 diretórios da AC URNA. Detalhe em `resumo.json` → `teste1.porUf`.

## Achado: certificado com bytes a mais (falha do leitor, não do arquivo)

- **Fato:** 37.457 diretórios param em `FALHA [leitura] DER: comprimento ausente`. A falha foi reproduzida em 37.457 de 37.457 com `verificarDiretorio`, e em 30 casos (um por UF primeiro) com `node src/lacres.js <dir>`, que sai com código 1.
- **Causa (Fato):** o campo `[1]` do bloco HW do `.vsc`, que guarda o certificado da urna, tem 946 bytes.
  - O DER do certificado ocupa 945 bytes (37.406 casos) ou 943 (51 casos).
  - O que sobra é só `0x00`, em 37.457 de 37.457.
  - O leitor `der()` de `src/lacres.js` trata o campo inteiro como lista de nós e falha no byte que sobra.
  - Na UE2015 que passa, a assinatura do certificado (BIT STRING) tem 140 bytes. Nas que falham, 139 ou menos.
  - `openssl asn1parse` lê o certificado e acusa `Error in encoding` só no byte final.
  - Não é BER, nem comprimento indefinido, nem arquivo corrompido.
- **Hipótese:** a urna grava o certificado num campo de tamanho fixo e completa com zeros. A assinatura ECDSA em DER varia de tamanho conforme os bits altos de r e s.
- **Reverificação (Fato):** `scripts/auditoria/integridade-reverificar.mjs` remonta o `.vsc` em memória com o certificado cortado. Só os comprimentos dos nós pais mudam; a lista assinada e as assinaturas são copiadas byte a byte.
  - O script roda `verificarLacres` completo: 37.457 de 37.457 aprovados, 0 falha.
  - Todos esses certificados são da AC URNA: UE2015 32.811, UE2013 4.646.
  - Contraprova: um bit trocado no BU de SP 71072/0258/0032 dá 3 falhas.
- **Caso pedido pelo coordenador (CE 15989/0055/0160):** é este mesmo achado. O certificado `ueao01819164` (AC URNA, ECDSA) tem 945 bytes de DER num campo de 946, com sobra `00`. Depois do corte, 22 de 22 conferências.
- **Recomendação (correção em `src/lacres.js`, não aplicada):**
  - Em `lerCertificado`, cortar `derBytes` no fim do primeiro elemento DER (cabeçalho mais comprimento declarado) antes de `raiz()` e de `new X509Certificate()`.
  - Aceitar a sobra só se for toda de zeros e registrar o tamanho dela em `observacoes`.
  - Sobra diferente de zero continua sendo falha.
  - Teste: o `.vsc` do CE 15989/0055/0160 (1 byte `00`) e um com 3 bytes.

## Observação registrada: AC URNA vencida

- **Fato:** o certificado publicado da AC URNA vale de 22/07/2011 a 18/07/2026. Ele valida os 99.957 diretórios UE2013/UE2015 do 2º turno, todos com a observação "fora da validade na data da eleição".
- Pela premissa 8, a explicação "renovada com a mesma chave" não é controle. É risco R3 do [doc 06](06-riscos-fora-da-criptografia.md) até o TSE publicar o certificado vigente.

## Casos especiais

- **Recuperador de Dados (RED), 16 seções.** Em 3 delas, a urna que assinou não é a urna do BU: ES 57932/0009/0085, RJ 58696/0027/0139 e SP 64777/0393/0312. Detalhe no [doc 04](04-coerencia-identificadores.md).
- **Autoverificação do software registrada no log com `[ERRO]`:** [doc 07](07-autoverificacao-no-log.md).

## Limite

Este teste prova que o arquivo não mudou depois de assinado e que quem assinou tinha uma chave certificada por uma das três ACs. Não prova que essas ACs só certificaram urnas reais, nem que o software dentro da urna é o lacrado (doc 06, R2, R4 e R5).


===== ARQUIVO: docs/analysis/integridade-nacional/03-seriais-h11.md =====
# Teste 2 (H11/A12): seriais repetidos entre seções

**Resultado (2º turno, 499.178 seções com urna, sem os 29 BUs do Sistema de Apuração):**

- **Fato:** nenhuma urna, nenhum código de carga e nenhuma FV aparece em duas seções além do acaso.
- **Fato:** a mídia de resultado (MR) repete em grupos grandes, cada grupo com uma única geração da MR.
  - São 7 grupos e 1.566 seções: 1.266 no exterior, 289 no RJ, 9 no AP e 2 no DF.
  - Nesses grupos, o serial da MR identifica a geração, não o cartão.
  - Não afeta o lacre: o BU não leva o serial da MR, e o log que o registra está assinado pela urna.

1º turno e entre turnos: seções abaixo.

Comandos: `node scripts/auditoria/integridade-resumo.mjs --turno 2` (`resumo.json` → `teste2`; `casos.jsonl` → `repeticao_*`), `node scripts/auditoria/integridade-casos-especiais.mjs --turno 2` (`casos-especiais.json` → `mr`), `node scripts/auditoria/integridade-urnas-reaproveitadas.mjs --turno 2` (`urnas-reaproveitadas.json`).

## Hipótese nula e linha de base

- **H0:** cada urna, FV, MR e código de carga serve uma só seção por turno. A mídia de carga (FC) é de lote: repetir é o esperado.
- **Linha de base do acaso:** FV e MR têm 8 dígitos hexadecimais (2³² ≈ 4,3 bilhões de valores). Com n ≈ 499 mil seriais sorteados ao acaso, o número esperado de pares repetidos é n(n−1)/2 ÷ 2³², cerca de 29,0 (paradoxo do aniversário). Pares em UFs distantes são, por isso, esperados. Grupos de 3 ou mais no mesmo lugar não são.
- **Premissa 8:** "a zona eleitoral organizou as mídias assim" não é explicação aceita. Só conta o que o arquivo mostra.

## Números

| Serial | Fonte | Seções com valor | Valores distintos | Repetidos | Detalhe |
|---|---|---|---|---|---|
| Nº interno da urna | BU | 499.178 | 499.178 | **0** | Nenhuma urna (nem de contingência, tipos 4 e 6) em duas seções |
| Código de carga | BU | 499.178 | 499.178 | **0** | — |
| FV (flash de votação) | BU | 499.178 | 499.149 | 29 pares | Os 29 em municípios diferentes; esperado pelo acaso: 29,0 |
| MR (mídia de resultado) | log, última leitura em 24 ou 25/10 | 499.055 | 497.466 | 37 valores | 30 pares de gerações diferentes (acaso; esperado ≈ 29) + 7 grupos de geração única (abaixo) |
| FC (mídia de carga) | BU | 499.178 | 23.170 | 22.919 em 2+ seções | De 1 a 125 seções por mídia; 22.067 grupos numa só zona, 852 em mais de uma zona |

**Sistema de Apuração (exterior):** dois computadores apuram os 29 pacotes `-sa.vsc`. São `ueao01808076` (20) e `ueao01762246` (9). Uma máquina para várias seções é o desenho do SA. As assinaturas conferem ([doc 02](02-lacres-h04-2turno.md)).

### MR: grupos com uma geração só

Para cada seção do grupo, o script lê no log o bloco da leitura da MR: computador que gerou e data e hora da geração.

| MR | Seções | Onde | Geração (computador, data e hora) | Tipos de urna |
|---|---|---|---|---|
| `019D22EB` | 1.256 | exterior, 114 zonas | `ZZZ001WKS94`, 10/10/2026 09:19:50 | 1.214 seção, 42 reserva |
| `C928805E` | 168 | RJ 60011, 1 zona | `ZRJ162STD92`, 11/10/2026 14:32:57 | 159 seção, 9 reserva |
| `3482056B` | 115 | RJ 60011/0119 | `ZRJ119STD94`, 15/10/2026 13:07:33 | 111 seção, 4 reserva |
| `A3492B0E` | 10 | exterior, zona 30961 | `ZZZ001WKS94`, 09/10/2026 18:55:14 | 10 seção |
| `EC793229` | 9 | AP 06025/0012 (2) e 06114/0012 (7) | `RAPWGM06`, 10/10/2026 09:39:39 | 9 seção |
| `BB499B0C` | 6 | RJ 60011/0023 | `ZRJ023STD92`, 14/10/2026 12:01:07 | 6 seção |
| `773EB8C6` | 2 | DF, 2 zonas | `ZDF012WKS01`, 14/10/2026 08:07:02 | 2 seção |

- **Fato:** no RJ, urnas diferentes da mesma zona leram o mesmo serial no mesmo minuto: até 8 no grupo `3482056B`, às 07:23 de 25/10, e até 7 no `C928805E`, às 06:55. Um cartão só não está em 8 urnas no mesmo minuto. Logo, há vários cartões com o mesmo serial e a mesma geração.
- **Fato (AP, pedido da sessão -64):** as 9 seções com `EC793229` têm 9 urnas, 9 FVs, 9 certificados e 9 códigos de carga diferentes.
  - A MR foi lida entre 07:07:26 e 07:46:52 de 25/10, primeiro em Porto Grande (06025) e depois em Ferreira Gomes (06114).
  - As 9 passam em 22 de 22 conferências. O resultado foi reproduzido com `node src/lacres.js` em cada uma.
  - Certificados, todos da AC UE2022, Ed521: `UEAO02357370`, `…02343269`, `…02354781`, `…02358174`, `…02342640`, `…02352216`, `…02358916`, `…02343413`, `…02342435`.
  - Na 06114/0012/0055, o log registra antes outra MR, `B5592485`, lida em 22/10.
- **Fato:** o BU não tem campo para o serial da MR (`src/esquemas.js`: só `numeroSerieFV` e `carga.numeroSerieFC`). O serial está só no log.
  - O `log.jez` é um dos 11 arquivos lacrados: o SHA-512 dele confere e a assinatura da urna cobre esse hash.
  - Trocar o serial no log publicado quebraria o lacre. Mas o serial em si é gravado pelo software da urna a partir do cartão.
- **Hipótese:** nessas zonas, a MR foi gerada uma vez e copiada para vários cartões. O "serial" registrado no log é da imagem gerada, não do cartão físico.
  - **Teste possível (Recomendação):** comparar o serial com o "Tamanho da MR" e com o cartão em outras zonas.
  - **Teste possível (Recomendação):** pedir ao TRE-RJ, ao TRE-AP e ao TSE (exterior) o procedimento de geração de MR dessas zonas.
- **Risco (premissa 8):** nessas 1.566 seções, o serial da MR não serve de controle técnico da unicidade do cartão. Fora delas, ele é único por seção, salvo os pares do acaso.
  - Isso não abre caminho para alterar resultado: o resultado publicado é o assinado pela urna, e a MR só transporta.
  - Abre caminho só para trocar um cartão por outro sem que o serial denuncie.
- **Divergência registrada:** [boatos/02](../boatos/02-mesmo-drive-e-resultados-iguais.md) lista só o grupo do AP e 38 pares. A diferença está no método: aqui, a MR é a última lida na véspera ou no dia da eleição, e a geração vem do próprio log. **Recomendação:** o autor de boatos/02 confere os grupos do RJ e do exterior no script dele.

### Seriais no 1º turno

Comandos: `node scripts/auditoria/integridade-resumo.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores` e `node scripts/auditoria/integridade-casos-especiais.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores`. Universo: 499.207 seções; 499.176 com urna, sem os 31 BUs do Sistema de Apuração.

| Serial | Seções com valor | Valores distintos | Repetidos | Detalhe |
|---|---|---|---|---|
| Nº interno da urna (BU) | 499.176 | 499.176 | **0** | — |
| Código de carga (BU) | 499.176 | 499.176 | **0** | — |
| FV (BU) | 499.176 | 499.142 | 30 pares + 1 grupo de 5 | Pares em municípios diferentes; esperado pelo acaso: 29,0. O grupo de 5 é `00000000` (abaixo) |
| MR (log) | 186 | 158 | 13 valores | Só 186 logs do 1º turno registram serial de MR (50 deles de seções RED). Os 13 grupos têm, cada um, uma única geração |
| FC (BU) | 499.176 | 23.067 | 22.888 em 2+ seções | De 2 a 126 seções por mídia; 22.415 grupos numa só zona, 473 em mais de uma |

- **Fato, FV `00000000` no 1º turno (5 seções de urna comum):**
  - 4 são recuperações pelo RED em que o log registra "Detectado Urna de Votação sem MV": GO 94773/0110/0016, PE 25178/0055/0042, RJ 58653/0144/0242 e SP 70572/0307/0417.
  - A quinta é MS 90999/0022/0043, votação normal (`votacaoUE`). Em 04/10, a urna pediu a mídia de votação 5 vezes entre 06:26 e 08:14 ("O aplicativo Software de Votação precisa de uma mídia de votação"). Às 08:21 foi feita a contingência de MV com o cartão `299E20C5` ("Contingência de MV executada com sucesso"), e a urna ficou pronta às 08:29. O BU saiu com FV `00000000`; o log registra o cartão novo.
- **Fato, RED no 1º turno (50 seções):** em 46, a FV do BU é um cartão lido no log; nas 4 restantes, é a recuperação sem cartão acima. Em 14 delas, outra urna recuperou. Nas 50, os votos do dia nos logs somam o comparecimento do BU.

### Entre turnos

Comando: `node scripts/auditoria/integridade-entre-turnos.mjs` → `data/parsed/auditoria/integridade/entre-turnos.json` e `entre-turnos-casos.jsonl`. Universo: 499.176 seções com urna nos dois turnos (o 2º tem mais 2, os SA mistos de MG que votaram em urna).

- **Fato:** a versão do software no BU é a mesma nas 499.176 seções nos dois turnos.
- **Fato:** 4.424 seções têm outra urna no BU do 2º turno. Pelo tipo de urna no BU (1º → 2º turno): seção → seção 1.562; seção → reserva 2.733; reserva → reserva 83; reserva → seção 44; seção → reserva encerrando a seção 2.
- **Fato:** o código de carga mudou em 4.794 seções: as 4.424 que trocaram de urna e 370 com a mesma urna recarregada.
- **Fato:** nenhuma mídia de carga do 1º turno aparece em outra zona no 2º. Nenhuma seção mudou de FC sem mudar de código de carga.
- **Fato:** 81 urnas votaram numa seção no 1º turno e em outra no 2º (48 de seção nas duas, 32 de seção que viraram reserva, 1 reserva nas duas).
- **Fato:** 60 FVs do 1º turno aparecem em outra seção no 2º. São 59 coincidências, todas em municípios diferentes (o acaso prevê 58,0 para seriais de 32 bits), e o `00000000` da recuperação sem cartão de MG 46256/0131/0046, igual ao das 5 seções do 1º turno.
- **Pendente:** por que 1.562 seções trocaram de urna de seção entre os turnos sem contingência registrada no BU, e o que as 81 urnas que mudaram de seção têm no log.

### Mesma urna em mais de uma seção, contando a contingência

O log aninhado guarda o log da urna original substituída numa contingência (a cópia que estava no cartão de votação), ou o log anterior da mesma urna, arquivado quando ela é recarregada ([doc 07](07-autoverificacao-no-log.md)).

Comandos: `node scripts/auditoria/integridade-urnas-reaproveitadas.mjs --turno 2` → `urnas-reaproveitadas.json`; `node scripts/auditoria/integridade-sobreposicao-bruto.mjs --turno 2` (3 s) → `sobreposicao-bruto.json`.

- **Fato:** 360 urnas aparecem em mais de uma seção no 2º turno, contando o log aninhado. O padrão principal (271 urnas) é este: a urna aparece como original substituída (log aninhado) numa seção, e em outra é a urna do BU que votou em 25/10.
  - Exemplo: AC 01015/0002/0093. O log da urna 2264191 termina em 15/10; a reserva 2293878 assumiu com o mesmo cartão de votação (MV `D0AD8444`).
  - A urna 2264191 recebeu log novo a partir de 24/10 e votou na seção 0088.
- **Fato:** nenhuma urna registrou atividade em 25/10 em duas seções diferentes. A única exceção são 2 urnas da seção RED do ES ([doc 04](04-coerencia-identificadores.md)), em que os mesmos logs foram copiados nos pacotes da 0085 e da 0112.
- **Fato:** nenhuma urna escreveu log em duas seções ao mesmo tempo.
  - Pela primeira e pela última linha de cada log, 92 urnas têm períodos que se cruzam em duas seções. Conferidas uma a uma no log bruto:

    | Resultado no bruto | Urnas |
    |---|---|
    | Mesmo log em dois pacotes: na janela comum, um lado não tem nenhuma linha que o outro não tenha (no mínimo 24 linhas iguais por par) | 87 |
    | Relógio acertado na carga: as linhas anteriores a "Data e hora atualizada" têm a data errada do relógio interno | 4 |
    | Linha isolada com o número da urna corrompido (RJ 60011/0008/0061, log com bits apagados) | 1 |
    | Escrita simultânea em duas seções | 0 |

  - Como o mesmo log vai parar em dois pacotes, no caso da urna 2391275 (BA 38490/0011): ela falhou na seção 0594 em 04/10 às 07:50, e o cartão de votação (MV `B10A2CB2`) foi para a reserva levando a cópia do log até 07:53 (996 linhas). Em 15/10 a urna foi recarregada como reserva e assumiu a seção 0486 em 25/10. O log antigo foi arquivado dentro dela e saiu no pacote da 0486 com 1.050 linhas. O código de carga é o mesmo nos dois.
  - Exemplo de relógio acertado: PA 04839/0100/0251. A carga começa às "27/09 19:30" do relógio interno, e o operador digita **21/10/2026 10:33**. A urna tinha sido usada na seção 0055 até 04/10. O mesmo ocorre em MT 90670/0039/0376 (relógio em 15/09, data digitada 24/10).
  - Linha corrompida: no log aninhado do RJ 60011/0008/0061 (1º turno, guardado no pacote do 2º), a linha "Tecla ildevida presqimnada" traz a urna `01760981`. A urna do BU é a `01760983`. O mesmo log tem também `01740981` (92 linhas) e `01560983` (4 linhas): todas são o número `01760983` com o bit 0x02 apagado em algum dígito (3→1, 6→4, 7→5). A `01760981` verdadeira é a urna do BU do MS 91014/0004/0077.
- **Fato, 1º turno** (mesmos scripts com `--turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores`, 499.207 seções):
  - 4 urnas aparecem em mais de uma seção. São poucas porque o pacote do 1º turno não traz o histórico de urnas reaproveitadas depois.
  - 2 têm períodos cruzados, e as 2 são cópia do mesmo log (mesmo código de carga, conferido no bruto). Escrita simultânea: 0.
  - Uma delas tem linhas do dia nas duas seções: a urna 2423907 (BA 39934/0183). Ela votou na seção 0181 das 08:00 às 12:25 de 04/10 e foi substituída pela reserva, com o cartão `A23FBB23`.
  - Às 13:19, essa urna foi ligada com o cartão `008B59DC`, da seção 0175. Registrou "MV original … registrada na MI: A23FBB23" e "Serial da MV: 008B59DC", gravou o histórico dela no cartão e parou às 13:20:46. Não abriu a aplicação de votação nem registrou voto.
  - Às 13:23 o cartão voltou para a urna da própria 0175 (2424441). Por isso o log da 2423907 está nos pacotes das duas seções.
- **Leitura:** a urna substituída numa seção (no 1º turno ou antes do 2º) foi reaproveitada em outra. É coerente com o fluxo de contingência e não aparece no teste de urna repetida do BU, que dá 0.

## Pendente

- Entre turnos: o motivo das trocas de urna (contagens na seção "Entre turnos" acima).


===== ARQUIVO: docs/analysis/integridade-nacional/04-coerencia-identificadores.md =====
# Teste 3: coerência entre identificadores (BU × `.vsc` × certificado × log)

**Resultado:** **Fato (29/10/2026, 2º turno, 499.207 seções).** Em toda seção com urna, o número da urna é o mesmo no BU, no `.vsc`, no certificado e no log. O mesmo vale para FV do BU = MV do log, modelo do `.vsc` = modelo do log, mídia de carga e código de carga BU = log, e município/zona/seção do BU = diretório. Há duas exceções, ambas com mecanismo identificado:

- 3 pacotes do Recuperador de Dados (RED), assinados por outra urna;
- os 29 BUs do Sistema de Apuração, mais 1 RED, com FV `00000000`.

Comando: `node scripts/auditoria/integridade-resumo.mjs --turno 2` → `resumo.json` (`teste3`) e `casos.jsonl` (`"teste":3`). RED: `node scripts/auditoria/integridade-casos-especiais.mjs --turno 2` → `casos-especiais.json`.

## Hipótese nula e o que a rejeitaria

- **H0:** cada pacote foi gerado pela urna que o BU identifica, com as mídias que o log dessa urna registra.
- **Rejeitaria H0:** pacote assinado por uma urna diferente da do BU sem explicação no próprio arquivo; FV, FC ou código de carga do BU diferentes do log; BU de uma seção dentro do diretório de outra.

## Números

| Conferência | Igual | Diferente | Sem dado |
|---|---|---|---|
| Município/zona/seção e pleito do BU = diretório | 499.207 | 0 | 0 |
| Nº da urna: BU = `.vsc` (usuário `UEAO` + número) | 499.204 | 3 | 0 |
| Nº da urna: BU = certificado (`UEAOnnnnnnnn`) | 499.204 | 3 | 0 |
| Log principal com um só número de urna | 499.207 | 0 | 0 |
| Nº da urna: BU presente no log principal | 499.204 | 3 | 0 |
| FV do BU = MV do log | 499.177 | 30 | 0 |
| Modelo `.vsc` = modelo no log | 499.207 | 0 | 0 |
| Mídia de carga (FC) BU = log | 499.201 | 3 | 3 |
| Código de carga BU = log | 499.201 | 3 | 3 |

O certificado e o `.vsc` concordam entre si nos 499.207 diretórios. O certificado do lote das 37.457 UE2013/UE2015 foi lido depois do corte ([doc 02](02-lacres-h04-2turno.md)).

## As exceções

### Recuperador de Dados (RED): pacote assinado por outra urna (3 seções)

| Seção | Urna do BU | Urna que assinou (`.vsc`, certificado, log principal) | Recuperação no log |
|---|---|---|---|
| ES 57932/0009/0085 | 1841837 | 1758779 (UE2015, AC URNA) | 25/10/2026 19:40:49 |
| RJ 58696/0027/0139 | 2179194 | 2189420 (UE2020, AC UE2020) | 25/10/2026 22:14:44 |
| SP 64777/0393/0312 | 2396114 | 2399743 (UE2022, AC UE2022) | 25/10/2026 21:07:11 |

- **Fato:** nas 3, o log principal é de uma urna carregada como "Urna de contingência". Ela inicia a aplicação "RECUPERADOR DE DADOS" na noite de 25/10.
  - O log da urna do BU vem aninhado, e os votos dele no dia são iguais ao comparecimento do BU (308, 249 e 262).
  - A FC e o código de carga do BU são os da urna original. Os do log principal são os da urna que recuperou.
  - A coincidência FC/código de carga BU = log não se aplica aqui: são as 3 seções "diferente" da tabela.
- **Fato:** nas outras 13 seções `votacaoRED` do banco, a urna do BU é a mesma do `.vsc` e do certificado.
  - Exemplo: MG 46256/0131/0046, recuperação às 18:41:48 de 25/10 na urna 2408841.
  - Duas delas são `reservaEncerrandoSecao` (ES 57932/0009/0112 e SP 61654/0014/0250). Nelas, os votos estão no log aninhado da urna substituída.
  - Nas 16 seções RED, a soma dos votos no dia dos logs do pacote é igual ao comparecimento do BU, exceto em ES 57932/0009/0085 (abaixo).
- **Fato (ES 57932/0009/0085):** o pacote publicado traz um terceiro log, da urna 1750820, com 304 votos no dia. São os votos da seção vizinha 0112, recuperada pela mesma urna 1758779 às 19:40:49.
  - Quem somar votos pelos logs publicados conta esses 304 votos duas vezes.
  - O BU da 0085 (308) e o da 0112 (304) estão corretos e assinados.
- **Risco (premissa 8):** no RED, a assinatura pública atesta a urna que **recuperou** os dados, não a que recebeu os votos.
  - A correspondência com a urna original fica na FC e no código de carga do BU, e no log aninhado.
  - Esses dados estão dentro do pacote assinado pela urna recuperadora; a assinatura da urna original sobre o BU não está no pacote publicado.
  - **Não dá para testar** com os arquivos públicos se a MV lida pelo RED é a da urna original.
  - **Dá para testar,** e foi testado: os votos do log original batem com o BU nas 16 seções.

### FV `00000000` (30 seções)

- **Fato:** os 29 BUs do Sistema de Apuração (exterior, `-busa.dat`, tipoUrna 3) têm FV `00000000`. O log do computador de apuração registra a MV dele.
- **Fato:** o BU RED de MG 46256/0131/0046 também tem FV `00000000`. O log da urna 2408841 registra a MV `EE9785B7` às 07:11 de 25/10.
- **Fato** (`node scripts/auditoria/integridade-casos-especiais.mjs --turno 2` → `casos-especiais.json`, campos `fvBU`, `fvBuEntreMvsLidas` e `redSemMv`):
  - Nas outras 15 seções RED, a FV do BU é um dos cartões de votação lidos no log ("Serial da MV:").
  - Isso inclui as 3 recuperadas por outra urna (ES 57932/0009/0085, RJ 58696/0027/0139, SP 64777/0393/0312): a FV do BU é o cartão da urna original, e a urna recuperadora leu o mesmo serial.
  - Só em MG 46256/0131/0046 o RED registrou "Detectado Urna de Votação sem MV" (18:42:24). A recuperação foi feita sem cartão, a partir da memória interna, e o BU saiu com FV `00000000`.
- Correção: uma versão anterior deste doc levantava a hipótese de que o RED grava zero no campo FV. Está refutada: o zero aparece só na recuperação sem cartão.

### MR não lida em 24 ou 25/10 (123 seções)

- **Fato:** em 122 seções com urna de seção (tipo 1), o último `Número de série da MR` do log é de antes de 24/10. Numa reserva (tipo 4), o log não registra MR nenhuma.
- Não afeta o lacre: o BU e o log estão assinados.
- Afeta só o teste de MR repetida ([doc 03](03-seriais-h11.md)): essas seções ficam fora do grupo de MR do 2º turno.

## 1º turno

Comando: `node scripts/auditoria/integridade-resumo.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores` (`teste3`). RED: `integridade-casos-especiais.mjs --turno 1 --dir …/1t-identificadores`. Universo: 499.207 seções.

| Conferência | Igual | Diferente | Sem dado |
|---|---|---|---|
| Município/zona/seção e pleito do BU = diretório | 499.207 | 0 | 0 |
| Nº da urna: BU = `.vsc` = certificado = log principal | 499.193 | 14 | 0 |
| Log principal com um só número de urna | 499.206 | 1 | 0 |
| FV do BU = MV do log | 499.171 | 36 | 0 |
| Modelo `.vsc` = modelo no log | 499.207 | 0 | 0 |
| Mídia de carga (FC) BU = log | 499.193 | 11 | 3 |
| Código de carga BU = log | 499.190 | 14 | 3 |

- **Fato:** as 14 com outra urna são pacotes do RED recuperados por outra urna. Nelas, FC e código de carga do BU são os da urna original.
- **Fato:** as 36 com FV diferente têm todas FV `00000000`: os 31 BUs do Sistema de Apuração, 4 recuperações RED sem cartão e a contingência de MV de MS 90999/0022/0043 ([doc 03](03-seriais-h11.md)).
- **Fato:** o log com dois números de urna é o de RJ 60011/0008/0061, com bits apagados: `01740981` é `01760983` corrompido ([doc 03](03-seriais-h11.md)).
- **Limite:** a extração do 1º turno não conferiu lacres (`--sem-lacres`). Ela registrou um extra: em MG 50075/0047/0041 (Sistema de Apuração misto), o `imgbu.dat` foi publicado fora da lista lacrada.

## Limite

Os identificadores vêm de arquivos gerados e assinados pelo próprio software da urna. Coerência entre eles mostra que nada foi trocado depois da assinatura, e que o pacote não foi montado com pedaços de urnas diferentes. Não mostra que o software não poderia gravar outro número (doc 06, R5).


===== ARQUIVO: docs/analysis/integridade-nacional/05-versao-software.md =====
# Teste 4: versão do software de votação

**Resultado:** **Fato (29/10/2026, 2º turno).** Uma só versão em todo o país, nos 4 modelos de urna e no exterior: `10.23.0.0 - Praia da Barra do Cahy`.

| Fonte | Seções | Versão |
|---|---|---|
| BU (`versaoVotacao`) | 499.207 de 499.207 | `10.23.0.0 - Praia da Barra do Cahy` |
| Log principal (`Versão da aplicação:`, todas as linhas desde a carga) | 499.207 de 499.207 | a mesma, sem nenhuma outra versão em nenhuma linha |
| Logs aninhados (urna original na contingência) | 12.964 logs | a mesma |

Por modelo: UE2020 200.504, UE2022 198.746, UE2015 87.502, UE2013 12.455, todas com a mesma versão. Nenhuma divergência entre o BU e o log da mesma seção.

Comando: `node scripts/auditoria/integridade-resumo.mjs --turno 2` → `resumo.json` (`teste4`); casos `"teste":4` em `casos.jsonl` (0).

- **H0:** todas as urnas rodaram a versão lacrada na cerimônia.
- **Limite (premissa 8):** a versão é texto gravado pelo próprio software. Um software alterado pode escrever a mesma string.
  - O que dá para medir de fora é a autoverificação de assinaturas registrada no log ([doc 07](07-autoverificacao-no-log.md)).
  - Não dá para comparar o binário com o lacrado (doc 06, R5).
- **1º turno:** a extração de identificadores do 1º turno ainda não foi rodada no país inteiro. No AC (2.270 seções), BU e log trazem a mesma versão. Pendente.


===== ARQUIVO: docs/analysis/integridade-nacional/06-riscos-fora-da-criptografia.md =====
# Riscos que a criptografia pública não cobre

Princípio 8 ([01-premissas.md](../../01-premissas.md)): procedimento humano não é controle. Cada ponto abaixo depende de confiar em pessoas (do TSE, de fornecedores, de quem guarda chaves e mídias) e por isso fica registrado como **risco**. Para cada um: o que os arquivos públicos permitem testar e o que não permitem.

| # | Ponto não coberto | Por que depende de pessoas | O que dá para testar nos arquivos | O que não dá |
|---|---|---|---|---|
| R1 | **Bloco SW do `.vsc` (algoritmo CEPESC, não publicado)** | Só quem tem o algoritmo e a chave confere essa assinatura. Quem a gera é o software do TSE | Lista SW = lista HW em nomes, hashes e tamanhos, em todos os diretórios (doc 02). Se as duas listas concordam, alterar um arquivo exige refazer a assinatura **da urna** (HW), que é pública | Conferir a assinatura CEPESC. Saber o que ela protege além da lista |
| R2 | **Cadeia de certificados para na AC intermediária** (AC UE2020, AC UE2022, AC URNA) | Os certificados da AC URNA v2 e das raízes (AC RAIZ UE, AC RAIZ UE v2) não estão no repo ([certificados](../../../data/certificados/README.md)). As ACs intermediárias vieram de uma cópia do pacote de exemplos do TSE (espelho no GitHub) | Que **todas** as urnas do país foram assinadas por uma das três chaves intermediárias, e com qual algoritmo (doc 02). Que nenhum certificado de urna aparece com emissor desconhecido | Que essas três chaves intermediárias são legítimas: quem controla uma delas pode emitir certificado para uma "urna" que não existe, e os arquivos dessa "urna" passariam em todas as conferências |
| R3 | **Certificado publicado da AC URNA venceu em 18/07/2026** | A explicação "a AC foi renovada com a mesma chave" é afirmação sobre conduta, sem documento no repo | Quantos diretórios dependem dessa chave (urnas UE2013 e UE2015, ECDSA) e se todas as assinaturas conferem com ela (doc 02). Datas de emissão dos certificados de urna emitidos por ela | Se existe um certificado renovado, quando foi emitido e por quem. Se a chave vencida continuou sob o mesmo controle |
| R4 | **Chave privada da urna** | A segurança da assinatura supõe que a chave privada nunca saiu da urna (hardware). Não há rastro público disso | Que cada certificado de urna aparece em uma só seção por turno, salvo contingência (doc 03); que o número no certificado = número no BU, no `.vsc` e no log (doc 04) | Que a chave não foi copiada. Uma cópia da chave produz arquivos indistinguíveis dos legítimos |
| R5 | **O que acontece dentro da urna antes da assinatura** | A urna assina o que o software dela produziu. Se o software estiver alterado, a assinatura é válida mesmo assim | Versão declarada no BU e no log (doc 05); verificações de assinatura registradas no próprio log (`Verificação de assinatura … [SUCESSO]`) | Que o binário rodando é o binário lacrado na cerimônia. O log é gerado pelo mesmo software |
| R6 | **Arquivos não publicados** (`jufa.dat`, `imgze.dat`, `hash.dat`, `mr.ver`, `wsq*.jez`) | Só o TSE os tem | Assinatura da urna sobre o hash de cada um, em todos os diretórios (doc 02) | O conteúdo |
| R7 | **Caminho mídia → totalização** (C3) | Logs de transmissão e totalização não são públicos | O arquivo publicado é o assinado pela urna (doc 02); BU = resultado oficial por seção (H03, outra frente) | O que o sistema de totalização recebeu e registrou, fora o que bate com o BU publicado |
| R8 | **Mídias (FC, MV, MR)** | Guarda e lacre físico são procedimento | Seriais repetidos entre seções e entre turnos; coerência BU × log (docs 03 e 04) | Se uma mídia foi lida ou copiada fora da urna. O serial é gravado pelo software, não é prova física |

**Recomendação:** pedir ao TSE, por LAI ou via entidade fiscalizadora, os certificados da AC URNA v2, das raízes AC RAIZ UE e AC RAIZ UE v2 e o certificado vigente da AC URNA (se houver), com a data de emissão. Baixar pelo navegador o pacote oficial `formato-arquivos-bu-rdv-ass-digital-v2.zip` e comparar com a cópia usada. Pedir a especificação ou um verificador do CEPESC.

Nenhum desses riscos, sozinho, é prova de fraude (princípio 4). O que prova é rastro nos dados; os docs 02 a 05 medem o que dá para medir.


===== ARQUIVO: docs/analysis/integridade-nacional/07-autoverificacao-no-log.md =====
# Autoverificação do software registrada no log da urna

A cada inicialização, a urna confere as assinaturas dos pacotes do próprio sistema e grava o resultado no log: `Verificação de assinatura - Etapa [n] - [pacote] - [SUCESSO|ERRO]`. É o único rastro público de que o software em execução é o lacrado (risco R5 do [doc 06](06-riscos-fora-da-criptografia.md)). O log é gravado pelo mesmo software que ele descreve. Ainda assim, ele está assinado pela urna, e o lacre foi conferido no [doc 02](02-lacres-h04-2turno.md).

Comandos:

- `node scripts/auditoria/integridade-autoverificacao.mjs --turno 2 --procs 8` (17 min, 512.173 logs) → `data/parsed/auditoria/integridade/2t/autoverificacao.jsonl` (um evento por erro) e `autoverificacao-resumo.json`.
- `node scripts/auditoria/integridade-autoverificacao-depois.mjs --turno 2` (5 s; lê também os `<uf>.jsonl` do doc 02) → `autoverificacao-depois.json`: o que veio depois de cada erro (nova carga, troca de urna ou votação sem nova carga).

**Universo:** todos os logs dos pacotes oficiais do 2º turno. São 499.207 seções; com os logs aninhados, 512.173 logs, e 0 ilegível. O log é cumulativo desde a carga, então os eventos do 1º turno e da preparação aparecem se a urna não foi recarregada.

**Fato:** a carga abre um log novo, e o log anterior fica arquivado no pacote como log aninhado, com o código de carga antigo. Por isso a nova carga nunca aparece no mesmo log do erro (`novaCarga` = 0 no resumo do primeiro script). Ela aparece como um log posterior da mesma urna, com outro código de carga. Log aninhado, portanto, é de dois tipos: a mesma urna antes de uma recarga, ou a urna original trocada numa contingência. Controle: em nenhum evento do log principal a carga registrada no BU é posterior ao erro.

## Resultado

- **Fato:** 181 eventos `Verificação de assinatura … [ERRO]` em 162 seções, entre 18/09 e 25/10/2026. Nenhum outro resultado além de SUCESSO e ERRO. 41 eventos são da véspera ou do dia de votação (03, 04, 24 ou 25/10).
- **Fato, por onde está o pacote:**

  | Pacote | Eventos | Depois do erro, na inicialização seguinte |
  |---|---|---|
  | Mídia externa (`/dsk/fe/…`: `infomidia.vsc`, `<seção>-lo.vsc`) | 129 | mesma etapa com SUCESSO em 98; ERRO de novo em 9 (todos na preparação, 20 a 29/09); sem nova verificação em 22 |
  | Sistema interno (`/boot`, `/lib`, `/bin`, `/uenux`, `/share`, `/etc`, `/dsk/fi`) | 52, em 46 seções | SUCESSO em 40; ERRO de novo em 1 (PI 10529/0021/0070, SUCESSO na terceira tentativa, 04/10 10:19); sem nova verificação em 11 |

- **Fato, o que veio depois do erro** (`autoverificacao-depois.json`):

  | Depois do erro | Eventos | Mídia externa | Sistema interno | Votos no mesmo log depois do erro |
  |---|---|---|---|---|
  | Nova carga da mesma urna (log arquivado, código de carga novo) | 36 | 31 | 5 | nenhum |
  | Troca de urna (erro no log aninhado de outra urna, urna reserva no BU) | 17 | 2 | 15 | em 10 eventos, antes da troca |
  | Sem nova carga (erro no log da urna do BU) | 128, em 125 seções | 96 | 32 | em todos os 128 |

  - As 36 novas cargas foram todas na preparação, entre 20 e 30/09, de 1 a 111 minutos depois do erro (mediana: 8). Em 27 delas a urna nem chegou a refazer a verificação antes de ser recarregada.
  - Correção: uma versão anterior deste doc dizia que os 33 eventos sem nova verificação eram todos urnas trocadas por contingência. São 27 recargas da mesma urna e 6 trocas.
  - Duas seções (GO 92215/0141/0178 e PR 77453/0005/0182) têm o erro datado antes da primeira linha do log. O relógio foi acertado à mão: o log do PR começa em 23/09 e volta para 22/09. O evento foi atribuído ao único log daquela urna no pacote.
- **Fato:** 138 eventos (134 seções) têm votos no mesmo log depois do erro: os 128 sem nova carga e 10 de urnas que votaram e só depois foram trocadas.
  - Contando uma vez cada seção × urna × dia: 24.422 votos em 103 seções no 1º turno (04/10) e 31.892 votos em 127 seções no 2º turno (25/10).
  - Correção: a versão anterior deste doc trazia 23.627 (100 seções) e 31.075 (124 seções), números que nenhum script do repo reproduz.
  - Esses votos estão nos BUs assinados dessas seções, que passam em todas as conferências do doc 02.
- **Fato:** a mensagem que acompanha o erro do sistema interno manda "Desligue a urna e faça uma nova carga" (155 linhas, 138 seções). No log publicado, o que se vê depois é: urna desligada pela chave, religada (nos 16 eventos internos da véspera ou do dia, de 2 a 14 minutos depois), mesma etapa com SUCESSO e votação normal.
  - Exemplo: SP 71072/0353/0853, `/lib/avlib.vst`, erro SAVD `5 - /lib/libQt6Gui.so.6`, às 07:35:08 de 04/10. SUCESSO às 07:39:15, urna pronta às 08:00:02.
  - Exemplo: SP 71072/0246/0151, `/boot/boot/avboot.vst`, `5 - /boot/boot/uenux`, às 10:25:46 de 24/10. SUCESSO às 10:29:21.
- **Fato:** o erro informa o arquivo que falhou (`Erro SAVD: (código - arquivo)`).
  - Códigos vistos: 0, 2 e 5.
  - Arquivos: `/boot/boot/uenux` 8, `libQt6Gui.so.6` 7, `/uenux/bin/atue` 4, `/uenux/bin/red` 2, `libapiio_resources.so` 2, `libecourna.so` 2, `/etc/avetc.vst` 2, e outros com 1. Na mídia externa, `infomidia.vsc` 107. Lista completa em `porSavd`.

### Outras mensagens de erro de assinatura (nível ERRO), por seção

| Mensagem (resumida) | Seções | Na véspera ou no dia |
|---|---|---|
| `Erro verificando assinatura do arquivo turno#.jez em /dsk/mr/turno#.vsc. … insira uma nova mídia de resultado` | 207 | 6 |
| `Validando assinaturas … Erro na verificação de integridade do sistema. Desligue a urna e faça uma nova carga` | 138 | 21 |
| `ATUE MSD com problema ao assinar` | 58 | 1 |
| `Validando assinaturas da MV … substitua a mídia de votação` | 30 | 4 |
| `Validando assinaturas … Se o erro persistir, substitua a urna` | 25 | 20 |
| `Erro na verificação de assinatura do arquivo - vota.vsu` | 25 | 24 |
| `VOTA … Erro ao inicializar assinatura` | 18 | 17 |
| `… eg.vsu` / `uenux.vsu` / `rdv.vsu` / `ze.vsu` / `bu.vsu` | 13 / 8 / 4 / 2 / 1 | 2 / 6 / 4 / 2 / 1 |
| `Falha na validação de assinatura do aplicativo de verificação da entidade fiscalizadora` | 7 | 0 |
| `Erro verificando assinatura do arquivo /uenux/bin/vota.of` (nova carga / substituição) | 5 / 2 | 5 / 2 |
| `Erro na validação de assinatura dos dados de fotos de candidatos` (nova carga / substituição) | 5 / 3 | 2 / 3 |
| Outras 9 mensagens | 1 a 3 cada | — |

A lista completa, com contagem de linhas e 5 exemplos de seção por mensagem, está em `autoverificacao-resumo.json` → `errosPorMensagem`.

## 1º turno

Comandos: `node scripts/auditoria/integridade-autoverificacao.mjs --turno 1 --procs 8` (7 min) e `node scripts/auditoria/integridade-autoverificacao-depois.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores` → `data/parsed/auditoria/integridade/1t/`.

**Universo:** 499.248 seções lidas; 41 sem pacote (exterior, não instaladas); 499.207 pacotes, 507.327 logs, 0 ilegível.

- **Fato:** 146 eventos `Verificação de assinatura … [ERRO]` em 128 seções, 22 deles na véspera ou no dia (03 e 04/10). Nenhum outro resultado além de SUCESSO e ERRO.
- **Fato, o que veio depois do erro:**

  | Depois do erro | Eventos | Mídia externa | Sistema interno |
  |---|---|---|---|
  | Nova carga da mesma urna | 36 | 31 | 5 |
  | Troca de urna | 11 | 1 | 10 |
  | Sem nova carga | 99, em 97 seções | 80 | 19 |

  - As 36 novas cargas são as mesmas do 2º turno: preparação, 20 a 30/09, de 1 a 111 minutos depois do erro (mediana: 8).
- **Fato:** 106 eventos (103 seções) têm votos depois do erro: 24.422 votos em 04/10. É o mesmo número medido pelos pacotes do 2º turno, que guardam o histórico do 1º. As duas varreduras conferem entre si.

## Leitura (premissa 8)

- A autoverificação é controle técnico com rastro. Ela acusou o erro, e em 53 eventos a urna foi recarregada (36) ou trocada (17).
- **Risco:** em 138 eventos, a urna votou depois de acusar falha de assinatura, sem a nova carga que a própria mensagem pede. Em 32 deles o erro foi no sistema interno, justamente o caso em que a mensagem manda "faça uma nova carga". O único controle depois do erro é a verificação seguinte, feita pelo mesmo software.
  - **Hipótese benigna, não testável com os arquivos públicos:** erro de leitura passageiro da memória (o código SAVD 5 aponta um arquivo).
  - Os arquivos não distinguem isso de um arquivo que mudou e voltou ao original.
- **Não é prova de fraude** (princípio 4). Os BUs dessas seções estão assinados e conferidos, e os totais conferem com o oficial (H03, outra frente).
- **Recomendação:** pedir ao TSE o significado dos códigos SAVD (0, 2, 5) e a regra de procedimento para esse erro. Comparar os resultados dessas seções com as vizinhas (estatístico).

## Pendente

- Nenhum item de varredura. Falta só a resposta do TSE sobre os códigos SAVD (Recomendação acima).

