# 04. Versão do software, verificação de assinatura no log, relógio e votos sem rastro (2º turno)

Linhas S1, S3, S5, S6, C2 e M9 da [matriz](01-matriz-ataques.md). Pergunta: alguma urna rodou outra versão, pulou ou falhou numa etapa de "Verificação de assinatura" e mesmo assim recebeu votos? E há voto no BU sem rastro no log?

## Comandos

```
node scripts/auditoria/seguranca-varrer-logs.mjs --turno 2 --paralelo 6     # varredura (uma vez; ~2 h com 6 processos)
node scripts/auditoria/seguranca-etapas-versao.mjs --turno 2                 # versão, etapas, MV, mídia, relógio
node scripts/auditoria/seguranca-erros-assinatura.mjs --turno 2              # o que aconteceu depois de cada erro de assinatura
node scripts/auditoria/seguranca-log-x-bu.mjs --turno 2                      # votos no log × comparecimento do BU
node scripts/auditoria/seguranca-carga-no-dia.mjs --turno 2                  # carga registrada no dia: real ou relógio errado
```

Saídas em `data/parsed/auditoria/engenheiro-seguranca-urna/`: `etapas-versao-2t.{json,txt}`, `erros-assinatura-2t.{json,txt}`, `log-x-bu-2t.{json,txt}`, `carga-no-dia-2t.txt`. O banco é lido pela cópia de leitura (`abrirLeitura`, cópia de 29/10 10:50, com os dois turnos nas 28 UFs).

**Como a varredura lê o log.** Cada `logd.dat` do pacote é lido em separado (na urna de contingência, o log da urna original vem dentro do `log.jez`; doc 06). O log é dividido em boots (de `Início das operações do logd` até o próximo, ou quando a etapa [1] de verificação recomeça). "Boot de votação" = boot em que, no dia 25/10, apareceu `Urna pronta para receber votos` ou `O voto do eleitor foi computado`.

**Cobertura (Fato, 29/10/2026):** 499.207 pacotes (todas as seções com BU, 28 UFs), 512.173 logd.dat, 542.934 boots que alcançam o dia 25/10, dos quais 519.365 são boots de votação. 0 pacotes ilegíveis. Um log de MG (44458/0103/0221) tem um trecho com bytes binários no lugar do texto; essas linhas são contadas como corrompidas e puladas.

## Versão do software

- **Fato:** os 499.207 BUs trazem `10.23.0.0 - Praia da Barra do Cahy`.
- **Fato:** no log, toda linha `Versão da aplicação` de todas as aplicações (SCUE, GAP, ATUE, VOTA, VPP, ADH, SA, STE, em todo o histórico do log, da carga ao encerramento) traz a mesma versão. Nenhuma outra versão aparece.
- **Fato:** contagem de linhas `Versão da aplicação: 10.23.0.0 - Praia da Barra do Cahy` por aplicação: GAP 4.542.246, VOTA 3.397.839, ATUE 1.034.699, SCUE 512.163, VPP 8.091, ADH 705, SA 67, STE 20.
- **Fato (firmware):** `Versão do UEFI` aparece só nas urnas UE2020 (`IYEA24_P`, 205.180 logs) e UE2022 (`IYEA26_P`, 201.750). Há uma UE2022 com `IYEA24_P` e uma UE2020 com `IYEA26_P`; nos casos conferidos (SE 32417/0022/0039), o logd.dat traz linhas de duas urnas, uma de cada modelo, e o modelo atribuído é o da última linha.
- **Fato:** modelo da urna no log = modelo no `.vsc` em todos os pacotes; nº interno da urna no log = nº no BU em todos, exceto 3 pacotes RED (ES 57932/0009/0085, RJ 58696/0027/0139, SP 64777/0393/0312), em que o log principal é o da urna que rodou o RED no cartório, e não o da urna da seção.
- **Fato:** 16 logd.dat trazem linhas com mais de um nº de urna (ex.: MG 40690/0016/0264, RN 17736/0054/0135, RJ 60011/0008/0061). Em RJ 60011/0008/0061 há nºs de urna com dígitos trocados (01760983, 01560983, 01740981, 01760981) e texto com letras trocadas ("Aguapdando digitaçáo dm identidiaadop"): corrupção de bits no log gravado, sem efeito no BU.

