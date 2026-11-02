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

Esta é a parte a de 3 (cada parte é uma consulta separada; responda só as hipóteses desta parte).

### H01: Votos dados com títulos de pessoas que já morreram

Status atual no registro: em teste.

O que já se sabia:
- O cadastro tem 297.977 eleitores de 100 anos ou mais com domicílio no Brasil. O Censo 2022 contou 149.424 pessoas de 96 anos ou mais e 53.568 de 95 anos, as gerações que podem ter 100+ em 2026: o cadastro tem mais eleitores de 100+ do que o Censo contou de pessoas que poderiam ter essa idade. O tamanho do excedente é Pendente (depende da data em que o TSE calcula a idade e da cobertura do Censo).
- 92,0% dos eleitores de 100+ não têm digital cadastrada: a urna os libera só com o número do título e o ano de nascimento.
- No 1º turno, compareceram 2.141 dos 298.239 aptos de 100 anos ou mais (0,72%), pela contagem oficial do TSE; nos 1.068 municípios com mais títulos de 100+ do que moradores de 96+, 0,26%. Não houve uso sistemático desses títulos no 1º turno.
- O estoque de títulos de 100+ não é de 2026: os aptos de 100 anos ou mais eram 39.026 em 2018, 184.330 em 2022 e 297.977 em 2026, e os votantes dessa idade no 1º turno foram 1.506, 1.675 e 2.141 (3,9%, 0,91% e 0,72% dos aptos). O cadastro cresceu; quem vota nessa idade, quase nada.
- No 1º turno, os votantes de 85 a 99 anos passaram de 267.098 (2022) para 460.338 (2026), com os aptos dessas idades parecidos ou em queda. O aumento começa aos 70 anos (de 70 a 74, de 3.586.278 para 4.785.687 votantes) e já vinha de 2018 para 2022 (de 70 a 74 anos, de 55,3% para 61,1% de comparecimento); não aparece em 100+, fica abaixo da população do Censo da mesma geração em todos os 5.570 municípios e é menor nos estados onde está a maioria dos títulos sem digital.
- Somando zona por zona, pelo menos 12.004 votos de eleitores de 80 a 89 anos, 970 de 90 a 99 e 157 de 100+ vieram de títulos sem digital cadastrada no 1º turno. Os arquivos públicos não dizem se são de idosos vivos sem digital ou de alguém usando o título de outra pessoa.
- O salto dos aptos de 100+ de 2018 para 2022 não é mudança na forma de contar: a mesma geração passa de faixa em faixa (95 a 99 anos em 2018, 100+ em 2022) e, a cada quatro anos, ganha mais de 100 mil títulos e menos de 500 votantes. É falha de limpeza do cadastro, não prova de voto. Conferido por uma segunda verificação independente.
- Campinápolis (MT): 224 eleitores de 100+, dos quais 32 votaram no 1º turno (14,3%). Os diários das 108 urnas do município e dos vizinhos da zona conferem com o boletim, sem liberação em massa. O Censo 2022 contou no máximo 79 pessoas que podem ter 100+ em 2026; o exagero de idade de idosos indígenas explica o Censo alto, mas não a diferença para o cadastro (Hipótese). Em 100+ o município não destoa do Brasil nem de MT; em 90 a 94 anos, destoa (2,8 títulos por morador do Censo, contra 1,27).

O que ainda faltava (lembrando que não se vai esperar o TSE):
- 2º turno: o TSE não publica o comparecimento por idade (pedido ao TSE). Os testes indiretos não enxergam uso pequeno nem concentrado em poucas seções.
- Votantes de 80 anos ou mais por forma de liberação na urna, em 2022 e 2026 (pedido ao TSE): o caminho do título com digital liberado à mão pelo mesário não foi testado.
- Cancelamentos de título por óbito, por município, e títulos cancelados por óbito com voto em 2026; data em que o TSE calcula a idade no cadastro (pedidos ao TSE).
- A causa da subida dos votantes idosos em 2026 (Hipótese: mobilização, transporte, geração).
- Campinápolis (MT): títulos de 100+ com nascimento em 1º de janeiro, seções onde votaram os 12 sem digital e títulos com óbito em cartório (pedido ao TSE); ata da seção 0094 da zona 26 no 2º turno, com 12 recusas de "já votou" (pedido ao TRE-MT).

