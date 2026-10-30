# T21 — A totalização confere o certificado das urnas? Síntese

30/10/2026. Participantes: GPT Astra (lógica e método), Kimi 3 (segurança de PKI), Grok (prática eleitoral) e Claude (coordenador, posição escrita antes de ler os outros: [claude/posicao.md](claude/posicao.md)). Uma rodada; as quatro análises convergiram, então a rodada 2 não foi feita. Respostas: [astra](astra/astra.md), [grok](grok/grok.md), [kimi](kimi/kimi.md).

## Percepção do auditor
"Se a totalização não valida a cadeia de validade do certificado da urna, é possível que não exista validação de fato; logo qualquer certificado contabiliza; um flashcard adulterado com certificação qualquer passaria."

## Convergência (os quatro)
1. **Procede:** há sinal de que a validade temporal da cadeia não foi exigida (fato 5 da base) e de que a chave da AC URNA seguiu em uso depois do vencimento (fato 4) — falha de ciclo de vida da AC e de transparência.
2. **Não decorre:** "não confere data" → "não confere nada" é salto lógico; conferir data e conferir assinatura são passos separados; pinning da chave da AC é o arranjo mais comum em sistema fechado.
3. **Contrariado pelos fatos 1, 2 e 6:** nenhum dos ~1 milhão de pacotes totalizados tem certificado fora das três ACs; a totalização é igual aos BUs publicados → nenhum pacote com certificado "qualquer" entrou nesta eleição. (Kimi: "empiricamente falso nesta eleição"; Grok: "salta de falha de calendário para falha de autenticação"; Astra: "continua sem demonstração".)
4. **Não provado:** que a totalização recusaria um certificado qualquer — só que nenhum entrou.
5. **Risco real:** a chave da AC URNA (compromisso ou uso pós-vencimento) — com ela, um pacote adulterado passaria em qualquer conferência.
6. **Confiança:** alta na lógica e no que os fatos refutam; média ou indeterminada sobre o que o programa de totalização executa (depende do TSE).

## Decisão do coordenador
O resultado entrou no relatório temático da AC URNA como item próprio em "O raciocínio do auditor", sem nomes de modelo (regra de relatório independente). Perguntas ao TSE já no temático.