## Etapas de verificação de assinatura

A cada boot, o GAP registra `Verificação de assinatura - Etapa [n] - [arquivo] - [SUCESSO]` para cada pacote de software e de dados: 34 etapas na maioria das UFs. A quantidade muda com o número de eleições no turno (o arquivo `o#UF-ce.vsc` aparece uma vez por eleição): 35 em PE, 33 no exterior. Por isso a comparação é com a sequência mais comum **da mesma UF e do mesmo modelo**.

- **Fato:** nos 519.365 boots de votação, o número de etapas foi 34 em 495.596, 35 em 22.408 (todos de PE) e 33 em 1.361 (1.337 do exterior e 24 de outras UFs, ver abaixo).
- **Fato:** **nenhum boot de votação ficou sem etapa de verificação registrada** e **nenhum boot de votação teve etapa com resultado diferente de `[SUCESSO]`**.
- **Fato:** só 26 boots de votação têm sequência diferente da mais comum da sua UF e modelo. Em todos falta a mesma etapa, `/dsk/fe/estatico/#-lo.vsc` (arquivo da seção na mídia de votação), e todos são de urnas que acabaram de fazer **contingência de MV** (`Início do procedimento de contingência de MV` … `Serial da MV nova registrada na MI` … `Contingência de MV executada com sucesso`): a MV foi trocada por outra e a urna copiou os diretórios da MI para a MV nova logo depois da verificação. Votos nesses boots: 3.320. Ex.: BA 34134/0171/0236, MV original `5E502861`, MV presente `05458FD9`, contingência às 08:36, zerésima às 08:39.
- **Fato:** 248 boots **sem votação** têm sequência incompleta: a verificação parou numa etapa com `[ERRO]` (ou a urna foi desligada no meio) e a urna não abriu a votação naquele boot.

## Erros de verificação: a urna "falha fechada"?

Para cada seção com mensagem de ERRO/WHAT (ou etapa `[ERRO]`) sobre assinatura ou integridade, o script abre o log bruto e olha o que veio depois: carga nova (SCUE), MR trocada, se a mesma urna recebeu voto e se o boot em que ela abriu a votação teve todas as etapas esperadas com `[SUCESSO]`.

- **Fato:** 841 seções com erro de assinatura ou integridade no log (1.569 linhas); 328 delas com o erro a partir de 05/10 e 41 com o erro no dia 25/10.
- **Fato:** em 746 seções a mesma urna recebeu votos no dia depois do erro, sem carga nova. **Em todas, o boot que abriu a votação registrou todas as etapas esperadas com `[SUCESSO]`.** Nenhuma urna votou num boot com etapa de verificação falhada ou incompleta. A exceção de desenho é o estado dinâmico (`.vsu`, 52 seções): aí o erro não é uma etapa, a urna restaura o arquivo da cópia na outra mídia e segue no mesmo boot (tabela abaixo).

| Arquivo que falhou (classe) | Período | Seções | Urna votou depois sem carga nova | Como se resolveu |
|---|---|---|---|---|
| MR de ativação do 2º turno (`turno#.jez em /dsk/mr/turno#.vsc`) | desde 05/10 | 207 | 203 | MR trocada em 170; a mesma MR aceita num boot posterior em 33 |
| MV (`infomidia.vsc`, `#-lo.vsc` em `/dsk/fe`) | antes de 05/10 | 373 | 337 | verificação completa num boot posterior (MV reinserida ou trocada na preparação) |
| MV | desde 05/10 | 23 | 19 | idem |
| Software na mídia interna (`avusrbin.vst`, `avboot.vst`, `avusrlib.vst`, `avsharerhvoice…vst`…) | antes de 05/10 | 31 | 19 | verificação completa num boot posterior |
| Software na mídia interna | desde 05/10 | 20 | 17 | idem |
| Estado dinâmico (`vota.vsu`, `eg.vsu`, `uenux.vsu`, `ze.vsu`, `bu.vsu`, `rdv.vsu`) | antes / desde 05/10 | 33 / 19 | 31 / 16 | a urna restaura o arquivo da cópia na outra mídia (`Início da sincronização dos arquivos dinâmicos` … `Origem … na MI` … `concluída com sucesso`) e segue |
| Mensagem sem o nome do arquivo (`Validando assinaturas … Erro na verificação de integridade do sistema`) | antes / desde 05/10 | 71 / 54 | 63 / 36 | verificação completa num boot posterior |
| Dados de candidatos / dados na mídia interna | todos | 16 | 11 | idem |

