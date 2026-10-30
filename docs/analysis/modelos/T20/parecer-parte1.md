# T20, parte 1: triagem da revisão dos modelos (resumo, tópicos 0, 1, 2, 7, 8, 9, 10, 11 e 12)

Revisor cético, 30/10/2026. Escopo: `docs/pericia/resumo.md`, `00`, `01`, `02`, `07`, `08`, `09`, `10`, `11` e `12`. Fora do escopo: tópicos 3 a 6 (em reescrita por outro redator).

Os modelos revisaram a versão anterior à reescrita "independente do processo" (commits 3b63160, 6514994, 064bdc1). Os números são os mesmos. Pedido de "citar parecer, script ou caminho" foi recusado de saída: a regra nova é que o relatório não cita processo.

## Critérios usados

- **Aceito:** conta que não fecha, base trocada, contradição, número de estimativa como Fato, afirmação mais forte que a evidência, ou frase que um leigo entende errado.
- **Recusado:** o número confere (com a conferência citada), o modelo leu errado, ou o pedido é citar processo.
- **Já corrigido:** o trecho não existe mais no texto atual.
- **Percentual arredondado ao lado da fração inteira** (por exemplo "10,3% (21 de 204)"): recusado. O inteiro está no texto, o arredondamento está correto e não é "cerca de".
- **Estatística de teste calculada sobre o universo completo** (coeficiente com intervalo de 95%, escore t, esperado por um modelo declarado): recusado como "estimativa", com uma ressalva que fica para o coordenador (ver "Questões para o coordenador"). Onde o texto lia "intervalo que inclui o zero" como "igual", o apontamento foi aceito e a frase passou a "sem diferença detectável".
- **Conferências próprias desta triagem** (cópia de leitura do banco `eleicao2026-20261029T105000`, arquivos brutos e saídas em `data/parsed/auditoria/`):
  - **Q1.** São 2 as seções do 2º turno com boletim e sem voto para Presidente: ZZ 29564/0001/0091 e ZZ 30686/0001/0443. As duas são do Sistema de Apuração (`saManual`) e têm `comparecimento_majoritario = 0`, com 72 e 30 aptos. Daí 499.207 − 499.205 = 2, e também a diferença de 2 entre o C4 (539.817) e o C1 (539.815).
  - **Q2.** No 1º turno, a única seção com boletim e sem voto para Presidente é a ZZ 29564/0001/0091, com 0 votantes. Daí 499.207 − 499.206 = 1.
  - **Q3.** As 29 seções do 2º turno fora do universo do tópico 11 (Sistema de Apuração do exterior + MG 41238/0039/0168 e MG 50075/0047/0041) somam **770** votos do 13 e **666** do 22. É exatamente a diferença entre os grupos e o total do Brasil.
  - **Q4.** Reservas no 2º turno, por `secao.tipo_urna`: `reservaSecao` 5.712 + `reservaEncerrandoSecao` 2 = 5.714. As 2 de MG são `secao` no 2º turno. As 5.714 estão todas dentro das 499.176.
  - **Q5.** As 11 seções da troca mínima (tópico 8, item 3b) têm os mesmos aptos nos dois turnos. Em 6 delas há eleitores em trânsito: AM 02755/0022/0070 (3), BA 39659/0041/0400 (53 de 53), MG 40282/0063/0194 (2), PA 04472/0004/0580 (2), PE 23876/0021/0149 (1) e SP 71072/0325/0685 (56 de 56).
  - **Q6.** No 2º turno, a seção AM 02216/0021/0096 é unânime para Presidente e para Governador (113 votos), o que explica 30 + 4 − 1 = 33.
  - **Q7.** SP 64777/0395/0298, 2º turno: o SHA-512 do `log.jez` confere com o resumo da `vota.vsc`, e os 4 arquivos também (script em scratchpad, com `src/vsc.js`). Pelo `00-coleta-arquivos.json`, os pacotes do Sistema de Apuração também têm 4 arquivos cada (`busa`, `rdv`, `logsa`, `imgbusa`).
  - **Q8.** O FV do 2º turno tem n = 499.177 (`cetico/integridade-recontagem-2t.json`). O filtro do script tira o `00000000`, que no 2º turno é o de MG 46256/0131/0046.
  - **Q9.** `integridade-nacional/07`: 138 eventos (134 seções) = 128 "sem nova carga" (125 seções) + 10 trocas que votaram antes da troca. No 1º turno, 106 eventos (103 seções) = 99 (97 seções) + 7.
  - **Q10.** 99,78% = 490.035 / 491.127 (parecer 28). O total de 1.909 = 1.870 até as 17:10 + 39 registros de seções não instaladas.
  - **Q11.** Na composição das 25 conferências de lacre, a corrente do boletim é de 3 por eleição (`src/lacres.js`: elos recalculados, último hash e assinatura), o que dá 6. A carteira tem 2 (assinatura da AC e validade) e a lista tem 2 (hash e assinatura).
  - **Q12.** Perda do 22 em seções sem queda de comparecimento, por UF (parecer 05, tabela 2): AC 148, AP 0, RR 59, MA 10.652, AM 2.841 e TO 1.778.

