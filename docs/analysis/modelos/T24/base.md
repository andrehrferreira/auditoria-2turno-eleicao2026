# T24 — Rótulo dos pisos de títulos de 100+ no tópico 6 (consenso entre revisores)

Contexto: relatório de perícia sobre os arquivos públicos das eleições brasileiras de 2026, para leitor leigo, em PDF. O dono da auditoria delegou a decisão ao consenso dos revisores (Astra, Grok, Kimi e Claude; maioria de quatro votos; empate decide a opção mais conservadora com a regra).

**Regra do relatório (literal):** "Jamais colocar no relatório de perícia dado incompleto, parcial, estimado ou não conferido. Só entra número 100% correto: universo completo (todas as seções, todas as UFs), conferido nos arquivos oficiais, com script que o reproduz. Fica fora: estimativa estatística, amostra, 'cerca de', número de terceiros não conferido (imprensa, pesquisas) e conta feita sobre suposição. O que ainda não está completo entra só como Pendente, sem número."

## O texto atual do tópico 6 (títulos de falecidos)

Contas, todas sobre o universo completo e reproduzidas por script:
- Eleitores aptos com 100 anos ou mais, domicílio no Brasil (cadastro do TSE): 297.977 — Fato.
- Pessoas com 96+ no Censo 2022 do IBGE (quem pode ter 100+ até o fim de julho de 2026): 149.424 — Fato.
- Pessoas com 95 anos no Censo 2022: 53.568 — Fato.
- "Títulos de 100+ sem pessoa correspondente, supondo que ninguém morreu e que a idade é contada até o fim de julho de 2026": 297.977 − 149.424 = **148.553** — rotulado "Fato (piso, com essa condição)".
- "Títulos de 100+ sem pessoa correspondente, supondo que ninguém morreu, para qualquer data de 2026": 297.977 − 149.424 − 53.568 = **94.985** — rotulado "Fato (piso)".

O texto explica: supor que ninguém da coorte morreu em quatro anos **favorece o cadastro** (por isso é piso); a data em que o TSE conta a idade não está documentada (Pendente) e, se for depois do fim de julho de 2026, o 148.553 deixa de valer, mas o 94.985 vale; para zerar o 148.553 o Censo teria de ter contado no máximo 50,15% das pessoas de 96+ (conta direta); a estimativa com mortalidade fica fora (Pendente). O texto já diz que o saldo não mostra quem votou nem que houve uso dos títulos.

## A objeção dos revisores da revisão geral (T20)

Os três modelos apontaram que 148.553 e 94.985 são "contas condicionais tratadas como fatos": dependem de (i) cobertura completa do Censo, (ii) data de referência da idade e (iii) correspondência entre população residente e domicílio eleitoral (o exterior já está fora). Pela regra, "conta feita sobre suposição" fica fora.

## Opções

- **(a) Manter como está:** os dois saldos rotulados "Fato (piso)", com as condições escritas ao lado, porque a suposição "ninguém morreu" só pode diminuir o saldo real (é conservadora) e as outras condições estão declaradas.
- **(b) Manter só o 94.985** como "Fato (piso)" (não depende da data de referência) e tirar o 148.553 do relatório (fica na análise técnica).
- **(c) Tirar os dois saldos:** manter só as contagens oficiais (297.977 no cadastro; 149.424 e 53.568 no Censo) como Fato, e escrever a comparação em palavras ("o cadastro tem mais eleitores de 100+ do que o Censo contou de pessoas que poderiam ter essa idade"), com o tamanho exato do saldo como Pendente até o TSE informar a data de referência e se houver conferência da cobertura do Censo.

Responda em JSON: {"opcao":"a|b|c","justificativa":"até 4 frases","texto_sugerido":"a frase que deve ficar no relatório"}. Considere a regra literal, o leitor leigo e o risco de o relatório ser acusado de exagero em qualquer sentido (acusar o cadastro sem base, ou esconder um dado oficial relevante).
