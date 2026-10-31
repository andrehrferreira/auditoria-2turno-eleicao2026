# 11. Seções novas: a coorte de 2022 até 2026 e o teste de recência (pendências da H27)

Data: 31/10/2026. Pedido do coordenador, depois do [doc 08](08-secoes-novas-e-h01-2turno.md) e do parecer cético 41. Três pendências:

1. o comparecimento das seções que eram novas em 2022, traçado até 2026;
2. o excesso de seções novas com 95% ou mais em 2026 (cerca de 343 acima do esperado pelo tamanho), maior que o de 2022 (cerca de 54);
3. a explicação da "recência" (a seção nova junta quem se alistou ou se transferiu há pouco), ainda sem teste com dado direto.

Tudo agregado por seção, local, município ou UF. Nenhum CPF, nenhum título, nada de `data/private/`. O banco foi lido pela cópia imutável (`abrirLeitura()`, cópia `2026-10-29T10:50`). `data/raw` não foi varrido. Rótulos: **Fato**, **Hipótese**, **Estimativa** (número que sai de conta sobre um modelo), **Pendente**, **Recomendação**. Turno de referência: o 2º; o 1º aparece entre parênteses quando muda a leitura.

## Fontes

- **Perfil do eleitorado por seção de 2022, todas as 27 UFs e o exterior.** O estatístico já tinha baixado MG, PR, SC e RS. Baixei as outras 24 do CDN do TSE, um pedido por vez. Juntas somam cerca de 640 MB. Lista com URL, Last-Modified, ETag, tamanho e SHA-256: [11-arquivos-baixados.csv](11-arquivos-baixados.csv). O CDN não publica `.sha512` desses arquivos, então o único hash é o calculado aqui. Cada zip tem o seu `.meta.json` ao lado.
  - **Fato (conferência):** o perfil de 2022 soma **156.454.011 eleitores** em 496.512 seções, o eleitorado oficial de 2022. O de 2026 soma 158.745.463 em 516.785 seções.
- Comparecimento por seção: `detalhe_votacao_secao` de 2018, 2020 e 2022 (Presidente) e, em 2026, o BU do banco (como no doc 08). Os números do doc 08 foram reproduzidos exatamente: 433 × 206 (2º turno de 2026), 118 × 114 (2022), excesso de 342,5 e de 54,3.
- Definições de "nova", iguais às do doc 08:
  - **nova em 2026:** ausente do CEFT do 1º turno de 2022 ou, fora de DF e do exterior, do CEFT de 2024;
  - **nova em 2022:** ausente do detalhe de 2018 ou, fora de DF e do exterior, do de 2020.
- **Local novo:** o número do local (UF/município/zona/local) não existia na eleição geral anterior (detalhe de 2022 para 2026; detalhe de 2018 para 2022). **Zona nova:** a zona não existia.
- **Excesso:** observadas − esperadas pelo tamanho. É a padronização do doc 08: faixas de 25 aptos e, como base, a taxa de 95% ou mais das seções **antigas** da mesma faixa. Por construção, o excesso se soma por categoria.

---

## 1. A coorte de 2022: o comparecimento alto se mantém? (Fato)

As 85.893 seções novas de 2022, na mesma chave e no mesmo turno em 2026. 81.749 existem em 2026, e 77.616 delas continuam no mesmo local.

| 2º turno | Seções (com par em 2026) | 2022 | 2026 | Variação média por seção (pontos) | Aptos médios 2022 → 2026 |
|---|---:|---:|---:|---:|---:|
| Novas de 2022 | 81.749 | 79,57% | 80,52% | +0,99 | 297 → 299 |
| Antigas de 2022 | 379.447 | 79,44% | 80,99% | +1,61 | 340 → 326 |
| **Novas de 2022 com 95%+ em 2022** | 112 de 118 | 96,06% | **89,31%** | **−6,44 (EP 0,52)** | **173 → 239** |
| Antigas de 2022 com 95%+ em 2022 | 111 de 114 | 95,77% | 92,16% | −3,62 (EP 0,33) | 203 → 217 |

