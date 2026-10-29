# 01. Demografia (H01, frente agregada): fontes e método

Frente agregada da H01 (votos com títulos de falecidos): o eleitorado, a idade dos eleitores e o comparecimento cabem na população e na mortalidade de cada lugar? Tudo é agregado por seção ou por município. Nenhum dado individual e nenhum CPF foram usados.

## Fontes

| Fonte | Arquivo | Data | Uso |
|---|---|---|---|
| TSE, perfil do eleitorado por seção (faixa etária, biometria) | `data/raw/dadosabertos/perfil_eleitor_secao/*.zip` | gerado em 14/07/2026 | eleitores por idade e com ou sem biometria cadastrada, por seção |
| TSE, eleitorado por local de votação | `data/raw/dadosabertos/eleitorado_locais_votacao/eleitorado_local_votacao_2026.zip` | 25/10/2026 | seções agregadas de cada turno (principal ← agregadas) |
| TSE, detalhe da votação por seção (Presidente) | `data/raw/dadosabertos/detalhe_votacao_secao/detalhe_votacao_secao_2026.zip` (`_BR.csv`) | 26/10/2026 | aptos e comparecimento por seção nos dois turnos |
| Banco do projeto (BU) | `data/db/eleicao2026.sqlite`, tabela `secao` | 29/10/2026 | `sem_biometria` (compareceram sem biometria cadastrada) e `por_biografia`; 2º turno completo, 1º turno só nas UFs com carga concluída |
| IBGE, Censo 2022, tabela SIDRA 9514 | `data/raw/externos/ibge/censo2022-9514-idade-{a,b,c}.json` | baixado em 29/10/2026 | população residente por idade e município |
| IBGE, estimativas de população, tabela 6579 | `data/raw/externos/ibge/estimativa-6579-2024-2025.json` | idem | referência (não entra nos cálculos principais) |
| IBGE, Estatísticas do Registro Civil, tabela 2654 | `data/raw/externos/ibge/obitos-2654-{2023,2024}.json` | idem | óbitos por município de residência e idade (média 2023–2024) |
| Portal da Transparência do Registro Civil (Arpen) | `data/raw/externos/registrocivil/obitos-<UF>-2026-05-07-2026-10-25.json` | idem | óbitos de 07/05 a 25/10/2026, por UF e cidade |

URL, data e SHA-256 de cada arquivo externo estão em `data/manifest/externos.jsonl` (33 arquivos; 6 do IBGE, 27 do Registro Civil). Nenhuma fonte exigiu login ou CAPTCHA.

**Fato (29/10/2026):** a soma do perfil por seção é 158.745.463 eleitores, igual à soma de `QT_ELEITOR_SECAO` do eleitorado por local, nos dois turnos; os aptos de Presidente no `detalhe_votacao_secao` somam 158.745.502 (a diferença de 39 são eleitores em trânsito/TTE). Comparecimento de Presidente: 125.275.835 no 1º turno (78,9%) e 128.236.074 no 2º (80,8%).

## Premissas de cálculo

- **Fechamento do cadastro:** 07/05/2026, 150 dias antes do 1º turno (Lei 9.504/97, art. 91). **[a confirmar]** a data exata no calendário eleitoral do TSE de 2026. Janela até o 2º turno: 171 dias; até o 1º: 150.
- **Coorte:** o Censo é de 01/08/2022, cerca de 4 anos antes da eleição. Quem tinha 12 anos ou mais em 2022 tem 16 ou mais em 2026; 86+ vira 90+; 96+ vira 100+. O cálculo não desconta mortes nem migração nesses 4 anos (exceto onde dito).
- **Idade no perfil do TSE:** **[a confirmar]** a data de referência da idade (o leiame não diz). Validar no leiame de outro ano ou pedir ao TSE.
- **Seção agregada:** o comparecimento é da seção principal, que soma as agregadas. O perfil é somado pelas seções que compõem a principal em cada turno. A composição não mudou entre os turnos em nenhuma seção.
- **Princípio 8 (01-premissas):** procedimento humano (cartório comunicar óbito, mesário conferir documento) **não** conta como controle nem como explicação benigna. Só conta controle técnico com rastro: biometria registrada no log. Por isso o grupo **sem biometria cadastrada** é o centro do teste: o eleitor desse grupo é habilitado só com o ano de nascimento.

## Como reproduzir

```bash
node scripts/auditoria/demografo-baixar-ibge.mjs            # rede: IBGE/SIDRA (6 pedidos)
node scripts/auditoria/demografo-baixar-registrocivil.mjs   # rede: Registro Civil (27 pedidos, 1 por UF)
node scripts/auditoria/demografo-perfil.mjs [UF ...]        # perfil por seção → data/parsed/auditoria/demografo/perfil/<uf>.tsv (≈ 7 min em 3 processos)
node scripts/auditoria/demografo-turnos.mjs                 # aptos/comparecimento por seção e turno → secao-turnos.tsv (≈ 1 min)
node --max-old-space-size=8192 scripts/auditoria/demografo-analise.mjs   # todos os testes → resumo.json e listas (≈ 1 min)
```

Saídas em `data/parsed/auditoria/demografo/`: `resumo.json` (todos os números destes documentos), `municipios.tsv`, `secoes-idosos-<t>t.tsv`, `secoes-sem-biometria-<t>t.tsv`, `secoes-variacao-turnos.tsv`.

O 1º turno no banco estava parcial quando a análise rodou (15 UFs: AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB). Os testes que usam o BU do 1º turno (sem biometria) valem só para essas UFs. Rodar `demografo-analise.mjs` de novo quando a carga terminar atualiza tudo.
