# 10. Equipe de auditores (agentes especialistas)

A auditoria usa agentes do Claude Code com perfis profissionais diferentes. Cada perfil examina os mesmos dados por um ângulo próprio. Os perfis ficam em `.claude/agents/` e podem ser chamados de qualquer sessão deste projeto. Quem coordena é a sessão principal: ela divide o trabalho, revisa os achados, muda o status em [hipoteses.md](hipoteses.md) e escreve o [relatório de perícia](pericia/README.md).

## Perfis

| Agente | Ângulo | Pergunta típica |
|---|---|---|
| `matematico-forense` | Invariantes, impossibilidades, combinatória | "Esta contagem pode existir? Que restrição ela viola?" |
| `estatistico-eleitoral` | Distribuições, testes de hipótese, forense eleitoral | "Isto é raro mesmo, ou só parece raro?" |
| `cientista-politico` | Contexto regional, comportamento do eleitor, histórico | "Este resultado é plausível para este lugar e esta eleição?" |
| `demografo` | Cadastro, idade, mortalidade, população | "O eleitorado e o comparecimento batem com a população?" |
| `engenheiro-seguranca-urna` | Arquitetura da urna, criptografia, superfície de ataque, logs | "Por onde alguém poderia fraudar, e que rastro isso deixaria?" |
| `cetico-revisor` | Revisão adversarial | "O que derruba esta conclusão?" |
| `redator-pericia` | Linguagem simples para leigos | "Como explicar isto sem jargão e sem exagero?" |

Os temas de trabalho em andamento (contagem, biometria, linha do tempo, forense, integridade) usam os mesmos dados. Os perfis cruzam esses temas.

## Regras comuns (valem para todo agente)

1. **Leia antes:** a seção "Para quem chega agora" de [README.md](README.md), o **princípio 8 de [01-premissas.md](01-premissas.md)**, [09-banco-sqlite.md](09-banco-sqlite.md), [07-checklist-auditoria.md](07-checklist-auditoria.md), [hipoteses.md](hipoteses.md) e os achados já existentes em `docs/analysis/` e `docs/casos/`.
   - **Princípio 8 (nunca confiar em pessoas):** procedimento executado por gente não conta como controle nem como explicação benigna. Exemplos: "o mesário conferiu o documento com foto", "o presidente digitou o ano informado pelo eleitor", "o fiscal acompanhou". Só conta controle técnico que deixa rastro nos arquivos (biometria registrada no log, assinatura, hash). Cada brecha humana vira um risco a testar nos dados. Uma brecha aberta continua não sendo, por si só, prova de fraude.
2. **Dados:** não colete de novo. Para consultar o banco SQLite `data/db/eleicao2026.sqlite`, a forma preferida é `node scripts/sql.mjs`, que é sempre somente leitura: `--tabelas`, `--esquema <tabela>`, `"select ..."`, `--arquivo q.sql --formato csv|json`, `--limite N` (doc 09, seção "Consulta pela linha de comando"). Nos scripts, abra o banco com `abrirLeitura()` de `src/banco-leitura.js`: ela lê a **cópia de leitura** imutável (doc 09) e não concorre com a carga. Não abra o primário `data/db/eleicao2026.sqlite` direto. Use também os perfis `data/parsed/<t>t/perfil/`, os dados abertos `data/raw/dadosabertos/` e, para confirmar casos, os arquivos brutos (`src/exportar.js`). Sem rede, salvo pedido explícito do coordenador.
3. **Universo completo, nunca amostra (princípio 9 do doc 01):**
   - todo número sai de **todas** as seções, todos os logs e todos os eleitores;
   - extrapolar de amostra é proibido;
   - conferir casos no bruto serve só para confirmar uma medida, não para gerá-la;
   - dado incompleto (1º turno em carga) fica marcado como **parcial**, com as UFs incluídas e as que faltam, e é refeito com o total antes de entrar no relatório;
   - toda exclusão tem contagem e motivo.

   **Rigor:**
   - Rotule cada afirmação como **Fato**, **Hipótese** ou **Recomendação**.
   - Para cada teste, declare a hipótese nula, as explicações benignas, a linha de base e o tamanho do efeito.
   - Anomalia estatística não é prova de fraude: diga isso sem amenizar e sem exagerar.
   - Confira todo caso extremo no arquivo bruto antes de chamá-lo de Fato.
4. **Reprodutibilidade:** todo número sai de um script em `scripts/auditoria/<perfil>-*.mjs` (Node 24 puro, sem dependências, ES modules). O achado vai em `docs/analysis/<perfil>/NN-tema.md`, com o comando que o reproduz. Saídas grandes vão em `data/parsed/auditoria/<perfil>/`.
5. **Não edite** o que já existe: `src/`, `test/`, `README.md`, `docs/hipoteses.md`, `docs/pericia/` (exceto o `redator-pericia`, quando chamado para isso), outros docs, a cadeia de evidências. Não apague, não faça commit.
6. **Pessoas:** os arquivos do TSE são públicos e não precisam de máscara (doc 05, regra 6a). Ainda assim, os documentos se referem a **seções**, não a pessoas. Não escreva título de mesário nem nome de eleitor em conclusões: acusação ligada a pessoa identificada passa por revisão jurídica. A base de CPFs (`data/private/`) nunca sai da máquina.
7. **Recursos:** outros agentes rodam ao mesmo tempo. Use no máximo 4 a 6 processos pesados e prefira o banco a reler logs.
8. **Entrega ao coordenador:** os achados em 1 a 3 linhas cada, com números; Fato separado de Hipótese; as anomalias reais com localização; os arquivos criados; o que ficou pendente.
