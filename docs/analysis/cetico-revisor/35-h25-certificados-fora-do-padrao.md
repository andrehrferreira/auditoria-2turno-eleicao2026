# 35. Parecer: H25, há certificado de urna fora do padrão de produção?

Achado revisado: [engenheiro-seguranca-urna/08-h25-certificados-fora-do-padrao.md](../engenheiro-seguranca-urna/08-h25-certificados-fora-do-padrao.md) (commit 0a9912b), scripts `seguranca-h25-padrao-{extrair,analise,votos,grafico}.mjs`, saídas `data/parsed/auditoria/seguranca-h25/padrao-*`.

Data: 30/10/2026. Base: os `.vsc` brutos dos 998.414 diretórios oficiais dos dois turnos (caminho montado pela linha da integridade; `data/raw` não foi varrido) e a cópia de leitura `eleicao2026-20261029T105000`. Nenhum pedido de rede. Rótulos: **Fato**, **Hipótese**, **Recomendação**, **Pendente**.

> **Termos.** *Certificado*: a "carteira de identidade" digital da urna, que diz "esta chave é da urna X" e leva o carimbo (assinatura) de uma *autoridade certificadora* (AC), o "cartório digital". *Molde* (do doc 08) ou *esqueleto* (deste parecer): o certificado com os campos que mudam de urna para urna escondidos; dois certificados feitos pela mesma linha de montagem têm o mesmo molde. *Número de série*: o número que a AC dá a cada certificado, como o número de uma nota fiscal.

## Vereditos

| # | Afirmação do doc 08 | Veredito | Motivo em uma linha |
|---|---|---|---|
| 1 | 0 certificado fora do padrão; 1 molde por AC (101.756 / 202.025 / 199.744) | **Sustentado com ressalvas** | Reproduzido com um esqueleto mais estrito (byte a byte, com a forma de codificação). Mas o molde esconde os dígitos do nome, as datas e a série; e é público (qualquer `.vsc` publicado o mostra). Exclui o certificado de teste feito **sem cuidado**, não o que copia o molde |
| 2 | CN = número da urna no `.vsc` em 100%; número no log com a carga do BU em 998.414/998.414; 0 certificado mais novo que a carga | **Sustentado com ressalvas** | Números reproduzidos. Mas é coerência **dentro do mesmo pacote assinado**: não prova "urna de verdade, preparada para a eleição". Contra o número do BU há 17 exceções (RED), não 0 |
| 3 | Série e validade: 1/3/1 linhas, 0 encaixe contraditório, duas regras de validade "sem exceção" | **Sustentado com ressalvas** | Linhas 1/3/1 reproduzidas. "5.000 dias exatos, 0 exceção" está errado: 6 certificados têm 5.000 dias **e 1 segundo** (a tolerância de 86 s do script os escondeu) |
| 4 | 6 urnas certificadas entre os turnos (2 AC URNA + 4 AC UE2020 em MG), todas substituindo a urna do 1º turno, BU = oficial | **Sustentado** | Reproduzido exatamente. Nenhuma das 6 votou no 1º turno. Não conflita com o relatório: o "duas" de lá fala só das 54 da AC URNA |
| 5 | 6 emissões isoladas em horário incomum, sem diferença de campo, BU = oficial | **Sustentado com ressalvas** | Erro de fuso: o script usa UTC−3 fixo e ignora o horário de verão de Brasília (até 2019). Com o fuso certo são **7** candidatos, e 2 dos 6 têm a hora errada em 1 h. O 7º também é urna real, sem diferença de campo, BU = oficial |
| 6 | Limite: certificado de teste emitido pela AC de produção, pelo mesmo sistema, é indistinguível | **Sustentado com ressalvas** | Frase certa, mas estreita demais. Também é indistinguível o certificado feito com **qualquer** ferramenta por quem tenha a chave da AC e copie o molde publicado. E dezenas de números de série perto da eleição não aparecem em pacote nenhum |
| — | (doc 08, item 6) Os 54 tardios da AC URNA iguais aos anteriores em tudo, menos a data | **Sustentado** | 54 de 54 com o mesmo esqueleto da AC URNA e validade com o teto 31/12/2037 23:00 |

