# 01. Parecer: liberados "sem biometria cadastrada" acima do que o cadastro permite (B1a)

Achados revisados: `docs/analysis/biometria-mesarios/02-b1a-impossibilidade.md` (autor: tema biometria) e `docs/analysis/demografo/04-sem-biometria.md`, seção da anomalia (autor: `demografo`).
Revisão: lentes "definições" e "explicações alternativas" (revisores independentes) e esta consolidação. Data: 29/10/2026.

## Afirmação original

> Em 16.011 seções do 2º turno (8.624 no 1º turno, 15 UFs), o BU registra mais eleitores "compareceram sem biometria cadastrada" (`detalhamentoComparecimento.qtdEleitoresCompareceramSemBiometria`) do que o perfil do eleitorado do TSE (`perfil_eleitor_secao`, jul/2026: `QT_ELEITORES_PERFIL − QT_ELEITORES_BIOMETRIA`) mais os eleitores em trânsito permitem. Excesso total de 36.340 eleitores; em 7.922 dessas seções o perfil diz 0 sem biometria. Concentra-se por zona (ES Vitória z0052, SP Indaiatuba z0211, PA Ulianópolis z0084) e se repete nos dois turnos nas mesmas seções. Caso conferido: SP Indaiatuba 0211/0438, BU = 65 e log = 65 habilitações só por ano de nascimento, perfil diz 337 eleitores, todos com biometria.

## Veredito final: **sustentado com ressalvas**

A contagem se sustenta. Os números do 2º turno reproduzem exatamente por dois caminhos, e o caso de Indaiatuba confere no arquivo bruto. As ressalvas tratam do número do 1º turno e do que o achado significa.

1. **O número do 1º turno está desatualizado.** Ele é 12.276 seções e 24.864 eleitores nos arquivos do autor (26 UFs, sem SP), e não 8.624 (15 UFs). O 1º turno continua parcial.
2. **A palavra "impossibilidade" não se aplica.** Cerca de 99% do excesso tem rastro técnico de uma diferença de definição. Os eleitores a mais têm foto no arquivo da urna, mas não têm digital. O perfil público os conta como "com biometria".
3. **Não há sinal de eleitores a mais.** Em nenhuma seção o comparecimento passa dos aptos. Os testes de uso não mostram padrão sistemático.
4. **Pelo princípio 8, o risco continua.** Esses eleitores votaram sem nenhum controle técnico, só com o ano de nascimento e a foto mostrada ao mesário. O grupo nessa situação é maior do que os 36.340.

Os dois revisores chegaram ao mesmo veredito por caminhos independentes. Um usou as saídas por seção do autor. O outro recalculou tudo direto do banco. Os dois mediram o marcador da foto no log com amostras diferentes. Só divergiram no número do 1º turno, e eu o conferi (abaixo).

## Afirmação revisada (alcance que os dados sustentam)

- **Fato:** em 16.011 das 497.508 seções do 2º turno analisadas (3,2%), o BU registra mais votantes "sem biometria cadastrada" do que o perfil de 14/07/2026 tem de eleitores sem biometria, somadas as seções agregadas e com folga para os eleitores em trânsito. O excesso soma 36.340 eleitores, 0,03% dos votos. Em 7.922 dessas seções, o perfil dá 100% de biometria, e elas somam 15.346 do excesso. No 1º turno, ainda parcial, são 12.276 seções e 24.864 eleitores em 26 UFs sem SP. Das 13.175 seções com excesso no 2º turno que já têm dados do 1º, 11.059 (84%) também têm excesso no 1º.
- **Fato:** o excesso se concentra por zona: ES 57053/0052 (126 seções, 680 eleitores), SP 65110/0211 (84 e 600) e PA 04324/0084 (52 e 561). Há também um efeito no sentido inverso, maior e em outras zonas: 17.621 seções e 229.717 votantes **com** biometria acima do cadastro.
- **Fato:** os eleitores do excesso quase todos aparecem no log com `Foto do eleitor apresentada` e sem nenhum pedido de digital. A foto aparece em 58% a 86% dos atendimentos sem biometria nas seções com excesso, contra 1% a 2% nas seções de controle. Contando como "sem biometria" só quem também não tem foto, o excesso cai cerca de 99% nos dois turnos. Isso mostra que o arquivo de eleitores da urna tinha foto e não tinha digital desses eleitores, que o perfil público conta como "com biometria". Foi o arquivo que levou a urna ao ano de nascimento, não a mesa.
- **Hipótese (mais provável, a confirmar com o TSE):** são eleitores com coleta biométrica registrada (foto) e digital pendente, rejeitada ou de má qualidade. O dado público não distingue isso de uma biometria importada de outro órgão nem de digitais removidas do arquivo na geração da mídia. Os três deixam o mesmo rastro.
- **Hipótese (risco, princípio 8):** o grupo "tem foto, não tem digital no arquivo da urna" é maior do que o excesso, que é só um piso. Estimativas: cerca de 52 mil eleitores nas 16.011 seções com excesso e, contando o país todo, possivelmente mais de 100 mil. Esses eleitores foram liberados só com o identificador e o ano de nascimento, e a conferência da foto é humana. Nada nos dados indica que essa porta foi usada de forma sistemática. O dado também não exclui uso em poucas seções.
- **Não sustentado:** ler o achado como contagem impossível, voto a mais ou uso de títulos de terceiros.

