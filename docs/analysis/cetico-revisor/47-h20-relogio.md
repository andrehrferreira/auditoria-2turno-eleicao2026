# 47. H20: relógio e ordem temporal da urna (engenheiro 11)

Parecer do revisor cético, 30/10/2026. Revisa:

- [engenheiro-seguranca-urna/11](../engenheiro-seguranca-urna/11-h20-relogio-e-ordem.md), com `seguranca-h20-*.mjs` e as saídas em `data/parsed/auditoria/engenheiro-seguranca-urna/h20/`;
- a linha H20 de [hipoteses.md](../../hipoteses.md).

**Caminho próprio.**

- **Leitura nova de todos os diários dos dois turnos** (`cetico-47-varredura.mjs`): 499.248 seções por turno, 0 erro de leitura. Diferenças de propósito em relação à leitura do engenheiro:
  - o dia da votação é decidido só pela data escrita na linha;
  - fica a cópia do diário com mais votos (o engenheiro fica com a de mais linhas);
  - **toda outra cópia que tem voto que a escolhida não tem também é testada**, na sua própria ordem física;
  - o retrocesso do relógio é classificado por janela curta (3 linhas) e também pela janela larga do engenheiro (30 linhas);
  - qualquer linha de acerto de hora depois da zerésima conta, de qualquer data e de qualquer seção declarada.
- **Consolidação** (`cetico-47-analise.mjs`): cobertura contra o BU, ordem, retrocessos, acertos depois da zerésima, teste do relógio pelo local de votação (com controle positivo e poder medido por injeção) e folga do recebimento no TSE.
- **Leitores de apoio:**
  - `cetico-47-bruto.mjs`: casos no bruto;
  - `cetico-47-receb-uf.mjs`: recebimento por UF e por local;
  - `cetico-47-candidatos.mjs` e `cetico-47-inicio.mjs`: separar atraso real de relógio errado;
  - `cetico-47-carga-2t.mjs`: carga das urnas novas no 2º turno;
  - `cetico-47-hash-linha.mjs`: somas de verificação de 64 bits.
- **Restrições respeitadas.** Nenhum CPF nem número de título lido ou gravado (sequências de 8 dígitos ou mais viram `#`). `data/raw` não foi varrido com `find`. No máximo 2 processos pesados. Sem rede.

## Vereditos

| # | Afirmação do engenheiro | Veredito | Em uma linha |
|---|---|---|---|
| 1 | 0 violação de ordem nos dois turnos (zerésima, abertura, votos, encerramento, BU) | **Sustentado com ressalvas** | Reproduzido por leitura própria, inclusive nos 267 votos do 1º turno que estão só em outra cópia do diário e que a conta dele não via. O alcance precisa ser dito: 159 + 54 votos do BU não têm linha no diário, e 3 seções não têm nenhuma zerésima no diário publicado. A descrição da BA 39934/0183/0175 está errada. |
| 2 | O relógio nunca voltou entre dois votos da mesma urna | **Sustentado** | 0 nos dois turnos, na leitura própria. |
| 3 | Os retrocessos do relógio têm explicação (acerto, bateria, horário de verão) | **Sustentado** | 1º turno: 275.164 retrocessos, número idêntico ao dele. Com marcadores de religamento mais completos, sobram 0 sem causa. Os 7 "sem causa" dele foram conferidos no bruto. Todo retrocesso depois da zerésima, no dia, é religamento no exterior. |
| 4 | 0 acerto de relógio no dia depois da zerésima | **Sustentado, e reforçado** | A urna **recusa** o ajuste de hora depois da zerésima e grava a recusa: 23 recusas em 14 urnas (1º turno) e 10 em 6 urnas (2º). A única mudança de hora depois da zerésima é a reaplicação automática do horário de verão ao religar, no exterior. |
| 5 | Recebimento no TSE antes da emissão do BU: só diferenças de minutos | **Sustentado** | 4 e 8 seções, as mesmas, com folga mínima de −2,5 e −0,87 min. Limite: no 2º turno esse teste externo quase não tem poder (só 1.095 seções com folga abaixo de 60 min). |
| 6 | 6 seções novas com relógio 1 h adiantado; efeito na H06 | **Sustentado com ressalvas** | As 6 conferem no bruto. A GO 92274/0119/0049 no 2º turno passa de Hipótese a Fato. A SP 71072/0280/0913 continua Hipótese. Os números da H06 reproduzem, mas a lista está incompleta (abaixo). |
| 7 | (limite) relógio atrasado não é detectado | **Não sustentado como limite total** | O teste pedido (encerramento contra a mediana do local) quase não tem poder, por causa da trava. Mas o começo do dia tem: o mesário chega pela hora da parede e a urna o faz esperar a trava da zerésima. Achei **2 seções com relógio 1 h atrasado**: PR 74357/0050/0033 (1º turno, Fato) e BA 34134/0171/0166 (2º turno, Hipótese forte), além de 1 com 30 min de atraso. |
| 8 | Hash de cada linha do diário não reproduzível | **Sustentado (é limite, não indício)** | As 8.786 tentativas são o total em 6 linhas de uma seção, não "por seção". Testei também 9 somas de 64 bits não criptográficas: 0 acerto. A integridade do diário inteiro já é conferida pela assinatura da urna. |

**Achados novos deste parecer (Fato, salvo onde dito), que o doc 11 não tem:**

