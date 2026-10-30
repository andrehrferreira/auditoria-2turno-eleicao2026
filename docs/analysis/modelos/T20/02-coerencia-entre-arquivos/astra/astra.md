Revisão textual: contas conferidas, sem validar arquivos oficiais, scripts, horários ou identificadores. **Igualdade aritmética não certifica dado do TSE.** Referência recebida: resumo executivo truncado; nenhuma tabela nacional adicional disponível.

| # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade (alta/média/baixa) |
|---|---|---|---|---|
| 1 | “C2 diário × boletim \| 499.178 seções \| **10** (explicadas abaixo)” | **3 — resultado inicial apresentado como resultado final** | Recontagem nacional informa **6** seções com diferença; **10** corresponde à saída inicial, antes das correções de leitura. Identificar coluna como resultado inicial e acrescentar resultado reconciliado. | média |
| 2 | “Diário recontado” / “233 + 1”, “303 + 1”, “258 + 1” | **2, 5 — contagem mistura eventos distintos** | C2 conta linhas “computado”. Parcelas adicionais representam votos confirmados sem essa linha. Portanto, diário tem **233**, **303** e **258** linhas computadas, não total igual ao boletim. Separar contagem observada de explicação da diferença. | alta |
| 3 | “O boletim delas não traz o comparecimento da seção” / “o boletim delas traz comparecimento 0 na seção.” | **3 — campo ausente versus zero** | Mesmas **29** seções do SA descritas com campo ausente e com campo presente igual a **0**. Distinguir valor original, ausência e eventual conversão pelo leitor. Isso afeta interpretação de C6 e comparecimento. | média |
| 4 | “No 2º turno, 499.207 seções com boletim” / “539.815 comparações” / “539.817 (seção × eleição)” | **2 — universos sem reconciliação explícita** | Totais não são necessariamente contraditórios: seção, cargo e eleição são unidades diferentes. Porém falta decomposição que reconcilie esses totais com **499.205** seções com voto para Presidente e explique diferença entre C1 e C4. Não tratar comparações como quantidade de seções ou votos presidenciais. | média |
| 5 | “Nulos do boletim: 3.180.769.” / “Brancos: 1.662.313 nos dois. Nominais: 133.698.737 nos dois.” | **2 — universo dos votos não declarado** | Contexto inclui Presidente, Governador e consultas populares. Informar quais cargos compõem esses totais. Soma dos nulos fecha, mas texto não permite confrontar totais com votação nacional para Presidente. | média |
| 6 | “10,3% (21 de 204)” | **1, 4 — arredondamento proibido** | Percentual exato é **(21 ÷ 204) × 100%**. Não é igual a **10,3%**: **204 × 10,3 ÷ 100 ≠ 21**. Manter “21 de 204”; retirar percentual arredondado. | média |
| 7 | “8.236 dos 108.628 eleitores com digital cadastrada (7,58%)” | **1, 4 — arredondamento proibido** | Percentual exato é **(8.236 ÷ 108.628) × 100%**. **108.628 × 7,58 ÷ 100 ≠ 8.236**. Fração está explícita; percentual não satisfaz regra de exatidão. | média |
| 8 | “Um filtro inicial aponta 23 seções [...] com p binomial < 0,001.” / “na estimativa do cético, nenhuma se sustenta de forma firme.” | **4, 5 — resultado dependente de modelo apresentado numericamente** | **23** depende de filtro estatístico cuja adequação à variação entre seções está pendente. “Nenhuma” também comunica resultado quantitativo de estimativa. Pela regra imposta, deixar resultado como **Pendente**, sem contagem. Limiar **0,001** pode permanecer como definição metodológica, não como prova de fraude ou ausência dela. | alta |
| 9 | “O efeito máximo desse tipo de falha é de 54 votos no 2º turno e 159 no 1º” | **5 — diferença líquida não estabelece efeito máximo** | Contagens medem votos do boletim sem correspondência nas linhas examinadas. Não limitam alterações coerentes entre arquivos, compensações entre eventos ou efeito eleitoral de falhas. Substituir “efeito máximo” por descrição estrita da diferença observada. | alta |
| 10 | “As comparações C1 a C6 foram feitas só em parte das UFs” | **3 — contradiz atualização nacional de C2** | Resposta curta, tabela reconciliada e limites dizem que C2 do primeiro turno cobriu **499.176** seções com urna eletrônica. Restringir pendência a **C1 e C3 a C6**, como restante do tópico. | média |
| 11 | “nas 28 UFs” / “1º turno, 28 UFs” | **2 — unidade territorial incorreta** | Exterior não é UF. Texto separa “14 UFs restantes e o exterior”, enquanto comando já lista UFs brasileiras. Usar “UFs e exterior” ou definir unidades de processamento; não chamar exterior de UF. | média |
| 12 | “A previsão é uma conta exata [...] 499.177 × 499.176 ÷ 2 ÷ 4.294.967.296 = 29,01” | **1, 4 — igualdade falsa e expectativa baseada em hipótese** | Expressão não é exatamente **29,01**; esse valor está arredondado. Além disso, expressão calcula expectativa sob sorteio uniforme e independente, não contagem observada. Pela regra, retirar número previsto e deixar análise estatística como **Pendente**. | alta |
| 13 | “para o 2º turno, 499.177 × 499.176” | **2 — exclusão sem explicação** | Universo eletrônico declarado é **499.178**. Fórmula usa **499.177** cartões, mas texto não identifica exclusão desse turno. Explicação sobre `00000000` aparece para primeiro turno e comparação entre turnos; não reconcilia explicitamente esta base. | média |
| 14 | “Pares de seções com o mesmo número de cartão de votação [...] 30” / “1 grupo de 5 com o número `00000000`” | **2 — regra de contagem ambígua** | Grupo de **5** seções também gera pares. Não está dito se **30** inclui esses pares ou só cartões identificados. Declarar exclusão ou inclusão do marcador `00000000` e distinguir pares de grupos. | média |
| 15 | “A quantidade de pares encontrada é a que o acaso prevê” / “O que denunciaria um cartão usado em mais de uma urna seria a repetição no mesmo município ou na mesma zona” | **4, 5 — modelo convertido em explicação comprovada** | Compatibilidade com modelo aleatório não prova causa das colisões. Ausência de repetição local tampouco exclui reutilização fora desses limites ou identificadores incorretos. Resultado observado e interpretação estatística precisam ficar separados. | alta |
| 16 | “Contas exatas” / “34,90”, “10,16”, “4,84”, “2,71” | **1, 4 — taxas arredondadas chamadas exatas** | Frações exatas: **416 × 1.000 ÷ 11.921**, **894 × 1.000 ÷ 88.035**, **970 × 1.000 ÷ 200.463**, **538 × 1.000 ÷ 198.757**. Valores publicados são arredondamentos, não igualdades exatas. Mesmo problema em “34,9” e “2,7” no parágrafo anterior. Manter contagens e frações. | média |
| 17 | “a urna de 2013 foi trocada 12,9 vezes mais que a de 2022” | **1, 4, 5 — razão arredondada e redação ambígua** | Razão exata das taxas: **(416 ÷ 11.921) ÷ (538 ÷ 198.757)**. Não é exatamente **12,9**. “Vezes mais” também confunde razão com acréscimo; comparação é entre taxas de seções, não entre urnas individuais. | média |
| 18 | “nas 499.176 seções com urna nos dois turnos” | **2 — interseção não demonstrada** | Tabela soma **499.176**, mas esse também é total eletrônico do primeiro turno. Totais separados dos turnos não provam quais seções pertencem à interseção. Informar cruzamento dos identificadores e destino das exclusões, sobretudo SA. | média |
| 19 | “Nenhuma urna escreveu no diário de duas seções ao mesmo tempo” | **2, 5 — conclusão para dois turnos com evidência exposta só para segundo** | Resposta curta enquadra afirmação em “dois turnos”. Seção detalhada sustenta **360** urnas e **92** casos apenas no segundo turno. Falta resultado nacional correspondente do primeiro, ou restrição explícita da conclusão. | alta |
| 20 | “no 1º turno, a conferência está Pendente” | **3 — conflito com referência fornecida** | Resumo afirma que arquivos dos **dois turnos** não foram alterados depois de assinados. Tópico declara conferência do primeiro turno pendente. Atualizar estado ou restringir conclusão; texto não permite decidir qual versão está correta. | alta |
| 21 | “com os 6 cargos confirmados” | **2 — cargos versus escolhas eleitorais** | Texto explica que senador tem **2 vagas**. Duas escolhas para senador não constituem dois cargos distintos. Definir se **6** conta confirmações, escolhas ou etapas do diário; não chamar automaticamente de seis cargos. | média |
| 22 | “Nos 5 casos, a urna grava o próprio diário [...] antes de conferir o cartão” / “os erros 72 e 17, que bloquearam as urnas com outro cartão” | **3, 5 — generalização apaga ressalva** | Caso BA **0175** informa expressamente ausência de linha “erro 72” e recusa inferida. Não apresentar bloqueio registrado por erro como comprovado em todos os **5** casos. Preservar distinção entre observação e inferência. | alta |
| 23 | “Revisão cética dos 50 votos sem diário” | **3 — rótulo contradiz reconciliação** | Próprio texto define **50 = 49 + 1**, sendo **1** atendimento parcialmente registrado no RS. Portanto, não são todos “sem diário”. Usar rótulo histórico com definição precisa ou atualizar para categorias reconciliadas. | média |
| 24 | “cada turno ~30 min com 2 processos” | **4 — estimativa numérica explícita** | Tempo estimado, não resultado eleitoral. Ainda assim, regra literal proíbe número estimado no tópico. Retirar duração; **2 processos** pode permanecer como configuração operacional. | baixa |
| 25 | “Isso não afeta o resultado.” / “A coerência entre eles mostra que nada foi trocado depois da assinatura e que o pacote não foi montado com pedaços de urnas diferentes.” | **5 — absolvição além do teste** | Repetição de números de mídia não demonstra alteração de votos, mas também não prova ausência de efeito. Coerência de identificadores não comprova integridade criptográfica nem origem física única; próprio tópico descreve pacotes com diários de outras urnas. Restringir conclusões ao que cada teste verifica. | alta |

