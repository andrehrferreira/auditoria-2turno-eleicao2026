Você é revisor independente de uma auditoria das eleições brasileiras de 2026 (1º turno 04/10, 2º turno 25/10; Presidente: 13 = Lula, 22 = Flávio Bolsonaro). O relatório de perícia (docs/pericia/) é para leigos e tem uma regra dura: **só entra número 100% correto**, do universo completo (todas as seções, todas as UFs), conferido nos arquivos oficiais do TSE e reproduzível por script. Estimativa, amostra, "cerca de", número de terceiros não conferido e conta feita sobre suposição devem ficar FORA ou aparecer só como "Pendente", sem número.

Universo do 2º turno: 499.248 seções, 499.207 com pacote completo, 499.205 com voto para Presidente. Você não tem acesso aos dados nem pode rodar código: revise o que dá para revisar só com o texto.

## Sua tarefa

Revise **cada número** do tópico abaixo. Procure:

1. **Conta errada:** somas, diferenças, porcentagens, razões e totais que não fecham com os próprios números do texto (refaça as contas).
2. **Denominador ou universo trocado:** porcentagem calculada sobre base diferente da declarada; número que diz ser do país mas parece de parte das UFs; mistura de 1º e 2º turno.
3. **Contradição interna:** o mesmo dado com valores diferentes em lugares diferentes do tópico, ou diferente da tabela nacional de referência anexada.
4. **Violação da regra dos 100%:** número estimado, amostral, arredondado ("cerca de", "~", "aproximadamente"), parcial (só algumas UFs), de terceiros, ou conclusão que o número não sustenta.
5. **Afirmação mais forte que a evidência** (nos dois sentidos: falso alarme de fraude ou falsa absolvição).

## Formato da resposta (markdown)

Uma tabela com: | # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade (alta/média/baixa) |
Depois, uma linha "Números conferidos sem problema: N" e uma lista curta dos números que você conseguiu conferir aritmeticamente e batem.
Não invente números que não estão no texto. Se não houver problema, diga isso explicitamente. Seja específico: um achado vago não serve.

## Tópico em revisão: 04-liberacao-dos-eleitores.md

# 4. Como os eleitores foram liberados para votar

> **Situação:** revisto em 29/10/2026 pela regra "só entra número reproduzido". Cada número deste tópico vem de uma de duas fontes: um parecer do revisor cético que o sustenta (`docs/analysis/cetico-revisor/01`, `06` e `10`), ou um recálculo independente feito sobre todas as seções (`scripts/auditoria/verifica-pericia-liberacao.mjs` e, para os casos do item 7, `scripts/auditoria/verifica-pericia-liberacao-logs.mjs`). O que não pôde ser reproduzido saiu do texto e aparece como **Pendente**, sem número. Os dois turnos estão completos nos itens 1, 4, 5 e 7 (28 unidades: 26 estados, DF e exterior). O teste do item 6.1 é **parcial**, e o item diz quais UFs entraram.

## A pergunta

Quantos eleitores votaram depois de pôr o dedo no leitor da urna, e quantos votaram sem isso? Quem liberou os que votaram sem digital? E essa liberação favoreceu algum dos dois candidatos?

## Resposta curta

- **Fato (recalculado):** no 2º turno, 87,3% dos eleitores foram liberados pela própria digital. 5,7% votaram sem digital porque a urna não tinha a digital deles, e 6,7% porque tinham digital, ela não foi reconhecida e a mesa os liberou à mão. Os 0,3% restantes são do exterior, onde ninguém votou com digital. **Fato (revisado, parecer 10, e recalculado):** sem o exterior, o total sem digital no Brasil é 12,4%.
- **Fato (recalculado):** das 8,6 milhões de liberações à mão, 2,8 milhões ficaram no log da urna sem nenhum mesário ligado a elas.
- **Fato (revisado, parecer 01):** em 16.011 seções, a urna liberou mais eleitores "sem biometria" do que o cadastro público diz existir. A causa medida é uma diferença de definição entre dois arquivos do TSE, e não eleitores a mais. Mas esses eleitores votaram sem nenhum controle técnico.
- **Fato (revisado, parecer 06), parcial (25 UFs; faltam SP, TO e exterior):** os eleitores que foram votar no 2º turno e não tinham ido no 1º se dividiram entre 13 e 22 da mesma forma, tenham sido liberados com ou sem digital. O teste pega uma inserção concentrada a partir de cerca de 34 mil votos, mas é cego a outros tipos de inserção (ver 6.1).
- **Pendente: em verificação.** Se as seções que liberam mais gente sem digital votam mais num dos candidatos, comparando seções parecidas (item 6.2).
- **Pendente:** se os eleitores liberados sem digital votaram majoritariamente no 13, e se isso foi mais forte no Nordeste. Os métodos estão escritos e rodando. Ainda não há resultado.
- **Limite que não muda:** o voto é secreto. Nenhum arquivo diz em quem votou o eleitor liberado sem digital. Esse voto só pode ser cercado por cima e por baixo, ou estimado pela comparação entre seções, mas nunca observado.

