# 55. Parecer: fechamento de H10, H17, H23 e H24 só com dados públicos

Parecer do revisor cético, 02/11/2026. Revisa o [doc 14 do matemático forense](../matematico-forense/14-fechamento-h10-h17-h23-h24.md) (commit db27f88), os scripts `scripts/auditoria/matematico-fechamento-*.mjs` e as saídas em `data/parsed/auditoria/matematico-forense/fechamento/`. A base anterior são os pareceres [05](05-h10-crescimento-cabe-no-disponivel.md), [25](25-votos-sem-log-reconciliacao.md), [31](31-mesa-e-leitor.md), [32](32-h16-maquina-de-estados.md), [37](37-h18-h21-h22.md), [39](39-h23-h24-t11.md) e [41](41-pendencias-engenheiro-demografo.md).

**Rótulos:** **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**.

**Como trabalhei:**

- Código próprio em `scripts/auditoria/cetico-55-*.mjs`. Nenhum deles importa os scripts do autor; usam só `src/` (leitor de zip, de diário e de BU, lacres) e a cópia de leitura do banco `eleicao2026-20261029T105000`.
- Os diários e BUs foram lidos dos pacotes em `data/raw/<t>t/urnas` (F:), por `readdir`. Não rodei `find` em `data/raw`. Sem rede.
- Nenhum CPF, título de eleitor ou número de mesário foi lido para saída ou gravado. Todas as saídas passam por uma trava contra 10 ou mais dígitos seguidos.

## Resposta curta

| Hipótese | Conclusão do doc 14 | Meu veredito sobre o doc 14 | Conclusão final que eu sustento |
|---|---|---|---|
| **H10** | Refutada como escrita; (a) sem sinal; (b) não decidível | **Sustentado com ressalvas.** Números reproduzem exatamente. Mas o "efeito máximo de 166.584 trocas (333.168 de margem)" **não é máximo**: é o mínimo que precisa de troca **ou** de rotatividade. As contagens admitem até 43.630.542 trocas 22→13. E a base do "refutada" (A5) é uma identidade, que não pode falhar | **Refutada como escrita** (a escala alegada, "em todos os estados", não ocorreu), com a parte (b) **não decidível com dados públicos** |
| **H17** | Sem sinal; volta do eleitor não decidível; teto até 47,7% da margem | **Sustentado com ressalvas.** Contagens reproduzem exatamente. O teto está certo na conta, mas com outra leitura razoável vai a **83,5%** da margem, não 47,7%; só passa da margem contando títulos corrigidos em segundos. O desconto "seguido de voto em até 180 s" é a taxa normal da fila (80,9%) | **Sem sinal nos dados públicos** para supressão seletiva; supressão **sem registro** no diário é **não decidível com dados públicos** |
| **H23** | Sem sinal; motivo das recargas não decidível | **Sustentado com ressalvas.** 502, 1.567 e +0,10 reproduzem. Duas correções: as 2 seções "de cédula" não tinham comparecimento 0; e a zona 0094 do PA **não** refez a zona inteira, refez os 2 primeiros lotes de mídia (56 de 171 urnas) com mídia de geração mais nova | **Sem sinal nos dados públicos**; motivo das recargas **não decidível com dados públicos** |
| **H24** | Sem sinal; contas acusam toda alteração de aptos ou trânsito | **Sustentado com ressalvas.** Minha contraprova, com seções e alterações diferentes, confirma o essencial. Mas uma alteração de trânsito com o mesmo total (trânsito −3, aptos da seção +3) passa em todas as contas; e a supressão de votos (comparecimento e votos −3) é ponto cego no nível B | **Sem sinal nos dados públicos** |

Em linguagem simples:

- **H10:** o 13 não ganhou mais votos do que havia para ganhar, nem no país nem em todos os estados. Em 6 estados do Norte e no Maranhão o ganho só fecha com eleitores do 22 que votaram no 13 ou com eleitores diferentes em cada turno, e os arquivos públicos não dizem qual dos dois.
- **H17:** nada mostra mesários barrando eleitores de um lado. Mesmo contando com folga, os atendimentos registrados que não viraram voto ficam abaixo da diferença entre os candidatos. O que não deixa registro no diário não pode ser medido.
- **H23:** toda carga que gerou boletim está no diário da própria urna, com assinatura conferida, e as seções recarregadas votaram como as vizinhas. Por que 502 urnas foram recarregadas antes do 1º turno só a ata do cartório diz.
- **H24:** as contas de eleitores aptos e em trânsito pegam eleitor inventado ou mudado de seção, se o cadastro publicado for o verdadeiro. Não pegam voto posto no lugar de quem faltou, troca de votos nem voto apagado, se isso for feito dentro da urna.

