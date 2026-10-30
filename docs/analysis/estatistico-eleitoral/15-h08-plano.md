# 15. H08: plano da medida do ciclo completo de cada eleitor (registrado antes de rodar)

Estatístico eleitoral, **30/10/2026**. Hipótese H08 de [hipoteses.md](../../hipoteses.md): votos em sequência humanamente impossível. Este plano foi escrito **antes** de qualquer leitura nacional dos diários. Os limites abaixo não mudam depois de ver os dados. O que for acrescentado depois fica marcado como **exploratório** no resultado ([17](17-h08-resultado.md)).

## O que já existe e o que falta

- **Fato (Auditor C, [linha-do-tempo/03](../linha-do-tempo/03-intervalos-minimos.md); parecer cético 12):** no 2º turno, o menor intervalo entre dois votos do país é 16 s, fora 3 seções (BA 39870/0133/0184, ES 57932/0009/0085, MG 40690/0016/0264) em que o perfil leu linhas duplicadas. Da habilitação ao voto: 2 s com 1 cargo, 4 s com 2 cargos (só AC, DF, RN e TO).
- **Falta:** o ciclo completo de cada eleitor no país inteiro e nos dois turnos (identificador → habilitação → confirmação de cada cargo → voto computado → próximo eleitor), a distribuição, o percentil 0,1%, as seções com sequências abaixo do limite, e a leitura própria das 3 seções com erro de leitura (hoje há só a linha do tempo da perícia, `data/parsed/auditoria/t15/03-linha-do-tempo-*-2t.json`, com mínimos de 25 a 36 s).

## Linha de base histórica

Não há diário de urna de 2022 nem de 2024 no repositório (`data/raw/dadosabertos/correspondencias/2022-1t` e `2024-1t` só têm correspondências, sem log), e a regra é sem rede. Por isso o limite estatístico sai da **distribuição nacional do próprio turno**, e a comparação de base é o **outro turno** (1º × 2º). Limite declarado: sem 2022/2024, não se sabe se o ritmo de 2026 é normal para a urna; só se sabe se uma seção destoa do país.

## Dados (universo completo)

- Todos os pacotes de urna com log, 1º e 2º turnos, 28 UFs (exterior incluído), lidos do `.jez` bruto em `data/raw/<t>t/urnas/` por um leitor próprio (`src/zip.js`, sem `lerLogs` e sem `perfil-secoes`), percorrendo os diretórios por `readdir` (sem `find`).
- Só as linhas do dia da votação (04/10/2026 e 25/10/2026, relógio local da urna).

### Fluxo (unidade de leitura)

- Cada `logd.dat` do pacote (inclusive os `.jez` aninhados de contingência) é lido separado.
- Dentro de cada texto, as linhas são separadas pela **urna** (3ª coluna) e só entram as da seção que a urna declarou por último (`Seção Eleitoral: NNNN`), como em `juntarLogs`.
- A mesma urna em mais de um texto (cópias MI/ME do mesmo log) vira **um** fluxo: fica a cópia com mais linhas do dia; as linhas das outras cópias que não estão nela são contadas e relatadas.
- Linha idêntica repetida dentro do fluxo conta uma vez (contagem relatada).
- Nunca se intercalam linhas de urnas diferentes, e as linhas não são reordenadas por hora.

### Ciclo do eleitor (por fluxo)

| Evento | Mensagem no diário |
|---|---|
| I | `Identificador do eleitor digitado pelo mesário` (o último antes da habilitação) |
| H | `Eleitor foi habilitado` |
| C1…Ck | `Voto confirmado para [cargo]` (k = confirmações do ciclo) |
| V | `O voto do eleitor foi computado` |

Medidas, em segundos inteiros (resolução de 1 s):

- **A = H − I** (identificação e liberação);
- **B = V − H** (votação, por k);
- **C = V − I** (ciclo do eleitor, por k);
- **D = V − V anterior do mesmo fluxo** (ciclo completo entre dois eleitores seguidos: inclui sair, o mesário digitar o próximo identificador, liberar e votar). Estrato pelo k do segundo eleitor;
- **passos por cargo:** H → C1 e Ci → Ci+1, por nome do cargo; e Ck → V.

Também: votos computados sem habilitação no ciclo ("voto sem ciclo"), D negativo (relógio ajustado), e a forma de liberação de cada ciclo (biometria, ano de nascimento, dado pessoal, com ou sem mesário associado), que serve a H13 ([16](16-h13-log-plano.md)).

## Limites (fixados agora)

