# Auditoria independente: eleições gerais de 2026 (1º e 2º turno)

> [!WARNING]
> **Análise em andamento. Nada aqui é conclusão final.**
>
> - Os números, os status das hipóteses e os textos mudam conforme os testes avançam e passam pela revisão cética. Confira sempre a data do retrato.
> - **Nenhuma hipótese de fraude foi sustentada até agora**, e também **não é possível afirmar que não houve fraude**. Os arquivos públicos não mostram quem estava na cabine, e vários testes têm pontos cegos declarados.
> - Só o [relatório de perícia](docs/pericia/README.md) traz números conferidos no universo completo. O que está em [docs/analysis/](docs/analysis/) são análises de trabalho: hipóteses, estimativas e rascunhos que ainda podem estar errados.
> - Brecha (um ponto em que só uma pessoa decide, sem rastro técnico) é **risco**, não prova de fraude. Não use trechos isolados como prova de nada: leia cada achado com o seu alcance e os seus limites.

Auditoria dos arquivos públicos das urnas eletrônicas (BU, RDV, log e assinaturas) publicados pelo TSE para as eleições de 2026, com métodos reproduzíveis. Premissas, fontes e achados ficam em [docs/](docs/README.md), e cada afirmação leva o rótulo **Fato**, **Hipótese** ou **Recomendação**.

