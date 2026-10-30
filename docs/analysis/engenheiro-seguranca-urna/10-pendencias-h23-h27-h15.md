# 10. Pendências das revisões de 30/10: carga sem a linha final (H23), as 2 urnas da BA zona 71 (H27) e 2 seções da fila H15/H07

Perfil `engenheiro-seguranca-urna`, 30/10/2026. Cópia de leitura do banco de 29/10 10:50 UTC (os dois turnos, 28 UFs). Continua o [doc 08 do matemático](../matematico-forense/08-h23-recarga-e-carga-fora-da-cerimonia.md) (pendência "64 diários sem a linha final"), o [doc 09](09-h27-pacote-substituido-e-secoes-fantasmas.md) e o [parecer 38](../cetico-revisor/38-h27-pacote-substituido.md) (grupo D), o [doc 09 do matemático](../matematico-forense/09-h24-transito-e-atributos.md) e o [parecer 39](../cetico-revisor/39-h23-h24-t11.md) (fila H15/H07).

Nenhum CPF nem número de título aparece aqui nem nas saídas. Os mesários são chamados de M1, M2… dentro de cada seção.

## Resposta curta

1. **Fato: a carga sem a linha "Urna carregada com sucesso" é a urna desligada pela chave no fim da carga, não carga incompleta.** Universo completo, os dois turnos.
   - 2º turno: **64** cargas de BU em 499.207. 1º turno: **63** em 499.207. As 63 do 1º turno são as mesmas seção e urna do 2º (a carga de setembro serviu aos dois turnos). A 64ª (PR 74691/0025/0026) é uma reserva carregada em 25/09 que só gerou BU no 2º turno.
   - Causa, 2º turno (1º turno entre parênteses):
     - **59 (58)**: o operador desligou a urna pela chave entre a impressão do extrato de carga e a confirmação dele. O programa grava assim mesmo o código de carga e as assinaturas, fecha o diário e não escreve "Urna carregada com sucesso", "Finalização de aplicativo" e "Desligando a urna".
     - **5 (5)**: o diário termina no meio das linhas finais da carga, sem a linha do desligamento e sem "Fechando o arquivo de Log". A próxima linha é a urna ligando de novo, 1 a 7 min depois. As 5 são UE2015.
     - **0**: diário cortado, carga refeita com o mesmo código ou versão de programa diferente. As 64 rodam a mesma versão 10.23.0.0 de todo o país.
   - Em todas, a urna ligou depois e verificou as assinaturas com sucesso. Há **0** "verificação de assinatura" sem sucesso nos diários desses pacotes, nos dois turnos.
   - **Fato (padrão de modelo):** os modelos antigos aparecem mais do que a frota explica. São 24 de 64 UE2013 + UE2015, contra 12,8 esperados (20,0% da frota que gerou BU), com cauda binomial p = 0,0009. No 1º turno são 23 de 63, p = 0,0018. A versão do programa é uma só.
   - **Fato (votos):** não destoam. São 18 testes: comparecimento, parcela do 13 e brancos + nulos; variação entre os turnos × zona e nível de cada turno × local de votação; os dois turnos. O menor p é 0,045, e o limiar corrigido é 0,0028.
2. **Fato: as urnas 01843885 (BA 33774/0071/0150) e 01844077 (BA 39144/0071/0170) só aparecem no CEFT do 2º turno.** Foram lidas 222 listas e 4.142.470 linhas: CEFT de 2022 e 2024 (1º turno) e CESP da véspera, CESP do dia e CEFT dos dois turnos de 2026, todas as UFs.
   - Não estão em nenhum BU nem pacote do 1º turno. Os diários delas começam em 21/10, na carga.
   - São UE2015, dentro da faixa pública do modelo. O certificado da AC URNA de cada uma confere com a chave da AC:
     - 01843885: série `34b024`, emitido em **31/08/2026**, vence em 31/12/2037. É um dos 54 "tardios" do doc 07/08;
     - 01844077: série `3454d5`, emitido em 18/05/2017, vence em 25/01/2031.
   - As duas foram carregadas em 21/10 com a **mesma mídia de carga do 1º turno**: o mesmo identificador, gerado em 17/09 no computador do cartório da zona 71. Foram ligadas para conferência em 21/10 e 22/10 e votaram em 25/10, das 08:00 às 17:0x.
   - As urnas do 1º turno (01780000 e 01771106) estão nos CEFT de 2022 e 2024 em outras seções da BA e em todas as listas de 2026 até o CEFT do 2º turno, como "esperada". Não aparecem em nenhum dado do 2º turno.
   - Os arquivos não explicam por que as urnas foram trocadas, por que a correspondência da carga de 21/10 não chegou ao TSE antes do dia e de onde vieram as urnas. Isso vai para o pedido ao TSE.
