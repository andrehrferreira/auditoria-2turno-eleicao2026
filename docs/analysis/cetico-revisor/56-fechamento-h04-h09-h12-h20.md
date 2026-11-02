# 56. Parecer: fechamento de H04, H09, H12 e H20 (doc 13 do engenheiro de segurança)

Achado revisado: [engenheiro-seguranca-urna/13-fechamento-h04-h09-h12-h20.md](../engenheiro-seguranca-urna/13-fechamento-h04-h09-h12-h20.md) (commit `454985b`), scripts `scripts/auditoria/seguranca-fechamento-*.mjs`, saídas em `data/parsed/auditoria/engenheiro-seguranca-urna/fechamento/`. Base anterior: pareceres 24, 25, 29 e 47. Revisão de 02/11/2026.

**Universo.** Escrevi um programa próprio (`cetico-56-h09b.mjs`) que não importa nada dos scripts do engenheiro. Ele leu os dois turnos inteiros:

- 499.248 seções por turno e 499.207 pacotes;
- 41 seções sem pacote e 0 pacote com erro;
- 1.040 pastas repetidas no 2º turno, contadas uma vez.

O 1º turno levou 13 min e o 2º, 14 min, com 6 processos.

**Privacidade.** Nenhum título nem CPF foi gravado. Os números ficam só na memória:

- o que passa entre processos é um hash com sal aleatório, criado a cada execução e nunca gravado;
- a saída tem só contagens e endereços de seção;
- uma trava aborta a gravação se achar 10 a 12 dígitos seguidos em qualquer texto;
- os trechos do diário mostrados aqui têm todo número de 6 dígitos ou mais trocado por `#`.

Não li `data/private/`.

## Resposta curta

| Hipótese | Conclusão do autor | Meu veredito sobre o doc 13 | Veredito final que sustento | Em linguagem simples |
|---|---|---|---|---|
| **H04** arquivos alterados ou gerados fora de urna oficial | Refutada no alcance público; "programa adulterado e assinado com a chave oficial" fica não decidível | **Sustentado com ressalvas.** O "segundo programa" não é independente na definição: copia literalmente a regra de boot do primeiro. Medi com outra definição (cada voto contra o último "liga" da urna): 0 voto sem verificação completa, em 125.275.244 e 128.235.724 votos. Conferi 6 das 72 seções no bruto: todas com contingência de MV | **Refutada** no que os arquivos públicos alcançam. A variante "software adulterado assinado com a chave oficial" é **não decidível com dados públicos** | Nenhum arquivo foi mexido depois de sair da urna, e nenhuma urna recebeu voto sem antes conferir o próprio programa. Um programa falso assinado com a chave verdadeira não pode ser descartado só com estes arquivos |
| **H09** os arquivos permitem ligar voto a eleitor | Fato que pede explicação; o número recusado na suspensão é o título de quem está na cabine | **Sustentado com ressalvas, e com um erro de classificação no script.** As proporções centrais reproduzem exatamente. Mas o script põe "Mesário N **não** é eleitor da seção" na classe "é eleitor da seção": três linhas da tabela e duas frases saem erradas. A conclusão não muda; fica até mais forte. Um teste novo mostra que a recusa depende de o eleitor ter sido liberado pelo **título**. Isso derruba a frase "o número aceito não é o eleitor da cabine, porque a urna recusaria" | **Fato que pede explicação** | O registro público da urna traz, quando o mesário tenta interromper o voto de alguém, um número de título que, pela estrutura do registro, é o do próprio eleitor que estava votando. O registro não diz em quem ele votou, mas diz que ele estava lá, a que horas e como terminou a votação dele |
| **H12** QR do e-Título | Não decidível com dados públicos; teto de 8.632.488 | **Sustentado com uma correção no teto.** A urna não lê QR: isso é Fato pelo catálogo dos dois turnos. Mas o teto deixa de fora os 7.251.810 eleitores **sem biometria cadastrada**, também liberados sem digital. O teto do mecanismo é de 15.884.298 no 2º turno | **Não decidível com dados públicos** | A urna não sabe se o eleitor mostrou e-Título ou papel. Se alguém usou um e-Título falso, isso aparece no registro igual a qualquer liberação sem digital, e os outros testes não acharam sinal disso em massa |
| **H20** relógio ou ordem adulterados | Sem sinal; BA 0166 vira Fato (atraso de pelo menos 54 min) | **Sustentado.** A prova da BA é causal: a urna reserva arquivou, às 10:02:38 no relógio dela, um diário que a urna original escreveu até as 10:56:03 no relógio dela. Reproduzi a BA e o controle do PR número a número. Ressalvas: o teste dá só o **piso** (≥ +54 min); o teto de 60 min vem da leitura do parecer 47. A faixa do controle do PR está simplificada. O script não reconhece a variante "log corrompido da ME" | **Sem sinal nos dados públicos** (com BA 0166 como Fato de relógio errado, sem efeito no resultado) | Achamos uma urna com o relógio quase uma hora atrasado, provado pelos próprios registros. Isso atrasou a abertura da seção, mas não criou nem tirou voto |

