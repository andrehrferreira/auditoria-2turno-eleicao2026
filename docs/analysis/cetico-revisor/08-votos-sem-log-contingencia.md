# 08. Parecer: votos do BU sem rastro no log em seções com urna de contingência

Achado revisado: [docs/analysis/coerencia-contagem/03-coerencia-interna.md](../coerencia-contagem/03-coerencia-interna.md) (seção "Os 50 votos sem rastro no log") e o risco R2 de [05-riscos-principio-8.md](../coerencia-contagem/05-riscos-principio-8.md). Script do autor: `scripts/auditoria/contagem-log-pacote.mjs`.

A revisão foi feita em 29/10/2026 por três lentes independentes (reprodução, definições e explicações alternativas). Depois fiz uma conferência própria dos pontos em que as lentes divergiram (`cetico-vsl-consolidacao.mjs`) e do universo que nenhuma lente cobriu (`cetico-vsl-log-unico.mjs`). O achado é do **2º turno**, que está completo no banco. As comparações com o 1º turno são **parciais**: a cópia de leitura tem 25 UFs do 1º turno, e MA, BA e RS estão entre elas.

## Afirmação original

> 50 votos de BUs assinados não têm rastro em nenhum log publicado, em 3 seções que trocaram de urna (contingência): MA 08893/0047/0609 (36 votos; às 10:25 a mídia de votação da 0609 foi colocada na urna 01813459, que tinha a carga da seção 0445; o log da urna original não foi publicado); BA 35653/0173/0235 (13 votos; falta o log da urna 01681986; pelos contadores do BU, 12 desses 13 foram liberados sem digital, contra 10,3% nos votos com log, p≈10⁻¹¹); RS 89060/0017/0191 (1 voto). BU e RDV dessas seções estão assinados e fecham entre si.

## Veredito final: sustentado com ressalvas

As três lentes deram o mesmo veredito, e a conferência própria o confirma.

- **A contagem se sustenta (Fato).** São 50 votos do BU sem nenhuma linha "computado" em log publicado: 36 no MA, 13 na BA e 1 no RS. No RS há ainda 1 voto com "Voto confirmado" e sem "computado". Os números foram reproduzidos por três códigos independentes. No universo inteiro do 2º turno (499.207 seções completas), não há outra seção com voto sem rastro.
- **O p≈10⁻¹¹ não se sustenta como evidência.** A conta está certa, mas a hipótese nula está errada. Ela trata cada voto como independente e usa a taxa de outra urna. Na referência certa (sessões curtas de urnas substituídas), 12 de 13 ou mais por biografia aparece em 6% a 8% das sessões. Entre urnas UE2013, o modelo da urna sem log, aparece em cerca de 24%.
- **O mecanismo da perda do log foi achado nos arquivos (Fato, MA e BA).** Em MA e BA, uma urna com carga de outra seção ligou com a mídia de votação da seção. Ela gravou o próprio log na mídia externa e só depois recusou a mídia, com "GAP erro 72". A contingência seguinte empacotou esse log, e não o da urna que tinha recebido os votos. O autor deixou isso como hipótese não testada. O RS tem outro mecanismo: o fim do log se perdeu numa queda da urna.
- **"BU e RDV assinados" agora está verificado (Fato), com uma ressalva de ferramenta.** `src/lacres.js` falha na leitura dos pacotes do MA e da BA ("DER: comprimento ausente"). Com o certificado cortado no fim do DER (sobra 1 byte 0x00, correção de `integridade-reverificar.mjs`), as 22 conferências passam com 0 falha nas três seções. Elas cobrem certificado, lista, arquivos e cadeia de hashes do BU.
- **Princípio 8: o risco continua aberto em 13 votos (BA) e reduzido no MA.** Nenhum arquivo público prova, voto a voto, que esses 50 votos vieram de eleitores. A BA tem uma etapa humana fora do padrão que o autor não registrou: a recarga da urna original em campo, no dia da eleição, com a carga de outra seção.

## Afirmação revisada (alcance que os dados sustentam)