3. **Fato: nas duas seções da fila, o diário mostra o leitor de digitais falhando para quase todos os eleitores, com 4 capturas reais por eleitor, e não o mesário pulando a digital.**
   - **PR 79294/0019/0055**, mesma urna UE2013 (01660647) e mesma carga nos dois turnos:
     - liberação manual em 223 de 227 votos no 1º turno e em 225 de 227 no 2º;
     - **todas** as liberações manuais vêm depois de 4 capturas de digital sem reconhecimento;
     - no 1º turno, a digital do mesário confere nessa mesma urna (204 de 763 comparações acima de 50; M1 liberou 195);
     - no 2º turno, nem a digital do mesário confere (2 de 2.183 acima de 50), e 216 liberações ficam sem mesário identificado;
     - as vizinhas do mesmo local, com a mesma carga de software e o mesmo modelo, liberaram 7,5% a 18,2%.
   - **AL 28819/0045/0174, 1º turno:**
     - a urna da seção (01670138) teve 99 de 117 votos por digital;
     - ela travou às 11:24 no pedido de digital e, depois, gravou 2 ERRO do leitor: 12:27, "Falha na captura da digital… Desligue e ligue a urna. Se o erro persistir, substitua a urna", e 13:00, "Error ao encerrar captura";
     - às 13:28 foi trocada pela reserva 01675293, que liberou **99 de 106** votos sem digital, todos depois de 4 capturas.
     - No 2º turno, com outra reserva (01669231, posta no lugar em 18/10), foram 6,7%.
   - Nas duas seções:
     - 0 "já votou";
     - nenhum intervalo de 30 s ou menos entre votos;
     - a liberação sem digital fica espalhada por todas as horas da falha, sem se concentrar no fim do dia;
     - comparecimento e parcela do 13 dentro da faixa das vizinhas e iguais nos dois turnos.

## 1. Carga sem a linha final "Urna carregada com sucesso" (H23)

### Regra declarada antes de olhar os votos

| Etapa | Definição |
|---|---|
| Universo | Toda carga que gerou BU, nos dois turnos: 499.207 por turno, pelo código de carga do BU |
| Linha final | Situação da carga no catálogo de **todos** os 512.173 diários do 2º turno (o diário é cumulativo: a carga de setembro aparece no diário do 2º turno com as mesmas linhas) |
| Releitura no bruto | 2º turno: as 64 sem a linha final. 1º turno: as 1.619 cargas de BU que não estão no catálogo do 2º turno (urna que não voltou ou carga refeita) mais as 63 que estão no catálogo sem a linha final, todas no pacote do 1º turno. 0 falha de leitura, 0 código não achado |
| Trecho da carga | De "SCUE Iniciando aplicação" até "Fechando o arquivo de Log" ou até o próximo "Início das operações do logd" |
| Causa (ordem) | A. "INITJE Urna desligada pela chave" dentro do trecho; B. mesmo código gravado 2+ vezes (carga retomada); C. diário termina no trecho (cortado); D. sem "Fechando o arquivo de Log" e a próxima linha é um novo início do diário (fechamento abrupto); E. outra |
| Votos | Seções marcadas × as demais da mesma zona (variação 1º → 2º turno) e do mesmo local (nível de cada turno); permutação de 2.000 sorteios dentro do grupo (`matematico-h23-lib.mjs`); 18 testes, limiar 0,05/18 = 0,0028; fora as 2 seções de MG que votaram em cédula no 1º turno |

### Universo (Fato)

| | 1º turno | 2º turno |
|---|---:|---:|
| Cargas de BU | 499.207 | 499.207 |
| Conferidas pela cópia no diário do 2º turno | 497.588 | 499.207 |
| Relidas no pacote do próprio turno | 1.682 (1.619 fora do catálogo: 0 sem a linha; 63 sem a linha no catálogo: 63 confirmadas) | 64 |
| **Sem a linha final** | **63** | **64** |
| A. desligada pela chave antes do fim | 58 | 59 |
| D. fechamento abrupto | 5 | 5 |
| B, C, E | 0 | 0 |
| Versão do programa de carga | 10.23.0.0 (63) | 10.23.0.0 (64) |
| Mesma seção e urna no outro turno | 63 | 63 |

### O mecanismo, no bruto (Fato)

Carga normal (AC 01031/0003/0058): "Fim de impressão" → "Confirmação do extrato de carga" → código de carga gravado → 6 linhas "Identificação de assinatura do arquivo" → **"Urna carregada com sucesso" → "Finalização de aplicativo" → "Desligando a urna"** → "Fechando o arquivo de Log". Tudo em 1 a 2 segundos.

Caso A (AM 02550/0001/0706, 30/09):

```
14:47:25 SCUE   Fim de impressão
14:47:42 INITJE Urna desligada pela chave
14:47:45 SCUE   Confirmação do extrato de carga
14:47:45 SCUE   Código de carga … gravado na tabela de correspondência
14:47:45-48 SCUE Identificação de assinatura do arquivo … (6 linhas)
14:47:51 LOGD   Fechando o arquivo de Log
14:56:31 LOGD   Início das operações do logd  (urna ligada de novo, abre o aplicativo da seção normalmente)
```

- Nos 59 casos A do 2º turno, a chave é girada de 6 s antes a 236 s depois do fim da impressão (mediana 27 s). A confirmação do extrato vem logo depois da chave (mediana 4 s; de −16 a +8 s).
- Em 55 dos 59 estão as 6 linhas de assinatura; nos outros 4 há 4 ou 5.
- Nos 5 casos D (MG 49034/0298/0217, PR 77496/0072/0189, RJ 58467/0150/0119, SC 81477/0015/0207, SP 71072/0004/0247, todos UE2015), o diário para numa das linhas de assinatura (4, 5 ou 6 de 6). Não há linha de desligamento nem de fechamento, e a urna liga de novo 65 a 395 s depois.
- **Hipótese:** é o mesmo desligamento pela chave, numa UE2015 que perde as últimas linhas por não gravar o diário a tempo.

### Os 64 do 2º turno (zona, modelo, data)

Modelo e data vêm do próprio trecho de carga (data digitada pelo operador). Causa como na regra. "1º turno" = a mesma seção votou no 1º turno com a mesma urna e a mesma carga.