## O que foi reproduzido

| Número | Original | Lente "definições" (arquivos do autor) | Lente "alternativas" (banco) | Esta consolidação |
|---|---|---|---|---|
| Seções do 2º turno analisadas | 497.508 | 497.508 | 497.508 | 497.508 |
| Seções com excesso, 2º turno | 16.011 | 16.011 | 16.011 | 16.011 |
| Excesso, 2º turno | 36.340 | 36.340 | 36.340 | 36.340 |
| Seções com perfil 100% biometria / excesso nelas | 7.922 / — | 7.922 / 15.346 | 7.922 | — |
| Excesso inverso, 2º turno | 17.621 seções, 229.717 | igual | igual | igual |
| 1º turno | 8.624 / 17.600 (15 UFs) | 12.276 / 24.864 (26 UFs) | 10.941 / 22.146 (19 UFs) | 12.276 / 24.864 (26 UFs, arquivos do autor); 11.295 / 22.700 (22 UFs, banco) |
| Caso SP 65110/0211/0438, 2º turno | BU 65, log 65, perfil 337 de 337 com biometria | confere | confere | — |
| Topo das zonas (ES 0052, SP 0211, PA 0084 e demais) | tabela do doc 02 | confere | — | — |

- **Fato:** a lente "alternativas" conferiu no CSV bruto do perfil um segundo caso que o autor não tinha olhado: ES 57053/0052/0033, com 394 eleitores, todos 394 com biometria. O BU registra 19 sem biometria no 1º turno e 20 no 2º.
- **Fato:** nas 16.011 seções com excesso, o log contado por atendimento é igual ao BU. Ver o problema 6: isso não é controle independente.

### O ponto em disputa: o número do 1º turno (conferido nesta consolidação)

As três versões vêm de fontes e momentos diferentes. Apliquei a mesma regra a duas fontes, UF a UF (`cetico-b1a-consolidacao.mjs`):

- **Fato:** nos arquivos por seção do autor (`b1a-1t.jsonl`, gerados a partir dos perfis de log, com 26 UFs e sem SP), a contagem dá 12.276 seções e 24.864 eleitores. Bate com o doc 02.
- **Fato:** na cópia de leitura do banco de 09:27, que tem 22 UFs do 1º turno, a contagem dá 11.295 seções e 22.700 eleitores. Nas mesmas 22 UFs, os arquivos do autor dão 11.212 e 22.562. Das 338.809 seções comparadas uma a uma, 338.726 são iguais e 83 diferem, sempre por 1 eleitor a menos no autor.
- **Fato (pequeno defeito de método do autor):** a diferença está nas seções agregadas. No 1º turno, o autor leu a tabela de agregadas do banco quando ela ainda tinha poucas UFs. Por isso, em 4.076 seções o cadastro dele ficou só com a seção principal. Exemplo: PB 19810/0016/0272 tem 177 eleitores no 1º turno do autor e 353 no 2º turno. Sem as agregadas, os aptos passam do cadastro, e o termo `max(0, aptosSecao − cadastro)` da folga absorve a diferença. Na prática, o termo compensou quase tudo. O efeito líquido foi esconder 83 seções e 138 eleitores do excesso nas 22 UFs comparadas. O excesso inverso do 1º turno quase não mudou: 151.839 no autor contra 151.914 no banco, nas mesmas UFs. Nas 26 UFs do autor, só 15 eleitores do inverso caem em seções afetadas. O número do autor é um piso levemente baixo, não um número inflado.
- **Fato:** o 8.624 do doc do demógrafo é de quando havia 15 UFs, e o 10.941 da lente "alternativas" é de quando havia 19. Os dois estão desatualizados. A tabela `carga` agora mostra 25 UFs do 1º turno, mas AM e BA estão com `linhas_perfil` = 0 e faltam SP e TO. Nenhum número do 1º turno é final.
- **Fato:** no 2º turno, os aptos da seção nunca passam do cadastro (0 seções), e o termo da folga é sempre 0, como disse a lente "definições". No 1º turno, ele só vale algo por causa das agregadas que faltaram.

