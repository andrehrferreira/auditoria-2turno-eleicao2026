# 10. Tópico 11 da perícia: de onde vêm os 383 votos

Matemático forense, 30/10/2026, revisto com as correções do [parecer cético 39](../cetico-revisor/39-h23-h24-t11.md), que refez os números no bruto e os sustentou. Pedido do coordenador, questão 4 do [parecer T20 parte 1](../modelos/T20/parecer-parte1.md). Banco: cópia de leitura de 29/10 10:50 UTC. Universo: as 2.818 trocas novas por reserva do 2º turno (todas).

## Resposta curta

- **Fato.** A diferença de 383 votos não é erro de conta nem voto perdido. As duas contas do tópico usam fontes diferentes: **575.362** é a soma de votos que a **própria reserva** registrou no diário (log); **731.639** é o comparecimento do **boletim (BU)**; **155.894** é a soma de votos que as **urnas usadas antes da reserva** registraram no diário no dia, só nas trocas feitas em 25/10 (em geral uma urna, a da seção; na MG 40690/0016/0264, duas). A conta `731.639 − 155.894` deixa de fora dois grupos e mistura BU com diário.
- **Fato.** Decomposição exata, seção a seção: **383 = 563 − 180**.
  - **+563**: as 2 trocas sem registro de contingência (ES 57932/0009/0112, 304 votos, e SP 61654/0014/0250, 259 votos). Nelas o BU é de urna do tipo "reserva que só encerra a seção": todos os votos foram registrados no diário da urna usada antes da reserva, e a reserva não registrou nenhum. Esses 563 votos não estão nem nos 575.362 (reserva) nem nos 155.894 (que só contam as trocas no dia).
  - **−180**: 5 seções das trocas no dia em que o diário (somando todas as urnas do pacote) não bate com o BU. As 5 já estão explicadas, uma a uma, na seção "As 10 seções em que o diário não bateu de primeira" do tópico 2 da perícia:

| Seção | Diário − BU | O que explica (tópico 2) |
|---|---:|---|
| BA 39870/0133/0184 | +185 | o pacote traz duas cópias do mesmo diário da urna usada antes da reserva (185 votos em cada cópia, linhas idênticas) |
| MG 40690/0016/0264 | +46 | o pacote traz o diário de uma das urnas usadas antes da reserva (46 votos) e outro diário que o contém por inteiro |
| BA 35653/0173/0235 | −13 | 13 votos do BU recebidos antes da troca por uma urna (01681986) cujo diário não está no pacote |
| MA 08893/0047/0609 | −36 | 36 votos do BU recebidos antes da troca por uma urna (01663580) cujo diário não está no pacote |
| RS 89060/0017/0191 | −2 | 2 votos sem a linha "computado" (queda da urna) |
| **Soma** | **+180** | |

- **Fato.** As trocas feitas entre os turnos (848) fecham sem diferença: diário da reserva = BU = 219.008 votos, e nenhuma urna anterior registrou voto em 25/10.
- **Fato (consequência).** Em 2 seções, o pacote traz duas cópias do mesmo diário (BA 39870/0133/0184 e MG 40690/0016/0264). Somar as cópias conta 231 votos duas vezes (185 + 46); por isso o **155.894** do tópico 11 está acima do real. Votos distintos registrados no diário pelas urnas usadas antes da reserva, no dia: **155.663**, em **1.423** seções.
- **Fato (votos antes da troca sem diário).** Em mais 2 seções, BA 35653/0173/0235 (13 votos) e MA 08893/0047/0609 (36 votos), houve **49 votos** antes da troca, recebidos por uma urna cujo diário não está no pacote (tópico 2). Essas duas não entram nas 1.423, que só contam o que o diário mostra. Pelo BU, as seções com voto antes da troca no dia são 1.425.
- **Fato (fecho).** 575.362 (reserva) + 155.663 (urnas usadas antes da reserva, no dia) + 563 (2 seções sem registro de contingência) + 51 (votos do BU sem linha "computado" no diário: 13 + 36 + 2) = **731.639** = comparecimento do BU das 2.818 trocas novas.

## Como foi feito

Script `scripts/auditoria/matematico-t11-383.mjs`. Para cada uma das 2.818 seções, lê em `data/parsed/auditoria/reservas-rastro/biometria-por-urna.json` os votos do dia 25/10 separados por urna (campo `reserva` = a urna do BU; `outras` = as demais urnas cujas linhas estão em algum diário do pacote) e o comparecimento do BU na tabela `secao` da cópia de leitura. Soma por grupo (h14Antes, h14Dia, h14SemRegistro) e lista toda seção em que `reserva + outras ≠ BU`.

