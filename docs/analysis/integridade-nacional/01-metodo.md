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
