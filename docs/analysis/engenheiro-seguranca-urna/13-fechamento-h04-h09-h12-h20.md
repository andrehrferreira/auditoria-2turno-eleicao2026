# 13. Fechamento de H04, H09, H12 e H20 só com dados públicos

Engenheiro de segurança, 02/11/2026. O dono decidiu não esperar o TSE: cada hipótese recebe aqui uma conclusão final, tirada só de arquivos públicos. Universo completo dos dois turnos: 499.248 seções por turno, 499.207 pacotes, 41 seções sem pacote. Leitura direta dos pacotes, sem amostra.

Nenhum número com formato de título ou de CPF foi gravado. Os números ficam só na memória dos processos. As saídas têm só contagens, endereços de seção e contextos com os dígitos trocados por `#`. Uma trava aborta a gravação se achar 10 a 12 dígitos seguidos em texto. Depois de tudo, conferi as 136 sequências de 10 a 12 dígitos que existem nas saídas (são contagens de bytes e de linhas): nenhuma tem DV de título nem de CPF.

Não houve teste estatístico com nível de significância. As comparações de H09 são descritivas: taxa contra taxa de base, ou achado contra isca do mesmo formato. Por isso não há `13-plano.md`.

## Resposta curta

| Hipótese | Conclusão final | O que sustenta | Efeito máximo no 2º turno de Presidente (margem do 13: 4.430.191) |
|---|---|---|---|
| **H04** arquivos alterados ou gerados fora de urna oficial | **Refutada** para o que os arquivos públicos alcançam. A parte "programa adulterado e assinado com a chave oficial" fica **não decidível com dados públicos**. | Assinaturas e hashes com 0 falha (docs anteriores). Agora um segundo programa, com código próprio, refez a contagem de boots e etapas e chegou aos mesmos números, seção a seção, nos dois turnos. | Na parte refutada: 0. Na parte não decidível, os arquivos não põem limite. Para decidir faltam o hash dos binários lacrados conferido contra o código-fonte compilado e o resultado do Teste de Integridade. |
| **H09** os arquivos permitem ligar voto a eleitor | **Fato que pede explicação.** | (a) Nenhuma forma codificada de título nos arquivos, além do acaso (sem sinal). (b) Pela estrutura do diário, o número recusado na suspensão é o título de quem estava na cabine naquela sessão. | 0. É questão de sigilo e não muda contagem. |
| **H12** o QR do e-Título entrega os dados para liberar sem digital e pode ser forjado | **Não decidível com dados públicos.** | O diário não tem código próprio para o e-Título: a urna só registra "Título" ou "CPF" digitado. Liberar pelo e-Título fica igual a liberar pelo título de papel. | O mecanismo que o e-Título facilitaria é a habilitação pelo ano de nascimento: 8.632.488 eleitores no 2º turno, número maior que a margem. Esse é um teto do mecanismo, não indício. Os testes de H05 e H13 não acharam sinal de uso em massa. |
| **H20** relógio ou ordem adulterados | **Sem sinal nos dados públicos.** | BA 34134/0171/0166 passa a Fato, provado só pelos diários: relógio atrasado 54 min ou mais, sem voto fora da janela legal, com no máximo 1 voto depois das 17h reais. SP 71072/0280/0913 e RS 88994/0131/0007 não são decidíveis. Os votos sem linha no diário ficam sem hora, mas têm janela limitada. | No máximo 54 votos no 2º turno (os sem linha), mais 1 da BA. Não muda o vencedor. |

## H04: inicializações e etapas refeitas por um segundo programa

**O pedido.** O parecer cético 24 (item 13) deixou pendente refazer a contagem de boots e de etapas de "Verificação de assinatura" com um segundo programa. No 1º turno, o primeiro programa nunca tinha rodado.

**O que foi feito.**

- `seguranca-fechamento-varredura.mjs` é código novo. Do primeiro programa (`seguranca-varrer-logs.mjs` + `seguranca-etapas-versao.mjs`) usei só a definição:
  - o que conta como boot;
  - o que é um boot que alcança o dia;
  - o que é boot de votação;
  - o que é etapa.
- A leitura é outra: por posição de tabulação em vez de `split`, com outro teste de data-hora, outro critério de fecho de boot, outra assinatura da sequência de etapas e outra paralelização (por zona, em worker threads).
- Rodei também o primeiro programa no 1º turno (`--turno 1`), para ter com que comparar.
- `seguranca-fechamento-h04-comparar.mjs` compara os dois:
  - nos totais;
  - **seção a seção**, pelo multiconjunto de (etapas, votação, votos, etapas sem SUCESSO) de cada boot.

**Resultado (Fato).**