---

## 1. H10. Crescimento do 13 maior que o disponível

### 1.1 Reprodução (Fato)

`cetico-55-h10.mjs` faz a conta toda no SQL (votos de Presidente por seção nos dois turnos, eleições 6257 e 6258), com as definições do doc 14 reescritas. Universo: 499.205 seções nos dois turnos; ficam fora as 2 de MG com cédula (comparecimento 0 num turno no BU de urna).

| | Doc 14 | Meu script |
|---|---:|---:|
| Margem do 13 no 2º turno | 4.430.191 | 4.430.191 |
| Perda bruta do 22 (seções) | 383.008 (82.180) | 383.008 (82.180) |
| Emín, Brasil (seções) | 166.584 (49.924) | 166.584 (49.924) |
| Emín MA / AM / TO | 15.946 / 5.737 / 3.749 | 15.946 / 5.737 / 3.749 |
| Emáx, Brasil (seções) | 32 (16) | 32 (16) |
| Emáx MA / AM / TO | 3 / 5 / 0 | 3 / 5 / 0 |
| Piso que foi para o 13, Brasil | 8 | 8 |

Reproduz exatamente.

**Conferido no BU bruto** (`cetico-55-bu-bruto.mjs am 02755 0022 0070`, lacre conferido nos dois turnos): 195 aptos (192 da seção e 3 em trânsito), comparecimento 183 → 184, 22: 20 → 1, 13: 154 → 180, brancos e nulos 3 → 3. Teto de pessoas = 192 + 3 + 3 = 198; saída máxima = 198 − 184 = 14; perda 19; Emáx = 5. Confere.

### 1.2 O "efeito máximo" não é máximo (falsa absolvição de enquadramento)

O doc 14 diz, na tabela da resposta curta e na tabela final: "no máximo 166.584 trocas no país (≤ 333.168 de margem)" e "7,5% da margem".

Isso inverte o sentido da conta. **Emín é o mínimo** de perda do 22 que precisa ser explicado por troca de voto **ou** por eleitores diferentes em cada turno. Ele não limita a troca por cima.

Uma troca 22→13 pode ficar escondida em qualquer seção, inclusive onde o 22 subiu no saldo. Por exemplo, o 22 ganha 10 votos de eliminados e perde 5 por troca, e a seção mostra +5.

O máximo de trocas que as contagens públicas admitem, sem contradizer nenhum número da seção, é Σ min(22 no 1º turno, 13 no 2º turno):

| Teto de troca 22→13 compatível com as contagens (Fato) | Votos | Em margem (2×) |
|---|---:|---:|
| Todas as 499.205 seções | 43.630.542 | 1.970% da margem |
| Só as 82.180 seções em que o 22 perdeu | 6.209.528 | 280% da margem |

**Conclusão (Fato):** a contagem não limita a troca de votos. O doc 14 reconhece isso para "troca feita dentro da urna", mas não existe outra troca que a H10(b) meça:

- troca feita depois da urna (cartório, transmissão) é pega pelo lacre, que passou em todas as seções (pareceres 21 e 24);
- troca feita dentro da urna não tem limite nos dados públicos.

O número 166.584 só diz quanto da perda do 22 **precisa** de uma das duas explicações. Ele não é efeito máximo de nada.

**Recomendação:** tirar a linha "H10(b): 166.584, 7,5% da margem" das duas tabelas de efeito máximo. No lugar, dizer: "a contagem não limita a troca; o limite vem do lacre (troca depois da urna: 0 casos) e da integridade do programa (troca dentro da urna: sem limite nos dados públicos)".

### 1.3 "Refutada" é o veredito certo? (pergunta 2)

**Sim, mas não pelo motivo que o doc 14 dá.**

O doc 14 apoia o "refutada" em A5: ganho do 13 ≤ eliminados + queda de brancos e nulos + aumento do comparecimento + **perda do 22**. Com a perda do 22 dentro do "disponível", A5 é uma identidade: vale sempre que votos = comparecimento, com dado honesto ou fraudado. Uma identidade não refuta nada.

O texto da H10 (doc de hipóteses) define o disponível como "eliminados + abstenção + brancos/nulos", sem a perda do 22. Com essa leitura estreita (eliminados do 1º turno + aumento do comparecimento + queda de brancos e nulos), o ganho do 13 **passa do disponível em 6 UFs** (Fato, `cetico-55-h10.mjs`):