Explicações alternativas registradas: Óbito depois do fechamento do cadastro; atraso dos cartórios em comunicar óbitos; pessoa viva que mora em outro lugar; Censo que deixou de contar idosos.

### H02: Seções com quantidade fora do normal de eleitores liberados sem digital

Status atual no registro: aberta.

O que já se sabia:
- Em 16.011 das 497.508 seções do 2º turno em que a comparação é possível, o boletim registra mais liberados "sem biometria" do que o cadastro permite: 36.340 eleitores a mais, 0,03% dos votos. Em nenhuma seção votou mais gente do que os aptos.
- Nas 378 seções com excesso de 10 ou mais, 84,8% desses atendimentos mostram a foto do eleitor na tela, sem pedido de digital. Sem eles, o excesso cai de 5.560 para 54: o arquivo da urna tinha a foto e não a digital.

Novo nesta rodada de fechamento:
- Fechamento (plano pré-registrado, doc 30) e revisão independente (parecer 57), no universo dos dois turnos.
- No 2º turno, 16.011 seções têm mais eleitores liberados sem digital do que o cadastro de biometria explica (36.340 eleitores). A foto do eleitor sem digital no arquivo da urna explica 98,64% desse excesso (97,45% numa leitura mais rigorosa). Sobram 493 eleitores em 423 seções, com forma de propriedade do arquivo. No 1º turno o quadro é igual (98,66%).
- Em 159 seções a liberação à mão pelo mesário ficou fora do normal da zona no 2º turno. Das 46 sem explicação técnica, 18 tiveram a urna trocada no próprio dia, 28 já eram altas no 1º turno e 5 tiveram o leitor parado parte do dia. Sobram cerca de 4 seções novas e sem rastro técnico (cerca de 300 liberações).
- Em 3 seções (2 no AM, 1 no PR) o comparecimento também subiu fora do padrão. Numa do AM, 19 dos 21 eleitores a mais vieram por liberação à mão.
- Todo o excesso somado (36.340 + 4.709) é menos de 1% da margem.

O que os dados públicos não alcançam: Caderno de votação e ata das poucas seções que sobram.

Explicações alternativas registradas: Eleitor com foto e sem digital no arquivo da urna; sem biometria cadastrada; leitor com defeito; perfil de idade da seção.

### H03: A soma das urnas é diferente do resultado oficial

Status atual no registro: em teste.

O que já se sabia:
- 2º turno, Presidente e Governador: os seis números de cada seção (aptos, comparecimento, nominais, brancos, nulos e legenda) são iguais ao oficial nas 499.207 seções de Presidente e nas 39.739 de Governador (538.946 combinações, 0 diferença). Presidente igual candidato a candidato nas 499.205 seções com voto; Governador igual por zona (1.026 pares), município (938) e estado (12), nos 6 estados com 2º turno para governador (AC, AM, DF, ES, RN e TO); os 7 totais da noite da eleição iguais à soma dos boletins. Nenhum voto somado, tirado ou trocado.
- 2º turno conferido por dois caminhos: a leitura dos boletins é igual ao texto do boletim impresso pela urna em todas as 499.207 seções e nos 538.946 pares de seção e cargo. Três números de boletins alterados de propósito, só na memória do computador, foram acusados exatamente pela comparação.
- 1º turno, todos os cargos (28 UFs, 499.207 seções com boletim): 0 divergência seção a seção em aptos, comparecimento, nominais, brancos, nulos e legenda; Presidente igual candidato a candidato em 499.206 seções; os 109 totais por estado e cargo fecham. As contas internas do boletim (C3 a C6) fecham em 2.490.805 combinações de seção e cargo, 0 falha.
- A única diferença é de classificação: 250 números de candidato e 4 legendas (630.541 votos) contados como nulo técnico, que fecham voto a voto. No governo do RJ, os 274.411 votos do nº 10 nesse grupo são mais que os 147.771 que tirariam a maioria do eleito no 1º turno.
- Votos do boletim sem a linha "voto computado" no diário: 54 em 6 seções no 2º turno e 159 em 9 no 1º. Sem nenhuma linha, 49 e 152, em 5 seções com urna reserva, em que outra urna gravou o próprio diário por cima. Os boletins dessas seções estão assinados e as assinaturas conferem.
- Risco (princípio 8): nas seções apuradas em cédula, os votos não têm registro eletrônico de quem foi liberado: 789 votos em 29 seções do exterior e 40 em 2 seções de MG, no 1º turno.
- Contraprovas feitas e conferidas por uma segunda verificação independente: no 2º turno, seis números alterados de propósito foram acusados só nos níveis certos (zona, município, estado e total da noite); nos dois turnos, 16 alterações no boletim, no registro dos votos e no diário foram acusadas na seção e na conta certas, e nada fora delas.