Nenhum item foi refutado. Nenhum achado aponta certificado de teste ou fraude. As ressalvas são de alcance (o teste prova menos do que o texto diz) e dois erros de método (fuso e tolerância da validade).

## Como reproduzi

Conferência independente, sem `seguranca-h25-lib.mjs` nem os scripts do engenheiro:

- leitor TLV próprio para tirar o certificado do `.vsc` (DER nas UE2013/2015, PEM nas UE2020/2022);
- OpenSSL do Node (`X509Certificate`) para sujeito, emissor, série e datas;
- **esqueleto** mais estrito que o molde: o certificado byte a byte, com tag, forma do comprimento e conteúdo de todo campo não variável. Escondidos só: valor da série, conteúdo das duas datas, bytes da chave, conteúdo do SKI, assinatura e os dígitos do nome. Um certificado reescrito por outra ferramenta muda o esqueleto mesmo com os mesmos textos.

```
node scripts/auditoria/cetico-35-h25-extrair.mjs --turno 2
node scripts/auditoria/cetico-35-h25-extrair.mjs --turno 1
node --max-old-space-size=6000 scripts/auditoria/cetico-35-h25-analise.mjs
node scripts/auditoria/cetico-35-h25-votos.mjs
```

Saídas em `data/parsed/auditoria/cetico-35/`: `{1t,2t}-dirs.jsonl`, `{1t,2t}-certs.jsonl`, `analise.json` (seções A a I), `votos.json`, logs de execução.

| Número | Doc 08 | Este parecer | Bate? |
|---|---|---|---|
| Diretórios oficiais lidos | 499.207 + 499.207, 0 erro | 499.207 + 499.207, 0 erro, 0 linha pulada (sem `.vsc` ou sem hash) | sim |
| Certificados distintos (união dos turnos) | 503.525 | 503.525 | sim |
| Por AC | 101.756 / 202.025 / 199.744 | 101.756 / 202.025 / 199.744 | sim |
| Moldes (esqueletos) por AC | 1 / 1 / 1 | 1 / 1 / 1 (esqueleto mais estrito) | sim |
| SKI = SHA-1 da chave | 100% | 503.525 de 503.525 | sim |
| CN `UEAO`/`ueao` + 8 dígitos | 100% | 998.414 de 998.414 diretórios | sim |
| Número do CN = número no `.vsc` | 998.414 | 998.414 | sim |
| Número do CN = número da urna no BU | não medido | 998.397; **17 exceções**, todas RED (3 no 2º turno, 14 no 1º), com os dois números no log | novo |
| Número do CN no log da seção | 998.414 | 998.414 | sim |
| Carga do log = carga do BU | 998.414 | 998.414 | sim |
| Início da validade antes da carga do BU | 998.414; menor folga 6,6 h | 998.414 com a conversão mais dura (hora do BU + 2 h); menor folga 5,6 h, mesma seção MG 53716/0269/0215 | sim |
| Número de urna com mais de um certificado | não medido | **0** nos dois turnos | novo |
| Linhas de emissão (série crescendo com a data) | 1 / 3 / 1 | 1 / 3 / 1 (conta exata: maior subsequência não crescente) | sim |
| Validade "outra" | 0 | **6** (5.000 dias + 1 s) | não |
| Certificados com início entre o fim do 1º turno e a abertura do 2º | 6 (4 UE2020 MG, 2 AC URNA SP) | 6, os mesmos | sim |
| Certificado com início depois da abertura do 1º turno usado no 1º turno | — | 0 | novo |
| Isolados (nenhum certificado de nenhuma AC a 60 min) | 33 / 8 / 4 | 33 / 8 / 4 | sim |
| Isolados em horário incomum | 6 | **7** com o horário de verão | não |
| Os 54 tardios da AC URNA | 1 molde, teto | 54, 1 esqueleto, teto 54 | sim |

