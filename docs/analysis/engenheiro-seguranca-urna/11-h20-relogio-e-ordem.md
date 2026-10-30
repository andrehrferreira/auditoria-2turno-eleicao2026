# 11. H20: relógio e ordem temporal (zerésima → abertura → votos → encerramento → BU)

Engenheiro de segurança, 30/10/2026. Hipótese H20 de [hipoteses.md](../../hipoteses.md), plano da discussão T19 ([sintese](../modelos/T19/sintese.md)). Universo completo dos dois turnos: 499.248 seções por turno, todos os diários lidos do `.jez` bruto. Sem amostra.

## Resposta curta

- **Fato.** Nos dois turnos, em todas as urnas, a ordem zerésima → "Urna pronta" → votos → confirmação do encerramento → BU **não tem nenhuma violação**, nem pela ordem física das linhas, nem pelo relógio: 0 voto antes da zerésima, 0 antes de "Urna pronta", 0 depois do encerramento, 0 BU gerado antes do último voto, 0 zerésima depois da abertura, 0 par de urnas da mesma seção votando ao mesmo tempo no 2º turno.
- **Fato.** O relógio nunca volta entre dois votos seguidos da mesma urna (0 em 252,5 milhões de pares, H08). Todo retrocesso de relógio do diário tem causa no próprio diário: acerto digitado, religamento com relógio zerado ou horário de verão do exterior. Sem causa visível sobraram 7 nos dois turnos, todos explicados no bruto (relógio zerado em 1970/2026, horário de verão em Los Angeles e no exterior).
- **Fato.** Nenhum acerto de relógio no dia da votação depois da zerésima (109 urnas acertaram o relógio no dia no 1º turno e 61 no 2º, todas antes da zerésima).
- **Fato.** Limite externo do TSE: com a correção das 81 seções do doc [linha-do-tempo/07](../linha-do-tempo/07-fuso-mt-1turno.md), só **4 BUs (1º turno) e 8 (2º turno)** aparecem "recebidos antes de emitidos", todos por diferença de **no máximo 2,5 min** entre o relógio da urna e o do TSE. Sem a correção, eram 60 no 1º turno. No exterior, o fuso mínimo exigido pela física (até 1,36 h à frente de Brasília) é compatível com o fuso real de todas as cidades.
- **Fato (novo).** Além das 81 seções já corrigidas, achei **mais 6 seções com urna 1 h adiantada**, todas sem voto antes das 8h de Brasília:
  - **RJ 60011/0214/0279** (1º turno): hora digitada +59 min na carga, corrigida −60 min pelo aplicativo de ajuste na manhã do 2º turno;
  - **RJ 60011/0214/0022** e **RJ 60011/0214/0024** (1º turno, urna original que quebrou): a mesma equipe de carga digitou +60 min em 22/09;
  - **PR 74713/0078/0261** (1º turno, urna original): carga com +58 min;
  - **GO 92274/0119/0049** (candidato do doc 07): carga com +59 min, nunca corrigida. No 1º turno é Fato; no 2º turno é Hipótese forte (mesmo perfil, sem acerto posterior).
- **Hipótese (nova).** **SP 71072/0280/0913** tem o perfil de relógio 1 h adiantado nos dois turnos, sem nenhum acerto digitado de hora cheia.
- **Fato.** Pela régua do município, nenhuma seção abriu antes das 8h de Brasília no 2º turno; se GO e SP estiverem mesmo adiantadas, ficaram prontas às 07:50 e 07:44 reais.
- **Fato.** No 1º turno, além das 62 já conhecidas (zona 0053 de MT e outras), as urnas adiantadas acima ficaram prontas entre 07:31 e 07:51 reais. Nenhuma recebeu voto antes das 08:00.
- **Fato.** O voto dessas seções não destoa do resto do mesmo local de votação: até 2,9 pontos percentuais no % do 13, na faixa comum entre seções vizinhas.
- **Limite.** O "hash de encadeamento" de cada linha do diário **não é reproduzível** com algoritmos padrão: 8.786 combinações testadas, 0 acerto. A ordem física do arquivo é a única ordem que dá para conferir.

## O ataque e o rastro esperado

