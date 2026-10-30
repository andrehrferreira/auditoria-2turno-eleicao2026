# 29. Parecer: H09, os arquivos públicos permitem ligar voto a eleitor?

Achado revisado: [engenheiro-seguranca-urna/05-h09-sigilo.md](../engenheiro-seguranca-urna/05-h09-sigilo.md), script `scripts/auditoria/seguranca-h09-sigilo.mjs` (commit `947e17d`), saídas em `data/parsed/auditoria/engenheiro-seguranca-urna/h09/{1t,2t}/`. Revisão de 30/10/2026.

**Universo: completo.** Fiz uma reimplementação independente (`scripts/auditoria/cetico-h09-sigilo.mjs`) e a rodei sobre os dois turnos inteiros num só processo-mestre: 499.248 seções por turno, 499.207 pacotes, 41 seções sem pacote, 0 falhas de leitura. Isso permite cruzar os números da suspensão com os papéis do país **nos dois turnos** ao mesmo tempo. O teste da cédula de MG está em `scripts/auditoria/cetico-h09-cedula.mjs`. A parte das seções pequenas foi conferida também pelo banco (`voto_rdv`). Também rodei o script do engenheiro no AC (1º e 2º turnos) e comparei linha a linha com o meu.

**Privacidade.** Nenhum título ou CPF foi gravado. Os números ficam só na memória dos processos. A saída passa por uma trava que remove qualquer sequência de 10 a 12 dígitos com DV de título ou de CPF (não disparou). Não usei `data/private/` nem a base de CPFs.

## Resposta curta

| # | Afirmação | Veredito | Em uma linha |
|---|---|---|---|
| 1 | O RDV publicado está ordenado por (tipo, digitação) em 100% das listas da urna; o teste com âncora no tempo dá acaso | **Sustentado** | Reproduz exatamente: 539.788 e 2.490.766 listas, todas ordenadas. Nenhum tipo de voto fora do enum (o comparador do autor aceitaria em silêncio uma lista com tipo desconhecido, mas isso não ocorreu). O voto só tem dois campos, tipo e digitação; numa lista ordenada, a ordem não guarda informação. A âncora coincide **menos** que o acaso (431 contra 664 esperados no 1º turno) |
| 2 | Cédulas do SA em 2 seções de MG: 9 listas na ordem de digitação; hipótese de que a posição liga a cédula inteira | **Sustentado com ressalvas; a hipótese passa a ter evidência** | No bruto, as posições das listas de deputado federal e estadual estão alinhadas por cédula (p ≤ 0,00001 nas duas seções). Governador e par de senador alinham em uma seção (p ≈ 0,001). **Presidente não alinha** com governador. O RDV publica a combinação de **cada cédula** (proporcional e, numa seção, majoritária estadual), não "a cédula inteira de todos os cargos" |
| 3 | Seções pequenas: comparecimento 1 em nenhuma; 30 e 17 unânimes para presidente; mesário eleitor da seção nelas | **Sustentado com uma correção de texto** | Reproduz pelo script e pelo banco. A seção do exterior com 2 eleitores **já está entre as 17**; o texto a conta como se fosse a mais |
| 4 | A suspensão publica títulos com DV válido que não são de mesário (55.978 e 5.582 no dia); hipótese forte de ser o título do eleitor suspenso | **Sustentado com ressalvas; os números precisam ser corrigidos e separados** | O fenômeno é real e não é bug. Mas: (a) 55.978 é contagem de **linhas**, não de títulos (são 31.764 números distintos no 1º turno); (b) 457 linhas são o título que o próprio presidente digitou para encerrar aquela urna; (c) o critério só olhava o mesmo turno. Com o cruzamento nos dois turnos: **55.483 linhas e 31.764 números** no 1º turno, **5.564 linhas e 3.801 números** no 2º. Cada número aparece em uma única seção do país. A hipótese do título do eleitor ganhou um teste novo e forte (o título de mesário só é recusado quando o mesário é eleitor da seção: 197 de 200). Ela vale para o **"inválido"**. Para o **"válido"**, o dono continua desconhecido. As 11.871 sessões terminadas em nulo misturam os dois grupos |
| 5 | Controle positivo (7.542.425 de 7.542.425) e "fora disso, nenhuma mensagem traz número com DV de título" | **Sustentado com ressalvas** | O DV está certo: duas implementações independentes concordam, e 100% dos títulos de mesário passam. A parte "papel de mesário" do controle é circular. A frase final precisa de ressalva: `Título digitado para encerramento` também publica títulos fora de qualquer registro (5.688 linhas no 1º turno) e 182 a 352 números de 11 dígitos com DV de CPF. A busca só pega números de 10 a 12 dígitos |