- PR 74357/0050/0033: relógio 1 h **atrasado** no 1º turno, corrigido com +59 min entre os turnos;
- BA 34134/0171/0166: relógio 1 h atrasado no 2º turno (Hipótese forte);
- GO 93734/0133/0062: relógio 30 min atrasado no 1º turno;
- Lisboa (ZZ 29955/0001/3649, 3705 e 3785): relógio 1 h adiantado no 2º turno, porque o horário de verão europeu acabou na madrugada de 25/10 e a urna ficou ligada desde 24/10;
- RJ 60011/0214/0023: a 4ª urna da zona 0214 com +59 min na carga (urna original sem voto);
- o ponto cego do teste de acertos no 2º turno (carga de urna nova não lida);
- a trava da zerésima e a recusa do ajuste de hora depois da zerésima, dois controles técnicos com rastro.

## 1. Ordem zerésima → abertura → votos → encerramento → BU

### Reprodução (Fato)

| Medida (por urna) | 1º turno | 2º turno |
|---|---|---|
| Votos lidos na cópia escolhida | 125.274.062 | 128.235.189 |
| Votos só em outra cópia da mesma urna (5 seções) | 267 | 0 |
| Comparecimento no BU / votos com linha no diário | 125.274.487 / 125.274.328 | 128.235.243 / 128.235.189 |
| **Votos do BU sem linha no diário** | **159 em 9 seções** | **54 em 6 seções** |
| Votos antes da zerésima, antes de "Urna pronta", depois do encerramento, depois do BU (física e relógio) | 0 | 0 |
| Zerésima depois de "Urna pronta"; BU antes da confirmação do encerramento | 0 | 0 |
| Urna com voto sem zerésima própria (contingência) / sem marca de contingência | 2.134 / 1 | 1.444 / 1 |
| 1º voto da urna de contingência antes da zerésima da seção (relógio) | 0 | 0 |
| **Seções sem nenhuma zerésima no diário publicado** | **2 (368 votos com linha)** | **1 (188)** |
| Duas urnas da seção votando no mesmo intervalo | 2 (PR 74713/0078/0261 e RJ 60011/0214/0024) | 0 |
| Votos em outra cópia: violações de ordem / antes da zerésima da cópia escolhida | 0 / 0 | — |

- Os votos lidos são **iguais** aos do engenheiro e aos do H08: 125.274.062 e 128.235.189. A cobertura contra o BU é **igual** à do [parecer 25](25-votos-sem-log-reconciliacao.md): 159 e 54.
- **Ressalva 1 (absolvição falsa evitada):** no 1º turno, 267 votos em 5 seções estão só numa segunda cópia do diário da mesma urna. Exemplo: o arquivo da urna que gerou o pacote guarda a tarde, e a cópia aninhada guarda a manhã. A escolha "cópia com mais linhas" (engenheiro e H08) deixa esses votos de fora do teste de ordem. As seções são MG 44458/0103/0221, MG 47830/0165/0031, PR 75353/0002/0574, PR 76570/0010/0273 e RJ 58041/0155/0190. Testei cada uma dessas cópias na própria ordem física, e todos os votos contra a zerésima da cópia principal: **0 violação**. A conclusão não muda, mas o universo do teste passa a ser completo.
- **Ressalva 2 (alcance):** o teste só vê voto que tem linha no diário. Os 159 + 54 votos sem linha não têm hora nenhuma. Nas 3 seções sem zerésima no diário publicado, a ordem dos votos que têm linha só pode ser conferida contra "Urna pronta", não contra a zerésima. São elas:
  - BA 39934/0183/0175 (1º turno, 136 votos com linha);
  - SP 71072/0002/0035 (1º turno, 232 votos com linha);
  - MA 08893/0047/0609 (2º turno, 188 votos com linha).
  São as três contingências cujo diário da manhã não está no pacote ([parecer 25](25-votos-sem-log-reconciliacao.md)). "0 voto antes da zerésima" vale para os votos com linha, e não para essas manhãs.
- **Ressalva 3 (a parte de 1 voto de excesso no meu resumo):** a consolidação mostra "1 seção com mais votos no diário que no BU" (MG 44458/0103/0221, 226 × 225). É defeito meu: o mesmo voto estava em duas outras cópias e foi somado duas vezes. Não é achado.

### As 2 urnas sem zerésima e sem marca de contingência (conferidas no bruto)

- **BA 39934/0183/0175, 1º turno: a descrição do engenheiro está errada.** Ele lista os intervalos "08:06–12:23, 13:29–14:19 e 14:30–18:30" como sendo das urnas da seção. Os votos de 08:06 a 12:23 (100) são da urna 02423907, que declara "Seção Eleitoral: **0181**": são da seção vizinha, e já foram descontados pelo [parecer 25](25-votos-sem-log-reconciliacao.md). A 0175 tem:
  - a urna 02424441, com cópia que começa às 13:23 em "Iniciando registro do log na MI e na ME", pronta às 13:26 e 24 votos de 13:29 a 14:19;
  - a contingência 02429118, com 112 votos de 14:30 a 18:30.
  
  De 08:00 a 13:23 a seção **não tem diário**: são os 136 votos sem rastro. O mecanismo "a cópia publicada começa depois da sincronização" vale para a 02424441, mas o texto do engenheiro dá a entender que a manhã está coberta, e não está.
- **MG 40690/0016/0264, 2º turno: sustentado.** A urna 02129190 tem zerésima às 07:41, pronta às 08:00 e 46 votos de 08:01 a 10:41. A 02080602 tem cópia que começa às 11:56 em "Iniciando registro do log", sem "Urna ligada", pronta às 12:14 e 68 votos de 12:15 a 16:30. A 02092884 é a contingência das 18:27, só para gerar o BU. 46 + 68 = 114, que é o BU. Não há sobreposição.

## 2 e 3. Relógio que volta