| | 1º turno: 1º programa | 1º turno: 2º programa | 2º turno: 1º programa (publicado no doc 04) | 2º turno: 2º programa |
|---|---|---|---|---|
| Pacotes | 499.207 | 499.207 | 499.207 | 499.207 |
| Boots que alcançam o dia | 563.538 | 563.538 | 542.934 | 542.934 |
| Boots de votação | 524.651 | 524.651 | 519.365 | 519.365 |
| … com 33 / 34 / 35 etapas | 1.367 / 500.767 / 22.517 | 1.367 / 500.767 / 22.517 | 1.361 / 495.596 / 22.408 | 1.361 / 495.596 / 22.408 |
| Boot de votação sem etapa | 0 | 0 | 0 | 0 |
| Boot de votação com etapa sem SUCESSO | 0 | 0 | 0 | 0 |
| Boots do dia com etapa sem SUCESSO (sem votação) | 19 | 19 | 8 | 8 |
| **Seções com alguma diferença entre os dois** | **0** | | **0** | |
| Boots de votação fora da sequência mais comum da UF e do modelo | 46 (6.225 votos) | 46 (6.225 votos) | 26 (3.320 votos) | 26 (3.320 votos) |

- Nos 46 boots do 1º turno e nos 26 do 2º falta **a mesma e única etapa**: `/dsk/fe/estatico/<seção>-lo.vsc`, o arquivo da seção na mídia de votação. Conferi o diário das 72 seções. Todas têm "Contingência de MV executada com sucesso" no próprio dia: 46 de 46 e 26 de 26. É o mecanismo descrito no doc 04: a MV foi trocada e a urna copiou os diretórios da MI para a MV nova logo depois da verificação. Nenhum outro desvio de sequência aparece em boot de votação.
- O texto "26 boots sem a etapa" do parecer 24 está confirmado por dois programas. No 1º turno o número é 46.

**O que a H04 cobre e o que não cobre.**

- **Refutado (Fato, docs 02 e 07 de integridade-nacional, parecer 24, e este doc):**
  - arquivo publicado alterado depois da urna: assinaturas de 499.207 pacotes por turno com 0 falha, e hashes de 1.996.828 arquivos por turno com 0 falha;
  - pacote gerado fora de urna com carteira do TSE: todo pacote assinado por certificado de uma das três AC;
  - urna votando em boot com verificação falha ou incompleta: 0 nos dois turnos, contado por dois programas.
- **Não decidível com dados públicos:** um programa adulterado e assinado com a chave oficial grava "SUCESSO" em todas as etapas e assina tudo direito. O log é escrito pelo próprio software que ele descreve. Faltariam:
  - o hash dos binários lacrados na cerimônia, comparado ao do código-fonte compilado de forma reprodutível;
  - o resultado do Teste de Integridade das urnas sorteadas (H19);
  - a especificação do algoritmo CEPESC, que não é público.
- **Efeito no vencedor.** Na parte refutada, 0. Na parte não decidível, os arquivos públicos não dão limite.

## H09: sigilo do voto

### (a) Número de título em forma codificada, universo dos dois turnos

**Desenho.** O número da busca de 29/10 (um eleitor de ES, fora do repositório) não pode ser usado. Por isso as **sondas** são os números com formato de título que o próprio diário de cada pacote publica em claro: mesários, servidores, presidente no encerramento e números da suspensão. São 2.682.798 sondas no 1º turno e 2.917.111 no 2º (pares número × pacote). Cada uma vira cerca de 50 formas:

- decimal invertido;
- pares de dígitos trocados (BCD com nibbles trocados);
- hexadecimal do inteiro, com e sem zeros;
- base64 do texto, do inteiro de 5 bytes e do BCD;
- hexadecimal do ASCII;
- UTF-16 LE e BE;
- BCD;
- inteiro de 5 e de 8 bytes, BE e LE, e o mínimo;
- MD5, SHA-1, SHA-256 e SHA-512 do texto com e sem zeros, em bytes (8 primeiros e 8 últimos), hex de 16 (início e fim, maiúsculas e minúsculas) e base64.

As formas foram procuradas em **todos os bytes** de cada pacote:

- BU;
- BU impresso;
- RDV;
- `.vsc`;
- o `.jez` bruto;
- cada entrada descomprimida, inclusive o diário.

No diário, o achado é separado em "texto da linha" e "coluna de 16 hexadecimais do encadeamento".

**Bytes varridos:**

| | 1º turno | 2º turno |
|---|---|---|
| Diário | 286,3 GB | 489,1 GB |
| `.jez` bruto | 53,4 GB | 90,4 GB |
| `.vsc` | 31,2 GB | 31,2 GB |
| BU impresso | 10,1 GB | 3,0 GB |
| RDV | 7,6 GB | 1,4 GB |
| BU | 6,3 GB | 0,5 GB |

**Controles.**

- **Positivo, natural:** toda sonda tem de aparecer em claro no diário. Aparece em 2.682.798 de 2.682.798 e em 2.917.111 de 2.917.111.
- **Positivo, sintético:** em cada zona, todas as formas da 1ª sonda são coladas num buffer, e o buscador as acha. Foram 506.531 de 506.531 formas em cada turno.
- **Negativo (isca):** cada sonda tem uma isca com a mesma UF, o mesmo número de zeros à esquerda e o DV calculado. A isca passa pelo mesmo buscador. Ela mede o acaso de cada forma e de cada comprimento.
- **Ambíguos:**
  - forma decimal igual a um número publicado em claro no mesmo pacote. O caso típico é o título palíndromo, cujo "invertido" é ele mesmo;
  - forma decimal que é pedaço de uma sequência maior de dígitos.

  Os dois tipos são contados à parte e não entram como achado.