**Nada derruba o achado principal.** O log público de votação traz, na mensagem de suspensão, números de 12 dígitos com DV de título válido que não pertencem a mesário, operador nem presidente registrado em nenhuma urna do país, nos dois turnos. Estão dentro da sessão de um eleitor e têm data e hora. Isso é **Fato**, reproduzido no universo. O que continua **Hipótese** (forte para o "inválido") é que o número seja o título do próprio eleitor suspenso. Confirmar exige a lista de eleitores da seção ou a regra técnica da suspensão: **Pendente**.

---

## 1. A ordem do RDV

**Reprodução (Fato, universo).**

| Origem / tipo de urna | 2º turno: listas, ordenadas | 1º turno: listas, ordenadas |
|---|---|---|
| Urna de seção (votacaoUE) | 533.659, 533.659 | 2.475.472, 2.475.472 |
| Urna reserva (votacaoUE) | 6.110, 6.110 | 15.044, 15.044 |
| RED (seção, reserva, reserva encerrando) | 19, 19 | 250, 250 |
| **Total de listas geradas por urna** | **539.788, todas** | **2.490.766, todas** |
| SA manual (exterior, cédula) | 29, 29 | 29, 29 |
| SA misto, cédula (MG) | — | 10, 1 |
| SA misto, cópia do BU (MG) | — | 10, 6 |

- Só 18 listas de urna do 1º turno e 34 do 2º têm um único valor (seção unânime naquele cargo). Todas as outras têm dois ou mais valores e estão ordenadas. A ordenação não é trivial.
- **Bug procurado e não encontrado.** No script do autor, um tipo de voto que o decodificador não reconhece vira `desconhecido(N)`. Isso faz `CODIGO_TIPO` ficar indefinido, a comparação dar `NaN` e a lista **passar como ordenada** sem aviso. Na minha versão, a ordem do enum está escrita à mão e os tipos desconhecidos são contados: **0 nos dois turnos**. O resultado do autor não foi afetado.
- **Poder do teste.** O registro de cada voto tem só dois campos, `tipoVoto` e `digitacao` (a especificação do RDV; nenhum campo a mais foi decodificado em nenhuma lista). Numa lista ordenada por esses dois campos, votos iguais são indistinguíveis. **Qualquer** ordem de chegada gera o mesmo arquivo. A ordenação de 100% já é a prova; o teste da âncora é redundante.
- **Âncora (Fato).** 1º turno: 135.770 linhas de nulo por suspensão no dia; 84.075 comparáveis; 431 coincidências. Pelo acaso, com a posição do eleitor uniforme na sessão, seriam esperadas **664** (soma de k/n). 2º turno: 1 coincidência em 606 comparáveis, contra 2,71 esperadas pelo acaso. O autor tem 619 comparáveis porque inclui 13 linhas de prefeito (eleição suplementar); a passada completa do meu script não reconhecia esse cargo e as excluiu (o mapa foi corrigido depois; a conclusão não muda). A coincidência fica abaixo do acaso porque o `nuloAposSuspensao` está sempre no fim da lista e o eleitor suspenso raramente é o último a votar. Se o RDV seguisse a ordem de votação, a coincidência seria de 100%. O teste tem poder pleno contra essa alternativa.