| Ataque | O atacante precisaria | Rastro esperado | Procurado em |
|---|---|---|---|
| Inserir votos antes da abertura ou depois do encerramento, mascarados pela hora | Acesso à urna fora do horário; ou relógio adulterado | Voto antes da zerésima ou de "Urna pronta"; voto depois de "Procedimento de encerramento confirmado"; BU antes do último voto | Ordem física e relógio, por urna (item 1) |
| Reescrever o diário ou reordenar linhas | Chave do diário (o encadeamento de hash) | Hora que volta sem acerto registrado; linha fora de ordem | Retrocessos por classe (item 2) |
| Deslocar a janela de votação (relógio 1 h à frente ou atrás) | Digitar a hora errada na carga ou no aplicativo de ajuste (ADH); não pede chave | Abertura antes das 08:00 de Brasília; perfil de votos por hora deslocado; encerramento 1 h depois dos vizinhos; recusas da trava de encerramento | Itens 3 e 3b |
| Segurar o BU e trocar o resultado depois | Acesso ao caminho urna → TSE | Recebimento no TSE antes da emissão (impossível) ou atraso anômalo | Item 4 |

Princípio 8 (doc 01): a hora da urna é **digitada por gente** na carga e no ADH. A trava de abertura (08:00) e a de encerramento (17:00) contam no relógio da própria urna, então só protegem se a hora digitada estiver certa.

## Método

### Leitura (universo completo)

- Leitor próprio (`seguranca-h20-varredura.mjs`): todos os pacotes dos dois turnos, todos os `logd.dat` (inclusive o da urna original aninhado no pacote de contingência), separados por urna, **na ordem física**, sem reordenar por hora.
- Cópias da mesma urna (MI/ME) contam uma vez: fica a cópia com mais linhas no período.
- Período do turno:
  - 1º turno: o diário inteiro do pacote do 1º turno;
  - 2º turno: tudo depois da última linha datada de 04/10.
  - A data sozinha não basta: na carga, antes de o operador digitar a hora, o relógio interno pode marcar uma data de outubro (ex.: AC 01023/0001/0584, relógio em 06/10 durante a carga de 25/09).
- Trecho do dia: linhas datadas do dia **depois** da última linha datada de antes do dia. Linhas datadas do dia mas gravadas antes (relógio interno no dia da eleição durante a carga) ficam fora e são contadas à parte.
- Eventos do dia: só as linhas da seção que a urna declarou ("Seção Eleitoral: NNNN"), como no H08.

### Conferência da leitura

| Turno | Seções | Sem log | Fluxos de urna | Com voto | Votos no diário | H08 (leitura independente) |
|---|---|---|---|---|---|---|
| 1º | 499.248 | 41 | 502.338 | 501.308 | 125.274.011 + 51 fora do trecho = **125.274.062** | 125.274.062 |
| 2º | 499.248 | 41 | 501.996 | 500.620 | **128.235.189** | 128.235.189 |

Os 51 votos "fora do trecho" são de PR 74357/0050/0254. A urna original votou de 08:05 a 10:09. Às 10:11 foi desligada e voltou com o relógio no ano **2000** (`04/10/2000 10:24:06 LOGD Início das operações do logd`). Depois disso, a reserva assumiu às 11:51 e recebeu 212 votos. 51 + 212 = 263 = BU. A ordem física está certa; só a data das linhas posteriores é que ficou errada.

## Fatos

### 1. Ordem zerésima → abertura → votos → encerramento → BU

| Medida (por urna) | 1º turno | 2º turno |
|---|---|---|
| Urnas com voto e zerésima no dia | 499.173 | 499.175 |
| Votos antes da zerésima (física / relógio) | 0 / 0 | 0 / 0 |
| Votos antes de "Urna pronta" (física / relógio) | 0 / 0 | 0 / 0 |
| Urnas com voto sem "Urna pronta" | 0 | 0 |
| Votos depois de "Procedimento de encerramento confirmado" (física / relógio) | 0 / 0 | 0 / 0 |
| Votos depois de "Gerando relatório [BU] [INÍCIO]" (física / relógio) | 0 / 0 | 0 / 0 |
| Zerésima depois de "Urna pronta" (física / relógio) | 0 / 0 | 0 / 0 |
| BU antes da confirmação do encerramento | 0 | 0 |
| Seção com voto em outra urna depois do BU | 0 | 0 |
| Urnas com voto e **sem** zerésima no dia | 2.135 | 1.445 |
| … das quais urna de contingência | 2.134 | 1.444 |
| … das quais sem marca de contingência | 1 (BA 39934/0183/0175) | 1 (MG 40690/0016/0264) |
| Urnas que geraram BU sem confirmar encerramento | 34 (29 no exterior, Sistema de Apuração) | 30 (29 no exterior, Sistema de Apuração) |

