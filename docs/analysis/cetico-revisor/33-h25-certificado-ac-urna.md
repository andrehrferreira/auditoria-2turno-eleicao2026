# 33. Parecer: H25, urnas UE2013/UE2015 e a AC URNA vencida

Achados revisados:

- **Certificados:** [engenheiro-seguranca-urna/07-h25-certificados.md](../engenheiro-seguranca-urna/07-h25-certificados.md), scripts `seguranca-h25-*.mjs` (commit 5d27ff8), saídas em `data/parsed/auditoria/seguranca-h25/`.
- **Votos:** [estatistico-eleitoral/10-h25-urnas-ac-vencida.md](../estatistico-eleitoral/10-h25-urnas-ac-vencida.md), scripts `estatistico-h25*.mjs` (commit 5c03b78), saídas em `data/parsed/auditoria/h25/`.

Data: 30/10/2026. Base: cópia de leitura `eleicao2026-20261029T105000` (28 UFs nos dois turnos) e os `.vsc` brutos dos dois turnos. Rótulos: **Fato** (sai de script do repo sobre arquivo público, universo completo), **Hipótese**, **Recomendação**, **Pendente**. Nenhum pedido de rede foi feito neste parecer.

> **Termos.** *Certificado*: documento eletrônico que diz "esta chave pertence à urna X", carimbado por uma *autoridade certificadora* (AC). *Chave privada*: o segredo que só a AC tem e que faz o carimbo. *notBefore*: o campo "válido a partir de" do certificado. *AKI*: o campo do certificado da urna que diz qual chave e qual certificado de AC o carimbou. *Número de série*: o número que a AC dá a cada certificado que emite, como o número de uma nota fiscal.

## Resposta curta

- **O achado novo se sustenta: a chave da AC URNA carimbou 54 certificados de urna com data de início entre 20/07 e 19/10/2026, depois de o certificado publicado da AC vencer (18/07/2026, 21:59:57 UTC).** Refiz a conta por outro caminho (outro extrator, o OpenSSL do Node em vez do leitor do engenheiro) nos 998.414 diretórios dos dois turnos: 54 certificados, 53 seções no 2º turno, 45 no 1º, os mesmos. Conferi 5 deles no `.vsc` bruto com o OpenSSL de linha de comando: emissor AC URNA, AKI apontando para "AC RAIZ UE, série 03", assinatura conferida com a chave publicada.
- **(a) "Data de início = data de emissão" se sustenta como inferência forte, não como prova.** O que a apoia:
  - os números de série crescem com a data, sem nenhuma inversão;
  - dentro de cada sessão, a AC gasta de 2 a 3 segundos por número de série, igual antes e depois do vencimento;
  - em 13 dos 18 dias com emissão depois do vencimento, as ACs UE2020/UE2022 emitem na mesma sessão, minutos depois, como em 17/07;
  - nenhum certificado foi usado numa eleição antes da própria data de início;
  - nas 98 seções × turno, a carga da urna, registrada pela própria urna no BU, vem depois da data de início do certificado: 98 de 98, com folga mínima de 42 horas.
  - O que falta: uma marca de tempo independente do relógio do emissor. Só o registro da AC (TSE) prova a hora da assinatura.
- **"Numeração contínua" está errado como palavra.** A série é **crescente**, não contínua: entre o primeiro (`34aea5`) e o último (`34b256`) depois do vencimento cabem 946 números, e só 54 deles estão em urnas que votaram. **Hipótese:** a AC URNA emitiu bem mais que 54 certificados depois de vencer. Os 54 são os que aparecem nas urnas usadas. Antes do vencimento, em 2026, a proporção é parecida (38 de 371 números).
- **(c) Votos das seções com certificado emitido depois do vencimento: nada.**
  - 53 seções no 2º turno: a parcela do 13 variou do 1º para o 2º turno **+0,13 ponto** a mais que nas outras seções do mesmo local (p = 0,65). Em votos, +13 votos no total. O teste enxergaria um desvio médio de 0,82 ponto, uns 2 votos por seção.
  - Nível no 2º turno contra o local: +0,57 ponto (p = 0,31), o mesmo que já existia no 1º turno (+0,44). É o perfil do lugar das urnas antigas, que o estatístico já mediu.
  - 45 seções no 1º turno: +0,06 ponto na variação (p = 0,84).
  - Seções extremas (|z| ≥ 3): 3 de 53, contra 1,0 esperada (p ≈ 0,08). Uma vai a favor do 13 e duas contra. Em duas, o desvio já existia no 1º turno; a terceira se move contra o 13.
  - As duas urnas certificadas entre os turnos: **SP 71072/0004/0114** teve +4,7 pontos no 13 em relação às vizinhas do local (z = 2,4, uns 12 votos), depois de um 1º turno 7,4 pontos abaixo delas, com outra urna. Não passa o limite de extremo. **SP 62634/0214/0003**: −1,6 ponto (z = −0,8).
  - Controle (38 urnas recertificadas em 2026 antes do vencimento): −0,05 ponto (p = 0,89). Os dois lados da data votam igual.
