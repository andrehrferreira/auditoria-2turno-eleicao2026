# 03. Coerência interna BU × RDV × log (teste 3, doc 07 A6 e D1)

Auditor A (contagem e coerência), 29/10/2026. Princípio 8 (doc 01): só controles técnicos contam. Aqui os controles são o BU e o RDV assinados e o log da urna (com hash de encadeamento por linha).

## Testes e hipóteses nulas

| # | Teste | H0 |
|---|---|---|
| C1 | BU × RDV por eleição e cargo: nominal por número; legenda por partido (2 primeiros dígitos da digitação no RDV); branco; nulo | iguais. Nulo do BU = `nulo` + `nuloAposSuspensao` + `nuloPorRepeticao` do RDV |
| C2 | votos computados no log (`O voto do eleitor foi computado`) × comparecimento do BU | iguais |
| C3 | soma dos votos de cada cargo × comparecimento da eleição | soma = comparecimento × votos por eleitor (senador 2026 = 2) |
| C4 | aptos × (aptos da seção + aptos em trânsito, TTE), por eleição (A6) | iguais |
| C5 | sem biometria cadastrada + por biometria + por biografia (detalhamento do BU) × comparecimento | iguais |
| C6 | comparecimento da seção × comparecimento majoritário da eleição federal; majoritário × proporcional na estadual | iguais |

## Resultado: 2º turno, país inteiro (499.248 seções, 499.207 com BU)

**Fato.**

| Teste | Comparações | Divergentes | Observação |
|---|---:|---:|---|
| C1 BU×RDV | 539.815 seção×cargo | **0** | nulos do BU 3.180.769 = nulo 3.180.131 + `nuloAposSuspensao` 638 do RDV |
| C2 log×BU | 499.178 seções com perfil | **10** | ver abaixo; os 29 SA ficam à parte |
| C3 soma×comparecimento | 539.815 | **0** | razão 1 em todos os cargos (presidente, governador, consultas) |
| C4 aptos = seção + TTE | 539.817 seção×eleição | **0** | TTE: 584.117 (federal), 41.804 (estadual) |
| C5 detalhamento | 497.897 | **0** | 1.310 seções do exterior sem detalhamento |
| C6 comparecimento | 499.178 | **0** | SA: o BU traz `qtdEleitoresCompareceram = 0` e o comparecimento só por eleição (formato do SA, conferido em ZZ 29173/0001/0494) |

- **Consultas populares:** 3 consultas (eleições 6287, 6288, 6289; cargos 25, 26, 27; 395 seções) não têm comparecimento no BU. A soma não pôde ser conferida com o comparecimento, só com o RDV (C1, igual).

### C2 no 2º turno: as 10 seções e a recontagem log a log

O perfil (`perfil_log.votos_computados`) junta todos os logs do pacote. Recontei cada log em separado, com `scripts/auditoria/contagem-log-pacote.mjs`:

- um voto é identificado por urna, data/hora e hash de encadeamento da linha, o que elimina as cópias do mesmo log;
- logs que declaram outra seção ficam separados;
- ciclos com "Voto confirmado" e sem "computado" (urna desligou) são contados à parte.

A recontagem cobriu **as 11.748 seções com 2 ou mais logs no pacote**, mais as 10 do C2. A ideia era descartar o caso de um log duplicado esconder um log faltante.

**Fato.**

