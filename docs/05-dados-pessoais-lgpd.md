# 05. Dados pessoais e LGPD

A base própria de pessoas (CPFs) e qualquer retorno de consulta por CPF são **dados pessoais** (LGPD, Lei 13.709/2018). Nem a pesquisa nem a auditoria eliminam as obrigações da lei.

## Regras obrigatórias

| # | Regra |
|---|---|
| 1 | A base de CPFs **nunca** entra no repositório. Fica em `data/private/`, listado no `.gitignore` |
| 2 | Nos dados processados, o CPF vira um **identificador pseudonimizado**: HMAC-SHA256 com chave secreta local, fora do repo, em `.env` |
| 3 | Relatórios, gráficos e commits trazem **apenas agregados** (por UF, município, zona ou seção, com contagens). Grupos pequenos (n < 5) são suprimidos, para evitar reidentificação |
| 4 | Exemplos, testes e documentação usam **dados fictícios** |
| 5 | Os retornos de APIs pagas ficam em `data/private/` e seguem a mesma regra 1 |
| 6 | Cada consulta externa registra finalidade, data e volume num log local, sem o CPF em claro |
| 6a | O **log da urna** traz o número do título dos mesários (registro, habilitação, encerramento). Em qualquer saída, mascarar como "Mesário A/B/C…" (doc 06) |
| 7 | Nenhum resultado individual ("fulano está morto e votou") é publicado. Casos individuais que pareçam relevantes vão, como **rascunho**, para a autoridade competente (MPE/TRE), com revisão humana |

## Pendências (Recomendação)

- [ ] Definir e registrar a **base legal** do tratamento (art. 7º e art. 11 da LGPD) e a **origem** da base de CPFs. Validar com advogado
- [ ] Definir o prazo de retenção e o descarte da base privada ao fim da auditoria
- [ ] Confirmar se o contrato do SERPRO/bureau permite essa finalidade
