# 4. Como os eleitores foram liberados para votar

> **Situação:** revisto em 29/10/2026 pela regra "só entra número reproduzido". Cada número deste tópico vem de uma de duas fontes: um parecer do revisor cético que o sustenta (`docs/analysis/cetico-revisor/01`, `10` e `27`; o `27` substitui o `06` no item 6.1), ou um recálculo independente feito sobre todas as seções (`scripts/auditoria/verifica-pericia-liberacao.mjs` e, para os casos do item 7, `scripts/auditoria/verifica-pericia-liberacao-logs.mjs`). O que não pôde ser reproduzido saiu do texto e aparece como **Pendente**, sem número. Os itens 1, 4 e 5 cobrem as 28 unidades (26 estados, DF e exterior) nos dois turnos, e o item 7, o 2º turno, com as exclusões que cada item declara (seções apuradas pelo Sistema de Apuração, que não dividem a liberação e não têm log de urna). O teste do item 6.1 cobre as 27 UFs com o detalhamento de habilitação nos dois turnos (parecer 27, 30/10/2026); o exterior fica fora porque lá não há eleitor liberado pela digital para comparar.

## A pergunta

Quantos eleitores votaram depois de pôr o dedo no leitor da urna, e quantos votaram sem isso? Quem liberou os que votaram sem digital? E essa liberação favoreceu algum dos dois candidatos?

## Resposta curta

- **Fato (recalculado):** no 2º turno, 87,3% dos eleitores foram liberados pela própria digital. 5,7% votaram sem digital porque a urna não tinha a digital deles, e 6,7% porque tinham digital, ela não foi reconhecida e a mesa os liberou à mão. Os 0,3% restantes são do exterior, onde ninguém votou com digital. **Fato (revisado, parecer 10, e recalculado):** sem o exterior, o total sem digital no Brasil é 12,4%.
- **Fato (recalculado):** das 8,6 milhões de liberações à mão, 2,8 milhões ficaram no log da urna sem nenhum mesário ligado a elas.
- **Fato (revisado, parecer 01):** em 16.011 seções, a urna liberou mais eleitores "sem biometria" do que o cadastro público diz existir. Nas 378 seções de maior excesso, onde a causa foi medida, ela é uma diferença de definição entre dois arquivos do TSE; nas 16.011 inteiras essa medida está pendente (item 3). Em nenhuma seção o comparecimento passa do número de aptos. Mas esses eleitores votaram sem nenhum controle técnico.
- **Fato (revisado, parecer 27):** o teste que compara os eleitores que foram votar só no 2º turno, com e sem digital, **não decide**. No modelo escolhido antes de rodar, o Brasil não passa do limite e só SP passa, a favor do 22. Mas, quando se leva em conta uma característica do eleitorado da seção (idade ou escolaridade), o resultado do Brasil muda de lado. A diferença entre os dois grupos, se existe, não se separa do perfil das seções (item 6.1).
- **Fato (recalculado com duas contas):** no Brasil, só 1 seção do 2º turno votou inteira sem digital, e ela não virou. Separando as seções pela parcela de votantes sem digital, o 13 ganhou entre 1,9 e 2,9 pontos do 1º para o 2º turno em todas as faixas, com o mesmo tamanho nas seções quase sem liberação sem digital (2,78). A virada não cresce com a falta de digital (item 9).
- **Fato (recalculado):** 97 seções liberaram à mão metade ou mais dos votantes, todas com urnas de 2013 ou 2015 (item 8).
- **Pendente: em verificação.** Se as seções que liberam mais gente sem digital votam mais num dos candidatos, comparando seções parecidas (item 6.2).
- **Fato (recalculado com duas contas):** no Nordeste, de 3,41% a 99,93% dos liberados sem digital podem ter votado no 13. Mesmo no pior caso para o 13, anulando esses votos, ele ainda venceria por 166.144 votos. No Brasil inteiro, porém, o pior caso aritmético dos 15,9 milhões de liberados sem digital inverteria o resultado: a aritmética, sozinha, não fecha essa porta (item 6.4). Em quem os liberados de fato votaram é estimativa e fica fora deste relatório.
- **Limite que não muda:** o voto é secreto. Nenhum arquivo diz em quem votou o eleitor liberado sem digital. Esse voto só pode ser cercado por cima e por baixo, ou estimado pela comparação entre seções, mas nunca observado.

## Antes de começar: como uma pessoa é liberada para votar

Na seção, o mesário digita o número do título (ou o CPF) do eleitor no terminal da mesa. A partir daí, a urna segue um de três caminhos, e cada um deixa uma mensagem própria no diário da urna (o log):

| Caminho | O que acontece | Como aparece no boletim (BU) | Controle técnico? |
|---|---|---|---|
| **1. Pela digital** | A urna pede o dedo, a digital confere com a gravada no arquivo de eleitores da urna, o eleitor é liberado | "habilitados por biometria" | **Sim.** A digital do próprio eleitor fica registrada no log |
| **2. Pelo ano de nascimento** | A urna **não tem** a digital desse eleitor no arquivo dela. Ela não pede o dedo: pede só o ano de nascimento, que o mesário digita | "sem biometria cadastrada" | **Não.** Basta saber o título e o ano de nascimento |
| **3. Liberação manual** | O eleitor tem digital no arquivo, mas ela não é reconhecida (o log registra até 4 tentativas: `Solicita digital. Tentativa [n] de [4]`). A mesa digita um dado pessoal do eleitor e a urna aceita uma digital de quem estiver na mesa. Às vezes a urna liga essa digital a um mesário registrado, às vezes grava que não é possível associar a habilitação a um mesário | "habilitados por biografia" | **Não.** O dado pessoal é digitado por uma pessoa, e a digital gravada não é a do eleitor |

**Regra desta auditoria (princípio 8 de [../01-premissas.md](../01-premissas.md)):** só conta como controle o que é técnico e deixa rastro nos arquivos. Aqui, isso é só o caminho 1. Conferir o documento com foto, olhar a foto do eleitor que aparece na tela do mesário ou ter fiscal na seção são procedimentos feitos por pessoas. Eles podem ser ignorados ou combinados, então não contam como controle nem como explicação que reduza o risco. Os caminhos 2 e 3 são **brechas humanas**: a urna não confere a digital do próprio eleitor, e a liberação depende do que a mesa digita (e, no caminho 3, de um dedo qualquer posto no leitor).