> **Fato.** No 2º turno, das 499.207 seções completas, 3 têm votos no BU sem nenhuma linha "computado" em log publicado, num total de 50 votos (0,000039% dos votos). As 3 são de contingência:
> - MA 08893/0047/0609: 36 votos. Pelos contadores do BU, 32 foram liberados por digital e 4 por biografia.
> - BA 35653/0173/0235: 13 votos, sendo 1 por digital e 12 por biografia.
> - RS 89060/0017/0191: 1 voto, e mais 1 com "Voto confirmado" sem "computado".
>
> BU e RDV dessas seções fecham entre si e por candidato, e o BU é igual ao resultado oficial. As assinaturas da urna de contingência (certificado, lista de arquivos, hashes e cadeia do BU) conferem com 0 falha. No MA e na BA isso só acontece depois de cortar 1 byte 0x00 que sobra no campo do certificado. É um defeito de leitura da ferramenta, não do arquivo.
>
> **Fato (mecanismo, MA e BA).** Nas duas seções, uma urna com carga de outra seção ligou com a mídia de votação (MV) da seção. A ordem foi esta:
> 1. a urna gravou "Iniciando registro do log na MI e na ME";
> 2. só depois recusou a MV com "GAP erro 72 (dados da MV não correspondem)";
> 3. a contingência seguinte copiou da mídia externa o log dessa urna, e não o da urna que tinha recebido os votos.
>
> Os horários foram estes:
> - **MA:** urna 01813459, com a carga da seção 0445. Duas tentativas: ligada às 10:25:54, log na ME às 10:28:20 e erro 72 às 10:29:43; depois ligada às 10:31:34, log na ME às 10:33:57 e erro 72 às 10:35:21.
> - **BA:** urna 01833178, recarregada para a seção 0083. Ligada às 09:50:30, log na ME às 09:52:45 e erro 72 às 09:54:07.
>
> O log perdido não é um arquivo que o TSE deixou de divulgar. Ele nunca entrou no pacote assinado: a lista do `.vsc` tem um só `log.jez`, e o hash dele confere. Nos 11.748 pacotes com 2 ou mais logs, o erro 72 aparece em 4. Só os 2 que vieram depois de votos de outra urna perdem votos. No PR 74918/0056/0037, o erro veio antes do 1º voto. Na BA 34690/0192/0045, a urna do erro era a própria urna que votou.
>
> **Fato.** O BU não informa quantos votos vieram de cada urna. O `historicoCodigosCarga` identifica as cargas:
> - **MA:** 2 cargas. A primeira, 561061…020, é a da urna original 01663580, a mesma do BU do 1º turno. A segunda é a da contingência 01664037. A carga da 01813459 não aparece, então ela não gravou votos. Os 36 votos foram gravados pela urna original da seção.
> - **BA:** 3 cargas. A primeira é a da urna original 01833178, a terceira é a da contingência 01656557. A do meio, 454736…572, não aparece em nenhum BU do banco nem em nenhum log da zona. É, por Hipótese, a da urna 01681986, do modelo UE2013 pela faixa de numeração. Os 13 votos caem entre a abertura (08:48:54) e as 09:50:30.
>
> **Fato (RS, outro mecanismo).** O log da urna original 02320374 está publicado, com 15 votos. Ele para às 09:02:34 em "Solicita digital", sem desligamento, e volta às 09:38:59. Às 09:40:20, a urna registra "Sincronização dos arquivos dinâmicos, origem na ME". Isso é compatível com queda da urna e perda do fim do log.
>
> **Fato (estatística).** 12 dos 13 votos sem log da BA foram liberados por biografia. A comparação com a taxa da urna de contingência (10,3%) não mede raridade, porque a liberação por biografia se concentra por urna. Entre as sessões curtas de urnas substituídas no país, 12/13 ou mais aparece em 6% a 8% delas, e em cerca de 24% nas UE2013 (9 de 37). Não é evidência nem a favor nem contra.
>
> **Hipótese (risco, princípio 8).** Na janela sem log da BA, não dá para descartar votos lançados por quem não era o eleitor. Contra essa hipótese há só rastros agregados:
> - no MA, o BU e o tamanho assinado do `wsqbio.jez` indicam que 32 dos 36 votos foram liberados por digital conferida com o cadastro;
> - na BA, o tamanho assinado do `wsqman.jez` mostra cerca de 12 capturas de digital a mais, o que prova que houve um dedo no leitor, não de quem.
>
> Também ficam como risco:
> - a recarga, no dia, da urna original da BA com a carga da seção 0083, com data e hora digitadas pelo operador;
> - o uso no MA de uma urna reserva que ainda tinha a carga de outra seção.

