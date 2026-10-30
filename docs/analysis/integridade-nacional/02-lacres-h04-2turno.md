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