## Antes de começar: como uma pessoa é liberada para votar

Na seção, o mesário digita o número do título (ou o CPF) do eleitor no terminal da mesa. A partir daí, a urna segue um de três caminhos, e cada um deixa uma mensagem própria no diário da urna (o log):

| Caminho | O que acontece | Como aparece no boletim (BU) | Controle técnico? |
|---|---|---|---|
| **1. Pela digital** | A urna pede o dedo, a digital confere com a gravada no arquivo de eleitores da urna, o eleitor é liberado | "habilitados por biometria" | **Sim.** A digital do próprio eleitor fica registrada no log |
| **2. Pelo ano de nascimento** | A urna **não tem** a digital desse eleitor no arquivo dela. Ela não pede o dedo: pede só o ano de nascimento, que o mesário digita | "sem biometria cadastrada" | **Não.** Basta saber o título e o ano de nascimento |
| **3. Liberação manual** | O eleitor tem digital no arquivo, mas ela não é reconhecida (o log registra até 4 tentativas: `Solicita digital. Tentativa [n] de [4]`). A mesa digita um dado pessoal do eleitor e a urna aceita uma digital de quem estiver na mesa. Às vezes a urna liga essa digital a um mesário registrado, às vezes grava que não é possível associar a habilitação a um mesário | "habilitados por biografia" | **Não.** O dado pessoal é digitado por uma pessoa, e a digital gravada não é a do eleitor |

**Regra desta auditoria (princípio 8 de [../01-premissas.md](../01-premissas.md)):** só conta como controle o que é técnico e deixa rastro nos arquivos. Aqui, isso é só o caminho 1. Conferir o documento com foto, olhar a foto do eleitor que aparece na tela do mesário ou ter fiscal na seção são procedimentos feitos por pessoas. Eles podem ser ignorados ou combinados, então não contam como controle nem como explicação que reduza o risco. Os caminhos 2 e 3 são **brechas humanas**: dependem só do que alguém digita na mesa.

Brecha aberta não é prova de fraude. Este tópico mede se o uso dessas brechas deixou nos dados o padrão que uma fraude deixaria.

## Por que não dá para ver em quem o liberado votou

O log diz **como** cada eleitor foi liberado e a que horas. O Registro Digital do Voto (RDV) traz os votos da seção um a um, mas embaralhados e sem nenhuma ligação com o eleitor. Isso é o sigilo do voto, e é proposital. Então:

- não existe, em nenhum arquivo público, a informação "este eleitor, liberado sem digital, votou no 13";
- o que dá para fazer é **cercar**. Um exemplo inventado: numa seção com 200 votos, 190 para o 13 e 30 liberados sem digital, pelo menos 20 desses 30 votaram no 13, porque só sobram 10 votos que não foram para o 13;
- ou **estimar**, comparando muitas seções: se as que liberam mais gente sem digital votam mais num candidato, depois de descontar as diferenças de perfil entre elas. Essa estimativa se chama inferência ecológica: tira conclusões sobre pessoas a partir de totais de grupos, e pode errar quando os grupos são diferentes de formas que os dados não mostram.

Por isso, nenhum resultado deste tópico diz em quem um eleitor liberado votou. Os resultados dizem se o conjunto das liberações deixou um padrão compatível ou incompatível com votos inseridos a favor de um lado.

## O que foi encontrado

### 1. Quantos votaram com e sem digital

**Fato (recalculado).** O país tem 499.207 seções nos dois turnos. A tabela usa 499.176 delas: ficaram de fora as 31 seções em que o boletim de um dos turnos veio do Sistema de Apuração, e não da urna, porque esse boletim não divide os eleitores por forma de liberação. Entram as 28 unidades (26 estados, DF e exterior):

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

- **Fato:** em 16.011 das 497.508 seções do 2º turno analisadas (3,2%), o boletim registra mais votantes "sem biometria cadastrada" do que o perfil permite. O excesso soma 36.340 eleitores, 0,03% dos votos. Em 7.922 dessas seções, o perfil diz que 100% dos eleitores têm biometria.
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
- **Fato:** os testes de uso não acharam sinal de que essa porta tenha sido usada em larga escala. O comparecimento não sobe com o tamanho do grupo. As seções com excesso ficam de 0 a 1,7 ponto acima das vizinhas (5 pontos na zona 84 de Ulianópolis, com poucas seções). Na última hora de votação, há 0,49 ponto a mais de liberações sem biometria, cerca de 0,15 eleitor por seção.
- **Não sustentado:** ler este achado como voto a mais, contagem impossível ou uso de título de outra pessoa.

### 4. No exterior, ninguém votou com digital