## O que foi reproduzido (Fato)

| Medida (2º turno) | Autor | Reprodução | Definições | Alternativas | Conferência própria |
|---|---|---|---|---|---|
| MA 0609: BU × log | 224 × 188 (36) | igual | igual | igual | 188 computados no log da 01664037; 0 no log aninhado |
| MA: faltantes bio / biografia / sem biometria | 32 / 4 / 0 | igual | igual | igual | — |
| BA 0235: BU × log | 217 × 204 (13) | igual | igual | igual | 204 computados na 01656557; 0 nos 2 logs aninhados |
| BA: faltantes bio / biografia / sem biometria | 1 / 12 / 0 | igual | igual | igual | — |
| BA: biografia nos votos com log | 21/204 = 10,3% | igual | igual | igual | — |
| RS 0191: BU × log | 92 × 90 + 1 confirmado | igual | igual | igual | 15 (02320374) + 75 (02317450) = 90 |
| Binomial P(X≥12 \| 13; 0,103) | ≈10⁻¹¹ | 1,67×10⁻¹¹ | 1,67×10⁻¹¹ | 1,67×10⁻¹¹ | — |
| Seções com voto sem rastro no país | 3 | 3 de 5.714 contingências | 3 | 3 de 11.748 pacotes com 2+ logs | 3 de 499.207 (ver abaixo) |
| Lacres MA / BA / RS | "assinados" | falha DER / falha DER / sem aux.json | falha DER / falha DER / recusada pelo exportar | 0 falha com corte / 0 falha com corte / 0 falha direto | 22 conferências, 0 falha nas 3 (MA e BA com corte de 1 byte 0x00) |

**Universo completo.** As lentes varreram só as contingências (5.714) e os pacotes com 2 ou mais logs (11.748). Cruzei o comparecimento do BU com `perfil_log.votos_computados` nas 499.207 seções completas do 2º turno:
- **487.458 seções com 1 log:** o BU é igual ao log em todas, menos 3. Na BA 34711/0021/0178, na PB 21750/0002/0254 e na PI 11533/0003/0216, o BU tem 1 voto a mais, e o log mostra "Voto confirmado para [Presidente]" sem "computado" logo antes de um religamento. O autor já tinha registrado essas 3 (R4). Elas têm rastro: não são votos sem log.
- **SP 64777/0395/0298:** o perfil não leu o log. O `log.jez` bruto tem 268 computados, igual ao BU. O autor também já tinha registrado.
- **41 seções do exterior (ZZ):** estão sem arquivo e não têm BU.

Com isso, a afirmação "só 3 seções" vale para todo o 2º turno.

**1º turno (parcial: 25 UFs carregadas).** BA 0235: 29/209 por biografia (13,9%) com a urna original 01833178, contra 33/217 (15,2%) no 2º turno. MA 0609: 12/237 contra 19/224. Nas duas, a taxa da seção inteira no 2º turno está perto da do 1º.

### Pontos em que as lentes divergiram, decididos pela conferência própria

Script `cetico-vsl-consolidacao.mjs`, saídas `data/parsed/auditoria/cetico/cetico-vsl-consolidacao.{json,txt}`.

1. **Assinatura verificada ou não.** Reprodução e definições disseram que não foi verificada, porque a ferramenta falha. A lente de alternativas verificou com o certificado cortado. Rodei de novo:
   - MA e BA: o campo do certificado tem 946 B, o DER tem 945 B e sobra 1 byte 0x00. Com o corte, as 22 conferências passam com 0 falha (urnas ueao01664037 e ueao01656557, AC URNA, ECDSA).
   - RS: passa direto (UEAO02317450, AC UE2022, Ed521). A falta do `aux.json` só impede o `src/exportar.js`, não o `src/lacres.js`.

   **Decisão:** as assinaturas estão verificadas, e é a urna de contingência que assina. Isso prova que o conteúdo do BU e do RDV não mudou depois dela, não quem gravou os votos na MV.
