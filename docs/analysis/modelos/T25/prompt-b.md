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

Esta é a parte b de 3 (cada parte é uma consulta separada; responda só as hipóteses desta parte).

### H10: O vencedor cresceu do 1º para o 2º turno mais do que havia de votos disponíveis

Status atual no registro: refutada.

O que já se sabia:
- A conta fecha: o 13 ganhou 10.376.694 votos e o 22, 3.721.538. Os dois somam exatamente o disponível, 14.098.232 votos (eliminados 9.321.993, queda de brancos e nulos 1.816.000, aumento de comparecimento 2.960.239). Nenhum dos 5.757 municípios passa do limite.
- O 13 ficou com 73,6% do disponível; em 2018 o maior finalista ficou com 64,8% e em 2022 com 69,8%.
- Essa conta sempre fecha quando os votos somam o comparecimento. Por isso ela não prova ausência de fraude: uma troca de votos do 22 para o 13 só reduziria o ganho do 22, e a conta não limita o tamanho dela.

Novo nesta rodada de fechamento:
- Fechamento (doc 14 do matemático) e revisão (parecer 55).
- A hipótese diz que o vencedor cresceu mais do que havia de votos disponíveis. Com o disponível do próprio texto (eliminados, aumento do comparecimento e queda de brancos e nulos), o ganho do 13 cabe no disponível em 21 UFs; em 6 (AC, AP, RR, MA, AM, TO) passa por 52.336 votos no total, exatamente a perda líquida do 22 nessas UFs.
- Nessas 6, o ganho só fecha com eleitores que mudaram de lado entre os turnos ou com eleitores diferentes em cada turno; os arquivos não dizem qual (seria preciso a lista de quem votou em cada turno, dado pessoal).
- A queda de brancos e nulos está espalhada (metade da queda vem de 95.625 seções; maior queda numa seção, 42 votos), sem forma de inserção concentrada.
- Troca de voto dentro da urna não tem limite nos dados públicos (ponto cego geral, ligado à integridade do programa).

O que os dados públicos não alcançam: Lista de quem votou em cada turno (dado pessoal).

Explicações alternativas registradas: Votos dos eliminados, queda da abstenção e de brancos e nulos.

### H11: O mesmo cartão de memória usado em mais de uma urna, ou resultado trocado no caminho

Status atual no registro: em teste.

O que já se sabia:
- Nenhum cartão de votação, urna ou código de carga aparece no boletim de duas seções do mesmo município ou da mesma zona, nos dois turnos. Os cartões com o mesmo número (29 pares no 2º turno, 30 no 1º) estão todos em municípios diferentes, como o acaso prevê.
- Nenhuma urna escreveu no diário de duas seções ao mesmo tempo.
- O número de série da mídia de resultado não identifica o cartão (1.566 seções com o mesmo número para cartões gerados de uma vez), sem efeito no resultado, que é assinado pela urna.
- No 2º turno, 5.714 seções votaram com urna reserva (2.818 trocas novas). A urna de 2013 foi trocada entre os turnos em 34,9 de cada mil seções, e a de 2022 em 2,7. Em 5 seções a urna foi carregada na manhã da própria votação.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Motivo da troca de urnas entre as zonas 1 e 2 de Aracaju (pedido ao TRE-SE).
- Carga no dia da votação no 1º turno.
- Caminho até a totalização além das assinaturas: os registros de transmissão só são entregues a entidades fiscalizadoras.

Explicações alternativas registradas: A mídia de carga é usada em lote na preparação: uma mídia carrega várias urnas. Número de série gerado de um jeito pouco variado em alguns computadores de preparação.

### H12: O QR do título digital (e-Título) entrega os dados usados para liberar sem digital, e pode ser forjado

Status atual no registro: aberta.

O que já se sabia:


Novo nesta rodada de fechamento:
- Fechamento (doc 13 do engenheiro) e revisão (parecer 56).
- É fato, pelos catálogos de mensagens dos dois turnos, que a urna não lê nem registra o e-Título: o diário só anota título ou CPF digitado.
- O teto do mecanismo é o número de eleitores que votaram sem a própria digital no 2º turno: 15.884.298. É só o tamanho máximo, não indício.
- A conferência do documento é feita pela mesa (pessoa), o que pela regra do relatório não conta como controle.

O que os dados públicos não alcançam: Teste de laboratório com e-Títulos de voluntários (ler o QR, alterar um campo, testar o validador sem internet); não depende do TSE.