Brecha aberta não é prova de fraude. Este tópico mede se o uso dessas brechas deixou nos dados o padrão que uma fraude deixaria.

## Por que não dá para ver em quem o liberado votou

O log diz **como** cada eleitor foi liberado e a que horas. O Registro Digital do Voto (RDV) traz os votos da seção um a um, mas ordenados por tipo de voto e número digitado, não pela ordem de votação, e sem nenhuma ligação com o eleitor ([tópico 12](12-sigilo-do-voto.md)). Isso é o sigilo do voto, e é proposital. Então:

- não existe, em nenhum arquivo público, a informação "este eleitor, liberado sem digital, votou no 13";
- o que dá para fazer é **cercar**. Um exemplo inventado: numa seção com 200 votos, 190 para o 13 e 30 liberados sem digital, pelo menos 20 desses 30 votaram no 13, porque só sobram 10 votos que não foram para o 13;
- ou **estimar**, comparando muitas seções: se as que liberam mais gente sem digital votam mais num candidato, depois de descontar as diferenças de perfil entre elas. Essa estimativa se chama inferência ecológica: tira conclusões sobre pessoas a partir de totais de grupos, e pode errar quando os grupos são diferentes de formas que os dados não mostram.

Por isso, nenhum resultado deste tópico diz em quem um eleitor liberado votou. Os resultados dizem se o conjunto das liberações deixou um padrão compatível ou incompatível com votos inseridos a favor de um lado.

## O que foi encontrado

### 1. Quantos votaram com e sem digital

**Fato (recalculado).** O país tem 499.248 seções. Dessas, 41, todas no exterior, não foram instaladas e não têm arquivo. Das 499.207 restantes, a tabela usa 499.176: ficaram de fora 31 seções (29 do exterior e 2 de MG) em que o boletim de um dos turnos veio do Sistema de Apuração, e não da urna, porque esse boletim não divide os eleitores por forma de liberação. Essas 31 somam 1.348 votantes no 1º turno e 1.491 no 2º (831 no exterior e 660 nas 2 de MG). Entram as 28 unidades (26 estados, DF e exterior):

| | 1º turno | 2º turno |
|---|---|---|
| Comparecimento | 125.274.487 | 128.234.583 |
| Pela digital (caminho 1) | 109.650.927 (87,5%) | 111.969.845 (87,3%) |
| Pelo ano de nascimento, sem digital na urna (caminho 2) | 6.940.334 (5,5%) | 7.251.695 (5,7%) |
| Liberação manual (caminho 3) | 8.342.249 (6,7%) | 8.632.431 (6,7%) |
| … dessas, sem nenhum mesário ligado a elas no log | 3.221.817 | 2.791.394 |

Fonte: `node scripts/habilitacao-1t-2t.mjs` (autor), reproduzido por `node scripts/auditoria/verifica-pericia-liberacao.mjs` → `data/parsed/auditoria/verifica-pericia/liberacao.json`. O exterior entra no comparecimento, mas o boletim de lá não traz essa divisão (item 4). A linha "sem nenhum mesário" é, em cada seção, o número de liberações manuais do boletim menos as que o log liga a um mesário (mensagem `Mesário … habilitou o eleitor`).

- **Fato (revisado, parecer 10, e recalculado):** a soma dos caminhos 2 e 3 dá 12,4% dos votantes do Brasil, sem o exterior, no 2º turno. No 1º turno, 12,2%.
- **Fato (recalculado):** nessas seções, o comparecimento subiu 2.960.096 do 1º para o 2º turno. 78,3% desse aumento entrou pela digital. Pelo ano de nascimento entraram 311.361 a mais, e pela liberação manual, 290.182 a mais.
- **Fato (recalculado):** no Acre, nas 2.270 seções do 2º turno, o log contado atendimento por atendimento e o boletim dão exatamente os mesmos números em todas as seções: 415.675 pela digital, 15.325 pelo ano de nascimento e 22.654 liberações manuais ([../06-leitura-bu-rdv-log.md](../06-leitura-bu-rdv-log.md)).

### 2. Quem liberou

O log grava o título do mesário quando a urna consegue ligar a digital usada na liberação manual a um mesário registrado na seção. Este relatório não reproduz títulos de mesários. Fala só de seções.

- **Fato (recalculado):** no Acre, das 22.654 liberações manuais do 2º turno, 6.974 (30,8%) não têm nenhum mesário ligado a elas no log. Elas aparecem em 1.424 seções. No país, a mesma situação aparece em 2.791.394 liberações no 2º turno (tabela acima). Nesses casos, os arquivos não dizem quem pôs o dedo.
- **Fato (revisado, parecer 10, e recalculado):** no Rio Grande do Norte, em 2.890 seções com 20 ou mais liberações manuais ligadas a um mesário, o mesário que mais liberou fez, na mediana, 91,7% dessas liberações. Concentrar a liberação numa só pessoa da mesa é o comum ali, não a exceção.
- **Fato (revisado, parecer 10):** mesmo quando o log mostra 4 tentativas de digital antes da liberação, ele não separa uma digital que falhou de verdade de um dedo trocado de propósito. O rastro mostra que alguém pôs o dedo, mas não quem.

### 3. Seções com mais "sem biometria" do que o cadastro permite (revisado, parecer 01)

O TSE publica o **perfil do eleitorado**: quantos eleitores cada seção tem e quantos deles têm biometria cadastrada (arquivo de 14/07/2026). O teste comparou esse número com o boletim: a urna não deveria liberar pelo ano de nascimento mais gente do que a seção tem sem biometria, mais uma folga para os eleitores em trânsito. O teste cobre o Brasil, sem o exterior.