Caso conferido no bruto: MG 53716/0269/0215, 2º turno (`src/exportar.js --log completo`). O BU traz a urna 2015461 e a carga em 22/10/2026 16:34. O diário traz a urna 02015461. A linha da integridade mostra o log aninhado da urna 02079190 (19/09 a 21/10 16:48, outro código de carga) e o da 02015461 a partir de 22/10 16:33. O certificado `UEAO02015461` começa a valer em 22/10 12:55 UTC. Bate com o item 3.4 do doc 08.

## Item 1. Molde único por AC

**Fato (reproduzido).** Um esqueleto por AC nos 503.525. O esqueleto guarda também a forma de codificação de cada campo; continua um só.

**Tentativa de derrubar como absolvição falsa.** O que o molde vê e o que não vê. Teste sintético sobre um certificado real de cada AC (`analise.json` → H):

| Alteração | Esqueleto (e molde do doc 08, que esconde os mesmos campos) |
|---|---|
| Nome com outro número de 8 dígitos (urna inexistente `…00000001`) | **igual: passa** |
| Validade de 1 ano (só as datas) | **igual: passa** (quem pega é a regra de validade do item 3) |
| Nome com letras no lugar dos dígitos (`TESTE001`) | diferente: detectado |
| Nome em outra caixa (`UEAO` ↔ `ueao`) | diferente: detectado |
| keyUsage só assinatura | diferente: detectado |
| Política com outro OID | diferente: detectado |

1. **Um certificado de teste com nome `ueao` + 8 dígitos passa no molde.** O teste do número (item 2) só o pega se o número não aparecer no diário do mesmo pacote, ou cair fora das faixas observadas.
2. **O molde é público.** Qualquer `.vsc` publicado mostra o certificado inteiro. Quem tem a chave da AC pode usar um certificado publicado como modelo, com OpenSSL ou outra ferramenta, e trocar só número, datas, série e chave. O resultado passa no molde. A linha A da tabela de ataques do doc 08 ("ferramenta comum … 0. Um molde por AC") deve dizer: "exclui só o certificado feito sem copiar o molde".
3. **O que de fato exclui um certificado de uma AC de teste separada** é outra coisa: a conferência da assinatura da AC sobre cada certificado, feita no doc 07 e na integridade (100% nas três ACs). Uma AC de teste com chave própria não passaria. O doc 08 deveria citar isso no item 1. É o argumento forte; o molde é o complementar.

**Explicações alternativas.** A de que o molde único venha de um bug de leitura que iguala tudo foi testada: o esqueleto deste parecer separa as três ACs, e as alterações sintéticas mudam o esqueleto como esperado.

## Item 2. Número da urna

**Fato (reproduzido).** O número do nome bate com o número no `.vsc` e com uma urna do diário da seção. O diário tem a carga com o mesmo código do BU, em 998.414 de 998.414 diretórios. 0 certificado começa depois da carga, mesmo com a conversão mais dura de fuso.

**A circularidade é real.** O número no `.vsc`, o BU, o diário e o certificado vêm todos do mesmo pacote, assinado pela chave que está sendo examinada.

- O "número da urna no `.vsc`" (`idHW`) é um campo do **mesmo arquivo** que traz o certificado. A coincidência em 100% mostra só que o arquivo é coerente.
- Quem monta um pacote com um certificado de teste escreve o mesmo número no BU e no diário. Todos os testes do item 2 passam.
- As faixas por modelo saem dos próprios dados. Não há lista externa de urnas fabricadas.
- Logo a frase "o número da urna é sempre de urna de verdade, preparada para a eleição" diz mais do que o teste mostra. Texto certo: "o número é o mesmo em todas as partes do pacote, e cai dentro das faixas de fabricação de cada modelo".

**O que não é circular** (e o doc 08 não usou):

- **Fato.** Nenhum número de urna aparece com dois certificados diferentes nos 998.414 pacotes. Um certificado de teste com o número de uma urna que votou em outra seção, ou no outro turno, apareceria aqui. Não aparece.
- **Fato.** 494.833 certificados aparecem nos dois turnos. São os 499.179 de cada turno, menos os 503.525 da união. Esses já estavam num pacote publicado 3 semanas antes, em outra divulgação. Só 4.346 certificados aparecem apenas no 2º turno, entre eles os 6 emitidos entre os turnos.
- **Fato.** 3 certificados assinam mais de um pacote no mesmo turno, todos explicados. Dois são do Sistema de Apuração no exterior (9 e 20 seções no 2º turno; um deles, 29 seções no 1º). O terceiro é a urna RED de ES 57932/0009/0085 e /0112, já descrita no doc 03 deste perfil.
- **Pendente.** A única lista externa ao pacote (correspondências esperadas e efetivadas do TSE) precisa de rede. É a recomendação 2 do doc 08, que este parecer reforça.