- **(d) "Nenhum verificador padrão aceita as 99.957" precisa de ressalva.** Vale para o modelo usual (RFC 5280, OpenSSL, navegador), com a data da eleição. No "modelo de cadeia", que confere a AC na data em que ela emitiu o certificado da urna, 99.904 diretórios do 2º turno passam e só os 53 tardios falham. A frase sobre os 54 ("nenhum modelo usual aceita") está certa.
- **A frase "as 99.957 seções aparecem como totalizadas" precisa de outra base.** O campo de status do pacote no banco diz "Totalizado" em só 32.144 delas. A prova certa é outra, e eu a fiz: em 99.955 seções com voto, o BU de presidente é igual, candidato a candidato, ao resultado oficial por seção publicado pelo TSE (0 divergência). As 2 restantes são do exterior, com 0 eleitor.
- **(f) Desenho de votos:** os números se reproduzem exatamente (rodei de novo o script principal: `resultado.json` idêntico, só muda a data). A seção "Desvios do pré-registro" rotula bem as camadas acrescentadas depois. Mas o "Resposta curta" e a lista final do doc 10 apresentam como Fato, sem dizer que são exploratórios, os dois números que dão o tamanho do "nada": o −0,03 ponto da "variação ampla" e o "máximo de 1,5 ponto". O teste pré-registrado cobre só 516 das 99.957 seções A (0,5%). Além disso, o pré-registro está no mesmo commit que os resultados, então não há como conferir que veio antes.
- **(e) Rede:** o engenheiro fez 4 pedidos GET (LCR e política da AC URNA, da AC RAIZ UE e da AC URNA v2), às 03:05 de 30/10, todos com HTTP 403. Nada foi baixado nem usado. Fica como limitação: a lista de revogados e a política da AC URNA não foram vistas.

## Vereditos

### Metade 1: certificados (engenheiro, doc 07)