### LF. Limite físico absoluto (a priori, independe dos dados)

Um ciclo D exige, no mínimo: o mesário digitar o identificador (11 dígitos do CPF ou 12 do título), a liberação (captura da digital, ou 4 dígitos do ano mais confirma, ≥ 5 teclas), e o eleitor apertar pelo menos 2 teclas por cargo (BRANCO e CONFIRMA). A um ritmo sobre-humano de 10 teclas por segundo, sem tempo de reação nem de tela:

**M(k) = 1,6 + 0,2·k segundos** (2,0 s com 2 cargos; 2,8 s com 6 cargos).

Com relógio de 1 s, um D observado t corresponde a um tempo real menor que t + 1. Então:

- **LF-1 (um ciclo):** D ≤ M(k) − 1, ou seja, **D ≤ 1 s** em qualquer k de 1 a 6;
- **LF-n (sequência):** n ≥ 2 ciclos D seguidos do mesmo fluxo com soma observada S tal que **S + 1 ≤ Σ M(ki)**;
- A, B e C isolados não têm limite físico útil com relógio de 1 s (o mínimo mecânico fica abaixo de 1 s), e só se relatam: mínimos e casos negativos.

Todo caso LF é anomalia e vai ao diário bruto antes de ser citado.

### LE. Limite estatístico (pela distribuição nacional, por turno e k)

- **LE(turno, k)** = o maior número inteiro de segundos s tal que a fração dos D do estrato com D ≤ s é **no máximo 0,1%** (o percentil 0,1% arredondado para baixo; com empates, a fração abaixo do limite nunca passa de 0,1%). Estratos com menos de 100.000 ciclos usam a distribuição do turno inteiro.
- **Sequência abaixo do limite:** 3 ou mais D seguidos do mesmo fluxo, todos ≤ LE do próprio k.
- **Esperado sob independência:** Σ (n − 2)·p³ por fluxo, com p a fração ≤ LE do estrato; relatado ao lado do observado. Se o observado passar muito do esperado, isso mede dependência (fila, mesário rápido), não fraude: a comparação útil é com o outro turno.
- **Seção com excesso de ciclos curtos (teste por seção):** c = número de D ≤ LE na seção entre n ciclos; p-valor = P(Binomial(n, p̄) ≥ c), com p̄ a média dos p dos estratos dos ciclos da seção. **Bonferroni** sobre todas as seções testadas nos dois turnos (α = 0,05 / número de seções com n ≥ 1, contado no resultado). Benjamini-Hochberg a 5% relatado ao lado.

## Testes confirmatórios (declarados agora)

- **C1:** no 2º turno, nenhum ciclo LF-1 nem sequência LF-n, fora artefato de leitura conferido no bruto.
- **C2:** o mesmo no 1º turno.
- **C3:** a fração de seções com excesso Bonferroni-significativo de D ≤ LE no 2º turno não é maior que no 1º turno (teste de duas proporções, unilateral, α = 0,05).
- **C4:** nas 3 seções com erro de leitura, a leitura própria por fluxo dá mínimo de D entre 25 e 36 s e total de votos igual ao BU.

Tudo o mais (forma de liberação dos ciclos curtos, horário, modelo de urna, passos por cargo) é **exploratório**.

## Tamanho do efeito e número absoluto

Para cada estrato: número de ciclos, mínimo, percentis 0,1%, 1%, 5%, 50% e 99%. Para as seções: número de ciclos curtos, esperado e razão. Toda seção citada como extrema é conferida com `node src/exportar.js --turno <t> --uf .. --municipio .. --zona .. --secao .. --log dia --stdout` (ou pelo leitor próprio, por fluxo).

## O que este teste não vê (declarado agora)

- Voto inserido em **ritmo humano** (um a cada 20 s ou mais): passa como eleitor normal. O ritmo não diz quem digitou (princípio 8; ver H05).
- Voto que não passa pelo ciclo do diário (o "voto sem ciclo" é contado, mas um diário adulterado inteiro não é visto aqui; a integridade do diário é outro tópico).
- Resolução de 1 s: um ciclo de 1,9 s e um de 1,0 s podem aparecer iguais.

## Saídas

- `scripts/auditoria/estatistico-h08-varredura.mjs` (leitura dos diários, um processo por turno) e `scripts/auditoria/estatistico-h08-analise.mjs` (limites, sequências, seções).
- `data/parsed/auditoria/estatistico/h08/<t>t/`: histogramas por UF, sequência compacta de D por fluxo (binária), resumo por seção, casos LF.