| Seção | Urna | Modelo | Carga (digitada) | Causa | Chave | Assinaturas | 1º turno |
|---|---|---|---|---|---|---|---|
| AM 02550/0001/0706 | 01771887 | UE2015 | 30/09/2026 14:45 | A | 14:47:42 | 6 de 6 | sim |
| AM 02550/0059/0513 | 01843270 | UE2015 | 24/09/2026 08:50 | A | 08:52:40 | 6 de 6 | sim |
| BA 33316/0082/0188 | 02308962 | UE2022 | 24/09/2026 10:42 | A | 10:42:47 | 6 de 6 | sim |
| CE 13188/0078/0209 | 02276863 | UE2022 | 29/09/2026 11:06 | A | 11:07:36 | 6 de 6 | sim |
| CE 15857/0104/0329 | 02451627 | UE2022 | 24/09/2026 11:15 | A | 11:16:35 | 6 de 6 | sim |
| CE 15873/0089/0114 | 02234333 | UE2020 | 28/09/2026 09:48 | A | 09:49:15 | 6 de 6 | sim |
| DF 97012/0006/0341 | 02453229 | UE2022 | 28/09/2026 09:49 | A | 09:50:40 | 6 de 6 | sim |
| GO 95613/0029/0118 | 01832205 | UE2015 | 28/09/2026 17:10 | A | 17:18:40 | 6 de 6 | sim |
| GO 95710/0030/0185 | 02158455 | UE2020 | 27/09/2026 11:19 | A | 11:20:53 | 6 de 6 | sim |
| MA 09210/0003/0562 | 01796134 | UE2015 | 26/09/2026 10:09 | A | 10:13:00 | 6 de 6 | sim |
| MG 44059/0120/0015 | 02056689 | UE2020 | 27/09/2026 08:33 | A | 08:34:12 | 6 de 6 | sim |
| MG 46256/0130/0209 | 02256868 | UE2022 | 21/09/2026 13:32 | A | 13:32:39 | 6 de 6 | sim |
| MG 49034/0298/0217 | 01833864 | UE2015 | 19/09/2026 20:05 | D | - | 6 de 6 | sim |
| MG 49417/0202/0102 | 01783662 | UE2015 | 26/09/2026 12:07 | A | 12:11:07 | 6 de 6 | sim |
| MG 51918/0248/0166 | 02058837 | UE2020 | 20/09/2026 16:27 | A | 16:27:53 | 6 de 6 | sim |
| MS 90514/0054/0052 | 02363436 | UE2022 | 24/09/2026 10:40 | A | 10:42:28 | 6 de 6 | sim |
| MS 90514/0054/0134 | 02446073 | UE2022 | 24/09/2026 08:38 | A | 08:39:27 | 6 de 6 | sim |
| PA 04553/0086/0066 | 02275205 | UE2022 | 22/09/2026 10:22 | A | 10:27:46 | 6 de 6 | sim |
| PA 04553/0086/0081 | 02470292 | UE2022 | 22/09/2026 12:36 | A | 12:36:57 | 6 de 6 | sim |
| PA 04855/0031/0034 | 01806559 | UE2015 | 25/09/2026 13:22 | A | 13:26:41 | 4 de 6 | sim |
| PA 05053/0038/0230 | 02281883 | UE2022 | 22/09/2026 09:43 | A | 09:43:39 | 6 de 6 | sim |
| PE 24198/0056/0482 | 01652763 | UE2013 | 23/09/2026 14:07 | A | 14:09:38 | 4 de 6 | sim |
| PE 24570/0101/0157 | 02173199 | UE2020 | 25/09/2026 09:42 | A | 09:44:51 | 6 de 6 | sim |
| PE 25313/0150/0189 | 02364225 | UE2022 | 25/09/2026 09:23 | A | 09:23:40 | 6 de 6 | sim |
| PI 10464/0005/0080 | 02213342 | UE2020 | 29/09/2026 13:33 | A | 13:33:55 | 6 de 6 | sim |
| PR 74136/0077/0017 | 01828156 | UE2015 | 24/09/2026 12:56 | A | 13:00:17 | 4 de 6 | sim |
| PR 74691/0025/0026 | 01673224 | UE2013 | 25/09/2026 11:32 | A | 11:34:38 | 6 de 6 | não (reserva no 2º) |
| PR 74934/0068/0423 | 02395610 | UE2022 | 24/09/2026 09:09 | A | 09:10:20 | 6 de 6 | sim |
| PR 75353/0003/0682 | 02296139 | UE2022 | 20/09/2026 16:30 | A | 16:30:49 | 6 de 6 | sim |
| PR 77496/0072/0189 | 01845560 | UE2015 | 25/09/2026 17:03 | D | - | 6 de 6 | sim |
| PR 84611/0206/0118 | 02005251 | UE2020 | 19/09/2026 11:32 | A | 11:32:25 | 6 de 6 | sim |
| RJ 58335/0079/0611 | 02218496 | UE2020 | 24/09/2026 14:47 | A | 14:48:05 | 6 de 6 | sim |
| RJ 58335/0103/0145 | 02241706 | UE2020 | 23/09/2026 10:27 | A | 10:28:11 | 6 de 6 | sim |
| RJ 58467/0150/0119 | 01774639 | UE2015 | 22/09/2026 13:23 | D | - | 5 de 6 | sim |
| RJ 59013/0089/0173 | 02221448 | UE2020 | 24/09/2026 11:16 | A | 11:16:54 | 6 de 6 | sim |
| RJ 59013/0089/0187 | 02165340 | UE2020 | 24/09/2026 11:41 | A | 11:42:07 | 6 de 6 | sim |
| RJ 60011/0005/0313 | 02198563 | UE2020 | 25/09/2026 11:32 | A | 11:32:54 | 6 de 6 | sim |
| RJ 60011/0009/0309 | 01775691 | UE2015 | 22/09/2026 15:20 | A | 15:24:01 | 6 de 6 | sim |
| RJ 60011/0192/0065 | 01766283 | UE2015 | 24/09/2026 10:10 | A | 10:12:59 | 6 de 6 | sim |
| RS 87734/0077/0169 | 01653096 | UE2013 | 22/09/2026 15:35 | A | 15:39:05 | 6 de 6 | sim |
| SC 81477/0015/0207 | 01778778 | UE2015 | 24/09/2026 14:01 | D | - | 4 de 6 | sim |
| SC 83216/0053/0093 | 02190959 | UE2020 | 26/09/2026 12:22 | A | 12:22:55 | 6 de 6 | sim |
| SC 83259/0028/0033 | 01828170 | UE2015 | 25/09/2026 15:04 | A | 15:06:45 | 6 de 6 | sim |
| SC 83496/0054/0056 | 01677973 | UE2013 | 26/09/2026 09:53 | A | 09:58:39 | 6 de 6 | sim |
| SP 61379/0008/0014 | 01779133 | UE2015 | 26/09/2026 10:17 | A | 10:20:04 | 6 de 6 | sim |
| SP 61603/0010/0091 | 02314363 | UE2022 | 24/09/2026 15:14 | A | 15:14:43 | 6 de 6 | sim |
| SP 61638/0013/0075 | 02078159 | UE2020 | 24/09/2026 16:42 | A | 16:47:57 | 6 de 6 | sim |
| SP 63096/0038/0105 | 02213793 | UE2020 | 26/09/2026 09:39 | A | 09:40:00 | 6 de 6 | sim |
| SP 63134/0388/0404 | 02300059 | UE2022 | 27/09/2026 09:12 | A | 09:12:28 | 6 de 6 | sim |
| SP 67890/0277/0101 | 01666092 | UE2013 | 26/09/2026 09:03 | A | 09:05:46 | 6 de 6 | sim |
| SP 69671/0382/0022 | 02137704 | UE2020 | 23/09/2026 14:26 | A | 14:27:08 | 6 de 6 | sim |
| SP 70572/0307/0403 | 01833247 | UE2015 | 26/09/2026 09:00 | A | 09:02:58 | 6 de 6 | sim |
| SP 71072/0004/0247 | 01811448 | UE2015 | 25/09/2026 17:12 | D | - | 6 de 6 | sim |
| SP 71072/0246/0009 | 02306919 | UE2022 | 26/09/2026 12:39 | A | 12:39:36 | 6 de 6 | sim |
| SP 71072/0259/0194 | 02364546 | UE2022 | 29/09/2026 15:32 | A | 15:36:04 | 6 de 6 | sim |
| SP 71072/0320/0142 | 02059932 | UE2020 | 27/09/2026 14:10 | A | 14:10:48 | 6 de 6 | sim |
| SP 71072/0327/0738 | 02364167 | UE2022 | 27/09/2026 17:17 | A | 17:19:31 | 6 de 6 | sim |
| SP 71072/0352/0238 | 02381201 | UE2022 | 27/09/2026 10:57 | A | 10:57:38 | 6 de 6 | sim |
| SP 71072/0353/0007 | 01818141 | UE2015 | 24/09/2026 16:18 | A | 16:22:11 | 6 de 6 | sim |
| SP 71072/0353/0154 | 02057246 | UE2020 | 26/09/2026 09:58 | A | 09:58:59 | 6 de 6 | sim |
| SP 71072/0373/0021 | 02066619 | UE2020 | 24/09/2026 10:17 | A | 10:18:31 | 6 de 6 | sim |
| SP 71072/0392/0251 | 01827313 | UE2015 | 25/09/2026 14:40 | A | 14:43:14 | 5 de 6 | sim |
| SP 71072/0408/0330 | 02010801 | UE2020 | 26/09/2026 16:03 | A | 16:03:50 | 6 de 6 | sim |
| TO 92045/0010/0093 | 02250825 | UE2022 | 23/09/2026 17:42 | A | 17:42:55 | 6 de 6 | sim |