| Seção | Tipo | BU | Log (recontado) | Explicação com rastro técnico |
|---|---|---:|---:|---|
| SP 64777/0395/0298 | seção | 268 | 268 | o perfil não leu o log (`log: null`); o log bruto tem 268 |
| BA 39870/0133/0184 | contingência | 228 | 185 + 43 | o log da urna original aparece 2 vezes no pacote (`-01.jez` e `…02ME.jez`); o perfil contou 413 |
| MG 40690/0016/0264 | contingência | 114 | 114 | `…02ME.jez` já contém o log original (46); o perfil contou 160 |
| ES 57932/0009/0085 | RED | 308 | 308 | a urna do RED recuperou antes a seção **0112** e trouxe o log dela (304 votos) para o pacote da 0085; o perfil contou 612. A 0112 tem BU 304 e log 304 |
| BA 34711/0021/0178 | seção | 234 | 233 + 1 | voto confirmado para Presidente às 08:49:04; a urna reinicia antes do "computado" |
| PB 21750/0002/0254 | seção | 304 | 303 + 1 | idem, 12:36:30 |
| PI 11533/0003/0216 | seção | 259 | 258 + 1 | idem, 11:06:23 |
| **RS 89060/0017/0191** | contingência | 92 | 90 (+1 confirmado) | **1 voto sem rastro**: o log original para às 09:02:34 em "Solicita digital" e só volta às 09:38 |
| **BA 35653/0173/0235** | contingência | 217 | 204 | **13 votos sem rastro** |
| **MA 08893/0047/0609** | contingência | 224 | 188 | **36 votos sem rastro** |

- Nas outras 11.745 seções com vários logs, o BU é igual ao número de votos computados distintos. Nenhum log duplicado escondia falta de votos. Só 1 pacote traz log de outra seção (o ES acima).
- **Fato, regra não uniforme:** "Voto confirmado" seguido de queda virou voto no BU em 3 seções e não virou em 8. Em todas, o total bate com "computados + interrompidos aceitos". **Hipótese:** depende de a urna ter gravado o voto na mídia antes ou depois da queda. O log não mostra isso.

### Os 50 votos sem rastro no log (2º turno)

**Fato.** Em 3 seções de contingência, 50 votos do BU (0,000039% de 128.236.074) não têm linha correspondente em nenhum log publicado no pacote. O BU e o RDV estão assinados pela urna de contingência. Os votos vêm da mídia de votação (MV), que passa da urna quebrada para a reserva (o log mostra "Serial da MV original… registrada na MI" igual ao serial da MV presente). O log da urna que **recebeu** esses votos não está no pacote.

Os contadores de habilitação do próprio BU (`detalhamentoComparecimento`), menos o que os logs publicados mostram, dizem como esses votos foram liberados:

| Seção | Votos sem log | Por biometria | Por biografia (sem digital do eleitor) | Sem biometria cadastrada |
|---|---:|---:|---:|---:|
| MA 08893/0047/0609 | 36 | 32 | 4 | 0 |
| BA 35653/0173/0235 | 13 | 1 | **12** | 0 |
| RS 89060/0017/0191 | 2 (1 com voto confirmado) | 1 | 1 | 0 |

- **MA 0609:**
  - a urna original abriu às 08:00:01 (horário do BU);
  - às 10:25, a mídia da 0609 foi posta na urna 01813459, que tem **a carga da seção 0445** (era a urna da 0445 no 1º turno; a 0445 usou contingência preparada em 24/10);
  - essa urna não registrou votos e falhou;
  - às 10:46, a contingência 01664037 copiou o log da mídia externa, que já era o da 01813459;
  - o log da urna original da 0609 (os 36 votos das 08:00 às ~10:20) não está publicado.
- **BA 0235:**
  - a urna original 01833178 reinicia 4 vezes entre 06:56 e 07:42, sem votos;
  - às 08:41, a urna **01681986** (nome do `.jez`) entra e copia esse log; **o log da própria 01681986 não está no pacote**;
  - às 09:01, a 01833178 volta a ligar declarando "Seção Eleitoral: 0083" e com a MV da 0235;
  - às 10:00, a contingência 01656557 assume e computa 204 votos a partir das 10:12;
  - os 13 votos sem log caem nesse intervalo.
  - **12 dos 13 foram liberados por biografia.** Nos 204 votos com log da mesma seção, a taxa por biografia é 10,3% (21/204). Ter 12 de 13 por acaso, com essa taxa, tem probabilidade da ordem de 10⁻¹¹ (binomial).

### Leitura pelo princípio 8

