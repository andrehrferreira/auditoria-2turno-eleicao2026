# T25: veredito final de cada hipótese, só com dados públicos (consenso entre revisores)

Contexto: a auditoria é independente e examina os arquivos públicos das eleições brasileiras de 2026: boletim de urna, registro digital do voto, diário da urna e assinaturas, em todas as 499.248 seções dos dois turnos, além dos dados abertos do TSE e do IBGE. No 2º turno de Presidente, o 13 venceu por 4.430.191 votos. O dono da auditoria decidiu **não esperar resposta do TSE**: o pedido pela Lei de Acesso à Informação continua como anexo, mas o relatório fecha agora. Cada hipótese recebe um veredito final com o que os dados públicos permitem concluir. A decisão vai ao consenso dos revisores (Astra, Grok, Kimi e Claude). Vence a maioria dos quatro votos. Em empate, fica a opção mais conservadora com a regra do relatório.

**Regras do relatório (literais):**
- Só entra número 100% correto: universo completo (todas as seções, todas as UFs), conferido nos arquivos oficiais, com script que o reproduz.
- Fica fora: estimativa estatística, amostra, "cerca de", número de terceiros não conferido e conta feita sobre suposição.
- "Nunca confiar em pessoas": procedimento feito por gente (mesário, cartório, fiscal) não conta como controle nem como explicação benigna. Só conta controle técnico que deixa rastro nos arquivos.
- Fato é o que os arquivos mostram e um script reproduz. Hipótese é explicação ainda não provada.

## Vereditos possíveis (escolha um por hipótese)

- **R (refutada):** os dados públicos mostram que o mecanismo, como foi descrito, não ocorreu na escala alegada.
- **S (sem sinal nos dados públicos):** testada no universo completo, sem sinal. Os pontos cegos estão declarados. Não é prova de que não houve nada.
- **F (fato que pede explicação):** há irregularidade técnica, falha de controle ou anomalia comprovada nos arquivos, sem prova de fraude nem de efeito no resultado.
- **C (confirmada):** fraude comprovada pelos arquivos.
- **N (não decidível com dados públicos):** o teste que decidiria exige dado que não é público ou exame físico. Diga qual.

E, para cada hipótese, o campo **resultado**:
- **"nao"**: a evidência limita o efeito máximo abaixo da margem de 4.430.191 votos;
- **"nao_excluido"**: os dados públicos não limitam o efeito abaixo da margem;
- **"sim"**: a evidência mostra efeito capaz de mudar o vencedor.

## Formato da resposta

Somente JSON, um objeto por hipótese desta parte:

```json
[{"id":"H01","veredito":"R|S|F|C|N","resultado":"nao|nao_excluido|sim","frase_final":"uma frase em linguagem simples, para leigo, que vai ao relatório","justificativa":"até 3 frases","discordo_do_status_atual":"sim|nao"}]
```

Considere o risco de exagero nos dois sentidos: acusar sem base, ou absolver sem base. Não invente número. Use só os que estão abaixo.

## Evidência por hipótese
