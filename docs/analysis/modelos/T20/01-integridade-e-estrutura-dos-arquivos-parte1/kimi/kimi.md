# Revisão: 01-integridade-e-estrutura-dos-arquivos.md (parte 1 de 2)

| # | Trecho exato | Problema (tipo) | Conta refeita ou explicação | Gravidade |
|---|---|---|---|---|
| 1 | "Em **134 dessas seções**, a mesma urna recebeu votos depois, numa nova inicialização, sem que o programa tivesse sido instalado de novo" vs. tabela "Mesma urna religada, sem nova carga \| **128**" (2º turno) | 3 — contradição interna | Seção com voto pós-erro sem nova carga exige ≥1 anotação "religada sem nova carga". Anotações por seção ≥ 1, logo seções nesse desfecho ≤ 128. Texto afirma 134 seções. 134 > 128: não fecha. Ou texto ou tabela errado. Idem 1º turno: "103 seções votaram em nova inicialização" vs. tabela 1T "religada sem nova carga = 99". 103 > 99. | Alta |
| 2 | "as assinaturas dos 499.207 pacotes também foram conferidas, **sem nenhuma falha de arquivo**" + "O único caso fora do padrão é ... MG 50075/0047/0041, publicado **fora da lista lacrada**" | 3/5 — contradição e afirmação mais forte que evidência | Critério de falha declarado na tabela do 2º turno inclui "arquivo fora da lista lacrada". 1º turno tem 1 caso desses, mas relatado como "0 falha de arquivo" (aqui e na Resposta curta). Ou critério do 1º turno difere (não dito), ou "0 falha" falso. Mínimo: ressalva explícita obrigatória; "fora do padrão" não é categoria definida. | Alta |
| 3 | "o programa `src/lacres.js` faz 25 dessas conferências (... e **6 da corrente do boletim**)" vs. tabela exemplo: "as **8 linhas** de votos (4 de Presidente, 4 de Governador) foram recalculadas" + "Lacre ... no último elo de cada eleição: **2 de 2**" | 1/3 — conta não fecha | Corrente na tabela = 8 recálculos + 2 lacres = 10 conferências. Composição do 25 reserva só 6 para corrente. 2+2+4+11+10 = 29 ≠ 25. Também: tabela tem 3 linhas de carteira (mesma urna, assinatura AC, validade), composição diz "2 da carteira"; e "Lacre da urna na lista inteira" (1) não aparece na composição ("2 da lista" cobre só as 2 impressões digitais das listas). Composição do 25 incompatível com tabela. | Média |
| 4 | "Em **37.457** pacotes de urnas antigas..." (2T) + "a mesma urna mostra a mesma sobra nos dois turnos" vs. "Em **37.440** deles ..." (1T) | 3 — aparente contradição | Diferença de 17. Afirmação "acompanha a carteira, não o pacote" sugere mesmo conjunto nos 2 turnos. Explicação plausível (urna presente em 1 turno só) não dada no texto. Sem explicação, par de números parece erro. | Baixa |
| 5 | "os **29 pacotes do Sistema de Apuração** ... estão nele [exterior]" vs. "MG 50075/0047/0041 (**apuração mista, com o Sistema de Apuração**)" | 2/3 — universo trocado ou contradição | Se 29 pacotes SA todos no exterior, seção em MG com SA é 30º caso ou usa definição diferente ("apuração mista") sem explicação. Texto não reconcilia. | Média |
| 6 | "Em nenhum desses casos a urna recebeu voto sem antes ser desligada e ligada de novo" (Resposta curta) vs. achado 1 | 5 — afirmação mais forte que evidência | Enquanto 134×128 não resolvido, "em nenhum caso" sobre voto pós-erro fica sem suporte numérico fechado. | Média |

**Números conferidos sem problema: 18**

- 499.248 − 499.207 = 41 ✓
- Autoridades: 200.504 + 198.746 = 399.250 ✓
- Autoridades: 87.502 + 12.455 = 99.957 ✓
- 399.250 + 99.957 = 499.207 ✓
- Tabela por UF: coluna "Pacotes" somada = 499.207 ✓
- Tabela por UF: coluna Ed521 somada = 399.250 ✓ (casa com tabela de autoridades)
- Tabela por UF: coluna ECDSA somada = 99.957 ✓
- Tabela por UF: linha a