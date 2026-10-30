# T21 — Totalização e certificado da urna (rodada 1)

Hipótese até script do repositório reproduzir. Números só os do enunciado. Norma/URL/fato externo: [a confirmar].

## 1. A lógica

Passo 0 (premissa) não está provado: “sistema de contabilização não valida a cadeia de validade” é **inferência** a partir do fato 3+6 (AC URNA vencida e mesmo assim totalizada), não leitura do programa. Programa de totalização não está publicado (fato 9).

- “Não valida cadeia de validade” → “não existe validação de fato”: **salto**. Não checar `notBefore`/`notAfter` ≠ não checar assinatura, emissor, ligação chave↔certificado, unicidade. Validação de certificado tem várias camadas; calendário é uma delas.
- “Não existe validação de fato” → “qualquer certificado contabiliza”: **salto**. Ainda pode haver allowlist das três ACs, conferência da assinatura do BU e da lista no `.vsc`, rejeição de emissor desconhecido. “Qualquer” não decorre de “sem datas”.
- “Qualquer certificado contabiliza” → “flashcard adulterado com certificação qualquer passaria”: **salto**. “Certificação qualquer” (CA de fora, autoassinado, chave aleatória) é classe distinta de “certificado de urna emitido por AC do TSE, ainda que com CA vencida”.

Onde é forte: se a totalização não aplica validade temporal da cadeia na data da eleição, o fato 5 segue — as 99.957 das 2013/2015 passam, e os tardios do fato 4 também passam no modo “sem datas”. Isso é exatamente o que o universo publicado mostra.

Onde quebra: a cadeia do auditor trata “falha de política de validade” como “ausência de autenticação”. Não é a mesma coisa. Premissa sobre o software permanece hipótese.

## 2. Explicações alternativas (AC URNA vencida e mesmo assim totalizada)

Nenhuma prova qual é a verdadeira. Compatíveis com os fatos 1–6:

1. **Só cripto + emissor.** Confere assinatura do BU e do `.vsc` com a chave do certificado da urna, e o certificado com uma das três ACs publicadas. Não aplica calendário. Fatos 1, 2 e 5 (terceira regra) batem.
2. **Modelo de cadeia (validade na emissão).** Folha conferida na data em que a AC a assinou; AC conferida na data em que a raiz a assinou. Passam 99.904; os 53 tardios do 2º turno **não** deveriam passar (fato 5). Como esses 53 foram totalizados, esta explicação **sozinha** não cobre o fato 4. Precisa de exceção extra ou de (1).
3. **Folha ainda no prazo, AC ignorada.** Verificador olha `notAfter` da urna, não o da AC. Comum em implementações frouxas. Não explica emissão **depois** do `notAfter` da AC (fato 4), a menos que também não confira validade da AC na emissão.
4. **Trust store com outro certificado da AC URNA.** Mesma chave pública da série 03, novo `notAfter`, não publicado (fato 9). Assinaturas das folhas continuam conferindo com a chave publicada. Datas da folha “tardias” continuam anômalas se o certificado **publicado** é o único que verifica o emissor — a menos que o não publicado seja só para a janela de validade no verificador interno.
5. **Data de referência do verificador** ≠ data da eleição (relógio fixo anterior a 18/07/2026, data da carga, data de emissão do certificado da urna).
6. **Exceção operacional** para modelos 2013/2015 (dezena de milhares de seções; fato 3). Norma interna ou parâmetro de sistema, não publicado.
7. **Emissão continuada pela própria AC do TSE** após 18/07/2026 (fato 4: série crescente com a data, 2 emitidos entre turnos). Não é “certificado qualquer”: é a chave da AC URNA ainda em uso. Totalização que confia nessa AC aceita o produto.

Prática eleitoral: mídia de resultado entra no cartório; receptor lê BU/RDV/log/`.vsc` e transmite à totalização; TSE divulga o pacote recebido. O que o receptor e o Totaliza conferem na cadeia PKI **não está na documentação pública** usada aqui [a confirmar: manuais JE/Totaliza e resoluções de 2026]. Controle paralelo clássico é o BU **impresso** na seção (partidos, fiscais, cartório). Esse controle não aparece nos fatos 1–8 e não substitui validação de certificado.

ICP-Brasil / RFC 5280: CA fora de validade não deve emitir; na verificação estrita, cadeia inteira precisa ser válida no instante de validação [a confirmar aplicação obrigatória à PKI própria das urnas, que não é necessariamente a mesma árvore ICP-Brasil].