**Outros caminhos para recuperar a ordem, testados:**
- *Lista com 1 voto:* nenhuma seção tem comparecimento 1, pelo RDV (os dois turnos) e pelo banco (`secao.comparecimento`: 0 seções com valor 1; os 31 e 29 zeros são seções do SA, cujo BU não traz comparecimento).
- *Seção com um só nulo por suspensão:* 60.262 dos eventos comparáveis do 1º turno estão em listas com um único `nuloAposSuspensao`. Nesses casos o RDV só **confirma** o que o log já diz (aquele eleitor, naquela hora, ficou com nulo naquele cargo). Não revela os cargos que ele confirmou antes da suspensão, porque cada cargo é ordenado à parte.
- *Cargo com poucos votos:* o que revela voto é a seção unânime (parte 3), não a ordem.

**O que não foi testado (limite, não falha):** o RDV dentro da urna e o da mídia de resultado não são públicos.

**Veredito: sustentado.**

## 2. As cédulas das 2 seções de MG

**Reprodução (Fato, no bruto).** MG 41238/0039/0168 e MG 50075/0047/0041, 1º turno, `contingencia / saMistaBUImpressoCedula`. Cada uma tem 20 cédulas digitadas no Sistema de Apuração (`origemVotosSA = cedula`). Das 10 listas de cédula, 9 estão fora de ordem. A exceção é presidente em MG 41238, que veio perfeitamente ordenada (12 votos no 13, 6 no 22, 1 no 30 e 1 branco), o que sugere que essas cédulas foram separadas em pilhas antes da digitação.

**A hipótese da cédula, agora testada** (`cetico-h09-cedula.mjs`, permutação com 200.000 rodadas e semente fixa):

| Teste | MG 41238/0039/0168 | MG 50075/0047/0041 |
|---|---|---|
| Dep. federal × estadual: mesmo partido, ou branco/nulo, na mesma posição | 12 de 20, p = 0,000005 | 11 de 20, p = 0,00001 |
| Dep. federal × estadual: só branco/nulo coincidentes | 1, p = 0,05 | 4, p = 0,0005 |
| Governador × par de senador: branco/nulo coincidentes | 1, p = 0,15 | 4, p = 0,001 |
| Presidente × governador: branco/nulo coincidentes | 1, p = 0,15 | **0, p = 1** |
| Senador: pares (2i, 2i+1) com o mesmo candidato duas vezes | 0 (deslocados: 1) | 0 (deslocados: 2) |

**Leitura (Fato para a cédula proporcional; Hipótese forte para a majoritária).**
- Nas duas seções, a posição i de deputado federal e de deputado estadual é a **mesma cédula proporcional**. O RDV publica, para cada uma dessas 40 cédulas, o par completo (federal, estadual).
- Em MG 50075, a posição i de governador e o par i de senador são a **mesma cédula majoritária**. O RDV publica o trio (governador, senador, senador). Em MG 41238 o teste não tem poder (há poucos brancos e nulos).
- Presidente é outra eleição no RDV (6257) e não segue a ordem do governador. A ligação entre cargos fica **dentro de cada lista de cédula**, não entre presidente e os cargos estaduais, nem entre a cédula proporcional e a majoritária.

**Alcance.** São 40 cédulas proporcionais (as 2 seções) e 20 majoritárias (MG 50075). A cédula não tem nome. O risco é o de "assinar" a cédula com uma combinação combinada (canal de conferência para compra de voto), e não o de identificar quem votou. A ordem é a de digitação. O texto do autor diz que é a da saída das cédulas da urna de lona. Isso não foi testado: os arquivos não guardam a ordem de votação dessas cédulas.

**Veredito: sustentado com ressalvas.** A frase "o arquivo publica a cédula inteira de cada um desses 40 eleitores" deve virar: "publica a combinação de cada cédula proporcional (40) e, em MG 50075, de cada cédula majoritária estadual (20); presidente não segue essa ordem".

## 3. Seções pequenas e unânimes

**Reprodução (Fato, universo, duas rotas).**