- **Hipótese (benigna):** falha de leitura de mídia (há `Input/output error`, `Mídia externa ausente` e erros de MR por perto em parte dos casos). O padrão "erro → urna para → boot seguinte verifica tudo e segue" é o esperado de falha de hardware ou de mídia mal encaixada.
- **Hipótese (risco, princípio 8):** a verificação que falhou numa etapa de **software** e passou num boot seguinte, sem carga nova (34 seções, ex.: RS 85111/0124/0078, `avsharerhvoice24khz.vst` com `[ERRO]` às 07:57 de 25/10, 34 etapas com `[SUCESSO]` às 08:03 e 19 votos depois), não distingue "erro de leitura" de "arquivo trocado e depois destrocado". O rastro técnico é só a etapa `[ERRO]` seguida de `[SUCESSO]`. O mesmo vale para o estado dinâmico restaurado da outra mídia: a urna confia na cópia que passou na verificação.
- **Fato (controle positivo):** RR 03018/0005/0228, 25/09: `Etapa [26] - [/dsk/fe/estatico/infomidia.vsc] - [ERRO]` → `Erro na verificação de integridade do sistema. Desligue a urna e faça uma nova carga.` → a urna para. A verificação recusa de fato um arquivo que não confere.

## MV trocada e verificação da mídia externa

- **Fato:** 26 boots de votação, em 26 seções, com contingência de MV no próprio boot (acima). Pelo catálogo, `Início do procedimento de contingência de MV` aparece em 32 seções no dia e em 74 na preparação. **Recomendação (para a frente de integridade, H11):** nessas seções o `numeroSerieFV` do BU deve ser o da MV nova, não o da MV original registrada na MI.
- **Fato:** `Resultado da verificação da mídia externa estática : 1` (em vez de 0) em 252 boots de votação, e `dinâmica : 1` em 1. Todos esses boots verificaram todas as etapas com `[SUCESSO]` e votaram normalmente. Nos casos olhados (BA 30872/0186/0029, AP 06157/0006/0241, AC 01392/0009/0040), o boot anterior terminou de forma anormal (falha do aplicativo ou execução do aplicativo `VERIFICAÇÃO DE ASSINATURAS`). **Hipótese:** o valor 1 sinaliza que a mídia não foi desmontada corretamente no boot anterior. [a confirmar] com a especificação do TSE.

## Relógio da urna