Onde ficaram em 2026 as 118 novas que passaram de 95% em 2022: 18 continuam com 95% ou mais, 42 entre 90% e 95%, 31 entre 85% e 90%, 14 entre 80% e 85%, 7 abaixo de 80% e 6 não existem mais. Das 114 antigas: 24, 61, 22, 3, 1 e 3.

| Excesso pelo tamanho, mesma coorte | 2022 | 2026 (mesmas seções) |
|---|---|---|
| 2º turno | 118 observadas × 63,7 esperadas, **excesso +54,3** (razão 1,85) | 41 × 60,8, **excesso −19,8** (0,67) |
| 1º turno | 168 × 57,7, +110,3 (2,91) | 41 × 27,0, +14,0 (1,52) |

- **Fato:** o comparecimento muito alto da seção nova **não se mantém**. Em quatro anos, as novas de 2022 que passaram de 95% caíram 6,4 pontos em média. As antigas que também tinham passado de 95% caíram 3,6. Essa parte é a volta à média que toda cauda tem. A diferença de 2,8 pontos (1º turno: 7,9 × 4,1) é o que a seção nova perde **a mais**.
- **Fato:** no mesmo período, essas seções novas **cresceram** 38% em aptos (de 173 para 239 em média). As antigas cresceram 7%. A seção nova pequena e coesa vai recebendo eleitores comuns e se dilui.
- **Fato:** como coorte, o excesso pelo tamanho some. Em 2026, as novas de 2022 passam de 95% **menos** do que o esperado pelo tamanho (41 × 60,8 no 2º turno).
- **Fato (estabilidade dentro da eleição):** das novas com 95%+ no 2º turno, a parte que também passou de 95% no 1º turno foi 229 de 433 em 2026 (53%) e 70 de 118 em 2022 (59%). Nas antigas: 58 de 206 (28%) e 45 de 114 (39%). Em 2026, a seção nova alta é tão estável entre turnos quanto era em 2022.

**Leitura:** o padrão de 2022 é um efeito passageiro de seção recém-criada. Ele aparece, fica estável nos dois turnos e se desfaz em uma eleição geral. Isso combina com a recência e não combina com um defeito permanente da seção.

---

## 2. Onde está o excesso, com a mesma regra nos dois anos (Fato; a conta contrafactual é Estimativa)

| 2º turno | Novas 2022 | Obs. / esp. | Excesso 2022 | Novas 2026 | Obs. / esp. | Excesso 2026 |
|---|---:|---:|---:|---:|---:|---:|
| **Local novo** | 4.585 | 62 / 9,1 (6,8×) | **+52,9** | 10.816 | 247 / 33,5 (7,4×) | **+213,5** |
| **Local existente** | 80.247 | 55 / 53,6 (1,03×) | **+1,4** | 27.719 | 184 / 55,7 (3,3×) | **+128,3** |
| Zona nova | 1.061 | 1 / 0,9 | +0,1 | 2.205 | 2 / 1,3 | +0,7 |
| Total | 85.893 | 118 / 63,7 | +54,3 | 40.740 | 433 / 90,5 | +342,5 |

- **Fato:** em 2022, **todo o excesso está nas seções novas em local novo**. A seção nova num local que já existia votou exatamente como a antiga do mesmo tamanho (55 observadas × 53,6 esperadas).
- **Fato:** em 2026, o excesso tem duas partes: local novo (+213,5) e local existente (+128,3). A segunda **não existia em 2022**.
- **Estimativa (decomposição da diferença de cerca de 288 seções):**
  - cerca de **72** vêm de haver 2,4 vezes mais seções novas em local novo (10.816 × 4.585). Com a taxa de excesso de 2022, os locais novos de 2026 dariam +125, contra +53 em 2022;
  - cerca de **89** vêm de a taxa nesses locais novos ser maior em 2026 (2,28% × 1,35% com 95% ou mais);
  - cerca de **127** vêm do fenômeno novo nos locais existentes.