2. **Horários do erro 72.** As lentes deram 10:25/10:31, 10:28/10:34 e 10:27 para o MA, e 09:50, 09:52 e 09:51 para a BA. Todas estão certas, mas cada uma usou um evento diferente:

   | Evento | MA, 1ª tentativa | MA, 2ª tentativa | BA |
   |---|---|---|---|
   | Urna ligada | 10:25:54 | 10:31:34 | 09:50:30 |
   | Início do logd | 10:27:06 | 10:32:43 | 09:51:37 |
   | Log gravado na ME | 10:28:20 | 10:33:57 | 09:52:45 |
   | Erro 72 | 10:29:43 | 10:35:21 | 09:54:07 |

   Em todos os casos, o log foi gravado na ME **antes** do erro 72.
3. **Quantos erros 72 há no país.** A lente de reprodução achou 3 nas contingências e a de alternativas achou 4 nos pacotes com 2 ou mais logs. Não há contradição: o 4º (PR 74918/0056/0037) é de seção normal (`secao`), não de contingência, e o erro veio antes do 1º voto.
4. **Recarga da BA.** As lentes deram 09:01 e 09:04. A urna foi ligada às 09:01:57, e a 1ª linha do logd é das 09:04:03. Depois:
   - às 09:06:57, o operador digitou data e hora ("09:06:00");
   - às 09:06:58, informou a seção 0083;
   - às 09:07:02, o log da MI foi guardado em `0183317825102026090702-01.jez`, que não está no pacote;
   - às 09:07:09, a MI foi formatada;
   - às 09:08:17, foi lida a mídia de carga 94F8FEDC, da seção 0083;
   - às 09:08:37, foi gravado o código de carga 283.019.170.940.371.182.588.321.

   Nessa sessão não houve MV. A MV da 0235 só entrou às 09:50. O texto do autor ("às 09:01, a 01833178 volta a ligar declarando Seção 0083 e com a MV da 0235") junta as duas sessões.
5. **O leitor de digital da BA.** A lente de definições usou o "Device open error /dev/uescan" como indício de defeito do leitor da seção. Conferi: o erro foi às 07:48:10, na urna **01833178**, ao pedir a digital do mesário ("CFingerScannerFS81HS::Open"). Os 13 votos sem log foram dados em **outra** urna, a 01681986. O erro mostra que a seção teve problema de leitor, mas não prova defeito na urna que votou. Além disso, o `wsqman.jez` cresceu cerca de 12 capturas, o que indica que o leitor da 01681986 capturava digitais. A explicação "leitor ausente" fica mais fraca. A explicação "digital capturada e não reconhecida", comum nas UE2013, continua de pé.

## Problemas encontrados

1. **A hipótese nula do p≈10⁻¹¹ está errada (Fato, as três lentes).** Ela supõe que cada voto tem a mesma chance de ser liberado por biografia, igual à de outra urna (a contingência 01656557). Mas a liberação sem digital se concentra por urna e por leitor. Medido na classe certa:
   - sessões de 5 a 30 votos de urnas substituídas: 16 de 258 (6,2%) têm 12/13 ou mais por biografia;
   - sessões de 10 a 20 votos: 9 de 114 (7,9%);
   - na calibração "urna substituída × urna final da mesma seção" (1.278 segmentos, todos com log), a regra do autor daria p<10⁻⁹ em 78 (6,1%) e em 25,9% das UE2013;
   - os 16 segmentos curtos com 12/13 ou mais estão todos na faixa de numeração das UE2013 (1.650.102 a 1.699.999 no banco, sem sobreposição com outros modelos), e a 01681986 está nela;
   - há casos de 13/13, 14/14, 18/18, 21/21 e 30/30 com log completo (exemplo: GO 96253/0049/0123, urna 01665386, 13/13).

   O 10⁻¹¹ deve sair do doc 03 e do R2 do doc 05, ou ser reescrito com essa linha de base.