Explicações alternativas registradas: A regra de aceitar o e-Título só com foto e a conferência do documento são feitas por pessoas e não deixam rastro (princípio 8).

### H13: Os eleitores liberados sem digital votaram majoritariamente no 13, sobretudo no Nordeste

Status atual no registro: em teste.

O que já se sabia:
- No Nordeste, 4.269.379 votantes foram liberados sem digital (11,75% do comparecimento da região, menos que no Sudeste e no Sul).
- A aritmética permite que de 3,41% a 99,93% deles tenham votado no 13. Anulando esses votos no pior caso para o 13, ele ainda venceria no país por 166.144 votos.
- No Brasil inteiro, o pior caso aritmético dos 15.884.298 liberados sem digital inverteria o resultado. Isso mede o tamanho da porta, não prova uso.
- Pela liberação contada no diário: 5.841.108 eleitores foram liberados à mão por um mesário identificado no 2º turno (sem o exterior). No pior caso, a margem de 4.430.191 a favor do 13 iria a 1.401.371 a favor do 22; só com os 1.795.037 do Nordeste, o 13 ainda venceria por 2.636.659. Isso mede o tamanho da porta, não prova uso.
- No Nordeste, as seções que liberaram mais sem digital não votaram mais no 13 do que as do mesmo prédio, nem no 2º turno nem no ganho entre os turnos. A comparação não enxerga fraude que atinja só uma pequena parte desses eleitores. No Centro-Oeste, a ligação existe, mas já estava no 1º turno.
- Fora do Nordeste (Hipótese, em análise): no Sul e em MG, onde mais eleitores foram liberados pelo ano de nascimento no 2º turno, o 13 cresceu um pouco mais que nas vizinhas do mesmo prédio. Não há marca de inserção pela mesa (horário, sequência, concentração, diários das seções que mais pesam). Mesmo que todos os 452.147 votos a mais desse grupo fossem falsos e do 13, ele venceria por 3.978.044.
- Em MG, o mesmo padrão aparece em 2022, nos diários de urna de 2022 publicados: não é novidade de 2026. Em 2022 o grupo sem digital era outro (32,4% dos votantes do 2º turno de MG, contra 11,5% em 2026), e uma fraude que copiasse um padrão antigo também não seria vista.
- No Sul e no RS, o mesmo padrão também aparece em 2022, nos diários de urna publicados do PR, de SC e do RS (69.164 seções em cada turno, conferidas com o boletim): não é novidade de 2026. Se ele cresceu em 2026, ou se é o mesmo fenômeno nos dois anos, os dados não dizem. PR e SC, cada um sozinho, não têm padrão claro em 2026 para comparar. Conferido por uma segunda verificação independente.
- Só 1 seção do Brasil votou 100% sem digital, e não virou. O ganho do 13 entre os turnos teve o mesmo tamanho em todas as faixas de liberação sem digital (de 1,9 a 2,9 pontos).

Novo nesta rodada de fechamento:
- Fechamento (plano pré-registrado, docs 27 e 28, com adendo 1 também registrado antes) e revisões (parecer 54 e o adendo dele).
- Mesmo modelo nas 27 UFs, 192 testes com correção de Bonferroni. Nordeste: nenhuma UF, nem a média do Nordeste, nem os 12 testes de CE, PB e PE passam. O teste não descarta efeitos pequenos (de dezenas a centenas de milhares de votos, conforme a via).
- Fora do Nordeste, só dois sinais a favor do 13 passam: MG e RS, na liberação pelo ano de nascimento. Os dois já existiam em 2022, com o mesmo formato, nas mesmas UFs.
- Um sinal novo de MG (liberação à mão) vinha de erro de denominador (seções agregadas não somadas); corrigido, não passa.
- Mesmo que toda a liberação pelo ano de nascimento do 2º turno em MG e no RS (2.061.506 votos) fosse voto trocado, a margem mudaria em 4.123.012, menos que 4.430.191.
- Nenhum diário de urna sem votos (como o caso do RS em 2022) em 2026, nos dois turnos.
- A leitura literal (a maioria dos liberados votou no 13) não se decide em nenhuma UF, porque o voto é secreto.

O que os dados públicos não alcançam: Ligar voto a pessoa (caderno de votação, imagens das digitais) para separar composição do eleitorado de inserção com o mesmo formato.

