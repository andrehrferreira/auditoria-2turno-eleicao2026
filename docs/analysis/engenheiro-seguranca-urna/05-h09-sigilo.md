# 05. H09: os arquivos públicos permitem ligar voto a pessoa?

Perfil `engenheiro-seguranca-urna`, tarefa T09 ([08-coordenacao-modelos.md](../../08-coordenacao-modelos.md)), hipótese H09 ([hipoteses.md](../../hipoteses.md)). Universo completo dos dois turnos: todas as seções, todos os pacotes, todos os logs (inclusive o log da urna original dentro do pacote de contingência). Nenhum dado de `data/private/` foi usado.

## Resposta curta

1. **Fato: o RDV da urna não guarda a ordem de votação.** Todas as listas de votos geradas por urna estão em ordem de tipo de voto e de número digitado: 539.788 de 539.788 no 2º turno e 2.490.766 de 2.490.766 no 1º. Qualquer ordem de chegada dos eleitores gera o mesmo arquivo. O teste com o único voto cujo horário o log revela (nulo por suspensão) confirma: a posição desse voto no RDV coincide com a posição do eleitor no log em 1 de 619 casos (2º turno) e 431 de 84.075 (1º turno, 0,5%), o que é acaso. Se o RDV seguisse a ordem de votação, coincidiria em todos.
2. **Fato: a exceção é o Sistema de Apuração com cédula.** Em 2 seções de MG no 1º turno (apuração mista com cédulas de papel), 9 listas de votos de cédula estão na ordem de digitação, não ordenadas (20 cédulas por seção). É a ordem em que as cédulas saíram da urna de lona, não a de votação; mas, se a posição for a mesma cédula em todos os cargos, o arquivo publica a cédula inteira de cada um desses 40 eleitores (Hipótese, Parte 1).
3. **Fato: seções pequenas e unânimes revelam o voto, como limite da publicação por seção.** Nenhuma seção teve comparecimento 1 nos dois turnos. 2º turno: 30 seções unânimes para presidente (3.100 eleitores) e 4 para governador (509). 1º turno: 17 para presidente (1.107), 2 para governador (85) e 1 para deputado federal (297), além de uma seção do exterior com 2 eleitores. Quem sabe quem compareceu sabe como cada um votou. Em 31 das 33 seções unânimes do 2º turno (18 de 20 no 1º) há mesário que a urna registra como eleitor da própria seção, com o título dele no log.
4. **Fato: o log traz títulos que não são de mesário nem de servidor.** O controle positivo funciona (todos os títulos de mesário e de operador têm DV válido e papel no log). Mas as duas mensagens da suspensão de eleitor (`Título <n> é válido / inválido para suspender a votação`) publicam títulos válidos que não pertencem a nenhum mesário registrado em nenhuma urna do país: **55.978 no dia do 1º turno e 5.582 no dia do 2º turno**. Todos estão no meio da sessão de um eleitor, com data e hora. No 1º turno, 11.871 dessas sessões terminam com `Atribuido voto nulo por suspensão [cargo]`, que é o conteúdo do voto do eleitor naquele cargo.
5. **Hipótese forte: o "título inválido" é o título do próprio eleitor suspenso.** Nas sessões com título inválido sem papel, o eleitor tinha sido liberado pelo número do título em 99,98% dos casos (1º turno: 20.085 de 20.090), contra 78% no conjunto das sessões. O mesário redigita o título que acabou de digitar. Quando o eleitor foi liberado pelo CPF, o mesário não tem o número na mão e o inválido some (5 casos). Na mesma urna, cada suspensão traz um número diferente (627 de 651 urnas com duas ou mais). Confirmar exige a lista de eleitores da seção, que não é pública: **Pendente**.

Se o item 5 se confirmar, o log publicado liga, para dezenas de milhares de eleitores por eleição, **título + horário + situação**, e, nas 11.871 sessões do 1º turno que terminam em nulo por suspensão, também **o voto naquele cargo**. O conteúdo revelado é pobre (nulo), mas é o voto de uma pessoa identificável num arquivo público. É falha do arquivo, não limite estatístico.