Por UF (2º turno): SP 19, RJ 8, PR 6, MG 5, PA 4, SC 4, CE 3, PE 3, AM 2, GO 2, MS 2, BA 1, DF 1, MA 1, PI 1, RS 1, TO 1. Todas as cargas são de 19/09 a 30/09, antes do 1º turno. A lista do 1º turno (63) está no CSV de saída.

### Modelo (Fato) e o que ele sugere (Hipótese)

| Modelo (BU) | 2º turno: casos | Esperado pela frota | 1º turno: casos | Esperado |
|---|---:|---:|---:|---:|
| UE2022 | 20 | 25,5 | 20 | 25,1 |
| UE2020 | 20 | 25,7 | 20 | 25,3 |
| UE2015 | 19 | 11,2 | 19 | 11,1 |
| UE2013 | 5 | 1,6 | 4 | 1,5 |
| UE2013 + UE2015 | **24** (p = 0,0009) | 12,8 | **23** (p = 0,0018) | 12,6 |

- **Hipótese nula:** o desligamento pela chave no fim da carga acontece com a mesma chance em qualquer modelo.
- **Linha de base:** a parte de cada modelo nas urnas que geraram BU no turno.
- **Tamanho do efeito:** os modelos antigos aparecem 1,9 vez mais que o esperado.
- **Hipótese benigna (não testada):** nos modelos antigos, a impressão do extrato e o fim da carga demoram mais. Assim, o operador que gira a chave logo depois de a impressora parar pega a urna antes da linha final mais vezes. Os 5 casos D, todos UE2015, apontam na mesma direção.
- **Sem mudança de programa:** a versão é uma só, 10.23.0.0, nos 127 casos.

