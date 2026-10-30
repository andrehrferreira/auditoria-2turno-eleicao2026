## Revisão do tópico 12 (parte 1 de 2)

| # | Trecho exato | Problema (tipo) | Conta refeita ou explicação | Gravidade |
|---|---|---|---|---|
| 1 | "Seções com algum cargo unânime \| 20 \| **33**" (2º turno) | 1/3 | Presidente 2º turno = 30 seções; Governador 2º turno = 4 seções; 30 + 4 = 34, não 33. Só fecha se 1 seção for unânime nos dois cargos (sobreposição), o que o texto não declara. No 1º turno a soma fecha exata (17 + 2 + 1 = 20), o que torna a diferença do 2º turno mais estranha. Ou explicar a sobreposição, ou corrigir para 34. | baixa |
| 2 | "o programa procura sequências de **10 ou mais dígitos**" (Como foi feito, item 4) vs. "qualquer sequência de **10 a 12 dígitos**" (Privacidade) e "escrito por extenso, com **10 a 12 dígitos**" (Limites, item 4) | 3 | Dois critérios de busca diferentes declarados no mesmo tópico: "10 ou mais" pega sequência de 13+ dígitos; "10 a 12" não. Unificar o critério declarado. | baixa |
| 3 | "o mesmo teste que dá 100% nas listas da urna acusou **as 9 listas de cédula de MG**" (contraprova) | 3 | A tabela do item 1 mostra 13 listas fora de ordem no país (9 de cédula + 4 copiadas do boletim), e o próprio texto diz "Todas as 13 listas fora de ordem". A contraprova cita só 9. Se o teste também marcou as 4 do boletim, dizer "13"; se não marcou, explicar por quê. | baixa |
| 4 | "135.770 linhas de nulo por suspensão no dia" (contraprova) vs. 82.404 + 55.959 = 138.363 linhas de suspensão no 1º turno (tabela do item 4) | 3 (aparente) | Mensagens diferentes ("Atribuído voto nulo por suspensão" vs. "Título válido/inválido para suspender"), então não é contradição necessariamente. Mas leitor leigo pode achar que toda suspensão gera nulo; uma frase explicando que nem toda linha de suspensão termina em voto nulo evita falso alarme. | baixa |

**Números conferidos sem problema: 20**

Verificações aritméticas que batem:

1. 2.490.766 = 2.475.472 + 15.044 + 250 (total RDV 1º turno, urna)
2. 539.788 = 533.659 + 6.110 + 19 (total RDV 2º turno, urna)
3. 13 listas fora de ordem = 9 cédula + 4 boletim (MG)
4. 40 cédulas = 20 × 2 seções
5. Coluna 1º turno "válido": 69.912 + 457 + 2 + 91 + 14 + 5 + 11.922 + 1 (repetida) = 82.404 ✓
6. Coluna 1º turno "inválido": 12.068 + 200 + 5 + 104 + 21 + 43.561 = 55.959 ✓
7. Coluna 2º turno "válido": 6.507 + 18 + 20 + 1.953 = 8.498 ✓
8. Coluna 2º turno "inválido": 1.364 + 10 + 5 + 3.611 = 4.990 ✓
9. 55.483 = 11.922 + 43.561 (sem papel, 1º turno) ✓
10. 5.564 = 1.953 + 3.611 (sem papel, 2º turno) ✓
11. 12.032 = 11.922 + 91 + 14 + 5 (sem papel na urna, "válido") ✓
12. 43.686 = 43.561 + 104 + 21 + 0 (sem papel na urna, "inválido") ✓
13. Seções unânimes Presidente 2º turno: 11+4+4+3+1+1+1+1+1+1+1+1 = 30 ✓; eleitores: 1.225+450+537+515+113+44+54+41+56+10+16+39 = 3.100 ✓
14. Presidente 1º turno: 3+2+2+2+1+1+1+1+1+1+1+1 = 17 ✓; eleitores: 93+248+377+7+81+10+54+33+52+26+61+65 = 1.107 ✓
15. Governador 1º turno: 13 + 72 = 85 ✓; Governador 2º: AM 4 (509) ✓; Dep. federal: MT 1 (297) ✓
16. 200 e 10 recusas de mesário (item 5) = valores da tabela ✓; 69.912 e 6.507 aceitos idem ✓
17. 431 / 84.075 = 0,5126% ≈ 0,51% ✓
18. 10.949.380 − 10.949.368 = 12 ✓
19. 499.248 − 499.207 = 41 ✓
20. Sete arquivos não publicados: `jufa.dat`, `imgze.dat`, `hash.dat`, `mr.ver`, `wsqbio.jez`, `wsqman.jez`, `wsqmes.jez` = 7 ✓

**Consistência interna sem problema (não verificável aritmeticamente, mas sem contradição):** 31.764 / 3.801 números diferentes; 5.688 / 1.750 linhas de encerramento; 1.992.260 / 2.074.207 títulos de mesário cruzados; 3.748.505 / 7.542.425 linhas de registro de mesário — mesmos valores nos dois lugares onde aparecem.

**Resumo:** nenhum problema de gravidade alta ou média. Quatro achados de gravidade baixa, todos de explicação/uniformização, nenhum de número errado confirmado. Tabela de suspensão fecha perfeitamente nas quatro colunas; tabelas de seções unânimes fecham por UF em seções e eleitores.