## Como reproduzir

```
node scripts/auditoria/seguranca-h09-sigilo.mjs --turno 2 --procs 6   # 40 min (2.415 s), 5.038.243.046 linhas de log
node scripts/auditoria/seguranca-h09-sigilo.mjs --turno 1 --procs 6   # 36 min (2.170 s), 2.979.571.924 linhas de log
node scripts/auditoria/seguranca-h09-sigilo.mjs --turno 2 --uf ac      # conferência rápida (10 s)
```

Saída em `data/parsed/auditoria/engenheiro-seguranca-urna/h09/<t>t/`: `resumo.json`, `resumo.txt` e `notaveis.jsonl` (seções unânimes ou com cargo de até 9 eleitores, e listas de RDV fora de ordem). **Nenhum título ou CPF é gravado:** o script guarda só contagens, mensagens com os números trocados por `#` e o endereço da seção, e passa toda saída por uma trava que apaga qualquer número de 10 a 12 dígitos com DV de título ou de CPF (não disparou). Os números ficam só na memória do processo, para o cruzamento nacional.

**Cobertura (Fato).** Nos dois turnos: 499.248 seções, 499.207 pacotes, 0 falhas de leitura; 41 seções sem pacote (sem arquivo publicado). Textos de log: 512.173 (2º turno) e 507.327 (1º turno). Os logs do 2º turno trazem a história da urna desde a carga, inclusive o 1º turno; por isso os números "do dia" de cada turno são os que não se repetem.

## Parte 1. A ordem dos votos no RDV é independente da ordem de votação?

**Como foi medido.** Para cada pacote, eleição e cargo, o script verifica se cada voto da lista do RDV é menor ou igual ao seguinte pela chave (código do tipo de voto, número digitado comparado como texto). Os códigos são os da especificação do RDV (`legenda` 1, `nominal` 2, `branco` 3, `nulo` 4, `brancoAposSuspensao` 5, `nuloAposSuspensao` 6, `nuloPorRepeticao` 7…). Também verifica se cada voto distinto aparece num bloco só.

**Hipótese nula:** o RDV está ordenado como a especificação descreve e não carrega horário. A alternativa a detectar é qualquer lista fora dessa ordem, em especial na ordem de chegada.

| | 2º turno | 1º turno |
|---|---|---|
| Listas (cargo × pacote) | 539.817 | 2.490.815 |
| Ordenadas por (tipo, digitação) | 539.817 (100%) | 2.490.802 (13 fora de ordem) |
| Urna de seção | 533.659, todas ordenadas | 2.475.472, todas ordenadas |
| Urna reserva | 6.110, todas | 15.044, todas |
| Recuperação de dados (RED) | 19, todas | 250, todas |
| Sistema de Apuração manual (exterior) | 29, todas | 29, todas |
| Sistema de Apuração misto com cédula | — | 20 listas, 7 ordenadas |

**Fato.** Todas as listas geradas por urna estão ordenadas nos dois turnos, inclusive reserva e RED. A ordem dentro do tipo é a de texto: `legenda:100` vem antes de `legenda:1103` e de `legenda:131`. Cada cargo é uma lista separada, e o senador (duas escolhas) é uma lista única com as escolhas de todos misturadas: o arquivo da urna não permite juntar os votos de um mesmo eleitor entre cargos.

**Fato: as 13 listas fora de ordem.** Estão todas em 2 seções de MG do 1º turno com apuração mista (parte na urna, parte em cédula): MG 41238/0039/0168 e MG 50075/0047/0041 (`tipoUrna contingencia`, `saMistaBUImpressoCedula`). 9 são listas `origemVotosSA = cedula` (os votos das 20 cédulas de papel de cada seção, digitados no Sistema de Apuração) e 4 são `origemVotosSA = bu` (votos copiados do boletim da urna, agrupados por candidato na ordem do boletim, sem informação por eleitor). As listas de cédula estão na ordem de digitação: em MG 50075/0047/0041 a de presidente começa `22, 70, 22, 22, nulo 99…`. Em MG 41238/0039/0168 a de presidente veio ordenada e as dos outros cargos não. Conferido no bruto.

