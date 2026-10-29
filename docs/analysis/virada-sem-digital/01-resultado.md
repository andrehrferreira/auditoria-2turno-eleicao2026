# Virada para o 13 nas seções 100% sem digital (2º turno, universo completo)

Gerado por `node scripts/auditoria/virada-sem-digital.mjs` a partir de `data/parsed/auditoria/cetico/t8-secoes.jsonl` (BUs dos dois turnos, 28 UFs, seções pareadas pela mesma chave UF/município/zona/seção).

- **Seção 100% sem digital:** no BU do 2º turno, `porBiometria = 0` e comparecimento > 0. Todos os votantes foram habilitados por ano de nascimento (sem biometria cadastrada) ou por dado pessoal (digital não reconhecida).
- **Virada para o 13:** 22 > 13 no 1º turno e 13 > 22 no 2º turno, Presidente. **Virada para o 22:** o contrário.
- Seções pareadas lidas: 499.207. Excluídas: 0 com chave duplicada; 29 sem comparecimento no BU do 2º turno.
- Conferência da entrada: soma de "sem biometria cadastrada" no 2º turno = 7.251.810; soma de "biometria falhou → dado pessoal" = 8.632.488.
- **Segunda conta** (banco, cópia de 2026-10-29T10:50:00.542Z, tabelas `secao` e `voto_bu`), para a tabela por faixa: igual em todas as faixas e todos os campos (seções, comparecimento, viradas, votos 13 e 22 nos dois turnos).
- **Exterior:** o BU de lá não traz a divisão por forma de liberação; o log mostra que todos os 380.612 votos do 2º turno foram liberados por ano de nascimento (tópico 4 da perícia). Ele aparece à parte e fica fora das faixas.

## Resposta

No Brasil (sem exterior), 1 seções votaram 100% sem digital no 2º turno; 0 delas também foram 100% sem digital no 1º turno. Delas, **0 viraram para o 13** (0,00%) e 0 viraram para o 22. Nas seções com alguma digital, 6,29% viraram para o 13.

## Por faixa de % sem digital no 2º turno (Brasil, sem exterior)

| Faixa | Seções | Comparecimento (2º t.) | Viraram para o 13 | % | Viraram para o 22 | % | % 13 (1º → 2º t.) | Ganho do 13 em p.p. |
|---|---|---|---|---|---|---|---|---|
| 100% | 1 | 186 | 0 | 0,00 | 0 | 0,00 | 33,54 → 35,48 | 1,94 |
| 80% a 99,9% | 74 | 17.596 | 7 | 9,46 | 1 | 1,35 | 59,03 → 61,67 | 2,64 |
| 50% a 79,9% | 2.922 | 750.102 | 218 | 7,46 | 3 | 0,10 | 42,73 → 45,67 | 2,94 |
| 20% a 49,9% | 61.027 | 14.964.323 | 4.584 | 7,51 | 101 | 0,17 | 48,85 → 51,75 | 2,90 |
| menos de 20% | 433.873 | 112.122.424 | 26.532 | 6,12 | 450 | 0,10 | 49,04 → 51,82 | 2,78 |

## Seções 100% sem digital, por região e UF

| Recorte | Seções 100% sem digital | Comparecimento nelas (2º t.) | Viraram para o 13 | % | Viraram para o 22 | % 13 (1º → 2º t.) | Seções com alguma digital | % viraram 13 | % viraram 22 | % 13 (1º → 2º t.) |
|---|---|---|---|---|---|---|---|---|---|---|
| Norte | 0 | 0 | 0 | — | 0 | — → — | 43.769 | 6,35 | 0,18 | 47,60 → 50,01 |
| Nordeste | 0 | 0 | 0 | — | 0 | — → — | 140.828 | 2,76 | 0,04 | 67,39 → 69,37 |
| Centro-Oeste | 1 | 186 | 0 | 0,00 | 0 | 33,54 → 35,48 | 38.047 | 5,43 | 0,23 | 36,60 → 39,99 |
| Sudeste | 0 | 0 | 0 | — | 0 | — → — | 203.237 | 9,71 | 0,11 | 43,59 → 47,24 |
| Sul | 0 | 0 | 0 | — | 0 | — → — | 72.015 | 3,99 | 0,15 | 34,24 → 37,42 |
| Exterior | 1.281 | 380.612 | 53 | 4,14 | 10 | 52,23 → 53,85 | 0 | — | — | — → — |
| **Brasil (sem exterior)** | 1 | 186 | 0 | 0,00 | 0 | 33,54 → 35,48 | 497.896 | 6,29 | 0,11 | 48,98 → 51,78 |
| **Total** | 1.282 | 380.798 | 53 | 4,13 | 10 | 52,22 → 53,84 | 497.896 | 6,29 | 0,11 | 48,98 → 51,78 |

