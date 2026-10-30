# Coordenação dos modelos auxiliares

## Objetivo

Usar GPT Astra, Grok e Kimi 3 como revisores independentes da auditoria, sob coordenação do Claude. Os modelos externos dão uma segunda leitura: revisam métodos, código e premissas, e levantam fontes. **Não decidem o status de nenhuma hipótese.**

## Como chamar

**Fato** (conferido em 29/10/2026): os três passam pelo 9Router local, compatível com a API da OpenAI, em `http://localhost:20128/v1`. A lista de modelos vem de `GET /v1/models`.

| Apelido | Modelo | Observação |
|---|---|---|
| `astra` | `cx/gpt-6-astra` | — |
| `grok` | `xai/grok-4.6` | Pode levar 60–100 s até o primeiro byte |
| `kimi` | `kimi/kimi-k3` | Só aceita temperatura 1 |

```
node src/modelos.js docs/analysis/modelos/T01/prompt.md docs/analysis/modelos/T01 astra
```

- A chave fica em `NINEROUTER_API_KEY`, no ambiente ou no `.env` da raiz, que o git ignora. Nunca versionar a chave nem exibi-la.
- O cliente usa streaming e tenta de novo até 4 vezes, porque o roteador devolve 503 quando está sob carga e derruba a conexão perto de 250 s.
- Cada resposta é salva como `<apelido>.md`. O `consultas.jsonl` guarda o modelo, o SHA-256 do prompt e o SHA-256 da resposta.

## Regras

1. **Os modelos só recebem o texto do prompt.** Eles não leem arquivos locais. Tudo de que precisarem vai no `prompt.md`.
2. **Nenhum dado da base privada sai da máquina** (doc 05). Fica fora do prompt: a base de CPFs, qualquer retorno de consulta por CPF (`data/private/`) e o caso individual de óbito. Os arquivos públicos do TSE (BU, RDV, log, `.vsc`, aux.json, cs.json) podem ir sem máscara, inclusive o título de mesário (doc 05, regra 6a). O cliente recusa o envio quando o prompt contém um CPF válido.
3. **A resposta de um modelo externo é Hipótese.** Ela só vira Fato depois que um script deste repositório a reproduz sobre os dados, com evidência registrada.
4. Pedir a resposta em formato fixo: um item por achado, com motivo, trecho de referência e grau de confiança. Uma lista vazia precisa vir justificada.
5. Prompts e respostas ficam em `docs/analysis/modelos/<ID da tarefa>/`. A tabela abaixo é o registro vivo, e o painel `/andamento` lê dela.
6. URL ou norma citada por um modelo é **[a confirmar]** até ser aberta e conferida na fonte primária.

## Papéis

**Recomendação:** dividir por tipo de trabalho, para que cada hipótese receba uma leitura de fora sem que dois modelos refaçam a mesma tarefa.

| Quem | Papel |
|---|---|
| Claude | Coordena, escreve o código em `src/`, roda os scripts nos dados, registra as evidências, atualiza `hipoteses.md` e decide o status |
| GPT Astra | Revisão adversarial dos métodos estatísticos e das explicações alternativas |
| Grok | Levantamento de fontes primárias e normas para as premissas marcadas **[a confirmar]** |
| Kimi 3 | Revisão independente do código e da leitura dos formatos de arquivo da urna (doc 06) |

## Tarefas

Status: `pendente` · `em andamento` · `concluída` · `bloqueada`

| ID | Tarefa | Hipótese | Modelo | Status | Saída |
|---|---|---|---|---|---|
| T01 | Revisar o método da 1ª passada de liberações sem biometria: controles de idade, zona rural e linha de base do 1º turno | H05, H02 | GPT Astra | pendente | — |
| T02 | Desenhar o teste da soma dos BUs contra a totalização, incluindo seções não totalizadas e votos em separado | H03 | GPT Astra | bloqueada | depende da coleta do 2T a 100% e do resultado oficial |
| T03 | Revisar o método de comparação da mesma seção entre 1º e 2º turno (`src/comparar-turnos.js`), incluindo o balanço "maior que o disponível" | H10 | GPT Astra | concluída | [parecer](analysis/modelos/T03/parecer.md): método v2 |
| T04 | Houve extensão do horário de votação em 25/10/2026? Levantar atos do TSE e dos TREs | H06 | Claude | pendente | Grok sem acesso à web ([parecer](analysis/modelos/T04/parecer.md)) |
| T05 | Premissa: modelo antigo de urna dispensa biometria? Levantar fonte normativa ou técnica | H07 | Claude | pendente | idem T04 |
| T06 | Fontes legais de óbito sem CAPTCHA e sem dado pessoal (agregados por município, SIM/DataSUS, CRC) | H01 | Grok | pendente | — |
| T07 | Revisar a verificação de assinaturas (`src/lacres.js`, `src/ed521.js`) contra o doc 06 | H04 | Kimi 3 | em andamento | [parecer](analysis/modelos/T07/parecer.md): 1 correção feita, 2 a verificar |
| T08 | Definir o limite de "sequência humanamente impossível" e as armadilhas da resolução de tempo do log | H08 | Kimi 3 | pendente | — |
| T09 | Ordem do RDV e do log: é possível ligar voto a eleitor em seções pequenas? | H09 | Kimi 3 | pendente | — |
| T10 | Coordenação, código, execução nos dados e registro das evidências | todas | Claude | em andamento | `docs/hipoteses.md` |
| T11 | Interpretar a liberação manual com digital que não é de mesário cadastrado (31% das manuais no AC) | H05 | Kimi 3 | concluída | [parecer](analysis/modelos/T11/parecer.md): números reconciliados, doc 06 corrigido |
| T13 | Conteúdo e validação do QR do e-Título; documentos que o mesário pode aceitar | H12 | Claude | pendente | idem T04 |
| T16 | Revisão adversarial do método da frente de integridade (seriais, cópias de log, autoverificação, entre turnos) | H04, H11 | GPT Astra | concluída | [parecer](analysis/modelos/T16/parecer.md): 4 correções feitas, 4 Pendentes |
| T17 | Revisão de código dos scripts `scripts/auditoria/integridade-*.mjs` | H04, H11 | Kimi 3 | em andamento | [parecer](analysis/modelos/T17/parecer.md): 1 correção feita; resposta cortada e HTTP 502, reenviar |
| T18 | Normas e fontes: erro de assinatura na inicialização, códigos SAVD, contingência e RED, carga, relógio, arquivos não publicados, seriais | H04, H11 | Grok | concluída | [parecer](analysis/modelos/T18/parecer.md): sem web, só pedidos de LAI |

## Critério de conclusão de uma tarefa

- A resposta está salva com o hash em `consultas.jsonl`.
- O Claude leu a resposta e anotou o que aceitou, o que recusou e por quê, em `docs/analysis/modelos/<ID>/parecer.md`.
- O que foi aceito virou mudança no método, no código ou em `hipoteses.md`, com a evidência citada.