| Retrocessos (linha com hora menor que a anterior, mesma urna) | 1º turno | 2º turno |
|---|---|---|
| Total no período | **275.164** (igual ao engenheiro) | 3.270 (engenheiro: 1.683; ver abaixo) |
| Com acerto de hora a até 3 linhas | 273.011 | 2.904 |
| Com religamento a até 3 linhas (ligada, início do logd, registro do log, fechamento) | 889 | 328 |
| Só com acerto na janela larga (30 linhas) | 1.264 | 38 |
| **Sem nenhum dos dois** | **0** | **0** |
| No dia da votação | 220 | 63 (igual ao engenheiro) |
| Depois da zerésima, no dia (exterior; religamento com horário de verão) | 51 (17 antes de abrir, 34 durante a votação) | 12 (durante a votação) |
| Entre dois votos seguidos da mesma urna | **0** | **0** |

- **Diferença no 2º turno:** quando a urna não tem nenhuma linha de 04/10, conto o diário inteiro, e o engenheiro começa em 05/10. Os 1.587 a mais são todos de carga e preparação de setembro, antes da zerésima. Não mudam nada.
- **Os 7 "sem causa" do engenheiro, conferidos no bruto:**
  - **RO 00035/0021/0257, 1º turno:** a urna original 02037848 voltou a 01/01/1970 várias vezes na preparação, de 29/09 em diante (bateria do relógio). O último retrocesso é "Fechando o arquivo de Log" seguido de "Iniciando registro do log na MI e na ME", em 1970. Não votou. Os 234 votos são da contingência.
  - **ZZ 29351/0001/1573, 30180/0001/0105, 30287/0001/0774 e 30783/0001/0459 (1º turno) e 29980/0001/3651 (2º turno):** o relógio volta cerca de 57 min no religamento, e o aplicativo reaplica o horário de verão ("Horário da urna alterado devido a horário de verão") poucas linhas depois. Na 30783/0459 isso aconteceu **no meio da votação**: voto às 08:28:38, desligada às 08:33, volta às 07:36:18, horário de verão às 07:36:31, nova "Urna pronta" às 08:39. Não houve voto entre o religamento e a correção.
  - **CE 14117/0013/0206, 2º turno:** a original teve erro de impressora às 07:39:58 e voltou com o relógio em 01/01/2026 00:07, com diário corrompido na mídia externa. Não votou no 2º turno. A reserva imprimiu zerésima às 08:39, abriu às 08:41 e votou de 08:43 a 16:32 (encerramento às 17:00; o texto do engenheiro diz "votou até 17:00", que é a hora do encerramento).
  - A classe "sem" do engenheiro some quando "Iniciando registro do log" e "Fechando o arquivo de Log" contam como religamento. É o caso das 4 do exterior, em que o "Urna ligada" vem depois da janela.
- **Contingências sem zerésima com retrocesso no dia** (meu leitor punha tudo "antes da zerésima" quando a urna não tem zerésima; conferi à parte): 5 no 1º turno e 4 no 2º. São religamento com horário de verão no exterior, a CE acima e duas reservas de SC 83518/0046 (0038 e 0042) carregadas **no próprio dia** às 09:45 e 09:27, com o retrocesso de 24 e 33 s na própria carga, horas antes da contingência.

## 4. Acerto de hora depois da zerésima (controle técnico com rastro)

| Linha de hora depois da 1ª zerésima do dia (qualquer data, qualquer seção) | 1º turno | 2º turno |
|---|---|---|
| "Data e hora atualizada" ou hora digitada (acerto efetivo) | **0** | **0** |
| "Iniciando aplicação AJUSTE DE DATA E HORA" seguida de "GAP erro 20 \| Validação do ADH \| ... não pode ser executado após a impressão da zerésima" | 23 em 14 urnas | 10 em 6 urnas |
| Falha ao iniciar o aplicativo de ajuste | 1 | 0 |
| "Horário da urna alterado devido a horário de verão" depois de religar (exterior, automático) | 57 | 13 |

- **Fato:** a urna **não aceita** acerto de hora depois da zerésima, e grava a tentativa. Isso é controle técnico com rastro (princípio 8), e explica o "0" do engenheiro: não é que ninguém tentou, é que a urna não deixa.
- **Fato:** a tentativa recusada é um bom indicador de relógio errado, porque mostra que alguém da mesa viu a hora errada. Nas 20 urnas com tentativa:
  - RJ 60011/0214/0022, 0023 e 0024: urnas originais com +59/+60 min na carga de 22/09. A **0023** não está no doc 11: sua urna original 01760689 tinha +59 min, não recebeu voto e foi trocada;
  - BA 35971/0028/0394 (−61 min na carga), MA 09210/0001/0677 (−64) e BA 34037/0063/0078 (−41): urnas originais com o relógio atrasado, trocadas pela reserva antes de qualquer voto;
  - BA 34134/0171/0166, 2º turno: ver item 7. A urna com o relógio atrasado **não** foi trocada;
  - nas demais, o acerto da carga é pequeno (de −9 a +22 min) ou zero.
- **Exterior:** depois de religar, o relógio da placa volta 1 h e o aplicativo soma de novo. É mudança automática e registrada, não acerto digitado.

## 5. Recebimento no TSE antes da emissão (limite externo)

- **Reproduzido (Fato):** com a mesma régua de fuso e a correção das 81 seções, 4 seções no 1º turno (MA 07404/0069/0295, PA 04057/0016/0010, PB 19810/0016/0195, PR 75353/0174/0427; mínimo −2,50 min) e 8 no 2º (PA 04057/0016/0019, 0023, 0077 e 0080; PA 04200/0102/0054, PA 04391/0002/0006, PA 05657/0014/0215, PR 78778/0052/0054; mínimo −0,87 min). São as mesmas seções do engenheiro.
- **Limite (absolvição falsa possível):** a folga positiva não diz nada sobre relógio adiantado de menos de 1 h nem sobre relógio atrasado. Uma folga abaixo de 60 min **exclui** relógio 1 h atrasado. Isso vale para **114.503 seções no 1º turno (23%)** e só **1.095 no 2º (0,2%)**, porque no 2º turno o TSE registrou quase tudo depois das 19h. No 2º turno, esse teste externo praticamente não existe.