| # | Afirmação | Veredito |
|---|---|---|
| C1 | 54 certificados AC URNA com início de validade entre 20/07 e 19/10/2026, de 23 UE2013 e 31 UE2015 | **Sustentado.** Reproduzido por outro extrator nos 998.414 diretórios dos dois turnos: 0 erro de leitura, 0 diretório sem certificado, emissores 99.957 / 200.504 / 198.746 (2º turno) e 99.985 / 200.463 / 198.759 (1º), 503.525 certificados distintos. Mesma lista de 54 séries que a do engenheiro |
| C2 | Os 54 foram assinados pela chave do certificado publicado da AC URNA e apontam (AKI) para "AC RAIZ UE, série 03" | **Sustentado.** `verify` com a chave do `acurna.der`: 54 de 54 (e 99.957 + 99.985 de 99.957 + 99.985 diretórios AC URNA, 0 falha). `checkIssued` do OpenSSL, que compara o AKI com o número de série do certificado da AC: 54 de 54. Controle negativo: o mesmo `checkIssued` recusa o certificado de laboratório quando a AC tem outra série. 5 conferidos no bruto com o OpenSSL de linha de comando (item b) |
| C3 | "Emitidos depois de vencer" (data de início = data de emissão) | **Sustentado com ressalvas.** Inferência forte (item a). Não é prova: depende do relógio do sistema emissor do TSE. A frase certa é "com data de início depois do vencimento, e tudo indica que foram emitidos nessas datas" |
| C4 | "Numeração contínua" | **Refutado como palavra; a ideia se sustenta.** A série é **crescente** (0 inversões em 92), com saltos. Entre o primeiro e o último tardio cabem 946 números. "Contínua" sugere que não falta nenhum, o que é falso e esconde um ponto importante: o total emitido depois do vencimento pode ser bem maior que 54 (Hipótese) |
| C5 | 53 seções no 2º turno, 45 no 1º; 44 nos dois, 9 só no 2º, 1 só no 1º; 2 emitidos entre os turnos (18/10 e 19/10) | **Sustentado.** Reproduzido. As 98 seções × turno batem, uma a uma, com as achadas pelo número da urna no BU |
| C6 | 0 chave pública repetida, 0 série repetida na mesma AC, 0 urna com dois certificados; 503.525 certificados distintos | **Sustentado.** Recontado com código próprio sobre a extração do engenheiro; o número de certificados distintos também sai da minha extração |
| C7 | 0 certificado de urna vencido ou ainda não válido na data dos turnos; 100% dos AC URNA vencem depois da AC (o mais cedo em 08/04/2027) | **Sustentado.** Reproduzido nos dois turnos |
| C8 | Bytes zero a mais = preenchimento de campo de 946 bytes; proporção 56,27 / 37,42 / 6,26 / 0,051% contra 56,25 / 37,35 / 6,35 / 0,049% previstos | **Sustentado.** Refiz a conta da previsão: confere. A diferença é ruído (qui-quadrado ≈ 1,5 com 3 graus de liberdade, p ≈ 0,7). Ressalva: o 1º e o 2º turno têm 98% dos mesmos certificados, então não são duas confirmações independentes |
| C9 | Demonstração A: sem a chave privada, a validade vencida não permite forjar | **Sustentado.** É propriedade da assinatura digital e o script a mostra. Não é achado sobre a eleição: serve para explicar |
| C10 | Laboratório C3/C3b: AC renovada com série nova é recusada pelo OpenSSL; sem série no AKI passa | **Sustentado para o OpenSSL; generalização grande demais.** Reproduzi o comportamento com o `checkIssued` do Node. Mas a validação de caminho da RFC 5280 (seção 6) não usa o AKI, e outras bibliotecas não conferem a série. A frase "a renovação só salvaria essas urnas num verificador que ignore a série do AKI" está certa, mas esse verificador não é raro. O uso forte do dado é outro: os 54 emitidos de julho a outubro **ainda** apontam para a série 03. Logo, o sistema emissor continuava configurado com o certificado vencido (Hipótese forte) |
| C11 | "Nenhum verificador padrão aceita, em 25/10/2026, os 99.957 diretórios" | **Sustentado com ressalvas.** Certo no modelo usual (casca, RFC 5280). No modelo de cadeia, 99.904 passam e só os 53 tardios falham. Item d |
| C12 | "Nenhum modelo usual aceita os 54" | **Sustentado.** No modelo casca, a AC está vencida na verificação. No modelo de cadeia, a AC já estava vencida quando emitiu. Só passa sem conferir data ou com outro certificado de AC confiável |
| C13 | "As 99.957 seções do 2º turno com urna AC URNA aparecem como totalizadas" | **Sustentado com outra base.** O status "Totalizado" do banco cobre só 32.144. A base certa: 99.955 seções com BU de presidente igual ao oficial por seção, 0 divergência; 2 do exterior com 0 eleitor |
| C14 | Totalização confere a validade? "Não testável" | **Sustentado.** Item d diz o que dá e o que não dá para afirmar |
| C15 | Hipótese "recertificação de rotina pelo mesmo sistema" | **Sustentada como Hipótese e reforçada.** Mesmas sessões das outras ACs, mesmo ritmo, mesmo teto de vencimento. Não está provada: só o registro da AC prova |

### Metade 2: votos (estatístico, doc 10)

| # | Afirmação | Veredito |
|---|---|---|
| V1 | Nenhum dos 12 testes pré-registrados passa (Bonferroni \|z\| ≥ 2,87) | **Sustentado.** Rodei de novo `estatistico-h25.mjs`: `resultado.json` idêntico ao do autor, só muda a data. Maior z: +2,55 (nível da parcela do 13 no local) |
| V2 | O nível difere por perfil do lugar e é igual no 1º turno | **Sustentado com ressalvas.** Os números conferem. Mas o argumento "uma manipulação teria o mesmo sinal em todas as camadas, e não tem" é fraco. Cada camada compara um pedaço diferente das seções A (516, 26.708, 36.205, 98.526). Um desvio constante pequeno, somado a vieses de perfil diferentes em cada pedaço, também mudaria de sinal. O certo é dizer: "o nível não mudou entre os turnos; um desvio igual nos dois turnos, abaixo de 1 a 2 pontos, não se separa do perfil do lugar" |
| V3 | Variação 1º → 2º: −0,03 ponto (IC −0,09 a +0,02) | **Sustentado, mas é exploratório.** É a "variação ampla", acrescentada depois de ver o teste principal. O teste pré-registrado de variação dá −0,11 (IC −0,40 a +0,18) e cobre só 483 seções A. Precisa do rótulo no resumo e na lista de Fatos (item f) |
| V4 | Só 516 seções A dividem local com urna nova | **Sustentado.** Reproduzido (`universo.secoesAEmLocalMisto` = 516; 123 locais, 47 municípios) |
| V5 | Escala: 2.215.096 votos (8,8 pontos) para virar | **Sustentado.** Aritmética conferida. A comparação "8,8 contra no máximo 1,5" usa camadas exploratórias: precisa do rótulo |
| V6 | A1 (bytes a mais) vota igual ao resto de A | **Sustentado.** Reproduzido. Bom experimento natural: a sobra depende do sorteio da assinatura |
| V7 | Pré-registro "gravado antes de rodar qualquer teste de votos" | **Não verificável.** O pré-registro e os resultados entraram no mesmo commit (5c03b78). Não acuso nada; só não há rastro técnico da ordem. Recomendação: em hipóteses futuras, commitar o pré-registro antes |
| V8 | Pendente "confirmar o emissor do 1º turno no universo completo" | **Resolvido.** O engenheiro leu os 499.207 diretórios do 1º turno com 0 erro (AC URNA 99.985). O doc 10 pode trocar o Pendente por essa referência |
| V9 | Comparecimento +0,33 ponto nas A entre turnos (achado lateral) | **Não revisado a fundo** (fora do pedido). Reproduz. É exploratório e o doc o trata assim |

