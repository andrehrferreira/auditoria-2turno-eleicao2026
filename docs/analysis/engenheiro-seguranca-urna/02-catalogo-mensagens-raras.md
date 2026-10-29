# 02. Catálogo nacional de mensagens do log (2º turno): o raro, onde está e o que significa

Linhas M5–M9, C3, S5 e S6 da [matriz](01-matriz-ataques.md). Pergunta: que mensagens de ERRO, ALERTA e eventos fora do comum aparecem em poucas seções, onde, e o que dizem sobre ataque ou falha?

## Método

```
node scripts/auditoria/seguranca-varrer-logs.mjs --turno 2 --paralelo 6
node scripts/auditoria/seguranca-catalogo-nacional.mjs --turno 2 [--limite 500]
```

- Uma passada por todos os logd.dat do país (inclusive os logs de urna original dentro do pacote de contingência). Resultados por UF em `data/parsed/auditoria/engenheiro-seguranca-urna/2t/<uf>.catalogo.json`; junção nacional em `catalogo-nacional-2t.json`, lista de raras em `raras-2t.tsv` e resumo em `catalogo-resumo-2t.txt`.
- **Normalização:** números viram `#`, seriais hexadecimais viram `#`, a sigla da UF em nome de arquivo e de computador vira `UF`. Duas mensagens iguais exceto pelos números contam como a mesma.
- **Período** (pela data da linha, no relógio da urna): `pre` = antes de 05/10 (carga e 1º turno; só ERRO e ALERTA entram); `prep` = 05/10 a 24/10; `dia` = 25/10; `pos` = depois de 25/10; `outroAno` = ano diferente de 2026 (relógio da urna errado).
- **Rara** = aparece em até 500 seções (≈0,1% das seções).
- Os níveis do log são INFO, ALERTA, ERRO, WHAT (detalhe técnico de um ERRO) e EXTERNO (registro de log de outra mídia). Níveis com letras trocadas (ILFM, INDO, INFM) são linhas corrompidas.

**Cobertura (Fato, 29/10/2026):** 499.207 pacotes (28 UFs), 0 ilegíveis, 4.429 mensagens distintas depois da normalização. Raras (até 500 seções, fora o período `pre`): 543 de ERRO/ALERTA/WHAT/EXTERNO e 2.623 de INFO, listadas em `raras-2t.tsv` com até 20 seções de exemplo cada.

## Resumo por tema (ERRO, ALERTA, WHAT, EXTERNO; preparação e dia da votação)

Agrupamento por expressão regular no texto (`seguranca-catalogo-nacional.mjs`, bloco "Temas"). "Seções" = seções da mensagem mais comum do tema.

| Tema | Dia 25/10: mensagens / eventos / seções | Preparação (05–24/10): mensagens / eventos / seções | Exemplo mais comum |
|---|---|---|---|
| Mídia (MR, MV, ME, MI, I/O) | 39 / 533.864 / 497.702 | 62 / 1.109.671 / 498.698 | `ERRO GAP Problema ao desmontar a MR` |
| Procedimento de mesa | 18 / 6.858.504 / 497.189 | 2 / 8.394 / 7.076 | `Identificador do eleitor digitado inválido` |
| Biometria (leitor) | 33 / 185.834 / 98.545 | 48 / 2.311 / 552 | `Habilitação cancelada durante reconhecimento biométrico` |
| Energia / bateria | 8 / 8.969 / 2.135 | 10 / 49.704 / 15.544 | `Carga da [ALIMENTAÇÃO BATERIA INTERNA]: [CRÍTICA]` |
| Teclado / terminal / tela | 24 / 3.351 / 1.829 | 50 / 25.049 / 4.845 | `Não foi possível exibir imagem no LCD do terminal do mesário` |
| Log corrompido | 2 / 1.918 / 947 | 4 / 843 / 418 | `Identificado arquivo de log corrompido na ME` |
| Outros (software, erro inesperado) | 36 / 1.890 / 725 | 46 / 517.053 / 499.148 | `Erro ao tentar configurar LED do MT`; na preparação, `Urna não testada` |
| Impressora | 37 / 5.803 / 588 | 69 / 15.094 / 2.242 | `Impressora atolada` |
| Contingência / RED / SA | 10 / 84 / 24 | 12 / 270 / 38 | `O operador cancelou a contingência de urna` |
| Assinatura / integridade | 19 / 81 / 11 | 33 / 445 / 204 | `Erro ao inicializar assinatura`; na preparação, MR de ativação rejeitada |
| Relógio (ADH) | 2 / 20 / 6 | — | `Aplicativo de Ajuste de Data e Hora não pode ser executado após a impressão da zerésima` |