- **Fato:** em 16.011 das 497.508 seções do 2º turno que puderam ser comparadas (3,2%; das 497.897 seções do Brasil com voto, 389 não aparecem no perfil de 14/07/2026 e ficaram fora), o boletim registra mais votantes "sem biometria cadastrada" do que o perfil permite. O excesso soma 36.340 eleitores, 0,03% dos votos. Em 7.922 dessas seções, o perfil diz que 100% dos eleitores têm biometria.
- **Fato:** o excesso se concentra em algumas zonas. As maiores: ES, Vitória, zona 52 (126 seções, 680 eleitores); SP, Indaiatuba, zona 211 (84 seções, 600); PA, Ulianópolis, zona 84 (52 seções, 561).
- **Pendente: em verificação.** O tamanho do excesso no 1º turno e quantas seções o repetem nos dois turnos. A conta que existe deixou SP de fora e tem um pequeno defeito nas seções agregadas, apontado pelo revisor, que a faz contar um pouco a menos. Por isso, nenhum número do 1º turno entra aqui.
- **Fato:** há também o efeito contrário, maior e em outras zonas: 17.621 seções com 229.717 votantes **pela digital** acima do que o perfil diz ter biometria (sobretudo MG, ES, MS e RJ).
- **Fato:** o caso SP, Indaiatuba, zona 211, seção 438, foi conferido no arquivo bruto. O perfil diz que os 337 eleitores têm biometria. O boletim e o log registram 65 liberados pelo ano de nascimento, e em nenhum desses atendimentos a urna pediu digital.
- **Fato:** o rastro que explica o excesso é a mensagem `Foto do eleitor apresentada`. Nas 378 seções com excesso de 10 ou mais (todas elas), 84,8% dos atendimentos sem biometria mostraram a foto do eleitor na tela do mesário. Nessas 378 seções, contando como "sem biometria" só quem também não tinha foto, o excesso cai de 5.560 para 54.
- **Pendente:** quanto a foto aparece nas seções sem excesso. A comparação existente foi feita só numa amostra de seções, e por isso não tem número aqui. Também está pendente a medição do marcador da foto nas 16.011 seções inteiras.
- **Fato:** a mesa não escolheu o caminho. Não houve pedido de digital nesses atendimentos. Quem levou a urna ao ano de nascimento foi o arquivo de eleitores carregado nela, que tinha a foto e não tinha a digital.

**O que isso quer dizer.** O excesso não mostra eleitores a mais nem contagem impossível: em nenhuma seção o comparecimento passa do número de aptos. Mostra que o "com biometria" do cadastro público não é o mesmo "com digital" que a urna usa.

- **Hipótese (a mais provável, a confirmar com o TSE):** eleitores com foto coletada e digital pendente, rejeitada ou de má qualidade. Os dados públicos não separam isso de outras duas causas que deixam o mesmo rastro: biometria importada de outro órgão sem a digital no formato da urna, ou digitais retiradas do arquivo na preparação das urnas.
- **Hipótese (risco, princípio 8):** esses eleitores votaram só com título e ano de nascimento, e a conferência da foto foi feita por uma pessoa. O excesso é só a parte visível desse grupo. O tamanho real no país não foi medido, e só sai com o número oficial de eleitores com digital carregada na urna, por seção (pedido pela LAI, ver Próximos passos).
- **Fato:** os testes de uso não acharam sinal de que essa porta tenha sido usada em larga escala. O comparecimento não sobe com o tamanho do grupo. As comparações com as seções vizinhas e por horário são estimativas de modelo, e os números estão no parecer 01.
- **Não sustentado:** ler este achado como voto a mais, contagem impossível ou uso de título de outra pessoa.

### 4. No exterior, ninguém votou com digital

- **Fato (recalculado):** nas 1.281 seções do exterior com log de urna, os 380.612 votos do 2º turno foram todos liberados pelo título (ou CPF) e ano de nascimento, segundo o log. Nenhum foi liberado pela digital, nem à mão. No 1º turno, 340.977 votos nas 1.281 seções com log, também todos assim. Outras 27 seções do exterior no 2º turno (831 votos) e 28 no 1º (789 votos) foram apuradas pelo Sistema de Apuração e não têm log de urna, então a forma de liberação delas não aparece em nenhum arquivo. O perfil do eleitorado (14/07/2026) registra 222.584 eleitores do exterior com biometria (24% de 918.876), e nem esses votaram com digital.
- **Hipótese (risco):** no exterior, quem souber o título e o ano de nascimento de um eleitor da seção pode votar no lugar dele sem barreira técnica nenhuma. Não dá para medir quantos fizeram isso. São 0,3% do comparecimento nacional.
- **Pendente:** perguntar ao TSE se a urna do exterior é preparada sem digitais ou se o programa desliga a biometria, e qual norma prevê isso.

Fonte: [../analysis/biometria-mesarios/07-exterior-sem-biometria.md](../analysis/biometria-mesarios/07-exterior-sem-biometria.md), reproduzido por `verifica-pericia-liberacao.mjs`.

### 5. Urnas antigas e liberação sem digital (H07)

A hipótese era que urnas de modelo antigo teriam sido mandadas para certas regiões para dispensar a biometria.

- **Fato (recalculado):** todo modelo usado no Brasil no 2º turno lê digital. As urnas de 2013 liberaram 82,2% dos eleitores pela digital, e houve liberação pela digital em 11.432 das 11.433 seções com esse modelo. A premissa de H07 (urna antiga não pede digital) não se confirma no Brasil.

| Modelo | Seções | Pela digital | Pelo ano de nascimento | Liberação manual |
|---|---|---|---|---|
| UE2013 | 11.433 | 82,2% | 7,0% | 10,8% |
| UE2015 | 87.213 | 84,1% | 6,3% | 9,6% |
| UE2020 | 200.504 | 88,4% | 5,5% | 6,0% |
| UE2022 | 198.746 | 88,6% | 5,4% | 6,0% |

2º turno, sem o exterior, com o modelo lido no log de cada urna. Numa seção de SP (município 64777, zona 395, seção 298), o perfil do projeto não leu o log; o log bruto diz UE2015, e com ela a linha UE2015 teria 87.214 seções, com as mesmas porcentagens. Numa urna de contingência da PB (município 19658, zona 57, seção 66), o log diz UE2015 e o banco do projeto diz UE2013. Por isso o banco conta 11.434 seções de 2013; as porcentagens não mudam.

