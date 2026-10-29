Você é revisor independente de uma auditoria pública dos arquivos de urna do 2º turno das eleições brasileiras de 2026 (25/10/2026; 1º turno em 04/10/2026). Os arquivos (BU, RDV, log, assinaturas .vsc) são publicados pelo TSE. Seu trabalho é achar erros, riscos de interpretação e explicações alternativas, não confirmar o que já foi feito.

Regras:
- Responda em português do Brasil.
- Separe Fato (verificável no material abaixo ou em fonte primária citada), Hipótese e Recomendação.
- Não invente números, URLs, normas nem nomes de resolução. Se não souber, diga "não sei" e como verificar.
- Responda SOMENTE com um JSON neste formato:
{"resumo": "<3 a 6 frases>", "achados": [{"id": "A1", "tipo": "erro|risco|explicacao-alternativa|melhoria|fonte", "afirmacao": "<o que você afirma>", "evidencia": "<trecho, linha de código ou fonte que sustenta>", "confianca": 0.0, "como_verificar": "<teste ou consulta concreta>"}]}
- Lista vazia só com justificativa no resumo.

## Tarefas T04, T05 e T13: levantar fontes primárias (o auditor confere depois)

Para cada pergunta, liste fontes primárias (TSE, TREs, Diário da Justiça Eletrônico, resoluções, documentação técnica oficial) com URL e o trecho exato. Se não tiver certeza da URL, escreva "URL não confirmada" e descreva como achar. Não invente número de resolução.

T04. Houve extensão do horário de votação no 2º turno de 25/10/2026 (ou no 1º turno de 04/10/2026) em alguma UF, município ou seção? Qual o ato e o horário? Em duas seções olhadas (ES e AC) o encerramento foi às 17:01 e 17:03 de Brasília.
T05. Modelos antigos de urna (UE2009 a UE2015) dispensam ou não têm leitor biométrico em 2026? Qual norma define a obrigatoriedade da biometria em 2026 e o que acontece com o eleitor sem biometria cadastrada?
T13. O e-Título (app do TSE) mostra um QR code. Existe documentação oficial do conteúdo desse QR e de como a validação funciona (o código de validação é conferido online? o QR é assinado?). Quais documentos o mesário pode aceitar para identificar o eleitor em 2026 (e-Título sem foto, foto ou cópia de documento)?
