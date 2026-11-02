# T25: veredito final de cada hipótese, só com dados públicos (consenso entre revisores)

Contexto: a auditoria é independente e examina os arquivos públicos das eleições brasileiras de 2026: boletim de urna, registro digital do voto, diário da urna e assinaturas, em todas as 499.248 seções dos dois turnos, além dos dados abertos do TSE e do IBGE. No 2º turno de Presidente, o 13 venceu por 4.430.191 votos. O dono da auditoria decidiu **não esperar resposta do TSE**: o pedido pela Lei de Acesso à Informação continua como anexo, mas o relatório fecha agora. Cada hipótese recebe um veredito final com o que os dados públicos permitem concluir. A decisão vai ao consenso dos revisores (Astra, Grok, Kimi e Claude). Vence a maioria dos quatro votos. Em empate, fica a opção mais conservadora com a regra do relatório.

**Regras do relatório (literais):**
- Só entra número 100% correto: universo completo (todas as seções, todas as UFs), conferido nos arquivos oficiais, com script que o reproduz.
- Fica fora: estimativa estatística, amostra, "cerca de", número de terceiros não conferido e conta feita sobre suposição.
- "Nunca confiar em pessoas": procedimento feito por gente (mesário, cartório, fiscal) não conta como controle nem como explicação benigna. Só conta controle técnico que deixa rastro nos arquivos.
- Fato é o que os arquivos mostram e um script reproduz. Hipótese é explicação ainda não provada.

## Vereditos possíveis (escolha um por hipótese)

- **R (refutada):** os dados públicos mostram que o mecanismo, como foi descrito, não ocorreu na escala alegada.
- **S (sem sinal nos dados públicos):** testada no universo completo, sem sinal. Os pontos cegos estão declarados. Não é prova de que não houve nada.
- **F (fato que pede explicação):** há irregularidade técnica, falha de controle ou anomalia comprovada nos arquivos, sem prova de fraude nem de efeito no resultado.
- **C (confirmada):** fraude comprovada pelos arquivos.
- **N (não decidível com dados públicos):** o teste que decidiria exige dado que não é público ou exame físico. Diga qual.

E, para cada hipótese, o campo **resultado**:
- **"nao"**: a evidência limita o efeito máximo abaixo da margem de 4.430.191 votos;
- **"nao_excluido"**: os dados públicos não limitam o efeito abaixo da margem;
- **"sim"**: a evidência mostra efeito capaz de mudar o vencedor.

## Formato da resposta

Somente JSON, um objeto por hipótese desta parte:

```json
[{"id":"H01","veredito":"R|S|F|C|N","resultado":"nao|nao_excluido|sim","frase_final":"uma frase em linguagem simples, para leigo, que vai ao relatório","justificativa":"até 3 frases","discordo_do_status_atual":"sim|nao"}]
```

Considere o risco de exagero nos dois sentidos: acusar sem base, ou absolver sem base. Não invente número. Use só os que estão abaixo.

## Evidência por hipótese

Esta é a parte c de 3 (cada parte é uma consulta separada; responda só as hipóteses desta parte).

### H14: Urnas trocadas por urna reserva no 2º turno teriam sido manipuladas

Status atual no registro: em teste.

O que já se sabia:
- No 2º turno, 5.714 seções votaram com urna reserva: 2.818 trocas novas, 2.893 com a mesma reserva do 1º turno e 3 com a própria urna recarregada como reserva.
- Nas trocas novas, o teste não encontrou diferença entre a mudança dos votos do 1º para o 2º turno (comparecimento, parcela do 13, brancos e nulos) e a das seções sem troca da mesma zona, nem por UF, modelo de urna, zona ou seção, depois da correção para muitos testes.
- Nas reservas usadas nos dois turnos, comparadas com as outras seções do mesmo local, o teste não encontrou diferença na parcela do 13 nem no comparecimento do 2º turno; no 1º turno, encontrou comparecimento menor nas reservas.
- Mesmo que todos os 742.671 votos do 13 nas seções com reserva fossem do 22, o 13 ainda venceria por 2.944.849.
- No diário das reservas não aparece nenhum dos sinais que uma adulteração sem a assinatura do TSE, ou uma verificação pulada, deixaria.
- Em 1.423 das trocas feitas no dia do 2º turno, a urna usada antes da reserva já tinha recebido 155.663 votos, registrados no diário dela.
- Lacuna de controle: em 125 trocas novas a reserva tinha sido carregada para outra zona do mesmo estado. A urna aceitou e registrou a zona da carga: falta bloqueio, não rastro.