## Problemas encontrados

1. **O número do 1º turno está desatualizado** e os dois documentos do autor se contradizem: 8.624 e 17.600 (15 UFs) no doc 04 do demógrafo, 12.276 e 24.864 (26 UFs) no doc 02. A afirmação deve citar 12.276 e 24.864, como parcial, sem SP.
2. **A explicação de definição foi suposta, não testada, nos dois documentos.** O autor viu a foto em 3 seções, mas sem controle, e não percebeu que ela é o marcador. As duas lentes a testaram com controles:

   | Grupo | Atendimentos sem biometria com foto |
   |---|---|
   | Seções com excesso ≥ 10 (378 seções, 2º turno) | 84,8% |
   | Seções com excesso de 1 a 9 (amostra de 300) | 57,6% |
   | Zonas do topo, amostra da lente "alternativas" | 85,8% |
   | Seções fora do topo, amostra da lente "alternativas" | 64,4% |
   | Controles sem excesso (400 seções / 60 seções) | 2,0% / 1,1% |
   | Eleitores habilitados por biometria (referência) | 93% a 99% |

   Contando como "sem biometria" só os sem foto, o excesso cai de 5.560 para 54 e de 563 para 5 nos grupos medidos do 2º turno. No 1º turno, cai de 2.714 para 3 e de 589 para 6. Em 167 das 176 seções da outra amostra, os atendimentos com foto cobrem todo o excesso. **Fato.**