- **Fato (recalculado):** comparando cada seção só com as outras da mesma zona eleitoral, sem outros controles, o modelo quase não muda a liberação pelo ano de nascimento: as urnas de 2013 liberam por esse caminho 0,21 ponto a menos que as de 2022 no 2º turno, e 0,24 a menos no 1º. Muda a liberação manual: +4,3 pontos nas urnas de 2013 e +3,2 nas de 2015, no 2º turno (+4,5 e +3,3 no 1º). Ou seja, nas urnas antigas a digital falha mais e a mesa libera mais à mão. Isso alarga a brecha humana.
- **Fato (recalculado):** com a mesma comparação, as urnas antigas estão em seções que votam **menos** no 13, entre os votos de 13 e 22: −1,4 ponto (2013) e −1,0 (2015) no 2º turno; −1,4 e −0,9 no 1º.
- **Pendente:** a mesma comparação descontando também o perfil do eleitorado da seção (idade e cadastro sem biometria). O primeiro autor a fez, mas ela ainda não foi reproduzida.
- **Hipótese (técnica):** leitor de digital mais antigo, que falha mais. Teste possível: contar no log as tentativas de digital por modelo.

Fonte: [../analysis/biometria-mesarios/06-h07-modelo-urna.md](../analysis/biometria-mesarios/06-h07-modelo-urna.md) e `verifica-pericia-liberacao.mjs` (regressão por seção, com efeito fixo de UF e zona, sem peso).

### 6. A liberação sem digital favoreceu algum lado?

Como o voto do liberado não pode ser observado, foram usados testes indiretos. Cada um enxerga um tipo de fraude e é cego a outros. Por isso cada resultado vem com o que ele **não** exclui.

Dois termos usados abaixo:

- **Comparar dentro da UF, do município ou da zona:** cada seção é comparada só com outras do mesmo lugar. Assim, diferenças entre estados (por exemplo, o Nordeste votar mais no 13) não se misturam com o efeito que se quer medir.
- **t:** mede o tamanho de um sinal em relação ao ruído. Em geral, abaixo de 2 (para mais ou para menos) o sinal não se distingue do acaso. Quando se fazem dezenas de testes ao mesmo tempo, o limite sobe, porque alguns passam de 2 só por sorte.

#### 6.1. Quem foi votar só no 2º turno (revisado, parecer 27)

Se mesários tivessem liberado sem digital pessoas para votar no lugar de ausentes, a favor de um lado, os eleitores **a mais** do 2º turno liberados sem digital votariam diferente dos eleitores a mais liberados pela digital.

Fonte: estudo do estatístico eleitoral com as 28 UFs ([../analysis/estatistico-eleitoral/06-h05-28ufs.md](../analysis/estatistico-eleitoral/06-h05-28ufs.md)) e [parecer 27](../analysis/cetico-revisor/27-h05-28ufs.md) do revisor cético, sustentado com ressalvas. O revisor refez a conta do autor e chegou ao mesmo arquivo, byte a byte; um caminho próprio dele dá os mesmos valores no Brasil, em SP, no PR e em MG. Este item usa só a "afirmação revisada" do parecer. O parecer 27 substitui o parecer 06, que tinha só 25 UFs.

**Como o teste funciona, em palavras simples.** Em cada seção, compara-se o 1º com o 2º turno: quantos eleitores a mais vieram votar pela digital, quantos a mais vieram sem digital, e quanto o 13 e o 22 ganharam. As seções são comparadas só com outras do mesmo município. Se os eleitores a mais sem digital tivessem sido usados para pôr votos num lado, as seções que ganharam muitos eleitores sem digital teriam dado a esse lado mais do que as que ganharam eleitores pela digital.

Dois números resumem o resultado:

- **d:** a diferença, entre o eleitor a mais sem digital e o eleitor a mais pela digital, na parcela que foi para o 13. d = −0,0039 quer dizer 0,39 ponto percentual a menos para o 13 no grupo sem digital. O "±" ao lado é a margem de erro da conta.
- **t:** o tamanho de d em relação à margem de erro. Como foram feitos 56 testes ao mesmo tempo (Brasil e cada UF, para o 13 e para o 22), o limite sobe para 3,32 (para mais ou para menos), para que um resultado não passe só por sorte. Esse limite foi escolhido antes de rodar.

**O que foi encontrado:**

- **Fato (revisado, parecer 27):** em todas as seções das 27 UFs com o detalhamento de habilitação nos dois turnos (497.622 seções), no Brasil, a diferença para o 13 é d = −0,0039 ± 0,0015 (t = −2,60), abaixo do limite de 3,32. Só SP passa do limite, a favor do 22 (t = −5,59 para o 13; +5,16 para o 22).
- **Fato (revisado, parecer 27): o resultado depende do modelo.** Acrescentar à conta uma única característica do eleitorado da seção muda o Brasil de lado:

  | O que se leva em conta além do modelo escolhido antes | d no Brasil (13) | t | Leitura |
  |---|---:|---:|---|
  | nada (modelo escolhido antes de rodar) | −0,0039 | −2,60 | abaixo do limite |
  | parcela de eleitores com 60 anos ou mais | +0,0084 | +5,93 | passa do limite, a favor do 13 |
  | parcela de eleitores com escolaridade baixa | −0,0062 | −3,81 | passa do limite, a favor do 22 |

  Por isso, este teste **não** mostra que o eleitor a mais sem digital votou igual ao com digital. Mostra que a diferença entre eles, se existe, não se separa do perfil das seções.
- **Por que o perfil da seção muda o sinal (Hipótese, parecer 27).** O eleitor que vota sem digital não é um eleitor qualquer: em boa parte é mais velho (a digital se gasta com a idade) ou de outro perfil. Dentro do mesmo município, as seções com mais idosos ganham mais eleitores sem digital e também votam diferente das outras, por serem seções de idosos. Assim, o teste acaba comparando grupos de perfil diferente, e o resultado depende de quanto do perfil se desconta. É como comparar duas filas de um posto de saúde: se numa delas há mais idosos, a diferença entre as filas pode vir da idade, e não do atendimento. Nenhum dos modelos é "o certo": o perfil público da seção é só um retrato grosseiro de quem de fato voltou a votar.
- **Fato (revisado, parecer 27):** no exterior (1.281 seções com voto), 100% dos 380.612 eleitores do 2º turno foram liberados pelo ano de nascimento, segundo o diário da urna. Lá não há grupo com digital para comparar, e o teste não se aplica.
- **Fato (revisado, parecer 27):** a maior parte da variação entre os turnos nas formas de liberação é o mesmo eleitor mudando de forma (por exemplo, liberado pela digital num turno e sem digital no outro): pelo menos 1.047.522 casos no país. O teste trata essa mudança como se fosse eleitor a mais, e isso é parte do porquê ele é frágil.
- **Pendente (sem número, parecer 27):** que inserção pela liberação sem digital o teste detectaria; quantos votos cabem na faixa entre os modelos; a explicação do sinal do PR (a favor do 13) e do de SP (a favor do 22). Os números de simulação e as contas em "votos" do estudo ficam fora deste relatório, porque são estimativas.
- **Risco (princípio 8):** a liberação sem digital continua sendo brecha humana. Este teste mede um rastro possível dela e não a fecha.

