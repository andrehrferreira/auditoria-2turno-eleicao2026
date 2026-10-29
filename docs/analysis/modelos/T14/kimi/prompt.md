# Tarefa T14, rodada 1: a virada do 2º turno de 2026 é possível sem fraude?

Você é ENGENHEIRO DE SEGURANÇA DE SISTEMAS ELEITORAIS. Sua tarefa é descrever como alguém produziria esta virada por fraude (na urna, na carga, na transmissão, na totalização ou com mesários coniventes) e, para cada caminho, que rastro ficaria nos arquivos públicos (BU, RDV, log, assinaturas, horários) e se os fatos acima mostram ou descartam esse rastro. Seja concreto e adversarial.

O auditor que encomendou a análise acha a virada impossível e pediu que seja provado o contrário de forma incontestável. Não tente agradá-lo nem contrariá-lo: siga os dados.

## Fatos medidos (fonte: arquivos públicos do TSE, processados por scripts deste projeto)

Eleição presidencial do Brasil, 2026. 1º turno 04/10, 2º turno 25/10. Finalistas: 13 (Lula) e 22 (Flávio Bolsonaro).

Totais nacionais oficiais (dados abertos do TSE, detalhe_votacao_secao e votacao_candidato_munzona):
| | 1º turno | 2º turno |
|---|---|---|
| Aptos | 158.745.502 | 158.745.502 |
| Comparecimento | 125.275.835 | 128.236.074 |
| Brancos | 2.300.798 | 1.430.496 |
| Nulos | 3.669.003 | 2.723.305 |
| 22 Flávio | 56.104.503 | 59.826.041 |
| 13 Lula | 53.879.538 | 64.256.232 |
| Eliminados | 14 Renan Santos 2.675.887; 55 Ronaldo Caiado 2.605.148; 70 Augusto Cury 3.448.569; 30 Zema 326.488; demais 6 somam 260.655 (total 9.316.747) | — |

- No 1º turno Flávio liderou por 2.224.965. No 2º turno Lula venceu por 4.430.191. Em todos os 2º turnos presidenciais desde 1989 o líder do 1º turno venceu; esta é a primeira virada.
- Identidade contábil nacional: ganho de Lula (+10.376.694) + ganho de Flávio (+3.721.538) = 14.098.232 = eliminados (9.316.747 + 5.246 de diferença de arredondamento de situação de candidatura) + aumento de comparecimento (2.960.239) + queda de brancos/nulos (1.816.000). Lula ficou com 73,6% desse total líquido.

Integridade (fatos do projeto):
- Soma dos BUs (boletins de urna assinados) = resultado oficial do 2º turno em 499.205 de 499.205 seções, presidente, 0 divergências.
- Assinaturas digitais das urnas e hashes dos arquivos conferidos: 0 falhas no Acre inteiro (2.270 seções) e em casos de outras UFs; verificação nacional em andamento. O bloco de assinatura de software (algoritmo CEPESC) não é verificável por terceiros.
- Em todas as 357.845 seções comparadas (26 UFs), a soma dos votos de presidente no BU = comparecimento, nos dois turnos.
- Mesma seção nos dois turnos (26 UFs, 357.845 seções): a "migração mínima obrigatória" (votos de um finalista no 2º turno acima de: votos dele no 1º + eliminados + brancos/nulos + toda a abstenção do 1º) passa de 10 eleitores em UMA seção só (PI, 24 eleitores, mesma urna e mesmos mesários).
- Urnas: as que serviram nos dois turnos têm a mesma carga (data/hora) nos dois turnos; trocas só em urnas de contingência.
- Horário: o STF (liminar, segundo a imprensa) prorrogou o 2º turno até 19h onde as urnas estavam abertas; nos logs de 26 UFs só 458 votos foram computados depois das 18h de Brasília no 2º turno (no 1º turno, sem prorrogação, 736 mil depois das 18h por fila).
- Habilitação: no Acre, 100% dos votos tiveram conferência registrada no log (biometria 91,6%, ano de nascimento para quem não tem biometria cadastrada 3,4%, liberação manual 5,0%). 30,8% das liberações manuais usaram uma digital que a urna gravou sem associar a mesário registrado.

Regressão ecológica de Goodman por seção (27 UFs, 395.520 seções; falta SP). Taxa estimada de cada grupo do 1º turno para cada destino do 2º:
| Origem 1T | → 13 | → 22 | → branco/nulo | → abstenção |
|---|---|---|---|---|
| 13 | 1,014 | −0,036 | 0,005 | 0,017 |
| 22 | −0,031 | 0,999 | 0,006 | 0,026 |
| 14 Renan | 0,50 | 0,43 | 0,14 | −0,08 |
| 55 Caiado | 0,44 | 0,54 | 0,07 | −0,04 |
| 70 Cury | 0,57 | 0,27 | 0,14 | 0,02 |
| demais | 0,40 | 0,77 | 0,16 | −0,33 |
| branco/nulo | 0,82 | 0,11 | 0,38 | −0,30 |
| abstenção | 0,059 | 0,031 | 0,003 | 0,908 |
Por UF, a taxa 22→13 fica entre −0,08 e +0,04 em todas as 27 UFs. A taxa 55→13 varia de 0,20 (MS) a 0,91 (BA); 14→13 de 0,25 (SC) a 0,89 (AC).

Premissa obrigatória da auditoria: NUNCA confiar em pessoas. Regra de procedimento (mesário confere documento, fiscal acompanha) não conta como controle; só controle técnico com rastro nos arquivos.

Responda em português do Brasil. Separe Fato, Hipótese e Recomendação. Não invente números nem fontes; se citar eleição de outro país, marque "[verificar]" no número. Responda SOMENTE com JSON:
{"posicao": "plausivel|implausivel|inconclusivo", "confianca": 0.0, "resumo": "<5 a 8 frases>", "argumentos_contra_a_virada": ["..."], "argumentos_a_favor_da_virada": ["..."], "testes_decisivos": [{"teste": "...", "o_que_indicaria_fraude": "...", "dados_necessarios": "..."}], "falhas_na_analise_apresentada": ["..."]}