## (a) A data de início é a data de emissão?

A pergunta: o notBefore pode ser uma data escolhida (para trás ou para a frente), e não a hora em que a AC assinou?

- **Para trás não muda nada.** Se a emissão real fosse depois do notBefore, ela seria ainda mais tarde, ainda depois do vencimento.
- **Para a frente é a única saída**: certificados assinados até 18/07 com data de início marcada para depois. Os dados não combinam com isso:

| Teste (Fato, universo completo) | Resultado |
|---|---|
| Série × data, AC URNA, 92 certificados de 2026 | 0 inversões. A série cresce com a data. Idem AC UE2020 (112) e AC UE2022 (319) |
| Ritmo dentro de cada sessão (pares do mesmo dia) | 2 a 3 segundos por número de série, antes e depois do vencimento. Ex.: 17/07, `34ae28` a `34ae3a`, 18 números em 44 s; 20/07, `34aea5` a `34af42`, 157 números em 6 min 21 s |
| Sessões conjuntas com as outras ACs | Em 13 dos 18 dias com emissão tardia, AC UE2020/UE2022 emitem de 21 segundos a 7 minutos depois do lote da AC URNA. É o mesmo padrão de 17/07 (AC URNA 13:39, UE2020 13:43, UE2022 13:48) |
| Uso antes da data de início | 0 nos dois turnos. Os 2 certificados de 18/10 e 19/10 só aparecem no 2º turno |
| Carga da urna (relógio da própria urna, gravado no BU) depois da data de início | 98 de 98 seções × turno. A menor folga é de 42 horas (MA 09210/0076/0636: certificado em 01/10 18:57 UTC, carga em 03/10 10:00 de Brasília) |

- **Leitura:** um certificado pós-datado teria de ganhar número de série na ordem da data de início, e não da assinatura, num ritmo de 2 a 3 segundos que bate com o relógio das outras duas ACs na mesma sessão. Isso só acontece se o relógio do sistema emissor inteiro estivesse adiantado. Mesmo assim, a carga das urnas, feita por outro relógio, veio depois em todos os casos.
- **Veredito:** "emitido depois do vencimento" é inferência forte. Para o relatório: "com data de início depois do vencimento; a ordem dos números de série e as sessões de emissão indicam que foram emitidos nessas datas".

**Hipótese que o engenheiro não escreveu:** entre `34aea5` (20/07) e `34b256` (19/10) cabem 946 números de série. Com 1 número a cada 2 ou 3 segundos nas sessões, cada número parece ser um certificado. Só 54 estão em urnas que votaram. A AC URNA pode ter emitido centenas de certificados depois de vencer. A pergunta 3 do engenheiro ao TSE ("relação de todos os certificados emitidos pela AC URNA em 2026") já cobre isso. Vale citar a faixa de 946 números na pergunta.

## (b) Cinco dos 54 conferidos no bruto

`node scripts/auditoria/cetico-33-h25-bruto.mjs` → `data/parsed/auditoria/cetico-revisor/33-bruto/resultado.json` (e o PEM de cada certificado). O certificado sai do `.vsc` da seção por método próprio. O OpenSSL 3.5.7 de linha de comando confere.