- O que é técnico e fecha: BU = RDV, soma = comparecimento e contadores de habilitação coerentes com o total. Isso vale também para essas 3 seções.
- O que falta: o rastro individual (linha a linha) de 50 votos. A troca de urna e de mídia é feita por pessoas (mesário, técnico). Nos casos MA e BA, a sequência fora do padrão (urna de outra seção, urna cujo log some) é exatamente o tipo de brecha que o princípio 8 manda tratar como **risco**.
- **Hipótese (benigna, técnica):** a troca de mídia entre urnas com cargas diferentes fez a mídia externa perder o log da urna anterior. Nos três casos, a urna que falhou é a mesma cujo log falta.
- **Hipótese (risco):** votos inseridos na MV fora do horário ou por pessoa diferente do eleitor, durante a janela sem log. O padrão da BA (12 de 13 sem digital) é o que se esperaria nesse cenário. Também se esperaria se o leitor biométrico da urna estivesse falhando, o que combina com os reinícios.
- **Nenhuma das duas está provada.** O efeito máximo é de 50 votos no país.

**Recomendação:**

1. Pedir, pela via de fiscalização (doc 07 C3), o log interno (MI) das urnas 01681986 e 01833178 (BA 35653/0173) e da urna original da MA 08893/0047/0609, além da ata da mesa dessas seções.
2. Comparar a distribuição de votos dessas seções com o 1º turno (doc 04, quando o 1º turno estiver completo).
3. Corrigir `src/perfil-secoes.js`: hoje ele soma cópias do mesmo log e log de outra seção. Deduplicar pelo hash da linha e separar por "Seção Eleitoral". Isso fica com o coordenador.

## Resultado: 1º turno (parcial, 13 UFs: AC a MT; 196.730 seções)

**Fato.**

- **C1:** 983.650 seção×cargo, **0** divergência. Nulos do BU 16.384.298 = `nulo` 14.846.715 + `nuloAposSuspensao` 65.839 + `nuloPorRepeticao` 1.471.744. Legenda BU 4.429.786 = RDV 4.429.786. O RDV guarda a digitação completa na legenda (ex.: `1103`); o BU agrega pelo partido (`11`).
- **C3:** 0 divergência. Senador = 2 × comparecimento nas 196.730 seções; os demais cargos, 1 ×.
- **C4:** 393.460 seção×eleição, 0 divergência. TTE: federal 224.595, estadual 161.171.
- **C5:** 0 divergência (2 seções de SA sem detalhamento).
- **C6:** 0 fora os 2 SA mistos em MG (41238/0039/0168 e 50075/0047/0041, `saMistaBUImpressoCedula`, motivo "urna chegou após o início da votação"). No SA, o BU não traz o comparecimento da seção (formato).
- **C2:**
  - 153.097 seções com perfil: 153.094 iguais, 3 divergentes;
  - na recontagem log a log, as 3 fecham com 0 voto sem rastro: ES 56995/0053/0211 (+1 confirmado nos 6 cargos antes do reinício), MG 44458/0103/0221 e MG 47830/0165/0031 (cópias MI/ME do mesmo log);
  - **43.633 seções sem perfil** (AM e BA): o perfil do log do 1º turno dessas UFs ainda não está no banco.

## Reproduzir

```bash
node scripts/auditoria/contagem-coerencia.mjs --turno 2            # C1–C6
node scripts/auditoria/contagem-log-pacote.mjs --turno 2           # recontagem log a log das seções do C2
node scripts/auditoria/contagem-log-pacote.mjs --turno 2 --multiplos --parte 1/2   # e 2/2: todas as seções com 2+ logs
node scripts/auditoria/contagem-coerencia.mjs --turno 1            # 1º turno, UFs carregadas
node scripts/auditoria/contagem-log-pacote.mjs --turno 1 --csv data/parsed/auditoria/contagem/coerencia-1t-<ufs>-divergencias.csv
```

Saídas: `data/parsed/auditoria/contagem/coerencia-*`, `log-pacote-*`.

## Pendente

- 1º turno: 14 UFs + ZZ (carga em andamento); C2 de AM e BA (perfil do 1º turno); `--multiplos` para o 1º turno.