**Número do BU.** Contra o número da urna gravado no BU, há 17 diretórios diferentes: 3 no 2º turno e 14 no 1º, todos tipo seção ou reserva, com 2 ou 3 diários no pacote e os dois números no diário. Têm o padrão RED (doc 03 deste perfil). O diário principal é o da urna que assinou o pacote. O diário aninhado é o da urna original e traz a carga do BU. Conferi o caso AL 27057/0022/0581 (1º turno) na linha da integridade. ES 57932/0009/0085 está na lista RED do doc 03. O doc 08 cita "6 RED" só na nota de método da primeira versão. A tabela do item 2 deveria ter a linha "número do certificado = número da urna no BU: 998.397; 17 RED".

**Relógio.** O doc 08 recusa a primeira data do diário porque ela depende do relógio da urna. Mas a data de carga do BU vem do mesmo relógio. O teste "certificado antes da carga" herda essa fraqueza. Nenhuma data de carga está fora de 2026, então não há relógio grosseiramente errado nesse campo. A ressalva deve constar.

## Item 3. Série e validade

**Fato (reproduzido).** As linhas de emissão são 1 (AC URNA), 3 (AC UE2020) e 1 (AC UE2022), com conta exata: o menor número de sequências crescentes é o tamanho da maior subsequência não crescente. Faixas de série iguais às do doc 08.

**Fato (correção).** A validade não segue as duas regras "sem exceção". Há 6 certificados com **5.000 dias e 1 segundo** (`analise.json` → `E.foraDasRegras`):

| AC | Certificado | Série | Início (UTC) |
|---|---|---|---|
| AC URNA | `ueao01759734` | `2BFF22` | 16/06/2016 00:59:08 |
| AC URNA | `ueao01776001` | `2D4EA3` | 30/06/2016 04:10:00 |
| AC URNA | `ueao01785179` | `2DAC10` | 02/07/2016 03:56:07 |
| AC UE2020 | `UEAO02228200` | `11CA86` | 18/06/2022 22:41:40 |
| AC UE2022 | `UEAO02420399` | `0FEAF1` | 01/01/2024 15:09:50 |
| AC UE2022 | `UEAO02447073` | `11F64C` | 26/01/2024 14:47:39 |

- O script do engenheiro arredonda a duração a 0,001 dia (86 segundos) e chama de "5.000 dias exatos" tudo nessa faixa.
- **Hipótese (a mais simples):** o sistema emissor lê o relógio duas vezes, uma para o início e outra para o fim. Às vezes a virada de um segundo cai entre as duas leituras.
  - A favor: os 6 estão espalhados pelas três ACs e por três épocas (2016, 2022, 2024).
  - A favor: têm o mesmo esqueleto e estão no meio de sessões normais (o vizinho mais próximo está a 0 a 26 segundos).
  - Isso aponta para o mesmo programa nas três ACs, não para outro sistema.
- Não é anomalia. Mas "exatos" e "0 exceção" devem sair do doc 08, e os 6 devem ser listados.
- As datas de mudança da regra se confirmam: 5.000 dias até 08/05/2024 e teto a partir de 03/06/2024, nas três ACs.

**Números de série que não aparecem (falsa absolvição possível).** Perto da eleição, as ACs gastaram muitos números de série que não estão em pacote nenhum (`analise.json` → G):

- **AC UE2020.**
  - O último certificado visível antes do fim do 1º turno é `15108F` (02/10). O último entre os turnos é `151107` (22/10). No meio cabem 120 números; 4 aparecem.
  - Com o passo de 6 por emissão (hipótese do doc 08), são 20 emissões, das quais 16 não estão nos arquivos.