- **Fato:** o excesso de 2026 aparece em quase todas as UFs, não numa só. Maiores: PE +45, BA +42, CE +32, MG +30, SP +28, PB +28, PA +26. Em 2022, nenhuma UF passava de +9. Nordeste: +203 em 2026, +27 em 2022.
- **Fato (98% ou mais):** 56 novas × 5,3 esperadas em 2026, das quais 42 em local novo; em 2022, 14 × 1,3, das quais 11 em local novo.

### O que não explica a diferença (explicações benignas testadas e descartadas como causa da diferença; Fato)

- **Eleitor em trânsito (TTE).** Em 2022 não há TTE por seção nos dados abertos. Para comparar com a mesma régua, estimei o TTE como aptos do BU − eleitores do cadastro da seção.
  - **Validação em 2026:** nas 348.426 seções sem TTE no BU, a estimativa dá zero em todas. Nas 150.363 com TTE, ela acusa TTE em 82.682 (55%). Ou seja, "sem TTE estimado" inclui todas as seções sem TTE e também parte das que têm.
  - **2022**, sem TTE estimado e em locais sem seção agregada desconhecida (434.511 seções usadas): local existente 40 × 41,7 (0,96×), local novo 37 × 5,5 (6,7×).
  - **2026**, mesma régua: local existente 86 × 34,3 (2,5×), local novo 145 × 15,2 (9,6×).
  - A diferença nos locais existentes continua sem o TTE.
- **Revisão biométrica do município.** Medi a queda da parcela sem biometria no município de 2022 para 2026, pelo perfil, porque a revisão cancela quem não comparece. Com o tamanho e a classe do município controlados, há excesso em todas as classes:
  - queda de 20 pontos ou mais: 87 × 4,0;
  - queda de 10–20: 64 × 14,8;
  - queda de 3–10: 91 × 43,7;
  - estável (±3): 191 × 27,8, a maior parte do excesso.

  A revisão não é a causa principal.
- **Renumeração.** Seção antiga renumerada que entra como "nova" aumenta o número de novas, mas aumenta observadas e esperadas juntas. O excesso **absoluto** não muda. As 85.893 novas de 2022 (contra 40.740 em 2026) não "diluem" o excesso de 2022.

---

## 3. A seção nova de 2026 é um grupo diferente do local? (teste de recência pelo perfil, Fato)

Universo: todas as seções de 2026 com perfil (40.444 novas, 458.345 antigas; 296 novas sem perfil ficam fora; entre as novas com 95%+, ficam 408 das 433). Para cada seção, comparei o cadastro dela com o das **outras antigas do mesmo local**. Usei o **índice de dissimilaridade** (metade da soma das diferenças de parcela em 9 faixas de idade). Ele diz que fração dos eleitores teria de mudar de faixa para as duas distribuições ficarem iguais: 0 é igual, 1 é totalmente diferente. Só entram locais em que as outras antigas somam 100 eleitores ou mais.

| 2026, mediana (por tamanho da seção: <100 / 100–199 / 200–299 / 300+) | Novas | Antigas |
|---|---|---|
| Dissimilaridade frente às antigas do local | 0,35 / 0,29 / 0,25 / 0,28 | 0,21 / 0,18 / 0,15 / 0,14 |
| Parcela de 16–20 anos menos a das antigas do local (pontos) | +28 / +13 / +6 / +18 | 0 / 0 / 0 / 0 |
| Parcela sem biometria menos a das antigas do local (pontos) | −5,8 / −2,1 / −1,1 / −5,6 | +0,8 / 0 / −0,1 / −0,1 |
| Dissimilaridade frente ao **mesmo local em 2022** | 0,30 / 0,22 / 0,19 / 0,21 | 0,15 / 0,14 / 0,16 / 0,16 |

