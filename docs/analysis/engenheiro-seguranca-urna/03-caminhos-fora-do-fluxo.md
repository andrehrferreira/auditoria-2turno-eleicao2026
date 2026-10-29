# 03. Caminhos fora do fluxo normal: urna reserva, RED e Sistema de Apuração (2º turno)

Linhas C1, C3, C4, C5 e C7 da [matriz](01-matriz-ataques.md). Pergunta: quantas seções saíram do fluxo "uma urna, do começo ao fim", onde estão e se há concentração.

**Comando:** `node scripts/auditoria/seguranca-caminhos-fora-fluxo.mjs --turno 2` (saída em `data/parsed/auditoria/engenheiro-seguranca-urna/caminhos-fora-fluxo-2t.txt`). Lê a cópia de leitura do banco (`abrirLeitura`) e, para o SA e o histórico de carga, decodifica o BU. A parte "pelos logs" usa a varredura `seguranca-varrer-logs.mjs`.

## Contagem (Fato, 2º turno, 499.207 seções com BU)

| Caminho | `tipoUrna` / `tipoArquivo` no BU | Seções | Onde |
|---|---|---|---|
| Urna da seção, fluxo normal | `secao` / `votacaoUE` | 493.450 | — |
| Urna reserva (contingência) | `reservaSecao` (4) / `votacaoUE` | 5.712 | todas as UFs |
| Urna reserva + RED | `reservaEncerrandoSecao` (6) / `votacaoRED` | 2 | ES 57932/0009/0112, SP 61654/0014/0250 |
| RED na urna da seção | `secao` / `votacaoRED` | 14 | ES 3, MG 4, SP 2, MA, PA, RJ, RS, SC, ZZ 1 cada |
| Sistema de Apuração, apuração manual | `contingencia` (3) / `saManual` | 29 | todas no exterior (ZZ) |
| Seção sem arquivo (aux: "Nao instalada") | — | 41 | todas no exterior (ZZ) |

- **Fato:** o `tipoUrna` 6 (`reservaEncerrandoSecao`) só aparece junto com RED.
- **Fato:** nenhuma seção do Brasil usou o Sistema de Apuração. Os 29 SA são do exterior, todos com motivo `apuracaoTotalmenteManual / outros`.

## Urna reserva

### Taxa por UF

Nacional: 5.714 de 499.207 seções (1,145%). Por UF, de 2,5 por mil (TO) a 22,6 por mil (SE) e 32,1 por mil (ZZ). A tabela completa, com o z de Poisson contra a taxa nacional, está na saída do script.

**Fato (1º × 2º turno, as 28 UFs, cópia do banco de 29/10 10:50):** no 1º turno houve 3.033 seções com urna reserva (6,1 por mil); no 2º, 5.714 (11,4 por mil). A diferença está no próprio banco: 2.893 seções do 2º turno usam **a mesma urna reserva do 1º turno** (mesmo nº interno). A urna que substituiu a original no 1º turno continuou na seção. Trocas novas no 2º turno (reserva com nº de urna diferente do 1º turno): 2.733 + 83 + 2 = 2.818 (5,6 por mil), na mesma ordem da taxa do 1º turno.

Outras combinações entre turnos:

| 1º turno | 2º turno | Mesma urna? | Seções | Leitura |
|---|---|---|---|---|
| seção | seção | não | 1.562 | Urna trocada entre os turnos **sem** procedimento de contingência (outra urna carregada para a seção). Caminho humano sem rastro de contingência no BU; o rastro é o nº interno diferente e a `dataHoraCarga` (2.245 urnas do 2º turno com carga depois de 05/10, 709 delas em 24/10) |
| reserva | seção | não / sim | 44 / 13 | Seção voltou a ter urna de seção |
| seção | reserva | sim | 3 | BA 33332/0143/0152, ES 56251/0034/0976, MG 48917/0192/0003: mesma urna nos dois turnos, mas recarregada como reserva entre os turnos (`dataHoraCarga` 22/10, 15/10 e 21/10) |
| SA (contingência) | SA / seção | — | 29 / 2 | Exterior |

**Fato:** 5 seções votaram numa urna **de seção** carregada no próprio dia 25/10 (MS 90514/0008/0486, MS 91650/0051/0044, PR 74918/0056/0037, PR 75833/0043/0397, SP 61816/0016/0436), com abertura entre 07:26 e 10:51. Detalhe e caso BA 35653/0173/0235 em [04](04-versao-e-verificacao-de-assinatura.md), "Relógio da urna".

### Concentração por zona

- **Fato:** 6.252 zonas (município × zona) testadas contra a taxa da própria UF (Poisson, correção de Bonferroni). 12 ficam abaixo de 0,05 contando todas as reservas; 7 contando só as trocas novas do 2º turno (6.292 zonas com os dois turnos).
- Zonas mais extremas, trocas novas no 2º turno: GO Trindade (96253/0049) 17 novas + 11 herdadas do 1º turno em 304 seções, esperado 2,0; ES Serra (56995/0026) 15 + 6; BA Candeias (34290/0127) 11 + 3; MA Paço do Lumiar (08494/0093) 13 + 11; MA São José de Ribamar (08893/0047) 15 + 11; RJ Rio de Janeiro (60011/0162) 13 + 5; BA 38946/0178 5 + 1 em 38 seções. SE Aracaju (31054/0001 e 0002) tem 21 trocas novas em cada zona, sem passar no Bonferroni.
- **Fato:** em GO 96253/0049, as 28 urnas reserva são UE2013, carregadas em 27/09, e a urna original no 1º turno também era UE2013.
- **Hipótese (benigna):** zonas com parque de urnas antigas falham mais; a zona com muitas falhas no 1º turno continua com muitas no 2º. Teste: taxa de troca pelo modelo da urna **original** (abaixo).
- **Hipótese (risco, princípio 8):** a troca é decidida e executada por gente (mesário, técnico, cartório). Uma zona com trocas em excesso é onde esse caminho foi mais usado. O que limita o risco é técnico: a reserva só vota depois de copiar o estado da MV da seção (`Início do procedimento de contingência`, `Sincronismo de mídia`), e o BU traz o histórico de códigos de carga de cada urna que gravou a MV.