**Hipótese (cédula).** A ordem é a de saída das cédulas da urna de lona, que se misturam, e não a de votação. Se a posição *i* for a mesma cédula em todos os cargos de um mesmo tipo de cédula (majoritária: governador e senadores; proporcional: deputados), o RDV publica a combinação completa de cada cédula. Isso permite "assinar" uma cédula com uma combinação rara. Alcance: 40 eleitores em 2 seções. Confirmar exige a norma de digitação do Sistema de Apuração.

**Teste com âncora no tempo.** O log não diz em quem cada eleitor votou, com uma exceção: quando o mesário suspende um eleitor que já confirmou parte dos votos, o log grava `Atribuido voto nulo por suspensão [cargo]` no minuto da suspensão, e o RDV recebe um `nuloAposSuspensao` naquele cargo. Para cada caso no dia da eleição, o script compara a posição do eleitor na sequência de `O voto do eleitor foi computado` com a posição do `nuloAposSuspensao` na lista do RDV.

| | 2º turno | 1º turno |
|---|---|---|
| Linhas de nulo por suspensão no dia | 638 | 135.770 |
| Comparáveis (cargo de uma escolha, um só log com votos, contagem igual) | 619 | 84.075 |
| Posição no RDV = posição no log | 1 | 431 (0,51%) |
| Excluídas | 16 de plebiscito, 3 de contingência | 49.999 de senador (duas escolhas), 439 de contingência, 1.257 com contagem diferente |

**Fato.** A coincidência é a do acaso: o `nuloAposSuspensao` fica sempre depois dos nominais, brancos e nulos, e às vezes cai na posição de um eleitor que votou perto do fim. Na ordem de votação, seria 100%.

**Conferência de contagem (Fato).** Votos no RDV do primeiro cargo de uma escolha × linhas `O voto do eleitor foi computado` no dia: iguais em 499.169 de 499.178 pacotes no 2º turno e 499.161 de 499.176 no 1º. As diferenças são contingência (votos repetidos entre o log da urna original e o da urna nova, ou parte dos votos em log não publicado) e casos de 1 voto a mais no RDV. Exemplos do 2º turno: BA 39870/0133/0184 e ES 57932/0009/0085 (votos duplicados entre logs); BA 35653/0173/0235, MA 08893/0047/0609 e RS 89060/0017/0191 (parte em log não publicado); BA 34711/0021/0178, PB 21750/0002/0254 e PI 11533/0003/0216 (1 a mais no RDV). Lista completa em `resumo.txt`. O tema é da matriz ([01](01-matriz-ataques.md), "voto sem trilha"), não de sigilo.

## Parte 2. Seções pequenas e votos distinguíveis (limite estrutural)

Publicar o resultado por seção revela o voto de quem votou numa seção onde todos votaram igual, ou onde votou uma só pessoa. Não é falha do software; é consequência de publicar por seção. A pergunta é o tamanho.

**Como foi medido.** Soma das contagens do RDV por seção e cargo. Eleitores = votos ÷ escolhas do cargo. "Dissidente único" = dois valores, um deles com 1 voto, em seção de 3 ou mais eleitores.

| | 2º turno | 1º turno |
|---|---|---|
| Seções com presidente | 499.205 | 499.206 |
| Comparecimento 1 | 0 | 0 |
| Até 9 eleitores (presidente) | 3: MG 46477/0134/0295 (9), ZZ 30295/0001/0348 (7), ZZ 30333/0001/0353 (8) | 5: MA 08958/0083/0042 (9), MG 46477/0134/0295 (9), ZZ 30295/0001/0348 (5), ZZ 30333/0001/0353 (5, unânime), ZZ 30686/0001/0443 (2, unânime) |
| Unânimes, presidente | 30 seções, 3.100 eleitores | 17 seções, 1.107 eleitores |
| Unânimes, outros cargos | governador 4 (509) | governador 2 (85); deputado federal 1 (MT 90280/0028/0200, 297 eleitores no mesmo candidato) |
| Seções com algum cargo unânime / com mesário eleitor da seção / mesários | 33 / 31 / 111 | 20 / 18 / 62 |
| Dissidente único, presidente | 63 | 28 |