### Votos (Fato)

| Conjunto | Comparação | Seções | Comparecimento | Parcela do 13 | Brancos + nulos |
|---|---|---:|---|---|---|
| BU do 2º turno de carga sem a linha final | variação × zona | 64 | +0,30 (p 0,25) | −0,18 (p 0,48) | +0,08 (p 0,67) |
| idem | nível 1º turno × local | 62 | −0,19 (p 0,67) | −0,18 (p 0,76) | +0,38 (p 0,08) |
| idem | nível 2º turno × local | 62 | +0,03 (p 0,94) | −0,17 (p 0,75) | +0,30 (p 0,05) |
| BU do 1º turno de carga sem a linha final | variação × zona | 63 | +0,28 (p 0,30) | −0,15 (p 0,57) | +0,09 (p 0,64) |
| idem | nível 1º turno × local | 61 | −0,20 (p 0,68) | −0,12 (p 0,84) | +0,37 (p 0,09) |
| idem | nível 2º turno × local | 61 | +0,01 (p 0,99) | −0,07 (p 0,91) | +0,31 (p 0,045) |

Efeito em pontos percentuais, média ponderada das marcadas menos a das demais do grupo. Nenhum teste passa do limiar de 0,0028. Com 18 testes, cerca de 1 ficaria abaixo de 0,05 só pelo acaso.

Brancos + nulos ficam de +0,30 a +0,38 ponto acima do local nos 4 testes de nível (p de 0,045 a 0,09), mas não na variação entre os turnos (+0,08 e +0,09). É um traço estável das seções nos dois turnos, não uma mudança entre eles, e não passa da correção.

### Visto pelo atacante

- **Ataque:** carregar a urna com programa ou dados diferentes e esconder isso fazendo a carga parecer "não terminada".
- **O que precisaria:** acesso físico à urna na cerimônia e uma mídia de carga própria.
- **Rastro esperado:** identificador ou data de geração da mídia de carga diferente das outras urnas da zona, versão diferente, verificação de assinatura sem sucesso nas ligações seguintes, código de carga que não casa com o BU.
- **O que apareceu:**
  - mesma versão nas 127;
  - 0 verificação sem sucesso;
  - código de carga do BU igual ao gravado nas 127.
- **Conclusão:** a falta da linha final não carrega sinal de ataque; é a marca do desligamento pela chave.
- **Limite:** uma mídia de carga adulterada e assinada com a chave verdadeira do TSE passaria por todos esses testes, com ou sem a linha final.

## 2. As 2 urnas da BA zona 71 fora das listas prévias (H27, grupo D)

### Onde cada urna aparece (Fato)

Busca nas 222 listas baixadas (4.142.470 linhas), coluna "urna esperada" ou "urna efetivada", em todas as UFs:

| Urna | Papel | CEFT 2022 (1º turno) | CEFT 2024 (1º turno) | CESP 1º turno 2026 (03/10 e 04/10) | CEFT 1º turno 2026 | CESP 2º turno 2026 (24/10 e 25/10) | CEFT 2º turno 2026 |
|---|---|---|---|---|---|---|---|
| **01843885** | votou no 2º turno em BA 33774/0071/0150 | não | não | não | não | não | **efetivada** em 0150 |
| **01844077** | votou no 2º turno em BA 39144/0071/0170 | não | não | não | não | não | **efetivada** em 0170 |
| 01780000 | votou no 1º turno em 0150 | BA 39691/0197/0131 (esperada e efetivada) | BA 37532/0032/0218 | esperada em 0150 (as 2) | esperada e efetivada em 0150 | **esperada em 0150 (as 2)** | esperada em 0150 |
| 01771106 | votou no 1º turno em 0170 | BA 34371/0112/0381 | BA 36633/0051/0048 | esperada em 0170 (as 2) | esperada e efetivada em 0170 | **esperada em 0170 (as 2)** | esperada em 0170 |

| Fonte | 01843885 | 01844077 | 01780000 | 01771106 |
|---|---|---|---|---|
| BU 1º turno | não | não | 0150 | 0170 |
| BU 2º turno | 0150 | 0170 | não | não |
| Pacote (assinante ou diário, inclusive aninhado), 1º turno | não | não | 0150 | 0170 |
| Pacote, 2º turno | 0150 | 0170 | não | não |
| Faixa pública do modelo (`modelourna_numerointerno`) | UE2015 (1.750.000 a 1.950.000) | UE2015 | UE2015 | UE2015 |

### Certificado (Fato)

| Urna | Emissor | Série | Emitido em (UTC) | Vence em | Assinatura da AC | Observação |
|---|---|---|---|---|---|---|
| 01843885 | AC URNA (AKI série 03, "AC RAIZ UE") | `34b024` | **31/08/2026 15:59:29** | 31/12/2037 23:00 | confere | um dos 54 emitidos depois do vencimento da AC URNA (doc 07/08), mesmo molde dos demais; o "DER: comprimento ausente" do pacote é o byte zero de preenchimento já explicado (doc 07, item 4) |
| 01844077 | AC URNA | `3454d5` | 18/05/2017 21:22:48 | 25/01/2031 21:22:48 | confere | — |
| 01780000 (1º turno) | AC URNA | `2e176a` | 02/07/2016 | 11/03/2030 | confere | — |
| 01771106 (1º turno) | AC URNA | `2d6911` | 30/06/2016 | 09/03/2030 | confere | — |