## 6. As 6 seções com relógio 1 h adiantado

| Seção | Turno | O que conferi no bruto | Veredito |
|---|---|---|---|
| RJ 60011/0214/0279 | 1º | Carga 22/09: digitada 10:38 com a placa em 09:38 (+59). Pronta 08:41, 1º voto 09:07, encerramento 18:04. Em 25/10, às 08:41 do relógio, ajuste de −60 **antes** da zerésima do 2º turno. 0 voto na hora das 8h. | **Fato** |
| RJ 60011/0214/0022 (original) | 1º | Carga +60. Pronta 08:44:58, sem voto. Duas tentativas de ajuste recusadas depois da zerésima, às 09:06 e 09:14 do relógio. | **Fato** |
| RJ 60011/0214/0024 (original) | 1º | Carga +60. 5 votos de 09:04 a 09:12 no relógio, enquanto a reserva (relógio certo) já votava desde 08:54. Tentativa de ajuste recusada às 09:30. | **Fato** |
| PR 74713/0078/0261 (original) | 1º | Carga +58. 166 votos de 09:02 a 15:59 no relógio; a reserva (carga +1) vota desde 15:18. As duas não podem estar certas ao mesmo tempo. | **Fato** |
| GO 92274/0119/0049 | 1º e 2º | Carga +59 em 21/09. **O diário inteiro, da carga até o fim do 2º turno, não tem nenhum outro acerto nem retrocesso.** Os dois turnos: ligada às 08:12 e 08:16, zerésima às 08:39 e 08:46, pronta às 08:51 e 08:50 e 1º voto às 09:02 e 09:01. A mesa esperou a hora cheia nos dois. | **Fato nos dois turnos.** No 2º, o engenheiro diz Hipótese forte; como o relógio correu contínuo desde a carga com +59, o deslocamento no 2º turno vem do próprio diário. |
| SP 71072/0280/0913 | 1º e 2º | Carga −1 min (sem hora cheia). Só um retrocesso, de 41 s, na carga. Os dois turnos: ligada às 08:16 e 08:37, pronta às 08:31 e 08:44, 1º voto às 09:02 e 09:03 (espera pela hora cheia), 0 voto na hora das 8h, encerramento cerca de 1 h depois das vizinhas. | **Hipótese** (sustentada como tal). Não há prova de relógio errado no diário; o perfil é forte. |

**Efeito na H06 (votos depois das 17h).** Os números do engenheiro **reproduzem** pela leitura própria, voto a voto por hora:

| Seção | Turno | Depois das 17h | Depois das 18h | Estado |
|---|---|---|---|---|
| RJ 60011/0214/0279 | 1º | −15 | 0 | Fato |
| GO 92274/0119/0049 | 1º | −61 | −25 | Fato |
| GO 92274/0119/0049 | 2º | −15 | 0 | **Fato** (era Hipótese) |
| SP 71072/0280/0913 | 1º / 2º | −27 / −23 | 0 / 0 | Hipótese |
| RJ 0022, RJ 0024 e PR 0261 (originais) | 1º | 0 | 0 | os votos ficam antes das 17h nas duas réguas |

**A lista não está completa.** Falta, para a mesma tabela:

| Seção | Turno | Depois das 17h | Depois das 18h | Estado |
|---|---|---|---|---|
| PR 74357/0050/0033 (relógio **atrasado**, item 7) | 1º | **+16** (de 17:00 a 17:21 reais, contados como 16h) | 0 | Fato |
| RS 88994/0131/0007 (candidata do doc 07 da linha do tempo) | 1º | −30 (31 → 1) | −1 | Hipótese |
| BA 34134/0171/0166 (atrasado) | 2º | 0 | 0 | Hipótese forte |

- Só com os Fatos: 1º turno −60 depois das 17h (−15 −61 +16) e −25 depois das 18h; 2º turno −15. Com as hipóteses: 1º turno −117 e −26; 2º turno −38. Nenhuma conclusão da H06 muda.
- **RS 88994/0131/0007:** o teste pelo local (item 7) a marca com tudo 1 h depois das vizinhas, inclusive a hora de ligar a urna (08:26 contra 07:20). É a mesma leva de carga da 0008 (Fato no doc 07), em que 10 outras urnas precisaram de cerca de −1 h e esta não teve acerto. O doc 11 não a cita. Fica Hipótese, como no doc 07.
- **Lisboa, 2º turno (Fato):** ZZ 29955/0001/3649, 3705 e 3785. A urna foi ligada em 24/10 às 13:41, aplicou o horário de verão e **ficou ligada a noite inteira**: não há "Urna ligada" em 25/10. O horário de verão de Portugal acabou às 02:00 de 25/10, então o relógio ficou 1 h à frente. As 3 urnas ficaram prontas às 07:46, 07:50 e 08:00 reais. O 1º voto foi às 08:04, 08:00 e 08:04 reais: a mesa esperou a hora local. Os 87 votos da "hora das 17h" (26 + 28 + 33) foram às 16h reais. **Nenhum voto fora de 08:00–17:00 reais.** O doc 11 diz "Exterior: pronta antes das 08:00 locais: 0"; pela hora real são 2. Nenhuma outra cidade do exterior aparece deslocada, nem inteira (as medianas por cidade estão entre 08:01 e 08:05 no 1º voto) nem em seções isoladas.

### Teste por local de votação (controle positivo e falsos positivos)