| UF | Ganho do 13 | Disponível líquido | Ganho além do disponível (= perda líquida do 22) |
|---|---:|---:|---:|
| AC | 9.743 | −5.349 | 15.092 |
| AP | 10.465 | −3.139 | 13.604 |
| RR | 9.085 | −2.562 | 11.647 |
| MA | 241.930 | 232.861 | 9.069 |
| AM | 98.787 | 97.268 | 1.519 |
| TO | 38.953 | 37.548 | 1.405 |
| **Total** | | | **52.336** |

Pela definição pedida ("refutada = os dados públicos mostram que o mecanismo, como foi descrito, não ocorreu na escala alegada"):

- a escala alegada é "em todos os estados". Os dados mostram 6 de 27, e só pela leitura estreita. Isso refuta a hipótese como escrita;
- onde o excesso existe, ele é exatamente a perda líquida do 22 (52.336 votos nas 6 UFs). Ele tem duas explicações, troca de voto ou eleitores diferentes em cada turno, e os dados públicos não separam as duas. Essa parte é **não decidível**, como o doc 14 diz.

**Recomendação:** trocar a frase "o ganho do 13 cabe no disponível em todo o país, em todos os municípios e em todas as seções" por:

> "no disponível bruto (eliminados, todos os que se abstiveram no 1º turno, brancos e nulos), cabe em todo lugar; no disponível líquido, passa em 6 UFs (AC, AP, RR, MA, AM, TO) por exatamente a perda do 22 (52.336 votos); a escala alegada, 'em todos os estados', não ocorreu".

### 1.4 H10(a): a queda de brancos e nulos

Não refiz a tabela por faixa nem a contagem do A4. O A4 (54 votos em 6 seções no 2º turno) já foi refeito por mim no parecer 25.

Uma ressalva de leitura. O doc 14 trata a queda espalhada e convergente como sinal de que não houve inserção. Isso responde a "inserção concentrada". Mas uma troca branco→13 dentro da urna, feita com taxa proporcional ao branco e nulo de cada seção, produz a **mesma convergência**. Minha contraprova N5 (seção 4) mostra que essa troca passa em todas as contas no nível B.

O doc 14 declara esse ponto cego. Peço só que a frase "esse padrão não é assinatura de inserção" ganhe o complemento "nem a exclui".

### 1.5 Veredito H10

**Sustentado com ressalvas.** Os números reproduzem exatamente. O veredito "refutada como escrita" se sustenta pela escala ("todos os estados"), não pela identidade A5. O "efeito máximo" de 166.584 trocas (333.168 de margem) **cai**: não é máximo.

---

## 2. H17. Supressão ou roubo de voto na mesa

### 2.1 Reprodução (Fato)

`cetico-55-h17-varrer.mjs` relê com código meu os diários dos 499.207 pacotes do 2º turno, só o dia 25/10. A máquina de estados foi reescrita a partir da definição do doc 09 do estatístico. Resultado: 0 erro, 29 pacotes sem voto no dia (Sistema de Apuração).

| | Doc 14 | Meu script |
|---|---:|---:|
| Atendimentos (fora consultas) | 139.310.955 | 139.310.955 |
| Consultas | — | 24.028 |
| Voto / recusa / cancelada / "já votou" / suspenso sem votar | 128.235.189 / 1.492.314 / 797.508 / 94.667 / 7.860 | idem |
| **Sem desfecho** | **8.683.417** | **8.683.417** |
| ... título digitado errado | 5.774.186 | 5.774.186 |
| ... justificativa | 2.321.187 | 2.321.187 |
| ... identificador aceito, sem habilitação (com ou sem digital ou foto) e "outro" | 576.124 + 7.420 + 2.312 + 816 = 586.672 | 586.672 |
| ... eleitor habilitado sem voto | 1.283 + 89 = 1.372 | 1.372 |
| Seções com algum atendimento sem desfecho | 498.669 | 498.669 |
| Teto nível 1 / 2 / 3 | 397.603 / 1.393.412 / 2.111.084 | 397.603 / 1.393.412 / 2.111.084 |

Reproduz exatamente.

### 2.2 O desconto "seguido de voto em até 180 s" tem poder? (falsa absolvição)

O nível 1 do teto (397.603) desconta todo atendimento cujo atendimento seguinte foi um voto em até 180 s, como se isso indicasse que o eleitor voltou. Medi a mesma taxa nos atendimentos que **não** são suspeitos (Fato):

| Atendimento | Seguido de voto em até 180 s |
|---|---:|
| **Voto computado (taxa de base)** | **80,9%** |
| Título digitado errado | 87,6% |
| Identificador aceito, sem habilitação | **68,7%** |
| Justificativa | 63,2% |
| Cancelada | 73,3% |

Depois de um voto normal, o próximo atendimento é outro voto em até 3 minutos em 81% dos casos, porque a fila anda. Para os identificadores aceitos sem voto, a taxa é **menor** que a de base.