**O que este teste não detecta**, pela forma do teste e pela simulação dos revisores (os números estão nos pareceres 06 e 27):

- inserção igual em todas as seções de uma UF, ou de municípios inteiros, mesmo grande;
- inserção pequena e espalhada pelas seções mais favoráveis a um candidato;
- fraude do mesmo tamanho nos dois turnos, que some na diferença entre eles;
- uso da brecha em poucas seções.

#### 6.2. Seções que liberam mais votam mais no 13? (Pendente: em verificação)

A pergunta é se as seções que liberam mais gente sem digital votam mais no 13, comparando seções da mesma zona e descontando o perfil do eleitorado (idade, cadastro sem biometria, tamanho) e o modelo da urna, nos dois turnos. O primeiro autor fez essa conta ([../analysis/biometria-mesarios/05-a9-regressao.md](../analysis/biometria-mesarios/05-a9-regressao.md)), mas ela ainda não foi reproduzida de forma independente nem passou pelo revisor cético. Por isso, nenhum número dela entra aqui, e nenhuma conclusão sobre essa associação é tirada neste tópico.

Duas leituras terão de ser testadas quando o número existir:

- **Hipótese (demográfica):** se houver associação, ela pode vir de um perfil social das seções que os controles disponíveis não captam. Os dados abertos não trazem renda nem urbano/rural por seção, então isso não pode ser testado com eles.
- **Hipótese (risco):** uma fraude do mesmo tamanho nos dois turnos, sempre a favor do mesmo lado, deixaria uma associação parecida nos dois turnos.

#### 6.3. Seções com comparecimento muito alto (revisado, parecer 10)

Se mesários votassem no lugar de ausentes, as seções com quase todos os eleitores presentes teriam mais liberação manual que as vizinhas.

- **Fato:** no 2º turno, nenhuma seção tem comparecimento acima dos aptos. 639 seções têm 95% ou mais e 12 chegam a 100%.
- **Fato:** nessas 639 seções, a liberação sem digital é 9,37%, contra 12,41% esperados pelas próprias zonas. A diferença vem toda dos eleitores sem digital na urna. Por que esse grupo pesa menos ali é Hipótese: pode ser a composição do cadastro ou esse eleitor faltar mais. A liberação manual de quem tinha digital (o único caminho para votar no lugar de um ausente que tem biometria) não se distingue da da zona: 7,58% contra 7,77% dos eleitores com biometria cadastrada.
- **Pendente (estimativa de modelo, fora deste relatório):** o limite estatístico de votos no lugar de ausentes por esse caminho, nas 639 seções juntas, está no parecer 10. O teste **não** cobre fraude concentrada em poucas seções, voto pelo ano de nascimento no lugar de ausente sem digital, nem fraude que não passa pela urna (compra de voto, coação, transporte).
- **Fato:** o caso mais destacado (RN, João Câmara, município 17132, zona 10, seção 145, 36,4% sem digital contra 12,9% da zona) já era o primeiro da zona no 1º turno, com 87,8% de comparecimento e a mesma urna. Com o modelo estatístico correto, ele não passa de forma firme no teste. A probabilidade minúscula que circulou para esse caso vinha de um modelo errado e não deve ser citada.
- **Leitura revisada:** o resultado é **neutro** sobre a liberação manual. Não é prova contra nem a favor de mesários votando por ausentes.

#### 6.4. Os liberados votaram majoritariamente no 13, sobretudo no Nordeste?

Essa hipótese (H13) foi apresentada ao projeto. O voto de quem foi liberado sem digital não é registrado em lugar nenhum (ver "Por que não dá para ver em quem o liberado votou"). Por isso, a resposta tem duas partes: o que a aritmética garante, que entra aqui, e o que só se estima com modelos estatísticos, que fica fora deste relatório.

**Quantos foram liberados sem digital, por região (2º turno, Brasil sem o exterior):**

- **Fato (recalculado):** no Nordeste, 4.269.379 votantes foram liberados sem digital: 11,75% do comparecimento da região. O Nordeste **não** é a região que mais libera sem digital. No Sudeste, a parcela é de 13,97%, e no Sul, de 12,26%. No Brasil todo, sem o exterior, é de 12,4% (item 1).

**O que a aritmética garante, sem nenhuma suposição:**

Em cada seção se sabe quantos foram liberados sem digital e quantos votos teve cada candidato. Isso fixa um mínimo e um máximo de liberados que podem ter votado no 13. Por exemplo, numa seção com 100 liberados e só 30 votos no 13, no máximo 30 liberados votaram no 13.

- **Fato (recalculado com duas contas):** no Nordeste, a parte dos liberados sem digital que votou no 13 está em algum ponto entre **3,41% e 99,93%**. A aritmética sozinha não diz onde.
- **Fato (recalculado com duas contas):** suponha o pior caso para o 13 no Nordeste: em cada seção, os liberados deram ao 13 o máximo possível e ao 22 o mínimo, e esses votos são anulados. Mesmo assim, a margem nacional do 13 cai de 4.430.191 para **166.144**, e o 13 continua vencendo.
- **Fato (recalculado com duas contas):** feito o mesmo para **todo o Brasil**, sem o exterior, com os 15.884.298 liberados sem digital, o pior caso aritmético **inverteria** o resultado: a margem iria a −11.119.111. Só o Sudeste já bastaria (−2.692.865). Isso não é sinal de fraude: é o tamanho da porta. Quer dizer que a aritmética, sozinha, não descarta que a liberação sem digital tenha decidido a eleição. Só os testes estatísticos limitam quanto dela pode ter sido usado.