| | 2º turno | 1º turno | Rota |
|---|---|---|---|
| Seções com comparecimento 1 (RDV) | 0 | 0 | script |
| Comparecimento 1 (BU, `secao`) | 0 | 0 | banco |
| Unânimes para presidente | 30 (3.100 eleitores) | 17 (1.107) | script e banco |
| Unânimes para governador | 4 (509) | 2 (85) | script e banco |
| Unânimes para deputado federal | — | 1 (297) | script e banco |
| Seções com algum cargo unânime / com mesário eleitor da seção no dia | 33 / 31 | 20 / 18 | `notaveis.jsonl` |

- **Correção de texto.** A seção ZZ 30686/0001/0443 (2 eleitores, unânime) **está entre as 17** do 1º turno. O texto diz "17 para presidente (1.107) [...] além de uma seção do exterior com 2 eleitores", como se fosse a mais.
- **"O voto do mesário fica revelado".** É condicional e o texto do autor diz isso. O log diz que o mesário é eleitor da seção, mas não diz se ele votou. A brecha existe.
- O banco (`voto_rdv`) dá os mesmos 17/2/1 e 30/4 seções, com os mesmos eleitores. A rota é independente do script.

**Veredito: sustentado** (com a correção de texto).

## 4. Os títulos da suspensão (achado principal)

### 4.1 Reprodução e correção dos números

Linhas `Título <n> é válido / inválido para suspender a votação` **no dia da eleição** de cada turno, classificadas pelo papel do número. Primeiro na própria urna, depois no país, com os papéis dos **dois turnos** juntos.

| | 1º turno: válido | 1º turno: inválido | 2º turno: válido | 2º turno: inválido |
|---|---|---|---|---|
| Linhas no dia | 82.404 | 55.959 | 8.498 | 4.990 |
| Repetidas no mesmo pacote (log aninhado) | 1 | 0 | 0 | 0 |
| DV de título inválido | 0 | 12.068 | 0 | 1.364 |
| Mesário registrado na própria urna | 69.912 | 200 | 6.507 | 10 |
| **Título que o presidente digitou para encerrar a própria urna** | **457** | **5** | **18** | 0 |
| Operador da própria urna | 2 | 0 | 0 | 0 |
| Sem papel na urna | 12.032 | 43.686 | 1.973 | 3.616 |
| … mesário em outra urna, mesmo turno | 91 | 104 | 20 | 5 |
| … mesário só no **outro** turno | 14 | 21 | 0 | 0 |
| … operador ou encerramento em outra urna | 5 | 0 | 0 | 0 |
| **… sem papel nenhum no país (2 turnos)** | **11.922** | **43.561** | **1.953** | **3.611** |
| Fora da janela de um eleitor | 0 | 0 | 0 | 0 |

**Números distintos sem papel nenhum no país:** 31.764 no 1º turno e 3.801 no 2º. **Em quantas seções cada número aparece:** em uma só, para todos os números do 2º turno e para todos menos 1 do 1º (que aparece em 2). Dos 31.942 números sem papel na urna no 1º turno, 25 aparecem também no 2º, todos na mesma seção.

**Correções ao texto do autor:**
1. **55.978 e 5.582 são linhas, não títulos.** O inválido é redigitado várias vezes na mesma sessão (abaixo). O número de pessoas possíveis é o de números distintos: 31.764 e 3.801.
2. **457 linhas válidas do 1º turno (18 do 2º) são o título do presidente da mesa.** É o mesmo número que ele digitou em `Título digitado para encerramento` naquela urna. Ou seja, é um membro da mesa sem registro biométrico, não um eleitor. O autor conta essas linhas como "sem papel".
3. **O critério "não é mesário em nenhuma urna do país" olhava só o mesmo turno.** Pesa pouco, mas existe: 35 linhas do 1º turno são de quem se registrou como mesário só no 2º turno.
4. Com isso, os números corretos de linhas sem papel nenhum, no dia, são **55.483** (1º turno: 11.922 válidas e 43.561 inválidas) e **5.564** (2º: 1.953 e 3.611).
5. Na tabela do autor, a coluna "2º turno, dia 25/10" mistura dados do dia com dados de **todos os períodos** do log (que incluem o 1º turno das urnas reaproveitadas): as linhas "Urnas com 2+ janelas" e "liberado pelo título, todos os períodos". Os números do dia são os desta tabela.