**Aplicações iniciadas no dia 25/10 (seções):** VOTA 497.870 (praticamente todas); `VERIFICAÇÃO DE ASSINATURAS` 150; `AJUSTE DE DATA E HORA` 49; SA 29 (exterior); `RECUPERADOR DE DADOS` 16; `VERIFICAÇÃO PRÉ E PÓS` 15; ATUE (testes) 107; aplicativo do **1º turno** tentado em 4. Na preparação: `VERIFICAÇÃO DE ASSINATURAS` 5.342, `VERIFICAÇÃO PRÉ E PÓS` 3.467, RED 608, ADH 217, `SISTEMA DE AUTOTESTE` 89, `TESTE EXAUSTIVO` 7, aplicativo do 1º turno 1.625.

## Mensagens recorrentes, benignas pelo padrão

- `ERRO GAP Problema ao desmontar a MR`: em praticamente toda urna, a cada inicialização, logo antes de passar ao VOTA (doc 06). **Fato:** presente em quase todas as seções no dia e na preparação. **Hipótese (benigna):** mensagem do aplicativo, sem efeito.
- `ALERTA GAP Urna não testada`: em toda urna, na preparação do 2º turno.
- `ALERTA VOTA Identificador do eleitor digitado inválido`, `Habilitação cancelada durante reconhecimento biométrico`, `Mesário indagado se eleitor está votando`: rotina de mesa.

## Achados raros que importam para a matriz

Cada item: o que o log mostra (Fato), onde, e a leitura (Hipótese). Os casos foram conferidos no log bruto com o leitor de `seguranca-varrer-logs.mjs`.