- **Fato:** a seção nova de 2026 **não é uma divisão ao acaso** do eleitorado do local. Ela é mais jovem e tem menos eleitor sem biometria do que as antigas do mesmo local e do que o próprio local em 2022. A antiga se parece com o resto do local.
- **Fato:** os locais das novas com 95% ou mais mudaram de 2022 para 2026. A parcela sem biometria do local caiu de 23,4% (locais que já existiam em 2022) para 8,7% (todos os locais delas em 2026). A geração adulta do local (25+ em 2026 ÷ 21+ em 2022, as mesmas pessoas quatro anos depois) tem mediana de **1,04** nesses locais, contra **0,93** nos locais das antigas. Abaixo de 1, o local perdeu adultos (mortes, mudanças, cancelamentos); acima de 1, entrou gente de fora.

**O excesso fica onde a seção nova é um grupo diferente (2º turno de 2026):**

| Categoria da seção nova | Novas | Obs. / esp. | Razão | Excesso |
|---|---:|---:|---:|---:|
| **Parcela sem biometria na seção: 0%** | 16.917 | 385 / 52,0 | 7,4 | +333 |
| sem biometria de 0 a 5% | 10.181 | 15 / 13,4 | 1,1 | +1,6 |
| sem biometria de 5% ou mais | 13.346 | 8 / 14,5 | 0,55 | −6,5 |
| **Dissimilaridade frente ao local < 0,10** (parecida com o local) | 1.872 | 1 / 1,8 | 0,55 | −0,8 |
| dissimilaridade 0,10–0,20 | 6.640 | 17 / 9,0 | 1,9 | +8 |
| dissimilaridade 0,20–0,30 | 8.010 | 63 / 13,9 | 4,5 | +49 |
| dissimilaridade 0,30 ou mais | 11.671 | 112 / 29,5 | 3,8 | +83 |
| sem antigas no local para comparar (local novo ou só de novas) | 12.251 | 215 / 25,7 | 8,4 | +189 |
| **Geração adulta do local < 0,90** (local que perdeu gente) | 4.900 | 11 / 9,5 | 1,15 | +1,5 |
| 0,90–1,00 | 11.168 | 59 / 22,3 | 2,6 | +37 |
| 1,00–1,10 | 5.423 | 49 / 11,8 | 4,2 | +37 |
| 1,10–1,30 | 3.050 | 29 / 5,9 | 4,9 | +23 |
| 1,30 ou mais (local que recebeu muita gente) | 3.514 | 35 / 5,8 | 6,1 | +29 |
| local sem perfil em 2022 | 12.389 | 225 / 24,6 | 9,1 | +200 |

1º turno: mesmo desenho (0% sem biometria: 390 × 38,4; dissimilaridade < 0,10: 1 × 0,8).

- **Fato:** quando a seção nova tem algum eleitor sem biometria ou se parece com o resto do local, ela não passa de 95% mais do que a antiga. **O excesso inteiro está nas seções novas com 100% de biometria**, de composição diferente da do local, em local novo ou em local que ganhou adultos. No local que perdeu gente, não há excesso.
- **Fato (controle):** contra antigas com o mesmo tamanho, a mesma parcela jovem e a mesma faixa sem biometria, a razão continua em 5,4 (295 × 55,1; 6.393 novas caem em estratos sem antiga). Somando o crescimento do local, fica em 4,3 (142 × 33,1; 11.266 sem base). A antiga com o mesmo perfil de idade e biometria **não** vota como a nova. O que distingue a nova não é a idade nem a biometria em si, mas ser um grupo recém-formado. As duas variáveis só marcam onde esse grupo está.

### As quatro UFs pedidas (MG, PR, SC, RS), dentro do universo

2026: 67 novas com 95%+ × 15,4 esperadas (MG 39 × 7,8; RS 14 × 2,3; PR 7 × 3,0; SC 7 × 2,3). 2022: 31 × 16,7. O mesmo desenho do país, com números pequenos.

---

## 4. As novas de 2022 pelo mesmo teste (perfil de 2022, Fato)