- **Fato:** a hora da urna é **digitada por gente**: na carga (`SCUE … Data e hora que foi digitada pelo operador`) e no aplicativo de ajuste (`ADH … Ajuste de Data e Hora … foi digitada pelo operador`). Antes da digitação, o relógio interno pode estar em outro mês ou ano. `node scripts/auditoria/seguranca-carga-no-dia.mjs`: das 61 seções com linhas do aplicativo de carga datadas de 25/10, em 55 a hora digitada foi de 22 a 26/09 (40 delas em 25/09: relógio interno um mês adiantado; ex.: SP 66079/0063/0011, `25/10/2026 08:32:57 SCUE Iniciando aplicação` e logo depois `Data e hora que foi digitada pelo operador: 25/09/2026 - 08:32:00`).
- **Fato (carga no dia da votação):** em 6 seções houve carga de verdade em 25/10 (hora digitada em 25/10). Em 5, a urna carregada no dia é a do BU, como urna **da seção** (não como reserva), e a votação abriu atrasada: MS 90514/0008/0486 (carga 06:55, abertura 07:26), MS 91650/0051/0044 (duas cargas, 07:16 e 07:36; a primeira tentou rodar o aplicativo do **1º turno**; abertura 08:13), PR 74918/0056/0037 (duas cargas, 09:09 e 09:20; abertura 10:02), PR 75833/0043/0397 (carga 10:04, abertura 10:51, 38 votos) e SP 61816/0016/0436 (carga 07:58, abertura 08:32). Na sexta, BA 35653/0173/0235, a urna original foi recarregada às 09:06, depois de ter aberto a votação às 08:48; é uma das seções com votos sem log (abaixo). **Hipótese (risco, princípio 8):** carga no dia é feita por técnico ou servidor, fora da vista da mesa; o controle técnico é a verificação das assinaturas da carga, que o log registra com `[SUCESSO]`. **Fato:** nenhum boot de votação rodou com `Turno da UE` diferente de 2º turno, fase diferente de Oficial ou modo de carga diferente de Votação.
- **Fato:** o aplicativo de ajuste de data e hora (ADH) foi iniciado no dia da votação em 49 seções (SP 19, MG 12, RJ 7, PA 4, MT 2, outras 5) e na preparação em 217. **O software bloqueia o ajuste depois da zerésima:** `Aplicativo de Ajuste de Data e Hora não pode ser executado após a impressão da zerésima` em 6 seções no dia (PA 2, RJ 2, BA 1, SP 1) e 13 antes de 05/10. Controle técnico, com rastro.
- **Fato (exemplo do dia):** RJ 58190/0129/0008: o relógio marcava 05:17 e o operador digitou 08:32 (diferença de 3h15) antes da zerésima; a votação abriu às 08:39.
- **Fato (exemplo da preparação):** RJ 60011/0162/0001, em 16/10: o operador pôs o relógio em 25/10/2026 08:00, a urna gravou linhas datadas de 25/10 (08:00–08:05), e depois o relógio voltou para 16/10 14:55. **Consequência:** uma linha datada de 25/10 no log não prova que foi escrita em 25/10. As análises de horário (Auditor C) devem descartar trechos entre um ADH e o ADH seguinte.
- **Fato:** 279.802 retrocessos de relógio (linha com hora anterior à maior já vista) em 278.297 logs; quase todos logo depois de `Data e hora atualizada` ou de hora digitada na carga. Sem mensagem de ajuste por perto, no período do 2º turno: 262, **todos no exterior** (224 na preparação, 37 no dia, 1 depois), em geral de 30 a 60 minutos depois de religar. Fora do ano de 2026: 33 (relógio zerado em 1970, 2000, 2009, 2024 em BA, PR, RJ, RO, SP e ZZ). **Hipótese (exterior):** ajuste automático de fuso ou de horário de verão do país; o horário de verão europeu terminou exatamente em 25/10/2026. Encaminhado ao Auditor C ([linha-do-tempo](../linha-do-tempo/01-fuso-horario.md)).

## Votos no log × comparecimento do BU

`node scripts/auditoria/seguranca-log-x-bu.mjs`: compara `votos_computados` do perfil de log (todos os logd.dat do pacote) com o comparecimento do BU, em 499.178 seções com BU e log (SA de fora).

- **Fato:** 9 seções divergem. 3 têm **mais** votos no log do que no BU, todas explicadas por log repetido dentro do pacote; 6 têm **menos** votos no log do que no BU: **54 votos no BU sem a linha `O voto do eleitor foi computado` em nenhum log publicado**.