### Linha do tempo no diário bruto (Fato; hora da urna)

| Data | BA 33774/0071/0150 | BA 39144/0071/0170 |
|---|---|---|
| 17/09 | Mídia de carga `02109BD0` gerada no computador `ZBA071WKS03` às 14:44:38 | Mídia de carga `8DF14556` gerada no mesmo computador às 13:49:24 |
| 18/09 | Mídia de votação gerada às 08:45:26 | Mídia de votação gerada às 08:45:49 |
| 21/09 | Urna do 1º turno 01780000: uma carga às 11:57 sem código gravado (arquivada às 12:11); carga às 12:13 com a mídia `02109BD0`, "carregada com sucesso" às 12:15:50 | Urna do 1º turno 01771106: carga às 16:44 com a mídia `8DF14556`, sucesso às 16:46:36 |
| 04/10 | 01780000 abre às 08:00:01. Às 08:10, "Carga da bateria interna: CRÍTICA". 279 votos, o último às **21:13:16**; encerramento às 21:14:37 | 01771106 abre às 08:00:01. 295 votos, o último às **20:41:45**; encerramento às 20:52:16 |
| 21/10 | **01843885** liga às 10:45 (primeira linha do diário). Carga digitada às 10:50 com a **mesma mídia `02109BD0`** e o mesmo computador; código gravado às 10:52:58; sucesso às 10:53:01. Liga às 10:55, "Urna não testada", e é desligada às 11:07 | **01844077** liga às 11:05. Carga digitada às 11:12 com a **mesma mídia `8DF14556`**; sucesso às 11:15:20. Liga às 11:16, "Urna não testada", e é desligada às 11:29 |
| 22/10 | Ligada das 09:28 às 09:47 (conferência) | Ligada das 08:57 às 09:04 e das 09:11 às 09:18 |
| 25/10 | Liga às 07:16; abre às 08:00:02; 288 votos, das 08:01:36 às 16:56:33; encerramento às 17:05:00 | Liga às 07:04; abre às 08:00:01; 300 votos, das 08:02:07 às 16:26:06 |
| 25/10 (TSE, hora de Brasília) | Correspondência recebida às 20:42:34, pacote às 20:42:36 | Correspondência às 20:55:43, pacote às 20:55:45 |

- **Fato:** ERRO nos diários de 2º turno das duas urnas: só "GAP Problema ao desmontar a MR", a linha de rotina que aparece em 498.698 seções (doc 08 do matemático).
- **Fato:** no 1º turno, 21 das 288 seções da zona 71 encerraram depois das 20h: 16 às 20h e 5 às 21h. O fim tardio das duas urnas do 1º turno não é exclusivo delas.

### O que os arquivos explicam e o que não explicam

- **Explicam (Fato):**
  - as duas urnas novas são urnas reais do modelo UE2015, com certificado da AC URNA válido pela chave da AC;
  - elas receberam a carga oficial da seção, com a mesma mídia de carga do 1º turno, gerada em 17/09 no computador do cartório da zona 71;
  - foram preparadas 4 dias antes da votação, conferidas no dia seguinte, abriram às 8h e votaram o dia todo;
  - os votos não destoam (parecer 38: 0150 é reduto do 13, com 95,0% no 2º turno e 95,2% no 1º com outra urna; 0170, 82,5% e 85,4%).
- **Não explicam:**
  1. por que as urnas do 1º turno foram trocadas. A única pista técnica é a bateria crítica de 01780000 em 04/10, e nada há para 01771106;
  2. onde estavam 01843885 e 01844077 antes de 21/10. Não aparecem em nenhuma lista baixada (2022 e 2024 só têm CEFT do 1º turno, que lista só as urnas das seções). O certificado de 01843885 foi emitido em 31/08/2026, sinal de urna recertificada perto da eleição;
  3. por que o código de carga de 21/10 não chegou ao TSE antes da CESP de 24/10 12:31 nem da de 25/10 13:45, e só chegou junto com o pacote, na noite de 25/10.
- **Pedido ao TSE/TRE-BA:**
  - ata da carga de 21/10 da zona 71 e o motivo da troca;
  - registro de entrada e saída de 01843885, 01844077, 01780000 e 01771106 no depósito;
  - registro da recertificação de 01843885 (emissão de 31/08/2026);
  - registro de envio da correspondência das cargas de 21/10 (hora em que o cartório transmitiu);
  - CESP e CEFT de 2022 e 2024 completos, com as listas de contingência.

### Visto pelo atacante

- **Ataque:** urna estranha, com software próprio, posta no lugar da oficial perto da votação, usando a janela em que a correspondência só chega com o pacote.
- **O que precisaria:**
  - uma urna com certificado válido da AC URNA, ou a chave da AC;
  - a mídia de carga da seção;
  - acesso ao cartório.
- **Rastro esperado:**
  - certificado fora do molde ou com assinatura que não confere;
  - número fora da faixa do modelo;
  - mídia de carga diferente da oficial;
  - versão diferente;
  - diário sem preparação.
- **O que apareceu:**
  - molde e assinatura conferem;
  - número dentro da faixa do UE2015;
  - mesma mídia e mesma máquina do cartório;
  - mesma versão;
  - carga, teste e conferência no diário.