| Região | Liberados sem digital | Parte que pode ter votado no 13 | Margem nacional no pior caso para o 13 |
|---|---|---|---|
| Norte | 937.030 | 0,88% a 99,68% | 3.498.326 |
| Nordeste | 4.269.379 | 3,41% a 99,93% | 166.144 |
| Centro-Oeste | 993.788 | 0,44% a 99,56% | 3.443.691 |
| Sudeste | 7.389.540 | 0,76% a 97,92% | −2.692.865 |
| Sul | 2.294.561 | 0,14% a 98,68% | 2.186.357 |
| Brasil (sem exterior) | 15.884.298 | 1,37% a 98,78% | −11.119.111 |

Na última coluna, cada linha anula só os liberados daquela região. Liberados sem digital = sem digital na urna (ano de nascimento) + digital não reconhecida (liberação manual), pelo boletim. O exterior fica de fora porque o boletim de lá não traz a divisão, e lá todos votaram sem digital (item 4).

Fonte: `node scripts/auditoria/h13-limites-banco.mjs` → [../analysis/hipotese-liberacao-mesario/06-limites-pelo-banco.md](../analysis/hipotese-liberacao-mesario/06-limites-pelo-banco.md), com a tabela por UF. A mesma conta foi feita por outro caminho, a partir dos perfis dos boletins (`scripts/auditoria/liberacao-limites-deterministicos.mjs`), e as duas dão o mesmo resultado no Nordeste: 3,4% a 99,9% (a outra conta publica uma casa decimal) e a mesma margem de 166.144. Exclusões: as 1.310 seções do exterior. Nenhuma seção do Brasil ficou sem o detalhamento no boletim.

**O que fica fora deste relatório:** cinco métodos estatísticos estimaram em quem os liberados votaram e se votaram diferente de quem usou a digital na mesma zona. Também mediram que tamanho de fraude cada teste seria capaz de ver. Essas medidas são estimativas de modelo, e por isso nenhum número delas entra aqui. Estão em [../analysis/hipotese-liberacao-mesario/00-sintese.md](../analysis/hipotese-liberacao-mesario/00-sintese.md), com a revisão cética em [../analysis/cetico-revisor/15-h13-liberacao-mesario.md](../analysis/cetico-revisor/15-h13-liberacao-mesario.md), [18](../analysis/cetico-revisor/18-h13-liberacao-reproducao.md) e [19](../analysis/cetico-revisor/19-h13-liberacao-poder.md).

- **Pendente:** a mesma conta aritmética com a liberação contada no log (mesário identificado), depois que os perfis dos logs forem regerados com a ordem das linhas corrigida.

### 7. "O eleitor identificado já votou"

Quando alguém digita o título de quem já votou, a urna avisa `O eleitor identificado já votou`. Esse aviso é o que a urna registraria no caso que alguns eleitores relatam ("cheguei e alguém já tinha votado por mim"), mas ele também aparece quando o mesário digita de novo o título de quem acabou de votar.

- **Fato (recalculado):** no 2º turno, a urna deu esse aviso 113.979 vezes, em 73.246 das 499.178 seções com log de votação (as 499.177 lidas pelo perfil e a de SP, município 64777, zona 395, seção 298, cujo log bruto tem 268 votos e nenhum aviso). As outras 27 seções com voto para Presidente, no exterior, foram apuradas pelo Sistema de Apuração e não têm log de urna. Em 99,6% das seções que tiveram o aviso, ele aparece menos de uma vez a cada 20 votos.
- **Fato (recalculado, conferido no log bruto):** em 9 seções com 30 votos ou mais, cada uma numa zona diferente (AC, AM ×2, DF, GO, MA ×2, RS e exterior), o aviso aparece de 0,98 a 1 vez por voto (de 198 avisos em 202 votos a 130 em 130), logo depois de cada voto: na mediana de cada seção, de 9 a 19 segundos depois do voto. Exemplo: AC, Bujari, zona 9, seção 440, com 130 votos e 130 avisos. **Hipótese:** o mesário redigitou o título de quem acabou de votar. Ver [../casos/ac-01007-z0009-s0440.md](../casos/ac-01007-z0009-s0440.md).
- **Fato (recalculado, conferido no log bruto):** uma única seção do 2º turno tem mais avisos do que votos: ES, Vila Velha, zona 55, seção 364, com 388 avisos e 275 votos. 382 desses avisos estão em 19 rajadas de 5 ou mais, sem nenhum voto entre eles. 386 dos 388 avisos vieram de um título digitado, e 2 de um CPF. A maior rajada teve 59 avisos entre 11h19 e 11h33. **Hipóteses, nenhuma testada:** consulta indevida de uma lista pela urna, ou alguém digitando títulos em sequência até achar um que ainda não tinha votado. Ver [../casos/es-57037-z0055-s0364.md](../casos/es-57037-z0055-s0364.md).

### 8. Seções que liberaram à mão metade ou mais dos votantes

Uma seção em que a mesa libera à mão quase todo mundo é o lugar onde a brecha humana fica maior. A conta usa o boletim de todas as seções do 2º turno, sem o exterior, e o 1º turno da mesma seção.

- **Fato (recalculado):** 97 seções, em 69 zonas, liberaram à mão (digital do eleitor não reconhecida, liberação por dado pessoal) 50% ou mais dos votantes no 2º turno. Somam 23.050 votantes, dos quais 18.452 liberados à mão. Nenhuma chegou a 100%.
- **Fato (recalculado):** as 97 usam urnas de 2013 ou de 2015 (modelo lido no log). Em 65 delas a liberação à mão também passou de 50% no 1º turno. Nas outras 32, só no 2º.
- **Fato (recalculado):** voto para Presidente, parcela do 13 entre 13 e 22:

| | Seções | 1º turno | 2º turno | Variação |
|---|---|---|---|---|
| As 97 seções | 97 | 58,79% | 61,20% | +2,41 pontos |
| Restante das mesmas 69 zonas | 12.165 | 55,14% | 57,94% | +2,80 pontos |

  As 97 já votavam um pouco mais no 13 que o resto das suas zonas no 1º turno. Do 1º para o 2º turno, o 13 cresceu **menos** nelas do que no resto das zonas.
- **Hipótese (técnica):** leitor de digital gasto ou com defeito. A urna antiga falha mais (item 5), e a falha se repete na mesma seção nos dois turnos em 65 dos 97 casos.
- **Pendente:** inspeção física das urnas dessas seções, começando pelas 32 em que a falha apareceu só no 2º turno.