85.617 novas e 386.121 antigas de 2022 com perfil (337 seções do detalhe sem perfil; as agregadas de 2022 não têm a seção principal conhecida e ficam fora no nível da seção).

| 2º turno de 2022 | Novas | Obs. / esp. | Razão |
|---|---:|---:|---:|
| Local novo | 4.398 | 55 / 8,0 | 6,9 |
| Local existente, com antigas | 75.679 | 39 / 46,0 | **0,85** |
| Dissimilaridade frente ao local 0,30 ou mais | 19.214 | 23 / 23,8 | **0,97** |
| Sem biometria na seção: 0% | 6.465 | 7 / 1,9 | 3,7 |
| Sem biometria de 5% ou mais | 64.624 | 87 / 51,7 | 1,7 |

| Cadastro (perfil) | 2022 | 2026 |
|---|---:|---:|
| Sem biometria, total | 24,48% | 10,99% |
| Sem biometria, 16–17 anos | **99,98%** | 0,20% |
| Sem biometria, 18–20 anos | **64,71%** | 9,25% |
| Sem biometria, 21–24 anos | 11,67% | 33,64% |
| Seções com todos os eleitores com biometria | 27.714 | 45.771 |

- **Fato:** em 2022, quem tinha acabado de tirar o título quase nunca tinha biometria: 99,98% dos eleitores de 16–17 anos e 64,7% dos de 18–20. Em 2026, essa geração está nos 21–24 anos e ainda é a faixa com mais gente sem biometria (33,6%). **Explicação benigna conhecida:** o alistamento feito a distância durante a pandemia não coletava a digital. Por isso, "seção com 100% de biometria" marca o eleitor recente em 2026, mas não em 2022. Nas novas de 2022, o marcador de recência pelo perfil não existe.
- **Fato:** em 2022, a seção nova num local existente, mesmo diferente do local na idade (dissimilaridade de 0,30 ou mais), não passou de 95% mais do que a antiga. O excesso de 2022 era só dos locais novos.
- **Fato (convergência):** de 2022 para 2026, as novas de 2022 ficaram parecidas com as antigas. A parcela de 16–20 anos foi de 10,1% para 5,7% (antigas em 2026: 4,1%), e a sem biometria foi de 23,4% para 11,4% (antigas: 11,2%). A dissimilaridade mediana frente às antigas do local caiu um pouco (seções de 100–199 aptos: 0,31 → 0,30; de 200–299: 0,18 → 0,17).

---

## O que é explicação benigna conferida, o que é Hipótese, o que fica Pendente

**Explicação benigna conferida (Fato):**
1. **O efeito é passageiro.** A coorte de 2022 perdeu o excesso em quatro anos (de +54 para −20 seções no 2º turno). As novas que passaram de 95% caíram 2,8 pontos a mais que as antigas na mesma situação e cresceram 38% em aptos.
2. **O excesso fica onde a seção nova é um grupo novo.** Isso vale em local novo, em seção com 100% de biometria, de composição diferente do local, e em local que ganhou adultos. Seção nova que é parte do eleitorado que já estava no local, com eleitor sem biometria e idade parecida, vota como a antiga. Em local que perdeu gente, não há excesso.
3. **TTE, revisão biométrica do município e renumeração não explicam a diferença entre 2022 e 2026.** Com a mesma régua de TTE nos dois anos, o excesso nos locais existentes continua (2,5× em 2026 contra 0,96× em 2022). Há excesso em todas as classes de revisão. A renumeração não muda o excesso absoluto.
4. **Diferença de cadastro entre os anos.** Em 2022, o eleitor recém-alistado estava sem biometria (pandemia). O marcador de 2026 não tem equivalente em 2022.