- **Limite:** uma urna real recertificada com a chave do TSE e carregada com a mídia oficial é indistinguível de uma de reposição legítima. O que fecha isso é o registro de patrimônio e a ata, fora dos arquivos públicos.

## 3. AL 28819/0045/0174 e PR 79294/0019/0055 (fila H15/H07)

### Como a urna libera um eleitor (Fato, do diário)

1. O mesário digita o título.
2. A urna pede a digital do eleitor até 4 vezes. Cada tentativa tem "Solicita digital", "Capturada a digital" (o dedo foi lido) e, se não reconhece, "Número de tentativas de reconhecimento do dedo".
3. Se reconhece: "Tipo de habilitação do eleitor [biométrica]".
4. Se não reconhece nas 4: "Solicitação de dado pessoal… habilitação manual" e "Dado digitado confere". Depois a urna pede a digital do mesário ("Solicita digital do mesário") e procura entre os mesários registrados ou entre as digitais já gravadas.
5. "Eleitor foi habilitado" e "O voto do eleitor foi computado".

### Resultado, alvo × vizinhas do mesmo local (Fato)

| Seção, turno | Urna (modelo) | Votos | Sem digital | Tentativas antes da liberação manual | Digital do mesário conferiu (score > 50) | "Já votou" | ERRO do leitor | Comparecimento | Parcela do 13 |
|---|---|---:|---:|---|---|---:|---|---:|---:|
| **PR 0055, 1º** | 01660647 (UE2013) | 227 | **223 (98,2%)** | 4 em 223 de 223 | 204 de 763; M1 liberou 195 | 0 | 0 | 85,7% | 32,4% |
| PR 0056, 1º | 01653533 (UE2013) | 213 | 16 (7,5%) | 4 em 16 | 8 de 58 | 0 | 0 | 80,1% | 32,8% |
| PR 0067, 1º | 01661829 (UE2013) | 159 | 29 (18,2%) | 4 em 28; 0 em 1 | 18 de 138 | 0 | 0 | 75,0% | 43,4% |
| **PR 0055, 2º** | 01660647 (UE2013) | 227 | **225 (99,1%)** | 4 em 225 de 225 | **2 de 2.183**; 216 liberações sem mesário identificado | 0 | 0 | 85,7% | 36,9% |
| PR 0056, 2º | 01653533 | 224 | 35 (15,6%) | 4 em 35 | 29 de 177 | 3 | 0 | 84,2% | 37,8% |
| PR 0067, 2º | 01661829 | 159 | 22 (13,8%) | 4 em 20; 0 em 2 | 19 de 35 | 0 | 0 | 75,0% | 48,4% |
| **AL 0174, 1º, urna da seção** | 01670138 (UE2013) | 117 | 18 (15,4%) | 4 em 18 | 0 de 150 | 0 | **2** (12:27 e 13:00) | 91,0% | 72,3% |
| **AL 0174, 1º, reserva** | 01675293 (UE2013) | 106 | **99 (93,4%)** | 4 em 99 de 99 | 42 de 657 | 0 | 0 | (seção) | (seção) |
| **AL 0174, 2º, reserva** | 01669231 (UE2013) | 223 | 15 (6,7%) | 4 em 14; 0 em 1 | 1 de 112 | 0 | 0 | 91,0% | 73,5% |
| AL, 11 vizinhas, 1º | UE2013 (5) e UE2015 (6) | 210 a 257 | 7,4% a 32,9% | quase todas com 4 | — | 0 a 1 | 0 | 73,3% a 92,3% | 70,2% a 79,5% |
| AL, 11 vizinhas, 2º | idem | 202 a 264 | 5,9% a 22,3% | idem | — | 0 a 1 | 0 | 76,3% a 91,1% | 74,5% a 81,3% |

### Sequência e horários (Fato)

**PR 79294/0019/0055.**
- **1º turno:**
  - abertura às 08:00:02; votos das 08:03:51 às 17:15:22;
  - os 4 votos por digital foram às 10:47, 12:44, 12:55 e 14:18;
  - liberação manual em todas as horas, de 19/19 às 8h a 8/8 às 17h;
  - maior sequência: 76 manuais seguidas (14:21 a 17:15);
  - no máximo 7 em 10 minutos; o menor intervalo entre votos é 67 s; ciclo manual mediano de 119 s;
  - nos registros de mesários antes e depois da votação, os 6 mesários que são eleitores da seção tiveram a digital recusada contra o cadastro (scores 4 a 12). Isso não distingue a seção: nas vizinhas, a mesma conferência recusou 1 de 2 (0056) e 4 de 4 (0067).
- **2º turno:**
  - votos das 08:01:45 às 16:48:34; digital só às 11:40 e às 16:35;
  - 137 manuais seguidas das 08:01 às 11:39; no máximo 8 em 10 min; o menor intervalo é 36 s; ciclo manual mediano de 86 s;
  - "Não encontrou digital coletada em nenhum dos arquivos, vai salvar a digital em novo arquivo" 216 vezes: a digital do mesário, lida a cada liberação, não confere nem com a lida um minuto antes.
- **Sem troca de urna, sem reinício no dia, sem ERRO do leitor nos dois turnos.**

**AL 28819/0045/0174, 1º turno.**