## 3. O que os fatos 1, 2 e 6 dizem — e o que não dizem — sobre “qualquer certificado contabilizaria”

Dizem, neste universo publicado (499.207 pacotes/turno):

- Todo BU totalizado que foi publicado tem assinatura conferindo com a chave da urna daquele pacote.
- O certificado dessa urna confere com **uma das três ACs do TSE**. Zero emissor desconhecido. Zero chave pública repetida. Zero número de série repetido. 503.525 certificados distintos, todos emitidos por essas ACs.
- Soma dos BUs publicados = resultado oficial, seção a seção (0 diferença no 2º turno em 499.205 seções; 0 divergência no 1º, todos os cargos). Logo o que entrou na totalização oficial é o mesmo conjunto publicado, e esse conjunto **não** contém certificado de fora.

Sobre “qualquer certificado contabilizaria” **nesta eleição**: os fatos **contradizem** a versão literal. Se certificado autoassinado, de CA comercial, ou chave aleatória tivesse sido totalizado, o fato 2 seria falso ou o fato 6 quebraria (total oficial ≠ BUs publicados com AC do TSE). Não se observou isso.

Não dizem:

- Que o software rejeitaria um certificado de fora se alguém apresentasse. Só se vê o que foi publicado/totalizado, não a fila de rejeitados.
- Que a totalização valida certificado (em vez de, no limite, só a assinatura avulsa do BU com uma chave que por acaso está num arquivo `.vsc` emitido por AC do TSE). O fato 1 mostra que, nos pacotes publicados, assinatura e certificado **são** coerentes; não mostra o ramo `if` do programa.
- Que não houve pacote inválido descartado antes da publicação.
- Que “certificação qualquer” **assinada pela AC URNA** (chave da CA) seria rejeitada. Isso os fatos 1–2 **não** barram; o fato 4 mostra o contrário para datas.

Condição para o ataque do auditor (“certificação qualquer”) passar **e** deixar o rastro que existe hoje: a “qualquer” teria de ser, na prática, certificado cuja assinatura de AC confere com uma das três chaves públicas já publicadas. Isso não é “qualquer”. É compromisso da CA ou uso da chave da CA.

## 4. Risco real

Totalização que não confere datas **não** abre a porta a flashcard com certificado aleatório, se mesmo assim conferir emissor+assinatura (hipótese alinhada aos fatos 1 e 2). Abre a porta a:

| Ataque | Passaria sem checar datas? | Rastro nos arquivos públicos |
|---|---|---|
| Flashcard com CA de fora / autoassinado | Só se também **não** conferir emissor | Emissor desconhecido no `.vsc`. **Não observado** (fato 2) |
| Pacote íntegro de outra urna (replay/troca de mídia) | Datas irrelevantes; depende de amarrar seção/zona/município/carga à chave | BU interno ≠ seção do arquivo; chave/série já usada noutra seção. Fato 2: 0 chave repetida, 0 série repetida — troca que **duplique** chave apareceria. Substituição 1:1 da mídia daquela seção, com a chave **daquela** urna, não aparece como chave repetida |
| Chave privada da urna extraída, BU falso, mesmo certificado | Datas irrelevantes | Mesmo certificado/série; votos/log/RDV incoerentes; divergência com BU papel da seção |
| Chave privada da **AC URNA** (ou uso oficial dela) para emitir cert de urna novo e assinar BU falso | Sim, e também passaria **com** checagem de datas se o `notAfter` da AC no trust store fosse estendido | Novo série, nova chave, emissor = AC URNA. Indistinguível de urna legítima no fato 1–2. Fato 4 é exatamente este formato |

Papel do fato 4: 54 certificados com `notBefore` entre 20/07 e 19/10/2026, emissor = série 03 vencida em 18/07/2026, série crescente com a data, 2 emitidos entre os turnos, 53 seções no 2º turno e 45 no 1º. Inferência forte (não prova): **a chave privada da AC URNA série 03 continuou assinando depois do vencimento**, relógio do emissor. Padrão de série×data parece linha de produção, não um único injerto.

- Se o uso é do TSE: falha de política de certificação / ciclo de vida da CA, não prova de adulteração de voto. As folhas novas são “válidas” só para quem confia nessa chave sem calendário.
- Se o uso **não** é do TSE: compromisso da CA que cobre as urnas 2013/2015 (99.957 pacotes no 2º turno; votos 13.140.473 no 13 e 12.026.599 no 22; margem nacional 4.430.191). Nesse cenário o fato 7 (votação parecida com urnas novas do mesmo lugar) **não** exclui fraude localizada; exclui só adulteração uniforme em massa.