- **Urna de contingência sem zerésima:** é o esperado. A reserva herda o estado da urna original e não imprime nova zerésima.
- **Os 2 casos sem marca de contingência:** a cópia do diário da reserva publicada é a da mídia externa, que começa depois da sincronização ("Iniciando registro do log na MI e na ME"). As linhas da contingência ficaram só na memória interna. Os intervalos das urnas da seção não se sobrepõem:
  - BA 39934/0183/0175 (1º turno): 08:06–12:23, 13:29–14:19 e 14:30–18:30. Já é conhecida pela divergência log × BU;
  - MG 40690/0016/0264 (2º turno): parecer cético 39.
- **BU sem confirmação de encerramento no Brasil:** 5 no 1º turno e 1 no 2º. Todos são urnas postas só para gerar o BU, sem nenhum voto:
  - MG 41238/0039/0168 e MG 50075/0047/0041: contingência de mídia de votação e Sistema de Apuração, às 22h;
  - RJ 60011/0007/0460: a original encerrou e gerou o BU às 17:54, depois falhou, e a reserva gerou o BU de novo às 20:17;
  - PA 04278/0098/0294 (2º turno): a original confirmou o encerramento, e a reserva entrou às 18:16 só para o BU;
  - RO 00574/0028/0151 e SP 65358/0236/0100: mesmo padrão.
- **Duas urnas da seção votando ao mesmo tempo (pelo relógio):** 2 seções no 1º turno, 0 no 2º turno. As 2 são relógio adiantado na urna original (ver 3b).

Conferência pelo BU (banco): o 1º voto do diário vem antes da abertura gravada no BU em 1 seção por turno.

- RJ 60011/0214/0022 (1º turno): o BU herdou a abertura da urna original, cujo relógio estava 1 h adiantado.
- SP 71374/0172/0098 (2º turno): o BU herdou a abertura da original, com relógio alguns minutos adiantado (deriva; ela já tinha precisado de −8 min na carga).

Voto depois do encerramento do BU: 0. Emissão antes do encerramento: 0.

### 2. Retrocessos do relógio e encadeamento

| Retrocessos (linha com hora menor que a anterior, mesma urna) | 1º turno | 2º turno |
|---|---|---|
| Com acerto registrado ao lado (digitada, "Data e hora atualizada", ADH) | 274.747 | 1.411 |
| Logo depois de religar ("Urna ligada", "Início das operações do logd") | 412 (376 no exterior) | 270 (258 no exterior) |
| Sem nenhum dos dois | 5 | 2 |
| … no dia da votação: acerto / religar / sem | 117 / 101 / 2 | 26 / 35 / 2 |
| Entre dois votos seguidos da mesma urna (H08, D negativo) | 0 em 124.772.753 | 0 em 127.734.569 |
| Acerto de relógio no dia **depois** da zerésima | 0 (de 178 acertos em 109 urnas) | 0 (de 106 em 61 urnas) |

- **Religar no Brasil:** 36 retrocessos no 1º turno (29 urnas) e 12 no 2º. Em todos menos 1, o relógio da placa voltou a uma data-padrão ao religar: 01/01/2026, 01/01/2009, 01/01/1970 ou o ano 2000. É falha de bateria do relógio.
  - Exemplos: BA 39136/0033/0257 (2009), RO 00035/0021/0257 (1970), PR 74357/0050/0254 (2000, no dia, visto acima). No 2º turno, todos os 12 voltaram a 01/01/2026, na preparação.
  - A exceção é PB 19518/0062/0100, que voltou de 02/09 para 03/08 na preparação, antes da carga.
  - Só 1 desses retrocessos caiu no dia da votação no Brasil: o PR 74357/0050/0254.
