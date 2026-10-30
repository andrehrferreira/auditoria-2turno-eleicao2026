# Pedido de acesso à informação ao Tribunal Superior Eleitoral

**Ao Tribunal Superior Eleitoral — Ouvidoria / Serviço de Informação ao Cidadão (SIC)**

**Assunto:** Pedido de informações e documentos sobre a certificação digital das urnas, a totalização, as correspondências entre urna e seção, as cargas de urna, o diário da urna, a liberação do eleitor pela digital, o voto no exterior, o cadastro eleitoral e o sigilo do voto nas eleições gerais de 2026 (pleitos 3220 e 3221; 1º turno em 04/10/2026 e 2º turno em 25/10/2026).

**Base legal:** Lei nº 12.527/2011 (Lei de Acesso à Informação), arts. 10 e 11. Prazo de resposta: 20 dias, prorrogável por mais 10 mediante justificativa (art. 11, §§ 1º e 2º).

**Solicitante:** [nome do solicitante], CPF [CPF].

**Forma de resposta:** arquivos digitais, enviados pelo sistema de atendimento do SIC ou por endereço eletrônico indicado no protocolo (art. 11, § 5º). Documentos em PDF; listas e tabelas em CSV ou planilha, com uma linha por registro; arquivos técnicos (certificados, listas de revogação, registros de sistema) no formato original.

**Observações sobre o atendimento:**

1. Os itens são independentes. A negativa ou o atraso de um item não deve impedir a resposta aos demais.
2. Se parte de um documento for sigilosa, pede-se o acesso à parte não sigilosa, com a ocultação da parte protegida (art. 7º, § 2º).
3. Se a informação estiver com um Tribunal Regional Eleitoral (por exemplo, atas de cerimônia de carga ou atas de mesa), pede-se que o pedido seja encaminhado ao Tribunal que a detém, com aviso ao solicitante (art. 11, § 1º, inciso III).
4. Se a informação já estiver publicada, basta indicar o endereço exato em que pode ser obtida (art. 11, § 6º).

**Como as seções são identificadas.** Cada caso é indicado pela sigla da UF e pelos códigos de município, zona e seção, como nos arquivos do TSE. Exemplo: BA 33774/0071/0150 = Bahia, município 33774, zona 71, seção 150. Para o exterior, a UF é "ZZ". Nenhum dado pessoal de eleitor é citado neste pedido.

## Exposição

Este pedido faz parte de uma auditoria independente feita sobre os arquivos que o TSE publicou para as eleições de 2026: boletins de urna (BU), registros digitais do voto, diários das urnas (o registro automático de tudo o que a urna faz, com data e hora), assinaturas digitais, arquivos de correspondência entre urna e seção, resultado por seção e perfil do eleitorado.

Até agora, as conferências feitas em todas as seções mostraram coerência entre esses arquivos. Dois exemplos:

- no 2º turno, as assinaturas digitais dos 499.207 pacotes de urna foram conferidas, sem nenhuma falha;
- no 2º turno, o boletim de cada seção é igual ao resultado oficial por seção para Presidente.

Alguns pontos, porém, não podem ser respondidos só com os arquivos públicos: o que o sistema de totalização confere, como são guardadas as chaves das autoridades certificadoras, por que algumas urnas foram trocadas ou carregadas de novo, o que significam certos códigos do diário da urna, como a urna autoriza a liberação do eleitor cuja digital não foi reconhecida e que critérios o cadastro usa. Os pedidos abaixo tratam só desses pontos.

O objetivo é **esclarecer**, e não especular. Nenhum item pressupõe irregularidade. Cada fato citado como contexto foi lido nos arquivos publicados pelo TSE.

## Pedidos

### A. Certificação digital e chaves das autoridades certificadoras

Contexto. As urnas têm três autoridades certificadoras (os "cartórios digitais" que emitem os certificados das urnas): a AC URNA (urnas modelo 2013 e 2015), a AC UE2020 (modelo 2020) e a AC UE2022 (modelo 2022). O certificado da AC URNA publicado no pacote "formato-arquivos-bu-rdv-ass-digital-v2" (número de série 03, emitido pela AC RAIZ UE) tem validade de 22/07/2011 a 18/07/2026. As urnas dessa autoridade assinaram 99.985 pacotes no 1º turno e 99.957 no 2º, e nenhuma dessas assinaturas falhou na conferência com a chave pública desse certificado. Nos pacotes publicados, 54 certificados de urna têm início de validade entre 20/07/2026 e 19/10/2026, com números de série de 34aea5 a 34b256, assinados pela chave da AC URNA e apontando para o certificado de número de série 03.