2. **O mecanismo técnico foi suposto, não testado, e a frase que o resume está errada.** O doc 03 diz: "Nos três casos, a urna que falhou é a mesma cujo log falta." Isso é falso no MA e na BA:
   - no MA, falta o log da 01663580, e quem ligou com a MV errada foi a 01813459;
   - na BA, falta o log da 01681986, e quem ligou com a MV errada foi a 01833178;
   - no RS não houve urna intermediária.

   O mecanismo real está nos logs (ver Afirmação revisada). O doc 03 também diz que a 01813459 "não registrou votos e falhou". Na verdade, ela foi **bloqueada** pelo erro 72: um controle técnico que funcionou.
3. **"O log da urna original não foi publicado" é impreciso.** O `.vsc` da contingência lista 11 arquivos, só da urna final, com um único `log.jez`, cujo hash confere. O log que falta foi apagado na mídia externa antes da assinatura. Ele talvez ainda exista na memória interna da urna que votou. Não é um arquivo que o TSE deixou de divulgar.
4. **Falta a urna original do MA.** A urna original da MA 0609 é a 01663580: o `historicoCodigosCarga` do BU do 2º turno começa pelo código de carga do BU do 1º turno dela. O doc deveria nomeá-la.
5. **Etapa humana não registrada (princípio 8).** No dia da eleição, a urna original da BA 0235 recebeu em campo a carga da seção 0083, com data e hora digitadas e seção informada pelo operador, e teve a MI formatada. A seção 0083 funcionou com a própria urna 01795237 o dia todo, com BU 174 e log 174, e não foi afetada. Mas foi essa recarga que, depois, apagou na mídia externa o log da 01681986. No MA, a etapa humana foi usar como reserva uma urna (01813459) que ainda tinha a carga de outra seção. Os dois casos devem entrar no doc 05 como risco.
6. **"Assinados" foi afirmado sem dizer que a ferramenta do repositório falha nesses pacotes.** O resultado é bom (0 falha), mas só com a correção de `integridade-reverificar.mjs`. O defeito de leitura está diagnosticado (1 byte 0x00 depois do DER do certificado, em parte das UE2013/UE2015), mas `src/lacres.js` ainda não foi corrigido. Corrigir é do dono da integridade, não deste parecer.
7. **Reprodutibilidade.** `data/parsed/auditoria/contagem/log-pacote-2t.csv`, a saída que o doc 03 indica, hoje tem só 2 linhas de dados (MA 0445 e BA 0083) e data de 06:23. É o mesmo minuto das saídas da lente de reprodução, então provavelmente foi sobrescrito por uma rodada de revisão com `--secao`. O script grava sempre no mesmo nome quando não se usa `--multiplos`. O `.txt` das 05:46 e os dois `-multiplos-*.csv` estão intactos. **Recomendação:** o coordenador roda de novo `contagem-log-pacote.mjs --turno 2`, e o script passa a gravar `--secao` em outro nome.
8. **Bug latente em `contagem-log-pacote.mjs` (linhas 62 e 78).** A marca `outraSecao` vale para o arquivo de log inteiro. Um log que tenha votos da própria seção e depois declare outra seção mandaria esses votos para "de outra seção" e criaria um falso "sem rastro". Nestes 3 casos não muda nada, porque os logs marcados têm 0 votos.
9. **Critério do RS.** O script conta como rastro o voto "confirmado" sem "computado", mas não conta o ciclo identificado e interrompido às 09:02 ("Identificador digitado", "Foto apresentada", "Solicita digital"). Chamar esse voto de "sem rastro" é forte demais: ele tem rastro parcial. O efeito é de 1 voto.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Bug de leitura: log duplicado, log de outra seção, diretório de hash extra | Testada (3 lentes) | **Descartada.** Cada seção tem 1 diretório de hash. Deduplicar pelo hash da linha não muda nada. Em todos os casos o BU é maior que o log, não menor. |
| Diferença de definição: seção agregada, BU × oficial, fuso, enum | Testada (definições) | **Descartada.** Nenhuma das 3 é agregada, e o oficial é igual ao BU (224/217/92). |
| Log apagado na ME por uma urna intermediária com carga de outra seção, que grava o próprio log antes de recusar a MV (erro 72) | Testada (3 lentes + conferência própria) | **Confirmada no MA e na BA** pela ordem das mensagens. Nos 11.748 pacotes com 2+ logs, o sinal só aparece onde faltam votos. O teste tem pouco poder: são só 2 casos (ver Poder). |
| O log da urna que votou existe em outro pacote da zona (cópia ME/MI, outro turno) | Testada (reprodução, definições, alternativas) | **Descartada.** Nos pacotes dos dois turnos das zonas BA 0173 e MA 0047 não há log com votos de 25/10 da 0235 ou da 0609 fora do próprio pacote. |
| Os 36 votos do MA vieram da 01813459, de outra seção | Testada | **Refutada.** Erro 72 duas vezes, e a carga dela não está no `historicoCodigosCarga`. |
| 12/13 por biografia na BA vem de leitor ruim ou de UE2013, efeito da urna e não do eleitor | Testada (linha de base) | **Compatível.** 6% a 8% das sessões curtas de urnas substituídas e cerca de 24% das UE2013 (9/37, n pequeno). Não é provado para a 01681986, que não tem log. O "Device open error" foi em outra urna (ver Divergências, item 5). |
| Votos lançados na MV sem o eleitor, na janela sem log (BA 08:48:54 a 09:50:30; MA 08:00:01 a cerca de 10:25) | Não testável com arquivos públicos | **Aberta.** Contra: no MA, 32 de 36 votos têm digital conferida, pelo contador do BU e pelo tamanho assinado do `wsqbio.jez` (z = −0,5 com o BU; z = +2,35 se fossem só os do log). O ritmo é plausível (BA: 13 votos em até cerca de 61 min; MA: 1º turno, 65 votos das 08:00 às 10:25). A favor: na BA, 12 de 13 sem digital, e o `wsqman.jez` mostra cerca de 12 capturas a mais, que podem ser de qualquer dedo. |
| Assinatura inválida, arquivos alterados depois da urna | Testada (alternativas + conferência própria) | **Descartada** para BU, RDV, log e lista: 0 falha nas 22 conferências das 3 seções. Isso não alcança o que aconteceu na MV antes da urna de contingência. |
| RS: voto gravado na MV com o fim do log perdido na queda | Testada em parte | **Compatível**: fim abrupto às 09:02:34 e "Sincronização… origem na ME" às 09:40:20. É o mesmo tipo de caso das 3 seções do R4, mas aqui se perdeu mais linha. |
| Falso alarme por comparações múltiplas (3 seções × 3 categorias) | Testada (alternativas) | Bonferroni ×6 muda pouco. O problema do p é a heterogeneidade entre urnas, não o número de comparações. |