O desconto, portanto, não separa "o mesmo eleitor voltou" de "a fila andou". **O nível 1 não é um teto: é o nível 2 menos o fluxo normal da fila.** Os números com sentido são os níveis 2 e 3.

Para os títulos digitados errado há um critério melhor: o intervalo até a próxima digitação. **91,8%** (5.301.819 de 5.774.186) têm nova digitação em até 30 s, e 41,5% em até 15 s. Isso é correção de digitação, não eleitor mandado embora.

### 2.3 O teto pode passar da margem? (pergunta 3)

A conta do doc 14 está certa: 2.111.084 ÷ 4.430.191 = 47,7%. O efeito é de 1 por eleitor (eleitor que deixou de votar tira 1 voto, não 2), e supor todos do 22 está do lado conservador.

Com outras leituras (Fato, `cetico-55-h17-resumo.mjs`):

| Leitura | Eleitores | % da margem | Razoável? |
|---|---:|---:|---|
| Doc 14, nível 3 | 2.111.084 | 47,7% | sim |
| A: nível 3 + recusas (1.492.314) + "já votou" fora de consulta (94.667) | 3.698.065 | 83,5% | sim, generosa. Das recusas, 1.348.654 são "eleitor não encontrado", em geral eleitor de outra seção, e 21.072 são "ano de nascimento diferente" |
| B: nível 2 + recusas + "já votou" + títulos errados **sem** nova digitação em até 30 s | 3.452.760 | 77,9% | sim. É a que eu usaria |
| C: nível 2 + **todos** os títulos errados | 7.167.598 | 161,8% | não. Conta como eleitor perdido quem foi redigitado em 15 s |
| D: todo atendimento que não terminou em voto, fora justificativas | 8.754.579 | 197,6% | não. Mesma razão, e conta várias vezes o mesmo eleitor |

**Resposta:**

- Com leitura razoável, o teto da supressão **registrada no diário** fica abaixo da margem: de 47,7% a 83,5%.
- Ele só passa da margem contando como eleitor perdido cada título errado corrigido em segundos (leituras C e D). Essas leituras não se sustentam pelo intervalo medido.
- A folga é menor do que o doc 14 dá a entender: 83,5% e não 47,7%.

O teto do doc 14 **não cobre** a supressão sem registro: o eleitor mandado embora sem que o mesário digite nada. Pelo princípio 8, isso é risco e não tem limite no diário. O único limite público é a abstenção (30.509.005 no 2º turno). Essa parte é **não decidível com dados públicos**.

### 2.4 H17(b): "a mesma forma de habilitação" tem poder?

Não refiz a seleção dos 21 e 118 (o parecer 32 já os contou). Medi o poder do critério com as parcelas nacionais de habilitação do BU (Fato, tabela `secao`).

No 2º turno, 87,3% dos votantes foram habilitados pela digital, 6,7% pelo ano de nascimento e 5,7% sem biometria. Se o eleitor seguinte fosse uma pessoa qualquer da fila:

- entre os 21 interrompidos do 2º turno (13 pela digital, 4 pelo ano, 4 por mesário ou dado digitado), o número esperado de "voto em seguida com a mesma forma" seria de cerca de **11**. O observado é **15**;
- no 1º turno, o esperado é de cerca de **73**. O observado é **88**.

Há um pequeno excesso, compatível com parte dos eleitores ter voltado. Mas a maior parte das coincidências aconteceria só pelo acaso, porque quase todo mundo vota pela digital.

O doc 14 já diz "compatível, não prova". Acrescento que o critério quase não discrimina. Isso reforça o **não decidível**.

### 2.5 Veredito H17

**Sustentado com ressalvas.** As contagens reproduzem exatamente. Ressalvas:

1. o nível 1 do teto não é teto: o desconto "seguido de voto em 180 s" é a taxa normal da fila (80,9%);
2. o teto razoável vai até 83,5% da margem (com recusas e "já votou"), não até 47,7%; não passa da margem;
3. a supressão sem nenhum registro no diário não tem teto nos dados públicos;
4. "mesma forma de habilitação" quase não discrimina.

A conclusão "sem sinal nos dados públicos" se mantém para a supressão seletiva (o teste do estatístico, que não refiz). O tamanho total da supressão é **não decidível**.

---

## 3. H23. Recarga e carga fora da cerimônia

### 3.1 Reprodução das recargas, lida do bruto (Fato)