---

## H04: inicializações e etapas

### O "segundo programa" é independente?

**Não na definição. Sim na leitura.** Li os dois códigos lado a lado.

- A regra que abre um boot novo é **a mesma expressão**, copiada. Em `seguranca-fechamento-varredura.mjs`:

  ```js
  if (app === 'LOGD' && (msg.startsWith('Início das operações do logd') || (msg.startsWith('Urna ligada em') && boot.apps > 0))) abrir();
  else if (boot && app === 'GAP' && boot.et.length > 0 && msg.startsWith('Verificação de assinatura - Etapa [1] ')) abrir();
  ```

  `seguranca-varrer-logs.mjs` tem as mesmas duas condições.
- Também são iguais nos dois:
  - a expressão regular da etapa;
  - o critério de voto (`'O voto do eleitor foi computado'` no dia);
  - "alcança o dia";
  - a eliminação de pacote repetido pelo `.vsc`;
  - o leitor de ZIP (`src/zip.js`).
- O autor declara isso ("usei só a definição"). Mas chamar de "independente" exagera. A concordância seção a seção prova que **não há erro de transcrição** entre os dois códigos. Não prova que a definição de boot não esconde nada.
- O risco concreto de uma definição compartilhada é este: uma religação sem "Início das operações do logd" e sem nova "Etapa [1]" ficaria dentro do boot anterior. Um voto depois dessa religação herdaria as etapas de antes.

### Teste com outra definição (meu)

Cada voto do dia (`O voto do eleitor foi computado`) é ligado ao **último marcador de ligação** da mesma urna no mesmo texto. Marcador é "Início das operações do logd" **ou** "Urna ligada em", sem condição. Depois conto as etapas de "Verificação de assinatura" e as falhas desde esse marcador. A regra é mais desconfiada que a do autor: qualquer "Urna ligada em" zera a contagem.

| | 1º turno | 2º turno |
|---|---|---|
| Votos do dia lidos | **125.275.244** (igual ao primeiro e ao segundo programa) | **128.235.724** (igual) |
| Votos sem marcador antes | 0 | 0 |
| Votos com 0 etapa desde a última ligação | **0** | **0** |
| Votos com alguma etapa sem SUCESSO desde a última ligação | **0** | **0** |
| Votos por nº de etapas desde a última ligação | 33: 347.179; 34: 118.989.940; 35: 5.910.517; 51 a 102: 27.608 (duas sequências seguidas sem religação; todas com sucesso) | 33: 382.325; 34: 121.706.796; 35: 6.125.304; 66 a 102: 21.299 |

**Fato:** com uma definição diferente, nenhum voto dos dois turnos foi gravado depois de uma ligação sem a sequência completa de verificação (33 etapas ou mais, todas com SUCESSO). O resultado do autor se sustenta com uma regra que não depende da segmentação dele.

### As 72 inicializações fora da sequência comum: 6 conferidas no bruto

Usei `cetico-56-h04-casos.mjs` (código meu), que lista os boots de votação do dia sem a etapa `/dsk/fe/estatico/<seção>-lo.vsc`:

| Turno | Seção | Boot sem a etapa da MV | Etapas | Contingência de MV no boot | Falhas | Votos no boot |
|---|---|---|---|---|---|---|
| 2º | CE 13218/0008/0003 | 14:56:32, urna 02276661 | 33 | sim | 0 | 35 |
| 2º | SP 62197/0300/0020 | 10:38:32, urna 02299029 | 33 | sim | 0 | 4 |
| 2º | PA 05916/0080/0132 (diário da urna original, dentro do pacote) | 11:41:03, urna 01797013 | 33 | sim | 0 | 1 |
| 1º | BA 38555/0121/0081 | 07:16:49, urna 02240256 | 33 | sim | 0 | 95 |
| 1º | MG 41238/0026/0031 | 08:56:27, urna 02425174 | 33 | sim | 0 | 237 |
| 1º | SP 71072/0327/0504 | 13:52:56, urna 02238680 | 33 | sim | 0 | 110 |

Na SP 0020 li o boot inteiro. Ele mostra a sequência:

1. a MV nova (serial diferente do registrado na MI) entra;
2. 33 etapas passam com SUCESSO: a MV nova só tem `infomidia.vsc`, então não existe o `-lo.vsc` da seção para verificar;
3. "Início do procedimento de contingência de MV", "Cópia dos diretórios da MI para a nova MV", "Contingência de MV executada com sucesso";
4. a votação reinicia.