- **AC URNA.**
  - Depois de `34B233` (01/10) até `34B256` (19/10) cabem 35 números; 2 aparecem.
  - Na AC URNA o passo comum é 1, então são até 33 certificados que não aparecem, com data desconhecida entre 01/10 e 19/10.
- **Leitura.** Um certificado emitido e nunca usado num pacote publicado não mexe em voto contado. A exceção é um pacote depois substituído e não publicado (limite do doc 08).
- Mas é exatamente aí que um certificado de teste emitido pelo sistema de produção ficaria. O doc 08 menciona os números invisíveis em termos gerais. Deve dar estes números e pôr a faixa `15108F`–`151107` da AC UE2020 na pergunta LAI (a), item 5, ao lado da faixa da AC URNA. O parecer 33 já tinha apontado 946 números para 54 certificados na AC URNA depois do vencimento.

## Item 4. Seis urnas certificadas entre os turnos

**Fato (reproduzido exatamente).** Certificados com início entre o fim do 1º turno (04/10, 17h de Brasília) e a abertura do 2º (25/10, 8h):

| Certificado | AC | Início (UTC) | Seção no 2º turno | Urna da mesma seção no 1º turno | Votou no 1º turno? | BU × oficial (presidente) |
|---|---|---|---|---|---|---|
| `UEAO02014666` | AC UE2020 | 08/10 12:20 | MG 40339/0009/0177 | `UEAO02036758` | não | 0 divergência, 242 votos |
| `UEAO02103893` | AC UE2020 | 14/10 16:54 | MG 47031/0148/0078 | `UEAO02098552` | não | 0, 193 |
| `UEAO02015548` | AC UE2020 | 17/10 20:53 | MG 45551/0120/0100 | `UEAO02067377` | não | 0, 284 |
| `ueao01847509` | AC URNA | 18/10 17:55 | SP 71072/0004/0114 | `ueao01807314` | não | 0, 268 |
| `ueao01682541` | AC URNA | 19/10 18:04 | SP 62634/0214/0003 | `ueao01805493` | não | 0, 300 |
| `UEAO02015461` | AC UE2020 | 22/10 12:55 | MG 53716/0269/0215 | `UEAO02079190` | não | 0, 158 |

- **Fato.** 0 certificado com início depois da abertura do 1º turno foi usado no 1º turno, e 0 com início depois da abertura do 2º turno.
- **Conflito com o relatório: não há.** O tema do certificado da AC URNA, o tópico 1 e o quadro das hipóteses dizem "duas foram carimbadas entre os turnos". A frase está dentro do parágrafo das 54 carteiras da AC URNA, e as duas são as 2 da AC URNA desta tabela.
  - O doc 07 também falava só da AC URNA. A frase do doc 08 "não 2 como dizia o doc 07" deve virar: "o doc 07 tratou só da AC URNA; nas três ACs são 6".
- **Recomendação ao redator.** Se o fato entrar no relatório, o leitor pode ter entendido do texto atual que só 2 urnas foram certificadas entre os turnos. Basta uma frase nova, sem mudar a antiga (texto abaixo).
- **"BU = oficial" não é prova de legitimidade.** O resultado oficial por seção sai do BU, então ele bate tanto com um pacote legítimo quanto com um pacote assinado por certificado de teste que tenha sido aceito. O teste mostra que o pacote **foi contado**, e o doc 08 usa "voto contado", o que está certo. Não deve ser lido como absolvição.
- **Hipótese "mutirão de manutenção":** só suposta. Nada nos arquivos a testa. Fica Hipótese até a resposta LAI.

## Item 5. Emissões isoladas em horário incomum

**Erro de fuso (bug).** O script converte para Brasília com UTC−3 fixo (comentário "sem horário de verão"). Até fevereiro de 2019, Brasília usava UTC−2 no horário de verão. Isso afeta só a AC URNA, com 191 certificados emitidos nesses períodos. Com o fuso certo (`analise.json` → I):