- **Fato (recalculado):** nas 1.281 seções do exterior com voto, os 380.612 votos do 2º turno foram todos liberados pelo título (ou CPF) e ano de nascimento. Nenhum foi liberado pela digital, nem à mão. No 1º turno, 340.977 votos, também todos assim. O perfil do eleitorado (14/07/2026) registra 222.584 eleitores do exterior com biometria (24% de 918.876), e nem esses votaram com digital.
- **Hipótese (risco):** no exterior, quem souber o título e o ano de nascimento de um eleitor da seção pode votar no lugar dele sem barreira técnica nenhuma. Não dá para medir quantos fizeram isso. São 0,3% do comparecimento nacional.
- **Pendente:** perguntar ao TSE se a urna do exterior é preparada sem digitais ou se o programa desliga a biometria, e qual norma prevê isso.

Fonte: [../analysis/biometria-mesarios/07-exterior-sem-biometria.md](../analysis/biometria-mesarios/07-exterior-sem-biometria.md), reproduzido por `verifica-pericia-liberacao.mjs`.

### 5. Urnas antigas e liberação sem digital (H07)

A hipótese era que urnas de modelo antigo teriam sido mandadas para certas regiões para dispensar a biometria.

- **Fato (recalculado):** todo modelo usado no Brasil no 2º turno lê digital. As urnas de 2013 liberaram 82,2% dos eleitores pela digital, em 11.433 de 11.434 seções. A premissa de H07 (urna antiga não pede digital) não se confirma no Brasil.

| Modelo | Seções | Pela digital | Pelo ano de nascimento | Liberação manual |
|---|---|---|---|---|
| UE2013 | 11.434 | 82,2% | 7,0% | 10,8% |
| UE2015 | 87.213 | 84,1% | 6,3% | 9,6% |
| UE2020 | 200.504 | 88,4% | 5,5% | 6,0% |
| UE2022 | 198.746 | 88,6% | 5,4% | 6,0% |

2º turno, sem o exterior. Uma seção de SP (64777, zona 395, seção 298) não traz o modelo no log; o banco a registra como UE2013, e ela está contada nessa linha.

- **Fato (recalculado):** comparando cada seção só com as outras da mesma zona eleitoral, sem outros controles, o modelo quase não muda a liberação pelo ano de nascimento: no máximo 0,2 ponto a menos nas urnas de 2013, em relação às de 2022. Muda a liberação manual: +4,3 pontos nas urnas de 2013 e +3,2 nas de 2015, no 2º turno (+4,5 e +3,3 no 1º). Ou seja, nas urnas antigas a digital falha mais e a mesa libera mais à mão. Isso alarga a brecha humana.
- **Fato (recalculado):** com a mesma comparação, as urnas antigas estão em seções que votam **menos** no 13, entre os votos de 13 e 22: −1,4 ponto (2013) e −1,0 (2015) no 2º turno; −1,4 e −0,9 no 1º.
- **Pendente:** a mesma comparação descontando também o perfil do eleitorado da seção (idade e cadastro sem biometria). O primeiro autor a fez, mas ela ainda não foi reproduzida.
- **Hipótese (técnica):** leitor de digital mais antigo, que falha mais. Teste possível: contar no log as tentativas de digital por modelo.

Fonte: [../analysis/biometria-mesarios/06-h07-modelo-urna.md](../analysis/biometria-mesarios/06-h07-modelo-urna.md) e `verifica-pericia-liberacao.mjs` (regressão por seção, com efeito fixo de UF e zona, sem peso).

### 6. A liberação sem digital favoreceu algum lado?

Como o voto do liberado não pode ser observado, foram usados testes indiretos. Cada um enxerga um tipo de fraude e é cego a outros. Por isso cada resultado vem com o que ele **não** exclui.

Dois termos usados abaixo:

- **Comparar dentro da UF, do município ou da zona:** cada seção é comparada só com outras do mesmo lugar. Assim, diferenças entre estados (por exemplo, o Nordeste votar mais no 13) não se misturam com o efeito que se quer medir.
- **t:** mede o tamanho de um sinal em relação ao ruído. Em geral, abaixo de 2 (para mais ou para menos) o sinal não se distingue do acaso. Quando se fazem dezenas de testes ao mesmo tempo, o limite sobe (aqui, cerca de 3,3), porque alguns passam de 2 só por sorte.

#### 6.1. Quem foi votar só no 2º turno (revisado, parecer 06)

Se mesários tivessem liberado sem digital pessoas para votar no lugar de ausentes, a favor de um lado, os eleitores **a mais** do 2º turno liberados sem digital votariam diferente dos eleitores a mais liberados pela digital.

