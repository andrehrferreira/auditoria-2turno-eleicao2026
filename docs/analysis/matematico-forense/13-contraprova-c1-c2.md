# 13. Contraprova de C1 (boletim × registro dos votos) e C2 (diário × boletim), dois turnos

Matemático forense, 30/10/2026. Banco: cópia de leitura de 29/10 10:50 UTC (`src/banco-leitura.js`). Diários lidos dos pacotes brutos (`data/raw/<t>t/urnas/ac/...`). Fecha a parte C1 e C2 da pendência do [tópico 2](../../pericia/02-coerencia-entre-arquivos.md) ("teste que altere de propósito um boletim ou um registro de votos e mostre que C1 e C2, nos dois turnos, acusam a alteração"). Modelo: o `--contraprova` de `matematico-c36-1t.mjs` ([doc 12](12-c3-c6-1t.md)).

## Resposta curta

**Fato (AC, 1º e 2º turnos, 2.270 seções de urna em cada um).** Em cada turno, 9 seções receberam uma alteração cada, feita só na memória (banco e arquivos intactos). As 18 alterações foram acusadas exatamente como previsto: na seção alterada, nas contas previstas. Nenhuma conta acusou nada em outra seção. Na rodada sem alteração, as mesmas seções dão **0 diferença** em todas as contas.

| # | Alteração (uma seção por alteração) | Esperado | 1º turno (seção AC) | Acusado no 1º | 2º turno (seção AC) | Acusado no 2º |
|---|---|---|---|---|---|---|
| A1 | RDV: 1 voto de Presidente trocado de candidato | C1 | 01007/0009/0001: 13 −1, 14 +1 | **C1** (13: BU 67 RDV 66; 14: BU 3 RDV 4) | 01007/0009/0001: 13 −1, 22 +1 | **C1** (13: BU 68 RDV 67; 22: BU 149 RDV 150) |
| A2 | RDV: 1 voto a mais | C1 | 01007/0009/0002: 13 +1 | **C1** (BU 76 RDV 77) | 01007/0009/0002: 13 +1 | **C1** (BU 76 RDV 77) |
| A3 | BU: 1 voto a menos | C1 e C3 | 01007/0009/0003: 13 −1 | **C1** (BU 71 RDV 72) e **C3** (241 ≠ 242) | 01007/0009/0003: 13 −1 | **C1** (BU 80 RDV 81) e **C3** (240 ≠ 241) |
| A3b | BU: 1 voto de Presidente passa de nominal a nulo (soma do cargo mantida) | C1 | 01007/0009/0004 | **C1** (13: BU 70 RDV 71; nulo: BU 12 RDV 11) | 01007/0009/0004 | **C1** (13: BU 81 RDV 82; nulo: BU 6 RDV 5) |
| A4 | Diário: 1 linha "O voto do eleitor foi computado" a mais | C2 | 01007/0009/0005 | **C2** (diário 252, BU 251) | 01007/0009/0005 | **C2** (diário 235, BU 234) |
| A4b | Diário: cópia **idêntica** de uma linha "computado" (controle) | nada | 01007/0009/0006 | nada | 01007/0009/0006 | nada |
| A5 | Diário: 1 linha "computado" a menos | C2 | 01007/0009/0007 | **C2** (diário 152, BU 153) | 01007/0009/0007 | **C2** (diário 143, BU 144) |
| A6 | BU: comparecimento da seção +1, só esse campo | C2, C5, C6 | 01007/0009/0008: 164 → 165 | **C2** (164 × 165), **C5**, **C6** | 01007/0009/0008: 150 → 151 | **C2** (150 × 151), **C5**, **C6** |
| A6b | BU e RDV: 1 eleitor fabricado de forma coerente (comparecimento +1 na seção e em cada eleição, +1 liberado por biometria, +1 nulo em cada cargo no BU e no RDV, +2 no senador do 1º turno) | só C2 | 01007/0009/0009: 161 → 162 | **só C2** (161 × 162) | 01007/0009/0009: 138 → 139 | **só C2** (138 × 139) |

Em cada linha, C2 foi acusado pelos **dois** contadores do diário (abaixo, "C2" e "C2p"). Totais por turno, iguais nos dois: C1 4, C2 4, C2p 4, C3 1, C4 0, C5 1, C6 1; 0 acusação fora das 9 seções alteradas.

## O que é testado