**Benignas supostas e recusadas pelo princípio 8:** "o mesário trocou a mídia corretamente" e "o técnico recarregou a urna por engano". Não contam como explicação. O que conta é o rastro técnico: o erro 72 bloqueou as urnas intrusas, e o histórico de cargas mostra que elas não gravaram votos.

## Poder do teste

- **Detecção de voto sem rastro (contagem):** poder total no 2º turno. Todas as 499.207 seções completas foram cruzadas BU × log, e as divergências foram conferidas no arquivo bruto. Um voto a mais no BU sem linha no log não escaparia. O 1º turno ainda não foi varrido por completo (está em carga).
- **O que esta contagem não detecta:** voto falso **com** linha no log. Uma liberação por biografia feita por mesário no lugar de um ausente gera log normal. Este achado não diz nada sobre isso. Isso é coberto pelos achados B1 e A7 (pareceres 01 e 10).
- **Mecanismo do erro 72:** o sinal só fica visível quando uma contingência posterior empacota o log da urna intrusa. Houve 4 erros 72 nos pacotes com 2+ logs, e só 2 vieram depois de votos. O mecanismo está mostrado nesses 2 casos. Que **todo** erro 72 depois de votos apague o log anterior é Hipótese, porque não há um 3º caso para testar.
- **Estatística dos 12/13:** sem poder. Uma UE2013 substituta honesta e uma liberação fraudulenta produzem o mesmo padrão nos contadores. Só o log da 01681986 ou os arquivos de digitais separariam os dois.
- **Tamanhos `wsq*`:** ajuste por zona (R² de 0,975 a 0,979) sobre o tamanho assinado no `.vsc`. É indício de quantas capturas existem, não de quem é o dedo. O conteúdo não é público.

## Pendências

