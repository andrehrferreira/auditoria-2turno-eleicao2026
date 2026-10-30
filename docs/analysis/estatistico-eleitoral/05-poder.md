# 05. Poder do desenho: que inserção ele pegaria? (pergunta 5)

> **Atualização (29/10/2026):** o limite de detecção do teste E2 (H05) com as 28 UFs e o modelo de efeito fixo de município está em [06](06-h05-28ufs.md). O `poder-banco.json` foi refeito com 28 UFs e com o exterior fora do E2; a versão anterior ficou em `poder-banco-antes-correcao-exterior.json`.

Estatístico eleitoral, 29/10/2026. Comando: `node --max-old-space-size=10240 scripts/auditoria/estatistico-dc-poder.mjs banco 5` → `poder-banco.json`, cerca de 13 minutos. A linha de base lida a favor do 22: `... estatistico-dc-poder.mjs banco 1 13` → `poder-banco-13.json`.

Base: as 22 UFs com o 1º turno no banco, 338.884 seções. O ganho real do 13 nessas UFs foi de 6.724.774 votos. Na diferença final do país, o 13 ficou 4,43 milhões à frente.

## Como foi simulado

- Votos falsos são inseridos nos dados **reais**: em cada seção sorteada, +k comparecimentos, +k votos para o beneficiado e +k habilitações na categoria escolhida. Nunca se passa dos aptos.
- Depois da inserção, o modelo da zona é **refeito**: esperado, φ e z. São 5 réplicas por cenário, com outras seções sorteadas em cada uma.
- As regras de decisão foram declaradas antes de rodar. O limiar |t| ≥ 3,3 corresponde a p ≈ 0,001 bilateral:

| Regra | O que dispara | Linha de base sem inserção (13 / 22) |
|---|---|---|
| R1 cauda | z ≥ 3 mais que z ≤ −3 (binomial, p < 0,001) | 775 contra 1.667: não |
| R2 Klimek-Δ | inclinação da parcela do beneficiado sobre o excesso positivo, t ≥ 3,3 | t = −1,7 / +1,7: não |
| R3 proporção | excesso mais a favor do beneficiado que o aumento esperado, t ≥ 3,3 | t = −2,1 / **+12,6: dispara sem inserção** |
| R4 E2 nacional | sem biometria − por biometria no ganho do beneficiado, t ≥ 3,3 | t = −0,7 / +0,2: não |
| R4uf E2 por UF | alguma UF com q (BH) < 0,05 a favor do beneficiado | nenhuma |
| R5 composição | parte do excesso na categoria inserida maior que a do esperado, t ≥ 3,3 | t = −8,1: não |

**A R3 está mal calibrada e foi descartada como alarme.** Sem nenhuma inserção, ela "detecta" favorecimento do 22 (t = 12,6) por causa do viés ecológico do aumento esperado ([04](04-concentracao-e-assimetria.md)). É exatamente o tipo de falso positivo que este perfil existe para barrar.

## Resultado (Fato: poder = fração das 5 réplicas em que a regra disparou; t médio entre parênteses)

| Cenário | Votos inseridos | % do ganho do 13 | R1 cauda | R2 Klimek-Δ | R4 E2 | R4uf | R5 composição |
|---|---:|---:|---|---|---|---|---|
| **5% das seções, +10 sem biometria cadastrada (o pedido)** | **169.213** | 2,5% | **1** | **1** (21,4) | **1** (15,5) | 1 (19 UFs) | **1** (9,2) |
| 5% dos redutos do 13, +10 | 168.865 | 2,5% | 1 | 1 (3,9) | 1 (16,0) | 1 | 1 (8,8) |
| 5% das seções em **zonas inteiras**, +10 | 170.369 | 2,5% | **0** | **0** (−1,4) | **0** (0,5) | **0** | **0** (−8,2) |
| 5% das seções, +10 como ano de nascimento | 169.185 | 2,5% | 1 | 1 (21,1) | 1 (15,1) | 1 | 0 (2,1) |
| 5% das seções, +10 **por biometria** | 169.216 | 2,5% | 1 | 1 (21,4) | 0 (−6,0) | 0 | 1 (12,1) |
| 5% dos redutos do 22, +10 para o 22 | 169.275 | 2,5% | 0 | 1 (9,7) | 1 (16,0) | 1 | 1 (6,8) |
| 5% das seções, +5 | 84.689 | 1,3% | 0 | 1 (3,5) | 1 (5,5) | 1 | 0 (−1,4) |
| 1% das seções, +10 | 33.829 | 0,5% | 0 | 1 (3,9) | 1 (4,6) | 1 | 0 (−2,4) |
| 1% das seções, +20 | 67.397 | 1,0% | 1 | 1 (19,9) | 1 (13,5) | 1 | 1 (7,6) |
| 0,25% das seções, +40 | 32.526 | 0,5% | 0 | 1 (16,7) | 1 (12,4) | 1 | 1 (6,8) |
| 20% dos redutos do 13, +5 | 338.564 | 5,0% | 0 | **0** (−5,0) | 1 (10,9) | 1 | 0 (2,5) |
| 20% das seções em **zonas inteiras**, +5 | 339.589 | 5,0% | **0** | **0** | **0** | **0** | **0** |