- **Religar no exterior:** a urna aplica o horário de verão do país a cada partida ("Horário da urna alterado devido a horário de verão"). Isso aconteceu em 1.077 urnas no 1º turno e 1.058 no 2º. A cada religamento, o relógio da placa volta 1 h e o aplicativo soma de novo.
  - Exemplo: ZZ 29980/0001/3651 (Los Angeles): linha 29 `06:11:47 Fechando o arquivo de Log`, linha 30 `05:14:14 Início das operações do logd`, linha 47 `05:15:26 Horário da urna alterado devido a horário de verão`, linha 48 `06:15:35`.
- **Os 7 "sem causa":**
  - ZZ, 5 casos (4 no 1º turno e Los Angeles no 2º): o mesmo mecanismo do horário de verão, com o "Urna ligada" 1 linha depois da janela da regra;
  - RO 00035/0021/0257 (1º turno): relógio em 1970;
  - CE 14117/0013/0206 (2º turno): a original teve erro de impressora às 07:39 e voltou em `2026-01-01 00:07`, com o diário da mídia externa corrompido ("Identificado arquivo de log corrompido na ME"). Nunca recebeu voto. A reserva imprimiu zerésima às 08:39, abriu às 08:41 e votou até 17:00.
- **Lacunas de 60 min ou mais sem religamento, entre a abertura e o encerramento:** 41 no 1º turno (6 no Brasil) e 14 no 2º turno (2 no Brasil). São seções paradas ou urnas originais sem voto. Não há voto na lacuna, por definição.

**Encadeamento de hash (limite).** A última coluna de cada linha (16 hexadecimais) não foi reproduzida (`seguranca-h20-hash-linha.mjs`):

- 46 resumos do OpenSSL (SHA-1/2/3, MD5, BLAKE2, RIPEMD, SM3…);
- latin1 e utf8;
- 20 combinações de linha anterior e linha atual;
- resumo direto e invertido;
- 8.786 tentativas por seção, em AC 01007/0009/0001 (2º turno) e SP 71072/0001/0001 (1º turno), com 0 acerto.

O algoritmo usa segredo ou estado não publicado. Por isso a "sequência do hash contra a ordem das horas" **não é testável** com os arquivos públicos. A ordem física é o que há, e nela não existe nenhuma inversão sem causa entre eventos de votação.

### 3. Janela deslocada

Relógio do município: hora modal de "Urna pronta" no 2º turno (`fuso-municipio.csv`). As 81 seções do doc 07 usam a diferença da própria seção.

| Seções (Brasil, com fuso) | 1º turno | 2º turno |
|---|---|---|
| "Urna pronta" antes das 08:00 de Brasília | 62 (todas da tabela das 81) | 0 |
| 1º voto antes das 08:00 de Brasília | 3 (MT 90069/0053/0171, 0128 e 0120; doc 07) | 0 |
| Encerramento confirmado antes das 17:00 de Brasília | 0 | 0 |
| Abertura às 09:00 ou depois / às 10:00 ou depois | 196 / 25 | 88 / 18 |
| Exterior: pronta antes das 08:00 locais / encerramento antes das 17:00 locais | 0 / 0 | 0 / 0 |

#### 3b. Relógio 1 h adiantado: quatro testes, universo completo

1. **Acertos digitados de hora cheia** (`seguranca-h20-ajustes.mjs`, fecha o pendente do doc 07). Δ = hora digitada − relógio da urna:

   | Δ | 1º turno | 2º turno |
   |---|---|---|
   | 0 a 4 min | 464.630 | 2.269 |
   | 5 a 44 min | 18.906 | 119 |
   | +45 a +75 min (adiantou 1 h) | 386 | 8 |
   | −45 a −75 min (atrasou 1 h) | 1.852 | 91 |
   | 76 min a 1 dia | 852 | 22 |
   | 1 dia ou mais (relógio interno em outra data) | 16.060 | 87 |
   | Total | 502.686 | 2.596 |

   - As horas cheias "atrasou" do 1º turno se concentram no exterior (994 urnas) e no AM (559): o relógio da placa estava em hora de Brasília e o operador digitou a hora local. No 2º turno, 79 das 91 são a correção da zona 0053 de MT.
   - Entre as 268 urnas do Brasil, fora da tabela, com acerto "adiantou" e voto, 34 (12,7%) encerraram 45 min ou mais depois das 17:00 locais. É a mesma taxa do país no 1º turno (12,3%), então o acerto sozinho não indica relógio errado.
   - Das 34: no 2º turno, 26 são a mesma urna, sem novo acerto e com encerramento normal (o relógio era o mesmo, então o atraso do 1º turno foi fila); 1 teve novo acerto; 7 continuaram encerrando tarde: 6 de Fernando de Noronha (fuso +1 digitado certo; no 2º turno, o último voto foi antes das 18:00 locais e a mesa só encerrou cerca de 2 h depois, ociosa) e GO 92274/0119/0049.
   - Linha de base dessa persistência: de 61.265 seções que encerraram tarde no 1º turno, só 1.625 (2,7%) encerraram tarde também no 2º.