- **C1** (seção × eleição × cargo): nominal por número (no RDV, a digitação inteira); legenda por partido (2 primeiros dígitos da digitação); branco = todo tipo do RDV que começa por "branco"; nulo = todo tipo que começa por "nulo" (`nulo`, `nuloAposSuspensao`, `nuloPorRepeticao`…); cargo de um lado só conta 0 do outro. É a definição de `contagem-coerencia.mjs` (2º turno) e do R1/R2 de `matematico-h16-rdv-bu.mjs` (1º turno). **O código do C1 é uma cópia da definição, não a função desses scripts** (eles não exportam a conta).
- **C2** (seção): comparecimento do BU = linhas "computado" do diário da própria seção, pela função `contarPacote` de `cetico-vsr25-universo.mjs`, importada e usada sem mudança. É o contador dos números finais do tópico 2 nos dois turnos ("votos do boletim sem rastro completo no diário").
- **C2p** (seção): a mesma conta com o contador que gerou `perfil_log.votos_computados` no banco (`juntarLogs` + `perfilLog` de `src/perfil-secoes.js`, importados sem mudança). É o C2 do quadro do 2º turno no tópico 2 (`contagem-coerencia.mjs`, `verifica-pericia-coerencia.mjs`).
- C3 a C6 rodam junto, para mostrar que cada alteração aparece só onde deve.

As alterações do diário são feitas no texto dos `logd.dat` depois de descompactados, antes da contagem. A4 insere logo após uma linha "computado" outra com a mesma data, urna e mensagem e outro valor no último campo (o de encadeamento); A5 tira uma linha "computado" de todas as cópias do diário no pacote.

## Conferência da rodada normal

**Fato.** Sem alteração, as mesmas contas dão 0 em tudo, e os totais batem com os resultados já gravados:

| | 1º turno | 2º turno |
|---|---:|---:|
| C1 comparações (seção × cargo) / diferenças | 11.350 / 0 | 4.540 / 0 |
| C2 seções / diferenças | 2.270 / 0 | 2.270 / 0 |
| Comparecimento do BU = computados da própria seção (`contarPacote`) | 488.330 = 488.330 | 453.654 = 453.654 |
| Computados pelo contador do perfil = `perfil_log` gravado no banco | 488.330 = 488.330 | 453.654 = 453.654 |
| Seções em que o recontado difere do `perfil_log` do banco | 0 | 0 |
| C3 / C4 / C5 / C6 diferenças | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |

Os 488.330 e 453.654 são os mesmos de `data/parsed/auditoria/cetico/vsr25/<t>t/ac.resumo.json` (2.270 pacotes, 0 erro, 0 seção com diferença).

## O que a contraprova mostra, e o que não mostra

- **Fato.** C1 acusa troca de candidato no RDV, voto a mais no RDV e voto a menos no BU, inclusive quando a soma do cargo fica igual (A3b), o caso que C3 não pega.
- **Fato.** C2 acusa linha "computado" a mais e a menos no diário e comparecimento a mais no BU. No A6b, o eleitor fabricado de forma coerente no BU e no RDV passa em C1 e em C3 a C6; **só o C2 acusa**. É a conta que liga o boletim ao diário.
- **Por definição, não acusa (A4b).** Uma linha "computado" idêntica a outra (mesma data, urna, mensagem e encadeamento) conta uma vez. É de propósito: pacotes trazem cópias do mesmo diário (memória interna e externa), e sem isso o C2 contaria votos em dobro (era um dos erros de leitura do tópico 2). Pelo mesmo motivo, tirar a linha de **uma só** cópia, quando o pacote tem duas, não é acusado. No AC não há pacote com cópias (`comCopias` 0 nos dois turnos).
- **Limite.** Um voto inventado e registrado em tudo (BU, RDV e um ciclo completo no diário, com habilitação e "computado") passa em C1 a C6. Contra isso valem as assinaturas do pacote e a digital, não estas contas.
- **Escopo.** A contraprova roda no AC; o C1 e o C2 do país inteiro são os já publicados no tópico 2. Ela prova que o método acusa a diferença; não refaz a contagem nacional.
- **Ainda pendente (fora deste documento).** Contraprova própria de C3 a C6 no 2º turno (aqui C3, C5 e C6 só aparecem como efeito colateral de A3 e A6, e C4 não é exercitada) e a da eleição estadual e dos eleitores em trânsito no 1º turno.

## Reproduzir

```bash
node scripts/auditoria/matematico-c1c2-contraprova.mjs                 # rodada normal, AC, dois turnos (~1 min) → data/parsed/auditoria/matematico/c1c2-ac-{resumo.txt,acusacoes.csv}
node scripts/auditoria/matematico-c1c2-contraprova.mjs --contraprova   # 18 alterações → c1c2-ac-contraprova-{resumo.txt,acusacoes.csv}; código de saída 1 se alguma falhar
```

Outra UF: `--uf <uf>`; um turno só: `--turnos 2`.