Os três boots anteriores dessa urna, sem MV, pararam em "GAP erro 70" e não votaram. É o mecanismo descrito pelo autor.

**Ponto cego que fica, sem rastro a buscar:** os arquivos copiados da MI para a MV nova não são verificados de novo naquele boot. Eles vêm da MI, que foi verificada. Um software adulterado e assinado passaria igual. Isso é a parte não decidível.

**Veredito H04: sustentado com ressalvas.**

1. Trocar "dois programas independentes" por "duas implementações da mesma definição, mais uma terceira medida com definição própria (parecer 56)".
2. A conclusão "refutada no alcance público" está certa. "Programa adulterado e assinado" fica não decidível, como o autor escreveu.

---

## H09: sigilo do voto

### (a) Título codificado nos arquivos

Não refiz a varredura de bytes (cerca de 93 min por turno). Li o código e os controles.

- Os controles positivos são bons:
  - natural: 100% das sondas vistas em claro;
  - sintético: 506.531 de 506.531 formas.
- A isca tem a mesma forma e o mesmo comprimento.
- Os ambíguos (palíndromos, pedaço de outro número) ficam separados.
- Os achados restantes estão na coluna de encadeamento, na taxa das iscas.

**Absolvição falsa possível, já declarada pelo autor:** hash com sal ou com chave, e o título de quem nunca aparece em claro. **Veredito (a): sustentado pela revisão de código; não reproduzido no universo.** Como (a) não acha sinal, o veredito da H09 não depende dela.

### (b) De quem é o número da suspensão

**O fluxo no bruto** (AC 01007/0009/0007 e 0305, 1º turno, dígitos trocados por `#`):

```
Eleitor sem atividade por 45 segundos
Mesário indagado se eleitor está votando
Eleitor não está votando
Solicitado título eleitoral para suspensão do eleitor
Mesário digitou o título para suspender o eleitor
Título # é inválido para suspender a votação
Mesário digitou o título para suspender o eleitor
Título # é válido para suspender a votação
Eleitor foi suspenso pelo mesário
Atribuido voto nulo por suspensão [Presidente]
Eleitor votou parcialmente e em seguida foi suspenso
```

#### Reprodução com código meu (universo, dois turnos)

Grupos:

- V = aceito, I = recusado;
- "sem papel" = número com DV de título válido que não é de mesário, presidente no encerramento nem operador daquele pacote.

| | 1º turno | 2º turno | Doc 13 |
|---|---|---|---|
| Sessões de eleitor no dia | 136.864.328 | 139.335.304 | igual |
| Base: liberadas pelo título (título ÷ título+CPF) | 77,97% | 74,46% | igual |
| Base: título na anterior, se a atual é título | 90,77% | 85,91% | — |
| **I sem papel**: linhas / sessões | 43.686 / 20.087 | 3.616 / 1.868 | igual |
| … sessão **atual** pelo título | **20.082 de 20.087 (99,98%)** | **1.868 de 1.868** | igual |
| … sessão anterior / seguinte pelo título | 87,46% / 87,66% | 84,33% / 84,97% | igual |
| … vizinha **habilitada** anterior / seguinte pelo título (medida nova) | 87,43% / 87,63% | 83,89% / 85,37% | — |
| … números numa só sessão da urna | 20.038 de 20.062 (99,88%) | 1.864 de 1.866 | igual |
| … números numa só **seção do país** (hash com sal) | 20.062 de 20.062 | 1.866 de 1.866 | — |
| … código de UF igual ao da seção | 90,92% | 91,37% | igual |
| … tentativa seguinte é o mesmo número, de novo recusado | 22.656 | 1.682 | igual |
| … distância ao título de mesário mais próximo da urna | ≤ 2 dígitos: 33; 6 ou mais: 40.203 | ≤ 2: 1; 6 ou mais: 3.287 | — |
| **V sem papel**: sessões | 12.032 | 1.973 | igual |
| … sessão atual pelo título | 44,58% | 63,30% | igual |

Os números do autor nos grupos "sem papel" **reproduzem exatamente**.

#### Erro de classificação no script do autor (Fato)

Em `seguranca-fechamento-varredura.mjs`:

```js
if (msg.includes('é eleitor da seção')) mesEleitor.add(d12);
```

O texto "Mesário N **não é eleitor da seção**" também contém "é eleitor da seção". Por isso todo mesário que não é eleitor da seção entra como eleitor da seção. Conferi na AC (1º turno): os 696 aceites "mesário eleitor da seção" do autor são 303 de eleitor da seção mais 393 de **não** eleitor. Com a classe correta:

| | Doc 13, 1º / 2º | Correto (meu), 1º / 2º |
|---|---|---|
| Aceites de mesário eleitor da seção (linhas) | 69.771 / 6.454 | **25.206 / 2.167** |
| … sessão atual pelo título | 78,8% / 76,4% | 79,01% / 74,80% |
| … números numa só sessão | 81,2% / 95,3% | 80,3% / 95,4% |
| Pares urna × mesário eleitor da seção só aceitos | 54.539 / — | **19.245 / 2.059** |
| Mesário **não** eleitor da seção: recusado × aceito | 3 × 141 / 0 × 53 | **0 × 44.565 / 0 × 4.287** |
| Mesário sem mensagem "é / não é eleitor": recusado × aceito | (contado acima como "outra seção") | 2 sessões (3 linhas) × 141 / 0 × 53 |
| Mesário eleitor da seção recusado (pares; cada um numa só sessão) | 103 / 6 | 103 / 6 (igual) |
| … aceito antes / depois / antes e depois da recusa | 11 / 5 / 1 | 11 / 5 / 1 (igual) |
| … aceito na própria sessão da recusa | 0 | 0 |
| … tipo da sessão da recusa | — | **103 de 103 e 6 de 6 pelo título** |

**Efeito:** a conclusão de (b) **não muda e fica mais forte**.

- Em 44.565 + 4.287 aceites de mesário que não é eleitor da seção, há **0** recusas.
- A recusa de mesário registrado acontece só com quem é eleitor da seção, numa única sessão, sempre identificada pelo título.

Mesmo assim, três linhas da tabela do doc 13 e as frases "54.539 pares" e "3 vezes … contra 141 e 53 aceites" estão erradas e precisam de correção.

#### Leituras alternativas, testadas

| Leitura alternativa | Como testei | Resultado |
|---|---|---|
| **Título do eleitor anterior** (o mesário digita o título de quem acabou de votar) | Se fosse, a sessão anterior seria quase 100% pelo título, e o tipo da sessão atual seria indiferente | Anterior pelo título em 87,46% e 84,33%, abaixo da base de 90,77% e 85,91%; na vizinha habilitada, 87,43% e 83,89%. A sessão atual fica em 99,98% e 100% pelo título. **Refutada no agregado** |
| **Título do eleitor seguinte**, já na mão do mesário | A sessão seguinte seria quase 100% pelo título | 87,66% e 84,97%. **Refutada no agregado** |
| **Título digitado por engano** (erro ao digitar o título de um mesário) | Distância em dígitos ao mesário mais próximo da urna | Só 33 (1º) e 1 (2º) a 2 dígitos ou menos; o grosso está a 6 ou mais. Os erros de digitação caem no grupo "DV inválido" (12.068 e 1.364 linhas). **Explica menos de 0,2%** |
| **Regra "título de outra seção"** (a urna recusaria quem não é da seção) | Mesários registrados que **não** são eleitores da seção | 0 recusas em 44.565 e 4.287 aceites. **Refutada**: a urna aceita título de fora da seção |
| **Regra "recusa quem é eleitor da seção"** | Mesário eleitor da seção | Aceito em 19.245 e 2.059 pares sem nenhuma recusa. **Refutada** |
| **Regra "recusa quem ainda não votou"** ou **"recusa quem já votou"** | Mesário recusado: aceito antes e depois | 11 aceitos antes, 5 depois, 1 antes e depois; nunca na própria sessão. **As duas refutadas** |
| **Fiscal ou servidor que circula** | O mesmo número em mais de uma seção do país | 20.062 de 20.062 e 1.866 de 1.866 numa só seção. **Refutada** |
| **Mesário de outra urna** | Hash nacional de todos os mesários do turno | Sem papel na urna e mesário em outra urna do país: 149 números (1º) e 24 (2º), de 31.942 e 3.825. Pequeno, e parecer 29 já os separa |

#### Teste novo: a recusa depende de o eleitor ter sido liberado pelo título

O doc 13 tira duas conclusões a mais:

- "a urna recusa o título de quem está na cabine", lido como uma regra que confere o cadastro do eleitor;
- daí, "o número **aceito** sem papel não é o eleitor da cabine, porque a urna recusaria".

Há uma segunda regra compatível com os mesmos casos de mesário:

- **(R5)** a urna recusa quando o número digitado é **igual ao identificador digitado** para liberar o eleitor daquela sessão;
- se o eleitor foi liberado pelo **CPF**, o título dele não bate com nada e é **aceito**.

As duas regras fazem previsões diferentes:

| | 1º turno | 2º turno |
|---|---|---|
| Sessões com tentativa de suspensão: título / CPF | 68.174 / 21.894 | 7.185 / 2.358 |
| Recusado sem papel por sessão: título / CPF | **29,46% / 0,02%** (5 casos) | **26,00% / 0%** |
| Aceito sem papel por sessão: título / CPF | 7,87% / **30,46%** | 17,38% / **30,70%** |
| Aceito sem papel em sessão por CPF: previsão se o aceito for "outra pessoa" no mesmo ritmo das sessões por título | 1.723 | 410 |
| … previsão pela R5 (o título do eleitor passa quando a liberação foi pelo CPF) | 8.172 | 1.023 |
| … **observado** | **6.668** | **724** |