| Seção (turno) | Por que este | Série | Início (UTC) | Carga da urna (BU, horário de Brasília) | AKI | Assinatura da AC | OpenSSL sem data / na data do turno / em 17/07 |
|---|---|---|---|---|---|---|---|
| SP 71072/0254/0024 (2º) | primeiro tardio | `34aea5` | 20/07 18:25:51 | 25/09 12:58 | `CD:AA:F4:B2…`, AC RAIZ UE, série 03 | confere | OK / AC vencida / certificado ainda não válido |
| SP 71072/0004/0114 (2º) | emitido entre os turnos | `34b24a` | 18/10 17:55:29 | 24/10 14:20 | idem | confere | idem |
| SP 62634/0214/0003 (2º) | emitido entre os turnos, urna reserva | `34b256` | 19/10 18:04:26 | 21/10 13:23 | idem | confere | idem |
| PE 24198/0056/0102 (1º) | o único só no 1º turno | `34b029` | 31/08 15:59:41 | 23/09 10:15 | idem | confere | idem |
| SP 63711/0119/0173 (1º) | meio da faixa, urna reserva | `34b0ec` | 12/09 17:59:14 | 29/09 14:59 | idem | confere | idem |

- Emissor dos 5: `CN=AC URNA, …, emailAddress=acurna@tse.jus.br`. Vencimento dos 5: 31/12/2037 23:00 UTC.
- O teste "em 17/07" mostra que o certificado não seria aceito nem na véspera do vencimento da AC: ele ainda não existia.
- Os votos de SP 71072/0004/0114 também foram conferidos no BU bruto (`src/exportar.js`): 1º turno 13 = 68, 22 = 138, comparecimento 250; 2º turno 13 = 103, 22 = 152, comparecimento 268. Batem com `pares-banco.csv`. A conferência de lacres da seção tem 22 itens e 0 falha.

## (c) Votos das seções com certificado emitido depois do vencimento

`node --max-old-space-size=6144 scripts/auditoria/cetico-33-h25-votos.mjs` → `data/parsed/auditoria/cetico-revisor/33-h25-votos.json` e `.csv` (uma linha por seção).

**Desenho.** Cada seção é comparada com ela mesma no outro turno e com as outras seções do mesmo local de votação (e da mesma zona). Resíduo de variação = (parcela do 13 no 2º turno − no 1º) da seção, menos o mesmo nas vizinhas. A referência é o mesmo resíduo em **todas** as 451.885 seções do país com ao menos 2 vizinhas no local. A média do grupo é comparada com 20.000 grupos sorteados do mesmo tamanho. Explicações benignas consideradas: perfil do lugar (por isso o local), urna trocada entre turnos (separada), seção pequena (resíduo em pontos, com referência empírica).

| Grupo | Seções | Variação × local (p.p.) | p | Faixa do acaso (95%) | Enxerga a partir de | Nível 2º t × local | Nível 1º t × local | Comparecimento × local |
|---|---|---|---|---|---|---|---|---|
| Tardio, 2º turno | 53 (50 com vizinhas) | **+0,13** | 0,65 | −0,58 a +0,57 | 0,82 | +0,57 (p 0,31) | +0,44 (p 0,46) | +0,07 (p 0,81) |
| Tardio, 1º turno | 45 (44) | +0,06 | 0,84 | −0,62 a +0,61 | 0,87 | +0,82 (p 0,17) | +0,76 (p 0,23) | +0,02 |
| Mesma urna nos dois turnos | 44 (43) | +0,04 | 0,89 | −0,63 a +0,61 | 0,89 | +0,82 | +0,77 | +0,01 |
| Urna tardia só no 2º turno | 9 (7) | +0,67 | 0,39 | −1,54 a +1,53 | 2,2 | −0,96 | −1,63 | +0,44 |
| Controle: recertificada em 2026 antes do vencimento | 37 (32) | −0,05 | 0,89 | −0,72 a +0,71 | 1,03 | +0,16 | +0,21 | −0,51 (p 0,14) |

Na zona, os mesmos grupos dão −0,23 (p 0,42), −0,22 (p 0,49) e −0,24 (p 0,44) na variação. Sortear só entre seções AC URNA dá os mesmos valores de p.

- **Fato:** nenhum grupo se afasta das vizinhas. Em votos, o resíduo de variação das 53 seções do 2º turno soma **+13 votos** para o 13, num total de 13.458 votos no 13 e no 22.
- **Fato (poder):** o teste das 53 enxergaria, com 80% de chance, um desvio médio de 0,82 ponto: cerca de 110 votos no grupo, 2 por seção.
- **Fato:** o nível alto contra o local (+0,57 no 2º turno) já existia no 1º turno (+0,44). É o mesmo perfil que o estatístico achou nas urnas A em geral (+0,65 no local).
- **Fato (extremos, |z| ≥ 3 na variação no local, no nível do 2º turno no local ou na variação na zona):** 3 de 53, contra 1,0 esperada pela taxa nacional (1,9%). Binomial: p ≈ 0,08, sem correção. Os 3:
  - GO 96016/0094/0109: o 13 caiu 2,8 pontos (45,1 → 42,4), enquanto as vizinhas do local subiram 3,2. Resíduo −5,9 pontos (z −3,0 no local, −3,1 na zona). Vai **contra** o vencedor.
  - MT 90670/0001/1108: nível 11,2 pontos acima do local no 2º turno (z 3,0). Já estava 9,0 acima no 1º turno; a variação é normal (+2,3, z 1,1). É perfil da seção.
  - PR 74128/0150/0144 (urna reserva, outra urna no 1º turno): nível 11,5 pontos **abaixo** do local no 2º turno (z −3,1), contra o 13. Já estava 14,0 abaixo no 1º turno; a variação é normal (+2,6, z 1,3).