## Resumo

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| astra 1 | "cada número está escrito igual no tópico" | 4 | recusado | Pede rastreabilidade de processo; a regra nova é não citar processo | — |
| astra 2 | 499.248/499.207 "em cada turno" | 2,4 | recusado | `t15/00-coleta-1t.json` e `2t.json`: 499.248 linhas e 499.207 completas nos dois turnos | — |
| astra 3 / grok omissão | "499.207 que tiveram urna… 41, no exterior, não tiveram urna" | 5 | aceito | Os 29/31 do Sistema de Apuração votaram em cédula, sem urna | "O que foi examinado" reescrito: 41 sem urna instalada; nas 499.207, quase todas com urna e algumas em cédula |
| astra 4 / grok omissão | 499.207 × 499.205 | 7 | aceito | Q1 | Item 1: "(as 499.207 com boletim menos 2 do exterior em que ninguém votou)" |
| astra 5 | margem sem parcelas | 4 | recusado | As parcelas estão no tópico 8; o resumo só remete | — |
| astra 6 / grok 1 | "1º turno … 0 divergência" × nulo técnico | 3 | aceito | O "0" é de totais; a reclassificação é outra coisa | Item 1: "0 divergência nos totais…; a única diferença é a classificação de 630.541 votos como nulo técnico (item 10)" |
| astra 7 | zeros não reproduzíveis no texto | 4 | recusado | Conferidos nos tópicos 5 e 2; pede processo | — |
| astra 8 | "nenhum arquivo … alterado depois de a urna o assinar" | 5 | aceito (parte) | Vale para arquivo assinado; no 1º turno há um arquivo fora da lista lacrada | "Nenhum arquivo assinado dos dois turnos foi alterado depois da assinatura"; item 2 cita o caso de MG |
| astra 9 | "os mesmos 499.207 pacotes" | 8 | aceito | Sugere os mesmos arquivos nos dois turnos | "os 499.207 pacotes desse turno" |
| astra 10 | "Todas as urnas rodaram a mesma versão" | 5 | aceito | A versão é declarada pelo próprio programa | "anotam a mesma versão…; é o que o próprio programa declara, e não prova qual programa rodou" |
| astra 11 | 539.815 sem decomposição | 2 | recusado | Unidade (seção × cargo) dita no texto; decomposição no tópico 2 | — |
| astra 12 | 54/6, 159/9, 15 | 4 | recusado | Contagens conferidas (tópico 2); o 15 é Fato, e só a autoria da urna é Pendente | — |
| astra 13 | "Os próprios arquivos mostram a causa" | 5 | aceito | Na BA 0175 a recusa é inferida; e as 10 de queda são outro mecanismo | Item 3 separa as 10 com queda das 5 com diário perdido e registra a inferência |
| astra 14 | "refutada" por identidade contábil | 5 | aceito (parte) | A conta fecha por construção quando votos = votantes | Item 4: "essa conta sempre fecha quando cada urna tem tantos votos quantos votantes (o que foi conferido)" |
| astra 15 | "não enxerga troca … menor que 3.721.538" | 5 | aceito | O ganho líquido não limita troca: o ganho do 22 sem troca é desconhecido | Item 4: "não mede troca de votos do 22 para o 13: só reduz o ganho do 22…"; o mesmo foi corrigido nos tópicos 7 e 10 |
| astra 16 | "votaram como as vizinhas"; −0,05 [−0,12; +0,03] | 4,5 | aceito (parte) | Intervalo com zero = "não detectado", não "igual". Coeficiente mantido (critério acima) | Título e texto do item 5: "não teve diferença detectável" |
| astra 17 / kimi 5 | 742.671 → 2.944.849 "nessas seções" | 2 | aceito (parte) | A conta fecha (4.430.191 − 2 × 742.671); antecedente ambíguo. É limite aritmético, não suposição | "nas 5.714 seções com reserva…, fossem, na verdade, do 22" |
| astra 18 / grok 8 | 0,8% | 1 | recusado | 34.330 / 4.430.191 = 0,7749% → 0,8% com 1 casa, igual ao tópico 3 | — |
| astra 19 | "Fora 3 seções…, 16 segundos" | 2,6 | recusado | A exclusão está dita e é igual à do tópico 3. Ver questão 3 | — |
| astra 20 / grok 10 | 98,64%; 1.909 (0,38%) | 1,2 | recusado | 491.127 / 497.897 e 1.909 / 499.248 conferem (Q10) | — |
| astra 21 | 17:10–19:03:37 × "17:10 e 19:03" | 3 | recusado | Precisão menor numa pergunta ao TSE; sem contradição | — |
| astra 22 / grok 9 | 15.884.298 (12,4%) | 4 | recusado | Número do tópico 4 (fora do escopo); o inteiro está no texto | — |
| astra 23 | 2.791.394 "sem nenhum mesário ligado" | 5 | recusado | O texto diz "no diário", que é o que se mede | — |
| astra 24 / kimi 2 / grok omissão | −11.119.111 sem fórmula | 1,4 | aceito (clareza) | A conta é o pior caso seção a seção (tópico 4, item 6.4, duas contas). Kimi leu como conta nacional simples | Item 7 explica o método entre parênteses |
| astra 25 / grok omissão | AC URNA, 99.957 | 4 | recusado | Conferido no tópico 1 e no relatório temático | — |
| astra 26 | "ninguém de fora confere" | 4 | recusado | O CEPESC não é público (glossário) | — |
| astra 27 | 55.483/31.764 sem critério | 4 | recusado | O critério está no tópico 12 | — |
| astra 28 | "números de título" / "não revela voto" | 5,8 | aceito | É formato de título; e, se a hipótese vale, liga o eleitor ao nulo por suspensão | Item 9 e abertura: "números com formato de título…, registrado no diário de qualquer urna"; a Hipótese do nulo por suspensão foi acrescentada |
| astra 29 | RJ 50,880%, 147.771, 274.411, 49,270% | 4 | recusado | O grok refez a conta: fecha com G = 4.271.199 e V = 8.394.627 (tópico 10) | — |
| astra 30 | "contados como válidos, 49,270%" | 5 | recusado | É aritmética sobre números oficiais, não cenário estimado | — |
| astra 31 | "variaram como os da zona" (125) | 5 | aceito | Mesmo vício do 16 | "não tiveram diferença em relação à zona que resista à correção para muitos testes" |
| astra 32 / grok 3 | 94.985/148.553 Fato sobre Censo + suposição | 4 | aceito (parte) | Faltava a condição "Censo completo". O rótulo de piso vem do tópico 6 (questão 2) | "supondo que ninguém morreu desde o Censo e que o Censo contou todos (por isso são pisos)" |
| astra 33 / grok 7 | "92% deles"; 0,72% "sem sinal" | 2,5 | aceito | "Deles" lia como 92% dos 94.985 | "92% dos títulos de 100+"; "o que não indica uso sistemático" (igual ao tópico 6) |
| astra 34 | "só se confere na inspeção do código e nos testes do TSE" | 5 | aceito | Esses controles também não provam, sozinhos, o que rodou | "Os arquivos públicos não bastam…; depende de controles fora deles, como…" |
| astra 35 | "Nenhuma foi sustentada"; refutadas | 4 | recusado | Os estados vêm do quadro; mudar status é do coordenador | — |
| astra 36 / grok 2 / kimi 3 | "nenhum teste encontrou sinal de fraude" | 5 | aceito | Há testes em andamento e um que não decide | Abertura: "nenhum dos testes concluídos…; para Presidente no 2º turno e todos os cargos no 1º…; parte dos testes ainda está em andamento, e um deles não decide" |
| grok 4 | "contam a mesma história" | 5 | aceito | O corpo mostra falha do diário | Título do item 3: "Boletim e lista de votos são iguais; o diário confirma quase todos os votos" |
| grok 5 | H04 "em teste" × 0 falha | 3 | recusado | A H04 inclui "gerado fora de urna oficial com chave oficial", que segue aberto; mudar status não é deste revisor | — |
| grok 6 | H25 "não testável" × "em teste" | 3 | já corrigido | O item 8 atual não tem a frase | — |
| grok 11 | 0,72% sem inteiro | 4 | recusado | O inteiro está no tópico 6 (2.141 de 298.239) | — |
| grok 12 | H03 em teste × Fato | 3 | recusado | O status cobre os demais campos do 2º turno; agora explícito no item 1 ("Pendente: os demais campos") | — |
| grok omissão | RJ fora da abertura | 7 | aceito | O único desvio de classificação pesou num governo | Abertura cita "que pesou no governo do RJ" |
| kimi 1 | 1.909 às 19h × nenhum de 17:10 a 19:03:37 | 3 | aceito (clareza) | Não há contradição (Q10), mas o leigo lê assim | Item 6: "todos os que tinham voto, até as 17:10, e 39 de seções do exterior sem urna" |
| kimi 4 | Pendente do 2º turno fora do miolo | 7 | aceito | — | Item 1: "**Pendente:** os demais campos do 2º turno" |
| kimi 6 | 148.553 > 94.985 com corte anterior | 8 | recusado | A lógica está certa: corte mais cedo, menos gente chega a 100+ pelo Censo, sobra maior | — |

