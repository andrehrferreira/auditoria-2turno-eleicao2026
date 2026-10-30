# Parecer do coordenador sobre a T17 (Kimi 3, revisão do código da integridade)

Respostas: [a/kimi.md](a/kimi.md). Lida em 29/10/2026.

- O prompt inteiro (92 KB) recebeu HTTP 502 do 9Router duas vezes. Ele foi dividido em [prompt-a.md](prompt-a.md) (lacres, resumo, casos especiais, urnas reaproveitadas, entre turnos) e [prompt-b.md](prompt-b.md) (autoverificação e sobreposição de logs).
- Parte A: a resposta veio **cortada** depois do primeiro achado (548 bytes). Parte B: HTTP 502 de novo. A T17 fica **em andamento**: reenviar as duas partes quando o roteador estabilizar.

| Item | Decisão | Por quê / o que mudou |
|---|---|---|
| A0 (resposta cortada). Retomada perde zona em queda: `feitos.json` gravado antes de as linhas saírem do buffer do stream | **Aceito, corrigido** | Conferido no código (`integridade-lacres.mjs`): a gravação periódica de `feitos.json` não esperava o buffer, e no fim `feitos.json` era gravado antes de fechar os streams. Agora a gravação periódica espera as escritas anteriores (`write('', cb)`) e o fim fecha os streams antes. Não afetou números publicados: o 1º turno fechou com 499.248 linhas = universo, e o 2º turno com 0 duplicata e 499.207 seções oficiais |

## Parte A completa (nova tentativa, 30/10/2026)

Resposta: [a/kimi.md](a/kimi.md), 12 achados. A parte B segue com HTTP 502 do roteador ([prompt-b.md](prompt-b.md), 38 KB): reenviar quando o roteador estabilizar.

| Item | Decisão | Por quê / o que mudou |
|---|---|---|
| A1. Intervalo de uso da urna = primeira e última linha do log inteiro | Já tratado | É o motivo de `integridade-sobreposicao-bruto.mjs`, que confere cada par no bruto (doc 03: 0 escrita simultânea; parecer 24, item 7) |
| A2. `sobrepoeReal` trata carga ausente como diferente | Aceito como limite, sem efeito | Só aumenta a lista marcada, que o script do bruto confere um a um |
| A3. Seção com 2 pacotes: escolha depende da ordem | Recusado, sem efeito | Nenhuma seção tem mais de um hash no `aux.json` (parecer 28, item 1) |
| A4. `casos-especiais` usa o último hash | Recusado, sem efeito | Mesmo motivo do A3 |
| A5. `logsDaSecao` quebra com hash ausente | Aceito como robustez, sem efeito | O script rodou nos dois turnos sem esse caso |
| A6. `integridade-entre-turnos.mjs` corrompido | Recusado | Corte na colagem do prompt; `node --check` passa no arquivo do repo |
| A7. Retomada aborta com última linha cortada | **Aceito, corrigido** | `integridade-lacres.mjs`: linha que não parseia é de zona não concluída e sai junto |
| A8. Log ilegível sai sem aviso de urnas reaproveitadas | Recusado, sem efeito | 0 log ilegível nos dois turnos (doc 07) |
| A9. `votosNosLogs` soma todas as profundidades | Recusado, sem efeito | Recontado de forma independente pelo parecer 25, com cópias tiradas: votos do log = BU nas seções RED |
| A10. Bloco de geração da MR supõe a ordem das linhas | Recusado | Conferido no bruto pelo parecer 24 (item 6): 7 grupos de geração única |
| A11. Código de carga repetido não é anomalia | Recusado | O código de carga é único por carga: 0 repetição entre seções nos dois turnos (doc 03) |
| A12. Chave escalar misturada em `r.campos` | Aceito como cosmético | Não muda número publicado |
