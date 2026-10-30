# Rastreio: docs/pericia/08-virada-do-2-turno.md

Índice do que saiu do tópico 8 do relatório na reescrita de 30/10/2026 (relatório independente do processo, regra em CLAUDE.md, seção "Relatório de perícia"). Este arquivo **não** entra no relatório. Versão anterior completa: `git show f33a89f:docs/pericia/08-virada-do-2-turno.md`.

## Regra deste tópico (cabeçalho)

- "parecer do revisor cético" → `docs/analysis/cetico-revisor/`.
- Análises em andamento: `docs/analysis/modelos/T14/sintese.md` (agora "documentos de trabalho da auditoria").

## 1. Os números oficiais da virada

- Os nomes dos arquivos de dados abertos do TSE (`detalhe_votacao_secao`, `votacao_candidato_munzona`, `votacao_secao`) **ficaram**, com o nome em português ao lado: são públicos e o leitor pode baixá-los.
- Saiu: `scripts/bu-x-oficial-1t-presidente.mjs` (soma dos boletins × oficial por seção, 1º turno, 3.800.511 combinações).

## 2. Comparação com 2018 e 2022

- Fonte: `docs/analysis/cientista-politico/04-linha-de-base-historica.md` (cientista político).
- Reprodução: `docs/analysis/cetico-revisor/14-linha-de-base-2018-2022.md` (parecer 14 do cético, três scripts independentes).
- "Segundo o parecer 14" virou "Segundo a segunda verificação independente".

## 3. Votos × votantes

- Conta 1: `src/comparar-turnos.js` (perfis tirados de cada boletim), agora "um resumo tirado de cada boletim, comparado entre os turnos".

## 3b. Troca mínima exigida

- Perfis: `src/comparar-turnos.js` (499.176 seções).
- Banco: `scripts/troca-obrigatoria-banco.mjs` (499.205 seções).

## 4. Prorrogação do horário

- Arquivo da decisão: `data/raw/stf/rcl-101673-zanin-25out26.pdf` (minuta publicada pelo Poder360).
- 34.330 votos: Auditor C, `docs/analysis/linha-do-tempo/02-votos-apos-17h.md`.
- 34.066 votos: `scripts/h06-votos-apos-17h.mjs`.

## 5. "Sem biometria cadastrada" acima do cadastro

- Fonte: `docs/analysis/cetico-revisor/01-b1a-sem-biometria-acima-do-cadastro.md` (parecer 01 do cético, dois caminhos).

## 6. Perda de votos do Flávio sem queda de comparecimento

- Fonte: `docs/analysis/cetico-revisor/05-h10-crescimento-cabe-no-disponivel.md` (parecer 05 do cético).
- 38.235 seções e −126.408 votos: revisão T15 (`docs/analysis/modelos/T15/08-virada-do-2-turno/`), `scripts/auditoria/t15-08-virada.mjs` (agora "recontado numa revisão posterior").

## Pendente (tabela)

- Comparação com as vizinhas: `src/comparar-turnos.js`.
- Troca pela urna × voto dos eliminados, resultado por modelo de urna, curva da apuração: `docs/analysis/cetico-revisor/16-topico-8-virada.md` (parecer 16).