2. **Perfil de votos por hora** (`seguranca-h20-perfil-hora.mjs`). Critério declarado antes de rodar: 0 voto na hora das 08h locais **e** 10 ou mais na hora das 17h locais.
   - 2º turno: **2 seções**, GO 92274/0119/0049 e SP 71072/0280/0913.
   - 1º turno: 266 seções. 74 estão na tabela das 81. Das 192 restantes, 175 têm a mesma urna e perfil normal no 2º turno, 15 trocaram de urna e 2 são as mesmas GO e SP. No 1º turno, abertura atrasada e fila longa explicam o perfil.
3. **Abertura com 1 h de diferença entre os turnos**, as duas na trava (até 5 min depois da hora cheia): 67 seções em 499.176.
   - Em 46, só a abertura atrasou.
   - Em 21, o encerramento também saiu 1 h depois: 11 de MT zona 0053 (tabela); 5 tiveram urna de contingência entre 08:46 e 08:54 e abriram às 09:0x (BA 35734/0026/0289, CE 14192/0040/0141, MA 08079/0016/0205, PA 05290/0036/0059, RJ 60011/0010/0302); 6 abriram tarde no 1º turno com a mesma urna e o mesmo relógio do 2º turno, que abriu às 08:00 (PA 04618/0026/0018, PI 11398/0005/0226, PI 11517/0026/0014, RN 18856/0014/0056, SC 83909/0079/0312, SP 68837/0428/0027).
4. **Duas urnas da mesma seção votando ao mesmo tempo:** 2 no 1º turno (PR 74713/0078/0261, RJ 60011/0214/0024) e 0 no 2º.
   - Cobertura: o teste pega um relógio 1 h adiantado na primeira urna quando a troca leva menos de 60 min. Isso vale para 1.807 de 2.132 trocas no 1º turno e 1.241 de 1.442 no 2º.

Recusas da trava de encerramento ("Encerramento só pode ser solicitado após as 17:00:00 horas", e 15h/16h nos fusos −2/−1):

- 17.047 urnas no 1º turno e 19.866 no 2º;
- a 1ª recusa veio mais de 75 min antes da trava em 13.738 e 12.062 delas;
- a mesa aperta "encerrar" o dia todo, então o teste do relógio atrasado por esse caminho **não tem poder**.

### 4. Limite externo: recebimento no TSE × emissão do BU

`seguranca-h20-recebimento.mjs`: `DT_RECEBIMENTO_BU_HOR_TSE` (arquivo `_BR.csv` de `detalhe_votacao_secao_2026.zip`) − emissão do BU (banco) convertida para hora de Brasília.

| | 1º turno | 2º turno |
|---|---|---|
| Seções comparadas (Brasil) | 497.897 | 497.897 |
| Exterior / sem emissão do BU | 1.310 / 41 | 1.310 / 41 |
| Recebidas antes da emissão, régua do município | 60 | 8 |
| Recebidas antes da emissão, com a correção das 81 | **4** | **8** |
| Menor folga | −2,5 min (PB 19810/0016/0195) | −0,87 min (PA 04057/0016/0023) |