Mais dois sinais apontam para a R5:

- o mesário eleitor da seção é recusado **só** em sessão liberada pelo título (103 de 103 e 6 de 6), quando 21% a 25% das sessões de mesário aceito são por CPF. Pela regra do cadastro, a chance de 109 de 109 por acaso seria da ordem de 10⁻¹¹, a não ser que mesário sempre vote pelo título;
- 73 números (1º) e 9 (2º) aparecem na mesma seção uma vez como recusados e outra como aceitos: o padrão do mesário, numa pessoa sem registro de mesário.

**Leitura.**

- *Fato:* a recusa sem papel só acontece em sessão liberada pelo título.
- *Inferência forte:* o número recusado é o **título digitado para liberar o eleitor que estava na cabine**. Essa formulação não depende de qual das duas regras a urna usa.
- *Hipótese:* em sessão liberada pelo CPF, uma boa parte dos números **aceitos** sem papel é o título do próprio eleitor da cabine. O excesso sobre a previsão "outra pessoa" é de cerca de 4,9 mil sessões no 1º turno e 0,3 mil no 2º. É estimativa, não Fato, e não entra na perícia.
- A frase do doc 13 "não é o eleitor da cabine, porque a urna recusaria" é **absolvição falsa** e deve sair.

**As 5 exceções** (recusado sem papel em sessão por CPF, 1º turno, só no AL, MG e PE): AL 27812/0044/0174, AL 27855/0003/0361, MG 41335/0316/0286, PE 25313/0002/0361 e PE 25313/0008/0239. São sessões comuns: CPF, biometria, inatividade, pedido de suspensão. A R5 não as explica. Pode haver outro motivo de recusa (título cancelado, por exemplo). São 5 em 21.894.

### O que a frase "o diário publica o título de quem está na cabine" implica para o sigilo

Formulação que sustento, sem exagero:

> O registro público de cada urna (o diário) grava o número digitado quando o mesário tenta interromper a votação de um eleitor. Quando a urna recusa esse número, a estrutura do registro indica que ele é o título usado para liberar o próprio eleitor que estava na cabine. Isso aconteceu em 20.062 sessões no 1º turno e 1.866 no 2º, uma pessoa por sessão.
>
> O registro **não guarda em quem a pessoa votou**: o arquivo de votos (RDV) vem ordenado por tipo e número, e não pela ordem de chegada (parecer 29). Mas, ao lado do número, o registro mostra:
> - **que a pessoa esteve lá**, na seção e no horário, ao segundo;
> - **como foi liberada** (pelo título; com digital ou por ano de nascimento);
> - **como terminou a votação dela.**

Os desfechos nas sessões com número recusado sem papel:

| Desfecho | 1º turno | 2º turno | O que o registro revela sobre a pessoa |
|---|---|---|---|
| Votou normalmente depois da tentativa | 6.664 | 786 | presença e horário |
| Suspensa com "voto nulo por suspensão" em algum cargo | 6.385 | 77 | que o voto dela **naquele cargo** foi nulo, dado pela urna, e em quais cargos ela confirmou voto (sem dizer em quem) |
| Suspensa sem confirmar nenhum voto | 6.920 | 985 | que ela foi liberada e **não votou** (no 2º turno, não votou para presidente) |
| Outros | 118 | 20 | — |

**Um caso em que o voto fica conhecido (Fato no arquivo; dono do número por inferência).** Nas seções em que todos os votos para presidente foram para um só candidato (17 no 1º turno, 30 no 2º), procurei sessão com número sem papel e voto computado. Achei **uma**: AM 02690/0004/0280, 1º turno, 98 votos para presidente, todos no mesmo candidato. No bruto, às 08:19, há dois "Título # é inválido para suspender a votação". Depois o eleitor volta, confirma governador e presidente, e o voto é computado. Se o número é o do eleitor, o diário público, somado ao boletim, diz em quem essa pessoa votou para presidente. É 1 caso no universo. No 2º turno há 0.

**Sem exagero:**

- o diário não liga número a voto em geral;
- nas seções que não são unânimes, o conteúdo do voto confirmado fica secreto;
- o que é publicado é **presença, horário e desfecho** de dezenas de milhares de pessoas identificáveis.

A lista de presença (o caderno de votação) não é pública. Por isso isso é um vazamento de dado pessoal com relação direta com o voto: comparecimento, abstenção de fato e nulo dado pela urna. O registro tem esses dados, e a urna não precisava gravar o número digitado.

**Veredito H09 (b): sustentado com ressalvas.**