Novo nesta rodada de fechamento:
- Contraprova independente das contas internas do boletim no 2º turno (parecer 52): leitor próprio do boletim, escrito do zero, mais o banco e o boletim impresso, todos iguais em 100% das 499.207 seções. Zero violação na soma dos votos × comparecimento (539.817 seção × cargo, incluindo as consultas), nos aptos × trânsito, nas formas de liberação, no comparecimento entre eleições e em comparecimento ≤ aptos.
- Contraprova com boletins alterados de propósito: as 9 alterações foram acusadas exatamente onde deviam.
- Com isso, todas as contas e contraprovas da H03 dos dois turnos estão feitas. O que resta é o nº 10 no RJ (classificação de 630.541 votos como nulo técnico, já fato) e as consultas populares, que não têm resultado oficial para comparar.

O que os dados públicos não alcançam: Nenhum para a soma. A coerência interna não prova que a urna gravou o que o eleitor digitou (integridade do programa, H04, H25).

Explicações alternativas registradas: Seções não totalizadas; urna de contingência cujo diário não veio no pacote; Sistema de Apuração; candidatura excluída (nulo técnico).

### H04: Arquivos publicados alterados, ou gerados fora de uma urna oficial

Status atual no registro: em teste.

O que já se sabia:
- 2º turno: assinaturas dos 499.207 pacotes conferidas, 0 falha; todos assinados por urna com carteira digital de uma das três autoridades do TSE. Um único bit alterado de propósito é rejeitado nos cinco tipos de pacote.
- 1º turno: assinaturas dos 499.207 pacotes conferidas, 0 falha de arquivo. Os 37.440 certificados de urnas de 2013 e 2015 com bytes zero a mais passam quando cortados no lugar certo. Único caso fora do padrão: um boletim impresso de MG publicado fora da lista lacrada.
- Impressões digitais refeitas em 1.996.828 arquivos por turno, nas 499.207 seções, com 0 falhas.
- As urnas do 2º turno registram uma só versão de programa (10.23.0.0). Em 162 seções, a urna anotou ao ligar que a conferência de um arquivo do próprio sistema falhou; em nenhuma delas recebeu voto sem desligar e ligar de novo.

Novo nesta rodada de fechamento:
- Fechamento (doc 13 do engenheiro) e revisão (parecer 56). A medida independente do revisor liga cada voto à última inicialização da urna: 0 voto sem verificação completa do programa (33 etapas ou mais, todas com sucesso) em 125.275.244 votos do 1º turno e 128.235.724 do 2º.
- 72 inicializações fogem da sequência mais comum, e todas tiveram troca da mídia de votação no dia (conferidas no diário).
- Nenhum arquivo publicado foi alterado depois de sair da urna (assinaturas e hashes, já fato).

O que os dados públicos não alcançam: Programa adulterado e assinado com a chave oficial não aparece nos arquivos: faltaria conferir o hash dos binários lacrados contra o código-fonte e o resultado do Teste de Integridade.

Explicações alternativas registradas: Limite que não muda: um dos lacres usa um método secreto do governo (CEPESC), e o programa da urna por dentro só é conferido pelo Teste de Integridade e pela inspeção do código. Um programa alterado e assinado com a chave oficial passaria neste teste.

### H05: Mesários liberando outras pessoas no lugar de eleitores da seção, sem digital

Status atual no registro: aberta.