- **As duas urnas certificadas entre os turnos (Fato):**
  - **SP 71072/0004/0114** (certificado de 18/10, urna de seção; no 1º turno votou outra urna, a `01807314`): parcela do 13 de 33,0% para 40,4%. As 16 vizinhas do local subiram 2,6 pontos; esta, 7,4. Resíduo +4,7 pontos, z = 2,4, uns 12 votos. Comparecimento de 68,5% para 73,4% (resíduo +2,6). No 1º turno esta seção estava 7,4 pontos **abaixo** das vizinhas; no 2º ficou 2,6 abaixo. **Hipótese:** volta à média depois de um 1º turno fora do padrão, com outra urna. Não é extremo pelo critério de 3 desvios, e o tamanho (12 votos) não muda nada. Fica listado, não como anomalia.
  - **SP 62634/0214/0003** (certificado de 19/10, urna reserva): 32,1% para 32,8%; resíduo −1,6 ponto (z −0,8).
- **A única seção com urna tardia só no 1º turno** (PE 24198/0056/0102): resíduo +0,8 ponto (z 0,4).
- **Conclusão (Fato):** as seções cujas urnas foram certificadas depois do vencimento votam como as vizinhas, nos dois turnos, e como as urnas recertificadas antes do vencimento. **Limite (Hipótese não rejeitada):** com 53 seções, o teste não vê desvio abaixo de uns 2 votos por seção. Também não vê nada que aja igual nas urnas vizinhas.

## (d) "Nenhum verificador padrão aceita as 99.957" e a totalização

**Verificador padrão.** Há duas formas usuais de conferir datas numa cadeia de certificados:

- **Modelo casca** (RFC 5280, OpenSSL, navegadores): todos os certificados da cadeia têm de estar válidos na data da conferência. Com a data da eleição (25/10) e o certificado publicado, **nenhum** dos 99.957 passa: a AC venceu em 18/07. Confirmado no bruto (item b) e no doc 07 (B1).
- **Modelo de cadeia**: confere cada certificado na data em que o de baixo foi emitido. Aí os 99.904 diretórios do 2º turno com certificado emitido até 17/07 **passam**, e só os 53 tardios falham.
- Sem conferir data, os 99.957 passam (assinatura íntegra).

**Afirmação revisada:** "Com o certificado publicado da AC URNA, o verificador usual (modelo casca, RFC 5280) recusa as 99.957 seções do 2º turno, porque a AC venceu antes da eleição. Num verificador que confere a AC na data da emissão, só os 53 certificados emitidos depois do vencimento são recusados. Só um verificador que não confere data, ou que confia em outro certificado da AC URNA, aceita todos."

**Totalização: o que dá para afirmar (Fato).**

1. A chave privada da AC URNA, a mesma do certificado publicado, carimbou os certificados das 99.957 urnas, inclusive os 54 tardios. Quem tinha essa chave emitiu esses 54.
2. A urna de cada uma das 99.957 seções assinou o pacote com a chave do próprio certificado, e a assinatura confere (doc 02 da integridade).
3. Os votos dessas seções estão no resultado oficial: em 99.955, o BU de presidente é igual ao resultado oficial por seção, candidato a candidato, com 0 divergência. As 2 restantes são do exterior, com 0 eleitor.
4. Com o certificado publicado, um verificador que confere datas recusaria esses pacotes.

**O que não dá para afirmar.**

1. Que a totalização "aceitou certificado vencido". Não se sabe se ela confere certificados, nem com qual certificado de AC, nem em que ponto do caminho.
2. Que existe um certificado renovado da AC URNA. Os 54 de julho a outubro ainda apontam para a série 03, o que indica que nem o sistema emissor usava outro.
3. Quem, dentro do TSE, operou a chave, e se a emissão foi autorizada.
4. Que um software alterado dentro de uma urna legítima seria visto. Ele assina com a chave verdadeira (doc 07, item 5b).

**Ponto à parte (Fato, não é erro do engenheiro):** o próprio verificador do repositório (`src/lacres.js`, linhas 228 a 234) confere a validade do certificado da urna e registra a AC vencida só como "observação, não falha". O comentário ali diz "provável renovação com a mesma chave, não publicada". O doc 07 agora mostra que o dado não apoia essa explicação. **Recomendação:** ajustar esse comentário e o doc 06 da integridade quando o coordenador decidir (não editei).