1. **Ajuste manual do relógio (M9).** ADH iniciado no dia em 49 seções (SP 19, MG 12, RJ 7, PA 4, MT 2, outras UFs 5) e na preparação em 217. O software **recusa** o ajuste depois da zerésima (`… não pode ser executado após a impressão da zerésima`): 6 seções no dia (PA 2, RJ 2, BA 1, SP 1). Ex.: RJ 58190/0129/0008, relógio 3h15 atrasado, corrigido antes da zerésima. Ex. na preparação: RJ 60011/0162/0001, relógio posto em 25/10 08:00 em 16/10 e depois devolvido. **Leitura:** caminho humano com controle técnico (bloqueio pós-zerésima) e rastro. Detalhe em [04](04-versao-e-verificacao-de-assinatura.md).
2. **Carga no dia da votação (C3).** 61 seções com o aplicativo de carga datado de 25/10; em 55 é relógio interno errado antes da digitação (a carga foi em setembro); em 6 a carga foi mesmo no dia, 5 delas na urna que gerou o BU (MS 90514/0008/0486, MS 91650/0051/0044, PR 74918/0056/0037, PR 75833/0043/0397, SP 61816/0016/0436). Em MS 91650/0051/0044 a primeira carga do dia levou a urna ao 1º turno (`A mídia de resultado para ativação do VOTA está configurada para o 1º turno`, `Data da eleição inválida`) e foi refeita 20 minutos depois.
3. **Tentativa de rodar o Sistema de Apuração no Brasil (C5).** Recusada pelo software em 2 seções de SP: `O aplicativo Sistema de Apuração não pode ser executado em urna de contingência` (SP 61654/0014/0250, que depois usou RED) e `Tentativa de executar o Sistema de Apuração numa urna de seção não encerrada` (SP 69671/0183/0059). **Leitura:** o SA, que é apuração manual, só roda onde o software permite; a tentativa fica no log.
4. **Aplicativo `VERIFICAÇÃO DE ASSINATURAS` no dia (S6).** 150 seções, de 3 a 10 por UF, em todas as UFs. **Hipótese:** verificação por amostragem prevista em norma (a distribuição uniforme por UF sugere sorteio). [a confirmar] na resolução do TSE. O aplicativo não grava o resultado no logd.dat.
5. **Erro de assinatura na geração do resultado.** `Erro ao inicializar assinatura` (pkcs11) no encerramento em 11 seções (PE 2, RS 2, SP 2, AM, BA, DF, MG, PA); `Erro na assinatura dos arquivos de resultado` (PE 23752/0130/0091) e `Erro na assinatura do arquivo: RDV MI` (SP 64777/0278/0397). Ex.: RS 86690/0098/0007, erro às 17:02:30 ao gerar o BU, urna desligada e religada. **Recomendação (Auditor E):** conferir a assinatura do BU publicado dessas seções.
6. **Gerador de números aleatórios do processador.** MG 40290/0007/0250: `random_device: rdrand failed` derruba o VOTA em 30/09, 04/10 (3 vezes), 16/10 e 25/10; a urna é religada e vota (197 eleitores no 2º turno). **Leitura:** defeito de hardware recorrente; o software para em vez de seguir sem número aleatório.
7. **Log corrompido.** `Identificado arquivo de log corrompido na ME` em 947 seções no dia e 418 na preparação; a urna guarda o arquivo corrompido à parte (`Arquivo #ME.jez referente ao log corrompido da ME`) e continua. Em RJ 60011/0008/0061 o texto do log tem letras e níveis trocados (`ILFM`, `INDO`, aplicações `VMTA`, `TOTA`, "Aguapdando digitaçáo dm identidiaadop") e nºs de urna com dígitos trocados: corrupção de bits. Em MG 44458/0103/0221 um trecho do log é binário. **Limite (S5):** sem o algoritmo do hash de encadeamento, não dá para dizer se uma linha foi alterada ou só corrompida.
8. **Contingência fora do comum.** `O operador cancelou a contingência de urna` (24 seções), `Contingência cancelada pelo usuário por falta de mídia de resultado`, `Ocorreu uma falha na sincronização. Desligue a urna e substitua-a` (RJ 58696/0027/0139, depois RED). Contingência de MV: 32 seções no dia, 74 na preparação.
9. **Arquivos da carga inconsistentes.** `Foi detectado arquivo de processo eleitoral inconsistente na mídia` (MG 48950/0194/0266) e `Foi verificado que o arquivo de eleitores está inconsistente` (RN 17612/0001/0070), no dia; a urna para. **Recomendação:** conferir o que veio depois (troca de urna ou de mídia) nessas duas seções.
10. **Procedimento de mesa (não raro, mas ligado a M5/M6).** `Limite de mesários registrados atingido` em 4.479 seções no dia; `Título # é válido para suspender a votação` em 8.029; `Procedimento de encerramento abortado` em 5.658; `Encerramento só pode ser solicitado após as #:#:# horas` em 19.865; `Apresentada tela do reinício da votação` em 12.802. São insumos para o Auditor B (mesários) e o Auditor C (horários); aqui só se registra a frequência.

## Leitura

- **Fato:** nenhuma mensagem do catálogo mostra urna votando com software, versão ou verificação diferente do oficial (detalhe em [04](04-versao-e-verificacao-de-assinatura.md)).
- **Fato:** os caminhos humanos que o log registra (ajuste de relógio, carga no dia, troca de urna, troca de MV, RED, SA) aparecem em poucas seções, espalhados por todas as UFs, e cada um deixa rastro próprio no log.
- **Hipótese (risco, princípio 8):** cada um desses caminhos é executado por gente. Os testes mostram que eles foram usados e onde; não mostram intenção. Os casos listados são o ponto de partida para pedir ao TSE as atas e os registros de ocorrência.
- **Limite:** mensagens normalizadas podem juntar casos diferentes que só diferem por número; a amostra de seções por mensagem é de até 300 por UF.