**A contagem dupla do 2º turno** (log desde a carga) foi tratada pelo autor com o filtro da data. Eu conferi: no dia 25/10 não há linha repetida no mesmo pacote. No 1º turno há 1.

### 4.2 Explicações alternativas: testadas

| Explicação | Como testei | Resultado |
|---|---|---|
| **Bug de leitura** (coluna errada, número de outra linha) | Varredura própria por posição de tabulação; cada número vem da própria mensagem; o caso AC 01040/0004/0075 (1º turno) foi conferido no bruto | Não é bug. A mensagem traz o número |
| **Título do mesário digitado errado** | Distância (dígitos diferentes) ao título de mesário mais próximo da urna; modelo: 1,34% dos erros de 1 dígito num título de mesário ainda passam no DV (2.886.318 de 215.164.080 trocas simuladas sobre os 1.992.260 títulos de mesário do 1º turno) | Os inválidos com DV errado parecem erros de digitação: 1.037 a 1 dígito e 386 a 2 dígitos de um mesário. Por esse modelo, cerca de 19 erros passariam no DV. Os sem papel estão longe: no 1º turno, 52 válidos e 33 inválidos a 2 dígitos ou menos, e o grosso a 6 dígitos ou mais. **Erro de digitação explica menos de 0,2%** |
| **Outro mesário, não registrado naquela urna** | Cruzamento com todos os mesários do país nos dois turnos e com o título de encerramento | Explica 230 linhas no 1º turno e 25 no 2º (mesário em outra urna, ou só no outro turno), mais as 462 e 18 do presidente da própria urna e 7 de operador (2 na própria urna, 2 em outra) ou de encerramento em outra urna (3), no 1º turno. Os 55.483 e 5.564 restantes não são mesários registrados em lugar nenhum |
| **Fiscal, servidor ou mesmo "título de serviço"** que circula entre seções | Em quantas seções o mesmo número aparece; papel de operador (servidor que gera mídia) no país | Cada número aparece em **uma só seção** (31.763 de 31.764 e 3.801 de 3.801). Nenhum é operador. Quem circula apareceria em várias seções do mesmo local |
| **Membro da mesa nomeado e sem registro**, que suspende sempre | O mesmo número volta em outra suspensão da mesma urna? E no outro turno? | Na mesma urna, quase sempre muda (861 de 1.007 urnas no válido; 627 de 651 no inválido, números do autor). Entre turnos, na mesma seção: 25 dos 31.942 números sem papel do 1º turno (0,08%) voltam no 2º, todos na mesma seção. Controle, **só no AC** (conferência, não universo): 21 de 496 pares mesário registrado × seção que suspenderam no 1º turno voltam a suspender no 2º (4,2%), contra 2 de 266 números sem papel (0,8%). Ver a nota sobre o poder deste teste abaixo |
| **Eleitor de outra seção** | Número em mais de uma seção | Não aparece em outra seção |
| **Título do próprio eleitor em sessão** (hipótese do autor) | Tipo de identificação do eleitor da sessão; o que vem depois do inválido; título de **mesário** recusado | Ver 4.3 |

**Nota sobre o poder do teste entre turnos.** Suspensões são raras no 2º turno (8.498 válidas, contra 82.404 no 1º). Por isso, mesmo um membro fixo da mesa voltaria a aparecer pouco. O controle com os mesários registrados, medido só no AC, mostra o teto: 4,2%. A passada nacional do controle foi interrompida e não foi refeita (precisa dos dois turnos juntos, 46 min). A comparação serve só como indício. O teste forte é o da seção única e o do número diferente a cada suspensão.

### 4.3 A hipótese do título do eleitor: o que a sustenta e o que falta