1. Corrigir a classe de mesário: três linhas da tabela e as frases "54.539 pares" e "3 vezes … contra 141 e 53".
2. Escrever "o número recusado é o título digitado para liberar o eleitor da sessão (inferência pela estrutura; a regra da urna não é pública)". Não apresentar isso como lido no arquivo.
3. Tirar "não é o eleitor da cabine, porque a urna recusaria" do número aceito e trocar pela Hipótese acima.
4. Trocar "ligados à hora e ao desfecho da sessão em que votaram" por "da sessão em que foram liberados para votar". Em 6.920 e 985 sessões a pessoa não votou.

**Veredito final H09: fato que pede explicação.**

---

## H12: QR do e-Título

- **Reproduzido:** nos catálogos de mensagens dos dois turnos, as únicas mensagens com "QR" são telas de erro da própria urna. A identificação só tem os tipos "(Título de eleitor)" e "(CPF)" (1º turno, dia: 102.139.763 e 28.855.639; 2º turno, como no doc 13). **Fato:** a urna não lê nem registra o e-Título.
- **O teto está pela metade.** Pelo decodificador do BU (`src/lacres.js`):
  - `por_biografia` (8.632.488) é `comBiometriaHabilitadosPorAnoNascimento`: eleitores **com** biometria liberados por ano de nascimento;
  - os **sem biometria cadastrada** (`sem_biometria`, 7.251.810 no 2º turno) também são liberados sem digital. O AC mostra o fluxo "Identificador (Título) → Ano de nascimento digitado é igual ao do cadastro → Eleitor foi habilitado", sem pedir digital.
- O QR traz justamente número de inscrição e data de nascimento.
- A regra "e-Título só vale com foto", que restringiria o uso a quem tem biometria, é conferência feita por pessoa. Pelo princípio 8, não conta como controle.
- **Teto do mecanismo no 2º turno: 8.632.488 + 7.251.810 = 15.884.298** eleitores liberados sem digital. No 1º turno: 8.342.249 + 6.940.334 = 15.282.583.
- Os dois tetos passam da margem. Isso **não é indício**, como o autor diz.
- **Dá para dizer mais?** Só uma coisa: com a urna sem registro do documento, a H12 se reduz, nos dados públicos, à liberação sem digital (H05/H13). Os testes dessas hipóteses não acharam uso em massa a favor de um lado, com os limites de poder já declarados. O que falta (o QR pode ser forjado? o validador confere online?) é teste de laboratório, como o autor propõe.
- Fica a ressalva do próprio autor: as páginas do TSE foram lidas pelos resultados de busca.

**Veredito H12: sustentado, com a correção do teto. Final: não decidível com dados públicos.**

---

## H20: relógio e ordem

### O teste de unicidade da mídia física está certo?

- **O princípio está certo:** uma mídia física com o mesmo serial só está numa urna de cada vez.
- **A forma de medir o uso é frágil.** O script toma como intervalo de uso da MV o **boot inteiro**. Um operador pode tirar a MV no meio de um boot ou trocá-la entre duas urnas em poucos minutos. Por isso uma sobreposição de boots, sozinha, prova pouco.
- **O que decide a BA não é a sobreposição. É uma restrição causal**, e ela não depende desse intervalo.
- **A tolerância de 5 minutos** e o controle negativo (0 sobreposição entre outras urnas da zona em milhares de pares de cartão de carga) mostram que os seriais não se repetem ao mesmo tempo. Não testam o relógio.

### BA 34134/0171/0166: reproduzido e conferido no bruto

Rodei o script do autor de novo: a saída é **idêntica** à publicada (`h20-midia-ba-34134-0171-0166.json`). No bruto, com código meu (`cetico-56-textos.mjs`, `cetico-56-ver.mjs`):

- O pacote tem só 2 textos de log:
  - o da reserva 01658717 (24/09 a 25/10);
  - o arquivo aninhado `#-01.jez/logd.dat`, só da original 01757577, com 8.982 linhas, de 24/09 até **21/10/2026 10:56:03**. As últimas linhas são "Urna desligada pela chave" (10:55:55) e "Fechando o arquivo de Log" (10:56:03).
- A reserva grava, em 21/10, no relógio dela:

  ```
  10:02:35 Serial da MV: 8372E95F   (Sincronismo de mídia, contingência)
  10:02:38 LOGD Adicionando informação do log da ME
  10:02:38 Arquivo #-01.jez referente ao log da ME
  ```

- Há um só evento de arquivamento e um só texto aninhado. O pareamento é inequívoco.
- **Leitura (Fato):** a reserva leu da MV um diário que a original já tinha fechado. A hora real das 10:02:38 da reserva é posterior à hora real das 10:56:03 da original. Se o relógio da original estava certo, o da reserva estava **pelo menos 53,4 min atrasado**.
- **O relógio da original estava certo?**
  - No 1º turno ela ficou a −9 e −10 min da mediana da zona.
  - O diário dela, contínuo de 24/09 a 21/10, não tem nenhum acerto de hora.
  - É uma referência razoável. Ela também vem de arquivo, não de pessoa.