- **Fato, parcial (25 UFs; faltam SP, TO e exterior; 389.827 seções pareadas):** comparando seções da mesma UF, cada eleitor a mais liberado sem digital se dividiu entre 13 e 22 como cada eleitor a mais liberado pela digital. A diferença é +0,002 ± 0,002 para o 13 e −0,001 ± 0,002 para o 22. Comparando dentro do município, −0,002 e +0,001. Isso quer dizer que, em cada 1.000 eleitores a mais, a forma de liberação mudou o voto em cerca de 2 votos para um lado ou para o outro, dentro da margem do acaso.
- **Fato:** o modelo que o primeiro autor usou, sem comparar dentro da UF, dava um sinal a favor do 13 (t = 3,4) que é falso: ele some quando a comparação é feita dentro da UF. O revisor registrou isso como um caso em que a forma do cálculo, e não os dados, produzia o sinal.
- **Hipótese, a examinar:** no Paraná há um sinal a favor do 13 (diferença +0,025, t = 4,2; dentro do município, +0,012, t = 2,8). Em Minas Gerais, um sinal a favor do 22 (+0,019, t = 3,7; dentro do município, +0,008, t = 2,0). Os dois vão em direções opostas, e no Paraná a parcela de votantes sem digital **caiu** do 1º para o 2º turno (8,15% para 7,68%). Nenhum dos dois é Fato de inserção.

**O que este teste exclui e o que não exclui.** Pela simulação do revisor, ele detecta inserção a partir de cerca de 34 mil votos concentrados, que varie entre seções da mesma UF (por exemplo, 40 votos em 0,25% das seções ou 10 votos em 1% delas). Ele **não** detecta:

- inserção igual em todas as seções de uma UF (na simulação, 5 ou 10 votos por seção em toda a BA, até cerca de 355 mil votos, passam sem sinal);
- inserção pequena e espalhada (5 votos em 5% das seções mais favoráveis ao 13 não chegam a ser detectados);
- fraude do mesmo tamanho nos dois turnos, que some na diferença entre eles;
- uso da brecha em poucas seções.

#### 6.2. Seções que liberam mais votam mais no 13? (Pendente: em verificação)

A pergunta é se as seções que liberam mais gente sem digital votam mais no 13, comparando seções da mesma zona e descontando o perfil do eleitorado (idade, cadastro sem biometria, tamanho) e o modelo da urna, nos dois turnos. O primeiro autor fez essa conta ([../analysis/biometria-mesarios/05-a9-regressao.md](../analysis/biometria-mesarios/05-a9-regressao.md)), mas ela ainda não foi reproduzida de forma independente nem passou pelo revisor cético. Por isso, nenhum número dela entra aqui, e nenhuma conclusão sobre essa associação é tirada neste tópico.

Duas leituras terão de ser testadas quando o número existir:

- **Hipótese (demográfica):** se houver associação, ela pode vir de um perfil social das seções que os controles disponíveis não captam. Os dados abertos não trazem renda nem urbano/rural por seção, então isso não pode ser testado com eles.
- **Hipótese (risco):** uma fraude do mesmo tamanho nos dois turnos, sempre a favor do mesmo lado, deixaria uma associação parecida nos dois turnos.

#### 6.3. Seções com comparecimento muito alto (revisado, parecer 10)

Se mesários votassem no lugar de ausentes, as seções com quase todos os eleitores presentes teriam mais liberação manual que as vizinhas.

- **Fato:** no 2º turno, nenhuma seção tem comparecimento acima dos aptos. 639 seções passam de 95% e 12 chegam a 100%.
- **Fato:** nessas 639 seções, a liberação sem digital é 9,37%, contra 12,41% esperados pelas próprias zonas. A diferença vem toda dos eleitores sem digital na urna. Por que esse grupo pesa menos ali é Hipótese: pode ser a composição do cadastro ou esse eleitor faltar mais. A liberação manual de quem tinha digital (o único caminho para votar no lugar de um ausente que tem biometria) é igual à da zona: 7,58% contra 7,77%.
- **Fato:** somando as 639 seções, isso limita os votos no lugar de ausentes por esse caminho a cerca de 110 a 400, menos de 1 por seção. O teste **não** cobre fraude concentrada em poucas seções, voto pelo ano de nascimento no lugar de ausente sem digital, nem fraude que não passa pela urna (compra de voto, coação, transporte).
- **Fato:** o caso mais destacado (RN, João Câmara, município 17132, zona 10, seção 145, 36,4% sem digital contra 12,9% da zona) já era o primeiro da zona no 1º turno, com 87,8% de comparecimento e a mesma urna. Com o modelo estatístico correto, ele não passa de forma firme no teste. A probabilidade minúscula que circulou para esse caso vinha de um modelo errado e não deve ser citada.
- **Leitura revisada:** o resultado é **neutro** sobre a liberação manual. Não é prova contra nem a favor de mesários votando por ausentes.

#### 6.4. Os liberados votaram majoritariamente no 13, sobretudo no Nordeste? (Pendente)

Essa hipótese (registrada como H13) foi apresentada ao projeto e está em análise. Em 29/10/2026 havia cinco métodos escritos, cada um com o seu script, e nenhum resultado redigido ou revisado. Por isso, nenhum número dela entra aqui.