Novo nesta rodada de fechamento:
- Fechamento (plano pré-registrado, doc 32) e revisão (parecer 58).
- Nas 5.714 seções com urna reserva no 2º turno, os votos se comportaram como nas seções vizinhas. O teste veria um desvio a partir de cerca de 870 votos nas trocas novas e de cerca de 2.000 nas reservas herdadas do 1º turno (desvio igual nos dois turnos).
- O comparecimento menor das reservas no 1º turno é explicado pela interrupção da votação no dia da troca: quanto mais tempo a seção ficou parada, maior o déficit (de −0,46 ponto com menos de 15 minutos a −1,94 com uma hora ou mais); 7.747 eleitores.
- As 14 reservas que liberaram quase todos sem digital: o leitor lia os dedos, mas a comparação com os mesários registrados na urna original deu escore exatamente 0 em todas as tentativas, desenho de falha técnica (provável incompatibilidade de moldes entre modelos de urna, Hipótese).
- Pela contagem, a H14 não pode mudar o vencedor: mesmo com todos os votos dessas seções para o 22, o 13 venceria.

O que os dados públicos não alcançam: Ata da mesa e registro de manutenção das reservas; programa adulterado e assinado não aparece nos arquivos.

Explicações alternativas registradas: As urnas antigas, as mais trocadas, ficam em lugares de perfil diferente; troca planejada por manutenção; variação normal entre turnos. O teste não enxerga programa adulterado e assinado com a chave oficial, nem o mesmo desvio nos dois turnos numa zona inteira.

### H19: Falha de digital provocada de propósito nas seções escolhidas

Status atual no registro: em teste.

O que já se sabia:
- A urna exigiu as quatro tentativas de digital antes da liberação à mão: só 3 exceções em 16.974.711 liberações à mão dos dois turnos.
- Mas a tentativa pode terminar sem dedo: 172.318 liberações no 1º turno e 212.171 no 2º (2,07% e 2,46% das liberações à mão) foram feitas sem nenhum dedo lido. E o dedo que autoriza pode ser de qualquer pessoa: a urna só anota o mesário quando o dedo é de mesário cadastrado. É risco (princípio 8), não prova.
- A falha da digital ficou igual nos dois turnos: 7,07% e 7,16% dos eleitores a quem a urna pediu a digital. A subida das liberações sem dedo lido acompanhou a do tempo esgotado entre eleitores reconhecidos (de 0,61% para 0,73%): causa geral, não seções escolhidas.
- Onde a falha mudou muito entre os turnos, ela mais caiu do que subiu, e muitas seções tiveram a urna trocada. A mudança da falha não acompanhou a do voto em nenhum estado nem região; o único resultado fora do padrão (Sudeste) não se confirma medido na própria seção, e o comparecimento dessas seções não subiu.

Novo nesta rodada de fechamento:
- Fechamento (plano pré-registrado, doc 32) e revisão (parecer 58).
- Nas 26.933 seções sozinhas no prédio com aquele modelo de urna: 0 de 24 testes passa.
- Liberações sem nenhum dedo lido: 172.318 (1º turno) e 212.171 (2º). Onde a falha subiu, o voto não pendeu para nenhum lado além do acaso. Um sinal pequeno no Norte (cerca de 900 votos, sobretudo PA) vem sem o comparecimento a mais que um voto no lugar de ausente exigiria e sem aviso de "já votou".
- Linha de base de 2022 (MG, PR, SC, RS): nenhum teste de voto passa; onde a falha subiu mais que em 2022, o comparecimento caiu (sinal contrário ao de inserção).
- Fato por seção: 11 seções liberaram muitos eleitores sem nenhuma leitura de dedo. No caso mais forte (ES, 1º turno), 47 de 54 liberações sem dedo lido, todas pelo mesmo mesário, com o leitor funcionando para o dedo do mesário e sem reconhecer nenhum eleitor por 4 horas; o voto ficou na faixa do local.
- Só o total de liberações à mão (8.632.471) passa da margem; nas formas que os testes veem, o limite fica em dezenas de milhares de votos.