**Números conferidos sem problema: 50**

Contagem acima corresponde a **50 verificações aritméticas ou de quantidade de linhas**, não a números certificados nos arquivos oficiais:

- **Universos e exclusões — 6:**  
  499.248 − 41 = 499.207;  
  499.207 − 29 = 499.178;  
  499.207 − 31 = 499.176;  
  499.207 − 1.310 = 497.897;  
  539.815 − 395 = 539.420;  
  11.748 − 3 = 11.745.
- **Nulos — 1:** 3.180.131 + 638 = 3.180.769.
- **Reconciliação dos votos e seções — 9:**  
  4 + 2 = 6; 6 + 3 = 9; 2 + 3 = 5;  
  5 + 49 = 54; 7 + 152 = 159;  
  36 + 13 = 49; 136 + 15 + 1 = 152;  
  49 + 1 = 50; 49 + 152 = 201.
- **Tabela “Seção a seção” — 15:** todas as diferenças **Boletim − Diário = Faltam** fecham, nos dois turnos.
- **Formas de liberação — 11:** cinco somas das linhas; quatro somas das colunas; **32 + 1 = 33** e **117 + 13 + 1 = 131**.
- **Outras decomposições — 8:**  
  136 + 24 + 112 = 272;  
  388 + 251 = 639;  
  499.204 + 3 = 499.207;  
  499.193 + 14 = 499.207;  
  1.266 + 289 + 9 + 2 = 1.566;  
  87 + 2 + 2 + 1 = 92;  
  2.818 + 2.893 + 3 = 5.714;  
  tabela de boletins regravados contém **3** linhas do segundo turno e **14** do primeiro, total **17**.

Demais números sem parcelas ou evidência reproduzida — votos nacionais, horários, seriais, códigos, contagens de ocorrências e resultados iguais a zero — **não verificáveis apenas pelo texto**. Ausência de contradição textual não equivale a confirmação oficial.