| Método | O que pergunta | Script |
|---|---|---|
| Descritivo | Onde e quanto se liberou sem digital, por região e por UF, nos dois turnos. Não tenta adivinhar voto | `scripts/auditoria/liberacao-descritivo-distribuicao.mjs` |
| Limites | Em cada seção, o mínimo e o máximo de liberados que podem ter votado no 13 e no 22, sem nenhuma suposição (o raciocínio de "Por que não dá para ver em quem o liberado votou"). Compara com o que se veria se a liberação fosse sorteada entre as seções da zona | `scripts/auditoria/liberacao-limites-deterministicos.mjs` |
| Comparação entre seções | Depois de descontar zona, perfil do eleitorado e eleitores liberados pela digital, as seções com mais liberados votam mais no 13? Por região e por UF do Nordeste | `scripts/auditoria/liberacao-ecologico-regressao.mjs` |
| Entre turnos | Quando uma seção liberou mais gente sem digital no 2º turno do que no 1º, o acréscimo acompanhou votos a mais no 13, além do que acompanha um eleitor a mais qualquer? Dois testes principais, no Nordeste, foram fixados antes de rodar, para não escolher o teste depois de ver o resultado | `scripts/auditoria/liberacao-entreturnos-painel.mjs` |
| Por mesário | Concentração das liberações por mesário (com pseudônimo, nunca o título) e relação com o voto | `scripts/auditoria/liberacao-mesarios-dados.mjs` |

O que já existe nos itens revisados e toca o Nordeste:

- **Fato (revisado, parecer 06, e recalculado com todas as seções das duas UFs):** a parcela de votantes sem digital quase não mudou entre os turnos em BA (12,01% para 12,26%) e PE (13,92% para 14,33%). Os nove estados do Nordeste estão entre as 25 UFs do teste do item 6.1, que não achou diferença de voto entre os eleitores a mais liberados com e sem digital. Esse teste não foi feito separado por região.
- **Fato (recalculado):** o Nordeste tem um pouco mais de urnas de 2013: 3,5% das seções da região, contra 1,8% nas demais (sem o exterior). Nelas a liberação manual sobe tanto no Nordeste (10,6% contra 6,4% nas urnas de 2022) quanto fora dele (11,0% contra 5,8%).

Qualquer resposta a essa pergunta será uma estimativa ou um cerco, pelo motivo explicado no início: o voto do liberado não é registrado em lugar nenhum.

### 7. "O eleitor identificado já votou"

Quando alguém digita o título de quem já votou, a urna avisa `O eleitor identificado já votou`. Esse aviso é o rastro de um relato frequente: "cheguei e alguém já tinha votado por mim".

- **Fato (recalculado):** no 2º turno, a urna deu esse aviso 113.979 vezes, em 73.246 das 499.177 seções com voto. Em 99,6% das seções que tiveram o aviso, ele aparece menos de uma vez a cada 20 votos.
- **Fato (recalculado, conferido no log bruto):** em 9 seções com 30 votos ou mais, cada uma numa zona diferente (AC, AM ×2, DF, GO, MA ×2, RS e exterior), o aviso aparece cerca de uma vez por voto, logo depois de cada voto: na mediana de cada seção, de 9 a 19 segundos depois do voto. Exemplo: AC, Bujari, zona 9, seção 440, com 130 votos e 130 avisos. **Hipótese:** o mesário redigitou o título de quem acabou de votar. Ver [../casos/ac-01007-z0009-s0440.md](../casos/ac-01007-z0009-s0440.md).
- **Fato (recalculado, conferido no log bruto):** uma única seção do 2º turno tem mais avisos do que votos: ES, Vila Velha, zona 55, seção 364, com 388 avisos e 275 votos. 382 desses avisos estão em 19 rajadas de 5 ou mais, sem nenhum voto entre eles. 386 dos 388 avisos vieram de um título digitado, e 2 de um CPF. A maior rajada teve 59 avisos entre 11h19 e 11h33. **Hipóteses, nenhuma testada:** consulta indevida de uma lista pela urna, ou alguém digitando títulos em sequência até achar um que ainda não tinha votado. Ver [../casos/es-57037-z0055-s0364.md](../casos/es-57037-z0055-s0364.md).

## Prova de que os testes funcionam (contraprova)

- **Leitura do log:** no Acre inteiro, as três formas de liberação contadas no log batem com o boletim nas 2.270 seções. O revisor registrou um limite: log e boletim saem do mesmo programa da urna, então a igualdade prova coerência interna, não que o arquivo de eleitores carregado na urna estava certo.
- **Item 3:** um segundo caso, que o autor não tinha olhado, foi conferido no arquivo bruto do perfil (ES, Vitória, zona 52, seção 33: perfil com 394 de 394 eleitores com biometria, boletim com 19 e 20 sem biometria nos dois turnos). O marcador da foto foi medido por dois revisores, com seções diferentes.
- **Item 3, poder do teste de uso:** votos falsos do tamanho observado, injetados de propósito em 28% das seções, foram detectados em 10 de 10 repetições. Em 5% das seções, em 8 de 10. **O teste não tem poder para uso em poucas seções ou com poucos eleitores por seção.** O que está provado é que não houve uso amplo, e não que não houve uso.
- **Item 6.1:** o revisor inseriu votos falsos nos dados reais e mediu o que o teste pega e o que não pega (tabela do parecer 06). Foi assim que se chegou aos pontos cegos listados em 6.1.
- **Item 6.3:** em simulação, seções levadas a 95% de comparecimento só com votos falsos sem digital (16 em média por seção) foram marcadas em 0,6% das vezes. O teste por seção é fraco. O teste do conjunto das 639, pelo caminho da digital que falhou, é forte.
- **Itens 1, 4, 5 e 7:** os números foram recalculados de forma independente, de todas as seções dos dois turnos, e os casos do item 7 foram conferidos no log bruto. Esses itens são contagens; ainda não passaram por um parecer do revisor cético.