## (e) Pedidos de rede

- **Fato:** o doc 07 registra 4 pedidos GET, em 30/10/2026 às 03:05: `lcr.acurna.tse.jus.br/acurna.crl`, `lcr.acraizue.tse.jus.br/acraizue.crl`, `lcr.acurnav2.tse.jus.br/acurnav2.crl` e `dpc.acurna.tse.jus.br/DPC-PC-ACURNA.PDF`. Todos deram HTTP 403. Nada foi baixado nem entra em número algum.
- **Limitação:** sem a lista de revogados (LCR) e a política (DPC) da AC URNA, não se sabe se o TSE revogou algum desses certificados, nem o que a política diz sobre emissão perto do vencimento.
- **Processo:** a regra 2 do doc 10 manda não usar rede sem pedido explícito do coordenador. O doc 07 não diz se houve esse pedido. Fica registrado para o coordenador.
- Este parecer não fez pedido de rede.

## (f) O desenho de votos: o que veio antes e o que veio depois

| Peça | Quando | Rótulo no doc 10 | Problema |
|---|---|---|---|
| 12 testes, efeito fixo de local | pré-registro | confirmatório | Nenhum. Mas cobrem só 516 seções A (0,5%) no nível e 483 na variação |
| Camadas de zona, município e UF | depois de ver o principal | "exploratório" na seção de desvios | No "Resposta curta", o "−0,22 / +0,65 / +0,04" aparece sem rótulo |
| Variação ampla (−0,03; −21.514 a +5.591 votos) | depois | "exploratório" na seção de desvios | Aparece como **Fato** no resumo e na lista final, sem rótulo. É o número que cobre 97% das seções A |
| "No máximo 1,5 ponto" (escala × teste) | depois | não rotulado | Vem da camada de UF, exploratória |
| Permutação no local | depois | declarada | Nenhum |
| Decomposição do comparecimento | depois | declarada | Nenhum |

- **Fato:** a decisão do pré-registro ("não sustenta H25") vale para as 516 seções que dividem local com urna nova. Para as outras 99.441, a conclusão vem das camadas exploratórias. Elas são razoáveis e apontam no mesmo sentido, mas não são o teste combinado antes.
- **Recomendação ao estatístico:** no "Resposta curta" e na lista final, escrever "(exploratório, camada acrescentada depois)" ao lado do −0,03 e do 1,5 ponto. E dizer em uma linha que o teste pré-registrado cobre 0,5% das seções A.
- O parecer (c) acima é outro olhar, só sobre as 98 seções × turno com certificado tardio. Ele também é exploratório: o pedido veio depois do achado do engenheiro.

## Outros pontos

1. **"Numeração contínua"** (C4): trocar por "crescente".
2. **Pendente do doc 10** sobre o emissor do 1º turno: já resolvido pelo doc 07 (V8).
3. **Conferência Ed521 do 2º turno** (AC UE2020/UE2022): não foi refeita aqui nem pelo engenheiro. Vem de `integridade-lacres.mjs`. O Pendente do doc 07 continua.
4. **Hora do vencimento:** a AC URNA vence em 18/07/2026 às 21:59:57 UTC (18:59:57 em Brasília). O primeiro certificado tardio é de 20/07 18:25:51 UTC, quase dois dias depois. Não há caso na fronteira.

## Afirmações revisadas (prontas para a perícia e para o relatório temático)

**Para a perícia (só Fato, universo completo):**

1. "A autoridade certificadora das urnas antigas (AC URNA) tem certificado publicado válido até 18/07/2026. Mesmo assim, 54 certificados de urnas UE2013 e UE2015 têm data de início entre 20/07 e 19/10/2026 e foram assinados pela chave dessa AC. Todos apontam para o certificado vencido. As urnas com esses certificados votaram em 53 seções no 2º turno e em 45 no 1º; duas delas foram certificadas entre os turnos, em 18 e 19/10. (Todos os 998.414 diretórios dos dois turnos; script `seguranca-h25-certificados.mjs`, conferido por `cetico-33-h25-certificados.mjs`.)"
2. "Os números de série desses certificados seguem a mesma sequência crescente dos emitidos antes do vencimento, no mesmo ritmo, e nos mesmos dias as outras duas autoridades das urnas novas também emitiram. Isso indica o mesmo sistema emissor e que as datas são as datas reais de emissão. Só o registro da AC, que está com o TSE, prova isso."
3. "Os votos das 53 seções do 2º turno com esses certificados mudaram entre os turnos como os das seções vizinhas do mesmo local: +0,13 ponto na parcela do 13, +13 votos ao todo, dentro do acaso."
4. "Com o certificado publicado, o verificador usual recusa as 99.957 seções do 2º turno com urna antiga. Os votos dessas seções estão no resultado oficial. Os arquivos públicos não mostram se a totalização confere esses certificados, nem com qual certificado da AC."