**1. Certificado da AC URNA cadastrado como confiável.** O arquivo do certificado da AC URNA (formato DER) cadastrado como confiável no sistema que recebe e totaliza os boletins em 04/10/2026 e em 25/10/2026, com número de série, período de validade e resumo SHA-256. Se o certificado de número de série 03 foi renovado, o certificado renovado, a data de emissão e a ata da cerimônia de emissão.
*Período:* 18/07/2026 a 25/10/2026. *Formato:* certificado em DER; ata em PDF.

**2. Certificados de urna emitidos pela AC URNA em 2026.** A relação de todos os certificados emitidos pela AC URNA em 2026, com número de série, número da urna, data de emissão e motivo, e a indicação dos que foram revogados. A relação deve incluir todos os números de série da faixa de 34aea5 a 34b256, que comporta 946 números.
*Período:* 01/01/2026 a 25/10/2026. *Formato:* CSV ou planilha.

**3. Listas de revogação, política e certificados das raízes.** A lista de certificados revogados (LCR) vigente em 04/10/2026 e em 25/10/2026 de cada autoridade de produção (AC RAIZ UE, AC RAIZ UE v2, AC URNA, AC URNA v2, AC UE2020 e AC UE2022); a Declaração de Práticas de Certificação da AC URNA; e os certificados da AC RAIZ UE, da AC RAIZ UE v2 e da AC URNA v2.
*Formato:* arquivos originais (LCR e certificados); declaração em PDF.

**4. Guarda e uso da chave privada da AC URNA.** Em relação à chave privada da AC URNA (certificado de número de série 03, identificador de chave cd:aa:f4:b2:97:01:b3:f0:de:b2:b5:42:58:59:4a:6d:34:ad:a4:8a):
- (a) o equipamento em que está guardada (por exemplo, módulo de segurança em hardware, HSM), com fabricante, modelo e certificação (FIPS 140 ou homologação ICP-Brasil), e se a chave pode ser exportada ou copiada para fora dele;
- (b) os cargos com acesso à chave, o número de pessoas e o controle exigido para ativá-la (por exemplo, "m de n" cartões);
- (c) a ata da cerimônia de geração da chave e as atas de toda cerimônia ou ativação dela no período;
- (d) o registro de auditoria do equipamento ou do sistema de emissão com cada uso da chave no período: data, hora, operador, número de série emitido e urna.
*Período:* (a) e (b) na situação vigente em 25/10/2026; (c) e (d) de 18/07/2026 a 25/10/2026. *Formato:* PDF para atas e descrições; CSV para o registro de uso.

**5. Guarda e uso das chaves da AC UE2020 e da AC UE2022, e números de série gastos perto da eleição.** As mesmas informações do item 4 para as chaves da AC UE2020 e da AC UE2022. E a relação de todos os números de série emitidos por essas duas autoridades no período, inclusive os que não aparecem em nenhum pacote de urna publicado, com urna, data e finalidade de cada um. Em especial:
- AC UE2020, números de série de 151090 a 151107 (120 números; só 4 aparecem em pacotes publicados);
- AC URNA, números de série de 34B234 a 34B256 (35 números; só 2 aparecem em pacotes publicados).
*Período:* 01/10/2026 a 25/10/2026. *Formato:* PDF e CSV, como no item 4.

**6. Autoridade certificadora de teste.** Se existe autoridade certificadora de teste, desenvolvimento ou homologação separada das autoridades de produção (AC RAIZ UE, AC RAIZ UE v2, AC URNA, AC URNA v2, AC UE2020 e AC UE2022), com chave própria; em caso positivo, os certificados dela. E se alguma autoridade de produção emitiu, em qualquer data, certificado para urna ou equipamento de teste, desenvolvimento, homologação, treinamento, Teste Público de Segurança ou qualquer outra finalidade que não seja urna de produção; em caso positivo, a relação desses certificados (número de série, nome, data, finalidade e situação de revogação).
*Período:* desde a criação de cada autoridade até 25/10/2026. *Formato:* certificados no formato original; relação em CSV.

**7. Quantos certificados cada urna recebe por emissão.** Quantos certificados uma urna recebe a cada emissão e com que finalidade cada um é usado. Nos pacotes publicados, os números de série da AC UE2020 e da AC UE2022 avançam de 6 em 6.
*Formato:* resposta descritiva ou documento técnico em PDF.

**8. Urnas certificadas e recarregadas entre os turnos.** A relação das urnas que receberam certificado novo ou foram carregadas de novo entre 05/10/2026 e 24/10/2026, com número da urna, data, motivo e o documento que registrou cada caso. Em especial, o motivo e o registro da certificação das seis urnas certificadas entre os turnos, que substituíram no 2º turno a urna usada pela seção no 1º turno: MG 40339/0009/0177, MG 47031/0148/0078, MG 45551/0120/0100, MG 53716/0269/0215 (AC UE2020) e SP 71072/0004/0114, SP 62634/0214/0003 (AC URNA).
*Período:* 05/10/2026 a 24/10/2026. *Formato:* CSV para a relação; PDF para os registros.