**Resultado (Fato).**

| Formas com 6 bytes ou mais (informativas) | 1º turno: achados / iscas | 2º turno: achados / iscas |
|---|---|---|
| BU, RDV, BU impresso, `.vsc`, entradas do `.jez` | **0 / 0** | **0 / 0** |
| Diário, texto da linha | **0** / 420 (isca decimal que coincide com um número de servidor do pacote) | **0** / 830 (idem) |
| Diário, coluna de encadeamento (hexadecimal do inteiro, 6 a 11 caracteres) | 2 / 1 | 7 / 2 |
| Ambíguos (palíndromo ou igual a número em claro) | 417 | 795 |

- Os achados da coluna de encadeamento estão no campo de 16 hexadecimais pseudoaleatórios de cada linha. O esperado pelo acaso nessa coluna, para agulhas de 6 a 7 caracteres, fica entre cerca de 1 e 14 por turno, conforme o comprimento. A isca do mesmo formato dá a mesma ordem de grandeza.
- As formas curtas (4 e 5 bytes: hexadecimal de números de servidor com muitos zeros, inteiro de 5 bytes de número pequeno) dão 1.478 achados no 1º turno e 3.811 no 2º, contra 1.709 e 3.696 iscas. Estão todas:
  - na coluna de encadeamento;
  - em hashes impressos no BU ("ASSINATURA BU DIGITAL");
  - em seriais;
  - em bytes comprimidos ou de assinatura.

  Batem com as iscas. Não informam nada.
- **Leitura.** Nenhum título publicado em claro no diário aparece codificado no BU, no RDV, no `.vsc` ou no BU impresso. Também não aparece em posição estruturada do diário. O que sobra é acaso, na mesma taxa das iscas.
- **Limite.**
  - Hash com sal ou com chave não é achado por esse método.
  - O título de quem não aparece em claro no diário (o eleitor comum) não pode ser sondado sem a lista de eleitores.
  - Os arquivos não publicados (`jufa.dat`, `wsq*.jez` etc., doc 05) ficam fora.

### (b) De quem é o número gravado na suspensão: só pela estrutura do diário

Mensagem `Título N é válido / inválido para suspender a votação`, no dia de cada turno. O papel de cada número foi dado pelo próprio pacote: mesário registrado (eleitor da seção ou não), presidente no encerramento, servidor, ou "sem papel". As linhas reproduzem os números do parecer 29:

- 1º turno: 43.686 linhas "inválido" sem papel na urna, 12.032 "válido" sem papel, 197 mesários eleitores da seção recusados e 3 mesários de outra seção recusados;
- 2º turno: 3.616 e 1.973.

**Taxa de base (todas as sessões de eleitor do dia).**

| | 1º turno | 2º turno |
|---|---|---|
| Sessões | 136.864.328 | 139.335.304 |
| Identificadas pelo título (o resto pelo CPF) | 77,97% | 74,46% |
| Pelo título, se a sessão anterior foi pelo título (hábito da mesa) | 90,91% | 85,96% |

**Testes estruturais (Fato).**

| Teste | "Inválido" sem papel, 1º / 2º turno | "Válido" sem papel, 1º / 2º | Mesário eleitor da seção aceito, 1º / 2º |
|---|---|---|---|
| Sessões com o número | 20.087 / 1.868 | 12.032 / 1.973 | 69.771 / 6.454 |
| Sessão **atual** identificada pelo título | **99,98% / 100%** (20.082 de 20.087; 1.868 de 1.868) | 44,6% / 63,3% | 78,8% / 76,4% |
| Sessão **anterior** pelo título | 87,5% / 84,3% | 58,8% / 73,5% | 75,1% / 72,2% |
| Sessão **seguinte** pelo título | 87,7% / 85,0% | 64,8% / 80,9% | 75,5% / 73,8% |
| Números que aparecem em **uma só** sessão da urna | **99,88%** (20.038 de 20.062) / 99,89% | 99,4% / 99,7% | 81,2% / 95,3% (o mesmo mesário volta em outras sessões) |
| Código de UF do número igual ao da seção | 90,9% / 91,4% | 91,0% / 91,3% | mesários registrados: 92,9% / 92,9% |
| Tentativa seguinte na mesma sessão é o **mesmo** número, de novo recusado | 22.656 / 1.682 | — | — |

**Mesário eleitor da seção (1º turno, 103 pares urna × mesário com recusa; no 2º turno, 6):**