**Para o relatório temático (pode levar Hipótese e Pendente, rotulados):**

- Hipótese: a AC URNA emitiu mais certificados depois de vencer do que os 54 visíveis (faixa de 946 números de série).
- Hipótese: o sistema emissor do TSE continuou configurado com o certificado vencido (série 03) até 19/10.
- Hipótese: a totalização não confere a validade da AC, ou usa outro certificado da AC URNA não publicado.
- Pendente: resposta do TSE às perguntas do doc 07 (incluir a faixa `34aea5` a `34b256`); LCR e DPC da AC URNA.
- Não escrever: "certificado falso", "emissor desconhecido" ou "a totalização aceitou certificado vencido". Nenhum dos três está nos dados.

## Fato, Hipótese, Recomendação, Pendente

- **Fato:**
  - 54 certificados AC URNA com data de início depois do vencimento da AC, assinados pela chave publicada, AKI para a série 03 (reproduzido por outro método e 5 no bruto);
  - série crescente, ritmo de 2 a 3 s por número, sessões conjuntas com as outras ACs, carga da urna depois da data de início;
  - votos dessas seções iguais aos das vizinhas (+0,13 ponto, p = 0,65; controle −0,05);
  - BU = oficial por seção em 99.955 seções AC URNA do 2º turno;
  - 12 testes pré-registrados reproduzidos, nenhum passa.
- **Hipótese:**
  - emissão tardia em escala maior que 54;
  - sistema emissor configurado com o certificado vencido;
  - SP 71072/0004/0114: volta à média depois de um 1º turno atípico.
- **Recomendação:**
  - engenheiro: trocar "contínua" por "crescente"; ressalvar o modelo de cadeia em C11; trocar a base de "totalizadas"; não generalizar o teste do OpenSSL para "verificador padrão"; citar a faixa de 946 números na pergunta ao TSE;
  - estatístico: rotular −0,03 e 1,5 ponto como exploratórios no resumo; dizer a cobertura do teste pré-registrado; trocar o Pendente do 1º turno; commitar pré-registros antes dos resultados;
  - coordenador: decidir sobre o comentário de `src/lacres.js` e o doc 06 da integridade; registrar se os 4 pedidos de rede foram autorizados.
- **Pendente:** LCR, DPC e certificados das raízes; resposta do TSE; conferência Ed521 independente do 2º turno.

## Reproduzir

```
node scripts/auditoria/cetico-33-h25-certificados.mjs            # recontagem própria, 2 turnos (30 a 40 min, 1 processo)
node scripts/auditoria/cetico-33-h25-repeticoes.mjs              # repetições e validades sobre a extração do engenheiro (10 s)
node scripts/auditoria/cetico-33-h25-bruto.mjs                   # 5 casos no .vsc bruto com o OpenSSL de linha de comando
node --max-old-space-size=6144 scripts/auditoria/cetico-33-h25-votos.mjs   # (c) votos; --lista-engenheiro usa casos.json (saída idêntica)
node --max-old-space-size=8192 scripts/auditoria/estatistico-h25.mjs       # reprodução do doc 10 (resultado.json idêntico)
node scripts/sql.mjs --arquivo <consulta>                         # BU × oficial por seção, AC URNA, 2º turno (texto da consulta abaixo)
```

Consulta usada para a base de "totalizadas":

```sql
with s as (select uf,municipio,zona,secao from secao where turno=2 and modelo_urna in ('ue2013','ue2015')),
o as (select uf,municipio,zona,secao,sum(quantidade) q from voto_oficial where turno=2 and cargo=1 group by 1,2,3,4),
b as (select uf,municipio,zona,secao,sum(quantidade) q from voto_bu where turno=2 and cargo=1 group by 1,2,3,4)
select count(*), sum(o.q is not null), sum(o.q=b.q) from s left join o using(uf,municipio,zona,secao) left join b using(uf,municipio,zona,secao);
-- e, candidato a candidato: v_divergencia_bu_oficial filtrada por turno=2, cargo=1 e modelo UE2013/UE2015 → 0 linhas
```

Saídas em `data/parsed/auditoria/cetico-revisor/`: `33-h25-certificados.json`, `33-h25-repeticoes.json`, `33-bruto/`, `33-h25-votos.json`, `33-h25-votos.csv`.