## O que este resultado prova e o que não prova

**Prova:**

- quantos eleitores votaram com e sem a própria digital, seção por seção, no país inteiro;
- que existem duas brechas humanas, usadas por 12,4% dos eleitores no Brasil e por 100% no exterior;
- que o excesso de "sem biometria" sobre o cadastro vem de uma diferença entre arquivos do TSE, e não de eleitores a mais;
- que não houve uso da brecha **em larga escala e concentrado** a favor de um lado, nas 25 UFs testadas.

**Não prova:**

- que cada eleitor liberado sem digital era quem dizia ser. Nenhum arquivo público permite saber isso;
- que não houve uso da brecha em poucas seções, de forma espalhada por igual numa UF inteira, ou no mesmo tamanho nos dois turnos;
- em quem os liberados votaram. Isso só pode ser cercado ou estimado (item 6.4, Pendente);
- nada sobre fraude que não passa pela urna: compra de voto, coação, transporte de eleitor.

## Limites

1. **O voto é secreto.** A ligação entre a forma de liberação e o voto não existe nos arquivos. Todo resultado sobre "em quem votou o liberado" é estimativa ou cerco.
2. **A pessoa diante da urna não é identificada nos caminhos 2 e 3.** Pelo princípio 8, a conferência de documento e de foto não conta como controle, e ela não deixa rastro.
3. **O log não separa digital que falhou de dedo trocado.** E, em 2,8 milhões de liberações manuais, nem diz de quem era o dedo.
4. **Cadastro desatualizado.** O perfil público é de 14/07/2026, e as urnas foram preparadas entre 16 e 29/09/2026. Em algumas zonas, eleitores mudaram de seção nesse intervalo (caso RN do parecer 10), e a comparação seção a seção perde valor ali.
5. **Sem renda e sem urbano/rural por seção.** Os dados abertos não trazem esses dados, então explicações sociais para diferenças entre seções não podem ser testadas com eles.
6. **1º turno parcial** no teste do item 6.1 (sem SP, TO e exterior). O 1º turno do item 3 está pendente.
7. **O caderno de votação não é público.** É a única fonte que diria quem assinou como eleitor em cada seção. Só pode ser obtido por pedido formal.

## Como repetir

```
node --max-old-space-size=8000 scripts/auditoria/verifica-pericia-liberacao.mjs   # itens 1, 2, 4, 5, 6.4 e 7: recálculo de todas as seções
node src/exportar.js --uf es --municipio 57037 --zona 0055 --secao 0364 --saida <dir>   # item 7: log bruto (idem para as 9 seções)
node scripts/auditoria/verifica-pericia-liberacao-logs.mjs <dir>                  # item 7: rajadas e atraso depois do voto
node scripts/habilitacao-1t-2t.mjs                                   # item 1: conta do autor
node --max-old-space-size=4096 scripts/auditoria/cetico-b1a-consolidacao.mjs   # item 3: revisão
node scripts/auditoria/cetico-b1a-log.mjs --turno 2 --por-zona 5 --controles 40  # item 3: marcador da foto
node scripts/auditoria/cetico-e2bio-consolidacao.mjs                 # item 6.1: revisão
node scripts/auditoria/cetico-a7-consolidacao.mjs                    # item 6.3: revisão
node scripts/ja-votou-por-voto.mjs                                   # item 7: conta do autor
```

Os detalhes técnicos estão em [../analysis/biometria-mesarios/](../analysis/biometria-mesarios/01-metodo-e-dados.md) e nos pareceres [01](../analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md), [06](../analysis/cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md) e [10](../analysis/cetico-revisor/10-a7-comparecimento-alto-sem-digital.md).

## Próximos passos

- **Pendente:** terminar H13 (item 6.4), com os cinco métodos, e passar pelo revisor cético.
- **Pendente:** reproduzir de forma independente a comparação do item 6.2 e a do item 5 com os controles de perfil do eleitorado, e passar as duas pelo revisor cético.
- **Pendente:** parecer do revisor cético para as contagens dos itens 1, 2, 4, 5 e 7.
- **Pendente:** medir o marcador da foto nas 16.011 seções do item 3, nas seções sem excesso e no país inteiro, para saber o tamanho real do grupo "tem foto, não tem digital na urna".
- **Pendente:** refazer o 1º turno do item 3 com todas as UFs e com as seções agregadas corrigidas, e repetir o teste do item 6.1 com todas as UFs.
- **Pendente:** medir, no país inteiro, a maior rajada de "já votou" sem voto entre eles por seção, e ver como foram liberados os eleitores logo depois das rajadas da seção 364 de Vila Velha.
- **Pendente:** olhar no log as seções do Paraná que puxam o sinal do item 6.1.
- **Pendente (pedidos pela LAI ao TSE):** o critério de "biometria cadastrada" no perfil público e no arquivo da urna; o número de eleitores com digital carregada na urna, por seção; a lista de zonas em revisão biométrica em 2026; a regra que desliga a digital no exterior; o critério de distribuição dos modelos de urna; o caderno de votação das seções destacadas.