`cetico-55-h23-recargas.mjs` não usa os catálogos do autor (`h23-sessoes`, `h23-relidos`). O universo são todos os pacotes com BU cujo diário tem 2 ou mais `logd.dat`: 7.645 no 1º turno e 11.748 no 2º, pela coluna `logs_no_pacote` do perfil (`src/perfil-secoes.js`).

Uma recarga sempre arquiva o diário anterior dentro do novo. Por isso, pacote com 1 diário não tem recarga visível.

Leio cada `logd.dat`, inclusive os aninhados, e tiro dele: urna, código de carga, data digitada, linha de sucesso, mídia de carga e sua data de geração, seção informada, linhas ERRO e votos. Depois aplico a regra do doc 08 com código meu. Resultado: 0 erro de leitura.

| | Doc 08 / 14 | Meu script |
|---|---:|---:|
| Pares de recarga no 1º turno | 2.674 | 2.674 |
| Sem motivo no 1º turno | 502 (501 antes de 04/10, 1 depois) | 502 (501 + 1) |
| ... mesmo dia da carga anterior | 234 | 234 |
| ... zonas | 275 | 275 |
| ... maiores UFs | SP 132, PA 64, RJ 45, MG 36, BA 32 | SP 132, PA 64, RJ 45, MG 36, BA 32 |
| ... maiores zonas | PA 0094 52, PI 0017 12, SP 0212 10, SP 0017 8 | idem |
| Sem motivo no 2º turno (entre os turnos + 25/10) | 23 + 1 | 23 + 1 |
| BUs do 2º turno vindos de recarga entre os turnos | 1.567 | 1.567 |

Reproduz exatamente.

### 3.2 A zona 0094 do PA, conferida no diário (pergunta 4)

Conferi no diário bruto as seções 0001, 0003 e 0063 do município 04030. Também cruzei as 171 seções da zona que têm BU.

**Fato:**

- A zona 0094 tem **171** seções com BU no 1º turno. A carga de 25/09 usou **6 mídias de carga**, todas geradas no mesmo computador da zona em 18/09. Em 26/09 foram refeitos exatamente os **2 primeiros lotes de mídia**: **56** urnas, das seções 0001 a 0061.

| Mídia | Gerada em 18/09 às | Urnas | Carga | Refeita? |
|---|---|---:|---|---|
| E6FA0A4C | 12:31:21 | 28 (seções 0001–0029) | 25/09, 10:01–15:27 | sim, em 26/09 09:26–11:07, com a mídia 383784B2 (gerada às 13:42:40) |
| 2AF6CBDB | 12:58:31 | 28 (seções 0030–0061) | 25/09, 10:01–15:28 | sim, em 26/09 09:26–12:20, com a mídia B783A114 (gerada às 13:51:30) |
| 844F5803 | 13:07:18 | 28 (0063 em diante) | 25/09, a partir de 15:33 | não |
| 4FDEFA63, 913EC2F4, E821B0C5 | (não conferido) | 87 | 25/09 à tarde e à noite | não (1 seção, a 0117, recarregada em 03/10) |

- Das 56 urnas, 52 caem em "sem motivo". As outras 4 (0001, 0002, 0006, 0043) têm linha ERRO no diário anterior. Na 0001, por exemplo, a urna foi ligada em 26/09 às 09:23 sem a mídia ("ERRO GAP Mídia externa ausente") antes da recarga.
- Nas seções refeitas, a mídia de votação também foi gerada de novo, em 26/09 às 09:07:17 (seção 0001). Antes era a de 18/09 às 15:33:21.
- Em 25/09 as urnas passaram por carga, teste e abertura do aplicativo de votação. Em 26/09, pelo mesmo ciclo.

**O que isso corrige no doc 14:**

1. "É um lote da zona inteira refeito no dia seguinte" está errado. Foram 56 de 171 urnas: os dois lotes cujas mídias tinham sido substituídas, ainda em 18/09, por uma versão gerada 53 a 71 minutos depois.
2. "Com outra mídia de carga, gerada antes da primeira carga" é verdade, mas esconde o principal: a mídia nova é de **geração posterior à mídia antiga**. A primeira carga usou uma versão já superada.

A regra do doc 08 só vê "mídia nova" quando ela foi gerada **depois da carga anterior**. Não vê quando foi gerada depois da **mídia anterior**.

**Recontagem das 502 pela mídia (Fato):**

| Mídia na recarga | Recargas |
|---|---:|
| Mesma mídia | 441 |
| Outra mídia, de geração **posterior** à antiga | **55** (PA 0094: 52; RJ 0148: 2; BA 0156: 1) |
| Outra mídia, de geração anterior à antiga | 6 |