Contagens da cauda R1 (z ≥ 3 contra z ≤ −3) no cenário pedido: de 1.823/1.495 a 1.903/1.523 nas 5 réplicas, contra 775/1.667 sem inserção.

## O que o desenho pega e o que não pega

- **Pega (Fato, simulação):**
  - **O cenário pedido** (5% das seções com +10 votos sem biometria para um lado, cerca de 169 mil votos) é detectado por quatro regras independentes em todas as réplicas: cauda, Klimek-Δ, E2 e composição. O mesmo vale nos redutos e a favor do 22, com R1 falhando só no caso do 22.
  - **Inserção concentrada a partir de ~33 mil votos**, se cair em 1% das seções ou menos e for registrada sem biometria ou por ano de nascimento: R2 e R4 disparam com +10 em 1% das seções e com +40 em 0,25%.
  - **Inserção pequena e espalhada** de +5 em 5% das seções (85 mil votos): só R2 e R4 disparam, com t de 3,5 e 5,5, perto do limiar.
- **Não pega:**
  - **Inserção uniforme em zonas inteiras.** Mesmo com 20% das seções e +5 cada (340 mil votos, 5% do ganho do 13), nenhuma regra dispara. O esperado da zona absorve tudo. É o ponto cego principal deste desenho e de qualquer desenho que compare a seção com a zona.
  - **Inserção espalhada em muitos redutos:** 20% dos redutos do 13 com +5 só é pega pelo E2, e só se registrada sem biometria. A R2 dá t = −5,0, o sinal errado: a inserção nos redutos desloca o modelo da zona.
  - **Inserção registrada como "por biometria"** escapa do E2 (R4 dá t = −6,0, o sentido oposto). Ela continua visível na cauda e no Klimek-Δ. Pelo princípio 8, essa forma é a menos plausível: exige a digital do eleitor, que é controle técnico.
  - **Inserção igual nos dois turnos** (não simulada): some na diferença, por construção.
- **A cauda (R1) sozinha é fraca.** Ela precisa de +10 em 5% ou +20 em 1% das seções, porque a cauda esquerda real (quedas de comparecimento) é pesada. Os testes que olham para o lado favorecido (R2, R4) são de 3 a 5 vezes mais sensíveis.

## Leitura para a auditoria

- Nos dados reais, **nenhuma regra válida dispara** ([02](02-distribuicao-e-klimek.md), [03](03-quem-e-o-eleitor-a-mais.md)).
  - Com o poder medido aqui, isso exclui, nas 22 UFs, inserção pela brecha sem biometria **concentrada em 1% das seções ou menos a partir de ~33 mil votos** e **espalhada em 5% das seções a partir de ~85 mil votos**.
  - O teste E2 do cético já dava ~34 mil votos para inserção concentrada ([cético, 06](../cetico-revisor/06-comparecimento-extra-sem-vies-biometria.md)).
- Os dados reais **não excluem**:
  - inserção uniforme numa zona ou num município inteiro, pelo menos até 340 mil votos nas 22 UFs (5% do ganho do 13);
  - fraude do mesmo tamanho nos dois turnos.
  - Esses casos pedem outro tipo de prova: log por seção (horário, rajada, mesário), cadastro × população (demógrafo) e linha de base de 2022 por zona.
- **Para comparar:** o aumento de +4,0% nos votos nominais equivale a ~4,8 milhões de votos no país (119,3 → 124,1 milhões). O que o desenho deixaria passar por seção é inserção da ordem de dezenas de milhares de votos. O que deixaria passar por zona inteira é da ordem de centenas de milhares. Este estudo **não** pode dizer, sozinho, que o +4% não tem fraude uniforme por zona. Ele diz que esse aumento não tem a forma de inserção concentrada em seções.

## Pendências

1. Rodar de novo com SP e o Sul no banco: `node scripts/auditoria/estatistico-dc-refazer.mjs --sem-abertos`.
2. Um desenho para o ponto cego (zona inteira): Δ por zona contra a linha de base de 2022 por zona, mais o perfil da zona. Depende do `votacao_secao` e do `detalhe_votacao_secao` de 2022, que precisam de rede.