O que já se sabia:
- No 2º turno, a urna deu o aviso "já votou" 113.979 vezes, em 73.246 das 499.178 seções com diário de votação.
- Das 8.632.431 liberações à mão do 2º turno, 2.791.394 ficaram no diário sem nenhum mesário ligado a elas. No exterior, todos os 380.612 votantes foram liberados pelo ano de nascimento, sem digital.
- Do 1º para o 2º turno, o comparecimento subiu 2.920.461 eleitores nas mesmas seções (Brasil sem o exterior). Desse aumento, 601.543 (20,6%) entraram sem digital.
- No teste escolhido antes de rodar (27 UFs, dentro de cada município), o Brasil não passa do limite e só SP passa, a favor do 22. Mas o resultado muda de lado conforme a característica da seção levada em conta (idade: a favor do 13; escolaridade: a favor do 22): o teste não decide.
- Nas 639 seções com comparecimento de 95% ou mais, a liberação depois de digital que falhou é igual à da própria zona (7,58% contra 7,77%).
- 97 seções liberaram à mão metade ou mais dos votantes, todas com urnas de 2013 ou 2015.

Novo nesta rodada de fechamento:
- Fechamento (plano pré-registrado, doc 30) e revisão (parecer 57).
- Poder simulado: uma inserção concentrada é vista a partir de 33.993 a 54.650 votos em 1% das seções, 94 a 124 mil em 5%, 199 mil em 20%, 74.619 nos redutos do 13 e 500 mil em zonas inteiras. Nenhuma aparece.
- Ponto cego (revisor): 1 voto a mais em metade das seções (248.805) ou 3 votos em todas (1.492.692) passam sem sinal; uma inserção espalhada por igual não é vista nem com 4,43 milhões.
- O sinal de SP (a favor do 22) some quando se comparam seções do mesmo local de votação. O sinal do PR (a favor do 13) é novo em 2026 (z 3,07) e resistiu a seis leituras benignas testadas com dado público.
- As 97 seções de liberação em massa, lidas no diário: 47 com padrão de leitor ruim, 12 seletivas sem desvio de voto ou de comparecimento, 36 indeterminadas.

O que os dados públicos não alcançam: Via de habilitação por eleitor e caderno de votação; inspeção física das urnas e dos leitores.

Explicações alternativas registradas: Mesário redigitando o título de quem acabou de votar; eleitor que voltou; fila de idosos; leitor com defeito; perfil da seção. Pelo princípio 8, nenhuma delas conta como controle.

### H06: A prorrogação do horário de votação favoreceu um lado; na apuração, os boletins foram liberados de forma controlada

Status atual no registro: em teste.

O que já se sabia:
- No 2º turno, 34.315 votos foram dados depois das 17h de Brasília (0,027% dos votos), em 29.853 seções, já com a correção das urnas com relógio 1 hora fora da hora certa (H20); 1.993 depois das 18h e 11 depois das 19h. 6.352 seções encerraram às 19h ou depois.
- Mesmo que todos fossem de um lado só, seriam menos de 1% da diferença final entre os candidatos.
- A decisão do STF (minuta publicada pela imprensa) mandava prorrogar até as 19h "em todas as seções de todo o Brasil".
- Apuração: às 19h, 98,64% dos boletins do Brasil já tinham sido emitidos pelas urnas, e o TSE tinha registrado 0,38% das seções. De 17:10 a 19:03:37 o TSE não registrou nenhum boletim com voto; depois registrou em lotes, com vazão limitada, até 21:09. Registrado, cada boletim entrou na totalização em 24 segundos (mediana). A ordem não muda o total, que é a soma dos boletins.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Versão assinada da decisão e ofício do TSE que a cumpriu.
- Onde os boletins esperaram entre 17:10 e 19:03 e se a ordem de registro dependeu do voto das seções (depende de registros que o TSE não publicou; pedido ao TSE).
- Comparação, na mesma zona, entre a quantidade de voto tardio e a parcela do 13.
- Votos depois da declaração de "todos votaram": contagem final.

Explicações alternativas registradas: Fila legítima (não conta como controle pelo princípio 8); fuso horário; registro em lotes por limite de vazão do sistema do TSE.

### H07: Urnas antigas colocadas de propósito onde se quer dispensar a digital

Status atual no registro: refutada.

O que já se sabia:
- Todo modelo de urna usado no Brasil lê digital: as urnas de 2013 liberaram 82,2% dos eleitores pela digital. A premissa da hipótese é falsa.
- Nas urnas antigas a digital falha mais e a mesa libera mais à mão (+4,3 pontos na urna de 2013 e +3,2 na de 2015, na mesma zona). A liberação por ano de nascimento quase não muda com o modelo. Isso alarga a brecha humana.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Por que as urnas antigas estão onde estão (logística ou escolha).