**Para o "inválido" (Hipótese forte, com três sinais independentes):**
1. **Identificação do eleitor.** Nas sessões com número inválido sem papel nenhum no país, o eleitor foi liberado pelo **título** em 20.018 de 20.023 (99,98%), e pelo CPF em 5 (passada só do 1º turno, `resumo-t1.json`; aqui o cruzamento usa só os mesários do 1º turno, por isso o grupo tem cerca de 36 linhas a mais que na passada dos dois turnos). Na base, 78,0% das sessões (102.139.763 de 130.995.402 com tipo informado, 1º turno) foram liberadas pelo título. O número inválido aparece quase só quando o mesário acabou de digitar o título do eleitor.
2. **O mesário redigita o mesmo número.** Depois de um inválido sem papel, a tentativa seguinte é **o mesmo número de novo, outra vez recusado**, em 22.656 casos no 1º turno. Em 11.557 casos vem um título de mesário da urna, aceito, e em 6.287 o eleitor termina de votar. Um erro de digitação mudaria a cada tentativa. Um número copiado de um documento se repete.
3. **(Teste novo, Fato) O título de um mesário registrado só é recusado quando o mesário é eleitor da própria seção:** 197 de 200 no 1º turno e 10 de 10 no 2º. Entre os títulos de mesário **aceitos**, só 36,1% (25.206 de 69.912) e 33,3% (2.167 de 6.507) são de mesário eleitor da seção. Se "inválido" quisesse dizer apenas "não autorizado", um mesário registrado nunca seria recusado. O padrão é o de uma urna que **recusa o título de quem está na cabine**: o mesário que vota na própria seção e é suspenso. Isso explica a palavra "inválido" e reforça que o inválido sem papel é o título do eleitor suspenso. **Mas continua sendo inferência**, porque o log não diz quem estava na cabine.

**Para o "válido" sem papel: o dono não é conhecido.** A urna aceitou o número, que não é de mesário, operador nem presidente. Cada número aparece numa só seção e muda a cada suspensão. O eleitor foi liberado pelo CPF em 6.628 de 11.939 sessões (55,5%), muito acima da base de 22% (mesma passada do 1º turno). Se a urna recusa o título de quem está na cabine (sinal 3), o válido sem papel **não** é o do eleitor suspenso. Pode ser de outra pessoa da fila, de um acompanhante ou de um membro da mesa sem registro. Os arquivos não dizem.

**Consequência para o texto do autor.** As 11.871 sessões do 1º turno que "terminam em nulo por suspensão" juntam os dois grupos. Separado, com os números sem papel nenhum no país (1º turno, mesma passada): **31.299 sessões** têm um desses números e **11.643** terminam em nulo por suspensão; dessas, **6.383** têm número **inválido** (o grupo da hipótese forte) e 5.586 têm número **válido** (dono desconhecido); 326 sessões têm os dois. Os 11.871 do autor incluem o título do presidente da própria urna e os mesários de outra urna ou do outro turno. Só o grupo do inválido entra na hipótese forte de ligar título a voto.

**Princípio 8.** A explicação "o mesário redigita o título do eleitor" é um comportamento humano, mas aqui **não é usada como controle nem como absolvição**. Ela descreve o que foi digitado, e o rastro está no arquivo. O sentido é o oposto do benigno: se for verdade, o log publica o título do eleitor.

### 4.4 O que ainda pode derrubar a hipótese (pendente)

- A regra técnica da suspensão (que títulos a urna aceita) não está publicada. A recusa do título do eleitor em cabine é inferida pelo padrão, não lida no código ou na norma.
- A confirmação direta exige a lista de eleitores da seção, que não é pública. **Não usei a base privada para isso**, por ordem da coordenação. Fica para pergunta ao TSE.

**Veredito: sustentado com ressalvas.** O fato (números de 12 dígitos com DV de título válido, sem papel nenhum no país, publicados no log dentro da sessão de um eleitor) é real e robusto. Os números do autor precisam das cinco correções de 4.1. A hipótese "título do eleitor suspenso" é forte para o inválido e não se aplica, por ora, ao válido.

## 5. Controle positivo e "nenhuma outra mensagem"