### B. Totalização

**9. O que o sistema confere em cada boletim.** Se o sistema de totalização, ou o receptor que o precede, verifica a assinatura digital de cada boletim e a cadeia de certificação do certificado da urna até a AC RAIZ UE ou a AC RAIZ UE v2. Em caso positivo: o nome e a versão do programa e da biblioteca que fazem essa verificação, e o documento técnico ou a configuração que a define, indicando se ela confere a data de validade do certificado da urna e de cada autoridade da cadeia, e em que data de referência (a da verificação, a da emissão do boletim, a da emissão do certificado ou nenhuma).
*Período:* configuração em uso no 1º e no 2º turno de 2026. *Formato:* documento técnico em PDF; arquivos de configuração no formato original.

**10. Lista de urnas esperadas por seção.** Se o sistema que recebe e totaliza os boletins confere cada boletim contra uma lista prévia das urnas esperadas em cada seção (urna × seção × código de carga, inclusive as urnas de reserva), e qual programa faz essa conferência. Se a conferência usa a urna declarada no boletim ou a urna que assinou o pacote (as duas são diferentes nos boletins gerados pelo Recuperador de Dados em outra urna). O que acontece com um boletim assinado por certificado válido de urna que não consta dessa lista (aceito, rejeitado ou encaminhado para análise). A lista usada em cada turno, com número da urna, número de série do certificado, seção, código e data da carga. E o registro dos boletins rejeitados ou retidos nos dois turnos, por falha de assinatura, de certificado ou de correspondência com essa lista.
*Período:* 1º e 2º turno de 2026. *Formato:* documento em PDF; listas e registros em CSV.

**11. Boletim que chega sem correspondência registrada.** O que acontece com um pacote de urna que chega ao TSE antes de haver correspondência registrada entre aquela urna e a seção: se fica retido, é rejeitado ou faz o próprio registro ser criado; e quem autoriza a liberação. Nos arquivos de correspondência publicados, há seções em que a correspondência foi recebida no próprio dia da votação, junto com o pacote (item 14).
*Formato:* documento técnico ou norma em PDF.

**12. Norma para o boletim que não passa nas conferências.** A norma e o procedimento que se aplicam a um boletim que não passa nas conferências dos itens 9 a 11 (recusa, retenção, recuperação ou conferência por outra via), preservando o tratamento legal dos votos.
*Período:* norma vigente em 2026. *Formato:* PDF.

**13. Recepção dos boletins no fim da votação do 2º turno.** Nos dados publicados do 2º turno, nenhum boletim com voto foi registrado pelo TSE entre 17:10 e 19:03:37 (hora de Brasília); depois disso, os boletins foram registrados em lotes até 21:09. Pede-se: os registros de recepção dos boletins no período (hora de chegada de cada boletim ao receptor e hora de registro), o lugar em que os boletins aguardaram entre a chegada e o registro, o critério que definiu a ordem de registro e o limite de vazão do sistema, se houve.
*Período:* 25/10/2026, das 17:00 às 21:30 (hora de Brasília). *Formato:* registros em CSV; descrição em PDF.

### C. Correspondências entre urna e seção, e urnas

Contexto. O TSE publica, nos dados abertos, o arquivo de correspondências esperadas entre urna e seção (gerado na véspera de cada turno: 03/10/2026 às 15:34 e 24/10/2026 às 12:31, e de novo no dia da votação) e o arquivo de correspondências efetivadas (a urna que de fato votou em cada seção).

**14. Seções com correspondência recebida no dia da votação.** Em 45 seções (17 no 1º turno e 28 no 2º), a correspondência da urna que votou só foi recebida no dia da votação, depois da abertura. No 2º turno, em 25 das 28, ela chegou junto com o pacote da urna. Esse tipo de caso também aparece em outras eleições (194 seções em 2022 e 82 em 2024). Para cada uma das 45 seções (lista no Anexo 1), pede-se: o registro da carga ou recarga da urna (data, hora, máquina e operador), a hora de transmissão da correspondência e a ata da mesa receptora ou do cartório que registra a troca de urna, se houve.
*Período:* da carga de cada urna até o dia da votação do turno. *Formato:* PDF para atas; CSV para os registros.

**15. As duas urnas da zona 71 da Bahia.** A origem das urnas que votaram no 2º turno nas seções BA 33774/0071/0150 e BA 39144/0071/0170. Elas receberam carga de seção em 21/10/2026 e não aparecem, nem como urna de seção nem como reserva, em nenhum dos arquivos de correspondências esperadas dos dois turnos. Pede-se o motivo da troca da urna do 1º turno, a ata ou registro dessa troca e a relação de reservas da zona em que essas urnas estavam.
*Período:* 04/10/2026 a 25/10/2026. *Formato:* PDF.

