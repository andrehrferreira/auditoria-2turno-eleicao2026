# Parecer do coordenador sobre a T17 (Kimi 3, revisão do código da integridade)

Respostas: [a/kimi.md](a/kimi.md). Lida em 29/10/2026.

- O prompt inteiro (92 KB) recebeu HTTP 502 do 9Router duas vezes. Ele foi dividido em [prompt-a.md](prompt-a.md) (lacres, resumo, casos especiais, urnas reaproveitadas, entre turnos) e [prompt-b.md](prompt-b.md) (autoverificação e sobreposição de logs).
- Parte A: a resposta veio **cortada** depois do primeiro achado (548 bytes). Parte B: HTTP 502 de novo. A T17 fica **em andamento**: reenviar as duas partes quando o roteador estabilizar.

| Item | Decisão | Por quê / o que mudou |
|---|---|---|
| A1. Retomada perde zona em queda: `feitos.json` gravado antes de as linhas saírem do buffer do stream | **Aceito, corrigido** | Conferido no código (`integridade-lacres.mjs`): a gravação periódica de `feitos.json` não esperava o buffer, e no fim `feitos.json` era gravado antes de fechar os streams. Agora a gravação periódica espera as escritas anteriores (`write('', cb)`) e o fim fecha os streams antes. Não afetou números publicados: o 1º turno fechou com 499.248 linhas = universo, e o 2º turno com 0 duplicata e 499.207 seções oficiais |