Explicações alternativas registradas: O voto é secreto: só se cerca ou estima. Perfil da região (o Nordeste vota mais no 13 com ou sem digital); urna antiga; fraude igual nos dois turnos, que some na diferença.

### H15: Votos no lugar de ausentes, liberados em bloco pelo mesmo mesário, sem digital, no fim do dia

Status atual no registro: em teste.

O que já se sabia:
- A parcela de votos sem digital não sobe na última hora com voto de cada seção (12,64% contra 12,69% nas horas anteriores, 2º turno).
- Na liberação à mão, a urna aceita o dedo de qualquer pessoa para autorizar e aceita chegar a ela sem nenhum dedo lido (172.318 liberações no 1º turno e 212.171 no 2º; ver H19). É risco, não prova.
- Nenhum dos ciclos de voto mais rápidos do 2º turno foi de eleitor liberado à mão (H08).
- Caso para apuração de campo, conferido no boletim e no diário originais: SP 64017/0391/0164, com 20 liberações à mão seguidas do mesmo mesário, todas depois de 4 tentativas de digital, numa urna que já tinha liberado à mão 135 dos 239 votantes no 1º turno (Hipótese técnica: leitor de digital falhando por um período).

O que ainda faltava (lembrando que não se vai esperar o TSE):
- O teste de votos em bloco foi feito nos dois turnos, sem sinal, mas só enxerga votos seguidos, liberados pelo mesmo mesário registrado, em ritmo mais regular que o de uma pessoa. Falta refazê-lo com o ritmo de uma pessoa e com as vias de liberação em que a urna não anota mesário.
- Duas seções do 1º turno (AL e PR) em que a urna liberou sem digital quase todos os eleitores, todos com digital no cadastro: o diário aponta defeito do leitor; no PR, uma H15 pequena não está excluída. Ata e caderno de votação pedidos ao TSE.
- Conferência no local das seções com autorização em série por dedo sem dono e com muitas liberações sem nenhum dedo lido (pedido ao TSE, com a H19).
- Ata, caderno de votação e registro de manutenção do leitor da SP 64017/0391/0164 (fora do pedido de 30/10; a pedir).
- Bloco pequeno, intercalado com eleitores reais ou igual nos dois turnos: o teste não vê; fechar exige o caderno de votação.

Explicações alternativas registradas: Fila real no fim do dia; idoso cuja digital falha; mobilização real; leitor de digital falhando por um período. Pelo princípio 8, nenhuma delas conta como controle.

### H16: Voto sem eleitor liberado, ou eleitor liberado sem desfecho registrado no diário da urna

Status atual no registro: em teste.

O que já se sabia:
- Em todas as urnas dos dois turnos, todo eleitor liberado termina em voto gravado, desistência registrada ou parada da urna registrada: 128.244.427 = 128.235.189 + 7.860 + 1.378 no 2º turno e 125.322.998 = 125.274.326 + 42.951 + 5.721 no 1º. Nenhum voto gravado sem eleitor liberado.
- 1º turno: a lista de votos e o boletim são iguais em 2.490.805 comparações de seção e cargo (749.120.705 votos), e nenhum boletim inteiro é igual ao de outra seção (68.595.557 pares).
- Interrupções com erro ou falta de energia anotados: 481 de 1.378 no 2º turno e 1.008 de 5.721 no 1º. Em 21 atendimentos do 2º turno e 118 do 1º, o eleitor confirmou todos os cargos, a urna foi desligada pela chave e o voto não foi gravado nem contado: voto perdido, não voto a mais.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Se os eleitores dos 21 e 118 votos confirmados e não gravados voltaram e votaram (segue na H17).
- Conferir urna, preparação e cartão de votos dos 165 pares de seções com os mesmos votos num só cargo (4 de Presidente e 161 de Governador, 1º turno).
- Limite: um programa adulterado que grava registros coerentes não aparece neste teste.

Explicações alternativas registradas: Urna de contingência, reinício, diário incompleto, cartão trocado. Limite: um programa adulterado que grava sequências coerentes não aparece neste teste.

### H17: Votos suprimidos ou roubados na mesa: eleitor suspenso ou cancelado de propósito, ou "já votou" para quem estava presente

Status atual no registro: em teste.

O que já se sabia:
- Atendimentos perdidos (eleitor suspenso sem votar ou liberação cancelada): 805.368 de 139.310.955 no 2º turno e 1.206.250 de 136.390.914 no 1º. Os atendimentos sem desfecho anotado ficam fora dessa conta.
- Caso para apuração de campo: PR 78573/0083/0101. No 2º turno, 16 dos 26 votos sem digital foram seguidos de "já votou", e nenhum dos 270 votos pela digital; as 19 liberações à mão foram feitas por digitais que a urna não associou a mesário registrado.