## Tabela nacional de referência (gerada por script sobre o universo completo do 2º turno)

# Números nacionais do 2º turno (universo completo)

Gerado por `node scripts/auditoria/nacional-resumo.mjs` sobre a cópia de leitura do banco (2026-10-29T09:27:11.866Z). Todas as seções do 2º turno; nenhuma amostra (princípio 9).

## 1. Votos depois das 17h de Brasília

Fonte: diário (log) de cada urna, contagem de "O voto do eleitor foi computado" por hora local, convertida para Brasília pelo fuso de cada município (moda da hora de "urna pronta", que é 08:00 de Brasília). **Exterior:** vota no horário local de cada país, então ali se conta após 17h **locais**. Seções sem horário de "urna pronta" para estimar o fuso: 29.

| Região | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
| Norte | 43.769 | 3.158 | 3.535 | 4 | 0 | 0,03 |
| Nordeste | 140.828 | 8.576 | 9.975 | 462 | 2 | 0,03 |
| Centro-Oeste | 38.048 | 2.704 | 3.045 | 3 | 0 | 0,03 |
| Sudeste | 203.236 | 13.358 | 15.557 | 1.524 | 9 | 0,03 |
| Sul | 72.015 | 2.058 | 2.218 | 0 | 0 | 0,01 |
| Exterior | 1.281 | 252 | 417 | 0 | 0 | 0,11 |
| **Brasil (sem exterior)** | 497.896 | 29.854 | 34.330 | 1.993 | 11 | 0,03 |
| **Total com exterior** | 499.177 | 30.106 | 34.747 | 1.993 | 11 | 0,03 |

Por UF:

| UF | Seções com log | Seções com voto após 17h | Votos após 17h | Após 18h | Após 19h | % dos votos do log |
|---|---|---|---|---|---|---|
| AC | 2.270 | 141 | 158 | 0 | 0 | 0,03 |
| AL | 7.101 | 552 | 646 | 0 | 0 | 0,03 |
| AM | 8.157 | 879 | 1.004 | 0 | 0 | 0,05 |
| AP | 1.914 | 131 | 142 | 0 | 0 | 0,03 |
| BA | 35.476 | 3.449 | 4.190 | 287 | 2 | 0,04 |
| CE | 23.765 | 960 | 1.074 | 1 | 0 | 0,02 |
| DF | 6.969 | 876 | 980 | 2 | 0 | 0,05 |
| ES | 9.844 | 269 | 294 | 0 | 0 | 0,01 |
| GO | 15.686 | 643 | 734 | 0 | 0 | 0,02 |
| MA | 18.093 | 828 | 921 | 10 | 0 | 0,02 |
| MG | 52.062 | 2.084 | 2.253 | 0 | 0 | 0,02 |
| MS | 7.106 | 388 | 422 | 0 | 0 | 0,03 |
| MT | 8.287 | 797 | 909 | 1 | 0 | 0,04 |
| PA | 20.827 | 1.173 | 1.308 | 4 | 0 | 0,03 |
| PB | 10.712 | 416 | 471 | 41 | 0 | 0,02 |
| PE | 21.418 | 1.436 | 1.636 | 113 | 0 | 0,03 |
| PI | 10.225 | 299 | 337 | 1 | 0 | 0,02 |
| PR | 27.142 | 877 | 926 | 0 | 0 | 0,01 |
| RJ | 37.675 | 3.431 | 4.150 | 883 | 4 | 0,04 |
| RN | 8.115 | 372 | 413 | 2 | 0 | 0,02 |
| RO | 4.698 | 496 | 555 | 0 | 0 | 0,06 |
| RR | 1.519 | 135 | 145 | 0 | 0 | 0,05 |
| RS | 27.547 | 748 | 829 | 0 | 0 | 0,01 |
| SC | 17.326 | 433 | 463 | 0 | 0 | 0,01 |
| SE | 5.923 | 264 | 287 | 7 | 0 | 0,02 |
| SP | 103.655 | 7.574 | 8.860 | 641 | 5 | 0,03 |
| TO | 4.384 | 203 | 223 | 0 | 0 | 0,02 |
| ZZ | 1.281 | 252 | 417 | 0 | 0 | 0,11 |

## 2. Habilitação sem digital e parcela do 13