- **Método:** a zerésima, o último voto e o encerramento de cada seção comparados com a mediana das outras seções do mesmo local, no relógio da urna; marcada se os três ficam pelo menos 45 min depois. Avaliadas 424.503 seções (1º turno) e 424.574 (2º); fora, 74.658 e 74.598 em locais com menos de 4 seções, e 46 e 35 sem os horários.
- **Marcadas:** 44 no 1º turno e 6 no 2º.
- **Controle positivo:**
  - pega GO 0049 e RJ 0279 no 1º turno, e GO 0049 e SP 0913 no 2º;
  - não pega as urnas originais de RJ 0022, 0024 e PR 0261, porque no nível da seção os horários delas se misturam com os da reserva.
- **Poder medido:** mesma seção deslocada +1 h, 83% no 1º turno e 88% no 2º.
- **Falsos positivos:** "tudo 1 h depois" também é **atraso real**. Das 44 do 1º turno:
  - 33 usaram a mesma urna nos dois turnos, sem acerto de hora, e o 2º turno foi normal. Relógio igual e outro turno normal significa relógio certo e atraso real;
  - 2 abriram na trava no 2º turno com a mesma urna e só fecharam tarde pela prorrogação;
  - 7 trocaram de urna; as que conferi no bruto (AL 27995/0027/0061, ES 56472/0024/0072) são reserva que abriu às 9h;
  - 2 são relógio errado (GO e RJ 0279).
  
  No 2º turno, MG 54070/0280/0217 tem tudo 1 h depois. Mas é a mesma urna do 1º turno, sem acerto nem retrocesso entre os turnos, e no 1º turno andou com as vizinhas: foi atraso real (abriu às 09:01 e votou até 17:55).
- **AM 02550/0068/0657 e 0789 (Manaus, 1º turno):** marcadas pelo teste. A carga das urnas usadas foi +2 e +3 min sobre a placa, e outra urna da mesma equipe foi corrigida em −60 no mesmo dia. As duas eram reserva (a original da 0657 ficou presa na trava da zerésima de 04:49 a 05:46 do relógio e foi trocada). No 2º turno, com as mesmas urnas e sem acerto, andaram com as vizinhas. O recebimento no TSE não desempata: a folga é de 30 a 96 min nas duas leituras. Pela regra acima, o relógio estava certo e o 1º turno começou tarde. **Fica como atraso real, não como relógio errado, com ressalva:** a leitura oposta (relógio na hora de Brasília) implicaria abertura antes das 08:00 de Brasília nos dois turnos, e nada nos arquivos públicos a exclui por completo. Ata da seção resolve.

## 7. Relógio atrasado: o teste pedido e um teste com poder

**Por que o encerramento contra a mediana do local não serve.** A urna tem três travas no próprio relógio, somada a diferença do fuso: a zerésima só a partir das 07:00 (a urna grava "Aguardando data e hora para emissão da zerésima" e libera às 07:00:00), "Urna pronta" só a partir das 08:00, e o encerramento só a partir das 17:00. Com o relógio 1 h atrasado, a trava segura o encerramento até as 17:00 do relógio, que são 18:00 reais. **No relógio da urna, o encerramento parece normal.**

| Teste (universo, contra a mediana das outras seções do local) | 1º turno | 2º turno |
|---|---|---|
| Encerramento 45 min ou mais **antes** do local (o teste pedido) | 4.453 seções | 706 |
| **Poder** desse teste contra relógio 1 h atrasado (injeção de −1 h em cada seção, respeitando a trava) | **7,1%** | **1,5%** |
| Sinal de **início**: urna ligada ≥ 45 min antes do local, zerésima até 10 min depois da trava, abertura na trava | 288 | 278 |
| Sinal de **fim**: último voto ≥ 45 min antes do local e a mesa esperou ≥ 45 min a trava do encerramento | 65 | 145 |
| **Os dois sinais** | **0** | **1** (BA 34134/0171/0166) |
| Poder dos dois sinais juntos / de algum deles (mesa seguindo a hora da parede) | 70,5% / 97,6% | 86,8% / 99,6% |

- **O teste pedido quase não tem poder.** As seções que ele marca são de locais onde as vizinhas fecharam tarde (fila), e não relógio atrasado.
- **O sinal de início tem poder mesmo se a mesa seguir o relógio da urna no fim do dia:** o mesário chega pela hora da parede, liga a urna, e ela o faz esperar a trava da zerésima. Os 288 e 278 marcados pelo início se resolvem assim:
  - **245 e 236** usaram a mesma urna nos dois turnos, sem acerto de hora, e o outro turno não tem o sinal: relógio certo, mesa que chegou cedo;
  - **38** têm o sinal nos dois turnos com a mesma urna. Em 18 delas, a folga do recebimento no 1º turno é menor que 60 min, o que **exclui** relógio atrasado. As outras 20 têm o último voto alinhado com as vizinhas nos dois turnos e nenhum acerto de hora cheia. O mais provável é mesa que chega cedo, o mesmo padrão das 18 provadas, mas os arquivos públicos não excluem por completo;
  - as restantes trocaram de urna ou têm acerto de hora cheia, e foram lidas no bruto (abaixo).
- **Cruzamento com a carga:**
  - no 1º turno, há 236 urnas com voto, nos estados com hora de Brasília, que tiveram acerto de cerca de −1 h. Só 1 tem o sinal: a PR 74357/0050/0033. As outras 235 têm zerésima e abertura no horário das vizinhas: o acerto corrigiu uma placa adiantada;
  - fora da zona 0053 de MT e do exterior, só 4 urnas têm correção de hora cheia de **sinal oposto** entre os turnos: Maués 0119 e 0120 (doc 07), RJ 0279 e PR 74357/0050/0033.

**Os casos (Fato, salvo onde dito):**