**16. Arquivo de correspondências esperadas do 2º turno.** O critério usado para gerar o arquivo de correspondências esperadas e o motivo de, no 2º turno:
- (a) o arquivo gerado em 24/10/2026 não listar as urnas que votaram em MG 41238/0331/0001 e MG 41238/0331/0197, com carga e correspondência recebidas em 13/10/2026, e continuar listando as urnas do 1º turno;
- (b) o mesmo arquivo não listar a urna que votou em MT 90670/0039/0376, cuja correspondência foi recebida em 24/10/2026 às 11:21, antes da geração do arquivo;
- (c) o arquivo listar como esperadas, em MA 09210/0001/0124 e MA 09210/0001/0125, urnas carregadas em 03/10/2026 e que nunca votaram, enquanto a urna que votou nos dois turnos estava registrada desde 28/09/2026.
*Formato:* documento técnico em PDF; resposta descritiva para os casos.

**17. Uso de urna de contingência de outra zona ou de outro município.** A norma que regula o uso de urna de contingência (reserva) carregada para uma zona em seção de outra zona, ou de outro município. Nos arquivos publicados, 44 reservas no 1º turno e 98 no 2º usaram carga de contingência registrada para outra zona; dessas, 8 e 21 eram de outro município.
*Período:* norma vigente em 2026. *Formato:* PDF.

**18. Troca de urnas entre as zonas 1 e 2 de Aracaju (SE).** O motivo e as atas da troca de urnas entre as zonas 0001 e 0002 de Aracaju, registrada nos diários das urnas em 17/10/2026 e 19/10/2026, inclusive nas seções SE 31054/0002/0060, /0087, /0345, /0535 e /0551 e SE 31054/0002/0524. O pedido pode ser encaminhado ao TRE-SE.
*Período:* 05/10/2026 a 25/10/2026. *Formato:* PDF.

**19. Listas de sorteio do Teste de Integridade.** As listas de seções sorteadas para o Teste de Integridade nos dois turnos, por TRE, com a seção, a urna retirada, a urna que a substituiu e a ata de cada sorteio. Em especial, as seções SE 31690/0012/0087, SE 32476/0023/0118, SE 31712/0013/0082, SE 32514/0035/0057 e SE 31755/0005/0143: em cada uma, o diário da urna que votou no 2º turno registra, em 04/10/2026, um dia de votação da mesma seção que não é o resultado oficial do 1º turno.
*Período:* 1º e 2º turno de 2026. *Formato:* CSV para as listas; PDF para as atas.

**20. Distribuição dos modelos de urna.** O critério usado para distribuir os modelos de urna (2013, 2015, 2020 e 2022) entre zonas e seções em 2026.
*Formato:* norma ou documento em PDF.

### D. Cargas e recargas de urna

Contexto. Antes da votação, cada urna recebe uma carga (a gravação dos programas e dos dados da seção) em cerimônia do cartório eleitoral. Quando a urna é carregada de novo, o diário da carga anterior fica guardado dentro do novo. Na maior parte das recargas, o diário mostra o motivo (falha registrada, urna reserva preparada para uma seção, nova mídia de carga). Em alguns casos, o diário não registra motivo. Isso não quer dizer que não houve motivo: o motivo fica na ata do cartório, que não está nos arquivos públicos.

**21. Recargas do 2º turno sem motivo registrado no diário.** As atas e os editais das cerimônias de carga e de recarga das urnas das 17 seções cujo boletim do 2º turno veio de uma recarga sem motivo registrado no diário da urna (lista no Anexo 2), com o motivo de cada recarga.
*Período:* 05/10/2026 a 25/10/2026. *Formato:* PDF.

**22. Cargas feitas no dia da votação.** As atas e os registros das cargas feitas no próprio dia da votação (lista no Anexo 3):
- (a) as 7 seções do 1º turno cujo boletim veio de urna carregada em 04/10/2026;
- (b) as 5 seções do 2º turno cujo boletim veio de urna carregada em 25/10/2026;
- (c) as 3 urnas de reserva carregadas durante a votação de 04/10/2026, que não geraram boletim no 1º turno e foram usadas como reserva no 2º turno.
*Período:* 04/10/2026 e 25/10/2026. *Formato:* PDF.

**23. Calendário das cerimônias de carga.** O calendário e os editais de convocação das cerimônias de carga e lacração de urnas de cada zona eleitoral, com data, hora e local de cada cerimônia, inclusive as cerimônias extras.
*Período:* preparação do 1º turno e do 2º turno de 2026. *Formato:* CSV para o calendário; PDF para os editais.

### E. Diário da urna e manuais

**24. Códigos de erro "SAVD".** O significado dos códigos 0, 2, 3, 5 e 6 que o diário da urna grava nas mensagens "Falha ao validar assinatura TSE" e "Falha ao validar assinatura UE" (no formato "Erro SAVD: (código - arquivo)"), e a documentação desses códigos.
*Formato:* documento em PDF ou resposta descritiva.