## Tópico 0

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| grok 1 | "completos e íntegros" Fato × Limites | 3,5 | aceito | É contra a nota fiscal, não contra a palavra do TSE | Rótulo da linha: "(conferidos contra a 'nota fiscal' que acompanha os arquivos; ver Limites)" |
| grok 2 | "499.207 que tiveram urna" × Sistema de Apuração | 5 | aceito | `t15/00-coleta-arquivos.json`: 31 (1º turno) e 29 (2º) pacotes `busa/logsa` | Resposta curta reescrita: 41 sem urna instalada; nas 499.207, quase todas com urna e 31/29 em cédula. "seções com urna" → "seções com arquivos" |
| grok 3 | 4 arquivos × 499.207 também no SA e no caso SP | 5 | recusado | Q7: o SA também tem 4 arquivos; o diário de SP confere com a nota fiscal | — |

## Tópico 1

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| kimi p1-1 | 134 seções × 128 na tabela; 103 × 99 | 3 | aceito (clareza) | Os números estão certos (Q9), mas a tabela não fechava para o leitor | Explicado: 128 (125 seções) + 10 urnas que votaram e depois foram trocadas; 99 (97) + 7 |
| kimi p1-2 | "0 falha de arquivo" × arquivo fora da lista lacrada (MG) | 3,5 | aceito | Pelo critério do 2º turno, isso é falha | Resposta curta, seção "1º turno" e checklist: "0 arquivo alterado; 1 pacote com o boletim impresso fora da lista lacrada" |
| kimi p1-3 | 25 conferências × linhas da tabela | 1,3 | aceito (clareza) | A composição confere com `lacres.js` (Q11) | Composição explicada: 3 por eleição na corrente, 2 da carteira, 2 da lista |
| kimi p1-4 | 37.457 × 37.440 | 3 | aceito (clareza) | Os conjuntos de pacotes AC URNA diferem: 99.957 × 99.985 (relatório temático) | Frase acrescentada no item "A sobra acompanha a carteira" |
| kimi p1-5 | 29 SA no exterior × MG com SA | 2,3 | recusado | Leitura errada: o 29 é do 2º turno e MG é do 1º | — |
| kimi p1-6 | "em nenhum caso" depende do 134/128 | 5 | recusado | As 181 anotações foram abertas uma a uma (0 "urna pronta" e 0 "voto computado" na mesma inicialização) | — |
| kimi p2 | nenhum problema | — | — | — | — |