**Hipótese (não testada, princípio 8):** na zona 0094 a primeira carga usou mídias de uma versão já substituída, e o cartório refez as 56 no dia seguinte, com nova mídia de votação. O diário mostra o **o quê** (mídia superada). Não mostra o **porquê** (o que mudou entre as duas versões nem por que a versão antiga foi usada). Isso continua pedindo a ata e, aqui, também o registro da geração de mídias da zona em 18/09.

**Recomendação:** separar as 55 numa classe própria, "mídia substituída por versão mais nova", fora de "sem motivo". O pedido de ata da zona 0094 deve perguntar pelas duas gerações de mídia de 18/09.

### 3.3 H23(a): o +0,10 e as 2 seções "de cédula" (Fato, com errata ao meu parecer 39)

`cetico-55-h23-comparecimento.mjs` usa a minha lista de 1.567 seções (lida do bruto). A taxa vem do comparecimento de Presidente da tabela `secao_eleicao`.

| Grupo | Seções | Variação × zona (pontos) | Em eleitores |
|---|---:|---:|---:|
| Doc 14, sem as 2 de cédula | 1.565 | +0,101 | +499 |
| Doc 14, sem cédula e sem reserva no 1º turno | 1.528 | +0,060 | +289 |
| **Meu, sem cédula e sem reserva no 1º turno** | 1.528 | **+0,060** | **+289** |
| **Meu, todas as 1.567** | 1.567 | **+0,115** | **+568** |
| Meu, reserva no 1º turno (inclui as 2 de MG) | 39 | +2,067 | +280 |
| Meu, sensibilidade: referência = mesmo local, não zona | 1.483 | +0,101 | +475 |
| Meu, sensibilidade: toda carga entre 05/10 e 24/10 (recarga ou carga nova) | 2.240 | +0,140 | +994 |

O grupo de 1.528 reproduz exatamente. A diferença no total explica-se assim:

- o autor (e eu, no parecer 39) usou o campo `secao.comparecimento`, que é o contador da urna no BU;
- nas duas seções de MG que votaram em cédula no 1º turno (MG 50075/0047/0041 e MG 41238/0039/0168), esse contador é 0, porque o BU é do Sistema de Apuração (cédula digitada);
- o comparecimento real de Presidente nelas foi **278 e 281** (`secao_eleicao.comparecimento_majoritario`). Com o campo certo, essas seções nem precisam sair: as 1.567 dão +0,115 ponto (568 eleitores).

**Errata ao parecer 39:** o "+0,23 (p 0,001)" não vinha de 2 seções anômalas. Vinha de ler 0 eleitores onde houve 278 e 281. A conclusão (efeito pequeno, fora da correção) não muda. A mesma diferença de campo existe em 28 seções do 1º turno e 27 do 2º (apuração manual), com efeito desprezível na referência da zona.

### 3.4 O "pior caso" da H23

O doc 14 soma os votos do 13 nos conjuntos marcados (75.235) e compara com a margem. Isso cobre voto **inserido**. Se o mecanismo fosse **troca** 22→13 nessas seções, o pior caso é o dobro: 150.470, ou 3,4% da margem. Continua sem mudar o vencedor.

### 3.5 O que não refiz

- Os 64 diários sem a linha final da carga: sustentados no parecer 41; não refeitos aqui.
- Os testes de permutação do doc 08 (p 0,026 e 0,074): não refeitos.

### 3.6 Veredito H23

**Sustentado com ressalvas.** Contagens reproduzem do bruto, com código meu. Correções:

1. a zona 0094 do PA não refez a zona inteira, refez 56 de 171 urnas, e com mídia de geração mais nova (55 das 502 têm esse padrão);
2. as 2 seções "de cédula" não tinham comparecimento 0; com o campo certo, o efeito nas 1.567 é +0,115 ponto (568 eleitores).

A conclusão final "sem sinal nos dados públicos; motivo não decidível" se mantém.

---

## 4. H24. Trânsito e atributos especiais

### 4.1 Contraprova própria (Fato)

`cetico-55-h24-contraprova.mjs` usa:

- um leitor DER próprio para alterar a cópia em memória;
- `lerBu` e `verificarLacres` de `src/` para conferir;
- os dados abertos lidos direto do zip bruto `eleitorado_local_votacao_2026.zip`, e não do `h24-atributos.jsonl` do autor.

Acrescentei a conferência **V5est**: aptos da eleição estadual = `QT_ELEITOR_ELEICAO_ESTADUAL`.

**Seções, por regra fixada antes de rodar, diferente da do autor:**