**25. O que fazer depois de erro na verificação de assinatura ao ligar a urna.** A regra escrita que diz o que o mesário ou o técnico deve fazer quando a urna, ao ligar, registra erro na verificação de assinatura ou de integridade do próprio sistema e mostra mensagens como "Desligue a urna e faça uma nova carga" ou "Se o erro persistir, substitua a urna": se a urna pode ser religada e seguir votando, e o que deve ser registrado em ata. Nos diários publicados do 2º turno, isso aconteceu em 162 seções.
*Período:* norma vigente em 2026. *Formato:* PDF.

**26. Manuais e resolução.** O Manual do Mesário de 2026; o manual de preparação de urnas e de contingência de 2026 (inclusive substituição de urna, uso do cartão de memória de votação na urna reserva e uso do Recuperador de Dados); e a resolução que regula a operação do voto eletrônico em 2026.
*Formato:* PDF.

**27. Números de série das mídias.** O que são e como são gerados (aleatório, sequencial ou por lote) os números de série da memória de votação (MV), da mídia de resultado (MR) e da mídia de carga (FC) gravados no diário e no boletim.
*Formato:* documento técnico em PDF ou resposta descritiva.

**28. Arquivos gerados pela urna e não publicados.** A função e o conteúdo dos arquivos jufa.dat, imgze.dat, hash.dat e mr.ver, que constam da lista assinada de cada pacote de urna e não são publicados.
*Formato:* documento técnico em PDF ou resposta descritiva.

**29. Votos sem registro correspondente no diário publicado.** Em algumas seções, parte dos votos do boletim não tem linha correspondente no diário publicado no pacote da seção. Pede-se a ata da mesa receptora e o diário (ou a memória interna) da urna usada antes da troca, e a indicação da urna que gravou os votos, nas seções:
- 1º turno: BA 39934/0183/0175, SP 71072/0002/0035 e RS 89036/0083/0044;
- 2º turno: MA 08893/0047/0609, BA 35653/0173/0235 e RS 89060/0017/0191.
*Período:* dia da votação de cada turno. *Formato:* PDF para atas; arquivo original do diário.

### F. Exterior e apuração em cédula

Contexto. No exterior há 1.351 seções em cada turno: 1.281 votaram em urna, 29 foram apuradas em cédula pelo Sistema de Apuração e 41 não foram instaladas. Nas urnas do exterior, todos os eleitores foram liberados pelo número do título e pelo ano de nascimento, sem digital.

**30. Norma que dispensa a digital no exterior.** A norma e o motivo de as urnas do exterior não pedirem a digital do eleitor, inclusive dos eleitores do exterior que têm biometria no cadastro (222.584 eleitores).
*Período:* 1º e 2º turno de 2026. *Formato:* PDF.

**31. Relógio da máquina do Sistema de Apuração.** O fuso horário configurado no relógio das máquinas que geraram os boletins das seções apuradas em cédula no exterior, e a hora de recebimento no TSE de cada um desses boletins.
*Período:* 1º e 2º turno de 2026. *Formato:* resposta descritiva; horários em CSV.

**32. Nome do município nos boletins apurados em cédula.** O motivo de, no arquivo de correspondências efetivadas de 2026, as 29 linhas das seções apuradas pelo Sistema de Apuração trazerem o nome de município "BUENOS AIRES" nos dois turnos, embora o código de município de cada linha esteja certo (Katmandu, Kiev, Teerã e outros). No arquivo de 2022, o nome está certo.
*Formato:* resposta descritiva.

**33. Atas das seções apuradas em cédula e das seções não instaladas.** As atas das 29 seções do exterior apuradas em cédula (contagem das cédulas pela junta), as atas das 2 seções de MG que votaram em cédula no 1º turno (MG 50075/0047/0041 e MG 41238/0039/0168) e o registro do motivo da não instalação das 41 seções do exterior.
*Período:* 1º e 2º turno de 2026. *Formato:* PDF.

### G. Cadastro eleitoral

**34. Critério de "biometria cadastrada" e digital carregada na urna.** A definição do campo de biometria no perfil do eleitorado publicado pelo TSE, e se ela coincide com ter digital carregada no arquivo de eleitores da urna. E o número de eleitores com digital carregada na urna, por seção.
*Período:* cadastro usado no 1º e no 2º turno de 2026. *Formato:* documento em PDF; números por seção em CSV.

**35. Data de referência da idade.** A data usada pelo TSE para calcular a idade e a faixa etária do eleitor no perfil do eleitorado publicado e nos dados de comparecimento por idade. Essa data não está documentada nos arquivos, e a contagem de eleitores nas faixas de idade mais altas muda conforme ela.
*Formato:* resposta descritiva.