Unânimes para presidente no 2º turno, por UF: PA 11 (1.225 eleitores), MA 4, RR 4, MT 3; 1 em AM, BA, CE, ES, MS, PB, PI e RS. A menor do país é PB 22071/0004/0290 (10 eleitores, todos no 13, conferido no bruto). Lista completa em `notaveis.jsonl`.

**Fato: o mesário torna isso nominal.** O log publica `Mesário <título> é eleitor da seção` no dia. Se esse mesário votou na seção unânime, o voto dele está publicado junto com o título. O log não diz qual eleitor é o mesário, então não dá para afirmar que ele votou.

**Votos que aparecem uma vez só (canal de marca).** O RDV publica o número digitado em todo voto nulo (no 2º turno, 2.722.696 nulos para presidente, todos com digitação). Quem quer comprar ou fiscalizar votos pode mandar o eleitor anular com um número combinado (por exemplo, 47) e conferir no RDV da seção. Tamanho do canal:

| Votos que aparecem uma vez na seção | 2º turno | 1º turno |
|---|---|---|
| Nulo com número único, presidente | 1.017.323 em 433.160 seções | 1.132.970 em 440.536 seções |
| Nulo com número único, governador | 86.346 | 1.607.883 |
| Nulo com número único, senador | — | 6.054.879 |
| Nulo com número único, deputado federal / estadual | — | 999.980 / 1.192.077 |
| Nominal com 1 voto na seção (deputado federal / estadual) | — | 10.965.016 / 12.789.449 |

No 1º turno o canal é muito maior: o nulo de deputado aceita 4 ou 5 dígitos, e o voto nominal em candidato com 1 voto na seção já é público no BU por seção. O nulo com número próprio é o que o RDV acrescenta ao BU.

**Horário.** O log dá o horário de cada voto, mas não o conteúdo. Com o RDV ordenado, horário e conteúdo só se juntam em: (a) comparecimento 1 (nenhum caso); (b) seção unânime (o horário de cada eleitor está no log e o voto é o mesmo para todos); (c) o nulo por suspensão, cujo horário o próprio log publica (Parte 3).

## Parte 3. O log traz identificador de eleitor?

**Como foi medido.** Em cada linha de todos os logs, o script procura sequências de 10 ou mais dígitos no texto da mensagem (a coluna final de 16 hexadecimais, o encadeamento do log, fica de fora). Para cada sequência: tamanho; se é título com DV válido (12 dígitos, ou 10 e 11 completados com zeros à esquerda, como o mesário às vezes digita); se é CPF com DV válido (11 dígitos). Cada título válido é classificado pelo papel que o próprio log dá a ele naquela urna: **mesário** (`Mesário <n> registrado`, `já registrado`, `é / não é eleitor da seção`, `Pedido de leitura da biometria do mesário <n>`), **operador** (`… gerada pelo usuário: <n>`, servidor que gerou a mídia) ou **sem papel**. Os títulos sem papel são cruzados com todos os títulos de mesário registrados no país no mesmo turno (2.074.207 nos logs do 2º turno, 1.992.260 nos do 1º).

A "janela do eleitor" vai de `Identificador do eleitor digitado pelo mesário` até `O voto do eleitor foi computado` (ou até a urna voltar a `Aguardando digitação do identificador do eleitor`). Há 136.865.544 janelas nos logs do 1º turno e 275.780.614 nos do 2º (que repetem o 1º turno das urnas reaproveitadas).