- **O atraso continuou até 25/10?** Entre 21/10 e 25/10 a reserva não tem nenhuma mensagem de acerto de hora. No dia da votação, o próprio diário confirma o atraso:
  - "Aguardando data e hora para emissão da zerésima" 13 vezes entre 06:40 e 06:55 no relógio dela: a urna se recusou a emitir a zerésima antes das 07:00 do próprio relógio, quando a mesa já tentava;
  - "Aplicativo de Ajuste de Data e Hora não pode ser executado após a impressão da zerésima" às 11:05;
  - "Encerramento só pode ser solicitado após as 17:00:00 horas" às 16:20 e 16:39.

  Tudo isso cabe num atraso de cerca de 1 hora.
- **Ressalvas:**
  1. O teste dá só o **piso** (+54 min, na grade de minutos). O teto de cerca de 60 min, de que depende o "no máximo 1 voto depois das 17h reais", vem da leitura do parecer 47 (−60 na carga), não da mídia. O último voto foi às 15:59:51 no relógio da urna. Com +54 a +60 min, ele fica antes das 17h reais.
  2. **O doc 13 não diz que a seção abriu tarde.** "Urna pronta para receber votos" às 08:00:01 no relógio dela é, em hora real, 08:54 ou mais tarde. O eleitor esperou cerca de 1 hora para começar a votar, e a abertura gravada no BU (08:00:01) não é a hora real. É falha de relógio, sem efeito na contagem. Deve constar no fato.

### Controle positivo PR 74713/0078/0261: reproduzido

A saída é idêntica à publicada. No bruto:

- a original 01653959 escreveu na ME até 16:00:11, no relógio dela;
- a reserva 01673448 arquivou esse diário às 15:09:15, no relógio dela, como "Arquivo #ME.jez referente ao log **corrompido** da ME".

A ordem causal é a mesma da BA. O controle detecta: a original estava pelo menos cerca de 51 min adiantada em relação à reserva. Duas ressalvas:

- **A faixa publicada está simplificada.** O doc 13 diz "δ entre −68 e −51 min". O script dá −240 a −133, −127 a −123, −116 a −112, −101 a −97, −89 a −85, −78 a −74 e −68 a −51 min. O teste exclui δ ≥ −50, mas não fixa o valor perto de −60. Quem fixa é a referência.
- **O script não pega a variante "log corrompido da ME"** (`msg.includes('referente ao log da ME')`). No PR o resultado veio pelos intervalos de boot. Com a variante, viria também pela restrição causal. É perda de poder, não alarme falso. Nas seções SP 71072/0280/0913 e RS 88994/0131/0007 não há arquivamento nem contingência em nenhum turno (conferi). O "não decidível" delas se mantém.

### Votos sem linha (H20b)

Os 15 casos são os do parecer 25: 54 votos no 2º turno e 159 no 1º. Não refiz a tabela de janelas, que é leitura de arquivo caso a caso. O teto de 54 votos sem hora no 2º turno vem de um universo já revisado.

**Veredito H20: sustentado com ressalvas.**

1. BA 0166 é Fato de relógio atrasado pelo menos 54 min, com abertura real tardia.
2. O teto de 60 min tem outra fonte.
3. A faixa do PR precisa ser corrigida.
4. A regra do arquivamento precisa ser ampliada.

**Final: sem sinal nos dados públicos.** O relógio errado da BA não criou nem tirou voto. O efeito máximo sobre o vencedor é de dezenas de votos.

---

## O efeito máximo pode mudar o vencedor?

| Hipótese | Efeito máximo pelos arquivos públicos | Muda o vencedor (margem de 4.430.191)? |
|---|---|---|
| H04 | 0 na parte refutada; sem limite na parte não decidível | Não pela parte testada |
| H09 | 0 votos (é sigilo) | Não |
| H12 | Teto do mecanismo: **15.884.298** liberações sem digital (corrigido); nenhum sinal de uso em massa | Em tese, o teto passa da margem; nenhum teste achou sinal |
| H20 | 54 votos sem hora mais 0 ou 1 voto (BA 0166, com o teto de 60 min do parecer 47) | Não |

## Conferências rodadas

- **H04:**
  - medida própria por voto, com outra definição, nos dois turnos: 0 voto sem verificação completa;
  - totais iguais aos dois programas do autor (125.275.244 e 128.235.724);
  - 6 das 72 seções conferidas no bruto: 6 de 6 com contingência de MV no próprio boot, 33 etapas e 0 falha.