| Grupo | Seções | BU | Diário da reserva | Diário das urnas anteriores | Diário − BU |
|---|---:|---:|---:|---:|---:|
| Troca no dia (h14Dia) | 1.968 | 512.068 | 356.354 | 155.894 | +180 |
| Troca entre os turnos (h14Antes) | 848 | 219.008 | 219.008 | 0 | 0 |
| Sem registro de contingência | 2 | 563 | 0 | 563 | 0 |
| **Total** | **2.818** | **731.639** | **575.362** | **156.457** | **+180** |

Conferência no bruto das duas seções com contagem dobrada (varredura do engenheiro, `reservas-rastro/varredura/`, um registro por diário):
- BA 39870/0133/0184: duas cópias do diário da urna usada antes da reserva, 02172386 (`...150514-01.jez` e `...ME.jez`), cada uma com 185 votos em 25/10 e linhas idênticas (o parecer 39 conferiu linha a linha, com o hash encadeado); a reserva 02176991 tem 43. 185 + 43 = 228 = BU.
- MG 40690/0016/0264: **duas** urnas foram usadas antes da reserva. A 02129190 tem 46 votos num diário; o outro diário traz os mesmos 46 e mais 68 da urna 02080602. A urna do BU (02092884) não registrou voto e fez a contingência às 18:28. 46 + 68 = 114 = BU.

## O texto do tópico 11 precisa mudar?

**Recomendação.** Sim, em dois pontos. Nenhum muda conclusão; os dois tornam os números exatos e conferíveis. Textos na forma do parecer cético 39, que corrige a primeira proposta ("urna original" estava errado na MG 40690/0016/0264, e o 1.423 tem de ficar amarrado ao diário):

1. Em "Quando a troca nova foi feita", na linha da troca no dia:
   > **1.968** no dia do 2º turno. Em 1.423 delas, o diário mostra que a urna usada antes da reserva já tinha recebido votos antes da troca: 155.663 votos. Em 2 dessas seções, o pacote traz duas cópias do mesmo diário dessa urna, e cada voto foi contado uma vez. Em outras 2 seções (BA 35653/0173/0235 e MA 08893/0047/0609), também houve votos antes da troca, mas o diário da urna que os recebeu não está no pacote (49 votos; ver o tópico 2);
2. Na nota da biometria das 125 reservas de outra zona, logo depois dos números:
   > Os 28.884 e os 546.478 são votos que a própria reserva registrou no diário; somam 575.362. O comparecimento dessas 2.818 seções no boletim é 731.639. Os outros 156.277 votos estão assim: 155.663 foram registrados no diário pela urna usada antes da reserva; 563 estão nas 2 seções sem registro de contingência, em que todos os votos ficaram no diário da urna anterior e a reserva só encerrou a votação; e 51 constam do boletim sem a linha de voto no diário, nas 3 seções explicadas no tópico 2 (BA 35653/0173/0235, MA 08893/0047/0609 e RS 89060/0017/0191).

Os percentuais de biometria (11,2%, 12,4%, 15,3%) não mudam: numerador e denominador são da própria reserva.

## Limites

- A divisão "reserva × anteriores" é feita pelo número da urna gravado em cada linha do diário. Ela depende de o pacote trazer o diário de cada urna. Nas 2 seções com votos sem diário (BA 0235 e MA 0609), os 49 votos foram recebidos por uma urna cujo diário não está no pacote (tópico 2). Essas duas seções têm 0 voto "anterior" no diário, e por isso não estão entre as 1.423.
- O doc 06 do engenheiro de segurança (linha "Urna substituída, antes da troca") usa os mesmos 155.894 e herda os 231 votos em dobro; a correção é dele (parecer 39, item 5.3).

## Para refazer

```
node scripts/auditoria/matematico-t11-383.mjs
```

Saída: `data/parsed/auditoria/matematico-forense/t11-383.json` (decomposição, somas por grupo, as 7 seções listadas e as 2 com cópia dobrada do diário). O script termina com código 1 se alguma das 7 conferências falhar. As cópias dobradas são achadas na varredura do engenheiro (`reservas-rastro/varredura/`): a mesma urna com votos em 25/10 em mais de um diário do pacote; votos distintos = maior contagem entre as cópias.