Fontes: BU de cada urna (detalhamento do comparecimento, especificação oficial) e log (liberações com registro do mesário). A "% 13" é a parcela do 13 entre os votos 13 + 22 de **todas** as seções do recorte. Ela mostra onde os votos sem digital aconteceram, não como esses eleitores votaram, porque o voto é secreto (ver H13).

| Recorte | Comparecimento (BU) | Sem biometria cadastrada (ano de nascimento) | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
| Norte | 10.317.110 | 376.554 | 560.476 | 937.030 | 9,08 | 385.951 | 50,01 |
| Nordeste | 36.335.632 | 1.658.304 | 2.611.075 | 4.269.379 | 11,75 | 1.795.037 | 69,37 |
| Centro-Oeste | 9.595.354 | 387.894 | 605.894 | 993.788 | 10,36 | 425.854 | 39,99 |
| Sudeste | 52.895.255 | 3.967.830 | 3.421.710 | 7.389.540 | 13,97 | 2.219.043 | 47,24 |
| Sul | 18.711.280 | 861.228 | 1.433.333 | 2.294.561 | 12,26 | 1.015.209 | 37,42 |
| Exterior | 380.612 | 0 | 0 | 0 | 0,00 | 0 | 53,86 |
| **Brasil** | 128.235.243 | 7.251.810 | 8.632.488 | 15.884.298 | 12,39 | 5.841.094 | 51,79 |

Por UF:

| UF | Comparecimento (BU) | Sem biometria cadastrada | Biometria falhou → dado pessoal | Total sem digital | % do comparecimento | Liberações com registro do mesário (log) | % 13 entre 13+22 |
|---|---|---|---|---|---|---|---|
| AC | 453.654 | 15.325 | 22.654 | 37.979 | 8,37 | 15.680 | 33,43 |
| AL | 1.951.632 | 69.950 | 135.874 | 205.824 | 10,55 | 96.551 | 60,77 |
| AM | 2.192.059 | 95.104 | 118.955 | 214.059 | 9,77 | 81.200 | 54,02 |
| AP | 429.975 | 15.323 | 19.685 | 35.008 | 8,14 | 13.775 | 52,88 |
| BA | 9.422.047 | 452.648 | 702.255 | 1.154.903 | 12,26 | 441.566 | 71,31 |
| CE | 6.024.843 | 243.464 | 429.294 | 672.758 | 11,17 | 307.281 | 68,93 |
| DF | 1.868.280 | 59.213 | 84.114 | 143.327 | 7,67 | 59.627 | 45,72 |
| ES | 2.409.214 | 507.891 | 151.401 | 659.292 | 27,37 | 97.838 | 43,63 |
| GO | 4.047.280 | 180.295 | 268.656 | 448.951 | 11,09 | 187.598 | 40,34 |
| MA | 4.127.771 | 150.516 | 259.852 | 410.368 | 9,94 | 170.045 | 69,54 |
| MG | 13.044.203 | 1.502.075 | 887.910 | 2.389.985 | 18,32 | 580.336 | 50,43 |
| MS | 1.594.460 | 67.852 | 115.545 | 183.397 | 11,50 | 82.538 | 40,40 |
| MT | 2.085.334 | 80.534 | 137.579 | 218.113 | 10,46 | 96.091 | 33,94 |
| PA | 4.989.573 | 199.204 | 277.373 | 476.577 | 9,55 | 183.890 | 55,02 |
| PB | 2.743.560 | 82.348 | 199.353 | 281.701 | 10,27 | 147.473 | 67,46 |
| PE | 6.126.467 | 477.992 | 399.764 | 877.756 | 14,33 | 283.892 | 69,20 |
| PI | 2.239.830 | 44.724 | 201.641 | 246.365 | 11,00 | 138.605 | 75,88 |
| PR | 7.059.339 | 49.132 | 493.321 | 542.453 | 7,68 | 367.600 | 37,42 |
| RJ | 10.077.449 | 727.958 | 750.301 | 1.478.259 | 14,67 | 484.610 | 46,90 |
| RN | 2.232.823 | 83.833 | 180.838 | 264.671 | 11,85 | 135.318 | 65,72 |
| RO | 988.489 | 15.945 | 61.938 | 77.883 | 7,88 | 47.466 | 30,39 |
| RR | 308.597 | 9.093 | 12.646 | 21.739 | 7,04 | 9.518 | 27,54 |
| RS | 6.889.638 | 559.431 | 582.380 | 1.141.811 | 16,57 | 398.026 | 42,16 |
| SC | 4.762.303 | 252.665 | 357.632 | 610.297 | 12,82 | 249.583 | 30,58 |
| SE | 1.466.659 | 52.829 | 102.204 | 155.033 | 10,57 | 74.306 | 69,53 |
| SP | 27.364.389 | 1.229.906 | 1.632.098 | 2.862.004 | 10,46 | 1.056.259 | 46,15 |
| TO | 954.763 | 26.560 | 47.225 | 73.785 | 7,73 | 34.422 | 48,63 |
| ZZ | 380.612 | 0 | 0 | 0 | 0,00 | 0 | 53,86 |