O que os dados públicos não alcançam: Quem pôs o dedo e a ata da mesa (se a falha foi provocada); diários de 2022 das outras 23 UFs (públicos, não baixados).

Explicações alternativas registradas: Leitor gasto; idade; trabalho manual; umidade; diferença de definição entre boletim e cadastro (H02).

### H21: Compra de voto conferida pelo registro dos votos: um número nulo raro usado como senha

Status atual no registro: em teste.

O que já se sabia:
- Cada número nulo digitado nos dois turnos foi contado: 39.348.069 no 1º turno e 3.180.131 no 2º.
- 2º turno: nenhum número nulo concentrado e raro. Mas no voto para Presidente e governador, de dois dígitos, todo número possível é de partido ou de candidato, ou fica a uma tecla de um deles: o teste não tinha como encontrar o esquema nesses cargos.
- 1º turno: 19 números de deputado ficaram concentrados, com 648 ocorrências no país. Hipótese: erro de digitação; quase todos ficam a uma ou duas teclas do número de um deputado muito votado na região.
- Em Goiatins (TO), 309 dos 575 votos nulos para Presidente do 2º turno foram 77 ou 20, os números dos dois candidatos da eleição suplementar para prefeito feita no mesmo dia.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Verificação local dos números de deputado que ficam sem a explicação de erro de digitação.
- Ponto cego: esquema com número comum, ou com um número diferente em cada seção (número com menos de 10 ocorrências no estado não é testado).

Explicações alternativas registradas: Erro de tecla; número de candidato local; campanha de voto nulo.

### H22: Exterior e urnas de fluxo especial com comparecimento ou ritmo fora do normal

Status atual no registro: em teste.

O que já se sabia:
- Nas 1.351 seções do exterior, nos dois turnos: nenhuma com mais votantes que aptos; nas 1.281 urnas, o boletim tem os mesmos votos que o diário; nenhum voto fora do horário; menor intervalo entre dois votos de 19 segundos no 1º turno e de 16 no 2º. As 29 seções em cédula são as mesmas nos dois turnos.
- O comparecimento subiu de 341.766 para 381.443 (11,6%), principalmente pela manhã. O relógio das urnas da Europa acompanhou o fim do horário de verão no dia do 2º turno, e por isso a comparação por hora vale.
- No exterior, todos os 380.612 votantes do 2º turno foram liberados pelo ano de nascimento, sem digital (H05).
- No 2º turno, os 29 resultados em cédula chegaram ao TSE 160 minutos ou mais depois do fechamento do posto. A hora não confere o conteúdo digitado.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Atas das juntas das 29 seções em cédula; hora de recebimento delas no 1º turno (pedido ao TSE).
- Regra que desliga a digital no exterior (pedido ao TSE).
- Ponto cego: sem digital, um voto no lugar de ausente, feito aos poucos e em muitos lugares, não se distingue de mobilização.

Explicações alternativas registradas: Perfil e mobilização próprios; poucos eleitores por país.

### H23: Urna carregada de novo, ou carregada fora da cerimônia oficial

Status atual no registro: em teste.

O que já se sabia:
- O código de carga do boletim está no diário da própria urna, no mesmo pacote, em 499.207 de 499.207 seções, nos dois turnos.
- Recargas: 2.674 no 1º turno e 1.770 novas no 2º, quase todas com motivo no diário. Num grupo pequeno de seções o motivo não aparece (sem contar uma linha de erro de rotina que aparece em quase todas as urnas); isso não é sinal de fraude por si.
- Uma segunda leitura de todos os pacotes achou as mesmas 2.674 e 1.770 recargas, nenhuma a mais, e a ordem das cargas confere em todas as urnas com duas ou mais cargas no mesmo pacote.
- Carga no dia da votação: 7 boletins no 1º turno, mais 3 reservas carregadas durante a votação de 04/10 e usadas só no 2º turno, e 5 boletins no 2º turno; em todos, a hora digitada e o relógio da urna coincidem.
- Nas seções com recarga, o teste não encontrou diferença na parcela de cada finalista em relação às vizinhas.