- 1º turno: MA 07404/0069/0295 (−0,87), PA 04057/0016/0010 (−0,55), PB 19810/0016/0195 (−2,50) e PR 75353/0174/0427 (−0,12).
- 2º turno: PA 04057/0016/0019, 0023, 0077 e 0080 (−0,70 a −0,87), PA 04200/0102/0054, PA 04391/0002/0006, PA 05657/0014/0215 e PR 78778/0052/0054 (−0,08 a −0,32).
- A zona 0016 de Ananindeua (PA 04057) aparece nos dois turnos com cerca de −0,7 min. São urnas da mesma carga com o relógio ~1 min à frente do TSE: deriva, não hora cheia.
- Exterior: o fuso mínimo exigido (emissão local − recebimento) chega a 1,36 h (Nagóia, 1º turno) e 1,19 h (Lisboa, 2º turno). Nagóia fica 12 h à frente de Brasília e Lisboa 3 h em 25/10. Nenhuma cidade exige um fuso impossível.

## Casos explicados no diário bruto

| Seção | Turno | O que o diário mostra | Explicação | Votos fora da janela real |
|---|---|---|---|---|
| RJ 60011/0214/0279 | 1º | Carga 22/09: `digitada 10:38` com relógio `09:38` (+59). Pronta 08:41, 1º voto 09:07, encerramento 18:04 (relógio). Em 25/10 08:41: `ADH Ajuste … 07:41 foi digitada` (−60) | **Fato:** relógio 1 h adiantado no 1º turno, corrigido na manhã do 2º | 0 antes das 8h. Os 15 votos "depois das 17h" foram antes das 17h reais |
| RJ 60011/0214/0024 | 1º | Original 01769516: carga +60 em 22/09; pronta 08:35/08:52; 5 votos 09:04–09:12. Reserva (relógio certo): contingência 08:41, votos 08:54–18:09 | **Fato:** original 1 h adiantada. A ordem real é original até ~08:12 e depois a reserva | 0 |
| RJ 60011/0214/0022 | 1º | Original 01844086: carga +60 em 22/09; pronta 08:44:58, sem voto. Reserva: contingência 08:28, 300 votos de 08:42. O BU diz abertura 08:44:58 | **Fato:** original 1 h adiantada. O BU herdou a abertura da original (07:44 reais) | 0 |
| PR 74713/0078/0261 | 1º | Original 01653959: carga +58 em 26/09; pronta 08:41; 166 votos 09:02–15:59. Reserva: contingência 15:07, votos 15:18–18:04 | **Fato:** original 1 h adiantada (votos reais 08:02–14:59) | 0 |
| GO 92274/0119/0049 | 1º e 2º | Carga +59 em 21/09, nunca corrigida. Os dois turnos: pronta 08:51/08:50, 1º voto 09:02/09:01, 0 voto na hora das 08h, BU emitido às 18:39/18:04 contra 17:03–17:13 nas seções vizinhas 0048, 0050 e 0051 | **Fato** (acerto digitado) **+ Hipótese forte** (perfil e vizinhas): relógio 1 h adiantado nos dois turnos | 0 antes das 8h. "Depois das 17h": 61 (1º) e 15 (2º), todos antes das 17h reais |
| SP 71072/0280/0913 | 1º e 2º | Carga −1 min (sem hora cheia). Os dois turnos: pronta 08:31/08:44, 1º voto 09:02/09:03, último 17:57, encerramento 18:12/18:05, BU emitido às 18:14/18:08 contra 17:03–17:17 nas seções 0900 a 0919 da zona (exceto a 0912 no 2º turno, 19:05) | **Hipótese:** relógio 1 h adiantado que o operador só confirmou na carga | "Depois das 17h": 27 (1º) e 23 (2º) |
| PR 74357/0050/0254 | 1º | Original votou 08:05–10:09; volta em `04/10/2000`; reserva às 11:51 | Relógio zerado no religamento (bateria) | 0 |
| CE 14117/0013/0206 | 2º | Original: erro de impressora 07:39, volta em `2026-01-01`, diário corrompido; reserva com zerésima própria às 08:39 | Falha de equipamento antes de abrir | 0 |
| ZZ 29980/0001/3651 | 2º | `Horário da urna alterado devido a horário de verão` a cada partida; ADH 07:16 | Horário de verão do país aplicado pelo aplicativo | 0 |
| 84 urnas (1º turno) | 1º | Linhas datadas de 04/10 gravadas na carga de setembro, antes de o operador digitar a data | Relógio interno no dia da eleição durante a carga (doc 04) | 0 voto nelas |

Nenhum caso envolve o Recuperador de Dados (RED).

## O voto destoa?