**Hipótese (que não envolve fraude, coerente com tudo acima, não provada):** em 2026, a seção nova junta, em boa parte, eleitores com operação recente no cadastro: alistamento, transferência ou revisão com digital. É gente viva, que mora ali e acabou de ir ao cartório. Por isso o comparecimento dela chega mais perto do teto, como mostram a juventude, os 100% de biometria e o local que ganhou adultos. O excesso de 2026 é maior que o de 2022 por duas razões:
- (a) há 2,4 vezes mais seções novas em local novo, entre elas as de comunidades rurais, indígenas e quilombolas pequenas do doc 08 (item 5c);
- (b) nos locais existentes, a seção nova de 2026 parece ter sido formada com as inscrições e transferências recentes. A de 2022 era sobretudo divisão ou renumeração do eleitorado antigo e não mostrou excesso.

A forma pela qual o cartório distribui as inscrições novas entre as seções não está nos arquivos. Isso é suposição sobre o procedimento.

**Hipótese (que pediria exame):** um mecanismo que aproveitasse a seção nova para votos indevidos também deixaria a cauda alta concentrada nas novas. Ele não precisaria, porém, produzir os outros sinais juntos: a ausência de excesso nas novas que se parecem com o local, a dependência do crescimento do local e a dissolução em quatro anos (vista em 2022). Nada aqui vê quem votou. O canal que fica aberto é o da H07, a liberação sem digital de eleitor com biometria cadastrada (doc 08: 7,17% dos votantes das novas com 95%+, contra 0,27% do cadastro sem biometria).

**Pendente:**
1. **Data da última operação no cadastro**, agregada por seção (alistamento, transferência, revisão; via LAI), para as novas com 95%+ e para as antigas dos mesmos locais. É o único teste direto da recência. O perfil só mostra idade e biometria.
2. **Critério e ato de criação de cada seção nova** e a regra de distribuição das inscrições novas entre as seções do local (LAI ou resolução do TRE).
3. **2024 (eleição municipal)** para a coorte de 2022: mostraria em quanto tempo o excesso some. O `detalhe_votacao_secao_2024` não foi baixado.
4. **2026 daqui a quatro anos:** a previsão desta leitura é que as novas de 2026 percam o excesso até 2030, como as de 2022 perderam até 2026.

**Limites:**
- Regressão ecológica: grupo de seções, não eleitor.
- O "local" depende do número do local ser o mesmo nos dois anos. Local renumerado conta como novo.
- Ponto de corte de 95%: a razão depende do limiar (doc 08, item 5c).
- A estimativa de TTE de 2022 deixa passar parte do TTE. Ela serve para comparar os dois anos com a mesma régua, não como contagem.

---

## Reproduzir

```
node scripts/auditoria/demografo-novas-2022-baixar.mjs --head BA PE          # só consulta tamanho e ETag
node scripts/auditoria/demografo-novas-2022-baixar.mjs AC AL AM AP BA CE DF ES GO MA MS MT PA PB PE PI RJ RN RO RR SE SP TO ZZ
node scripts/auditoria/demografo-novas-2022-perfil.mjs --ano 2022            # cerca de 8 min, todas as UFs no disco
node scripts/auditoria/demografo-novas-2022-perfil.mjs --ano 2026            # cerca de 10 min
node --max-old-space-size=8000 scripts/auditoria/demografo-novas-2022-analise.mjs   # cerca de 7 min
node scripts/auditoria/demografo-novas-2022-biometria-idade.mjs
```

Pré-requisitos já no disco: detalhe 2018/2020/2022/2026 (`demografo-baixar-tse.mjs`), CEFT 2022/2024 (`seguranca-h27-baixar.mjs`).

Saídas em `data/parsed/auditoria/demografo/`:
- `perfil-fino/2022/*.tsv` e `perfil-fino/2026/*.tsv`: uma linha por seção, com local, total, biometria e as 22 faixas de idade com e sem biometria;
- `novas-2022-resumo.json`: partes A (trajetória), B (decomposição), C (recência 2026), D (novas de 2022), E (revisão do município, TTE estimado, estabilidade entre turnos);
- `novas-2022-trajetoria-ge95.tsv`: as seções com 95%+ em 2022, novas e antigas, com 2022 e 2026;
- `novas-2022-biometria-idade.json`: sem biometria por faixa de idade, 2022 e 2026.