Trabalhos anteriores: [2º turno 2022](https://github.com/andrehrferreira/auditoria-2turno-eleicao2022) · [1º turno 2024](https://github.com/andrehrferreira/auditoria-1turno-eleicoes-2024).

## Andamento

Atualizado em 02/11/2026. Desde 02/11 as hipóteses têm veredito final só com dados públicos, sem esperar o TSE. O painel `coleta-tse` do Claude Code lê esta tabela: mantenha o formato e os marcadores.

<!-- andamento:inicio -->
| Fase | Etapa | Status | Detalhe |
|---|---|---|---|
| 1. Coleta | Arquivos de urna do 2º turno | concluída | 499.248/499.248 seções (499.207 completas + 41 não instaladas); 17.931/17.931 agregadas |
| 1. Coleta | Arquivos de urna do 1º turno | concluída | 499.248/499.248 seções (499.207 completas + 41 não instaladas); 17.931/17.931 agregadas |
| 1. Coleta | aux.json do 2º turno (status oficial por seção) | pendente | Falta obter do TSE a lista oficial de parte de SP e de todo o TO; 0 seção com hash oficial diferente do pacote; a integridade não depende dela (hash do manifesto e SHA-512 de cada arquivo conferidos) |
| 1. Coleta | aux.json do 1º turno | pendente | Depende do aux do 2º turno; a integridade do 1º turno foi conferida sem ele |
| 1. Coleta | Dados abertos (resultado oficial, perfil do eleitorado, comparecimento por idade, candidaturas, 2018 e 2022) | concluída | data/raw/dadosabertos |
| 1. Coleta | Candidatos e municípios (referência) | concluída | 1º e 2º turno |
| 2. Leitura | Decodificador pela especificação oficial (BU, RDV, imgbu, vsc) | concluída | src/asn1.js + src/esquemas.js |
| 2. Leitura | Conversor de seção para JSON legível | concluída | src/exportar.js, sob demanda |
| 2. Leitura | Banco SQLite para consultas | concluída | 1º e 2º turno: 28/28 UFs, 499.248 seções cada, 0 erro de carga; resultado oficial carregado |
| 2. Leitura | Cópia de leitura com índices analíticos | concluída | Dois turnos com 28/28 UFs; índices e ANALYZE só na cópia (doc 09) |
| 2. Leitura | Perfil por seção (métricas de log e BU) | pendente | Falta regerar as 28 UFs nos dois turnos com a ordem do log corrigida (pacotes com 2+ logs) e recarregar o perfil_log; H08, H13, H19 e H20 leram os diários de todas as urnas direto, sem depender dele |
| 3. Integridade | Hashes e assinaturas no país inteiro (H04) | concluída | Dois turnos, 499.207 pacotes cada: 0 arquivo alterado; 1 pacote de MG (1º turno) com o boletim impresso fora da lista lacrada; carteiras com bytes a mais são defeito de leitura, não de assinatura |
| 3. Integridade | Certificados das urnas (H25) | concluída | AC URNA vencida em 18/07/2026 assinou 54 certificados de urna depois de vencer; 0 certificado de fora das 3 ACs do TSE e 0 fora do molde de produção (503.525, revisão cética 35); 6 urnas certificadas entre os turnos; sem essas urnas o 13 ainda venceria o 2º turno (3.316.317); pedido de esclarecimento ao TSE no relatório temático |
| 3. Integridade | Seriais e trocas de urna (H11) | concluída | Dois turnos: 0 número de urna e 0 código de carga repetidos entre seções; cartões de votação repetidos na quantidade que o acaso prevê; urnas religadas e trocadas explicadas (revisão cética 24) |
| 4. Análises | A1/B2: soma dos BUs × resultado oficial (H03) | concluída | Refutada: soma igual ao oficial em todos os campos nos dois turnos; contas internas C1–C7 dos dois turnos sem violação, com contraprova independente do 2º turno (revisão cética 52); falta só a decisão sobre o nº 10 no RJ (fonte pública de candidaturas) |
| 4. Análises | Coerência BU × RDV × log | concluída | Votos do boletim sem linha no diário reconciliados nos dois turnos (revisões céticas 20 e 25); contas internas C3–C6 do 1º turno sem falha; 40 votos de cédula em MG e 789 no exterior sem rastro de liberação (risco) |
| 4. Análises | B5/H10: crescimento entre turnos | concluída | H10 refutada como escrita (parecer 05); linha de base 2018/2022 |
| 4. Análises | C2/H01: títulos de falecidos | concluída | Fato que pede explicação: cadastro com mais 100+ do que o Censo permite (títulos antigos sem limpeza), sem uso em massa; os dados públicos não dizem se algum título de falecido foi usado |
| 4. Análises | A5/B1/H02/H05: liberação sem biometria e mesários | concluída | H02 fato que pede explicação (foto explica 98,64% do excesso; poucas seções sem rastro técnico); H05 sem sinal, com ponto cego declarado (planos 29 e 30, revisão cética 57) |
| 4. Análises | H13: liberados sem biometria votaram no 13, sobretudo no Nordeste? | concluída | Não decidível com dados públicos: Nordeste sem sinal; MG e RS com padrão igual ao de 2022; mesmo toda essa liberação trocada não mudaria o vencedor (planos 27 e 28 com adendo, revisão cética 54) |
| 4. Análises | A2/B3/H06: chegada dos BUs, votos após 17h e encerramento às 19h | concluída | Sem sinal: 34.315 votos depois das 17h, menos de 1% da margem; a ordem de registro não muda a soma |
| 4. Análises | A10/H08: sequências impossíveis | concluída | Ciclo completo em todos os diários dos dois turnos: nenhum ciclo abaixo do limite físico; menor intervalo 16 s (2º turno), 19 s e 31 s (1º turno); ciclos mais rápidos pela digital ou pelo ano de nascimento, nenhum liberado à mão (revisão cética 42); na perícia, tópico 10 |
| 4. Análises | H09: sigilo do voto nos arquivos públicos | concluída | Universo dos dois turnos: o RDV não guarda a ordem de votação; números com formato de título nas mensagens de suspensão do diário (revisão cética 29) |
| 4. Análises | H14: urnas trocadas por reserva no 2º turno | concluída | 5.714 seções com reserva comparadas com a mesma seção no 1º turno: o teste não encontrou diferença; sem marca de software adulterado (revisão cética 30) |
| 4. Análises | H15/H16/H17: mesa, máquina de estados do eleitor, suspensão e "já votou" | concluída | Sem sinal de fraude na mesa; 0 sessão órfã; 0 voto sem habilitação no 1º turno (revisões céticas 31 e 32); casos AL/PR da H15: defeito do leitor de digital (revisão cética 41); na perícia, tópico 13 |
| 4. Análises | H26: virada para o 13 por zona | concluída | Sem sinal nos dados públicos, efeito não limitado: zonas perto do corte e voto tardio sem sinal; linha de base 2018/2022 feita (a uniformidade some medida entre os finalistas); troca proporcional é ponto cego estrutural (plano e resultado 06 do cientista político, revisão cética 53) |
| 4. Análises | H27: pacote trocado antes da totalização (urna que "só assina") e seções fantasmas | concluída | Sem pacote trocado nem seção fantasma (revisão cética 38); 17 recuperações de dados assinadas por reserva da lista prévia; urnas da BA zona 71 e seções novas revisadas (pareceres 41 e 43); 56 seções novas com ≥ 98% conferidas uma a uma; seções novas de 2022 seguidas até 2026 (demógrafo 11, revisão cética 50): o comparecimento muito alto diminui em quatro anos e não há uso em massa da liberação sem digital; o que falta depende do pedido ao TSE; veredito final: fato que pede explicação (urnas fora das listas prévias), sem pacote trocado |
| 4. Análises | H18–H24 (inserção uniforme, falha induzida, relógio, RDV, exterior, recarga, trânsito) | concluída | Todas testadas no universo completo e revisadas: H18, H21, H22, H23 e H24 (pareceres 37 e 39), H19 (parecer 45) e H20 (parecer 47), na perícia, tópico 14. O que falta são atas, listas e regras pedidas ao TSE e a conferência no local das seções listadas; fechamento de 02/11: H18, H21, H22 e H24 sem sinal, H19, H20 e H23 fatos que pedem explicação, sem efeito que mude o vencedor (revisões céticas 55, 56 e 58) |
| 4. Análises | A3/A4 e forense estatística | concluída | Parecer 13: sem marca de fraude concentrada; os testes não veem fraude espalhada ou proporcional |
| 4. Análises | Aumento de comparecimento entre turnos | concluída | Parecer 22 (sustentado com ressalvas): aumento difuso, sem a forma de inserção concentrada em poucas seções |
| 5. Relatório | Perícia em linguagem simples | concluída | Resumo executivo e tópicos 0 a 14 (13: mesa e sessão do eleitor; 14: outras formas de fraude, com H19 e H20); H08 e H13 (liberação do diário, sinal no Sul e MG 2022) nos tópicos 4 e 10; correções de relógio nos tópicos 3, 7, 8 e 10; revisão geral (T20) e consensos T22 e T24 aplicados; texto independente do processo; H26 no tópico 8, Campinápolis e salto dos 100+ de 2018 para 2022 no tópico 6, seções novas nos tópicos 6 e 14, contraprovas do 2º turno nos tópicos 2 e 5; vereditos finais de H01–H27 em todos os tópicos (02/11) |
| 5. Relatório | Relatório completo (PDF assinado) | concluída | [docs/relatorio/relatorio.pdf](docs/relatorio/relatorio.pdf), 335 páginas, assinado em 02/11: resumo executivo, tópicos 0 a 14 (H01 a H27) com os vereditos finais, 22 gráficos e Anexo B com 21 tabelas de dados (planilhas embutidas no PDF) |
| 5. Relatório | Relatório temático: certificado vencido da AC URNA (PDF assinado) | concluída | [docs/relatorio/temas/certificado-ac-urna.pdf](docs/relatorio/temas/certificado-ac-urna.pdf), 34 páginas, assinado: pedido ao TSE no início, carteiras fora do padrão, consenso T23 e planilhas das urnas embutidas |
| 5. Relatório | Relatório das hipóteses (PDF) | concluída | [docs/relatorios/hipoteses-em-teste.pdf](docs/relatorios/hipoteses-em-teste.pdf), H01 a H27 com veredito final, retrato de 02/11 |
| 5. Relatório | Pedido ao TSE pela Lei de Acesso à Informação | concluída | [docs/pedidos/pedido-lai-tse-2026-10-30.md](docs/pedidos/pedido-lai-tse-2026-10-30.md): 45 itens em 10 temas, com anexos das seções; pronto para protocolar |
| 5. Relatório | Resposta do TSE ao pedido | não esperada | Decisão de 02/11: os vereditos não dependem da resposta; o pedido fica como recomendação (falta preencher nome, CPF e local para protocolar) |
<!-- andamento:fim -->

## Hipóteses em análise

<!-- hipoteses:inicio -->
Retrato de 02/11/2026. Gerado por `python scripts/relatorios/hipoteses.py` a partir de [docs/relatorios/hipoteses-em-teste.json](docs/relatorios/hipoteses-em-teste.json); relatório completo em [PDF](docs/relatorios/hipoteses-em-teste.pdf). Os números vêm do relatório de perícia (universo completo, conferidos); o registro com toda a evidência está em [docs/hipoteses.md](docs/hipoteses.md) e o quadro em linguagem simples em [docs/pericia/10](docs/pericia/10-quadro-das-hipoteses.md).

| # | Suspeita | Veredito final | O que se sabe | O que os dados públicos não alcançam |
|---|---|---|---|---|
| H01 | Votos dados com títulos de pessoas que já morreram | **fato que pede explicação** | O cadastro tem mais eleitores de 100 anos ou mais do que o Censo conta de pessoas com essa idade: são títulos antigos que não foram limpos. No 1º turno quase nenhum deles votou, e nada mostra uso em massa. Os arquivos públicos não dizem se algum título de pessoa falecida, de qualquer idade, foi usado. | Comparecimento por idade no 2º turno, óbitos com voto e votantes idosos por forma de liberação (dados do TSE, não públicos). |
| H02 | Seções com quantidade fora do normal de eleitores liberados sem digital | **fato que pede explicação** | Quase todo o excesso de eleitores liberados sem digital são pessoas que o arquivo da urna mostrava com foto e sem digital. Sobram poucas seções, com algumas centenas de liberações, em que a mesa liberou mais gente à mão. Só o caderno de votação explica por quê. | Caderno de votação e ata das poucas seções que sobram. |
| H03 | A soma das urnas é diferente do resultado oficial | **refutada** | A soma dos boletins das urnas é igual ao resultado oficial, em todos os campos, nos dois turnos. Isso foi conferido por mais de um caminho independente. | Nenhum para a soma. A coerência interna não prova que a urna gravou o que o eleitor digitou (integridade do programa, H04, H25). |
| H04 | Arquivos publicados alterados, ou gerados fora de uma urna oficial | **refutada** | Nenhum arquivo foi mexido depois de sair da urna, e nenhuma urna recebeu voto sem antes conferir o próprio programa. Um programa alterado e assinado com a chave oficial não apareceria nesses arquivos. | Programa adulterado e assinado com a chave oficial não aparece nos arquivos: faltaria conferir o hash dos binários lacrados contra o código-fonte e o resultado do Teste de Integridade. |
| H05 | Mesários liberando outras pessoas no lugar de eleitores da seção, sem digital | sem sinal nos dados públicos | O teste veria mesários pondo gente no lugar de eleitores de forma concentrada em poucas seções, e isso não aparece. Uma inserção miúda, de 1 a 3 votos em muitas seções, passaria sem sinal. | Via de habilitação por eleitor e caderno de votação; inspeção física das urnas e dos leitores. |
| H06 | A prorrogação do horário de votação favoreceu um lado; na apuração, os boletins foram liberados de forma controlada | sem sinal nos dados públicos | Depois das 17h foram 34.315 votos. Mesmo todos de um lado só, não chegariam a 1% da diferença. A ordem em que os boletins foram registrados não muda a soma. | Onde os boletins esperaram antes do registro e a versão assinada da decisão de prorrogação (não públicos). |
| H07 | Urnas antigas colocadas de propósito onde se quer dispensar a digital | **refutada** | Todo modelo de urna lê digital, então a urna antiga não serve para dispensar a digital. | O critério de alocação das urnas antigas (não público); não muda o veredito. |
| H08 | Votos em sequência rápida demais para uma pessoa | **refutada** | Nenhum eleitor votou mais depressa do que uma pessoa consegue, nos dois turnos. | Voto gravado por programa adulterado, que não passa pelo teclado, fica com a integridade do programa. |
| H09 | Os arquivos públicos permitem descobrir em quem uma pessoa votou | **fato que pede explicação** | O registro público da urna traz o número do título de quem estava na cabine quando a mesa interrompeu a votação, com hora e desfecho. Não diz em quem a pessoa votou, salvo numa seção em que todos votaram no mesmo candidato. | Regra exata da urna para a suspensão (especificação do TSE). |
| H10 | O vencedor cresceu do 1º para o 2º turno mais do que havia de votos disponíveis | **refutada** | O 13 não ganhou mais votos do que havia para ganhar em todos os estados. Em 6 estados, o ganho só fecha com eleitores que mudaram de lado ou com eleitores diferentes em cada turno, e os arquivos públicos não dizem qual. | Lista de quem votou em cada turno (dado pessoal). |
| H11 | O mesmo cartão de memória usado em mais de uma urna, ou resultado trocado no caminho | sem sinal nos dados públicos | Nenhum cartão, urna ou código de carga apareceu em duas seções do mesmo município ou zona, e cada resultado vem assinado pela própria urna. O caminho do resultado até a totalização não é público. | Os registros de transmissão até a totalização (não públicos). |
| H12 | O QR do título digital (e-Título) entrega os dados usados para liberar sem digital, e pode ser forjado | não decidível com dados públicos | A urna não lê nem registra o e-Título. Se o código do e-Título pode ser forjado, só um teste de laboratório com títulos de voluntários responde. | Teste de laboratório com e-Títulos de voluntários (ler o QR, alterar um campo, testar o validador sem internet); não depende do TSE. |
| H13 | Os eleitores liberados sem digital votaram majoritariamente no 13, sobretudo no Nordeste | não decidível com dados públicos | No Nordeste, as seções que liberaram mais gente sem digital não votaram mais no 13 do que as vizinhas. Em MG e no RS há um padrão que já existia em 2022. Como o voto é secreto, os dados públicos não dizem se é o jeito de votar desses eleitores ou outra coisa com o mesmo formato. Mesmo que todos esses votos tivessem sido trocados, o resultado não mudaria. | Ligar voto a pessoa (caderno de votação, imagens das digitais) para separar composição do eleitorado de inserção com o mesmo formato. |
| H14 | Urnas trocadas por urna reserva no 2º turno teriam sido manipuladas | **fato que pede explicação** | As seções com urna reserva votaram como as vizinhas. Há falhas de controle comprovadas: urna reserva aceita fora da zona para a qual foi preparada, e reservas cujo leitor não reconhecia os mesários. Não há sinal de manipulação. | Ata da mesa e registro de manutenção das reservas; programa adulterado e assinado não aparece nos arquivos. |
| H15 | Votos no lugar de ausentes, liberados em bloco pelo mesmo mesário, sem digital, no fim do dia | sem sinal nos dados públicos | O teste não achou votos em bloco no lugar de ausentes, mas só enxerga blocos bem marcados. Um voto no lugar de ausente feito aos poucos não aparece nos arquivos. | O caderno de votação (não público): bloco pequeno, intercalado ou igual nos dois turnos não aparece no diário. |
| H16 | Voto sem eleitor liberado, ou eleitor liberado sem desfecho registrado no diário da urna | **refutada** | Todo voto registrado teve eleitor liberado antes, e todo eleitor liberado teve um fim registrado (votou ou saiu), nos dois turnos. | Programa adulterado que grava registros coerentes não aparece neste teste. |
| H17 | Votos suprimidos ou roubados na mesa: eleitor suspenso ou cancelado de propósito, ou "já votou" para quem estava presente | não decidível com dados públicos | Os registros mostram atendimentos interrompidos e alguns votos não gravados. Não permitem saber se alguém foi mandado embora de propósito sem deixar registro. | Caderno de votação. |
| H18 | Votos inseridos por igual num município inteiro, um ponto cego dos testes por seção | sem sinal nos dados públicos | Nenhuma cidade tem urnas parecidas demais entre si. Uma mudança igual num estado inteiro não seria vista por este teste. | Uma mudança igual num estado inteiro move junto a régua do próprio estado. |
| H19 | Falha de digital provocada de propósito nas seções escolhidas | **fato que pede explicação** | A falha da digital não puxou voto para nenhum lado. Mas algumas seções liberaram muitos eleitores sem ler dedo nenhum. Num caso, o mesmo mesário liberou 47 de 54 com o leitor funcionando, e isso pede explicação. | Quem pôs o dedo e a ata da mesa (se a falha foi provocada); diários de 2022 das outras 23 UFs (públicos, não baixados). |
| H20 | Relógio ou ordem dos eventos da urna adulterados | **fato que pede explicação** | Nenhuma urna gravou voto fora do horário ou fora de ordem. Uma urna estava com o relógio quase uma hora atrasado, o que atrasou a abertura da seção sem criar nem tirar voto. | Diário interno das urnas de 3 seções e atas. |
| H21 | Compra de voto conferida pelo registro dos votos: um número nulo raro usado como senha | sem sinal nos dados públicos | Nenhum voto nulo raro apareceu concentrado como senha de compra de voto. Um esquema com número comum ou diferente em cada seção não seria visto. | Esquema com número comum ou diferente em cada seção; verificação local dos números de deputado. |
| H22 | Exterior e urnas de fluxo especial com comparecimento ou ritmo fora do normal | sem sinal nos dados públicos | O voto no exterior não teve anomalia de processo. Todos os eleitores do exterior juntos ficam abaixo da diferença. | Atas das juntas do exterior; sem digital, voto no lugar de ausente feito aos poucos não se distingue de mobilização. |
| H23 | Urna carregada de novo, ou carregada fora da cerimônia oficial | **fato que pede explicação** | As urnas recarregadas votaram como as vizinhas. Mas 502 recargas do 1º turno ficaram sem motivo escrito e 55 tiveram a mídia refeita. Só a ata do cartório explica. | Atas das recargas. |
| H24 | Eleitores em trânsito e com atributos especiais (preso, militar, servidor da Justiça Eleitoral, deficiência visual) usados para inflar seções | sem sinal nos dados públicos | As contas pegariam eleitor inventado ou mudado de seção, desde que o cadastro publicado seja o verdadeiro. Todos os eleitores em trânsito juntos ficam abaixo da diferença. | Cadastro usado na carga (não público); presos, militares, servidores e deficiência visual por seção. |
| H25 | O certificado do cartório digital das urnas antigas (AC URNA) venceu antes da eleição; um sistema alterado poderia assinar com chave aceita, e a totalização não conferiria a validade | **fato que pede explicação** | O certificado das urnas antigas venceu antes da eleição e ainda assim assinou 54 urnas depois. Os votos dessas urnas não diferem dos das outras. Um programa alterado e assinado com essa chave não apareceria nos arquivos. | Guarda e uso da chave da AC URNA e se a totalização confere a validade (TSE); programa alterado e assinado com essa chave. |
| H26 | Zonas com virada para o 13 do 1º para o 2º turno muito acima do que o voto da própria zona no 1º turno explica, concentradas numa região, num modelo de urna ou num horário | sem sinal nos dados públicos | A virada para o 13 aconteceu em quase todas as zonas, sem zona fora da curva a favor dele. Uma troca de votos espalhada por igual no país teria a mesma aparência, e nenhum arquivo de resultado separa uma coisa da outra. | Nenhum arquivo de resultado separa mobilização de troca proporcional; isso depende da integridade da urna (H04, H25). |
| H27 | Pacote de seção trocado antes da totalização, assinado por outra urna com carteira válida (urna alterada, de reserva ou do Recuperador de Dados), e seções fantasmas | **fato que pede explicação** | Nenhum resultado foi trocado e não há seção fantasma. Algumas urnas que não estavam em nenhuma lista prévia pedem explicação, entre elas duas da BA. | Origem das urnas fora das listas prévias e regra da totalização para resultado sem registro da urna (TSE). |

Na fila, ainda sem número de hipótese: linha de base de eleições anteriores; concentração de votos em seções.
<!-- hipoteses:fim -->

## Números do 2º turno (Fatos)

- **499.248** seções com urna, **17.931** agregadas, **41** não instaladas (exterior), **29** apuradas pelo Sistema de Apuração (exterior).
- Todos os arquivos conferidos pelo hash do manifesto (`vota.vsc`) e pelo SHA-512 de cada arquivo. Um `log.jez` faltava no zip de SP e foi baixado por seção (confere com o `vota.vsc`).
- Seções "Recebida" no site de resultados (em vez de "Totalizada"), **parcial**: 5.270 até agora, em 10 UFs (faltam SP e TO no retrato do aux.json), com datas de 25 a 28/10. Nelas, os votos para presidente no BU são idênticos aos do resultado oficial (0 divergentes). Detalhes na [perícia 00](docs/pericia/00-coleta-completa.md).

## Relatórios

| Documento | O que é |
|---|---|
| [Relatório de perícia completo (PDF)](docs/relatorio/relatorio.pdf) | 295 páginas: resumo executivo com os principais achados, os tópicos 0 a 14, 22 gráficos, o glossário e o Anexo B com as 21 tabelas de dados dos gráficos, em linguagem simples. Gerado a partir de [docs/pericia/](docs/pericia/README.md) |
| [O certificado vencido da AC URNA (PDF)](docs/relatorio/temas/certificado-ac-urna.pdf) | Relatório temático da H25: abre com o pedido formal de esclarecimento ao TSE; traz a busca por carteiras de teste ou fora do padrão, as respostas às perguntas do auditor, o tamanho do risco, a conclusão e, embutidas no PDF, as planilhas das urnas ligadas à AC URNA nos dois turnos |
| [Hipóteses em teste (PDF)](docs/relatorios/hipoteses-em-teste.pdf) | Quadro de todas as hipóteses, com o que já se sabe e o próximo teste |
| [Pedido ao TSE pela Lei de Acesso à Informação](docs/pedidos/pedido-lai-tse-2026-10-30.md) | Pedido único de 30/10/2026: 45 itens em 10 temas (certificação e chaves, totalização, correspondências urna × seção, cargas, diário da urna, exterior, cadastro, sigilo do voto, mesa, liberação quando a digital não é reconhecida), com anexos das seções; nenhum dado pessoal |

Os PDFs da perícia são assinados digitalmente dentro do arquivo (PAdES) com o certificado da auditoria, "Auditoria independente das urnas — Eleições 2026". A assinatura aparece no painel de assinaturas do leitor de PDF; qualquer mudança depois da assinatura a invalida. O certificado é autoassinado: confira a impressão digital SHA-256 do certificado público, [docs/relatorio/certificado-assinatura.pem](docs/relatorio/certificado-assinatura.pem):

```
CF:FB:8B:52:0A:97:11:94:8D:5A:32:FF:4A:5A:4E:1D:F7:6F:A9:84:E2:26:9F:16:8C:DF:62:3C:28:F3:CB:E3
```

Para conferir pela linha de comando (pyHanko): `python -m pyhanko sign validate --pretty-print --trust docs/relatorio/certificado-assinatura.pem docs/relatorio/relatorio.pdf`.

## Como rodar

```
npm test                                          # suíte de testes
npm run relatorio                                 # relatório completo em HTML (docs/relatorio/)
npm run relatorio:pdf                             # o mesmo, em PDF assinado
npm run relatorio:temas                           # relatórios temáticos (docs/pericia/temas/) em PDF assinado
node src/coleta.js [--turno 1|2] [--uf ac,sp]     # coleta: índice, zips, extração, aux, conferência (--ajuda)
node src/referencia.js --turno 2                  # candidatos e municípios do TSE
node src/dadosabertos.js                          # dados abertos oficiais (CDN)
node src/exportar.js --uf ac --municipio 01007    # seção(ões) em JSON legível (--ajuda)
node src/banco.js --turno 2 --uf ac               # carga no SQLite (doc 09)
node src/lacres.js <dir>                          # verificação de assinaturas
node src/perfil-secoes.js --turno 2               # métricas por seção
```

Os dados ficam em `data/` (fora do git): `raw/<t>t/zip` (zips do TSE), `raw/<t>t/urnas/<uf>/<mun>/<zona>/<seção>/<hash>/` (arquivos extraídos), `raw/dadosabertos`, `parsed/` (JSON, perfis, comparações), `db/` (SQLite) e `manifest/` (logs, ocorrências, resumo e cobertura).

## Módulos

| Arquivo | Função |
|---|---|
| `src/coleta.js`, `etapas.js`, `http.js`, `zip.js`, `indice.js`, `registro.js` | Coleta com retomada, controle de taxa e conferência de 100% |
| `src/vsc.js`, `conferencia.js` | Integridade: hash do manifesto e SHA-512 de cada arquivo |
| `src/asn1.js`, `esquemas.js`, `exportar.js`, `referencia.js` | Decodificação pela especificação oficial e conversão para JSON |
| `src/lacres.js`, `ed521.js`, `evidencias.js` | Assinaturas da urna (Ed521/ECDSA) e cadeia de evidências |
| `src/perfil-secoes.js`, `analises.js`, `comparar-turnos.js`, `busca-identificador.js` | Métricas e análises do checklist (doc 07) |
| `src/banco.js` | Banco SQLite (doc 09) |
| `src/dadosabertos.js` | Dados abertos do TSE |
| `src/modelos.js` | Revisores auxiliares (doc 08) |
| `scripts/auditoria/` | Scripts de cada frente e de cada gráfico da perícia |
| `scripts/relatorio/gerar.mjs`, `markdown.mjs` | Relatório em HTML e PDF assinado; bloqueia referência ao processo e link para fora do relatório |

## Próximos passos

1. Protocolar no TSE o [pedido pela Lei de Acesso à Informação](docs/pedidos/pedido-lai-tse-2026-10-30.md) (45 itens), depois de preencher nome, CPF e local, e acompanhar o prazo de resposta.
2. Baixar e ler os diários de urna de 2022 do PR, de SC e do RS, para o teste do sinal V2 no Sul (H13), como já foi feito em MG.
3. Conferir no local as seções listadas no pedido (atas, cadernos de votação e manutenção das urnas).
4. Responder ao que o TSE mandar: refazer os testes que dependem da resposta e atualizar a perícia e este quadro.

O histórico das entregas está no [CHANGELOG](CHANGELOG.md).

## Como contribuir ou contestar

Encontrou um erro de conta, de método ou de leitura? Abra uma *issue* com o número, o arquivo e o comando que o reproduz. Toda afirmação deste repositório deve poder ser refeita a partir dos arquivos públicos do TSE com os scripts daqui; o que não puder ser refeito não vale como Fato.

O que **não** está no repositório: os arquivos brutos do TSE e o banco (são grandes; os scripts baixam e montam tudo, ver "Como rodar") e qualquer base com dado pessoal (CPF), que nunca sai da máquina do auditor.

## Licença

[MIT](LICENSE).