Novo nesta rodada de fechamento:
- Fechamento (doc 14 do matemático) e revisão (parecer 55).
- O comparecimento a mais nas seções com recarga entre os turnos é de +0,115 ponto (568 eleitores em 1.567 seções).
- 502 recargas sem motivo escrito no 1º turno, em 275 zonas; 55 delas tiveram mídia gerada de novo, 52 na zona 0094 do PA (dois lotes de mídia refeitos, primeira carga com versão superada).
- Nas seções com recarga, a parcela do 13 cresceu um pouco menos que na zona. Pior caso absurdo (todos os votos do 13 nessas seções como trocados): 150.470 votos, 3,4% da margem.

O que os dados públicos não alcançam: Atas das recargas.

Explicações alternativas registradas: Recarga legítima por defeito, registrada em ata (a ata é feita por pessoas e não conta como controle, princípio 8).

### H24: Eleitores em trânsito e com atributos especiais (preso, militar, servidor da Justiça Eleitoral, deficiência visual) usados para inflar seções

Status atual no registro: em teste.

O que já se sabia:
- Em todas as seções dos dois turnos, aptos = eleitores da seção + eleitores em trânsito; nenhuma seção com mais votantes que aptos, nem com mais eleitores de outro estado votando do que inscritos. Total de aptos igual nos dois turnos: 158.745.079.
- Compareceram 165.584 dos 182.612 eleitores de outro estado no 1º turno (90,68%) e 24.727 dos 26.740 no 2º (92,47%). O que as seções ganharam de eleitores próprios no 2º turno (11.039) é exatamente o que o trânsito perdeu.
- Nas seções com 10 ou mais eleitores em trânsito, a parte dos votos liberados sem digital ficou abaixo da das outras seções do mesmo local em 3.254 de 5.251 locais no 1º turno e em 3.150 de 5.113 no 2º: o contrário do que o uso do trânsito para pôr votos deixaria.

Novo nesta rodada de fechamento:
- Fechamento (doc 14 do matemático) e revisão (parecer 55), com contraprovas independentes (boletins alterados de propósito, em memória).
- As contas acusam toda alteração do total de aptos; o lacre pega toda alteração feita depois da urna.
- Não acusam: troca entre trânsito e aptos da seção com o mesmo total, a mesma alteração nos dois turnos (só uma das contas acusa), votos apagados dentro da urna, voto trocado e voto no lugar de quem faltou (até 100% dos aptos).
- Todo o trânsito do 2º turno: 584.117 aptos, abaixo da margem.

O que os dados públicos não alcançam: Cadastro usado na carga (não público); presos, militares, servidores e deficiência visual por seção.

Explicações alternativas registradas: Voto em trânsito legal; seções especiais (presídio, quartel); instituições.

### H25: O certificado do cartório digital das urnas antigas (AC URNA) venceu antes da eleição; um sistema alterado poderia assinar com chave aceita, e a totalização não conferiria a validade

Status atual no registro: em teste.

