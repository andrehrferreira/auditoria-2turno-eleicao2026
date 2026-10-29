# Auditoria independente: 2º turno das eleições de 2026

Documentação de premissas, fontes e métodos da auditoria independente dos arquivos públicos das urnas eletrônicas do 2º turno das eleições gerais de 2026 (25/10/2026).

Trabalhos anteriores, com a mesma linha metodológica:

- 2022, 2º turno: <https://github.com/andrehrferreira/auditoria-2turno-eleicao2022>
- 2024, 1º turno: <https://github.com/andrehrferreira/auditoria-1turno-eleicoes-2024>

## Índice

| Documento | Conteúdo |
|---|---|
| [01-premissas.md](01-premissas.md) | Objetivo, escopo, princípios e limites do que dá para provar |
| [02-fontes-tse.md](02-fontes-tse.md) | Endpoints e arquivos do TSE verificados para 2026 |
| [03-coleta-bus-logs.md](03-coleta-bus-logs.md) | Plano de coleta de BUs, RDVs e logs, com integridade e retomada |
| [04-hipotese-titulos-falecidos.md](04-hipotese-titulos-falecidos.md) | Hipótese de votos com títulos de falecidos: o que é testável e com quais fontes |
| [05-dados-pessoais-lgpd.md](05-dados-pessoais-lgpd.md) | Regras para a base de CPFs e para publicar resultados |
| [06-leitura-bu-rdv-log.md](06-leitura-bu-rdv-log.md) | Como ler BU, RDV, `.vsc` e log de 2026 e verificar as assinaturas: campos, enums, Ed521, urna de contingência, armadilhas |
| [07-checklist-auditoria.md](07-checklist-auditoria.md) | O que auditar quando a coleta fechar 100%: fonte, método e explicações alternativas de cada item |
| [08-coordenacao-modelos.md](08-coordenacao-modelos.md) | Uso de GPT Astra, Grok e Kimi 3 como revisores: como chamar, regras de dados, papéis e tarefas |
| [09-banco-sqlite.md](09-banco-sqlite.md) | Banco SQLite dos dois turnos (BU, RDV, seções, perfil de log, resultado oficial): como carregar, esquema, views e consultas para o checklist |
| [10-equipe-auditores.md](10-equipe-auditores.md) | Equipe de agentes especialistas (matemático, estatístico, cientista político, demógrafo, segurança, cético, redator): perfis em `.claude/agents/` e regras comuns |
| [hipoteses.md](hipoteses.md) | Registro vivo das hipóteses, com status e evidências |
| [casos/](casos/) | Análises de seções específicas (ex.: [ES 57037/0055/0372](casos/es-57037-z0055-s0372.md)) |
| [pericia/](pericia/) | Relatório de perícia, em linguagem simples para leigos |

## Para quem chega agora (sessões novas)

1. **Onde estamos:** a tabela "Andamento" do [README da raiz](../README.md), que o painel `coleta-tse` também lê. Quem concluir uma etapa atualiza a linha, mantendo o formato.
2. **Os dados já estão prontos. Não colete de novo.** Os dois turnos estão 100% baixados e conferidos (doc 03), em `data/raw/<t>t/urnas/<uf>/<mun>/<zona>/<seção>/<hash>/`.
3. **Para análise, use o banco SQLite** antes de reler binário ou log: `data/db/eleicao2026.sqlite` ([doc 09](09-banco-sqlite.md)).
   - Tem os dois turnos: seções, BU (`voto_bu`), RDV agregado (`voto_rdv`), perfil do log (`perfil_log`, com o JSON completo em `dados`), resultado oficial (`voto_oficial`), candidatos e municípios.
   - Views prontas: `v_resultado_secao`, `v_resultado_municipio`, `v_presidente_1t_2t`, `v_presidente_1t_2t_secao`, `v_divergencia_bu_oficial`.
   - Leitura em Node, sem dependências: `new DatabaseSync('data/db/eleicao2026.sqlite', { readOnly: true })` (`node:sqlite`). O banco usa WAL, então dá para consultar enquanto há carga em andamento.
   - Para recarregar uma UF: `node src/banco.js --turno N --uf xx [--oficial]`. A carga substitui as linhas da UF, sem duplicar.
4. **Para ler uma seção inteira** (pessoa ou LLM): `node src/exportar.js --uf xx --municipio NNNNN --zona NNNN --secao NNNN` gera JSON legível de BU, RDV, BU impresso, assinaturas e log (doc 06).
5. **Requisições ao `resultados.tse.jus.br`**: o servidor bloqueia o IP com HTTP 429. Use o controle de taxa de `src/http.js` e não rode downloads em paralelo com outra sessão (doc 03). A CDN (`cdn.tse.jus.br`) não tem esse limite.
6. **VS Code:** `data/` tem milhões de arquivos. O `.vscode/settings.json` local exclui essa pasta do vigia de arquivos; sem isso, a extensão trava.

## Convenção de classificação

Todas as afirmações nesta documentação e nos relatórios seguem três rótulos:

- **Fato**: verificado em fonte primária, com URL/arquivo e data da verificação.
- **Hipótese**: ainda não testada, ou testada sem resultado conclusivo.
- **Recomendação**: proposta de ação ou de método.

Quando algo não foi confirmado em fonte documentada, aparece como **[a confirmar]**, junto com o modo de validar.