3. **A mesa não forçou o caminho.** Não houve nenhum pedido de digital em cerca de 23 mil atendimentos sem biometria, nos dois turnos e em todos os grupos, nem `Solicitação de dado pessoal`. A liberação manual de quem tem digital aparece com outra mensagem e foi contada à parte. **Fato.**
4. **As datas de referência são diferentes.** O perfil é de 14/07/2026 (`DT_GERACAO` em todas as 516.785 seções), e a mídia da urna foi gerada entre 16 e 29/09/2026, segundo o log. O teste compara duas fotografias do cadastro tiradas em datas diferentes. Sozinha, essa defasagem não produz o achado: os aptos casam (mediana −1 eleitor) e o excesso chega a 65 por seção. **Fato.**
5. **O critério não tem documentação.** O leiame (datado de 30/05/2025, do ciclo anterior) define `QT_ELEITORES_BIOMETRIA` só como "aptos, com biometria cadastrada", sem falar em qualidade, data ou tipo de coleta. A coluna que o texto chama de `QT_ELEITORES_PERFIL` se chama `QT_ELEITORES` no CSV de 2026. O script usa a coluna certa. **Fato.**
6. **"Log = BU" não é uma contraprova independente.** Os dois saem do mesmo software da urna. A igualdade prova consistência interna, não que o arquivo de eleitores carregado esteja correto. O marcador da foto tem o mesmo limite: mostra que o arquivo tinha foto e não tinha digital, mas não distingue um arquivo legítimo de um alterado na geração da mídia. **Fato.**
7. **O teste é um piso, não uma medida** (ver "Poder do teste").
8. **Sobra um resíduo que a foto não explica**, localizado. A lente "definições" achou 31 seções e cerca de 330 eleitores na extrapolação (0,9%), sobretudo em SP (65110/0211, 71072, 70750). A lente "alternativas" achou 27 eleitores sem foto e sem digital acima do cadastro em 9 seções da amostra, 25 deles em Indaiatuba 0211, no bloco contínuo 0430–0444 (só a 0438 tem 7). Pode ser falta de foto nos próprios coletados, mas isso não foi testado. **Fato** (o resíduo existe). **Hipótese** (a causa).
9. **A frase "não exclui uso localizado" do doc 04 precisa de precisão.** Os eleitores a mais são de outra categoria de cadastro (têm foto) e não aparecem como eleitores "surgidos no dia". O uso localizado continua possível pelo princípio 8, mas como brecha, sem indício nos dados.
10. **Ninguém revisou a regressão com a parcela do 13** (β = 0,31 no 2º turno, 0,43 no 1º). Ela fica fora deste parecer. O efeito, de centésimos de ponto, não muda resultado, mas o sinal positivo merece uma lente própria.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| **Definição:** o "com biometria" do perfil inclui quem tem coleta registrada (foto) sem digital utilizável no arquivo da urna | **Sim**, nas duas lentes, com controles | Explica cerca de 99% do excesso nos dois turnos (problema 2). A causa do lado do TSE (digital pendente, rejeitada ou de má qualidade) não é observável. |
| A urna tinha a digital e a mesa liberou manualmente (erro de contagem) | **Sim** | Refutada: 0 pedidos de digital. A liberação manual tem mensagem própria e o log é igual ao BU. |
| Artefato de método (junção, agregadas, trânsito) | **Sim** | Descartado. Os números reproduzem pelo banco, os aptos casam e um segundo caso confere no CSV bruto. O comparecimento total nunca passa dos aptos. Única falha: as agregadas que faltaram no 1º turno do autor, de efeito pequeno e no sentido de esconder excesso. |
| Defasagem de datas (perfil de julho, mídia de setembro) | Parcial | A defasagem existe, mas sozinha mexe em cerca de 1 eleitor por seção. Faz parte do mesmo mecanismo: coleta não processada até a geração da mídia. |
| Alocação de eleitores entre seções diferente entre o perfil e a urna | Parcial | Em SP 0211, a zona agregada é normal (5,8% sem biometria no cadastro, 2,45% entre os votantes), e o excesso vem de um bloco de seções que o perfil dá como 100% biométrico. Somado por zona, o excesso cai para 3.242 em 48 zonas. Agregar tem pouco poder por causa da abstenção, e o marcador da foto explica melhor. |
| Eleitores novos de 2026 com coleta em processamento | **Sim** (lente "alternativas") | Refutada como causa principal: a parcela de 16 a 20 anos tem coeficiente negativo (−0,0014, t −2,8). O excesso fica no fim da numeração das zonas (percentil médio 0,63), o que é compatível com seções novas ou transferências, que não são necessariamente de jovens. |
| Idosos com digital antiga ou ruim | **Sim** | Refutada: coeficiente da parcela de 70+ de 0,00006 (t 0,06). |
| Biometria importada de outro órgão, sem digital no formato da urna | Não (só suposta) | Compatível com a foto e com a concentração por zona. Não dá para testar com dados públicos. |
| Zonas em revisão ou recadastramento biométrico | Não (só suposta) | Falta a lista oficial e o trabalho foi feito sem rede. Indícios indiretos: excesso mais frequente em zonas de cobertura alta (6,6% das seções nas zonas com 0,5% a 2% sem biometria, 0,9% acima de 20%). O excesso e o excesso inverso não estão nas mesmas zonas (Spearman −0,13). O inverso fica em zonas com muito "sem biometria" no perfil (215 mil em zonas acima de 20%), o que é compatível com coleta feita depois de julho. |
| **Maligna:** mesa força o caminho sem digital | **Sim** | Refutada como mecanismo, dentro da confiança no próprio log: nenhum pedido de digital. |
| **Maligna:** a porta foi usada para votar no lugar de ausentes do grupo sem digital | **Sim**, com poder medido | Sem sinal sistemático. O comparecimento não sobe com o tamanho do grupo (β −0,14, EP 0,08). As seções com excesso ficam de 0 a 1,7 ponto acima das vizinhas, e em PA 0084, com poucas seções, 5 pontos. No horário, os sinais são pequenos: +0,49 ponto de liberações sem biometria na última hora (t 2,2), cerca de 0,15 eleitor por seção. |
| **Maligna:** digitais removidas do arquivo de eleitores na geração ou na carga | Não (não separável) | Deixa o mesmo rastro da explicação de definição (foto sem digital, repetição nos dois turnos). Só uma LAI separa as duas. |

Pelo princípio 8, nenhuma explicação conta a conferência da foto pelo mesário como controle. A foto prova só que o arquivo tinha a imagem, não que a pessoa diante da urna era o eleitor.