| Certificado | Série | Hora no doc 08 | Hora certa (Brasília) | Muda o veredito? |
|---|---|---|---|---|
| `ueao01848268` | `344C4D` | sex 21/10/2016 03:12 | sex 21/10/2016 **04:12** (verão) | não, segue madrugada |
| `ueao01847973` | `345411` | sáb 05/11/2016 02:32 | sáb 05/11/2016 **03:32** (verão) | não |
| `ueao01669613` | `2B1ECF` | qui 05/11/2015 23:47 (não marcado) | **sex 06/11/2015 00:47** (verão), vizinho a 28 dias | **entra: 7º candidato** |

- **Fato.** O 7º candidato, `ueao01669613`, é urna de seção do exterior, ZZ 29360/0001/1056, nos dois turnos.
  - Tem o mesmo esqueleto e a carga no diário com o código do BU.
  - BU = oficial: 0 divergência no 1º turno (256 votos) e no 2º (266).
  - É do mesmo tipo dos 4 de 2014 a 2016 (recertificação da época).
- **Fato.** Os outros 6 candidatos reproduzem, com BU = oficial.
- Contagens que mudam pouco:
  - madrugada na fabricação da AC URNA: 40.231 com UTC−3 fixo, 40.302 com o horário de verão;
  - madrugada na recertificação: 30 viram 31 (2015: 9 → 10).
  - O gráfico de hora de emissão desloca 191 certificados da AC URNA em 1 hora. A forma não muda.
- "Isolado" olha só as urnas que votaram em 2026, e a lista é uma triagem com muitas comparações. O doc 08 já diz o primeiro ponto. Nada aqui é anomalia.

**Recomendação.** Corrigir a função `local()` de `seguranca-h25-padrao-analise.mjs` para o horário de verão, regerar o CSV e o gráfico e pôr os 7 candidatos.

## Item 6. A frase do limite

A frase do doc 08 ("um certificado de teste emitido pela AC de produção, pelo mesmo sistema e com os mesmos campos, é indistinguível") está certa, mas deixa de fora dois casos igualmente indistinguíveis:

1. o certificado feito **fora** do sistema emissor, com qualquer ferramenta, por quem tenha a chave da AC e copie o molde de um certificado publicado (item 1);
2. o pacote inteiro montado com coerência: certificado, BU e diário com o mesmo número. O item 2 só pega incoerência.

**Texto proposto para o doc 08:** "Qualquer certificado assinado com a chave verdadeira da AC e montado igual ao modelo, seja pelo sistema emissor do TSE, seja por outra ferramenta a partir de um certificado publicado, é indistinguível de um de produção. O teste exclui o certificado feito com outra chave (a assinatura não conferiria) e o feito sem copiar o modelo. A coerência entre certificado, boletim e diário mostra que o pacote é consistente, não que a urna é a esperada para a seção. Isso só a lista de urnas por seção e o registro da AC mostram."

## Correções pedidas ao doc 08 (o engenheiro edita; eu não editei)

1. Item 1 e linha A da tabela de ataques: o molde exclui só o certificado feito sem copiar o modelo. Citar que a AC de teste separada é excluída pela conferência da assinatura (doc 07, integridade).
2. Item 2: trocar "o número da urna é sempre de urna de verdade, preparada para a eleição" por "o número é o mesmo em todas as partes do pacote e cai nas faixas de cada modelo". Declarar que é coerência interna. Acrescentar:
   - número = urna do BU em 998.397, com 17 RED;
   - 0 número de urna com dois certificados;
   - 494.833 certificados já publicados no 1º turno;
   - a ressalva do relógio da urna na data de carga.
3. Item 3 e item 3.5: "5.000 dias exatos, 0 exceção" está errado. São 6 com 5.000 dias + 1 s (tabela acima). Corrigir a tolerância do script.
4. Item 3 e Limites: quantificar os números de série que não aparecem perto da eleição (AC UE2020 `15108F`–`151107`: 120 números, 4 visíveis; AC URNA `34B234`–`34B256`: 35 números, 2 visíveis). Incluir a faixa da AC UE2020 na LAI (a).5.
5. Item 3.3/4 e gráfico: horário de verão. São 7 candidatos, e 2 horas mudam. Ajustar também as contagens de madrugada e o gráfico.
6. Item 5: trocar "não 2 como dizia o doc 07" por "o doc 07 tratou só da AC URNA".
7. Itens 3.3, 3.4 e 4: "BU = oficial" mostra que o pacote foi contado, não que é legítimo. Dizer isso uma vez.
8. Item 7 e Limites: usar o texto proposto no item 6 deste parecer.