## Tópico 2

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| astra 1 | "C2 … 10 (explicadas abaixo)" | 3 | aceito | O resultado final é 6 | "10 na primeira leitura; 6 depois da recontagem" |
| astra 2 | "233 + 1" etc. | 2,5 | aceito | O "+" tinha dois sentidos na mesma coluna | "233 (+1 confirmado, sem 'computado')" nas 3 linhas |
| astra 3 | SA "não traz comparecimento" × "traz 0" | 3 | aceito | `coerencia-contagem/03`: o BU traz `qtdEleitoresCompareceram = 0` | Linha corrigida: "traz 0 no comparecimento da seção" |
| astra 4 | 539.815 × 539.817 × 499.205 | 2 | aceito | Q1 explica a diferença de 2 | Célula do C4 explica as 2 seções sem votante |
| astra 5 | totais de nulos, brancos e nominais sem cargo | 2 | aceito | São todos os cargos do 2º turno | "Somando todos os cargos do 2º turno (Presidente, Governador e consultas populares)" |
| astra 6, 7 | 10,3% (21 de 204); 7,58% (8.236 de 108.628) | 1 | recusado | O inteiro está no texto; arredondamento correto | — |
| astra 8 | 23 seções, p binomial < 0,001 | 4 | recusado | É contagem determinística de um filtro declarado, sobre o universo completo; o texto já põe o modelo adequado como Pendente. A frase "nenhuma se sustenta" não existe mais | — |
| astra 9 | "efeito máximo … 54 / 159" | 5 | aceito | É o que o diário deixa de confirmar, não um limite | "Os votos do boletim sem essa linha somam…; não é um limite para outros tipos de falha" |
| astra 10 | "C1 a C6 … só em parte das UFs" | 3 | aceito | O C2 é nacional | "salvo o C2. As comparações C1 e C3 a C6…" |
| astra 11 | "28 UFs" com o exterior | 2 | recusado | Convenção usada em todo o relatório e explicada no tópico 9 ("28 UFs, contando o exterior") | — |
| astra 12 | "conta exata … = 29,01" | 1,4 | aceito (parte) | É probabilidade (paradoxo do aniversário), sem dado estimado; 29,0080 arredonda para 29,01 | "conta de probabilidade, sem nenhum dado estimado…, que dá 29,01 arredondado" |
| astra 13 | 499.177 × 499.178 | 2 | aceito | Q8 | Explicado o cartão `00000000` de MG |
| astra 14 | 30 pares × grupo de 5 | 2 | recusado | A tabela separa as duas linhas; `tamanhos {"2":30,"5":1}` | — |
| astra 15 | "O que denunciaria … seria a repetição no mesmo município" | 5 | aceito | Também denunciaria repetição acima do acaso; e um uso dentro do acaso passaria | Frase reescrita com as duas condições e o limite |
| astra 16 | "Contas exatas" 34,90 etc. | 1 | aceito (parte) | As contagens são exatas; a taxa por mil é arredondada | "Contagens… (a última coluna é arredondada)" |
| astra 17 | "12,9 vezes mais" | 1,5 | aceito | (416 / 11.921) / (538 / 198.757) = 12,89; "vezes mais" é ambíguo | "a taxa de troca da urna de 2013 foi 12,9 vezes a da urna de 2022" |
| astra 18 | 499.176 nos dois turnos | 2 | recusado | `integridade-nacional/03`: universo de 499.176 com urna nos dois turnos, cruzado seção a seção | — |
| astra 19 | "Nenhuma urna escreveu … ao mesmo tempo" nos dois turnos | 2,5 | aceito | A varredura é do 2º turno (`--turno 2`) | Resposta curta: "No 2º turno, nenhuma urna…" |
| astra 20 | "no 1º turno, a conferência está Pendente" | 3 | já corrigido | A frase não está no texto atual | — |
| astra 21 | "6 cargos confirmados" | 2 | aceito | São 6 escolhas em 5 cargos | "6 votos confirmados", com nota |
| astra 22 | "erros 72 e 17 … bloquearam" nos 5 casos | 3,5 | aceito | Na BA 0175 não há linha de erro | "em 4 dos 5 casos; na BA 0175…, a recusa é inferida" |
| astra 23 | "Revisão cética dos 50 votos" | 3 | já corrigido | Rótulo retirado na reescrita | — |
| astra 24 | "~30 min" | 4 | já corrigido | Seção de execução retirada | — |
| astra 25 | "não afeta o resultado" (mídia de resultado); "nada foi trocado depois da assinatura" | 5 | aceito (parte) | A primeira frase se sustenta: o número da mídia de resultado não entra no BU e o resultado é o assinado. A segunda mistura o que os seriais e as assinaturas mostram | Limites, item 6: separado o que mostram os seriais e o que mostram as assinaturas |
| (próprio) | Limites, item 2: "no 1º turno, também nas 499.207" | 3 | aceito | Mesmo caso de MG do tópico 1 | Ressalva de MG acrescentada |