| Id | Regra | Seção | Tipo | Aptos (seção + trânsito) | Comparecimento |
|---|---|---|---|---|---:|
| S1 | mais eleitores em trânsito no país | AL 27855/0001/0533 | urna de seção | 505 (0 + 505) | 473 |
| S2 | primeira principal com agregada do RJ | RJ 58017/0116/0217 | urna de seção | 177 (176 + 1) | 123 |
| S3 | mais aptos do MA | MA 08036/0033/0185 | urna de seção | 460 (460 + 0) | 370 |
| S4 | primeira da BA com urna de reserva | BA 30007/0205/0031 | reserva | 283 (283 + 0) | 229 |
| S5 | última do ES com 2º turno de Governador | ES 57991/0046/0134 | urna de seção | 308 (308 + 0) | 239 |
| S6 | seção seguinte a S3 (par de N6) | MA 08036/0033/0186 | urna de seção | 422 (422 + 0) | 352 |

**Controle:** sem alteração, as 6 passam em todas as conferências, inclusive a S2 com seção agregada e a S4 de reserva.

**Resultado** ("acusa" = a conferência falha em todas as seções em que a alteração se aplica; nível A = arquivo alterado depois da urna; nível B = dentro da urna, com BU, RDV e diário coerentes):

| Alteração | Lacre (A) | V1 | V2 | V3 | V4 | V5 | V5est | Soma | Diário, RDV, oficial (A) | No nível B, alguma conta acusa? |
|---|---|---|---|---|---|---|---|---|---|---|
| N1 aptos −3 (eleitor apagado) | acusa | acusa | passa | passa | acusa | acusa | acusa | passa | passa | **sim** (V1, V4, V5) |
| N2 trânsito −3 e aptos da seção +3, mesmo total (só S1: as outras não têm 3 em trânsito) | acusa | passa | passa | passa | passa | passa | — | passa | passa | **não** |
| N3 aptos e aptos da seção +3, feito igual no 1º turno (atacante coerente) | acusa | passa | passa | passa | **passa** | acusa | acusa | passa | passa | **só V5** |
| N4 comparecimento −3 e 22 −3 (voto suprimido) | acusa | passa | passa | acusa em 1 de 5 (S5, Governador não mexido) | passa | passa | passa | passa | acusa | **não** (se o Governador também cair) |
| N5 brancos −3 e 13 +3 (branco virou 13; não cabe na S1, que tem 2 brancos) | acusa | passa | passa | passa | passa | passa | passa | passa | RDV e oficial acusam | **não** |
| N6 aptos da seção +3 em S3 e −3 em S6, mesma zona | acusa | passa | passa | passa | passa | acusa | — | passa | passa | **sim** (V5) |
| N7 comparecimento e 13 até 100% dos aptos (Governador junto) | acusa | passa | **passa** | passa | passa | passa | passa | passa | acusa | **não** |
| N7+ o mesmo, 1 voto além dos aptos | acusa | passa | acusa | passa | passa | passa | passa | passa | acusa | **sim** (V2) |

**O que confirma do doc 14:**

- toda alteração que muda o **total** de aptos de uma seção (N1, N3, N6, como M1, M2, M3, M6 e M8 do autor) é acusada por V5;
- o lacre pega toda alteração feita depois da urna;
- voto no lugar de quem faltou e troca de votos são ponto cego no nível B.

**O que corrige ou acrescenta:**

1. **"As contas acusam toda alteração de aptos ou de trânsito" é largo demais.** N2 muda o trânsito (−3) e os aptos da seção (+3) sem mudar o total, e passa em **todas** as contas, nos dois níveis (no A, só o lacre pega). Os dados abertos trazem `QT_ELEITOR_SECAO`, mas ele não é igual aos aptos da seção do BU: S2 78 × 176, por causa da agregada; S5 310 × 308 e S6 423 × 422, por eleitores que saíram em trânsito. Por isso a divisão entre aptos da seção e trânsito não tem conferência pública direta.
   - O efeito de N2 sobre votos é nulo: o total de aptos não muda, então não abre espaço para voto a mais. Por isso não muda a conclusão.
   - Mas a frase deve dizer "toda alteração do **total** de aptos".
2. **Contra um atacante coerente entre os turnos (N3), V4 não acusa. Só V5 acusa.** O doc 14 diz que "V4 pega mudança no total". Isso vale só se o 1º turno ficar como estava. Na prática, V5 é a **única** linha de defesa contra seção inflada de modo coerente, e V5 depende do cadastro (ponto cego 3 do doc 14).
3. **Supressão de votos é ponto cego no nível B** (N4), e o doc 14 não a lista. Comparecimento e votos reduzidos juntos passam em todas as contas de contagem quando o atacante ajusta todos os cargos. Isso liga a H24 à H17: o voto apagado dentro da urna é a "supressão" que nem o diário vê.
4. **O teto do ponto cego "voto no lugar de quem faltou"** é a abstenção: N7 põe votos até 100% dos aptos e passa em tudo no nível B. N7+ (101%) é pego por V2.
   - Abstenção do 2º turno: 158.745.079 aptos − 128.236.074 de comparecimento = **30.509.005** (Fato, `secao_eleicao`), 6,9 vezes a margem.
   - O doc 14 diz isso em palavras ("limitado só pelo comparecimento ≤ aptos"). Peço que o número entre, para que a linha "H24: 13,2% da margem" da tabela final não seja lida como teto do ponto cego.