1. **Logs que faltam (doc 07 C3):** pedir o log interno (MI) da urna 01663580 (MA 0609) e da 01681986 (BA 0235), mais o `0183317825102026090702-01.jez`, que é o log da MI da 01833178 guardado na recarga das 09:07.
2. **Arquivos de digitais:** pedir `wsqbio.jez`, `wsqman.jez` e `wsqmes.jez` da MA 0609 e da BA 0235. O hash deles está no `.vsc` assinado, então o TSE não pode trocá-los num pedido posterior. Com eles dá para conferir voto a voto se a digital capturada é do eleitor.
3. **Correções no texto do autor (não editadas aqui):**
   - tirar ou reescrever o p≈10⁻¹¹ (doc 03 e R2 do doc 05);
   - trocar "a urna que falhou é a mesma cujo log falta" pelo mecanismo do erro 72, como Fato;
   - separar as duas sessões da 01833178 na BA;
   - nomear a urna original do MA (01663580);
   - trocar "não publicado" por "nunca entrou no pacote assinado";
   - dizer que a assinatura foi verificada com o corte do certificado;
   - tratar o RS como mecanismo próprio;
   - registrar no doc 05 a recarga em campo da BA e a urna reserva com carga de outra seção no MA.
4. **Ferramentas:**
   - `src/lacres.js`: corrigir a leitura do certificado com byte a mais (dono: integridade);
   - `contagem-log-pacote.mjs`: marcar `outraSecao` por linha e gravar `--secao` em outro arquivo;
   - regenerar `log-pacote-2t.csv`.
5. **Engenharia (`engenheiro-seguranca-urna`):** conferir na documentação do TSE se gravar o log na ME antes de validar a MV é o comportamento previsto. Se for, é uma fragilidade de projeto: uma urna que vai ser recusada apaga a trilha da urna anterior.
6. **1º turno:** quando a carga terminar, repetir no 1º turno a varredura BU × log e a busca de erro 72 depois de votos.

## Comandos que reproduzem a revisão

```bash
# conferência própria (consolidação)
node scripts/auditoria/cetico-vsl-consolidacao.mjs      # lacres das 3 seções e linha do tempo das ligações
node scripts/auditoria/cetico-vsl-log-unico.mjs         # seções de 1 log com BU ≠ log no 2º turno inteiro
node scripts/sql.mjs "select p.logs_no_pacote>1 multi, count(*), sum(s.comparecimento>p.votos_computados), sum(s.comparecimento<p.votos_computados) from secao s join perfil_log p using(turno,uf,municipio,zona,secao,hash) where s.turno=2 group by 1"

# lente de reprodução
node scripts/auditoria/cetico-vsl-reproducao.mjs --turno 2 --secao ma/08893/0047/0609 --secao ba/35653/0173/0235 --secao rs/89060/0017/0191
node scripts/auditoria/cetico-vsl-contingencias.mjs --turno 2
node scripts/auditoria/cetico-vsl-linha-base.mjs
node scripts/auditoria/cetico-vsl-busca-urna.mjs --uf ba --zona 0173 --urna 01681986 --urna 01833178 --turno 2 --turno 1
node scripts/auditoria/cetico-vsl-busca-urna.mjs --uf ma --zona 0047 --urna 01663580 --urna 01813459 --turno 2 --turno 1
node scripts/auditoria/cetico-vsl-wsq.mjs --uf ba --zona 0173
node scripts/auditoria/cetico-vsl-wsq.mjs --uf ma --zona 0047

# lente de definições
node scripts/auditoria/cetico-vlc-dados-pacotes.mjs
node scripts/auditoria/cetico-vlc-dados-zona.mjs
node scripts/auditoria/cetico-vlc-dados-estatistica.mjs
node scripts/auditoria/cetico-vlc-dados-sessoes.mjs

# lente de explicações alternativas
node scripts/auditoria/cetico-vsla-alternativas.mjs --casos
node scripts/auditoria/cetico-vsla-alternativas.mjs --nacional
node scripts/auditoria/cetico-vsla-alternativas.mjs --binomial
node scripts/auditoria/cetico-vsla-calibracao.mjs
```

Saídas: `data/parsed/auditoria/cetico/cetico-vsl-*`, `cetico-vlc-*` e `cetico/vsla/`.