O que já se sabia:
- O certificado público da AC URNA vale de 22/07/2011 a 18/07/2026: venceu antes dos dois turnos. As carteiras das próprias urnas estavam dentro da validade.
- A chave da AC URNA carimbou 54 carteiras de urna com início de validade entre 20/07 e 19/10/2026, todas apontando para o certificado vencido. Essas urnas votaram em 53 seções no 2º turno e em 45 no 1º; duas foram carimbadas entre os turnos.
- Nenhuma chave, número de série ou urna repetida entre as 503.525 carteiras de urna dos dois turnos. As assinaturas das urnas antigas conferem nos dois turnos.
- Com o certificado publicado, o verificador usual recusa as 99.957 seções do 2º turno com urna antiga. Os votos delas estão no resultado oficial: nas 99.955 com voto para Presidente, o boletim é igual ao oficial.
- Nas 53 seções com carteira tardia, o teste que compara a variação dos votos entre os turnos com a das vizinhas do mesmo local não encontrou diferença; os testes combinados antes também não encontraram diferença entre urnas antigas e novas. Não encontrar diferença não prova que os votos foram iguais.
- Tamanho do risco, não sinal de fraude: no 2º turno, 20,28% dos votos válidos passaram por essas urnas.
- Nenhuma das 503.525 carteiras de urna está fora do molde do seu cartório, inclusive as 54 tardias; seis urnas (duas da AC URNA e quatro da AC UE2020) foram certificadas entre os turnos e substituíram a urna do 1º turno. Limite: com a chave do cartório, copiando o molde publicado, sai uma carteira indistinguível.
- Sem os votos das seções com urna da AC URNA, o 13 venceria o 2º turno de Presidente por 3.316.317 votos: a recusa dessas urnas, sozinha, não mudaria o vencedor.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Resposta do TSE ao pedido pela LAI (itens 1 a 10): certificado da AC URNA aceito em 04/10 e 25/10; emissões da AC URNA em 2026; lista de revogação, política e raízes; guarda e uso da chave entre 18/07 e 25/10; AC de teste; se a totalização confere a assinatura, a validade e a lista de urnas esperadas.
- Se foram emitidas mais carteiras depois do vencimento: entre o primeiro e o último número de série tardio cabem 946 números (Hipótese).
- Uma das 2 urnas da BA, zona 71, fora de todas as listas prévias (H27), tem uma das carteiras carimbadas depois do vencimento: motivo da troca e da recertificação (pedido ao TSE).
- Programa alterado e assinado com a chave verdadeira: não testável nos arquivos públicos.

Explicações alternativas registradas: Cartório renovado com a mesma chave (não publicado e não conferível nos arquivos); urnas antigas em lugares de perfil político diferente; validade conferida pelo TSE com outra cadeia ou pela data da emissão da carteira.

### H26: Zonas com virada para o 13 do 1º para o 2º turno muito acima do que o voto da própria zona no 1º turno explica, concentradas numa região, num modelo de urna ou num horário

Status atual no registro: em teste.

O que já se sabia:
- Do 1º para o 2º turno, a diferença entre o 13 e o 22 nos votos nominais foi de −1,86 para +3,57 pontos percentuais, uma virada de 5,44 pontos. O 13 melhorou em 2.626 das 2.641 zonas; 128 zonas passaram do 22 para o 13 e nenhuma ao contrário. A virada é geral, não concentrada.
- Pelo método fixado antes de olhar, nenhuma zona ficou fora da curva do lado do 13 e 4 do lado do 22; com outras escolhas de método, de 0 a 9 do lado do 13. A lista muda com o método, o que mostra que nenhuma zona se destaca de forma estável. Conferido por uma segunda verificação independente.
- Limite: o teste não exclui inserção espalhada nem proporcional ao voto no 13; o voto do fim do dia tem associação pequena com mais virada para o 13, ainda sem explicação.

Novo nesta rodada de fechamento:
- Fechamento (plano pré-registrado, doc 06 do cientista político) e revisão (parecer 53).
- Pela régua fixada antes (margem do 13 sobre todos os votos nominais), a virada de 2026 foi mais uniforme entre as zonas do que as de 2018 e 2022: o 13 melhorou em 99,4% das zonas, contra 76,2% e 88,7%. Pela régua mais natural para comparar anos (margem só entre os dois finalistas), 2026 fica no padrão de 2022 (99,05% contra 98,10%).
- Zonas perto do corte, seção a seção: sem sinal do lado do 13. Do lado do 22: 20 seções extremas e 4 zonas concentradas (num colégio de SP, o prédio inteiro virou 17 pontos para o 22 e o comparecimento subiu 18,7%).
- Votos depois das 17h: 84% pela digital; sem sinal de processo.
- A forma observada (virada parecida em todo o país) é também a de uma troca de votos do 22 para o 13 proporcional ao voto do 22, que nenhuma conta sobre o resultado enxerga (ponto cego estrutural; bastariam 2,2 milhões para mudar o vencedor). O mesmo vale para conversão de brancos e nulos em votos do 13.
- Explicação política (Hipótese): mobilização nacional no 2º turno (maior alta de comparecimento e maior queda de brancos e nulos dos três anos).