Fonte: `node scripts/auditoria/liberacao-manual-em-massa.mjs` → [../analysis/virada-sem-digital/02-liberacao-manual-em-massa.md](../analysis/virada-sem-digital/02-liberacao-manual-em-massa.md), com a lista das 97 seções. O primeiro autor contou 96 seções pelo log ([../analysis/biometria-mesarios/04-mesarios.md](../analysis/biometria-mesarios/04-mesarios.md)), mas deixou de fora 178 seções atendidas por urna reserva. Por isso, aqui vale a conta pelo boletim.

### 9. As seções sem digital viraram para o 13?

A pergunta: nas seções em que todos, ou quase todos, votaram sem digital, o 13 virou do 1º para o 2º turno mais do que nas outras? "Virou para o 13" quer dizer: o 22 venceu a seção no 1º turno e o 13 venceu no 2º.

- **Fato (recalculado com duas contas):** no Brasil, sem o exterior, **só 1 seção** do 2º turno teve 100% dos votantes sem digital: MS, município 91693, zona 27, seção 108. Lá foram 186 votantes, 18 sem digital na urna e 168 liberados à mão. Ela **não virou**: o 13 foi de 33,54% para 35,48%, e o 22 venceu nos dois turnos.
- **Fato (recalculado com duas contas):** separando todas as 497.897 seções do Brasil com voto no 2º turno pela parcela de votantes sem digital:

| Votantes sem digital no 2º turno | Seções | Viraram para o 13 | Viraram para o 22 | Parcela do 13 (1º → 2º turno) | Ganho do 13 |
|---|---|---|---|---|---|
| 100% | 1 | 0 | 0 | 33,54% → 35,48% | +1,94 pontos |
| 80% a 99,9% | 74 | 7 | 1 | 59,03% → 61,67% | +2,64 pontos |
| 50% a 79,9% | 2.922 | 218 | 3 | 42,73% → 45,67% | +2,94 pontos |
| 20% a 49,9% | 61.027 | 4.584 | 101 | 48,85% → 51,75% | +2,90 pontos |
| menos de 20% | 433.873 | 26.532 | 450 | 49,04% → 51,82% | +2,78 pontos |

- **O que a tabela mostra:** o ganho do 13 entre os turnos tem praticamente o mesmo tamanho em todas as faixas, de 2,6 a 2,9 pontos (a faixa de 100% é uma seção só). Se a liberação sem digital tivesse sido usada para virar votos, o ganho seria maior nas faixas de cima, e não é. A parte de seções que viraram muda pouco de uma faixa para outra (de 6,1% a 9,5%). Ela depende sobretudo de quantas seções o 22 venceu por pouco no 1º turno, e por isso compara menos do que a coluna do ganho.
- **Fato (recalculado):** no exterior, onde todos os 380.612 votos do 2º turno foram liberados sem digital (item 4), 53 das 1.281 seções com voto viraram para o 13 e 10 viraram para o 22. A parcela do 13 foi de 52,23% para 53,85% (+1,62 ponto), menos que no Brasil.
- **O que não exclui:** a tabela junta seções de lugares diferentes. Ela não exclui uma fraude do mesmo tamanho nos dois turnos, que some na diferença entre eles, nem uma inserção pequena, espalhada em poucas seções de cada faixa.

Fonte: `node scripts/auditoria/virada-sem-digital.mjs` → [../analysis/virada-sem-digital/01-resultado.md](../analysis/virada-sem-digital/01-resultado.md). O script faz a conta duas vezes, por caminhos independentes: (a) pelos perfis dos boletins dos dois turnos (`scripts/auditoria/cetico-t8-extrair.mjs`, 499.207 seções pareadas); (b) pelo banco (tabelas `secao` e `voto_bu`). As duas dão o mesmo resultado em todas as faixas e todos os campos. Exclusões: 29 seções sem comparecimento no boletim do 2º turno.

## Prova de que os testes funcionam (contraprova)

- **Leitura do log:** no Acre inteiro, as três formas de liberação contadas no log batem com o boletim nas 2.270 seções. O revisor registrou um limite: log e boletim saem do mesmo programa da urna, então a igualdade prova coerência interna, não que o arquivo de eleitores carregado na urna estava certo.
- **Item 3:** um segundo caso, que o autor não tinha olhado, foi conferido no arquivo bruto do perfil (ES, Vitória, zona 52, seção 33: perfil com 394 de 394 eleitores com biometria, boletim com 19 e 20 sem biometria nos dois turnos). O marcador da foto foi medido por dois revisores, com seções diferentes.
- **Item 3, poder do teste de uso:** o revisor injetou votos falsos do tamanho observado em parte das seções. Quando eles estão em muitas seções, o teste os pega; em 5% das seções, a detecção é incerta (parecer 01, errata de 29/10/2026). **O teste não tem poder para uso em poucas seções ou com poucos eleitores por seção.** Ele não prova que não houve uso: mostra que um uso amplo como o simulado teria deixado sinal, e esse sinal não apareceu.
- **Item 6.1:** os revisores inseriram votos falsos nos dados reais e mediram o que o teste pega e o que não pega (tabelas dos pareceres 06 e 27; o 27 repetiu com 20 rodadas e outro sorteio, e o resultado qualitativo se manteve). Foi assim que se chegou aos pontos cegos listados em 6.1. O revisor também conferiu três seções no boletim original dos dois turnos (PR 74993/0159/0009, PR 77399/0124/0080 e MG 52752/0268/0068): os números batem com o banco.
- **Item 6.3:** em simulação, seções levadas a 95% de comparecimento só com votos falsos sem digital quase nunca foram marcadas: o teste por seção é fraco. O teste do conjunto das 639, pelo caminho da digital que falhou, só vale para fraude espalhada por essas seções (parecer 10).
- **Itens 1, 4, 5 e 7:** os números foram recalculados de forma independente, de todas as seções dos dois turnos, e os casos do item 7 foram conferidos no log bruto. Esses itens são contagens; ainda não passaram por um parecer do revisor cético.

## O que este resultado prova e o que não prova

**Prova:**