- **PR 74357/0050/0033, 1º turno: relógio 1 h atrasado (Fato).**
  - Carga em 24/09: digitada 12:08 com a placa em 13:07 (−59). No Paraná a hora é a de Brasília.
  - No dia: ligada às 06:21 do relógio (vizinhas 07:24); "Aguardando data e hora para emissão da zerésima" às 06:24 e 06:30, com dois religamentos; zerésima às 07:01 (trava); pronta às 08:00:02 (trava); último voto às 16:21 (vizinhas 17:02); encerramento às 17:01 (trava).
  - Em **15/10, ajuste de +59** ("Ajuste de Data e Hora 15/10/2026 - 14:55:00 foi digitada pelo operador", com o relógio em 13:55). No 2º turno, normal: ligada às 07:10, pronta 08:00, encerramento 17:02.
  - **Em hora real, a seção abriu às 09:00 e o último voto foi às 17:21.** 0 voto antes das 8h. 16 votos depois das 17h reais (contados como 16h). Encerramento às 18:01 reais.
  - O voto da seção (50,0% do 13 contra 43,4% no resto do local, 1º turno) é igual no 2º turno com o relógio certo (53,1% × 46,9%). É composição da seção, não efeito do relógio.
- **BA 34134/0171/0166, 2º turno: relógio 1 h atrasado (Hipótese forte).**
  - Urna 01658717, usada pela primeira vez na seção no 2º turno. Carga em 24/09: digitada 18:03 com a placa em 19:03 (−61). Na Bahia a hora é a de Brasília.
  - No dia: ligada às 06:34 (vizinhas 07:30); 12 vezes "Aguardando data e hora para emissão da zerésima" de 06:40 a 06:54; zerésima às 07:02 (trava); pronta às 08:00:01 (trava).
  - Às 11:05, **tentativa de ajuste de hora recusada** (erro 20).
  - Último voto às 15:59 (vizinhas 16:49). **Três tentativas de encerrar recusadas** pela trava, às 16:20, 16:20 e 16:39. Encerramento às 17:00:28.
  - Leitura: a mesa sabia a hora certa, e a urna estava 1 h atrás. Em hora real, abriu às 09:00 e votou até 16:59. 0 voto depois das 17h reais. Voto da seção igual ao do local (72,5% × 71,9%).
  - Não é Fato porque não há correção posterior nem prova externa (o recebimento do 2º turno é todo depois das 19h).
- **GO 93734/0133/0062, 1º turno: relógio 30 min atrasado (Fato).** Carga com −30 min. Ligada às 06:33, zerésima às 07:01 (trava), pronta às 08:00, último voto às 16:15. Em hora real, abriu às 08:30. Sem efeito em voto fora do horário.
- **Ponto cego do teste de acertos do engenheiro (absolvição falsa):** no 2º turno, ele só lê o diário a partir de 05/10 quando a urna não tem linha de 04/10. Assim, **a carga de setembro de uma urna que votou pela primeira vez na seção no 2º turno não foi lida.**
  - Li essa carga nas 4.513 urnas nessa situação: 18 têm acerto de hora cheia;
  - 12 são exterior e AM, onde a placa vem na hora de Brasília e o operador põe a hora local;
  - das 6 do resto do Brasil, uma é a BA 0166;
  - DF 97012/0015/0318 teve duas cargas em 24/10 (+58 e depois −60, líquido −2);
  - RS 86592/0165/0105 é reserva que assumiu depois do último voto da original, cujo relógio estava certo: o +60 corrigiu uma placa atrasada;
  - CE 13250/0068/0091, PB 19399/0014/0221 e RJ 60011/0192/0136 têm zerésima no horário das vizinhas, então o acerto corrigiu a placa.
- **O que continua sem rastro:** relógio errado que **não mudou** entre os turnos, numa seção em que a mesa chegou também deslocada e seguiu o relógio da urna o dia todo. Só a ata ou um carimbo de hora externo resolvem.

## 8. Hash de cada linha do diário

- **Reproduzido:** `seguranca-h20-hash-linha.mjs` dá 8.786 tentativas e 0 acerto. **Correção de texto:** as 8.786 são o total sobre as 6 primeiras linhas de **uma** seção (cerca de 1.464 por linha), não "por seção".
- **Ampliado:** o valor tem 16 hexadecimais (64 bits), o tamanho de somas não criptográficas, que o teste original não cobria. Testei CRC-64 (ECMA-182, XZ, ISO nas duas formas, WE, Redis), FNV-1 e FNV-1a de 64 bits e CRC-32 duplo, nas mesmas combinações e também como continuação do valor anterior. Foram 1.692 tentativas por seção, em AC 01007/0009/0001 (2º turno) e SP 71072/0001/0001 (1º turno): **0 acerto**. Os autotestes do código batem com os valores de referência.
- **Alcance (limite, não indício):** quem está de fora não consegue conferir o diário linha a linha. Um algoritmo não publicado é comum em registro com segredo e não sugere adulteração.
- **Outra forma de conferir a integridade (Fato, tópico 1 da perícia):** o diário é um dos arquivos lacrados pela urna:
  - o pacote de lacres traz a impressão digital do arquivo do diário, assinada pela chave da urna;
  - a assinatura e a carteira da urna foram conferidas em **499.207 pacotes em cada turno, com 0 falha**.
  
  Isso prova que o diário publicado é **byte a byte** o que a urna fechou e assinou. Não prova que as horas escritas estavam certas: o relógio é o que a urna tinha. Também não protege contra uma urna com programa adulterado que escrevesse e assinasse um diário falso. Esse risco é o da assinatura do programa, outro tema. Se o hash de linha fosse público, só acrescentaria a conferência da **ordem interna**, que a assinatura do arquivo inteiro já garante depois do fechamento.

## Explicações alternativas: testadas e supostas