## Texto que pode entrar no relatório para leigos

> **Fato.** Todas as 503.525 carteiras digitais das urnas usadas nos dois turnos foram examinadas campo a campo. Em cada um dos três cartórios digitais do TSE, todas seguem exatamente o mesmo modelo: os mesmos campos, na mesma ordem, com os mesmos textos. Só mudam o número da urna, o número de série, as datas, a chave e o carimbo. Nenhuma tem nome de teste, campo a mais ou campo a menos. As 54 carteiras emitidas depois do vencimento do cartório das urnas antigas seguem o mesmo modelo das outras.
>
> **Fato.** Em todos os 998.414 pacotes dos dois turnos, o número da urna escrito na carteira aparece no diário da urna, e o diário registra a preparação da urna com o mesmo código que está no boletim. Nenhuma carteira começou a valer depois dessa preparação. Nenhum número de urna aparece com duas carteiras diferentes. Essas conferências comparam partes do mesmo pacote entre si. Elas mostram que cada pacote é coerente, e não que a urna era a esperada para aquela seção: a lista de qual urna deveria estar em cada seção não está nos arquivos públicos examinados.
>
> **Fato.** Seis urnas receberam a carteira entre os dois turnos, de 8 a 22 de outubro de 2026: duas urnas antigas em São Paulo e quatro urnas do modelo 2020 em Minas Gerais. As seis substituíram, no 2º turno, a urna que a seção tinha usado no 1º turno, e nenhuma delas votou no 1º turno. Os votos dessas seis seções estão no resultado oficial, iguais aos do boletim. Isso mostra que esses votos foram contados, não que a troca foi legítima.
>
> **Limite.** Uma carteira de teste com o carimbo verdadeiro do cartório digital, montada igual ao modelo, não se distingue de uma verdadeira. O modelo pode ser copiado de qualquer carteira publicada. Por isso este exame só exclui a carteira de teste feita sem cuidado, ou feita com outro carimbo (essa não passaria na conferência do carimbo). Quem emitiu cada carteira, quando e para qual urna só os registros do TSE mostram.

Termo a explicar na primeira vez, se ainda não estiver no tópico: "carteira digital (certificado): o documento que diz qual chave pertence a qual urna, carimbado pelo cartório digital do TSE (a autoridade certificadora)".

## O que fica fora do relatório

- O horário das emissões e os "candidatos isolados" (6 ou 7). Dependem do relógio do emissor e do fuso, e são triagem, não achado.
- A hipótese de "mutirão de manutenção" e a do passo de 6 números por urna.
- As três linhas de emissão de 2022 e a regra de validade, inclusive os 6 com 1 segundo a mais. São detalhe técnico sem efeito no resultado.
- A frase "o número é sempre de urna de verdade, preparada para a eleição", que o teste não sustenta.
- Os números de série invisíveis perto da eleição. Ficam como pergunta ao TSE na análise técnica até haver resposta. Não entram como número no relatório.
- Qualquer frase que leia "BU = oficial" como prova de que a urna era legítima.

## Arquivos

- `scripts/auditoria/cetico-35-h25-lib.mjs`: leitor TLV, extração do certificado do `.vsc`, esqueleto.
- `scripts/auditoria/cetico-35-h25-extrair.mjs`: os dois turnos, todos os diretórios oficiais.
- `scripts/auditoria/cetico-35-h25-analise.mjs`: seções A a I e o teste sintético.
- `scripts/auditoria/cetico-35-h25-votos.mjs`: BU × oficial dos 6 entre os turnos e dos 7 isolados.
- `data/parsed/auditoria/cetico-35/`: `{1t,2t}-dirs.jsonl`, `{1t,2t}-certs.jsonl`, `analise.json`, `analise.log`, `votos.json`, `{1t,2t}-execucao.log`.