**36. Comparecimento por idade no 2º turno.** O comparecimento do 2º turno por faixa etária (inclusive a de 100 anos ou mais), por município e zona, no mesmo nível de detalhe dos dados do 1º turno. Esses dados não estão publicados para o 2º turno.
*Período:* 25/10/2026. *Formato:* CSV.

**37. Cancelamentos de título por óbito.** O número de inscrições canceladas por óbito, por município, por mês e por faixa etária, separando as anteriores e as posteriores ao fechamento do cadastro para 2026. Não se pede nenhum dado pessoal.
*Período:* 01/01/2022 a 25/10/2026. *Formato:* CSV.

**38. Votantes de 80 anos ou mais por forma de habilitação.** Por zona eleitoral, em cada turno de 2022 e de 2026, o número de votantes de 80 a 89 anos, de 90 a 99 anos e de 100 anos ou mais, separados pela forma como a urna os habilitou: (a) pela digital do próprio eleitor; (b) pelo ano de nascimento digitado, sem digital; (c) liberação feita pelo mesário depois de digital não reconhecida. Contexto: no 1º turno, os votantes de 85 a 99 anos passaram de 267.098 em 2022 para 460.338 em 2026. O diário da urna registra a forma de habilitação, mas não a idade do eleitor, e os dados de comparecimento por idade não separam a forma de habilitação; só o cadastro liga uma informação à outra. Não se pede nenhum dado pessoal.
*Período:* 1º e 2º turno de 2022 e de 2026. *Formato:* CSV.

**39. Títulos cancelados por óbito com voto registrado em 2026.** O número de inscrições canceladas por óbito depois do fechamento do cadastro para 2026 que tiveram comparecimento registrado no 1º ou no 2º turno de 2026, por zona, por faixa etária e por forma de habilitação na urna (como no item 38), indicando, para cada caso, se a data do óbito é anterior ou posterior à data do turno em que houve o voto. Não se pede nenhum dado pessoal.
*Período:* do fechamento do cadastro para 2026 a 25/10/2026. *Formato:* CSV.

**40. Origem das seções novas.** Para as seções criadas depois de 2022, a data e o motivo da criação (ato do TRE), e a distribuição, por seção, dos eleitores pela data de alistamento ou de transferência para aquela seção (por ano, sem dado pessoal), para 2026.

### H. Sigilo do voto

**41. Números com formato de título gravados na suspensão do eleitor.** Quando o mesário suspende um eleitor que demora na cabine, o diário público da urna grava o número digitado. No 1º turno, 55.483 dessas linhas trazem 31.764 números com formato de título que não pertencem a nenhum mesário, presidente de mesa ou servidor registrado; no 2º turno, são 5.564 linhas e 3.801 números. Pede-se:
- (a) de quem é o número gravado nessa linha (do eleitor suspenso, do mesário ou outro);
- (b) a regra técnica da suspensão: o que a urna faz com os votos já confirmados e com os cargos não confirmados;
- (c) se a publicação desse número no diário público foi avaliada quanto ao sigilo do voto e à proteção de dados pessoais, e o documento dessa avaliação.
*Formato:* resposta descritiva; documentos em PDF.

### I. Mesa receptora e caderno de votação

**42. Caderno de votação e atas de seções com padrão de liberação a esclarecer.** A ata da mesa receptora e cópia do caderno de votação (com os dados pessoais ocultados, preservando o número e a ordem das assinaturas) das seções:
- PR 78573/0083/0101, nos dois turnos: no 2º turno, 16 avisos de "eleitor já votou", todos até 20 segundos depois de um voto liberado sem digital;
- AL 28819/0045/0174 e PR 79294/0019/0055, no 1º turno: todos os eleitores dessas seções têm digital no cadastro, mas a urna liberou sem digital 52,5% e 98,2% dos votantes.
Se a cópia não puder ser fornecida, pede-se a indicação de que o caderno está preservado e de qual órgão pode examiná-lo.
*Período:* dia da votação de cada turno indicado. *Formato:* PDF.

### J. Liberação do eleitor quando a digital não é reconhecida

Contexto. Quando a digital do eleitor não é reconhecida, a urna pede o dedo até quatro vezes ("Solicita digital. Tentativa [n] de [4]"). Depois disso, a mesa digita um dado do eleitor e a urna pede "a digital do mesário" para autorizar a liberação. Nos diários publicados, em todas as seções do Brasil, nos dois turnos, a urna exigiu as quatro tentativas antes da liberação: das 16.974.711 liberações feitas assim, só 3 tiveram menos de quatro tentativas. Cada tentativa termina com "Capturada a digital" (um dedo foi lido e não bateu) ou com "Timeout de reconhecimento do dedo" (nenhum dedo foi lido a tempo). Em 172.318 liberações do 1º turno e 212.171 do 2º, as quatro tentativas terminaram com tempo esgotado, sem nenhum dedo lido. O dedo posto para autorizar a liberação termina de três formas no diário: "Mesário … habilitou o eleitor" (mesário registrado na urna); "Não encontrou digital coletada em nenhum dos arquivos, vai salvar a digital em novo arquivo"; ou "Digital coletada bate com uma digital gravada após o registro inicial de mesário". Nas duas últimas, a liberação é aceita sem identificar quem autorizou.