Ataque que o auditor descreve (“certificação qualquer”) deixaria emissor de fora. Esse rastro **não está** nos 499.207×2 pacotes. Ataque que importa, se a totalização não confere datas (e talvez mesmo se conferir, dado o fato 4): **controle da chave da AC**, mais substituição da mídia **antes** do cartório. Controle residual público: BU papel, RDV vs BU, log, comparação geográfica (fato 7), unicidade de chave/série (fato 2).

Carga da urna (cadastro seção↔chave) é o amarre operacional que a PKI sozinha não substitui. Se a totalização não confere esse amarre, troca de mídia de urna **legítima** de outra seção é outro eixo — independente de validade de certificado [a confirmar se Totaliza confere cadastro da carga].

## 5. Testes possíveis (arquivos públicos) e perguntas ao TSE

**Testes** (ainda não listados como fatos 1–8):

- Extrair de cada `.vsc`: cadeia completa ou só folha; AKI/SKI; `notBefore`/`notAfter` da folha vs da AC; se a folha 2013/2015 ainda estava no prazo na data do turno.
- Cruzar os 54 tardios: município, zona, seção, modelo de urna, se a mesma urna/seção trocou de certificado entre turnos, votos vs vizinhança (além do fato 7).
- Conferir se a chave que verifica a assinatura do BU é **byte a byte** a chave do certificado no `.vsc` (fato 1 já diz que confere; repetir por script, pacote a pacote).
- Coerência BU ↔ RDV ↔ log nos 53/45 seções tardias e numa amostra das 99.957.
- Campos internos do BU (data/hora de encerramento, identificador de seção, urna) vs nome do pacote publicado vs certificado.
- Buscar CRL/OCSP ou certificado intermediário extra dentro dos pacotes (fato 9 diz que pedidos de CRL/política no site deram HTTP 403; o pacote da urna pode ainda trazer algo).
- Replicar as três regras do fato 5 com verificador padrão (OpenSSL/`certvalid`) e com data de referência = 18/07/2026, = 04/10/2026, = 25/10/2026, = `notBefore` da folha.

**Perguntas exatas ao TSE** (decidem a questão):

1. O receptor da mídia e o programa de totalização verificam `notBefore`/`notAfter` de **cada** certificado da cadeia? Qual data de referência: eleição, assinatura do BU, carga, totalização, emissão da folha?
2. Qual certificado da AC URNA (série, `notBefore`, `notAfter`, fingerprint da chave) estava no repositório de confiança em 04/10/2026 e em 25/10/2026?
3. A chave privada da AC URNA série 03 assinou certificados de urna após 18/07/2026? Sob qual ato? Há AC URNA substituta? Por que o certificado publicado continua sendo o vencido?
4. Publicar raízes, política de certificação e CRL/OCSP das três ACs (os pedidos públicos deram HTTP 403).
5. Pacote cujo `.vsc` traga emissor fora das três ACs: rejeita? Onde está o log de rejeição, auditável por seção?
6. A totalização confere que série/chave da urna é a da **carga** daquela seção? Se não, troca de mídia entre seções com certificados ambos “válidos” passa?
7. Entregar a especificação (ou o código) do trecho que valida BU + `.vsc` + certificado, ou reproduzir em ambiente de auditoria com os 54 tardios e com um pacote de controle com CA de fora.

## 6. Conclusão

A percepção acerta o ponto estreito — há evidência de que a **validade temporal da cadeia** não foi exigida na totalização, e o fato 4 mostra a chave da AC URNA ainda assinando depois de 18/07/2026 — mas o encadeamento até “qualquer certificado contabiliza / flashcard com certificação qualquer passa” **não decorre**: salta de falha de calendário para falha de autenticação. Neste universo, fatos 1, 2 e 6 mostram o oposto da tese literal: só entrou BU com certificado emitido pelas ACs do TSE, assinaturas conferem, total oficial = BUs publicados; o risco material é a chave da AC (uso pós-vencimento ou compromisso), não um certificado aleatório. Sem o programa de totalização, as raízes, a CRL e o certificado da AC URNA efetivamente no trust store, não dá para fechar se a validação de emissor é feita no software ou só “aconteceu” neste resultado publicado.

Confiança: **alta** nos saltos lógicos e no que 1/2/6 refutam; **alta** em que o fato 4 é falha de ciclo de vida da CA, seja qual for o Totaliza; **média-baixa** no que o Totaliza realmente executa (fato 9); **média** em que o padrão série×data dos 54 é emissão institucional e não injerto externo.