- cada um foi recusado em **exatamente uma** sessão: 103 de 103 e 6 de 6;
- 17 desses mesários tiveram o mesmo título **aceito** em outras sessões da mesma urna no dia: 11 antes da recusa, 5 depois e 1 antes e depois. Em nenhum caso o título foi aceito na própria sessão em que foi recusado;
- mesários que não são eleitores da seção foram recusados 3 vezes no 1º turno e 0 no 2º, contra 141 e 53 aceites.

**Leitura.**

1. **A recusa depende da sessão, não da pessoa.**
   - O título de um mesário eleitor da seção é recusado numa única sessão e aceito em outras, antes e depois dela.
   - "Recusar sempre quem é eleitor da seção" está refutado: em 54.539 pares urna × mesário eleitor da seção (1º turno), o título só foi aceito.
   - "Recusar depois que ele votou" também está refutado: houve aceite depois da recusa.
   - Só sobra uma regra compatível com todos os casos: **a urna recusa o título de quem está na cabine**. Para o mesário, é a sessão em que ele mesmo vota.
2. **O número "inválido" sem papel está preso à sessão atual.**
   - 99,98% das sessões com esse número foram identificadas pelo título, contra cerca de 87% nas sessões vizinhas. Esses 87% são a taxa do hábito da mesa (90,9% e 86,0%).
   - Se fosse o título do eleitor seguinte, digitado por engano, a sessão seguinte estaria perto de 100% pelo título. Ela fica em 87,7% e 85,0%. Essa leitura está refutada no agregado.
3. **É um título real de alguém da região, um por sessão:**
   - o código de UF bate com o da seção na mesma proporção que nos mesários (91% contra 93%);
   - o número aparece numa só sessão em 99,9% dos casos;
   - o mesário o redigita igual (22.656 vezes), como quem copia de um documento.

**Conclusão de (b).** O arquivo não tem um campo que diga "este é o eleitor". Mas a estrutura do diário só é compatível com uma leitura:

- o número **recusado** com DV válido e sem papel é o título de quem estava na cabine naquela sessão, isto é, o eleitor que estava sendo suspenso;
- em 6.385 sessões do 1º turno e 77 do 2º, essa sessão termina em "Atribuido voto nulo por suspensão".

Para o número **aceito** sem papel, o dono continua desconhecido:

- não é o eleitor da cabine, porque a urna recusaria;
- não é membro fixo da mesa, porque não se repete entre sessões;
- é de alguém da região. A identificação dessas sessões tende ao CPF: 55,4% e 36,7%, contra 22% e 25,5% na base.

**Conclusão final da H09: fato que pede explicação.** O diário público publica, na mensagem de suspensão, o título de dezenas de milhares de eleitores ligados à hora e ao desfecho da sessão em que votaram:

- 1º turno: 20.062 números recusados distintos (contados por urna), de um eleitor cada;
- 2º turno: 1.866.

Nos arquivos não há rastro de título codificado em lugar nenhum. Para tirar a última dúvida, sem expor ninguém, faltaria a especificação da regra da suspensão ou o caderno de votação da seção. O caderno não é público.

**Efeito no vencedor: 0.** É questão de sigilo e não muda contagem.

## H12: QR do e-Título

**Documentação pública do TSE (consultada em 02/11/2026).**