O que os dados públicos não alcançam: Nenhum arquivo de resultado separa mobilização de troca proporcional; isso depende da integridade da urna (H04, H25).

Explicações alternativas registradas: Votos de eliminados com força regional; abstenção diferente entre os turnos; zona pequena; padrão de 2018 e 2022; prorrogação até as 19h e fuso (H06).

### H27: Pacote de seção trocado antes da totalização, assinado por outra urna com carteira válida (urna alterada, de reserva ou do Recuperador de Dados), e seções fantasmas

Status atual no registro: em teste.

O que já se sabia:
- 499.207 pacotes em cada turno, todos na lista final do TSE e vice-versa. Todo resultado foi assinado pela própria urna que ele declara, menos nas 17 recuperações de dados feitas em outra urna (14 no 1º turno e 3 no 2º; 4.090 votos), assinadas por uma reserva da lista prévia.
- 11 urnas do 2º turno não aparecem em nenhuma lista prévia dos dois turnos; todas são a própria urna do boletim, e nenhuma assinou mais de uma seção.
- Em 45 seções (17 no 1º turno e 28 no 2º), o registro da urna só chegou ao TSE no dia da votação; no 2º turno, em 25 das 28, junto com o resultado. As urnas foram preparadas antes do dia e abriram no início da votação, e os votos não destoam das vizinhas. O registro no dia acontece em toda eleição e em 2026 foi menos frequente: 194 seções no 1º turno de 2022, 82 em 2024, 26 no 1º turno de 2026 e 35 no 2º.
- Nenhuma seção fantasma: toda seção com resultado está no cadastro de locais e no resultado oficial, e nenhuma teve mais votantes do que eleitores.
- Seções novas: no 2º turno, 433 das 40.740 seções que não existiam em 2022 tiveram comparecimento de 95% ou mais, contra 206 das 458.438 antigas; com seções do mesmo tamanho e perfil, a diferença diminui, mas não some. As 56 novas com 98% ou mais, conferidas uma a uma, ficam em comunidades rurais, indígenas e quilombolas pequenas, com cadastro todo com digital; nada nos pacotes aponta troca.
- Nas 5 seções de SE com troca sem marca, a urna do 2º turno tem no diário um dia de votação de 04/10 que não virou resultado (Hipótese: Teste de Integridade do 1º turno).
- Seções novas seguidas no tempo: as 118 seções criadas em 2022 que tiveram 95% ou mais de comparecimento caíram de 96,1% para 89,3% em 2026, mais que as antigas na mesma faixa (95,8% para 92,2%); o comparecimento muito alto diminuiu muito em quatro anos, mas não sumiu nas seções em prédio novo. Em 2026 ele fica onde a seção nova junta um grupo novo de eleitores (prédio novo, cadastro todo com digital). Nessas seções, a liberação pelo mesário sem digital foi de 6,38% dos votantes, contra 9,24% nas antigas com 95%+: não há uso em massa desse caminho. Conferido por uma segunda verificação independente.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Origem das 2 urnas da BA, zona 71, que não constam de nenhuma lista prévia, e por que as urnas do 1º turno dessas seções foram trocadas (pedido ao TSE).
- Regra da totalização para resultado que chega sem registro da urna (pedido ao TSE).
- Lista de sorteio do Teste de Integridade, por TRE, a começar pelo TRE-SE (pedido ao TSE).
- Por que as seções novas reúnem eleitores que votam mais (Hipóteses: operação recente no cadastro; transferência irregular de domicílio, com eleitor vivo votando com a própria digital): alistamentos, transferências e revisões por seção, motivo de criação de cada seção e eleitores em trânsito por seção em 2022 (pedido ao TSE).
- Limite: não enxerga registro válido gerado por quem tem acesso à preparação ou à transmissão, nem programa adulterado e assinado com a chave oficial.

Explicações alternativas registradas: Computador do Sistema de Apuração no exterior (assina várias seções apuradas em cédula); Recuperador de Dados legítimo em urna com defeito; urnas de reserva (H14); seção nova por mudança de local.
