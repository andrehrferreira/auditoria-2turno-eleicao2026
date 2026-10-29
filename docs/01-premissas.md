# 01. Premissas da operação

## Objetivo

Verificar, com dados públicos e métodos reproduzíveis, a consistência interna e estatística dos resultados do 2º turno de 2026. O trabalho parte dos arquivos que a própria urna gera (BU, RDV e log) e os cruza com bases externas.

## Escopo

| Item | Dentro do escopo | Fora do escopo |
|---|---|---|
| Pleito | 2º turno, 25/10/2026 (pleito TSE `3221`) | — |
| Comparação | 1º turno, 04/10/2026 (pleito `3220`), e séries de 2018/2022 | — |
| Arquivos | BU, RDV, log de urna e arquivo de assinatura, por seção | Código-fonte da urna, hardware |
| Eleições | Presidente (federal, cód. `6258`) e Governador (estadual, cód. `6260`), onde houver 2º turno | Cargos sem 2º turno |
| Bases externas | Eleitorado do TSE, IBGE, óbitos agregados (DataSUS/SIM, Registro Civil) e a base própria de CPFs (ver doc 04) | Bases obtidas sem autorização ou com controles de acesso contornados |

## Princípios

1. **Reprodutibilidade.** Qualquer resultado precisa sair de scripts versionados, partindo de arquivos baixados de URL pública. Terceiros devem conseguir refazer o caminho do download ao número.
2. **Cadeia de custódia.** Todo arquivo baixado recebe SHA-256, URL de origem e data/hora UTC num manifesto (ver doc 03). Arquivos brutos não são alterados. O processamento grava sempre em outro diretório.
3. **Neutralidade.** As mesmas análises rodam para todos os candidatos e todas as UFs. Não se publica um recorte que só faça sentido para um lado.
4. **Fato ≠ hipótese.** Anomalia estatística é indício, não prova. Cada achado leva o rótulo Fato, Hipótese ou Recomendação e registra também as explicações alternativas que foram descartadas, ou não.
5. **Linha de base antes de alarme.** Uma métrica só é "anômala" contra uma referência: 1º turno de 2026, 2º turno de 2022, mesma seção, mesmo município ou mesmo modelo de urna.
6. **Sem acesso indevido.** Só se usam fontes públicas, canais oficiais ou serviços contratados. Não se automatiza CAPTCHA nem se contorna autenticação ou limite de uso de sistemas governamentais.
7. **Dados pessoais protegidos.** Nenhum CPF, nome ou título aparece em repositório, relatório ou gráfico. Ver doc 05.
8. **Nunca confiar em pessoas (modelo de ameaça).** Toda etapa executada por gente pode ser ignorada ou burlada: mesário, presidente de mesa, eleitor, fiscal, servidor. Motivos possíveis: pagamento, militância, pressão ou erro. Por isso:
   - regra de procedimento ("o mesário confere o documento com foto", "o presidente digita o ano informado pelo eleitor") **não conta como controle** nem como explicação que reduz risco;
   - só conta como controle o que é **técnico e deixa rastro verificável** nos arquivos: biometria do eleitor registrada no log, assinatura da urna, hash, cadeia de hashes;
   - cada brecha que dependa só de comportamento humano é registrada como **risco** e precisa de um teste nos dados que mostre se ela foi usada (padrões no log por seção, por mesário, por horário);
   - continua valendo o princípio 4: brecha aberta não prova que houve fraude. O que prova é o rastro nos dados.
9. **Universo completo, nunca amostra** (decisão do André, 29/10/2026). Todo número da auditoria é calculado sobre **todas** as seções, todos os logs e todos os eleitores do universo em questão:
   - não se extrapola de amostra, nem se estima o total a partir de parte dos dados. Se uma conta for cara, ela roda inteira em paralelo ou em várias etapas, mas roda inteira;
   - conferir casos no arquivo bruto é permitido e recomendado, **só para confirmar** o que já foi medido no universo inteiro. Esses casos nunca viram número da auditoria;
   - quando um dado estiver incompleto (exemplo: 1º turno ainda carregando), o resultado fica marcado como **parcial**, informando as UFs incluídas e as que faltam. Ele é refeito com o universo completo antes de entrar no relatório de perícia;
   - toda exclusão (por exemplo, seções sem detalhamento no BU) é listada com a contagem exata e o motivo. Nada sai em silêncio.

## O que os arquivos públicos permitem e não permitem provar

| Pergunta | Testável com arquivos públicos? | Observação |
|---|---|---|
| A soma dos BUs bate com a totalização divulgada? | Sim | BU por seção vs. resultado consolidado |
| O RDV de cada seção é coerente com o BU? | Sim | RDV traz os votos embaralhados da seção |
| O horário e o ritmo dos votos em cada urna são plausíveis? | Sim | Log de urna: eventos com data/hora |
| Quantos eleitores foram habilitados sem biometria? | Sim (confirmado em 2026) | Log (4 formas de habilitação) e BU (`detalhamentoComparecimento`) batem entre si. Ver doc 06 |
| A urna que emitiu o BU é a mesma do log? | Sim (confirmado em 2026) | Nº interno da urna no BU, no log e no certificado do `.vsc` |
| Os arquivos publicados são os que a urna gerou, assinados por urna oficial? | Sim, com limites | Hash + assinatura Ed521/ECDSA da urna + certificado da AC do TSE (`src/lacres.js`). A assinatura de software (CEPESC) não é verificável e a cadeia de certificados para na AC intermediária. Ver [pericia/01](pericia/01-integridade-e-estrutura-dos-arquivos.md) |
| Em que horário cada voto foi computado? | Sim | Log, em horário **local** da UF: converter para Brasília (doc 07) |
| Qual título votou em qual candidato? | **Não** | O voto é secreto por desenho: o RDV embaralha e o log não identifica o eleitor |
| Um título específico compareceu? | **Não pelos arquivos de urna** | Depende do caderno/folha de votação, que não é público. Ver doc 04 |

## Entregáveis

- Base estruturada (JSON/SQLite) com todos os BUs e logs do 2º turno.
- Relatórios CSV por seção, município e UF, gerados por script.
- Documento de achados com rótulos Fato/Hipótese/Recomendação e o caminho de reprodução de cada um.
