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