| Seção | Tipo | BU | Log | Leitura |
|---|---|---|---|---|
| ES 57932/0009/0085 | RED | 308 | 612 | O pacote traz também o log da urna da seção 0112 (304 votos): a mesma urna reserva (01758779) rodou o RED das duas seções no cartório. Votos da urna desta seção: 308 = BU |
| BA 39870/0133/0184 | reserva | 228 | 413 | Log da urna original repetido (185 + 185) + reserva 43. Sem repetição: 228 = BU |
| MG 40690/0016/0264 | reserva | 114 | 160 | Um logd.dat contém o outro (46 votos aparecem duas vezes). Sem repetição: 46 + 68 = 114 = BU |
| MA 08893/0047/0609 | reserva | 224 | 188 | **36 votos sem log.** O pacote traz o log da urna 01813459 (2 boots no dia, recusou a MV: "Dados contidos na mídia de votação não correspondem") e da reserva 01664037 (188 votos). O histórico de carga do BU lista a urna do 1º turno (1663580) e a reserva: os 36 votos foram dados na urna 1663580, cujo log não está no pacote |
| BA 35653/0173/0235 | reserva | 217 | 204 | **13 votos sem log.** A votação abriu às 08:48 (BU); o log da urna original (01833178) tem boots até 07:48 e de novo a partir de 09:04, quando ela recebeu **carga nova** (09:06); nada entre 07:48 e 09:04. A reserva (01656557) registrou 204. Histórico de carga do BU com 3 códigos |
| RS 89060/0017/0191 | reserva | 92 | 90 | **2 votos sem log.** A original parou de registrar às 09:02 (último voto) e só voltou a ligar às 09:38; o estado da MV tinha 17 votos e o log 15 |
| BA 34711/0021/0178 | seção | 234 | 233 | **1 voto sem log.** `Carga da [ALIMENTAÇÃO BATERIA INTERNA]: [CRÍTICA]` às 08:48, último `Voto confirmado para [Presidente]` às 08:49:04 sem `computado`, urna religada às 09:03 e o primeiro evento é `O eleitor identificado já votou` (09:07) |
| PB 21750/0002/0254 | seção | 304 | 303 | **1 voto sem log.** Bateria crítica e 3 reinícios entre 12:36 e 12:58 |
| PI 11533/0003/0216 | seção | 259 | 258 | **1 voto sem log.** 6 boots com votos no dia (desligada pela chave às 08:15 e outras) |

- **Hipótese (benigna):** queda de energia ou travamento entre a gravação do voto (estado na MV e na MI) e a gravação da linha no log; e, nas contingências em cadeia (MA, BA 35653), o pacote só leva o log que estava na mídia externa, e o log da urna que votou antes se perde (em BA 35653, a carga nova formata a mídia interna da urna original). O `já votou` logo depois do reinício em BA 34711 é o que se espera se o eleitor que estava votando tentou de novo.
- **Hipótese (risco, princípio 8):** 54 votos em 6 seções não têm rastro de habilitação nem de "voto computado" no log público. O BU e o RDV são assinados pela urna, mas o log é o único registro de **como** cada eleitor foi habilitado (biometria ou não). Nessas seções o caminho de habilitação desses votos é desconhecido.
- **Fato:** no histórico de carga do BU (`historicoCodigosCarga`) das 5.714 seções com urna reserva: 2 entradas em 5.495, 3 em 205, 4 em 11, 5 em 1 (e 1 em 2). Em 8 seções há mais urnas no histórico do que urnas com log no pacote (BA 33332/0143/0152, BA 35653/0173/0235, BA 39870/0133/0184, ES 56251/0034/0976, MG 40827/0012/0072, MT 98930/0043/0264, PA 04855/0031/0087, RS 89036/0083/0044). O caso MA 08893/0047/0609 não entra nessa conta porque o nº de urnas coincide, mas uma delas (01813459) não está no histórico e outra (1663580) não tem log.
- **Recomendação:** pedir ao TSE, para essas 6 seções, o log das urnas que gravaram a MV e não estão no pacote (nº interno pelo histórico de carga), e as atas de seção.

## Limites

- **O log é escrito pelo próprio software que ele descreve.** Um software adulterado pode registrar "SUCESSO" em todas as etapas e a versão oficial. Estes testes pegam adulteração parcial, descuidada ou falha de hardware, não um ataque que controle o software inteiro (S2 da matriz). A garantia contra isso está fora dos arquivos públicos: código-fonte, cerimônia de lacração, hash do binário.
- O resultado do aplicativo `VERIFICAÇÃO DE ASSINATURAS` (executado sob demanda) não vai para o `logd.dat`: só o início e o fim.
- O hash de encadeamento do log (6ª coluna) não pôde ser conferido: o algoritmo não é público.
- A hora do log vem do relógio da urna, que é **digitado por gente** na carga (`Data e hora que foi digitada pelo operador`) e pode ser mudado pelo aplicativo ADH até a zerésima.