Por UF:

| Recorte | Seções 100% sem digital | Comparecimento nelas (2º t.) | Viraram para o 13 | % | Viraram para o 22 | % 13 (1º → 2º t.) | Seções com alguma digital | % viraram 13 | % viraram 22 | % 13 (1º → 2º t.) |
|---|---|---|---|---|---|---|---|---|---|---|
| AC | 0 | 0 | 0 | — | 0 | — → — | 2.270 | 1,50 | 0,18 | 30,80 → 33,43 |
| AL | 0 | 0 | 0 | — | 0 | — → — | 7.101 | 10,15 | 0,03 | 57,50 → 60,77 |
| AM | 0 | 0 | 0 | — | 0 | — → — | 8.157 | 6,87 | 0,21 | 51,74 → 54,02 |
| AP | 0 | 0 | 0 | — | 0 | — → — | 1.914 | 17,76 | 0,31 | 50,03 → 52,88 |
| BA | 0 | 0 | 0 | — | 0 | — → — | 35.476 | 1,51 | 0,08 | 69,87 → 71,31 |
| CE | 0 | 0 | 0 | — | 0 | — → — | 23.765 | 2,05 | 0,02 | 66,93 → 68,93 |
| DF | 0 | 0 | 0 | — | 0 | — → — | 6.969 | 7,98 | 0,34 | 42,62 → 45,72 |
| ES | 0 | 0 | 0 | — | 0 | — → — | 9.844 | 6,95 | 0,11 | 40,80 → 43,63 |
| GO | 0 | 0 | 0 | — | 0 | — → — | 15.686 | 5,72 | 0,25 | 36,69 → 40,34 |
| MA | 0 | 0 | 0 | — | 0 | — → — | 18.093 | 2,79 | 0,05 | 67,44 → 69,54 |
| MG | 0 | 0 | 0 | — | 0 | — → — | 52.062 | 10,70 | 0,18 | 47,32 → 50,43 |
| MS | 1 | 186 | 0 | 0,00 | 0 | 33,54 → 35,48 | 7.105 | 5,08 | 0,20 | 37,18 → 40,40 |
| MT | 0 | 0 | 0 | — | 0 | — → — | 8.287 | 3,04 | 0,13 | 30,94 → 33,94 |
| PA | 0 | 0 | 0 | — | 0 | — → — | 20.827 | 7,48 | 0,18 | 52,87 → 55,02 |
| PB | 0 | 0 | 0 | — | 0 | — → — | 10.712 | 7,28 | 0,03 | 64,96 → 67,46 |
| PE | 0 | 0 | 0 | — | 0 | — → — | 21.418 | 1,67 | 0,02 | 67,16 → 69,20 |
| PI | 0 | 0 | 0 | — | 0 | — → — | 10.225 | 0,46 | 0,01 | 74,66 → 75,88 |
| PR | 0 | 0 | 0 | — | 0 | — → — | 27.142 | 3,00 | 0,14 | 34,24 → 37,42 |
| RJ | 0 | 0 | 0 | — | 0 | — → — | 37.675 | 11,34 | 0,07 | 42,65 → 46,90 |
| RN | 0 | 0 | 0 | — | 0 | — → — | 8.115 | 4,93 | 0,00 | 63,21 → 65,72 |
| RO | 0 | 0 | 0 | — | 0 | — → — | 4.698 | 0,72 | 0,04 | 27,74 → 30,39 |
| RR | 0 | 0 | 0 | — | 0 | — → — | 1.519 | 0,92 | 0,00 | 24,34 → 27,54 |
| RS | 0 | 0 | 0 | — | 0 | — → — | 27.547 | 6,56 | 0,23 | 39,10 → 42,16 |
| SC | 0 | 0 | 0 | — | 0 | — → — | 17.326 | 1,44 | 0,05 | 27,31 → 30,58 |
| SE | 0 | 0 | 0 | — | 0 | — → — | 5.923 | 1,00 | 0,00 | 67,20 → 69,53 |
| SP | 0 | 0 | 0 | — | 0 | — → — | 103.656 | 8,88 | 0,10 | 42,38 → 46,15 |
| TO | 0 | 0 | 0 | — | 0 | — → — | 4.384 | 5,50 | 0,27 | 46,26 → 48,63 |
| ZZ | 1.281 | 380.612 | 53 | 4,14 | 10 | 52,23 → 53,85 | 0 | — | — | — → — |

## Seções 100% sem digital que viraram para o 13 (fora do exterior)

| UF | Município | Zona | Seção | Tipo de urna (2º t.) | Modelo | Compareceram 1º / 2º | 13 / 22 no 1º turno | 13 / 22 no 2º turno | Sem biometria cadastrada / dado pessoal (2º t.) |
|---|---|---|---|---|---|---|---|---|---|

