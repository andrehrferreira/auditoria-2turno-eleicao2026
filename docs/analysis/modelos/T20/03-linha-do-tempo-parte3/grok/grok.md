| # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade (alta/média/baixa) |
|---|---|---|---|---|
| 1 | «No relógio local, o exterior teve 417 votos depois das 17h, em 252 seções.» + «dá 34.066 votos depois das 17h» + «inclui o exterior pelo relógio local. Sem o exterior, ela dá 33.668» | 1 e 3 | 34.066 − 33.668 = **398**, não 417. Mesmo critério declarado (relógio local). 19 votos não fecham. Texto não explica o buraco (reserva no exterior ou outro filtro). Bloco marcado **Fato**. | alta |
| 2 | «em 81 seções do 1º turno o operador digitou a hora de Brasília ao preparar a urna, e o relógio dela ficou 1 hora adiantado (MT 90069, 90905 e 90921, zona 0053; AM 02615/0005, seções 0119 e 0120; RS 88994/0131/0008)» | 2, 3 e 5 | RS está no fuso de Brasília (UTC−3, sem DST). Digitar hora de Brasília **não** adianta relógio 1 h. Parêntese aplica «1 hora adiantado» a RS. «Hora certa» nos itens 6 e 7, se subtraiu 1 h nessa seção, **cria** erro. AM 02615: fuso não conferível só com o texto (AM tem UTC−4 e UTC−5). | alta |
| 3 | «Nelas, a trava de abertura da urna usou o relógio adiantado, e 3 votos foram dados antes das 8h de Brasília.» | 5 | Se operador em MT digitou Brasília, relógio **já** marca Brasília. Trava às 8h do relógio = 8h Brasília, não antes. 3 votos antes das 8h Brasília **não** seguem do adiantamento descrito, salvo correção que subtraiu 1 h de timestamp que já era Brasília. Número não sustenta a frase. | média |
| 4 | «Erro de leitura em 3 seções. […] Pendente: correção em `src/perfil-secoes.js` e nova leitura de todos os diários.» vs. 34.066 / 33.668 / 34.330 / 417 / 1.960 como **Fato** | 4 | Voto tardio sai do diário, não do boletim. «Não afeta o boletim» não salva a conta de horário. 3 seções com diário mal lido + contas de diário como 100% correto. Viola regra: Fato só com universo conferido. | média |
| 5 | «Sem o exterior, ela dá 33.668; os 662 votos que faltam para 34.330 estão em seções cujo boletim saiu de urna de reserva. **Fato.**» | 2 | 34.330 − 33.668 = 662 (conta fecha). 34.330 = Brasil, urna própria + reserva; **exclui** 1.310 seções / 417 votos do exterior. Se 34.330 aparece como total do 2º turno, denominador trocado. | média |
| 6 | «cruzar com os 313 locais inteiros e os 818 mistos» (item **Pendente**) | 4 | Regra: Pendente **sem** número. 313 e 818 entram com cifra. Nesta parte 3 não há conta nem universo que os gere. | baixa |

Números conferidos sem problema: 5

- 2 + 1 = 3 seções (cópias repetidas + diário de outra seção)
- 34.330 − 33.668 = 662
- 499.207 pacotes (bate universo do 2º turno informado)
- 90069, 90905, 90921: mesma tríade MT nas duas menções
- 0 falha ⊂ 499.207 (parecer 24); 5 e 20 só cabem no total, valor absoluto não conferível aqui

Não conferível só com o texto (sem dado, sem script): 1.310, 417, 252, 81, 3 votos, 34.066, 1.960, 33.668 (valor absoluto), 313, 818, 5, 20. 1.960 < 34.066 e 252 ≤ 1.310 são só desigualdades internas, não validam os totais.