| Explicação | Situação |
|---|---|
| Ordem "limpa" só porque a leitura escolhe uma cópia do diário | **Testada:** as 6 cópias com voto exclusivo foram lidas, com 0 violação |
| Votos de outra seção misturados | **Testada:** 100 (1º turno) e 304 (2º turno) votos de urna que declara outra seção, separados, iguais ao parecer 25 |
| "Tudo 1 h depois" é relógio adiantado | **Testada e separada:** mesma urna e relógio sem mudança mostram atraso real em 33 + 2 + 1 seções |
| "Ligada cedo e presa na trava" é relógio atrasado | **Testada e separada:** 481 das 566 marcações são mesa que chegou cedo (mesma urna e outro turno normal); 18 excluídas pelo recebimento; 20 ficam sem decisão |
| Acerto de −1 h na carga deixa o relógio atrasado | **Testada:** em 235 de 236 urnas do 1º turno, a zerésima e a abertura batem com as vizinhas, então o acerto corrigiu a placa |
| Horário de verão no exterior | **Testada no bruto** (religamento e fim do horário de verão em Lisboa) |
| "A mesa esperou a hora certa" como prova do relógio | **Não usada como controle.** Uso o horário da mesa como dado (o que a mesa fez fica no diário), e não como garantia. Com o relógio errado, a trava técnica abre e fecha na hora errada (princípio 8). |

## Textos para leigos (para o tópico 14 da perícia)

**A ordem dos acontecimentos dentro da urna.** A urna anota num diário cada coisa que acontece, com data e hora. A ordem certa é sempre a mesma: primeiro o relatório que mostra a urna vazia (a "zerésima"), depois a urna é liberada para votar, depois vêm os votos, depois o encerramento e por fim o boletim com o resultado. Conferimos essa ordem em todos os diários dos dois turnos, uma linha depois da outra, e também pelo relógio. Nenhum voto aparece antes da zerésima nem depois do encerramento, e nenhum boletim foi gerado antes do último voto. Também não há caso de duas urnas da mesma seção recebendo votos ao mesmo tempo, salvo duas seções do 1º turno em que o relógio de uma das urnas estava errado (explicado adiante). O teste só alcança os votos que têm linha no diário. Em poucas seções em que a urna foi trocada, o diário da primeira urna não chegou ao pacote publicado: 159 votos no 1º turno e 54 no 2º estão no boletim sem linha no diário, e nesses não há hora para conferir.

**O relógio nunca andou para trás entre dois votos.** Em todos os pares de votos seguidos da mesma urna, nos dois turnos, a hora do segundo nunca é menor que a do primeiro. O relógio da urna volta às vezes, mas sempre por um motivo que fica escrito no diário: alguém acertou a hora na preparação, a bateria do relógio acabou e a urna voltou a uma data padrão (como 1º de janeiro), ou, no exterior, a urna foi religada e reaplicou o horário de verão do país. É como um relógio de cozinha que, ao faltar luz, volta a marcar meia-noite: dá para ver no diário quando isso aconteceu.

**Ninguém consegue mudar a hora da urna depois da zerésima.** A urna tem uma trava: depois de imprimir a zerésima, ela recusa o aplicativo de acerto de hora e anota a recusa. Nos dois turnos, a urna recusou 33 tentativas, em 20 urnas, e nenhum acerto de hora foi feito depois da zerésima. Essas tentativas são úteis: mostram onde alguém da mesa percebeu que o relógio estava errado.

**Relógios errados que encontramos.** A urna também tem travas de horário: só imprime a zerésima a partir das 7h, só abre para votos a partir das 8h e só deixa encerrar depois das 17h. Mas essas travas contam no relógio da própria urna, e a hora da urna é digitada por uma pessoa na preparação. Se a hora digitada estiver errada, a trava funciona na hora errada. Encontramos:

- Seções em que o relógio estava **1 hora adiantado**: no Rio de Janeiro, em Goiás, no Paraná e, no 2º turno, em 3 seções de Lisboa. Em Lisboa, a urna ficou ligada durante a madrugada em que acabou o horário de verão europeu e não atrasou o relógio. Nessas seções, a mesa esperou a hora certa para chamar o primeiro eleitor, e nenhum voto foi dado antes das 8h reais.
- Duas seções com o relógio **1 hora atrasado**, uma no Paraná (1º turno) e uma na Bahia (2º turno), e uma em Goiás com 30 minutos de atraso. Nas duas de 1 hora, a trava fez a urna abrir só às 9h reais, e a mesa só conseguiu encerrar às 18h reais. No Paraná o erro foi corrigido antes do 2º turno. Nenhum voto foi dado antes das 8h reais. No Paraná, 16 votos foram dados entre 17h e 17h21 reais e eram contados como se fossem antes das 17h. Na Bahia, o último voto foi às 16h59 reais. A diferença de voto dessas seções em relação às vizinhas é a mesma nos dois turnos, com o relógio errado ou certo, então não vem do relógio.
- Em várias outras seções, a urna original estava com o relógio errado e foi trocada pela reserva antes de receber voto.

Esses erros mudam muito pouco a conta de votos dados depois das 17h: no 1º turno, a conta cai em 60 votos, em mais de 3,6 milhões.

**A hora de chegada ao TSE.** O TSE anota a hora em que recebeu cada boletim. Nenhum boletim pode chegar antes de ser feito. Só 4 boletins no 1º turno e 8 no 2º aparecem "chegando antes", e todos por no máximo 2 minutos e meio: são relógios de urna alguns minutos à frente do relógio do TSE, não horas. Essa conferência externa tem limite: no 2º turno, o TSE só registrou os boletins depois das 19h, e por isso ela não serve para achar um relógio atrasado.