Explicações alternativas registradas: Logística do parque de urnas; cobertura biométrica do cadastro.

### H08: Votos em sequência rápida demais para uma pessoa

Status atual no registro: aberta.

O que já se sabia:
- Nenhum eleitor abaixo do limite físico de digitação, nos dois turnos: nos diários de todas as urnas (127.734.569 intervalos entre dois votos seguidos da mesma urna no 2º turno e 124.772.753 no 1º), nenhum intervalo teve 15 segundos ou menos.
- Menores intervalos: 16 segundos no 2º turno com 1 cargo e 22 com 2; no 1º turno, 19 segundos com só presidente (eleitores do exterior) e 31 com os 6 cargos. As 3 seções que a primeira leitura tinha lido errado têm 25, 36 e 29 segundos, com o número de votos do diário igual ao do boletim.
- Os ciclos mais rápidos do 2º turno são de eleitores liberados pela própria digital (100.032) ou pelo ano de nascimento (2.469); nenhum foi liberado à mão pela mesa. No 1º turno, 113.481 e 2.252, nenhum à mão.
- Votos do boletim sem a linha "voto computado" no diário, fora do que este teste mede: 54 em 6 seções no 2º turno e 159 em 9 no 1º. Em nenhuma seção o diário tem mais votos que o boletim.

O que ainda faltava (lembrando que não se vai esperar o TSE):
- Limite: o teste não vê voto inserido no ritmo de um eleitor de verdade (H05 e H15) nem voto gravado por programa adulterado, que não passa pelo teclado (integridade dos arquivos, H04, e votos sem linha no diário, H03).
- Comparação com 2022 e 2024: os diários dessas eleições não entraram neste teste.

Explicações alternativas registradas: Resolução de 1 segundo do relógio; eleitor rápido; voto em branco.

### H09: Os arquivos públicos permitem descobrir em quem uma pessoa votou

Status atual no registro: aberta.

O que já se sabia:
- O registro dos votos não guarda a ordem de votação: 539.788 de 539.788 listas da urna no 2º turno e 2.490.766 de 2.490.766 no 1º estão em ordem de tipo e de número digitado.
- Exceção, em listas que não são geradas pela urna: 2 seções de MG com cédula no 1º turno, em que a ordem é a de digitação das cédulas (a cédula não tem nome, e o voto para Presidente não segue essa ordem).
- Nenhuma seção teve só 1 votante. 30 seções no 2º turno e 17 no 1º votaram todas no mesmo candidato a Presidente.
- Achado: quando o mesário suspende um eleitor que demora na cabine, o diário público grava o número digitado. No 1º turno, 55.483 dessas linhas trazem 31.764 números com formato de título que não são de nenhum mesário, presidente ou servidor registrado; no 2º turno, 5.564 linhas e 3.801 números.
- A urna gera sete arquivos que não estão publicados (entre eles, as imagens de digitais).

Novo nesta rodada de fechamento:
- Fechamento (doc 13 do engenheiro) e revisão (parecer 56).
- (a) O título não aparece em nenhuma forma codificada (cerca de 50 formas por número) no boletim, no registro dos votos, nas listas lacradas nem no diário: 0 achado acima do acaso, com controles positivos de 100%.
- (b) Pela estrutura do diário, o número gravado quando a mesa interrompe a votação de um eleitor (suspensão) é o título de quem está na cabine. Leituras alternativas (eleitor anterior, seguinte, digitação errada, outra seção) foram refutadas.
- O diário público traz, para 20.062 pessoas no 1º turno e 1.866 no 2º: o número do título, a presença, a hora ao segundo, a forma de liberação e o desfecho (votou, teve voto nulo dado pela urna, saiu sem votar).
- O registro dos votos não guarda a ordem de votação, então o voto não fica ligado ao título. Exceção: 1 caso no 1º turno, numa seção do AM em que todos votaram no mesmo candidato a Presidente.

O que os dados públicos não alcançam: Regra exata da urna para a suspensão (especificação do TSE).

Explicações alternativas registradas: O número pode ser de outra pessoa sem papel registrado na urna (por exemplo, o presidente da mesa), e não do eleitor.