### 4.2 Veredito H24

**Sustentado com ressalvas.** A contraprova independente confirma: V5 acusa toda mudança no total de aptos, e o ponto cego é o declarado. Correções:

1. "toda alteração de trânsito" vira "toda alteração do total de aptos" (N2 passa);
2. contra um atacante coerente nos dois turnos, só V5 acusa (N3);
3. a supressão de votos entra no ponto cego (N4);
4. o teto do ponto cego é a abstenção, 30.509.005.

A conclusão final "sem sinal nos dados públicos" se mantém.

---

## 5. Vereditos finais que eu sustento (pergunta 5)

| Hipótese | Veredito final | Em uma frase simples |
|---|---|---|
| H10 | **Refutada** como escrita; a divisão entre troca e rotatividade em AC, AP, RR, MA, AM e TO é **não decidível com dados públicos** | O 13 não ganhou mais votos do que havia para ganhar em todos os estados; em 6 estados o ganho só fecha com eleitores que mudaram de lado ou com eleitores diferentes em cada turno, e os arquivos públicos não dizem qual |
| H17 | **Sem sinal nos dados públicos**; o que não deixa registro no diário é **não decidível com dados públicos** | Não há sinal de mesários barrando eleitores de um lado, e mesmo contando com folga todo atendimento registrado que não virou voto, o total fica abaixo da diferença entre os candidatos; o que não fica registrado, o diário não mostra |
| H23 | **Sem sinal nos dados públicos**; motivo das recargas **não decidível com dados públicos** | As urnas recarregadas tinham carga assinada e votaram como as vizinhas; por que foram recarregadas só a ata do cartório diz |
| H24 | **Sem sinal nos dados públicos** | As contas pegam eleitor inventado ou mudado de seção, se o cadastro publicado for o verdadeiro; não pegam voto trocado, inserido no lugar de quem faltou ou apagado dentro da urna |

## 6. Riscos que ficam

- **Troca, inserção e supressão dentro da urna** (H10a, H24 N4/N5/N7): sem limite nos dados públicos, salvo comparecimento ≤ aptos (abstenção de 30.509.005 no 2º turno). Cabe à integridade do programa (H25, H27).
- **Cadastro na origem** (H24): V5 é a única conta contra seção inflada de modo coerente, e ela compara o BU com dados que saem do mesmo cadastro.
- **Supressão sem rastro** (H17): eleitor mandado embora sem que o mesário digite nada não aparece no diário. Nenhum teto do doc 14 o cobre.
- **Zona 0094 do PA:** o padrão "mídia substituída" está no diário; o porquê, não.
- **Não refeitos aqui:** H10(a) por faixa, os 64 diários sem a linha final, os testes de permutação do doc 08, e a contagem "15 de 21 / 88 de 118" da H17(b) (só medi o poder dela, item 2.4).

## 7. Para refazer

```
node --max-old-space-size=4096 scripts/auditoria/cetico-55-h10.mjs                 # H10 (b), teto de troca e disponível líquido por UF, ~1 min
node scripts/auditoria/cetico-55-bu-bruto.mjs am 02755 0022 0070                   # conferência no BU bruto (lacre incluído)
node scripts/auditoria/cetico-55-h17-varrer.mjs --paralelo 3                       # H17 (a), todos os diários do 2º turno, ~1 h
node scripts/auditoria/cetico-55-h17-resumo.mjs                                    # junta, tetos e taxas de base
node --max-old-space-size=4096 scripts/auditoria/cetico-55-h23-recargas.mjs --turno 1   # 502 recargas sem motivo, do bruto, ~1 min
node --max-old-space-size=4096 scripts/auditoria/cetico-55-h23-recargas.mjs --turno 2   # 1.567 BUs de recarga entre os turnos
node --max-old-space-size=4096 scripts/auditoria/cetico-55-h23-comparecimento.mjs       # H23 (a)
node --max-old-space-size=4096 scripts/auditoria/cetico-55-h24-contraprova.mjs          # H24, ~10 s
```

Saídas em `data/parsed/auditoria/cetico-revisor/55/`.
