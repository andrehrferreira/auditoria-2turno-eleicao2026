# Auditoria independente: eleições gerais de 2026 (1º e 2º turno)

Auditoria dos arquivos públicos das urnas eletrônicas (BU, RDV, log e assinaturas) publicados pelo TSE para as eleições de 2026, com métodos reproduzíveis. Premissas, fontes e achados ficam em [docs/](docs/README.md), e cada afirmação leva o rótulo **Fato**, **Hipótese** ou **Recomendação**.

Trabalhos anteriores: [2º turno 2022](https://github.com/andrehrferreira/auditoria-2turno-eleicao2022) · [1º turno 2024](https://github.com/andrehrferreira/auditoria-1turno-eleicoes-2024).

## Andamento

Atualizado em 29/10/2026, 05:05. O painel `coleta-tse` do Claude Code lê esta tabela: mantenha o formato e os marcadores.

<!-- andamento:inicio -->
| Fase | Etapa | Status | Detalhe |
|---|---|---|---|
| 1. Coleta | Arquivos de urna do 2º turno | concluída | 499.248/499.248 seções contabilizadas (499.207 completas + 41 não instaladas); 17.931/17.931 agregadas |
| 1. Coleta | Arquivos de urna do 1º turno | em andamento | 28/28 zips baixados e extraídos; conferência rodando |
| 1. Coleta | aux.json do 2º turno (status oficial por seção) | em andamento | ~25%, a 20/s em segundo plano (limite do TSE); não bloqueia nada |
| 1. Coleta | aux.json do 1º turno | pendente | Começa depois do aux do 2º turno |
| 1. Coleta | Dados abertos (resultado oficial, perfil do eleitorado) | concluída | 32 arquivos em data/raw/dadosabertos |
| 1. Coleta | Candidatos e municípios (referência) | concluída | 2º turno; 1º turno: falta rodar src/referencia.js --turno 1 |
| 2. Leitura | Decodificador pela especificação oficial (BU, RDV, imgbu, vsc) | concluída | src/asn1.js + src/esquemas.js; 0 campos fora da spec nas amostras |
| 2. Leitura | Conversor de seção para JSON legível | concluída | src/exportar.js, sob demanda |
| 2. Leitura | Banco SQLite para consultas | em andamento | src/banco.js pronto (doc 09): AC carregado e conferido (BU = RDV = log = oficial); carga nacional pendente (~10–15 min, ~3,4 GB) |
| 2. Leitura | Perfil por seção (métricas de log e BU) | em andamento | 2º turno: 28/28 UFs; 1º turno: 2/28 |
| 3. Integridade | Assinaturas e hashes (H04) | em andamento | AC inteiro e casos ES/ZZ: 0 falhas; nacional pendente (~20 h de CPU) |
| 3. Integridade | Cadeia de evidências da perícia | em andamento | docs/pericia/evidencias (âncora + cadeia) |
| 4. Análises | A1/B2: soma dos BUs × resultado oficial (H03) | em andamento | AC: 0 divergência para presidente; 1.088 seções "Recebida": BU = oficial; país inteiro pendente. O CSV oficial só traz presidente |
| 4. Análises | A5/B1: liberação sem biometria e mesários (H02/H05) | em andamento | 1ª passada exploratória no 2º turno; caso AC 01007/0009/0440 ("já votou" depois de cada voto, docs/casos); falta linha de base |
| 4. Análises | B5: 1º × 2º turno na mesma seção (H10) | em andamento | src/comparar-turnos.js: AC e AL; depende do 1º turno completo |
| 4. Análises | A12: seriais das mídias (H11) | em andamento | AC sem repetição; país pendente |
| 4. Análises | C1: sigilo do voto (H09) | em andamento | Busca de título em ES: 0 ocorrências |
| 4. Análises | A2, A3/A4, A6, A7, A8, A10, A13, B3, B4 | pendente | Dependem do banco nacional e do 1º turno |
| 4. Análises | C2: títulos de falecidos (H01) | bloqueada | Precisa de fonte de óbito por CPF (doc 04) e base legal (doc 05) |
| 5. Relatório | Perícia em linguagem simples | em andamento | docs/pericia/01 (integridade e estrutura dos arquivos) |
<!-- andamento:fim -->

## Números do 2º turno (Fatos)

- **499.248** seções com urna, **17.931** agregadas, **41** não instaladas (exterior), **29** apuradas pelo Sistema de Apuração (exterior).
- Todos os arquivos conferidos pelo hash do manifesto (`vota.vsc`) e pelo SHA-512 de cada arquivo. Um `log.jez` faltava no zip de SP e foi baixado por seção (confere com o `vota.vsc`).
- **1.088** seções aparecem como "Recebida" no site de resultados (AM e BA): o pacote chegou entre 26 e 28/10, mas os votos para presidente no BU são idênticos aos do resultado oficial de 26/10. Detalhes no doc 03.

## Como rodar

```
npm test                                          # suíte de testes
node src/coleta.js [--turno 1|2] [--uf ac,sp]     # coleta: índice, zips, extração, aux, conferência (--ajuda)
node src/referencia.js --turno 2                  # candidatos e municípios do TSE
node src/dadosabertos.js                          # dados abertos oficiais (CDN)
node src/exportar.js --uf ac --municipio 01007    # seção(ões) em JSON legível (--ajuda)
node src/banco.js --turno 2 --uf ac               # carga no SQLite (doc 09)
node src/lacres.js <dir>                          # verificação de assinaturas
node src/perfil-secoes.js --turno 2               # métricas por seção
```

Os dados ficam em `data/` (fora do git): `raw/<t>t/zip` (zips do TSE), `raw/<t>t/urnas/<uf>/<mun>/<zona>/<seção>/<hash>/` (arquivos extraídos), `raw/dadosabertos`, `parsed/` (JSON, perfis, comparações), `db/` (SQLite) e `manifest/` (logs, ocorrências, resumo e cobertura).

## Módulos

| Arquivo | Função |
|---|---|
| `src/coleta.js`, `etapas.js`, `http.js`, `zip.js`, `indice.js`, `registro.js` | Coleta com retomada, controle de taxa e conferência de 100% |
| `src/vsc.js`, `conferencia.js` | Integridade: hash do manifesto e SHA-512 de cada arquivo |
| `src/asn1.js`, `esquemas.js`, `exportar.js`, `referencia.js` | Decodificação pela especificação oficial e conversão para JSON |
| `src/lacres.js`, `ed521.js`, `evidencias.js` | Assinaturas da urna (Ed521/ECDSA) e cadeia de evidências |
| `src/perfil-secoes.js`, `analises.js`, `comparar-turnos.js`, `busca-identificador.js` | Métricas e análises do checklist (doc 07) |
| `src/banco.js` | Banco SQLite (doc 09) |
| `src/dadosabertos.js` | Dados abertos do TSE |
| `src/modelos.js` | Revisores auxiliares (doc 08) |

## Próximos passos

1. Fechar a conferência do 1º turno e rodar `src/referencia.js --turno 1`.
2. Carga nacional no SQLite (dois turnos) e comparação BU × resultado oficial em todo o país (H03).
3. Perfil por seção do 1º turno e comparação entre turnos (H05, H10).
4. Verificação de assinaturas no país inteiro (H04), em paralelo.
5. Rodar os itens pendentes do doc 07 sobre o banco.