- **DV (Fato).** As duas implementações, a do autor e a minha (escrita à parte, com a regra de SP e MG), concordam em todas as contagens comparadas. Todos os títulos de mesário do país passam: 7.542.425 de 7.542.425 linhas `Mesário # registrado` no 2º turno, 3.748.505 de 3.748.505 no 1º. Um algoritmo de DV errado reprovaria parte deles. Esse é o controle que vale.
- **A parte "é título de mesário" do controle é circular.** O conjunto de mesários **é feito** dessas mesmas linhas, então 100% é garantido por construção. O controle não circular é o de outra mensagem: `Mesário # habilitou o eleitor`, 10.949.368 de 10.949.380 (2º turno, todos os períodos).
- **"Fora disso, nenhuma mensagem traz número com DV de título": sustentado com ressalvas.**
  - Na tabela por mensagem do autor (`resumo.txt`, os dois turnos), só têm número com DV de título as mensagens de mesário, de operador (`gerada pelo usuário`), de encerramento e de suspensão, mais linhas corrompidas (`INDO | TOTA`, 2 no 2º turno, que são mensagens de mesário embaralhadas). Os números de série, de computador e de chave não passam no DV. Conferi.
  - **Mas a mensagem de encerramento também publica títulos sem papel:** `Título digitado para encerramento` tem 5.688 linhas no 1º turno e 1.750 no dia do 2º com título que não é de mesário registrado em nenhuma urna do mesmo turno (números do autor). O mais provável é o presidente sem registro biométrico, ou seja, membro da mesa, não eleitor. Mesmo assim, é número de pessoa fora do papel registrado. A recomendação do autor ("é a única mensagem que publica número de pessoa fora do papel de mesário ou servidor") deve incluí-la.
  - Na mesma mensagem, 182 (1º turno) e 352 (2º, todos os períodos) sequências de 11 dígitos têm DV de CPF válido. Pelo acaso, seriam esperadas cerca de 1% das sequências de 11 dígitos (98 e 190). Há excesso, compatível com CPF digitado no lugar do título. **Pendente.**
  - A busca só vê números de 10 a 12 dígitos. Um título digitado sem 3 ou mais zeros à esquerda (9 dígitos ou menos) não seria visto. Isso só pode ocorrer em mensagens que repetem o que foi digitado, como a de encerramento.

**Veredito: sustentado com ressalvas.**

---

## Afirmação revisada, pronta para a perícia

Só números completos (todas as seções, os dois turnos) e conferidos por dois scripts independentes.

> **Ordem dos votos no registro (Fato).** O registro digital do voto publicado pelo TSE guarda os votos de cada cargo em ordem de tipo e de número digitado, e não na ordem em que os eleitores votaram. Isso vale para todas as listas geradas por urna: 539.788 de 539.788 no 2º turno e 2.490.766 de 2.490.766 no 1º. Cada voto tem só o tipo e o número digitado; por isso, o arquivo é o mesmo em qualquer ordem de chegada dos eleitores.
>
> **Exceção (Fato).** Em 2 seções de Minas Gerais no 1º turno (MG 41238/0039/0168 e MG 50075/0047/0041), parte dos votos foi dada em cédula de papel e digitada depois. Nessas listas a ordem é a de digitação, e a mesma posição corresponde à mesma cédula: o arquivo mostra, para cada uma das 40 cédulas de deputado, o par de votos (federal e estadual) e, numa das seções, o trio de votos para governador e senadores das 20 cédulas. O voto para presidente não segue essa ordem. A cédula não tem nome.
>
> **Seções unânimes (Fato).** Nenhuma seção teve só 1 votante. No 2º turno, 30 seções (3.100 eleitores) votaram todas no mesmo candidato a presidente; no 1º, 17 (1.107). Nessas seções, quem sabe quem compareceu sabe como cada um votou. É consequência de publicar o resultado por seção.
>
> **Número de título no registro da urna (Fato).** Quando o mesário interrompe a votação de um eleitor que demora na cabine, a urna grava no registro público o número digitado para autorizar a interrupção. No dia do 1º turno, 55.483 dessas linhas trazem um número com formato válido de título de eleitor (31.764 números diferentes) que não é de nenhum mesário, presidente de mesa ou servidor registrado em qualquer urna do país, nos dois turnos. No 2º turno, foram 5.564 linhas (3.801 números). Cada número aparece numa única seção, dentro da sessão de um eleitor, com data e hora.
>
> **De quem é esse número: Pendente.** Os dados indicam que, quando a urna responde "título inválido", o número é o do próprio eleitor que estava votando. Confirmar exige a lista de eleitores da seção ou a regra técnica da urna, que não são públicas. Pergunta encaminhada ao TSE.