**Controle positivo (Fato).** Todo número nas mensagens de mesário é título válido e de mesário registrado na urna. 2º turno: `Mesário # registrado` 7.542.425 de 7.542.425; `Pedido de leitura da biometria do mesário #` 8.054.829 de 8.054.829; `Mesário # habilitou o eleitor` 10.949.368 de 10.949.380 (os 12 restantes são um mesário cujo registro ficou num log de contingência não publicado). Números que não são título (caminho de arquivo com município, zona e seção; serial de máquina) não passam no DV.

**Números de pessoa no log (2º turno, todas as linhas):**

| Mensagem | Ocorrências | Título válido | Mesário da urna | Operador | Sem papel | Leitura |
|---|---|---|---|---|---|---|
| Mensagens de mesário (registro, biometria, habilitação) | 79.931.748 | 100% | todos menos 33 | — | 33 | mesário no papel de mesário |
| `Mídia de votação / MR / mídia de carga gerada pelo usuário: #` | 7.687.616 | 100% | 38 | 7.687.578 | 0 | servidor do cartório |
| `Título digitado para encerramento: #` | 1.006.291 | 100% (21.223 sem zeros à esquerda) | 1.002.289 | 16 | 3.986 | presidente encerrando a votação; 352 sequências de 11 dígitos com DV de CPF |
| `Título # é válido para suspender a votação` | 90.655 | 100% | 76.533 | 3 | **14.119** | ver abaixo |
| `Título # é inválido para suspender a votação` | 60.793 | 47.396 (13.397 com DV errado) | 227 | 0 | **47.169** | ver abaixo |

Nenhuma outra mensagem traz número de 10 a 12 dígitos com DV de título, nem número no formato `0000 0000 0000`. A identificação do eleitor sai no log só como tipo: `Identificador digitado pelo mesário foi: (Título de eleitor)` ou `(CPF)`, sem o número.

**Os títulos sem papel da suspensão (Fato).** Quando o eleitor demora na cabine, a urna pergunta ao mesário se ele está votando; se não está, pede `título eleitoral para suspensão do eleitor` e grava o número digitado e se foi aceito.

| | 1º turno: válido sem papel | 1º turno: inválido sem papel | 2º turno, dia 25/10: válido / inválido |
|---|---|---|---|
| Ocorrências no dia | 12.489 | 43.691 | 1.991 / 3.616 |
| Não são de mesário registrado em nenhuma urna do país | 12.391 | 43.587 | 1.971 / 3.611 |
| Janelas de eleitor com o título | 12.489 | 20.090 | todas na janela |
| Janelas que terminam com `Atribuido voto nulo por suspensão` | 5.860 | 6.385 | 212 linhas de nulo por suspensão no dia têm título sem papel na janela |
| Eleitor liberado pelo número do título (base: 78% das janelas no 1º turno, 76% no 2º) | 5.732 (46%) | 20.085 (99,98%) | 2º turno, todos os períodos: 6.724 de 14.119 (48%) / 21.889 de 21.894 (99,98%) |
| Urnas com 2+ janelas assim: número diferente em cada | 861 de 1.007 | 627 de 651 | 983 de 1.092 / 728 de 769 |
| Urnas com 2+ janelas assim: o mesmo número em todas | 126 | 23 | 91 / 38 |
| Controle: título de mesário válido, 2+ janelas, mesmo número | 9.803 de 11.209 urnas | — | 10.819 de 12.527 |

No 1º turno, 31.813 janelas de eleitor têm um título sem papel; 11.871 delas terminam com nulo por suspensão.

**Leitura (Hipótese, a confirmar).**