- O TSE informa que o e-Título só vale como documento para votar quando mostra a foto do eleitor. A foto depende do cadastro biométrico. ([TSE, "Eleitor em Dia"](https://www.tse.jus.br/comunicacao/noticias/2026/Abril/eleitor-em-dia-saiba-quais-documentos-sao-validos-para-votar-nas-eleicoes-2026); [TSE, "e-Título com foto é documento oficial"](https://www.tse.jus.br/comunicacao/noticias/2026/Outubro/faltam-4-dias-e-titulo-com-foto-e-documento-oficial-e-pode-ser-utilizado-para-votar-1))
- A autenticidade de documentos da Justiça Eleitoral pode ser conferida pelo QR Code no próprio aplicativo ("Verifique um documento emitido pela Justiça Eleitoral") ou no portal ("Validar documentos"). ([TSE, perguntas frequentes do e-Título](https://www.tse.jus.br/servicos-eleitorais/e-titulo-perguntas-frequentes); [TSE, notícia de julho de 2026](https://www.tse.jus.br/comunicacao/noticias/2026/Julho/novo-e-titulo-baixe-o-app-conheca-suas-funcoes-e-exerca-a-cidadania-nas-eleicoes-2026-1))
- Os documentos que a página cita como conferíveis assim são certidões e o título impresso. Não achei descrição pública do conteúdo do QR do e-Título, nem de assinatura dele, nem de como o mesário deveria conferi-lo.
- O portal do TSE recusou o download direto das resoluções (Res. 23.751 e 23.759) e do Manual do Eleitor por bloqueio do servidor ("Access Denied"). Usei só o que as páginas de busca mostram. Esta parte deve ser conferida pelo texto integral.

**O que os diários mostram (Fato, catálogo nacional do 2º turno).**

- A identificação do eleitor só tem dois tipos: `Identificador digitado pelo mesário foi: (Título de eleitor)`, com 99.258.500 linhas no dia, e `(CPF)`, com 34.042.862.
- Não existe mensagem de leitura de QR, de e-Título ou de documento digital. As mensagens do catálogo que citam "QR" são todas telas de erro da própria urna ("tire uma foto dessa tela em que apareça o QR Code").
- A liberação sem digital é feita assim: `Solicitação de dado pessoal do eleitor para habilitação manual`, depois `Ano de nascimento digitado é igual ao do cadastro`. O dado pessoal é o ano de nascimento.
- **Consequência:** liberar com o e-Título deixa no diário o mesmo rastro que liberar com o título de papel ou com qualquer documento. O risco da H12 se confunde com o da habilitação manual por ano de nascimento (H05/B1a), e ali ele é testado. No BU do 2º turno, 8.632.488 eleitores foram habilitados "por biografia" (ano de nascimento) e 7.251.810 "sem biometria".

**Conclusão final da H12: não decidível com dados públicos.**

- Nenhum arquivo público guarda o QR, o tipo de documento apresentado ou a resposta do validador.
- A leitura do QR feita em 29/10 (um e-Título, JSON em claro, sem assinatura) foi fora do repositório e não foi refeita.

**O que faltaria: teste de laboratório com e-Títulos de voluntários**, feito na máquina local e com consentimento escrito:

1. ler o QR de vários e-Títulos: versões diferentes do aplicativo, com e sem biometria, e emissões em datas diferentes;
2. ver se o conteúdo é sempre texto em claro e se o `codigoValidacao` muda com os dados;
3. alterar um campo (nome, data de nascimento ou número) num QR gerado em laboratório e passar pelo validador do aplicativo e do portal: o validador aceita, recusa, ou consulta a internet pelo código;
4. registrar se o validador funciona sem rede.

Nenhum dado de voluntário entra no repositório. Só o resultado: aceita, recusa, ou online/offline.

**Efeito máximo no vencedor.** O mecanismo que o e-Título facilitaria é a habilitação pelo ano de nascimento. No 2º turno ela tem um teto de 8.632.488 habilitações, número maior que a margem de 4.430.191. Os arquivos públicos não deixam separar quantas usaram o e-Título.

- Esse teto não é indício.
- Os testes de H05 e H13 (concentração, gradiente da virada pela parcela sem digital, liberação em massa) não acharam sinal de uso em massa a favor de um lado.
- Esses testes também não provam ausência. A H12 sozinha não fecha esse teto.

## H20: relógio e ordem

### (a) Relógio errado de BA, SP e RS: confirmação pelos diários

**Método novo: causalidade física entre urnas** (`seguranca-fechamento-h20-midia.mjs`).

- Uma mídia física (cartão de carga, MV ou MR) só está numa urna de cada vez.
- O diário grava o identificador de cada mídia em cada boot: `Identificador da mídia de carga`, `Serial da MV`, `Número de série da MR`.
- Se a urna-alvo e outra urna usaram a mesma mídia, os usos não podem se sobrepor em hora real.
- Procurei o deslocamento δ (hora real = relógio do alvo + δ) que deixa todos os usos sem sobreposição. Tolerei 5 min de erro em cada urna.
- Restrição extra: quando a urna arquiva o diário da ME, a última linha da outra urna nesse diário tem de ser anterior ao arquivamento.
- Os acertos de hora dentro de um boot são levados ao referencial final do boot.

**O teste dá o deslocamento relativo entre as duas urnas.** Qual das duas está errada é decidido pela outra: zerésima e hora de ligar no dia de votação, contra a mediana da zona, e acertos de hora entre a votação e o uso da mídia.

**Controles.**

- **Negativo (a regra de unicidade vale):** nas zonas lidas, entre pares de outras urnas que usaram a mesma mídia, houve 0 sobreposições em:
  - 4.491, 3.321 e 2.248 pares de cartão de carga;
  - 52 e 56 pares de MV;
  - 59, 15 e 9 pares de MR.

  A única sobreposição de MV na zona da BA é o próprio par alvo × original.
- **Positivo:** PR 74713/0078/0261 (1º turno, relógio +58 min já provado). O teste dá δ entre −68 e −51 min para a urna original 01653959, cuja hora de ligar ficou +54 min sobre a zona. Para a reserva, cuja zona dá 0 no 2º turno, dá +50 min ou mais. O relativo dá cerca de 60 min, e a referência aponta a original. **Detectou.**
- **Poder:** o teste só decide quando há troca de MV ou MR perto no tempo (contingência). Em PR 74357/0050/0033, GO 92274/0119/0049 e RJ 60011/0214/0279, que já eram Fato por outro caminho, só há cartão de carga sem vizinhos próximos, e o teste não decide (δ = 0 continua possível).

**Resultado.**

| Seção | Turno | Mídias com outras urnas | δ = 0 possível? | Faixa possível | Referência | Conclusão |
|---|---|---|---|---|---|---|
| **BA 34134/0171/0166**, urna 01658717 | 2º | cartão, MV, MR; 129 restrições com 29 urnas | **Não** | **δ ≥ +54 min** | Urna original 01757577: no 1º turno, ligada −9 min e zerésima −10 min em relação à zona; nenhum acerto de hora | **Fato:** relógio atrasado pelo menos 54 min |
| SP 71072/0280/0913, urna 02368789 | 1º e 2º | só o cartão de carga, com 8 restrições | Sim | −240 a +240 min | — | **Não decidível pelos diários** |
| RS 88994/0131/0007, urna 02247920 | 1º | cartão, MV, MR; 50 restrições | Sim | −240 a −43 e −27 a +240 min | — | **Não decidível pelos diários** |

**BA 34134/0171/0166, o caso decidido.**

- Em 21/10, a urna 01658717, reserva carregada para "Urna de contingência", recebeu a MV `8372E95F` e a MR `817105D6` da seção, às 09:58–10:17 no relógio dela.
- A urna original 01757577 usou as mesmas mídias às 10:08–10:22 e 10:40–10:56 no relógio dela.
- A reserva **arquivou o diário da ME às 10:02:38**, e esse diário arquivado termina com uma linha da original às **10:56:03**.
- Logo, o relógio da reserva estava pelo menos 53,4 min atrás do da original.
- O relógio da original bate com a zona no 1º turno, e ela não teve nenhum acerto de hora até 21/10.
- Isso confirma a leitura do parecer 47: carga em 24/09 com −60 min (hora digitada 18:03 com a placa em 19:03), zerésima na trava às 07:02, ligada 52 min antes da mediana da zona, ajuste de hora recusado às 11:05.
- O último voto foi às 15:59:51 no relógio:
  - com δ entre +54 e +60 min, ficou antes das 17h reais;
  - com +61 min, cairia em 17:00:51.
- **Efeito na H06: 0 ou 1 voto.** O 2º turno teve prorrogação até as 19h (H06), então esse voto estaria dentro da janela de qualquer jeito.

**SP 0913 e RS 0007.** O perfil do dia continua o de relógio adiantado 1 h:

- SP: ligada +53 e +73 min e zerésima +48 e +68 min sobre a zona, nos dois turnos;
- RS: ligada +66 min, zerésima +62 min.

Nenhuma mídia dessas urnas passou por outra urna perto no tempo. Por isso o diário não separa "relógio 1 h adiantado" de "seção que abriu 1 h atrasada e fechou 1 h depois". Ficam **Hipótese** e saem da lista do que se pode fechar com dados públicos. Faltaria a ata da seção ou um carimbo de hora externo com menos de 60 min de folga (o recebimento no TSE do 1º turno dá 73 min na SP).

### (b) Votos sem linha no diário e manhãs sem zerésima

`seguranca-fechamento-h20-semlinha.mjs` (15 seções; abertura do BU tirada do banco e horários tirados do diário bruto).

| Turno | Seção | Votos sem linha | Classe (parecer 25) | Abertura do BU | A mídia passou a outra urna às | Janela possível dos votos sem linha |
|---|---|---|---|---|---|---|
| 2º | MA 08893/0047/0609 | 36 | C3 | 08:00:01 | 10:27 (urna intrusa 01813459) | 08:00–10:27 |
| 2º | BA 35653/0173/0235 | 13 | C3 | 08:48:54 | cerca de 09:50 (01833178); contingência às 10:03 | 08:48–09:52 |
| 2º | RS 89060/0017/0191 | 2 | C1 + C2 | 08:00:01 | ciclos com hora: 09:02 e 09:42 | dentro da manhã |
| 2º | BA 34711, PB 21750, PI 11533 | 1 cada | C1 | 08:00:01 | ciclo com hora no diário | dentro do dia |
| 1º | BA 39934/0183/0175 | 136 | C3 | 08:00:01 | 13:19 (02423907) | 08:00–13:19 |
| 1º | SP 71072/0002/0035 | 15 | C3 | 09:34:17 | 10:18 (02254720) | 09:34–10:18 |
| 1º | RS 89036/0083/0044 | 1 | C3 | 08:00:01 | entre 11:11 e 11:41 (urna 01675257) | 11:11–11:41 |
| 1º | ES 56995, RN 16039, SP 63614, SP 64254, SP 71072/0260 | 1 cada | C1 | 08:00:01 | ciclo com hora no diário | dentro do dia |
| 1º | RJ 58971/0087/0184 | 2 | C2 | 08:00:01 | 12 ciclos interrompidos entre 11:42 e 16:07 | 11:42–16:07 |

**O que dá para afirmar (Fato).**

1. Os 213 votos existem no BU e no RDV assinados. O número deles está lacrado. Não são votos invisíveis acrescentados depois: o pacote assinado é o da última urna.
2. Os 12 votos C1 e C2 têm habilitação e confirmação com hora no diário. Todos caem dentro do dia de votação.
3. Os 201 votos C3 não têm hora. Cada um estava gravado na MV antes de a mídia passar para outra urna, e depois da abertura gravada no BU. A janela fica dentro do horário legal **no relógio das urnas envolvidas**, entre 08:00 e 13:19 no pior caso.
4. Nas 3 manhãs sem zerésima no diário publicado (BA 39934/0183/0175 e SP 71072/0002/0035 no 1º turno, MA 08893/0047/0609 no 2º):
   - a ordem "zerésima → abertura" não pode ser conferida;
   - a abertura do BU (08:00:01, 09:34:17 e 08:00:01) foi gravada pela urna que abriu, que tem trava de abertura às 08:00 no próprio relógio;
   - nas 998.348 urnas dos dois turnos em que a zerésima é visível, nenhuma abriu sem ela (doc 11 e parecer 47). Isso é linha de base, não prova para essas 3.

**Não decidível com dados públicos:** a hora de cada um dos 201 votos C3 e a zerésima dessas 3 manhãs. Falta o diário interno (MI) das urnas que gravaram esses votos e que não está no pacote. As urnas são:

- 01663580 (MA, 2º turno);
- a da BA 35653 (Hipótese forte: 01681986);
- 02424441 (BA 39934, 1º turno);
- a urna não identificada da SP 0035;
- 01675257 (RS 89036).

Também faltam as atas dessas seções.

**Efeito no vencedor: no máximo 54 votos no 2º turno**, ou 49 sem nenhuma hora. Não muda o resultado.

**Conclusão final da H20: sem sinal nos dados públicos.**

- Ordem e relógio sem violação nos dois turnos, conferidos por duas leituras (doc 11 e parecer 47).
- Os relógios errados achados são de pessoa digitando a hora, sem voto fora da janela legal real. BA 0166 agora é Fato pelo próprio diário.
- O que não tem rastro está listado acima, com o dado que falta.
- O teto do efeito é de dezenas de votos.

## O efeito máximo pode mudar o vencedor do 2º turno?

| Hipótese | Efeito máximo que os arquivos públicos permitem | Muda o vencedor (margem de 4.430.191)? |
|---|---|---|
| H04 | 0 na parte refutada; sem limite na parte não decidível (programa assinado com a chave oficial) | Não pela parte testada. A parte não decidível depende de controles fora dos arquivos: cerimônia, código-fonte, Teste de Integridade. |
| H09 | 0 (sigilo) | Não |
| H12 | Teto do mecanismo de 8.632.488 habilitações por ano de nascimento; quantas usaram o e-Título não é separável | Em tese o teto passa da margem. Os testes de H05 e H13 não acharam sinal. A H12 não decide. |
| H20 | 54 votos sem hora mais 0 ou 1 voto (BA 0166) | Não |

## Conferências rodadas

- **H04:**
  - dois programas independentes, nos dois turnos, deram números idênticos nos totais e em 499.207 de 499.207 seções por turno;
  - as 46 + 26 sequências fora da mais comum foram conferidas no bruto: 72 de 72 com contingência de MV no dia.
- **H09a:**
  - controle positivo natural: 100% nos dois turnos;
  - controle positivo sintético: 506.531 de 506.531 formas em cada turno;
  - isca com a mesma forma e o mesmo comprimento: as taxas de acaso batem;
  - os ambíguos (palíndromo ou igual a número em claro) foram separados. Na 1ª versão do script eles apareciam como "achados"; o defeito foi corrigido, e as duas varreduras foram refeitas do zero.
- **H09b:** as contagens de linhas reproduzem o parecer 29: 43.686 / 12.032 / 197 / 3 no 1º turno e 3.616 / 1.973 / 10 no 2º.
- **H20a:**
  - controle de unicidade: 0 sobreposições entre outras urnas em mais de 10 mil pares de cartão de carga;
  - controle positivo PR 74713/0078/0261: detectado;
  - casos já provados sem contingência: o teste não decide (poder declarado).
- **H20b:** as 15 seções conferem com o parecer 25 (159 e 54).
- **Saídas:** nenhuma das 136 sequências de 10 a 12 dígitos tem DV de título ou de CPF (todas são contagens).

## Riscos que ficam

1. **H09b é inferência estrutural.** Uma regra da urna diferente de "recusa quem está na cabine", que produzisse o mesmo padrão, não está excluída pelo arquivo. Não achei nenhuma compatível com os 103 casos de mesário recusado numa só sessão e aceito em outras. Mas só a especificação da suspensão ou o caderno da seção fecham.
2. **H09a** não cobre hash com sal ou com chave, nem o título de quem nunca aparece em claro.
3. **H12** se apoia em páginas do TSE lidas pelos resultados de busca, porque o servidor bloqueou o download. O texto integral das resoluções deve ser conferido antes de ir para a perícia.
4. **H20a, SP 0913 e RS 0007:** sem decisão. O perfil continua o de relógio adiantado. Se fossem confirmados, mudariam a H06 em −27/−23 e −30 votos (doc 11).
5. **H04:** o limite de sempre. O log e a assinatura são do próprio software.
6. **Recursos:** a varredura leva cerca de 93 min no 2º turno e 49 min no 1º, com 5 workers. O primeiro programa no 1º turno levou cerca de 3 h com 3 processos.

## Comandos

```bash
# Varredura única (H04, H09a, H09b), universo dos dois turnos; saídas em data/parsed/auditoria/engenheiro-seguranca-urna/fechamento/<t>t/<uf>.json
node scripts/auditoria/seguranca-fechamento-varredura.mjs --turno 2 --workers 5
node scripts/auditoria/seguranca-fechamento-varredura.mjs --turno 1 --workers 5
# Primeiro programa no 1º turno (para a comparação da H04)
node scripts/auditoria/seguranca-varrer-logs.mjs --turno 1 --paralelo 3
node --max-old-space-size=8192 scripts/auditoria/seguranca-etapas-versao.mjs --turno 1
# H04: comparação seção a seção → fechamento/h04-comparacao-<t>t.json
node --max-old-space-size=12000 scripts/auditoria/seguranca-fechamento-h04-comparar.mjs --turno 1
node --max-old-space-size=12000 scripts/auditoria/seguranca-fechamento-h04-comparar.mjs --turno 2
# H09a e H09b: consolidação → fechamento/h09-resumo.json
node --max-old-space-size=8192 scripts/auditoria/seguranca-fechamento-h09-resumo.mjs
# H20a: causalidade física pelas mídias → fechamento/h20-midia-*.json
node --max-old-space-size=8192 scripts/auditoria/seguranca-fechamento-h20-midia.mjs --secao ba/34134/0171/0166 --turno 2
node --max-old-space-size=8192 scripts/auditoria/seguranca-fechamento-h20-midia.mjs --secao sp/71072/0280/0913
node --max-old-space-size=8192 scripts/auditoria/seguranca-fechamento-h20-midia.mjs --secao rs/88994/0131/0007 --turno 1
node --max-old-space-size=8192 scripts/auditoria/seguranca-fechamento-h20-midia.mjs --secao pr/74713/0078/0261 --turno 1   # controle positivo
# H20b → fechamento/h20-semlinha.json
node scripts/auditoria/seguranca-fechamento-h20-semlinha.mjs
# Conferência no bruto (dígitos de 8+ trocados por #)
node scripts/auditoria/seguranca-fechamento-dump.mjs --turno 2 --secao ba/34134/0171/0166 --urna 01757577 --de 21/10/2026 --ate 21/10/2026
```

## Errata (02/11/2026, coordenador, a partir do parecer cético 56)

1. **Classe "mesário eleitor da seção" (H09b).** `seguranca-fechamento-varredura.mjs` usava `msg.includes('é eleitor da seção')`, que também casa com "não é eleitor da seção". A linha foi corrigida. Os números certos são os da varredura independente do parecer 56 (`cetico-56-h09b.mjs`):
   - aceites de mesário eleitor da seção: 25.206 no 1º turno e 2.167 no 2º, e não 69.771 e 6.454;
   - pares: 19.245, e não 54.539;
   - mesário que não é eleitor da seção: 0 recusas contra 44.565 aceites no 1º turno e 0 contra 4.287 no 2º, e não "3 recusas contra 141 aceites".

   A conclusão fica mais forte: o mesário só é recusado quando é eleitor da seção (103 e 6 casos), numa única sessão, e sempre em sessão liberada pelo título.
2. **"O aceito não é o eleitor da cabine, porque a urna recusaria".** A frase sai. O parecer 56 mostra que a recusa depende de a sessão ter sido liberada pelo título (29,46%, contra 0,02% nas liberadas pelo CPF). Parte dos números aceitos em sessões liberadas pelo CPF é provavelmente o próprio eleitor. Isso fica como Hipótese.
3. **Desfechos das sessões com número recusado.** "Em quem votaram" está errado: parte das pessoas não votou. Os desfechos no 1º e no 2º turno são:
   - 6.664 e 786 votaram normalmente;
   - 6.385 e 77 tiveram voto nulo dado pela urna em algum cargo;
   - 6.920 e 985 foram liberadas e não votaram.

   Há 1 caso, no 1º turno, em que o voto para Presidente fica conhecido, porque a seção foi unânime (parecer 56).
4. **Teto da H12.** São 15.884.298 eleitores no 2º turno, e não 8.632.488: faltavam os 7.251.810 sem biometria cadastrada, que também votam sem digital.
5. **H20, BA 0166.** O teste dá o piso (+54 min); o teto de 60 min vem do parecer 47. A seção abriu de verdade por volta das 08:54. A faixa do PR 74713/0078/0261 admite várias faixas (de −240 a −51 min).
6. **H04, "segundo programa".** Ele copia a regra de boot do primeiro e usa o mesmo leitor de ZIP, então a concordância só prova que não houve erro de transcrição. A medida independente é a do parecer 56: 0 voto sem verificação completa do programa em 125.275.244 votos no 1º turno e em 128.235.724 no 2º.