### Voto nas seções com reserva

**Fato:** a parcela do 13 nos votos nominais de presidente das seções com urna reserva difere da das demais seções da mesma zona em −0,12 ponto percentual (média ponderada, 2.378 zonas, 1.436.985 votos). Não há sinal de que a troca de urna se concentre onde um lado vai melhor.

### Pelos logs (5.714 de 5.714 seções com reserva)

- **Fato:** todas as 5.714 trazem, dentro do pacote, o log de pelo menos uma urna anterior. A reserva registra `Log interno da urna de contingência validado com sucesso`, `Início do procedimento de contingência` e o `Sincronismo de mídia` etapa por etapa antes de votar (2.004 e 1.970 seções no dia, respectivamente).
- **Fato:** taxa de troca pelo modelo da urna **original** (log da urna substituída; denominador aproximado = seções com o modelo no BU): UE2013 8,7%, UE2015 2,2%, UE2020 1,1%, UE2022 0,6%. A urna mais velha é trocada com 15 vezes mais frequência que a mais nova. Isso sustenta a explicação benigna da concentração em zonas com parque antigo (GO 96253/0049 é toda UE2013).
- **Fato:** mediana da parcela de votos dados na reserva = 100%: em 4.287 seções a urna original não registrou voto no dia 25/10 (troca antes da abertura ou reserva herdada do 1º turno).
- **Fato:** votos no log da original + no log da reserva ≠ comparecimento do BU em 5 seções (BA 35653/0173/0235, BA 39870/0133/0184, MA 08893/0047/0609, MG 40690/0016/0264, RS 89060/0017/0191). Duas são log repetido no pacote; três (MA 36, BA 13, RS 2 votos) são votos no BU sem linha de voto computado no log publicado. Análise completa em [04](04-versao-e-verificacao-de-assinatura.md), "Votos no log × BU".
- **Fato:** o BU da reserva lista o código de carga de cada urna que gravou a MV (`historicoCodigosCarga`): 2 urnas em 5.495 seções, 3 em 205, 4 em 11, 5 em 1. Contingência em cadeia (3 ou mais urnas) em 217 seções.

## RED (recuperação de dados)

**Fato:** 16 seções. O RED é uma aplicação da **própria urna** (`RED` no log): no caso de ES 56170/0023/0137, às 18:43 do dia 25/10 ela detectou "Urna encerrada porém, com arquivos de resultado faltantes ou não íntegros", fez backup, regenerou BU, RDV e demais arquivos a partir do estado interno e gravou o log. O BU sai assinado pela mesma urna. A assinatura dos 16 é conferida pela frente de integridade ([integridade-nacional](../integridade-nacional/01-metodo.md)).

**Fato:** em ES 57932/0009/0085 (RED), o perfil do log soma 612 votos para um BU de 308: o pacote traz 3 logd.dat e o log da urna aparece repetido. Ver [04](04-versao-e-verificacao-de-assinatura.md), seção "Votos no log × BU".

**Limite:** quem roda o RED é o cartório. O RED lê o estado gravado pela urna; o rastro é o log do RED e a assinatura. Não há como saber, pelos arquivos, se houve tentativa anterior descartada.

## Sistema de Apuração (exterior)

**Fato:** 29 seções, todas no exterior, `apuracaoTotalmenteManual` com motivo `outros`. Soma de aptos 2.054; soma do comparecimento por cargo 831 votos; 2 delas com comparecimento 0 (ZZ 29564/0001/0091 e 30686/0001/0443). BUs gerados entre 17:11 e 19:17 do dia 25/10.

**Fato (limitação do banco):** no BU do SA o campo `qtdEleitoresCompareceram` vem 0, e o comparecimento real está em `qtdComparecimento` por cargo. A coluna `secao.comparecimento` do banco mostra 0 nessas 29 seções.

**Limite (princípio 8):** a apuração manual é 100% humana: a junta conta as cédulas e digita. Nenhum controle técnico liga a cédula ao número digitado. O que dá para medir é a exposição: 831 votos de presidente no país, 0,0007% do total.

## Seções não instaladas

**Fato:** 41, todas no exterior (aux "Nao instalada"). Os arquivos não dizem por quê. **Recomendação:** cruzar com o comparecimento dessas seções no 1º turno e com atos do TSE sobre seções no exterior.

## Explicações benignas e linha de base

- Linha de base da troca de urna: o 1º turno da mesma seção (feito acima, 22 UFs) e o modelo da urna original.
- Benignas: urna velha (UE2013) falha mais; falta de energia; bateria; leitor biométrico; impressora. O catálogo de mensagens ([02](02-catalogo-mensagens-raras.md)) mostra erros de hardware antes das trocas.
- Anomalia estatística não é prova: uma zona com 17 trocas a mais do que o esperado é um lugar para pedir os registros de ocorrência da zona eleitoral, não um achado de fraude.

## Pendências

- Varredura de log do 1º turno (mesmos scripts com `--turno 1`) para comparar o catálogo e as trocas com a linha de base.
- **Recomendação:** pedir ao TSE as atas de seção e os registros de substituição de urna das 7 zonas com excesso de trocas novas, e as atas das 5 seções com carga no dia da votação.