Fica fora da perícia, como Hipótese e por enquanto só em `docs/analysis/`: "o log liga título a voto nulo", o número de sessões que terminam em nulo e qualquer contagem de "eleitores identificados".

## Recomendações

- **Ao autor (engenheiro):** aplicar as cinco correções de 4.1 ao doc 05. Separar válido e inválido nas sessões que terminam em nulo. Na Parte 2, corrigir a frase da seção do exterior. Na Parte 1, trocar "cédula inteira de cada eleitor" pela leitura de 2. Incluir a mensagem de encerramento na recomendação ao TSE. Trocar "títulos" por "linhas" onde for contagem de linhas.
- **Ao script do autor:** usar comparador que falhe com tipo desconhecido em vez de aceitar `NaN`. Fazer o cruzamento nacional com os dois turnos, com operador e com título de encerramento. Separar do "sem papel" o número igual ao título de encerramento da mesma urna.
- **Coordenação:** levar ao TSE três perguntas objetivas. (1) Que títulos a urna aceita para suspender e por que recusa um título de mesário registrado? (2) O número gravado em `Título # é inválido para suspender` pode ser o do eleitor em cabine? (3) Por que o log grava o número digitado, e não só o resultado?
- **Ao TSE (via relatório):** não gravar no log o número digitado na suspensão nem no encerramento. Gravar só o resultado e o papel de quem autorizou.

## Pendente

- Dono dos números da suspensão (inválido e válido): lista de eleitores da seção ou regra técnica; sem a base privada.
- Se as 182/352 sequências com DV de CPF na mensagem de encerramento são CPFs.
- Se a ordem das cédulas de MG reflete a ordem de votação (o arquivo não diz).

## Como reproduzir

```
node scripts/auditoria/cetico-h09-sigilo.mjs --turnos 1,2 --procs 4   # universo, dois turnos juntos: 46 min (2.778 s) → resumo.json
node scripts/auditoria/cetico-h09-sigilo.mjs --turnos 1 --procs 4     # só 1º turno: 43 min (2.551 s) → resumo-t1.json (sessões, tipo de identificação)
node scripts/auditoria/cetico-h09-sigilo.mjs --turnos 1,2 --uf ac     # conferência rápida (11 s)
node scripts/auditoria/cetico-h09-cedula.mjs                          # alinhamento das cédulas de MG (permutação, semente fixa)
node scripts/auditoria/seguranca-h09-sigilo.mjs --turno 1 --uf ac     # script do autor, para comparar com o AC acima
node scripts/sql.mjs "select turno, cargo, count(*) secoes, sum(n) eleitores from (select turno, uf, municipio, zona, secao, cargo, count(*) k, sum(quantidade) n from voto_rdv where cargo in (1,3,6) group by turno, uf, municipio, zona, secao, eleicao, cargo) where k=1 group by turno, cargo"
```

Saída: `data/parsed/auditoria/cetico-revisor/h09/resumo.json` e `resumo-t1.json` (só contagens). O `resumo.json` dos dois turnos foi gerado antes de eu acrescentar ao script as contagens por sessão, o tipo de identificação e o controle entre turnos. Essas vieram da passada do 1º turno (`resumo-t1.json`; as duas passadas batem em todas as contagens comuns: âncora, linhas e papéis na urna). Uma segunda passada dos dois turnos foi interrompida na zona 5.000 e não foi refeita, por isso o controle entre turnos ficou só no AC. Rodar de novo o primeiro comando produz um `resumo.json` com tudo isso. No AC, o meu script e o do autor batem em todas as contagens comparadas: âncora 1.469/911/11 e 51/51/1; válidos sem papel 93 = 90 + 3 do presidente; inválidos 361 = 358 + 3 mesários de outra urna; 2º turno 23 e 37.
