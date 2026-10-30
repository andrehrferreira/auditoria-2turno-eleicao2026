# T22 — Duas decisões de redação do relatório de perícia (consenso entre revisores)

Contexto: relatório de perícia sobre os arquivos públicos das urnas das eleições brasileiras de 2026, escrito para leitor leigo, publicado em PDF. O dono da auditoria delegou estas duas decisões ao consenso dos revisores (maioria simples de quatro votos; empate decide o coordenador pela opção mais conservadora com a regra).

**Regra do projeto para o relatório (literal):** "Jamais colocar no relatório de perícia dado incompleto, parcial, estimado ou não conferido. Só entra número 100% correto: universo completo (todas as seções, todas as UFs), conferido nos arquivos oficiais, com script que o reproduz. Fica fora: estimativa estatística, amostra, 'cerca de', número de terceiros não conferido (imprensa, pesquisas) e conta feita sobre suposição. O que ainda não está completo entra só como Pendente, sem número." Outra premissa do dono: "o relatório final tem dados bem detalhados (tabelas por UF, por turno, por caso) e gráficos, em linguagem simples que qualquer pessoa entenda".

## Decisão 1 — Resultados de testes estatísticos no relatório

Hoje o relatório traz, rotulados e calculados sobre todas as seções (não amostra), reproduzidos por uma segunda verificação independente:
- tópico de liberação sem digital: o resultado do teste principal (diferença d = −0,0039, erro-padrão 0,0015, t = −2,60, limite 3,32 para 56 testes) e a sensibilidade (com idade, t = +5,93; com escolaridade, t = −3,81), concluindo que o teste "não decide";
- tópico de urnas reserva: "a parcela do 13 mudou −0,05 ponto em relação às vizinhas (intervalo −0,12 a +0,03)";
- relatório temático do certificado: p-valores e intervalos de testes de votos.
Opções:
- **(a) Manter**, com rótulo explícito "resultado de teste estatístico" e explicação simples do que significa.
- **(b) Tirar** os números do teste do relatório; ficam só a conclusão em palavras ("o teste não decide"; "votaram como as vizinhas") e os limites; os números ficam na análise técnica separada.

## Decisão 2 — "O governador eleito do RJ teria 49,270%"

Fato: no 1º turno, o governador eleito do RJ teve 50,880% dos votos válidos; 274.411 votos dados ao nº 10 foram contados como nulo técnico (candidatura fora da disputa); bastariam 147.771 votos válidos a mais para ele perder a maioria. A frase "contados como válidos, o eleito teria 49,270%" supõe que esses votos fossem válidos (a exclusão do nº 10 está Pendente). O mesmo tópico já tirou, pelo mesmo motivo, a conta de vagas de deputado.
Opções:
- **(a) Manter** o 49,270% (texto, resumo e gráfico).
- **(b) Tirar** o 49,270%; manter só o fato aritmético "274.411 > 147.771" e a Pendência sobre a exclusão.

Responda em JSON: {"decisao1":"a|b","justificativa1":"…","decisao2":"a|b","justificativa2":"…"} — justificativas curtas (até 3 frases), considerando a regra literal, o leitor leigo e o risco de o relatório ser acusado de exagero em qualquer sentido.