## Tópico 7

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| grok 1 | "troca de 3,7% … já bastaria" | 1,5 | aceito | 3,7% × 59.826.041 = 2.213.563 < 2.215.096 | Número exato: 2.215.096 votos (metade de 4.430.191, arredondada para cima) |
| (astra resumo 15) | "Descarta: troca … acima de 3.721.538" | 5 | aceito | O balanço não limita o tamanho da troca (ver resumo) | Linha "Balanço de cada seção" reescrita; "6,22%" retirado |
| grok 2 | 297.977 × 298.239 | 2,3 | aceito | 298.239 inclui 262 do exterior (parecer 02) | Nota na linha do 0,72% |
| (próprio) | 148.553 "valor mínimo" sem a condição da data | 5 | aceito | Tópico 6: o piso de 148.553 depende da data da idade | Condição acrescentada e piso de 94.985 para qualquer data |
| grok 3 | 27 UFs × 28 UFs | 3 | aceito | O teste roda nas 27 UFs; os dados lidos são das 28 (parecer 27) | Célula explicada |
| grok 4 | "inflado em 10% … 6,8%" | 4 | aceito | Resultado de simulação, fora da regra | Trocado por Pendente sem número |
| grok 5 | 499.206 × 499.207 | 2,3 | aceito | Q2 | "A 499.207ª seção…, apurada em cédula, não teve nenhum votante" |
| grok 6 | 34.330 "Completo" sem o exterior | 2,4 | recusado | O universo da pergunta é o Brasil (o exterior vota pela hora local), e a exclusão está dita | — |
| (próprio) | "as assinaturas do 1º turno estão Pendentes" | 3 | aceito | O tópico 1 já as conferiu | Atualizado, com link ao tópico 1 |

## Tópico 8

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| astra 1 | regra "duas contas que batem" | 4 | recusado | É a regra do relatório (README) | — |
| astra 2 | 2018/2022: 64,8%, 69,8% | 4 | recusado | Dados oficiais do TSE de 2018 e 2022 (não são da imprensa), reproduzidos por três contas (parecer 14); arredondamento correto | — |
| astra 3 | listas por UF 2022/2026 | 4 | recusado | Pede processo; reproduzido nos pareceres 05 e 14 | — |
| astra 4 | "em todas as seções"; conta 1 em 499.176 | 2,4 | aceito | A conta 2 cobre tudo; a conta 1 cobre a interseção | Resposta curta com 499.206/499.205; o item 3 diz o que cada conta cobre |
| astra 5 | troca mínima: 499.194 × 499.176 | 2,4 | aceito | Nas 29 que só a conta 2 cobre, não sobra voto (as 11 estão nas 499.176) | Frase acrescentada no 3b |
| astra 6 | "eleitores novos" = saldo, não entrada | 5 | aceito | Q5: aptos iguais, mas 6 das 11 têm eleitor em trânsito, cuja lista pode mudar entre os turnos | Fato + Pendente acrescentados no 3b |
| astra 7 | prorrogação como Fato, a partir de minuta da imprensa | 4,5 | aceito | Documento de terceiro, sem a versão assinada | Título "(Fato nos votos; decisão Pendente)"; a decisão passa a Pendente |
| astra 8, 9, 10 | 34.330 / 34.066 / 33.668; 0,77% | 2,4 | recusado | Recortes declarados e reconciliados (tópico 3: 662 votos de reserva); 34.330 / 4.430.191 = 0,7749% | — |
| astra 11 | 16.011 / 36.340 sem 389 seções | 2,4 | recusado | O universo é "onde a medida é possível"; as 389 sem cadastro público são Pendente explícito | — |
| astra 12 | "medido só nas 378 … a diferença é de definição" | 4,5 | aceito | Generalizava um subconjunto | "Nas 378 (todas elas)…; Pendente nas outras 15.633; até lá, vale só para essas 378" |
| astra 13 | "liberados só com título, ano de nascimento e foto" | 5 | recusado | É a definição do contador "sem biometria cadastrada" do BU | — |
| astra 14 | 2.960.096 × 2.960.239 | 2 | recusado | O recorte (499.176) está dito | — |
| astra 15 | "601.543 (20,6%) entraram sem digital" | 2,5 | aceito | É saldo; o parecer 27 mostra reclassificação em massa entre os turnos | "as liberações sem digital subiram 601.543…; isso é saldo…" |
| astra 16 | "três UFs onde ele também perdeu votos" × 6 na tabela | 3 | aceito | Q12 | Seis UFs listadas, com AC 148, RR 59 e AP 0, e a separação entre as UFs em que a queda explica e as em que não explica |
| astra 17 | "a mesma conta nas demais UFs" | 2,4 | aceito | O Pendente era ambíguo | "o detalhe por UF nas outras 20 UFs e no exterior" |
| astra 18 | "Assinaturas … verificação nacional em andamento" | 3 | aceito | Feita nos dois turnos (tópico 1) | Situação atualizada |
| astra 19 | "O que cobre esse caso são assinaturas, Teste de Integridade e coerência" | 5 | aceito | As assinaturas e a coerência não pegam alteração feita pelo próprio programa | Limite 4 reescrito |

