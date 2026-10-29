# "Mesmo drive em várias seções" e "resultados iguais em seções diferentes"

29/10/2026. Duas alegações das redes, testadas nas 499.207 seções do 2º turno.
- [Post de 28/10/2026](https://x.com/FerResiliente1/status/2115373275245052233): "Usaram o mesmo drive de leitura para várias seções eleitorais" (vídeo, não transcrito).
- Pedido do auditor: contar seções com exatamente os mesmos votos (13, 22, brancos, nulos), como sinal de resultado copiado ou de seção fantasma.

`node scripts/resultados-iguais-e-midias.mjs 2` (perfis do 2º turno).

## 1. Mídias e urnas repetidas entre seções (H11, doc 07 A12)

| Item | Seriais | Usados em mais de uma seção | Esperado por acaso (serial de 32 bits) |
|---|---|---|---|
| MR, mídia de resultado (log) | 497.577 | 39 seriais: **1 grupo de 9 seções no AP** + 38 pares em UFs diferentes | 29,0 pares |
| FV, flash de votação (BU) | 499.149 | 30 pares, quase todos em UFs diferentes | 29,0 pares |
| Nº interno da urna (BU) | 499.180 | 2: urnas 1808076 (20 seções) e 1762246 (9 seções), todas do exterior | — |

- **Fato:** os pares de FV e de MR em UFs diferentes estão no número que o acaso produz. São coincidência de serial, como duas pessoas fazendo aniversário no mesmo dia numa festa grande.
  - O serial tem 8 dígitos hexadecimais, ou 4,3 bilhões de valores. Com cerca de 499 mil mídias, o acaso dá, em média, 29 pares repetidos.
  - Um cartão não pode estar fisicamente em AL e em PE no mesmo dia.
- **Fato:** as duas urnas repetidas são do exterior apurado pelo Sistema de Apuração (`saManual`): uma máquina apura várias seções.
- **Fato (a explicar):** a mídia de resultado **EC793229** aparece em **9 seções do AP** (06025/0012/0013 e 0034; 06114/0012/0044, 0052, 0053, 0054, 0055, 0056 e 0068).

  | O que muda entre as 9 seções | O que é igual |
  |---|---|
  | urna (9 números internos), cartão de votação (9 FVs), resultado e horários | serial da mídia de resultado |

  - **Leitura:** uma mesma mídia recebeu o resultado de 9 urnas. Não é resultado copiado.
  - **Pela premissa 8:** é prática fora de uma mídia por urna, a explicar pelo TRE-AP.
  - A mídia não consegue alterar o BU sem quebrar a assinatura da urna. **Pendente:** conferir a assinatura dessas 9 seções na verificação nacional (Auditor E).

## 2. Seções com os mesmos votos

| Medida (seções com 50 votos ou mais) | Resultado |
|---|---|
| Grupos com os mesmos votos para 13, 22, brancos e nulos | 54.381 grupos, 117.661 seções; o maior tem 7 |
| Grupos em que as seções compartilham urna, FV, MR ou pacote assinado | 1, no exterior (`zz/29351/0001/3888` = `zz/30287/0001/0796`, mesma MR) |
| Iguais também em aptos e no segundo do último voto | 1 par: CE 13188/0078/0197 e PB 20672/0013/0138 |

- **Fato:** votos iguais para presidente são comuns. São 4 números pequenos, entre centenas de milhares de seções.
- **Fato:** o par CE/PB tem urnas diferentes (UE2022 × UE2020), cartões e mídias diferentes e primeiro voto em horários diferentes (08:00:52 × 08:02:01 locais; último voto às 16:46:26 nas duas). Um resultado copiado reproduziria o log inteiro.
- **Hipótese (cálculo aproximado):** com cerca de 117 mil seções em grupos de votos iguais, cerca de 1 em 200 de mesmo número de aptos e cerca de 1 em 1.200 de mesmo segundo do último voto, o acaso daria por volta de 0,3 par assim. Achar 1 é compatível com coincidência.
- **Não usar:** a primeira comparação com o acaso feita aqui (votos sorteados com as proporções de cada seção: cerca de 41,7 mil grupos). Esse sorteio espalha mais os resultados do que a realidade e por isso dá menos coincidências. Ela **não** mede anomalia.

## 3. "Seções fantasmas"

Uma seção fantasma teria resultado sem urna, sem log ou sem eleitores. Nos dados:
- toda seção com BU tem urna identificada e log;
- a soma dos votos é igual ao comparecimento em todas as seções (tópico 8 da perícia);
- o BU bate com o log, exceto em 50 votos em 3 seções de contingência, com mecanismo encontrado ([parecer 08 do cético](../cetico-revisor/08-votos-sem-log-contingencia.md));
- nenhuma seção tem mais votantes que aptos.

**Pendente:** assinatura de todos os BUs (verificação nacional em andamento).

## Pendente

- Revisão cética.
- Explicação do TRE-AP para a mídia EC793229.
- Repetir no 1º turno.
