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

## 7. A virada zona por zona (H26), acrescentado em 31/10/2026

- Achado: [virada-zonas/01-plano.md](../virada-zonas/01-plano.md) e [virada-zonas/02-resultado.md](../virada-zonas/02-resultado.md), script `scripts/auditoria/virada-zonas.mjs` (commit 6d1175a).
- Revisão: [parecer 34](../cetico-revisor/34-h26-virada-zonas.md). Vereditos: 1 (corte do plano) sustentado com ressalvas; 2 (virada geral) sustentado; 2b (pesos de transferência) rebaixado a Hipótese; 3 (modelo de urna) sustentado com ressalvas; 4a (picos) sustentado; 4b (voto tardio "virou menos") refutado como leitura; 5a/5b (cauda do 13) sustentado com ressalvas; 6 (pré-registro) ressalva. Fora do parecer: linha de base 2018/2022 ([03](../virada-zonas/03-linha-de-base.md)) e as 4 zonas do 22 seção a seção ([04](../virada-zonas/04-casos.md)), que ficaram Pendentes no texto.
- "Segunda verificação independente" = parecer 34 (código próprio a partir do banco, sem `pares-banco.csv`).
- Números e fonte:

| Número no texto | Fonte |
|---|---|
| 499.207 seções, 2.641 zonas, 0 divergência com o oficial por seção | parecer 34, resposta curta; `cetico-34-h26-secoes.mjs` |
| Margens −1,86 e +3,57; virada +5,44; 2.224.965, 4.430.191 e 6.655.156 votos | parecer 34, veredito 2; `cetico-34-h26-reproduz.mjs` |
| 2.626 e 15 zonas; RS 0129 −1,47; 128 e 0; 7,77; 127; percentis 0,51 / 5,09 / 9,08 | parecer 34, veredito 2 |
| 0 zonas para o 13; 4 para o 22 (MA 0032, SP 0002, CE 0020, BA 0105); de 0 a 9 e de 3 a 8 nas variantes | parecer 34, veredito 1 e §B |
| 132 de 504 pesos fora de [0, 1] | parecer 34, veredito 2b e §D |
| 22 zonas mais perto do corte; 82,15% / 10,50% / 7,35% contra 78,63% / 11,62% / 9,75%; 99.232 eleitores | parecer 34, veredito 5b e §D (`cetico-34-h26-reproduz.mjs`, `cauda`). O autor não tem script desses números (recomendação 3 do parecer) |
| BU × diário pela digital: 497.884 e 497.890 de 497.897 seções | parecer 34, §D (consulta `secao` × `perfil_log`) |
| RJ 0075: comparecimento −1.255 | parecer 34, §D |
| Modelo de urna sem diferença (contraste por zona) | parecer 34, §E; `cetico-34-h26-modelo.mjs` |
| Horário: associação positiva do voto tardio do 2º turno, nas 5 regiões, com controles | parecer 34, §C; `cetico-34-h26-horario.mjs`. Os coeficientes, z e os "~12.900 votos" ficaram fora do relatório (estatística) |
| 34.315 votos depois das 17h; 0,77% | item 4 do tópico 8 (tópico 3; correção de relógio). O parecer 34 cita 34.330 (contagem antes da correção de relógio) |
| Alcance por simulação (zona, várias zonas, capitais, UF, proporcional ao 13) | parecer 34, §A; `cetico-34-h26-poder.mjs`. Os tamanhos (4,6 p.p., 1.639 votos, Fortaleza ~78 mil etc.) ficaram fora do relatório |

```
node --max-old-space-size=12288 scripts/auditoria/cetico-34-h26-secoes.mjs     # ~1,5 min: extração do banco + conferência com voto_oficial + horas
node --max-old-space-size=8192  scripts/auditoria/cetico-34-h26-reproduz.mjs   # ~5 s: corte, virada geral, réguas, [0,1], cauda, modelo
node --max-old-space-size=8192  scripts/auditoria/cetico-34-h26-poder.mjs      # ~2,5 min: simulação de inserção
node --max-old-space-size=8192  scripts/auditoria/cetico-34-h26-horario.mjs    # ~10 s: horário separado por turno, controles, poder, picos
node --max-old-space-size=8192  scripts/auditoria/cetico-34-h26-modelo.mjs     # ~5 s: contraste por modelo com efeito fixo de zona
node scripts/auditoria/virada-zonas.mjs                                        # autor
```

Saídas em `data/parsed/auditoria/cetico-revisor/34-h26-*` e `data/parsed/auditoria/virada-zonas/`.
