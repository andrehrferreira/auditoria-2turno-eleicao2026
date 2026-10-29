# Parecer sobre T03 (GPT Astra): método de comparação entre turnos

Resposta: [astra.md](astra.md) (hash em [consultas.jsonl](consultas.jsonl)). Revisão de 29/10/2026, sobre a versão 1 de `src/comparar-turnos.js`.

| Achado | Decisão | O que mudou na versão 2 |
|---|---|---|
| A1: "troca" não prova eleitor migrando | Aceito. Contraexemplo reproduzido em teste | Métrica renomeada para `residuo<número>` (resíduo contábil) |
| A10: usar limite com marginais fixas | Aceito | Nova `migracaoMinima`: votos do 2º turno que nem abstenção, eliminados, brancos/nulos e novos aptos do 1º turno cobrem. Alerta contábil a partir de 10 |
| A3: MAD zero esconde extremos | Aceito | `referencia()` usa o desvio absoluto médio quando o MAD é zero |
| A5: mínimo de 10 eleitores media a variação bruta | Aceito | O mínimo agora é o desvio em eleitores em relação à mediana das vizinhas |
| A2: testar conservação dos votos | Aceito | Alerta de consistência quando a soma dos votos ≠ comparecimento, em cada turno |
| A8: `max(0)` escondia contagem negativa | Aceito | Alerta de consistência quando há mais liberações "pelo mesário" do que manuais |
| A9: contexto operacional fora do alerta | Aceito em parte | Troca de urna, modelo e mesários em comum gravados em cada suspeita. Ajuste estatístico por esses fatores fica para depois |
| A12: finalistas mudavam por UF | Aceito | Finalistas = os dois números do 2º turno; erro se aparecer um terceiro |
| A14: limiar de aptos sem fundamento | Aceito em parte | Alertas separados por tipo (estatístico, contábil, consistência, cadastral). O limite de 5 continua heurístico e documentado como tal |
| A11: viés por excluir seções com vários pacotes | Aceito como relato | A cobertura (`multiPacote`, `soNo1`, `soNo2`) sai no resumo de cada UF. Reconciliação fica pendente |
| A4: \|z\| ≥ 5 não é teste calibrado | Aceito como limite do método | Alertas declarados exploratórios no código e nos documentos. Calibração por simulação fica pendente |
| A6: a seção entra na própria referência | Recusado por ora | Com mediana, uma seção desloca o centro em no máximo uma posição; em grupos de 10 ou mais o efeito é pequeno. Reavaliar se surgirem alertas em zonas pequenas |
| A7: denominadores | Aceito em parte | Denominador por métrica gravado (`den`) e usado no desvio em eleitores. Comparar taxas C2/N2 − C1/N1 fica pendente |
| A13: o trânsito não fecha o total | Concordo | A queda do total (−27 no AC, −45 em AL) segue **[a confirmar]** |
| A15: números não reproduzíveis só com o prompt | Concordo | O modelo não recebe os dados. A reprodução é pelo pipeline do repo |

Efeito da versão 2 em AC e AL: 115 e 325 seções com alerta, todas estatísticas; nenhuma migração mínima obrigatória, nenhuma inconsistência de soma ou de cadastro.