Novo nesta rodada de fechamento:
- Fechamento (doc 14 do matemático) e revisão (parecer 55).
- 8.683.417 atendimentos sem desfecho no 2º turno: 5.774.186 título digitado errado, 2.321.187 justificativa de eleitor de outra seção, 586.672 identificador aceito, 1.372 eleitor habilitado.
- Teto de eleitores que podem ter ficado sem votar por algo registrado na mesa: de 47,7% a 83,5% da margem, conforme a leitura; só passa da margem quem conta todo título digitado errado (91,8% deles são redigitados em até 30 segundos).
- Votos confirmados e não gravados: 21 (2º turno) e 118 (1º); nenhum entrou no boletim; se o eleitor voltou não dá para saber.
- O eleitor mandado embora sem nenhum registro no diário não tem teto, salvo a abstenção (30.509.005).

O que os dados públicos não alcançam: Caderno de votação.

Explicações alternativas registradas: Desistência; urna travada; título digitado errado; consulta de quem ainda falta votar.

### H18: Votos inseridos por igual num município inteiro, um ponto cego dos testes por seção

Status atual no registro: em teste.

O que já se sabia:
- Nenhuma das 5.241 cidades em que dava para medir tem urnas parecidas demais entre si, o sinal de um resultado fixado. As cidades menores, sem 10 seções de 20 votos ou mais, ficaram fora dessa parte.
- 19 cidades pequenas (de 6 a 96 seções) mudaram do 1º para o 2º turno mais do que o esperado pelo próprio 1º turno: 4 para o lado do 13 e 15 para o lado do 22, somando 5.695 votos além do esperado (589 e 5.106). Hipótese: cidades de voto volátil; a maioria já tinha mudado bruscamente em 2018 ou 2022.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Verificação local das 19 cidades (os nomes não entram no relatório antes dela).
- Ponto cego: mudança pequena numa cidade, espalhada por muitas cidades ou igual num estado inteiro, porque a régua do próprio estado se move junto.

Explicações alternativas registradas: Máquina política municipal legal; conclusão tirada de médias que não vale para cada eleitor.

### H20: Relógio ou ordem dos eventos da urna adulterados

Status atual no registro: em teste.

O que já se sabia:
- Nos diários de todas as urnas dos dois turnos: 0 voto antes da zerésima ou da abertura, 0 depois do encerramento, 0 boletim antes do último voto. O relógio nunca voltou entre dois votos seguidos da mesma urna, e todo recuo do relógio tem causa escrita no diário.
- A urna recusa acerto de hora depois da zerésima e grava a recusa: 33 recusas em 20 urnas (23 em 14 no 1º turno e 10 em 6 no 2º), nenhum acerto feito. É controle técnico com rastro.
- Relógio 1 hora adiantado em seções do RJ, de GO e do PR e em 3 seções de Lisboa (2º turno, fim do horário de verão europeu); 1 hora atrasado no PR e 30 minutos em GO (1º turno). Nenhum voto antes das 8h reais. Com a correção, os votos depois das 17h de Brasília passam de 34.330 para 34.315 no 2º turno e de 3.723.360 para 3.723.325 no 1º.
- Só 4 boletins no 1º turno e 8 no 2º aparecem registrados pelo TSE antes de emitidos pela urna, todos por no máximo 2 minutos e meio (relógio da urna minutos à frente).

Novo nesta rodada de fechamento:
- Fechamento (doc 13 do engenheiro) e revisão (parecer 56).
- Fato novo: uma urna da BA estava com o relógio pelo menos 54 minutos atrasado (provado pela ordem de uso de uma mídia física, que só pode estar numa urna de cada vez). Isso atrasou a abertura da seção, mas muda no máximo 1 voto na conta de votos depois das 17h.
- Duas outras seções (SP e RS) com relógio suspeito ficam não decidíveis.
- Os votos sem linha no diário (159 no 1º turno, 54 no 2º) estão no boletim e no registro dos votos assinados, dentro do horário legal.

O que os dados públicos não alcançam: Diário interno das urnas de 3 seções e atas.

Explicações alternativas registradas: Erro de fuso (como em urnas de MT no 1º turno, com relógio em hora de Brasília); hora digitada errada na carga.