## Poder do teste

- **Contra a absolvição falsa (o achado é um piso):** o limiar "BU sem biometria > cadastro sem biometria + folga" só detecta o grupo "foto sem digital" quando ele passa do número de sem biometria do cadastro que se abstém. Com cerca de 57% de abstenção nesse grupo, a folga absorve muito. Nas seções sem excesso das zonas do topo, 31% dos sem biometria têm foto, contra 2% nos controles: o fenômeno está lá, abaixo do limiar. Na amostra da lente "alternativas", os atendimentos com foto e sem digital somam 2.308, contra um excesso de 1.844. **Hipótese:** cerca de 52 mil nas seções com excesso (6.761 medidos nas 378 maiores) e talvez mais de 100 mil no país. As duas estimativas vêm de amostras, e a de 100 mil sai de 60 controles. O tamanho real só sai com o número oficial de eleitores com digital carregada por seção.
- **Contra o uso sistemático da porta:** a simulação da lente "alternativas" mostra que o teste de comparecimento tem poder. Votos falsos do tamanho observado, injetados em 28% das seções, levam o β a +0,53 (t 8) e são detectados em 10 de 10 repetições. Em 5% das seções, são detectados em 8 de 10. Com metade do tamanho, em 28% das seções, 10 de 10. **O teste não tem poder para uso em poucas seções ou em poucos eleitores por seção.** "Não houve uso" não está provado. O que está provado é que não houve uso amplo.
- **Contra o alarme falso:** o comparecimento total nunca passa dos aptos, nem nas seções com excesso. Nelas, ele fica só 1 ponto acima do das outras seções da mesma zona (mediana). Não há eleitores a mais, só um rótulo diferente.

## Pendências

1. **LAI ao TSE (Recomendação):** o critério de `QT_ELEITORES_BIOMETRIA` no `perfil_eleitor_secao` e no arquivo de eleitores da urna, o número de eleitores **com digital carregada na urna** por seção e a lista de zonas em revisão biométrica em 2026. Só com isso o teste de impossibilidade fecha, e só assim se separa digital pendente de remoção deliberada.
2. **Repetir o 1º turno quando a carga terminar** (faltam SP e TO, e AM e BA estão sem perfil de log), regenerando antes as agregadas do 1º turno no script do autor.
3. **O resíduo sem foto de Indaiatuba 0211 (seções 0430–0444):** conferir se esses eleitores são coletados sem foto ou se há outra causa.
4. **Teste por mesário (H05)** nas zonas do topo: a única forma de achar uso localizado que os testes agregados não pegam.
5. **Revisar a regressão com a parcela do 13** (β 0,31 e 0,43) em lente própria.
6. **Corrigir os documentos do autor** (não editados aqui): número do 1º turno, nome da coluna (`QT_ELEITORES`), troca de "impossibilidade" por "divergência de definição medida" e menção ao marcador da foto.

## Comandos que reproduzem a revisão

```sh
# Autor (gera b1a-<t>t.jsonl; sobrescreve as saídas dele, por isso não foi rodado de novo nesta revisão)
node scripts/auditoria/biometria-b1a.mjs --turno 2
node scripts/auditoria/biometria-b1a.mjs --turno 1
node scripts/auditoria/biometria-b1a-diagnostico.mjs
# Lente "definições": reprodução a partir dos arquivos do autor, marcador da foto no log, datas, agregação por zona
node scripts/auditoria/cetico-b1a-definicoes.mjs --turno 2
node scripts/auditoria/cetico-b1a-definicoes.mjs --turno 1
# Lente "alternativas": reprodução direta do banco, idade, comparecimento, horário, vizinhança, repetição
node scripts/auditoria/cetico-b1a-alternativas.mjs
node scripts/auditoria/cetico-b1a-log.mjs --turno 2 --por-zona 5 --controles 40
node scripts/auditoria/cetico-b1a-poder.mjs
# Esta consolidação: o 1º turno (arquivos do autor × banco, UF a UF e seção a seção), a folga e a repetição. ~15 s
node --max-old-space-size=4096 scripts/auditoria/cetico-b1a-consolidacao.mjs
```

Saídas: `data/parsed/auditoria/cetico/b1a-*.json`, `b1a-*.jsonl`, `b1a-*.stdout` (esta consolidação: `b1a-consolidacao.json` e `b1a-consolidacao.stdout`).