`seguranca-h20-votos-local.mjs`: % do 13 sobre 13 + 22, Presidente, na seção contra as outras seções do mesmo local de votação.

| Seção | 1º turno (seção × local) | 2º turno (seção × local) |
|---|---|---|
| GO 92274/0119/0049 | 31,30 × 31,97 (17 seções) | 33,44 × 36,36 |
| SP 71072/0280/0913 | 61,50 × 62,22 (8) | 64,84 × 65,95 |
| PR 74713/0078/0261 | 28,09 × 28,63 (11) | 32,53 × 33,06 |
| RJ 60011/0214/0024 | 57,95 × 57,79 (13) | 61,18 × 62,05 |

- Nenhuma destoa. A maior diferença é −2,9 pontos (GO, 2º turno), contra o 13.
- Os grupos do `seguranca-h20-analise.mjs` (`votoDasSecoesComCaso` em `resultado.json`) também não pendem para um lado. As 62 seções que abriram antes das 8h no 1º turno ficaram com 23,98% de 13 contra 26,59% esperado pela zona (−393 votos para o 13).
- **Leitura:** um relógio deslocado nessas seções não deixou marca no voto. Isso não prova nada sobre a intenção de quem digitou a hora.

## Hipóteses

- **SP 71072/0280/0913 com relógio 1 h adiantado nos dois turnos.** O perfil inteiro (sem voto até 09:02, votos até 17:57, BU cerca de 1 h depois das seções vizinhas da zona) bate com +1 h. A carga não registra acerto de hora cheia: o operador confirmou a hora que a própria urna mostrava. Não há prova externa: a folga do recebimento no 1º turno é de 73 min, e um relógio +1 h só daria folga negativa com menos de 60.
- **GO 92274/0119/0049 no 2º turno.** O acerto +59 é Fato. Que o relógio continuava errado no 2º turno é inferência do perfil (sem acerto posterior, sem prova externa, porque o TSE só registrou o 2º turno depois das 19h).
- **Impacto nos números da H06** (só se as duas forem aceitas):
  - 1º turno: −15 votos "depois das 17h" (RJ 0279, Fato), −61 (GO) e −27 (SP), e −25 "depois das 18h" (GO);
  - 2º turno: −15 (GO) e −23 (SP) depois das 17h.
  - Não muda nenhuma conclusão; é para a tabela de correção do doc 07.

## Pendente e limites

- **Encadeamento de hash do diário:** o algoritmo não é público. Sem ele, não dá para provar que a ordem física é a original. Uma reescrita completa do diário com a chave da urna não deixaria rastro conferível. Pedir ao TSE a especificação do "hash de encadeamento" do `logd.dat`.
- **Relógio atrasado 1 h:** os testes 1 a 4 só pegam relógio adiantado.
  - O atrasado faria a urna abrir às 09:00 reais (trava em 08:00 no relógio) e recusar o encerramento até as 18:00 reais.
  - O rastro de "abertura às 09h" se confunde com abertura atrasada (88 seções no 2º turno), e as recusas da trava não discriminam.
  - No 2º turno, nenhuma seção tem as duas coisas ao mesmo tempo: abertura na trava (até 5 min depois da hora cheia) e encerramento 1 h antes das vizinhas. Esse cruzamento não foi feito de forma sistemática.
  - **Pendente:** comparar, por local de votação, a hora do encerramento de cada seção com a mediana do local, nos dois turnos.
- **Relógio constante errado nos dois turnos, sem acerto e sem perfil deslocado** (mesa que segue o relógio da urna): não deixa rastro nos arquivos públicos. Só a ata da seção ou a hora do recebimento abaixo de 60 min resolvem.
- **Zona 0214 do RJ (Rio de Janeiro):** 3 urnas com +60 digitado no mesmo dia (22/09) e uma com −60 (0280, em 29/09). Pedir ao TRE-RJ a ata da carga de 22/09.
- A abertura gravada no BU de uma seção com contingência pode vir do relógio da urna original. O campo `dataHoraAbertura` do BU não é carimbo de tempo confiável.

## Recomendações

1. **Coordenador:**
   - acrescentar RJ 60011/0214/0279 à tabela de relógio fora do fuso do doc 07 (Fato), e avaliar GO 92274/0119/0049 e SP 71072/0280/0913;
   - as urnas originais de RJ 0022, RJ 0024 e PR 0261 não mudam os números de horário por seção, porque os votos delas ficam antes das 17h nas duas réguas.