## Tópico 9

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| astra 1 | "28 UFs (26 estados, DF e exterior)" | 2 | recusado | A composição está escrita ao lado | — |
| astra 2 | esperados beta-binomial como número | 4 | recusado (questão 1) | Saída de modelo declarado, recalculada por duas contas; rotulada "esperado pelo modelo" | — |
| astra 3 | 4.664,3 × 4.664,2 | 1 | recusado | Soma de parcelas arredondadas; o total vem do valor não arredondado | — |
| astra 4 | "4.664" e "615" no texto | 3 | aceito | Coerência com a tabela | "4.664,2" e "615,1" |
| astra 5, 6 | razões 8,1; 1,89; 1,48 | 1 | recusado | Arredondamento correto de frações dadas | — |
| astra 7 | "o excesso diminuiu" | 5 | aceito | O relativo caiu; o absoluto subiu: 1.738,3 → 2.234,8 | "excesso relativo… diminuiu… em número de seções acima do esperado, subiu de 1.738,3 para 2.234,8" |
| astra 8 | 0,24% | 1 | recusado | 1.214 / 499.205 = 0,243% | — |
| astra 9 | mediana 81,5% (81,52%; 248.899 abaixo) | 3 | recusado | 248.899 < 249.603 (meio), compatível com mediana de 81,52% | — |
| astra 10 | "cerca de 30%" | 4 | aceito | Termo vedado | "30,1%" (log₁₀ 2) |
| astra 11 | "Nenhum excesso de contagens redondas" | 3,5 | aceito | Há excesso numérico, mas não significativo | "Nenhum excesso… além do que o acaso produz" |
| astra 12 | múltiplos de 50 fora da tabela | 5 | aceito (parte) | — | Nota: a tabela mostra 10 e 100 |
| astra 13 | z ≥ 5 "por uma curva normal" | 5 | aceito | Votos têm cauda mais larga | "se os afastamentos seguissem uma curva normal…; serve de régua, não de probabilidade" |
| astra 14 | "Não aparece" (enchimento) | 5 | aceito | O poder não foi medido | "A marca clássica não aparece…; não exclui enchimento pequeno ou espalhado (Pendente)" |
| astra 15 | "que é a que decide" | 5 | aceito | — | "que é a referência adequada" |
| astra 16 | último algarismo "deveria sair … quase igual" | 3,5 | aceito | Contradizia a resposta curta | "A referência simples…; para votos por seção é só aproximada" |
| astra 17 | "Isso indica que a cauda reflete diferenças entre regiões" | 5 | aceito | Não houve decomposição por região | Rótulo Hipótese, "não medida" |
| astra 18 | "Isso vem do método… Não é sinal de nada" | 5 | aceito | Causa não testada | Rótulo Hipótese; "não é, por si, sinal de fraude" |
| astra 19, 20, 21 | 25 seções conferidas; 24/25; Ipixuna | 4 | recusado | Conferência de casos, explicitamente "não gera número da auditoria"; o 25º tem explicação | — |
| astra 22 | "refazer todos os testes com o 1º turno" | 3 | aceito | Parte já foi refeita | Pendente especifica os testes que faltam |
| astra 23 | "não deixa marca estatística" | 5 | aceito | — | "pode não deixar marca que estes testes vejam" |
| astra 24 | "Isso exagera o excesso" como Fato | 5 | aceito | Direção e tamanho não medidos | Rótulo Hipótese, "não foram medidos" |