**43. Quem pode autorizar a liberação feita pela mesa.** A norma ou especificação técnica que define quem pode autorizar, com a própria digital, a liberação de um eleitor cuja digital não foi reconhecida, e o motivo de a urna aceitar a autorização por um dedo que não é de mesário registrado, sem identificá-lo. Pede-se também:
- (a) como os mesários são registrados na urna (em que momento, por quem e com que dados) e se a urna de contingência (reserva) que substitui a da seção durante a votação recebe esse registro;
- (b) o que a urna faz com a digital "salva em novo arquivo" na autorização: onde fica guardada, se é publicada e se permite saber depois de quem é;
- (c) se há limite para o número de liberações autorizadas pelo mesmo dedo não registrado como mesário.
*Período:* norma e programa em uso no 1º e no 2º turno de 2026. *Formato:* documento técnico ou norma em PDF; resposta descritiva.

**44. Tentativa que termina sem dedo lido.** A especificação que faz a tentativa terminada com "Timeout de reconhecimento do dedo" contar como uma das quatro tentativas exigidas antes da liberação pela mesa, embora nenhuma digital tenha sido lida; o tempo de espera de cada tentativa; e se a urna, o manual do mesário ou outra norma prevê alguma conferência adicional quando as quatro tentativas terminam sem nenhum dedo lido.
*Período:* norma e programa em uso no 1º e no 2º turno de 2026. *Formato:* documento técnico ou norma em PDF; resposta descritiva.

**45. Atas de seções com padrão de falha da digital a esclarecer.** A ata da mesa receptora, o registro de manutenção ou de substituição da urna e a indicação de quantos mesários foram registrados na urna e em que horário (sem dados pessoais) das seções abaixo, no turno indicado. Pede-se também se a ata registra quem autorizou as liberações feitas pela mesa.
- Urna de contingência com leitor de digital que alterna entre períodos em que quase nenhum eleitor é reconhecido e períodos em que quase todos são (2º turno): SP 71072/0006/0427.
- Falhas da digital em dobro em relação ao 1º turno, com a maior parte das liberações autorizada por um mesário registrado e as quatro tentativas feitas em menos tempo que no 1º turno (2º turno): RJ 60011/0009/0456.
- Liberações autorizadas em série por um ou poucos dedos não registrados como mesário, reconhecidos pela urna muitas vezes no mesmo dia (2º turno): PR 74993/0159/0009, BA 36854/0180/0149, RJ 60011/0162/0164, SP 66630/0077/0002 e SP 71579/0324/0231.
- Autorização por um dedo diferente a cada liberação, quase nunca de mesário registrado, com os eleitores reconhecidos normalmente (1º e 2º turno): MG 40150/0064/0005.
- Muitas liberações em que as quatro tentativas terminaram sem nenhum dedo lido: RS 85316/0007/0017, SP 62936/0344/0060 e SC 81256/0082/0104 (2º turno); ES 56995/0053/0316 (1º turno).
*Período:* dia da votação de cada turno indicado. *Formato:* PDF.

Os pedidos visam permitir a conferência independente dos resultados; não pressupõem irregularidade.

[local], 30 de outubro de 2026.

&nbsp;

______________________________________
[nome do solicitante]
CPF [CPF]

## Anexo 1 — Seções com correspondência recebida no dia da votação (item 14)

**2º turno (28 seções)**

| Situação registrada nos arquivos | Seções |
|---|---|
| Urna de contingência recarregada como urna de seção (12) | BA 38490/0008/0432; BA 38490/0008/0606; MA 07536/0026/0088; MT 91553/0038/0113; PA 04278/0030/0295; PA 04278/0098/0273; PA 04278/0076/0475; PA 05630/0008/0325; PA 05355/0104/0279; PR 77399/0124/0085; RO 00051/0030/0123; SP 70378/0115/0155 |
| A própria urna da seção, recarregada (5) | PA 04154/0107/0161; PA 04154/0107/0278; PA 04154/0107/0296; PA 04154/0107/0341; PA 04332/0013/0428 |
| Urna de outra seção no 1º turno, recarregada como contingência (7) | SE 31054/0002/0060; SE 31054/0002/0087; SE 31054/0002/0345; SE 31054/0002/0535; SE 31054/0002/0551; SP 69213/0317/0270; SP 69213/0317/0294 |
| Urna que não aparece em nenhum arquivo de correspondências esperadas (4) | BA 33774/0071/0150; BA 39144/0071/0170; PA 05355/0104/0093; SE 31054/0002/0524 |