| Hora | Evento |
|---|---|
| 08:00:02 | Urna 01670138 (da seção) abre. 99 de 117 votos por digital até as 12:58 |
| 11:24:13 | "Solicita digital, tentativa 1": o diário para, sem desligamento nem fechamento |
| 11:35:54 | Urna religada; volta a votar às 11:41 |
| 12:27:21 | ERRO VOTA "Captura da digital do eleitor, Falha na captura da digital (5314)… Desligue e ligue a urna. Se o erro persistir, substitua a urna" |
| 12:35 a 12:43 | Desligada pela chave e religada |
| 13:00:40 | ERRO VOTA "Não é possível continuar a execução, Erro inesperado (5314), Error ao encerrar captura" |
| 13:19:03 | Desligada pela chave |
| 13:28:31 | Reserva 01675293 (carregada como contingência em 22/09): "Início do procedimento de contingência" |
| 13:35:31 | Reserva pronta. 106 votos das 13:39 às 18:18, 99 sem digital, todos com 4 capturas recusadas; digital só em 7 (13:47, 13:48, 15:05, 16:06, 16:32, 16:58, 17:16) |
| 18:24:49 | "Inicio do Encerramento" no diário (o BU marca encerramento às 18:22:10; houve fila depois das 17h) |

- A liberação sem digital na reserva é igual em todas as horas: 22/22 às 14h, 17/18 às 15h, 23/26 às 16h, 23/24 às 17h e 9/9 às 18h.
- Os 21 votos manuais da última hora vêm de a reserva ter ficado até o fim, não de uma concentração no fim do dia.
- **2º turno:** a reserva 01675293 foi trocada em **18/10** pela reserva 01669231, por procedimento de contingência às 09:54. Com ela, 6,7% sem digital.

### Leitura (Hipótese, com o que testa cada lado)

- **H07, defeito do leitor ou da conferência da digital na urna (sustentada pelo diário):**
  - AL: o ERRO do leitor que manda substituir a urna, a troca pela reserva e a reserva também falhando;
  - PR: a mesma urna falha nos dois turnos, as vizinhas do mesmo local e do mesmo modelo não falham, e no 2º turno nem a digital do mesário confere mais com a lida um minuto antes, sinal de leitor piorando.
- **H15, mesário votando por ausentes (não sustentada):**
  - todas as 547 liberações manuais das três situações de falha (PR 223 no 1º turno e 225 no 2º, AL 99 na reserva) vêm depois de 4 leituras de dedo no leitor;
  - não há "já votou", nem intervalo de 30 s ou menos, nem concentração no fim do dia;
  - comparecimento e parcela do 13 iguais nos dois turnos e dentro da faixa das vizinhas.
- **O que não se exclui (princípio 8):** o diário registra que **um** dedo foi lido, não **de quem** era. Quem quisesse votar por ausentes numa urna com leitor falhando poderia pôr o próprio dedo 4 vezes e digitar o dado pessoal. As imagens das digitais (`wsqman.jez`, `wsqmes.jez`, gravadas pela urna e citadas no diário) mostrariam se as capturas são de pessoas diferentes; elas não estão nos arquivos públicos.

## Limites

- **Diário:** registra o que o programa escreve. Um programa adulterado e assinado com a chave verdadeira escreve um diário normal (vale para os 3 itens).
- **Item 1:** o catálogo do 2º turno foi usado para 497.588 cargas do 1º turno pela cópia cumulativa do diário. Isso foi conferido nas 63 cargas relidas, que deram o mesmo resultado nos dois diários. Uma perda de linha só na cópia do 1º turno, com a linha presente na do 2º, não seria vista.
- **Item 2:** as listas de 2022 e 2024 baixadas são só o CEFT do 1º turno, que lista as urnas das seções e não as de contingência. "Não aparece" nelas não quer dizer "não existia".
- **Item 3:** o score da comparação da digital do eleitor com o cadastro não é gravado. Só o do mesário. As imagens das digitais não estão nos arquivos públicos.

## Pendente

- Item 1:
  - confirmar a hipótese do tempo de impressão por modelo, medindo, no universo, o intervalo entre "Fim de impressão" e "Urna carregada com sucesso" por modelo. Exige uma nova varredura de todos os diários;
  - linha de base do desligamento pela chave durante a carga com a linha final presente.
- Item 2: resposta do TSE/TRE-BA aos 5 pedidos acima.
- Item 3: imagens das digitais (`wsqbio`, `wsqman`, `wsqmes`) das duas seções e o registro de manutenção das urnas 01660647, 01670138 e 01675293.

## Para refazer

```
node scripts/auditoria/seguranca-pend-h23-sem-sucesso.mjs   # item 1: 2 turnos, relê 1.746 pacotes, ~1 min
node scripts/auditoria/seguranca-pend-h27-ba71.mjs          # item 2: 222 listas + pacotes + diários, ~20 s
node scripts/auditoria/seguranca-pend-h15-liberacoes.mjs    # item 3: 2 seções + vizinhas, 2 turnos, ~10 s
```

Funções comuns em `scripts/auditoria/seguranca-pend-lib.mjs`.

O item 1 depende de `data/parsed/auditoria/matematico-forense/h23-sessoes-2t.jsonl` (`matematico-h23-cargas.mjs`). O item 2 depende de `seguranca-h25/<t>t-padrao-dirs.jsonl`, `<t>t-certs.jsonl` e `matematico-forense/h23-sessoes-<t>t.jsonl`.

Saídas em `data/parsed/auditoria/engenheiro-seguranca-urna/pendencias/`:
- `h23-sem-sucesso.json` e `.csv`: os 127 casos com o trecho da carga, os testes e o modelo;
- `h27-ba71.json`: achados nas listas, BU, pacotes, certificados, cargas e eventos dos diários;
- `h15-liberacoes.json`: ciclos por eleitor das urnas-alvo, sem título, e resumo das vizinhas.