## Tópico 10

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| grok p1-1 | 2.818 + 2.893 = 5.711 ≠ 5.714 | 1 | aceito | Faltavam as 3 recarregadas | "e 3 com a própria urna recarregada como reserva" |
| grok p1-2 | IC como Fato | 4 | aceito (parte) | Coeficiente mantido; "como as vizinhas" virou "sem diferença detectável" | Linha da H14 e detalhe da H14 |
| grok p1-3 | Nordeste 3,41%–99,93%; 166.144 | 1,4 | recusado | Pior caso seção a seção, duas contas (tópico 4, 6.4); o modelo usou a conta nacional simples | — |
| grok p1-4 / p2-9 | 27 UFs × 28 UFs | 3 | aceito | Igual ao tópico 7 | Linha da H05 explicada |
| grok p1-5 / p2-5 | t, d como Fato | 4 | recusado (questão 1) | Estatística sobre o universo completo; o texto já diz "não decide" | — |
| grok p1-6 | 499.207 × 499.206 | 3 | aceito | Q2 | Linha da H03: "(a outra, do exterior, não teve votante)" |
| grok p1-7 | 2.490.766/2.490.766 × exceção MG | 3 | aceito (clareza) | A exceção são listas que não saem da urna | "Exceção, em listas que não são geradas pela urna…" |
| grok p1-8 | "menor intervalo … no país" com 3 fora | 2,5 | aceito | — | "nas demais seções do país…; o dessas 3 é Pendente" |
| grok p1-9 / p2-4 | "pelo menos 148.553" | 4 | aceito | Não vale para qualquer data | Linha da H01 e detalhe: condição da data e piso de 94.985 |
| grok p1-10 | "servidor do país" | 4 | aceito (parte) | A base é "registrado no diário de qualquer urna" | Redação alinhada ao tópico 12 (abertura e H09) |
| grok p1-11 | "explicação mais provável, em grupos de seções" | 4 | aceito | Igual ao tópico 8 | "Nas 378… (todas elas)…; nas outras, Pendente" |
| grok p1-12 | 0,027%, 98,64%, 0,38% | 4 | recusado | Inteiros nos tópicos 3 e 10; conferidos | — |
| grok p1-13 | reservas "igual" | 5 | aceito | — | "não difere de forma detectável" |
| grok p1-14 | "Sem uso sistemático" | 5 | aceito | — | "o que não indica uso sistemático" |
| grok p1-15 | 1.750 "no dia do 2º" × 5.564 "no 2º" | 2 | recusado | Os dois recortes são "no dia" (parecer 29); o critério do encerramento é "mesmo turno" e está dito no tópico 12 | — |
| grok p2-1 | H03 "1º turno está Pendente" × H04 feito | 3 | aceito | O tópico 1 conferiu | "Pode-se afirmar" e a linha da H03 atualizados |
| grok p2-2 | 29 SA × "29 não tiveram votante" | 3 | aceito | Q1: só 2 das 29 não tiveram votante | "29 … foram apuradas em cédula, sem diário de eleitor" |
| grok p2-3 | 499.205 × 499.178 | 2,3 | aceito | 499.205 = 499.178 com urna + 27 do SA com voto | Linha da H03 explica as 2 sem votante |
| grok p2-6 | −0,05 pp × 708.479 ≠ 335 | 1,4 | aceito | Não se reproduz com os números impressos (o parecer 30 usa −0,0472); a conversão é estimativa | Conversão em votos retirada; mantidos o coeficiente e o total de 708.479 |
| grok p2-7 | 99,78% não fecha | 1 | aceito (clareza) | Fecha: 490.035 / 491.127 (Q10) | Inteiros acrescentados |
| grok p2-8 | 2018/2022 de terceiros | 4 | recusado | Dados oficiais do TSE de 2018 e 2022, três contas | — |
| grok p3-1 | 52% | 1 | recusado | 2.898 / 5.570 = 52,03% | — |
| grok p3-2, 3 | "votam… indica pessoas reais, não fantasmas" | 4,5 | aceito (parte) | O parecer 04 sustenta "não em massa" pela digital; uso local não fica excluído | "Parte dos títulos a mais vota…"; ressalva de uso local acrescentada |
| grok p3-4 | "concentra em municípios pequenos" | 5 | recusado | Parecer 04: razão de 1,18 abaixo de 5 mil habitantes e 0 dos 41 com 500 mil ou mais | — |
| grok p3-5 | "# H04 (162 e 842 seções)" | 4 | já corrigido | Seção de comandos retirada | — |

## Tópico 11

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| astra 1 | universo 499.176 × 499.205 | 2,4 | aceito | Q4: as 5.714 reservas estão dentro | "Todas as 5.714… estão dentro do universo"; os 31 do SA são do 1º turno |
| astra 2 | grupos somam 770/666 a menos que o Brasil | 2,4 | aceito | Q3: exatamente as 29 seções fora do universo | Nota com 770 e 666 depois da tabela do item 4 |
| astra 3 | herdadas "foi igual" com 2.730 de 2.893 | 2,4 | aceito | — | 2.730 e 163 explicitados (resposta curta e item 3) |
| astra 4 | IC e efeitos como estimativas | 4 | recusado (questão 1) | Universo completo, reproduzido por sorteio e por outra cópia | — |
| astra 5 | 335 votos (860/190) não reproduz | 1,4 | aceito | Igual ao p2-6 do tópico 10 | Conversão retirada (resposta curta e item 2) |
| astra 6 | "mudaram do mesmo jeito", "igual", "Não há eleitor a mais" | 5 | aceito | — | "sem diferença detectável"; "O teste não mostra eleitor a mais nelas no 2º turno" |
| astra 7, 8, 10, 13 | percentuais com 2 casas | 4 | recusado | Contagens ao lado; arredondamento correto | — |
| astra 9 | Aracaju 60,38% → 63,48% | 4 | recusado | Recorte de 16 seções identificado e completo | — |
| astra 11 | denominador 575.362 × 731.639 | 2,4 | aceito (parte) | O denominador é "votos recebidos pela própria reserva" (`resVotos`); a diferença de 383 para 731.639 − 155.894 não foi explicada (questão 4) | Definição acrescentada |
| astra 12 | "funcionou como reserva da própria zona"; "teria disparado" | 5 | aceito | A inferência estava no rótulo do Fato | Rótulo neutro; raciocínio explicitado e conclusão como indicação |
| astra 14 | 6,56 e 116,08 esperadas | 4 | recusado | Padronização direta (taxa por UF e modelo × contagem), sem modelo estatístico | — |
| astra 15 | 31 (qualquer diário) × 6,56 (diário da reserva) | 2,5 | aceito | Unidades diferentes | "31… e 6 só no diário da reserva…; só o diário da reserva tem régua própria: 6 contra 6,56" |
| astra 16 | "não aparece nenhum dos sinais"; "fica no mesmo nível" | 3,5 | aceito (parte) | A lista de sinais está definida; a premissa vale só para adulteração sem a assinatura | "Como ler" reescrito, com o limite da assinatura oficial |
| astra 17 | "não poderia ter decidido a eleição" | 4,5 | aceito (parte) | A conta cobre só a troca 13↔22 | "pela troca de votos do 22 para o 13…; a conta não trata de eleitor apagado" |
| astra 18 | 742.671 = 742.224 + 447 | 4 | recusado | Fecha: 447 e 315 são as 3 recarregadas | — |
| astra 19 | 57 seções conferidas | 4 | recusado | Conferência de casos, não número da auditoria | — |
| astra 20 | "falhou, e por isso foi trocada"; "efeito do procedimento normal" | 5 | aceito | Causa não está nos arquivos | Rótulo Hipótese nas duas frases |
| astra 21 | "~45 s" etc. | 4 | já corrigido | Seção de comandos retirada | — |

