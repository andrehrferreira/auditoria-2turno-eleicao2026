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

Os identificadores vêm de arquivos gerados e assinados pelo próprio software da urna. Quem mostra que nada foi trocado depois da assinatura são as assinaturas ([doc 02](02-lacres-h04-2turno.md)), não a coerência. A coerência mostra que, dentro do que o software declarou e assinou, o pacote não foi montado com pedaços de urnas diferentes. Não mostra que o software não poderia gravar outro número, nem exclui montagem antes da assinatura (doc 06, R5). No RED, FC, código de carga, FV e log aninhado estão todos sob a assinatura da urna recuperadora: não são testemunhas independentes da urna original (revisão externa T16, item 9).
