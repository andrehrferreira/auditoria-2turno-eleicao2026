Revisão 08-virada-do-2-turno.md. Seção 1 fecha por dentro. Achados:

| # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade (alta/média/baixa) |
|---|---|---|---|---|
| 1 | «34.330 votos em todas as urnas (Auditor C, [linha-do-tempo/02](../analysis/linha-do-tempo/02-votos-apos-17h.md))» | 2 e 3 | Tabela nacional: 34.330 = Brasil **sem exterior**. Total **com exterior** = 34.747 (exterior 417). «Todas as urnas» está errado. 1.993 após 18h fecha (exterior 0). | alta |
| 2 | «mesmo que os 34.330 votos fossem todos para um só candidato, seriam 0,77% da diferença de 4.430.191 votos» | 2 | 34.330 / 4.430.191 = 0,7749% → 0,77% (conta certa, numerador incompleto). Com 34.747 da tabela: 34.747 / 4.430.191 = 0,784% → 0,78%. Margem ainda muito maior; conclusão qualitativa não vira. | média |
| 3 | Compareceram 2º turno **128.236.074** (tabela §1) vs tabela nacional **128.235.243** («Comparecimento (BU)», Brasil, «universo completo») | 3 | 128.236.074 − 128.235.243 = **831**. Tópico afirma soma de boletins = oficial nas 499.205 seções. Dois «universos completos» não batem. | alta |
| 4 | «nos dois turnos, em todas as seções, a urna registrou exatamente tantos votos para presidente quantos eleitores votaram» e «a soma dos boletins de todas as urnas é igual ao resultado oficial» | 2 e 5 | Universo dado: 499.248 seções; 499.205 com voto para presidente (2º). §3 qualifica «seções com boletim» (499.206 / 499.205). Resposta curta não qualifica. | média |
| 5 | «Em 16.011 das 497.508 seções analisadas do 2º turno […] O excesso soma 36.340 eleitores.» Rotulado **Fato**. | 4 | 497.508 ≠ 499.205 (falta 1.697). Recorte parcial. Regra do tópico: número fora do universo completo não entra como fato; ia a Pendente, sem número. 16.011 e 36.340: texto não dá conta para refazer. | alta |
| 6 | «34.066 votos nas urnas de seção que registram horário de abertura e de último voto (`scripts/h06-votos-apos-17h.mjs`)» | 4 | Recorte menor que «todas as urnas», menor que 34.330 e que 34.747. Diferença 34.330 − 34.066 = 264; após 18h 1.993 − 1.960 = 33. Dois números do mesmo fato, nenhum = total nacional com exterior. | média |
| 7 | «o ganho dos dois finalistas no 2º turno fecha exatamente com o que estava disponível no 1º (14.098.232 votos)» | 5 | 14.098.232 fecha (ver conferidos). Mas inclui +2.960.239 de comparecimento do **2º** turno. Não era «disponível no 1º». Bullet seguinte descreve certo. | baixa |
| 8 | «a diferença vem quase toda de definição» | 4 | «Quase toda» = aproximação, sem número. Viola regra 100% no texto corrido (não há cifra falsa). | baixa |

Números conferidos sem problema: 18

- 2.224.965 = 56.104.503 − 53.879.538
- 4.430.191 = 64.256.232 − 59.826.041
- 10.376.694 = 64.256.232 − 53.879.538
- 3.721.538 = 59.826.041 − 56.104.503
- 14.098.232 = 10.376.694 + 3.721.538
- 14.098.232 = 9.321.993 + 2.960.239 + 1.816.000
- 2.960.239 = 128.236.074 − 125.275.835
- −870.302 = 1.430.496 − 2.300.798
- −945.698 = 2.723.305 − 3.669.003
- 1.816.000 = 870.302 + 945.698
- 9.316.747 = 9.321.993 − 5.246
- 499.194 = 499.205 − 11
- 11 = 10 + 1
- lista Lula: 10 seções
- 73,6% = 10.376.694 / 14.098.232
- +4,0% nominais: (124.082.273 − 119.306.034) / 119.306.034
- 1º: 53.879.538 + 56.104.503 + 9.321.993 + 2.300.798 + 3.669.003 = 125.275.835
- 2º: 64.256.232 + 59.826.041 + 1.430.496 + 2.723.305 = 128.236.074 (fecha **dentro** da tabela do tópico; diverge da tabela nacional, item 3)

Sem erro aritmético na tabela §1. 20 e 24: iguais em resumo e §3b; sem microdado, não reproduz. 2018/2022 (64,8%, 69,8%, −2,1%, +0,3% e perdas por UF): texto não permite conta. §6 MA 10.652 / AM 2.841 / TO 1.778 > perda líquida UF (§2: 9.069 / 1.519 / 1.405): possível se outras seções ganham; não marca contradição. Tabela nacional anexa: somas regionais de seções com log e votos após 17h/18h/19h fecham. Tópico **não** afirma ausência de fraude; limites § final cabem na evidência.