- **Inválido sem papel: provável título do próprio eleitor.** A suspensão exige o título de quem pode suspender, e o título de mesário funciona (o mesmo número na mesma urna, como o controle mostra). Os inválidos sem papel não são de mesário em lugar nenhum do país, aparecem quase só quando o eleitor foi liberado pelo título (99,98%, contra 78% na base) e mudam a cada eleitor suspenso na mesma urna. O que melhor explica é o mesário redigitar o título do eleitor que acabou de liberar.
- **Válido sem papel: não se sabe de quem é.** A urna aceitou, então o número cumpre a regra de suspensão, que não está publicada. Não é de mesário registrado em lugar nenhum do país (99,2%), muda a cada suspensão na mesma urna (861 de 1.007 urnas no 1º turno) e aparece mais quando o eleitor foi liberado pelo CPF (54%, contra 22% na base). Duas leituras: (a) a urna aceita o título do eleitor em sessão, e o mesário o digita a partir do documento; (b) a urna aceita qualquer membro nomeado da mesa, mesmo sem registro biométrico. A leitura (b) explica mal um número diferente a cada suspensão.
- **Encerramento sem papel (3.986 no 2º turno; 5.832 no 1º):** presidente que encerrou sem estar registrado na urna, ou digitação errada; fora da janela de eleitor.

**Conferência no bruto.** AC 01007/0009/0202, 25/10 às 07:04: suspensão com título inválido que não está entre os 4 mesários registrados na urna. AC 01040/0004/0075, 04/10 às 07:18 (no log publicado do 2º turno): eleitor liberado pelo título e por biometria, suspenso depois de votar para deputado; título válido sem papel; a urna grava nulo por suspensão para senador (duas vezes), governador e presidente. Os números não são reproduzidos aqui.

**Por que importa.** Se o número é o título do eleitor suspenso, o log publica, para esse eleitor: título, horário e, quando a janela termina em `Atribuido voto nulo por suspensão [cargo]`, o conteúdo do voto naquele cargo (nulo). O RDV confirma a existência do `nuloAposSuspensao`. O título também liga a pessoa a fatos que o log grava na mesma janela: `Áudio ativado conforme cadastro` (eleitor com deficiência visual; 216.797 janelas no 1º turno), `Eleitor impedido - preso provisório` (618), `militar em serviço` (621), `servidor da Justiça Eleitoral` (227).

**Nada mais no log diz em quem se votou.** Catálogo das mensagens dentro da janela do eleitor (759 mensagens distintas no 2º turno, `resumo.txt`): `Voto confirmado para [cargo]`, `Eleitor corrigiu na tela de confirmação de candidato`, `Tecla indevida pressionada`, biometria, habilitação e situação do eleitor. A única com conteúdo de voto é `Atribuido voto nulo por suspensão [cargo]`. Teclas com número só aparecem no aplicativo de teste (ATUE), fora da votação.

## Linhas para a matriz de ataques ([01](01-matriz-ataques.md))

| # | Ataque | Pré-requisitos | Rastro esperado | Onde procurar | Resultado | Limite |
|---|---|---|---|---|---|---|
| H9a | Ligar voto a eleitor pela ordem do RDV (comparar com o horário de cada voto no log e com quem estava na fila) | RDV e log públicos; saber quem votou e em que ordem (mesário, fiscal, alguém na fila) | RDV na ordem de chegada; posição do `nuloAposSuspensao` igual à do eleitor suspenso | RDV + log | **Fato:** listas da urna 100% ordenadas nos dois turnos; âncora da suspensão coincide em 1 de 619 (2º) e 431 de 84.075 (1º), acaso | Só o RDV publicado; o RDV interno e o da mídia de resultado não são públicos |
| H9b | Ligar votos de um eleitor entre cargos (cédula completa) | RDV público | Listas de cargos na mesma ordem por eleitor | RDV | **Fato:** na urna, não (cada cargo ordenado à parte). No Sistema de Apuração com cédula, 9 listas em ordem de digitação em 2 seções de MG (40 cédulas, 1º turno). **Hipótese:** posição = cédula | Depende da norma de digitação do SA |
| H9c | Coação ou compra de voto conferida pelo RDV: o eleitor anula com número combinado | Grupo de eleitores da seção; o comprador sabe a seção | Nulos com número único na seção | RDV | **Fato:** nulo com número único para presidente: 1.017.323 (2º) e 1.132.970 (1º); no 1º turno também 6.054.879 em senador e 2,19 milhões em deputados | Não separa marca combinada de nulo espontâneo; o canal existe porque o RDV publica a digitação do nulo |
| H9d | Saber o voto de quem compareceu em seção unânime ou minúscula | Saber quem compareceu (mesa, fiscal, vizinhos) | Cargo unânime; comparecimento 1 | RDV ou BU | **Fato:** nenhuma seção com comparecimento 1; unânimes para presidente: 30 (3.100 eleitores, 2º) e 17 (1.107, 1º); mesário eleitor da seção em 31 de 33 (2º) e 18 de 20 (1º) | Limite estrutural da publicação por seção |
| H9e | Título de eleitor no log público | Nenhum: o arquivo é público | Número com DV de título fora das mensagens de mesário e de operador | Log, todas as linhas | **Fato:** títulos válidos que não são de mesário em nenhuma urna do país, todos na suspensão de eleitor: 55.978 no dia do 1º turno, 5.582 no dia do 2º; 11.871 janelas do 1º turno terminam em nulo por suspensão. **Hipótese forte:** os inválidos são o título do eleitor suspenso | Confirmar exige a lista de eleitores da seção (não pública) |
| H9f | Atributo pessoal do eleitor no log | Idem | Mensagens de cadastro dentro da janela | Log | **Fato (1º turno):** áudio por cadastro 216.797, preso provisório 618, militar em serviço 621, servidor da Justiça Eleitoral 227 janelas. Sem número do eleitor, salvo com título de suspensão na mesma janela | Só vira dado pessoal identificado combinado com H9e |