## Tópico 12

| modelo | trecho | tipo | decisão | motivo/conferência | correção feita |
|---|---|---|---|---|---|
| kimi p1-1 | 33 × 30 + 4 | 1,3 | aceito (clareza) | Q6 | Nota com a seção AM 02216/0021/0096 |
| kimi p1-2 | "10 ou mais dígitos" × "10 a 12" | 3 | aceito | O parecer 29 diz 10 a 12 | Uniformizado: "de 10 a 12 dígitos" |
| kimi p1-3 | contraprova cita 9, a tabela 13 | 3 | aceito | O teste acusou as 13 (9 de cédula e 4 cópias do boletim) | Frase corrigida |
| kimi p1-4 | 135.770 × 138.363 | 3 | recusado | Mensagens diferentes; o próprio modelo diz que não é contradição | — |
| kimi p2-1, 2, 3 | "~40 min", "~5 min", "46 min" | 4 | já corrigido | Seção de comandos retirada | — |
| kimi p2-4 | [x] amplo demais | 3 | aceito | — | Checklist delimitado: "números de título nas mensagens de suspensão e de encerramento…; os itens abertos estão em Pendentes" |
| kimi p2-5 | "três perguntas do item 5" | 3 | recusado | O item 5 lista as 3 | — |
| (próprio) | "A pergunta foi encaminhada ao TSE" × "[ ] Enviar ao TSE" | 3 | aceito | Os dois estados não podem valer juntos; `docs/hipoteses.md` diz "perguntar ao TSE" | "está na lista de perguntas ao TSE" e "Perguntas a enviar ao TSE" |

## Totais

| Texto | Aceitos (inclui em parte) | Recusados | Já corrigidos |
|---|---:|---:|---:|
| Resumo (astra 36, grok 12 + 5 omissões, kimi 6) | 32 | 26 | 1 |
| Tópico 0 (grok) | 2 | 1 | 0 |
| Tópico 1 (kimi) | 4 | 2 | 0 |
| Tópico 2 (astra) + 1 próprio | 17 | 6 | 3 |
| Tópico 7 (grok) + 3 próprios/cruzados | 8 | 1 | 0 |
| Tópico 8 (astra) | 10 | 9 | 0 |
| Tópico 9 (astra) | 14 | 10 | 0 |
| Tópico 10 (grok, 3 partes) | 20 | 8 | 1 |
| Tópico 11 (astra) | 11 | 9 | 1 |
| Tópico 12 (kimi) + 1 próprio | 5 | 2 | 3 |

## Questões para o coordenador (não decididas aqui)

1. **Estatística de teste × "estimativa estatística".** A regra do relatório tira "estimativa estatística". Esta triagem manteve os coeficientes com intervalo de 95% (tópicos 10 e 11), os escores t (H05) e os esperados beta-binomiais (tópico 9). São valores determinísticos sobre o universo completo, reproduzidos por duas contas. As conversões em votos, que não se reproduzem com os números impressos, foram retiradas. Se a leitura da regra for literal, esses números viram Pendente.
2. **Tópico 6 (triagem posterior).** O 148.553 e o 94.985 são pisos que supõem mortalidade zero e Censo completo. Os três modelos apontam "conta sobre suposição". No escopo desta triagem, só a condição foi acrescentada no resumo e nos tópicos 7 e 10. O rótulo Fato de piso é decisão do tópico 6.
3. **Tópico 3 (triagem posterior).** As três seções com erro de leitura (BA 39870/0133/0184, ES 57932/0009/0085 e MG 40690/0016/0264) já têm leitura diário a diário em `data/parsed/auditoria/t15/03-linha-do-tempo-*-2t.json`. O menor intervalo vai de 25 a 36 s, acima de 16 s. Com uma segunda conferência, o "Fora 3 seções" do tópico 3, do resumo e da H08 pode cair.
4. **Tópico 11: denominador da biometria nas reservas.** 28.884 + 546.478 = 575.362 votos recebidos pela reserva. Já 731.639 − 155.894 = 575.745. A diferença de 383 votos não foi explicada; a candidata são as 2 trocas sem registro de contingência. O número publicado não muda.
5. **Tópico 4 (triagem posterior).** Se o texto reescrito voltar a dizer que os 601.543 "entraram sem digital", vale a mesma correção feita no tópico 8, item 5b: é saldo, não identidade.

## Verificação

- Busca de referência de processo (`acharReferenciasDeProcesso` de `scripts/relatorio/gerar.mjs`) nos 10 textos editados: 0 achados.
- `node --test test/relatorio.test.js`: 35 de 35 testes passam.
- Nenhum "cerca de" ou "~" nos textos do escopo.
- Sem commit.