**1º turno (17 seções)**

| Situação registrada nos arquivos | Seções |
|---|---|
| Urna carregada em 03/10/2026, na véspera, no lugar da esperada (10) | AM 02550/0001/0778; AM 02550/0001/0869; CE 14672/0026/0030; PA 04030/0094/0117; PA 04278/0029/0578; PA 04278/0030/0260; PA 04278/0098/0020; PA 04570/0009/0074; PA 05312/0004/0450; SP 71072/0373/0044 |
| Urna carregada em setembro, mas o arquivo esperava outra (6) | MG 41475/0045/0043; MG 48658/0184/0358; MG 48917/0192/0042; PA 04626/0068/0161; PR 79316/0086/0191; SP 65692/0058/0166 |
| Recarga na manhã da votação (1) | MG 48852/0190/0107 |

## Anexo 2 — Seções do 2º turno cujo boletim veio de recarga sem motivo registrado no diário (item 21)

| Seção | Carga anterior | Nova carga |
|---|---|---|
| BA 30872/0186/0017 | 15/10/2026 11:32 | 22/10/2026 09:06 |
| BA 30872/0186/0051 | 15/10/2026 10:33 | 22/10/2026 10:24 |
| BA 30872/0186/0126 | 15/10/2026 15:11 | 22/10/2026 10:54 |
| BA 36633/0051/0105 | 24/10/2026 10:18 | 24/10/2026 10:31 |
| BA 38490/0008/0606 | 14/10/2026 13:11 e 16/10/2026 13:35 | 24/10/2026 11:02 (duas recargas) |
| BA 38490/0013/0072 | 24/10/2026 11:49 | 24/10/2026 12:28 |
| DF 97012/0015/0318 | 24/10/2026 11:44 | 24/10/2026 11:49 (hora digitada: 10:49) |
| ES 57053/0001/0557 | 24/10/2026 09:48 | 24/10/2026 10:05 |
| MG 41017/0021/0112 | 24/10/2026 09:29 | 24/10/2026 10:00 |
| MG 43710/0313/0046 | 24/10/2026 09:04 | 24/10/2026 12:15 |
| MG 54275/0282/0138 | 19/10/2026 15:28 | 19/10/2026 15:59 |
| PE 26298/0138/0081 | 24/10/2026 11:24 | 24/10/2026 11:47 |
| PR 74918/0056/0037 | 25/10/2026 09:09 | 25/10/2026 09:20 |
| RO 00051/0030/0123 | 24/10/2026 09:38 | 24/10/2026 18:03 |
| SP 62510/0027/0083 | 16/10/2026 14:15 | 16/10/2026 15:05 |
| SP 71072/0256/0205 | 15/10/2026 15:36 | 22/10/2026 16:40 |
| TO 95532/0026/0001 | 24/10/2026 10:58 | 24/10/2026 11:22 |

Horários conforme registrados no diário da urna.

## Anexo 3 — Cargas feitas no dia da votação (item 22)

| Grupo | Seção | Carga (hora local) |
|---|---|---|
| (a) 1º turno, urna de seção | MG 48852/0190/0107 | 04/10/2026 07:51 |
| (a) 1º turno, urna de seção | PR 75353/0003/0495 | 04/10/2026 08:09 |
| (a) 1º turno, urna de seção | SC 83194/0027/0057 | 04/10/2026 08:01 |
| (a) 1º turno, urna de seção | SC 83194/0027/0056 | 04/10/2026 08:13 |
| (a) 1º turno, reserva | BA 33197/0036/0003 | 04/10/2026 05:50 |
| (a) 1º turno, reserva | SC 83518/0046/0038 | 04/10/2026 09:45 |
| (a) 1º turno, reserva | SC 83518/0046/0113 | 04/10/2026 09:54 |
| (b) 2º turno | MS 90514/0008/0486 | 25/10/2026 06:55 |
| (b) 2º turno | MS 91650/0051/0044 | 25/10/2026 07:36 |
| (b) 2º turno | PR 74918/0056/0037 | 25/10/2026 09:20 |
| (b) 2º turno | PR 75833/0043/0397 | 25/10/2026 10:04 |
| (b) 2º turno | SP 61816/0016/0436 | 25/10/2026 07:58 |
| (c) reserva carregada em 04/10, usada no 2º turno | MT 91677/0020/0419 | 04/10/2026 08:03 |
| (c) reserva carregada em 04/10, usada no 2º turno | MT 91677/0020/0669 | 04/10/2026 09:51 |
| (c) reserva carregada em 04/10, usada no 2º turno | RS 85090/0144/0063 | 04/10/2026 10:30 |
