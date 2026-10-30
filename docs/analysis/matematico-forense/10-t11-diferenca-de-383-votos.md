# 10. Tópico 11 da perícia: de onde vêm os 383 votos

Matemático forense, 30/10/2026. Pedido do coordenador, questão 4 do [parecer T20 parte 1](../modelos/T20/parecer-parte1.md). Banco: cópia de leitura de 29/10 10:50 UTC. Universo: as 2.818 trocas novas por reserva do 2º turno (todas).

## Resposta curta

- **Fato.** A diferença de 383 votos não é erro de conta nem voto perdido. As duas contas do tópico usam fontes diferentes: **575.362** é a soma de votos que a **própria reserva** registrou no diário (log); **731.639** é o comparecimento do **boletim (BU)**; **155.894** é a soma de votos que as **urnas originais** registraram no diário no dia, só nas trocas feitas em 25/10. A conta `731.639 − 155.894` deixa de fora dois grupos e mistura BU com diário.
- **Fato.** Decomposição exata, seção a seção: **383 = 563 − 180**.
  - **+563**: as 2 trocas sem registro de contingência (ES 57932/0009/0112, 304 votos, e SP 61654/0014/0250, 259 votos). Nelas o BU é de urna do tipo "reserva que só encerra a seção": todos os votos foram registrados no diário da urna original, e a reserva não registrou nenhum. Esses 563 votos não estão nem nos 575.362 (reserva) nem nos 155.894 (que só contam as trocas no dia).
  - **−180**: 5 seções das trocas no dia em que o diário (somando todas as urnas do pacote) não bate com o BU. As 5 já estão explicadas, uma a uma, na seção "As 10 seções em que o diário não bateu de primeira" do tópico 2 da perícia:

| Seção | Diário − BU | O que explica (tópico 2) |
|---|---:|---|
| BA 39870/0133/0184 | +185 | o diário da urna original está 2 vezes no pacote; a contagem por urna somou as duas cópias |
| MG 40690/0016/0264 | +46 | um diário já continha o outro; 46 votos da urna original contados duas vezes |
| BA 35653/0173/0235 | −13 | 13 votos do BU sem nenhuma linha no diário (erro 72, urna intermediária) |
| MA 08893/0047/0609 | −36 | 36 votos do BU sem nenhuma linha no diário (mesmo mecanismo) |
| RS 89060/0017/0191 | −2 | 2 votos sem a linha "computado" (queda da urna) |
| **Soma** | **+180** | |

- **Fato.** As trocas feitas entre os turnos (848) fecham sem diferença: diário da reserva = BU = 219.008 votos, e a urna original não registrou voto em 25/10.
- **Fato (consequência).** O número **155.894** do tópico 11 conta duas vezes 231 votos (185 + 46) de diários copiados em dobro no pacote. Votos distintos registrados no diário pelas urnas originais antes da troca, no dia: **155.663**, nas mesmas **1.423** seções.
- **Fato (fecho).** 575.362 (reserva) + 155.663 (urnas originais, no dia) + 563 (2 seções sem registro de contingência) + 51 (votos do BU sem linha "computado" no diário: 13 + 36 + 2) = **731.639** = comparecimento do BU das 2.818 trocas novas.

## Como foi feito

Script `scripts/auditoria/matematico-t11-383.mjs`. Para cada uma das 2.818 seções, lê em `data/parsed/auditoria/reservas-rastro/biometria-por-urna.json` os votos do dia 25/10 separados por urna (campo `reserva` = a urna do BU; `outras` = as demais urnas cujas linhas estão em algum diário do pacote) e o comparecimento do BU na tabela `secao` da cópia de leitura. Soma por grupo (h14Antes, h14Dia, h14SemRegistro) e lista toda seção em que `reserva + outras ≠ BU`.

| Grupo | Seções | BU | Diário da reserva | Diário das urnas anteriores | Diário − BU |
|---|---:|---:|---:|---:|---:|
| Troca no dia (h14Dia) | 1.968 | 512.068 | 356.354 | 155.894 | +180 |
| Troca entre os turnos (h14Antes) | 848 | 219.008 | 219.008 | 0 | 0 |
| Sem registro de contingência | 2 | 563 | 0 | 563 | 0 |
| **Total** | **2.818** | **731.639** | **575.362** | **156.457** | **+180** |

Conferência no bruto das duas seções com contagem dobrada (varredura do engenheiro, `reservas-rastro/varredura/`, um registro por diário):
- BA 39870/0133/0184: dois diários aninhados da urna original 02172386 (`...150514-01.jez` e `...ME.jez`), cada um com 185 votos em 25/10; a reserva 02176991 tem 43. 185 + 43 = 228 = BU.
- MG 40690/0016/0264: a urna original 02129190 aparece em dois diários aninhados, cada um com 46 votos; a urna 02080602 tem 68 votos; a urna do BU (02092884) não registrou voto e fez a contingência às 18:28. 46 + 68 = 114 = BU.

## O texto do tópico 11 precisa mudar?

**Recomendação.** Sim, em dois pontos. Nenhum muda conclusão; os dois tornam os números exatos e conferíveis.

1. Em "Quando a troca nova foi feita", trocar "(155.894 votos)" por "(155.663 votos registrados no diário dessas urnas; a contagem por urna somava 231 votos duas vezes, de diários copiados em dobro no pacote em duas seções)". Hoje o 155.894 não passa no critério de número 100% correto: conta votos repetidos.
2. Na nota da biometria das 125 reservas de outra zona, dizer o que é o denominador: "votos que a própria reserva registrou no diário". Sugestão de frase, logo depois dos números: "Os 28.884 e os 546.478 são votos registrados no diário pela própria reserva. Somam 575.362. Os outros 156.277 votos do comparecimento dessas 2.818 seções foram registrados pelas urnas originais antes da troca (155.663), estão nas 2 seções sem registro de contingência, em que a reserva só encerrou a votação (563), ou constam do boletim sem linha de voto no diário (51, as seções explicadas no tópico 2)."

Os percentuais de biometria (11,2%, 12,4%, 15,3%) não mudam: o denominador é o mesmo dos numeradores (votos da reserva).

## Limites

- A divisão "reserva × anteriores" é feita pelo número da urna gravado em cada linha do diário. Ela depende de o pacote trazer o diário de cada urna; nas 2 seções com votos sem diário (BA 0235 e MA 0609), os 49 votos foram registrados por uma urna intermediária cujo diário não está no pacote (tópico 2). Essas duas seções têm 0 voto "anterior" no diário, e por isso não estão entre as 1.423.
- **Pendente:** se a perícia quiser dizer "em quantas seções uma urna anterior recebeu votos no dia", o número com base no BU é 1.425 (as 1.423 do diário mais BA 0235 e MA 0609). A frase atual ("a urna original já tinha recebido votos") só vale para o diário.

## Para refazer

```
node scripts/auditoria/matematico-t11-383.mjs
```

Saída: `data/parsed/auditoria/matematico-forense/t11-383.json` (decomposição, somas por grupo, as 7 seções listadas e as 2 com cópia dobrada do diário). O script termina com código 1 se alguma das 7 conferências falhar. As cópias dobradas são achadas na varredura do engenheiro (`reservas-rastro/varredura/`): a mesma urna com votos em 25/10 em mais de um diário do pacote; votos distintos = maior contagem entre as cópias.