2. Pedir ao TSE a especificação do hash de encadeamento do `logd.dat` e do relógio da urna (fonte da hora, bateria, horário de verão no exterior).
3. Pedir aos TREs do RJ, PR e GO as atas das cargas de 22/09 (RJ 0214), 26/09 (PR 0078) e 21/09 (GO 0119).

## Comandos

```bash
# 1 e 2. Varredura própria dos diários (cerca de 60–75 min por turno, 2 workers; no máximo 2 processos ao mesmo tempo)
node scripts/auditoria/seguranca-h20-varredura.mjs --turno 1 --paralelo 2
node scripts/auditoria/seguranca-h20-varredura.mjs --turno 2 --paralelo 2
# 4. Recebimento no TSE × emissão (≈ 15 s)
node --max-old-space-size=8192 scripts/auditoria/seguranca-h20-recebimento.mjs
# Consolidação dos itens 1–3, casos e voto por zona (≈ 30 s)
node --max-old-space-size=8192 scripts/auditoria/seguranca-h20-analise.mjs
# 3b. Acertos de relógio digitados, todos os diários (≈ 25 min por turno)
node scripts/auditoria/seguranca-h20-ajustes.mjs --turno 1 --paralelo 2
node scripts/auditoria/seguranca-h20-ajustes.mjs --turno 2 --paralelo 2
node --max-old-space-size=8192 scripts/auditoria/seguranca-h20-ajustes-analise.mjs
# 3b. Perfil de votos por hora (perfis dos dois turnos)
node scripts/auditoria/seguranca-h20-perfil-hora.mjs
# Encadeamento de hash (tentativa de reprodução)
node scripts/auditoria/seguranca-h20-hash-linha.mjs --turno 2 --secao ac/01007/0009/0001
node scripts/auditoria/seguranca-h20-hash-linha.mjs --turno 1 --secao sp/71072/0001/0001
# Casos no bruto
node scripts/auditoria/seguranca-h20-casos.mjs --turno 2 --secoes rj/60011/0214/0279,go/92274/0119/0049,sp/71072/0280/0913
node scripts/auditoria/seguranca-h20-casos.mjs --turno 1 --secoes pr/74713/0078/0261,rj/60011/0214/0024,rj/60011/0214/0022,pr/74357/0050/0254 --dias 04/10/2026,04/10/2000
node scripts/auditoria/seguranca-h20-casos.mjs --turno 2 --secoes ce/14117/0013/0206,zz/29980/0001/3651,pa/04278/0098/0294 --dias 25/10/2026
# Voto da seção × resto do local
node scripts/auditoria/seguranca-h20-votos-local.mjs go/92274/0119/0049,sp/71072/0280/0913,pr/74713/0078/0261,rj/60011/0214/0024
# BU × diário (abertura e encerramento)
node scripts/sql.mjs "select s.turno, sum(p.primeiro_voto_s < (cast(substr(s.abertura,12,2) as int)*3600+cast(substr(s.abertura,15,2) as int)*60+cast(substr(s.abertura,18,2) as int))) antes_abertura_bu, sum(p.ultimo_voto_s > (cast(substr(s.encerramento,12,2) as int)*3600+cast(substr(s.encerramento,15,2) as int)*60+cast(substr(s.encerramento,18,2) as int))) depois_encerramento_bu, sum(s.emissao < s.encerramento) emissao_antes_enc from secao s join perfil_log p using (turno,uf,municipio,zona,secao) where s.abertura is not null and p.primeiro_voto_s is not null group by s.turno"
```

Saídas em `data/parsed/auditoria/engenheiro-seguranca-urna/h20/`:

- `1t/`, `2t/`: uma linha por seção, com os fluxos por urna;
- `resultado.json` e `casos.csv`: itens 1–3, casos e voto;
- `recebimento.json` e `recebimento-negativos.csv`;
- `ajustes-1t/`, `ajustes-2t/`, `ajustes-resultado.json` e `ajustes-hora-cheia.csv`;
- `perfil-hora.json`.

Nenhum título de eleitor ou de mesário é gravado: sequências de 8 ou mais dígitos viram `#`.
