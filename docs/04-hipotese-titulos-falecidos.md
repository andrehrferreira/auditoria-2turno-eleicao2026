# 04. Hipótese: votos computados com títulos de eleitores falecidos

## Enunciado (Hipótese)

Títulos de pessoas falecidas permaneceram aptos e registraram comparecimento no 2º turno de 2026, gerando votos que não correspondem a eleitores reais.

## Separação necessária

A hipótese mistura três afirmações diferentes, e cada uma tem evidência e peso próprios:

| # | Afirmação | O que provaria | Fonte necessária |
|---|---|---|---|
| A | Há falecidos com título regular no cadastro | Falha de higiene cadastral. **Não prova voto** | Óbito por CPF × situação do título |
| B | Títulos de falecidos **registraram comparecimento** | Uso indevido do título | Caderno/folha de votação ou histórico de quitação do título |
| C | O volume de B é capaz de alterar resultado | Impacto eleitoral | B agregado por seção/município × margem |

**Linha de base de A (contexto a validar).** O cadastro eleitoral fecha 150 dias antes da eleição (Lei 9.504/97, art. 91 **[a confirmar a redação vigente]**). Quem morreu depois disso, ou cujo óbito não foi comunicado a tempo pelo cartório (Código Eleitoral, art. 71, §3º **[a confirmar]**), continua no caderno. Por isso a existência de títulos regulares de falecidos é **esperada**, e esses títulos normalmente entram na abstenção. O que importa testar é **B**.

## Limite dos arquivos de urna

**Fato, por desenho do sistema.** BU, RDV e log não identificam o eleitor. Pelos arquivos públicos não é possível dizer que o título X votou.

**Fato (confirmado no log de 2026, doc 06).** O log registra eventos de habilitação: o **tipo** de identificador digitado (CPF ou título, **sem o número do eleitor**), biometria aceita ou recusada, liberação por ano de nascimento, por dado pessoal ou pelo mesário. O BU traz o mesmo total por forma de habilitação. Como o número do eleitor não aparece, o log não permite ligar um voto a um título de falecido; isso permite só um **teste indireto** por seção:

- taxa de habilitação **sem biometria** por seção, comparada com o 1º turno e com 2022;
- seções com comparecimento acima do esperado em relação aos óbitos recentes do município (SIM/Registro Civil);
- sequências de habilitações sem digital em intervalos curtos, padrão já analisado em 2024 (`votoTimeoutCurto.csv`).

## Fontes para consulta por CPF: levantamento inicial

Situação verificada em conhecimento prévio, **sem teste nesta sessão**. Cada linha precisa ser validada antes de virar dependência do projeto.

| Fonte | O que retorna | Acesso | Consulta por CPF em lote? | Status |
|---|---|---|---|---|
| TSE: Autoatendimento Eleitoral (situação do título, local de votação, quitação) | Situação do título (regular, cancelado, suspenso), zona/seção | Web, individual, exige dados pessoais adicionais e CAPTCHA | **Não.** Não é API, e automatizar contornando CAPTCHA fere a premissa 6 | [a confirmar campos exigidos em 2026] |
| Receita Federal: Situação Cadastral do CPF | Situação, incluindo "Titular Falecido" | Web, individual, CPF + data de nascimento + CAPTCHA | **Não** | [a confirmar] |
| SERPRO: API Consulta CPF | Situação cadastral do CPF (inclui falecido) | API **paga**, com contrato e finalidade declarada | **Sim, contratada** | [a confirmar: preço, se retorna ano/data do óbito, exigências de finalidade] |
| SIRC (Sistema Nacional de Informações de Registro Civil) | Registros de óbito | Restrito a órgãos públicos conveniados | Não, para particulares | [a confirmar] |
| CRC Nacional / Registro Civil (registrocivil.org.br) | Certidões de óbito | Pedido pago, por cartório/nome | Não é API pública por CPF | [a confirmar] |
| Portal da Transparência do Registro Civil (Arpen) | Contagem de óbitos por município e período | Público | Agregado, sem CPF | [a confirmar recorte e exportação] |
| DataSUS: SIM (Sistema de Informações sobre Mortalidade) | Microdados de óbitos sem identificação (idade, município) | Público | Agregado, sem CPF | [a confirmar disponibilidade de dados de 2025–2026] |
| Bureaus privados de dados | Indicador de óbito por CPF | Pago, com contrato | Sim | [a avaliar qualidade, base legal e contrato] |
| TSE: dados abertos do eleitorado | Perfil por seção (faixa etária, biometria) | Público | Agregado, sem CPF | [a confirmar dataset de 2026] |

### Conclusão provisória (Recomendação)

1. **Não existe, até onde se sabe, API pública e gratuita que responda "este CPF tem óbito?" ou "qual o título/zona deste CPF?" em lote.** Os serviços públicos são individuais e protegidos por CAPTCHA, de propósito.
2. **Caminho por CPF:** contratar a API Consulta CPF do SERPRO ou um bureau, com base legal definida (doc 05). Isso responde à afirmação **A**.
3. **Caminho para B:** pedido formal via **LAI** ao TSE/TREs (ex.: quantidade de títulos cancelados por óbito depois do fechamento do cadastro, por município, e quantos deles têm comparecimento registrado em 2026) e/ou por meio de partido ou fiscal habilitado. **[a confirmar com advogado eleitoral]** quem tem legitimidade para pedir acesso ao caderno/folha de votação.
4. **Caminho agregado, sem CPF e que pode começar já:** cruzar comparecimento por seção/município (BU) com óbitos recentes (SIM/Arpen), faixa etária do eleitorado (TSE) e taxa de habilitação sem biometria (log).

## Pendências

- [ ] Validar cada linha da tabela de fontes (acesso, custo, campos)
- [ ] Definir a base legal para a base própria de CPFs (doc 05)
- [ ] Redigir o rascunho do pedido via LAI ao TSE
- [ ] Confirmar os eventos de habilitação/biometria no log de 2026