**O lacre de cada linha do diário.** Cada linha do diário termina com um código de 16 letras e números, que parece amarrar a linha à anterior, como os elos de uma corrente. A fórmula desse código não é pública. Testamos mais de dez mil combinações de fórmulas conhecidas e nenhuma reproduz o código. Isso **não é sinal de fraude**: é um limite. Quem está de fora não consegue conferir o diário linha a linha. Mas o diário inteiro é conferido de outro jeito: ele é um dos arquivos lacrados pela própria urna ao fim do dia, e o lacre foi conferido em todas as seções dos dois turnos, sem nenhuma falha. Isso prova que o diário publicado é exatamente o que a urna fechou. Não prova que as horas escritas estavam certas, porque a hora é a do relógio da urna.

## O que fica fora (do relatório como Fato)

- **SP 71072/0280/0913, RS 88994/0131/0007 e BA 34134/0171/0166** como relógio errado: são Hipótese (forte na BA). Entram, se entrarem, como Hipótese ou Pendente.
- **As 20 seções** com o sinal de início nos dois turnos e sem exclusão pelo recebimento, e **Manaus 0657 e 0789**: sem decisão nos arquivos públicos (Pendente: ata da seção).
- **Relógio errado que não mudou entre os turnos, numa seção em que a mesa também seguiu o relógio da urna o dia todo:** não deixa rastro nos arquivos públicos. Também fica Pendente.
- **"0 voto antes da zerésima"** não vale para os 159 + 54 votos sem linha no diário nem para as manhãs das 3 seções sem zerésima no diário publicado.
- **Efeito na H06** só com os Fatos (1º turno −60 depois das 17h e −25 depois das 18h; 2º turno −15). Os números com hipóteses ficam em análise.
- **Integridade da ordem linha a linha:** sem a fórmula do código de cada linha, ela não é conferível por quem está de fora. A integridade do arquivo inteiro é Fato pela assinatura da urna.

## Recomendações ao coordenador

1. **No doc 11 e na linha H20:**
   - corrigir a descrição da BA 39934/0183/0175 (a manhã não tem diário, e o intervalo 08:06–12:23 é da seção 0181);
   - escrever "8.786 tentativas em 6 linhas de uma seção";
   - passar GO 0049 no 2º turno a Fato;
   - acrescentar RJ 0214/0023 (urna original +59), PR 74357/0050/0033 (atrasado, Fato), BA 34134/0171/0166 (atrasado, Hipótese forte), GO 93734/0133/0062 (30 min) e Lisboa 3649, 3705 e 3785 (2º turno, horário de verão, Fato);
   - trocar o limite "relógio atrasado não é detectado" por "detectado pelo início do dia, com poder de cerca de 90%; sem rastro só quando a mesa também chega deslocada".
2. **Tabela de correção de horário (doc 07 da linha do tempo):** acrescentar a PR 74357/0050/0033 (1º turno, −1 h, +16 votos depois das 17h) e Lisboa (2º turno, +1 h, sem voto fora do horário), e manter RS 0007 e SP 0913 como hipótese.
3. **Teste de acertos do engenheiro:** no 2º turno, ler também a carga das urnas novas na seção (ponto cego deste parecer).
4. **Pedidos ao TSE e aos TREs:**
   - atas das seções PR 74357/0050/0033 (1º turno), BA 34134/0171/0166 (2º turno), AM 02550/0068/0657 e 0789 (1º turno) e SP 71072/0280/0913 (dois turnos);
   - a especificação do código de cada linha do diário e das travas de horário (zerésima, abertura, encerramento) por fuso.

## Comandos

```bash
# Leitura própria de todos os diários (cerca de 2 h por turno; 1 processo por turno)
node scripts/auditoria/cetico-47-varredura.mjs --turno 1
node scripts/auditoria/cetico-47-varredura.mjs --turno 2
# Consolidação: cobertura, ordem, retrocessos, acertos, teste por local, poder e recebimento (≈ 5 min)
node --max-old-space-size=8192 scripts/auditoria/cetico-47-analise.mjs
# Separar atraso real de relógio errado
node scripts/auditoria/cetico-47-candidatos.mjs
node scripts/auditoria/cetico-47-inicio.mjs
# Carga das urnas novas no 2º turno (ponto cego)
node --max-old-space-size=6144 scripts/auditoria/cetico-47-carga-2t.mjs
# Hash de linha: somas de 64 bits não criptográficas
node scripts/auditoria/cetico-47-hash-linha.mjs --turno 2 --secao ac/01007/0009/0001
node scripts/auditoria/cetico-47-hash-linha.mjs --turno 1 --secao sp/71072/0001/0001
# Casos no bruto
node scripts/auditoria/cetico-47-bruto.mjs --turno 2 --secoes pr/74357/0050/0033 --dias 04/10/2026,25/10/2026
node scripts/auditoria/cetico-47-bruto.mjs --turno 2 --secoes ba/34134/0171/0166 --dias 25/10/2026
node scripts/auditoria/cetico-47-bruto.mjs --turno 2 --secoes zz/29955/0001/3649,zz/29955/0001/3785 --dias 24/10/2026,25/10/2026
node scripts/auditoria/cetico-47-bruto.mjs --turno 1 --secoes ba/39934/0183/0175 --dias 04/10/2026
node scripts/auditoria/cetico-47-bruto.mjs --turno 2 --secoes mg/40690/0016/0264 --dias 25/10/2026
node scripts/auditoria/cetico-47-bruto.mjs --turno 1 --secoes ro/00035/0021/0257,zz/30783/0001/0459 --so-retrocessos
# Recebimento no TSE de um local de votação inteiro
node --max-old-space-size=4096 scripts/auditoria/cetico-47-receb-uf.mjs --uf am --local 02550/0068/1651
```

Saídas em `data/parsed/auditoria/cetico-revisor/47/`:

- `1t/`, `2t/`: uma linha por seção;
- `analise.json`, `analise.out` e `candidatos.csv`;
- `carga-2t.json`.