## Limites (o que este teste não vê)

- **RDV não publicado.** A ordem dentro da urna (memória interna e mídia de resultado) e o que o TSE recebe não são públicos. O teste mostra que o arquivo publicado é ordenado, não que nenhum outro guarda a ordem.
- **Arquivos não publicados.** `jufa.dat`, `imgze.dat`, `hash.dat`, `mr.ver`, `wsqbio.jez`, `wsqman.jez` e `wsqmes.jez` (digitais) vão para a mídia de resultado (uma urna do 2º turno registra a gravação de cada um: `VPP Gravado o arquivo de resultado […]`) e não estão no portal. Se algum liga digital a horário, só o TSE vê.
- **Encadeamento do log.** A coluna de 16 hexadecimais de cada linha tem algoritmo não publicado. Não há como afirmar que não carrega nada do eleitor; também não há indício de que carregue.
- **Hash com sal ou chave.** A busca procura o número em texto. Um identificador cifrado ou com sal não seria achado (o mesmo limite de `src/busca-identificador.js`).
- **De quem é o título da suspensão.** Sem a lista de eleitores da seção, a ligação título → eleitor suspenso é inferida pelo padrão, não conferida.
- **Quem está na fila.** A ligação horário → pessoa por observação na seção não deixa rastro em arquivo.

## Recomendações

- **Recomendação (TSE):** não gravar no log o número digitado na suspensão; gravar só se foi aceito e o papel de quem suspendeu. É a única mensagem que publica número de pessoa fora do papel de mesário ou servidor.
- **Recomendação (TSE):** publicar o RDV sem a digitação dos nulos, para fechar o canal H9c, e ordenar também as listas de cédula do Sistema de Apuração.
- **Recomendação (coordenação):** confirmar H9e sem expor ninguém: com autorização e na máquina local, verificar se os títulos inválidos de suspensão de algumas seções estão na lista de eleitores daquelas seções. O script não guarda os números; uma versão para isso precisaria gravá-los em `data/private/`.
- **Recomendação (relatório):** "Ordem dos votos no registro" pode passar de Pendente a Fato (RDV da urna ordenado em todas as listas dos dois turnos; a exceção das cédulas do SA em 2 seções). A busca de título no log tem resultado novo (H9e), que precisa de revisão do cético antes de entrar na perícia.

## Pendente

- Confirmar de quem são os títulos sem papel da suspensão (lista de eleitores da seção ou norma técnica da suspensão).
- Confirmar se a posição nas listas de cédula do Sistema de Apuração é a mesma cédula em todos os cargos.
- Revisão do `cetico-revisor`.