- quantos eleitores votaram com e sem a própria digital, seção por seção, em todas as seções cujo boletim de urna traz essa divisão (o item 1 diz quais ficam fora);
- que existem duas brechas humanas, usadas por 12,4% dos eleitores no Brasil e por 100% no exterior;
- que o excesso de "sem biometria" sobre o cadastro não é de eleitores a mais (em nenhuma seção o comparecimento passa dos aptos) e, nas 378 seções de maior excesso, vem de uma diferença entre arquivos do TSE;
- **Pendente:** se houve uso da brecha em larga escala a favor de um lado. O teste do item 6.1, com as 27 UFs, não decide: o resultado muda de lado conforme o perfil da seção que se leva em conta (parecer 27). (Este item sai da lista "Prova".)

**Não prova:**

- que cada eleitor liberado sem digital era quem dizia ser. Nenhum arquivo público permite saber isso;
- que não houve uso da brecha em poucas seções, de forma espalhada por igual numa UF inteira, ou no mesmo tamanho nos dois turnos;
- em quem os liberados votaram. Isso só pode ser cercado ou estimado (item 6.4, Pendente);
- nada sobre fraude que não passa pela urna: compra de voto, coação, transporte de eleitor.

## Limites

1. **O voto é secreto.** A ligação entre a forma de liberação e o voto não existe nos arquivos. Todo resultado sobre "em quem votou o liberado" é estimativa ou cerco.
2. **A pessoa diante da urna não é identificada nos caminhos 2 e 3.** Pelo princípio 8, a conferência de documento e de foto não conta como controle, e ela não deixa rastro.
3. **O log não separa digital que falhou de dedo trocado.** E, em 2,8 milhões de liberações manuais, nem diz de quem era o dedo.
4. **Cadastro desatualizado.** O perfil público é de 14/07/2026, e as urnas do 2º turno foram carregadas entre 15/09 e 25/10/2026: 496.962 até 04/10 e 2.245 entre 09/10 e 25/10 ([tópico 3](03-linha-do-tempo.md), item 2). Em algumas zonas, eleitores mudaram de seção nesse intervalo (caso RN do parecer 10), e a comparação seção a seção perde valor ali.
5. **Sem renda e sem urbano/rural por seção.** Os dados abertos não trazem esses dados, então explicações sociais para diferenças entre seções não podem ser testadas com eles.
6. **O teste do item 6.1 não separa o perfil da seção** de uma diferença real entre os eleitores com e sem digital (parecer 27). O 1º turno do item 3 está pendente.
7. **O caderno de votação não é público.** É a única fonte que diria quem assinou como eleitor em cada seção. Só pode ser obtido por pedido formal.

## Como repetir

```
node --max-old-space-size=8000 scripts/auditoria/verifica-pericia-liberacao.mjs   # itens 1, 2, 4, 5, 6.4 e 7: recálculo de todas as seções
node src/exportar.js --uf es --municipio 57037 --zona 0055 --secao 0364 --saida <dir>   # item 7: log bruto (idem para as 9 seções)
node scripts/auditoria/verifica-pericia-liberacao-logs.mjs <dir>                  # item 7: rajadas e atraso depois do voto
node scripts/habilitacao-1t-2t.mjs                                   # item 1: conta do autor
node --max-old-space-size=4096 scripts/auditoria/cetico-b1a-consolidacao.mjs   # item 3: revisão
node scripts/auditoria/cetico-b1a-log.mjs --turno 2 --por-zona 5 --controles 40  # item 3: marcador da foto
node --max-old-space-size=6144 scripts/auditoria/estatistico-h05.mjs 5             # item 6.1: conta do autor, 28 UFs
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs.mjs 20           # item 6.1: revisão (parecer 27)
node --max-old-space-size=6144 scripts/auditoria/cetico-h05-28ufs-covariaveis.mjs  # item 6.1: o resultado com cada característica da seção
node scripts/auditoria/cetico-e2bio-bu-bruto.mjs pr 74993 0159 0009            # item 6.1: boletim original dos dois turnos (idem PR 77399/0124/0080 e MG 52752/0268/0068)
node scripts/auditoria/cetico-a7-consolidacao.mjs                    # item 6.3: revisão
node scripts/ja-votou-por-voto.mjs                                   # item 7: conta do autor
```

Os detalhes técnicos estão em [../analysis/biometria-mesarios/](../analysis/biometria-mesarios/01-metodo-e-dados.md) e nos pareceres [01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md), [06](../analysis/cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md), [10](../analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md) e [27](../analysis/cetico-revisor/27-h05-28ufs.md).

## Próximos passos

- **Pendente:** refazer a conta do item 6.4 com a liberação contada no log, depois dos perfis regerados.
- **Pendente:** reproduzir de forma independente a comparação do item 6.2 e a do item 5 com os controles de perfil do eleitorado, e passar as duas pelo revisor cético.
- **Pendente:** parecer do revisor cético para as contagens dos itens 1, 2, 4, 5 e 7.
- **Pendente:** medir o marcador da foto nas 16.011 seções do item 3, nas seções sem excesso e no país inteiro, para saber o tamanho real do grupo "tem foto, não tem digital na urna".
- **Pendente:** refazer o 1º turno do item 3 com todas as UFs e com as seções agregadas corrigidas. (O teste do item 6.1 já foi refeito com todas as UFs: parecer 27.)
- **Pendente:** medir, no país inteiro, a maior rajada de "já votou" sem voto entre eles por seção, e ver como foram liberados os eleitores logo depois das rajadas da seção 364 de Vila Velha. A varredura que existe ([../analysis/biometria-mesarios/03-rajadas-ja-votou.md](../analysis/biometria-mesarios/03-rajadas-ja-votou.md)) leu 499.000 logs, mas deixou de fora 178 seções atendidas por urna reserva. Por isso nenhum número dela entra aqui, nem o das seções em que a urna parece ter sido usada para consultar quem ainda não tinha votado.
- **Pendente:** inspeção das urnas das 97 seções do item 8.
- **Pendente:** olhar no log as seções do Paraná que puxam o sinal do item 6.1, e medir, por urna e por turno, quantos eleitores mudaram de forma de liberação porque o leitor falhou (parecer 27, recomendação 7).
- **Pendente (pedidos pela LAI ao TSE):** o critério de "biometria cadastrada" no perfil público e no arquivo da urna; o número de eleitores com digital carregada na urna, por seção; a lista de zonas em revisão biométrica em 2026; a regra que desliga a digital no exterior; o critério de distribuição dos modelos de urna; o caderno de votação das seções destacadas.