- **H09b:**
  - reimplementação própria no universo: os grupos "sem papel" batem com o autor em todos os números;
  - o erro da classe de mesário foi confirmado na AC (696 = 303 + 393) e medido no universo;
  - testes novos: tipo de liberação × recusa (R5), vizinha habilitada, unicidade nacional com hash, distância ao mesário;
  - 5 exceções descritas;
  - 1 caso em seção unânime conferido no bruto (AM 02690/0004/0280).
- **H12:** catálogos dos dois turnos (nenhuma mensagem de QR ou de documento); semântica dos campos do BU lida no decodificador; somas pelo banco.
- **H20:**
  - BA e PR reproduzidos com saída idêntica;
  - estrutura dos textos dos pacotes da BA, do PR, da SP 0913 e do RS 0007 conferida no bruto;
  - ausência de acerto de hora na reserva da BA entre 21/10 e 25/10;
  - sinais do dia de votação conferidos (espera da zerésima, recusa do ajuste de hora, encerramento).
- **Saídas:** a trava de 10 a 12 dígitos passou em todas.

## Riscos que ficam

1. **H09b continua inferência.** Nenhuma regra alternativa testada sobrevive. A confirmação direta exige a especificação da suspensão ou o caderno da seção, e nenhum dos dois é público. O número de aceitos "do eleitor da cabine" em sessão por CPF é estimativa (Hipótese).
2. **H09a não foi reproduzida no universo.** O veredito vem da revisão de código e dos controles do autor.
3. **H20, BA:** o teto de 60 min depende da leitura do parecer 47. A referência (relógio da original) se apoia no 1º turno e na ausência de acerto de hora até 21/10.
4. **H04:** o limite estrutural. O diário e a assinatura são do próprio software.
5. **H12:** a semântica dos campos do BU foi lida no nosso decodificador, não numa especificação oficial publicada. O teto corrigido depende dela.

## Recomendações

- **Ao autor (doc 13):**
  - corrigir a classe de mesário (`msg.includes('é eleitor da seção')` também pega "não é eleitor") e as três linhas e duas frases afetadas;
  - tirar "o aceito não é o eleitor da cabine";
  - escrever o fato da suspensão como inferência;
  - trocar "em que votaram" por "em que foram liberados";
  - dizer "duas implementações da mesma definição", não "independentes";
  - somar os sem biometria cadastrada ao teto da H12;
  - corrigir a faixa do PR;
  - aceitar "referente ao log corrompido da ME" no arquivamento;
  - registrar a abertura real tardia da BA 0166.
- **Coordenação:** entram na pergunta ao TSE (parecer 29) dois itens novos:
  1. "a recusa compara o número digitado com o identificador digitado na sessão?";
  2. "por que o diário grava o número digitado, se basta gravar 'aceito' ou 'recusado' e o papel de quem autorizou?".
- **Perícia:** só entra o que é completo e conferido:
  - as contagens de sessões com número recusado sem papel (20.062 e 1.866), seus desfechos e o fato de a recusa só acontecer em sessão liberada pelo título;
  - "é o título do eleitor da cabine" entra como conclusão por inferência, com essa palavra;
  - a estimativa do aceito em sessão por CPF fica fora.

## Comandos

```bash
# H09b e H04 (definição própria), universo, um turno por vez (~14 min cada, 6 processos)
node scripts/auditoria/cetico-56-h09b.mjs --turno 2 --workers 6
node scripts/auditoria/cetico-56-h09b.mjs --turno 1 --workers 6
# Tabelas do parecer (lê as duas saídas) → data/parsed/auditoria/cetico-revisor/56/resumo.json
node scripts/auditoria/cetico-56-resumo.mjs
# Seções unânimes para presidente com número de título publicado na suspensão
node scripts/auditoria/cetico-56-unanimes.mjs
# H04: boots de votação sem a etapa da MV, no bruto
node scripts/auditoria/cetico-56-h04-casos.mjs --turno 2 ce/13218/0008/0003 sp/62197/0300/0020 pa/05916/0080/0132
node scripts/auditoria/cetico-56-h04-casos.mjs --turno 1 ba/38555/0121/0081 mg/41238/0026/0031 sp/71072/0327/0504
# Estrutura dos textos de log de um pacote (H20) e trechos do bruto com dígitos mascarados
node scripts/auditoria/cetico-56-textos.mjs --turno 2 --secao ba/34134/0171/0166 --cauda 6
node scripts/auditoria/cetico-56-ver.mjs --turno 1 --uf am --secao 02690/0004/0280 --alvo "inválido para suspender" --data 04/10/2026
# Reprodução do autor (H20)
node --max-old-space-size=8192 scripts/auditoria/seguranca-fechamento-h20-midia.mjs --secao ba/34134/0171/0166 --turno 2
node --max-old-space-size=8192 scripts/auditoria/seguranca-fechamento-h20-midia.mjs --secao pr/74713/0078/0261 --turno 1
```
