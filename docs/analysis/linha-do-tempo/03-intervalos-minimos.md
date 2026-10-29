# 03. Sequências humanamente impossíveis (A10, H08)

Auditor C. Resolução do log: 1 s (um intervalo de "2 s" significa de 1,0 a 2,99 s).

## Comandos

```bash
node scripts/auditoria/tempo-perfil.mjs --turno 2          # resumo.json (intervalos), intervalos-curtos.csv
node scripts/auditoria/tempo-ciclos.mjs --uf ac,df,rn,to   # ciclo por nº de cargos confirmados (≈4 min)
node scripts/auditoria/tempo-conferir.mjs --secao mg/40690/0016/0264 --min-intervalo 15 --min-hab 3
```

## Hipótese nula

Todo voto passa por um ciclo completo no log: o mesário digita o identificador, o eleitor é habilitado e confirma cada cargo. Por isso existe um tempo mínimo físico entre dois votos e entre a habilitação e o voto.

## Fatos (29/10/2026, 2º turno, 499.177 seções com voto no log)

### Intervalo entre dois votos computados seguidos

- Total nacional por faixa: < 5 s: 267; 5–9 s: 43; 10–14 s: 29; 15–19 s: 291; 20–29 s: 1.580.035; o resto é ≥ 30 s.
- **Todos os 339 intervalos abaixo de 15 s estão em 3 seções**, e são artefato de leitura, não da urna: BA 39870/0133/0184, ES 57932/0009/0085 e MG 40690/0016/0264, todas com 3 logs no pacote (urna substituída duas vezes).
  - Conferido no log bruto: o mesmo registro aparece duas vezes, com a mesma hora, a mesma urna, a mesma mensagem e o mesmo hash de encadeamento. Em BA são 2.730 linhas duplicadas e em MG 811. Isso acontece porque o log da urna original está dentro de mais de um `.jez`, por exemplo `…-01.jez` e `…02ME.jez`, e `lerLogs` (`src/perfil-secoes.js`) junta as cópias sem tirar as repetidas.
  - Nas três seções, o log conta **mais** votos do que o BU (+185, +304, +46), ou seja, o perfil de log está errado nelas. O BU não é afetado.
- Sem as 3 seções, o **menor intervalo do país é de 16 s** (3 seções) e de 17 s (4 seções). Os cinco casos de 16–17 s foram conferidos no log bruto (MG 41238/0030/0211, PE 24570/0147/0393, PE 24775/0024/0054, RS 88390/0162/0403, ZZ 30341/0001/1881): todos têm o ciclo completo, com identificador digitado, habilitação biométrica ou por ano de nascimento e confirmação. Ex.: RS 88390/0162/0403 tem identificador às 10:30:38, biometria às 10:30:45, voto às 10:30:51; e o próximo identificador às 10:30:57, biometria às 10:31:03, voto às 10:31:07.
- Por seção, o mínimo mais comum fica entre 27 e 29 s.

### Habilitação até o voto

- Nacional: < 5 s: 1.120.705 (0,9%); 5–9 s: 47.378.610; 10–14 s: 51.237.711.
- **1 cargo** (só presidente): o mínimo é **2 s**, em 2.656 seções. Conferido em AL 27057/0022/0411, 0498 e 0549: `Eleitor foi habilitado`, `Voto confirmado para [Presidente]` 2 s depois e `computado` no mesmo segundo. São 2 teclas e CONFIRMA (ou BRANCO e CONFIRMA).
- **2 cargos**, contando os "Voto confirmado" do próprio ciclo (AC, DF, RN e TO; 21.738 seções; 5.482.507 ciclos com 2 cargos): o mínimo é **4 s**, em 1 caso (DF 97012/0013/0418, 11:32:52 → 11:32:56). No log bruto aparecem 4 `Tecla indevida`, o governador confirmado em 2 s e o presidente 2 s depois. Há 33 casos de 5 s e 1.049 de 6 s.
- O perfil marca "3 s com 2 cargos" em 22 seções do DF, do ES, do AM e do TO. No log bruto, esses eleitores confirmaram **só presidente**: são eleitores em trânsito, e o número de cargos do BU não vale para eles.
- O log não diz se o voto foi em branco, nulo ou nominal (sigilo). O tempo mínimo de "branco nos 2 cargos" não pode ser separado. Os 4–6 s acima são o limite inferior de qualquer tipo de voto com 2 cargos.
- 7.702 ciclos têm 3 `Voto confirmado`, com 2 cargos na eleição. **Hipótese:** correção na tela de confirmação. Não conferido.

## Conclusão

**Fato:** nenhuma sequência fisicamente impossível. Os únicos casos abaixo do mínimo humano (intervalo de 0 s) são registros duplicados pela leitura de 3 pacotes de contingência, e foram conferidos no log bruto. H08, no sentido de "voto sem ciclo de eleitor", não se confirma no 2º turno.

**Limite (premissa 8):** um ciclo de 16 s com habilitação por ano de nascimento também pode ser feito pelo próprio mesário, porque o tempo não distingue quem digita. Ex.: PE 24570/0147/0393 tem 3 eleitores seguidos sem biometria, um a cada 23 s, às 08:17. Esse risco é testado pelo padrão de liberação (H05, Auditor de biometria), não pelo intervalo.

## Recomendações

1. **Correção de código (não feita, fora do escopo deste auditor):** `lerLogs` em `src/perfil-secoes.js` deve descartar linhas idênticas, porque o hash de encadeamento torna cada registro único. Depois, regerar os perfis. Seções com log ≠ BU no 2º turno: 9 de 499.206. São 3 com log a mais (as acima) e 6 com log a menos: BA 34711/0021/0178 (−1), BA 35653/0173/0235 (−13), MA 08893/0047/0609 (−36), PB 21750/0002/0254 (−1), PI 11533/0003/0216 (−1) e RS 89060/0017/0191 (−2).
2. Repetir no 1º turno, com 6 cargos: o mínimo esperado é maior.
