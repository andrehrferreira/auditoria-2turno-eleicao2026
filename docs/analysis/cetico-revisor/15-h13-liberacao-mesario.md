# 15. Parecer consolidado: H13 (voto dos liberados sem biometria)

Revisado: [hipotese-liberacao-mesario/00-sintese.md](../hipotese-liberacao-mesario/00-sintese.md) e os métodos 01 a 05. Este parecer junta os três pareceres de revisão: [18](18-h13-liberacao-reproducao.md) (reprodução), [19](19-h13-liberacao-poder.md) (poder) e o de confusão (`scripts/auditoria/cetico-liberacao-confusao.mjs`, saída `data/parsed/auditoria/liberacao/cetico-confusao.json`). Onde os revisores divergiram, conferi eu mesmo. Data: 29/10/2026.

**Limite estrutural.** O voto é secreto. O log grava **como** cada eleitor foi habilitado, mas não **em quem** votou. O RDV embaralha os votos e não liga voto a eleitor. Por isso o voto dos liberados nunca é observado, nem numa seção. Ele só pode ser **cercado** por limites aritméticos de cada seção ou **estimado** por inferência ecológica (comparação entre seções com mais e menos liberação).

**Princípio 8.** A liberação pelo mesário é uma brecha humana a medir. "O mesário conferiu o documento" não é aceito como controle nem como explicação.

## Afirmação original (síntese)

1. Os liberados do Nordeste votaram cerca de 70% no 13: 69,9% em L1 e 70,7% em L2 pelo modelo com perfil, e 70,5% pelo ponto homogêneo. Mas os biométricos da região deram 69,2%. A maioria vem da região, não da liberação. Pela aritmética pura, a parcela pode estar entre 1% e 100%.
2. A liberação não favoreceu o 13 além do perfil: −0,5 [−1,8; +0,8] (L1) e +0,8 [−0,5; +2,1] (L2) na mesma zona e com o mesmo perfil. A diferença não cresce entre os turnos. O teste tinha poder para ver 2%. Nenhum dos 6 testes confirmatórios rejeita H0.
3. Certeza alta contra excesso dentro da zona e contra excesso que cresce entre turnos; baixa contra fraude espalhada por igual numa zona inteira, alinhada ao perfil ou igual nos dois turnos.

Definições: **L1** = habilitado pela digital de um mesário identificado (log, `habilitadosPeloMesario`). **L2** = todo habilitado sem a própria digital (BU, `sem_biometria + por_biografia`).

## Veredito final: sustentado com ressalvas

**Motivo.** Os números centrais se reproduzem com três códigos independentes e no arquivo bruto. A conclusão "não há excesso pró-13 dos liberados do Nordeste além do perfil" resiste a controles que os autores não usaram, inclusive o efeito fixo de local de votação. Mas o **alcance** declarado é maior do que os dados sustentam:

- o teste ecológico (M2) é cego, no sentido da H13, a fraudes abaixo de cerca de 70 mil votos no Nordeste;
- a conversão de "f" em votos subestima o volume em cerca de 4 vezes;
- o poder do painel foi calculado com o α errado;
- a cobertura do 1º turno citada está desatualizada;
- há três UFs com sinal positivo (CE, PB e PE) e um resíduo no eleitor sem biometria cadastrada que a soma do Nordeste esconde.

## Vereditos por afirmação

| # | Afirmação da síntese | Revisores (18 / confusão / 19) | Veredito final | Motivo |
|---|---|---|---|---|
| 1 | NE, M2: 69,9% (L1) e 70,7% (L2) contra 69,2%; dif. −0,5 [−1,8; +0,8] e +0,8 [−0,5; +2,1] | ressalvas / ressalvas / ressalvas | **Sustentado com ressalvas** | Reproduz exatamente. A frase mistura a diferença total com a condicional. O poder não é declarado e é baixo no sentido pró-13. |
| 2 | M1 sem perfil: +6,1 contra todos e +9,3 contra biométricos | ressalvas / ressalvas / sustentado | **Sustentado com ressalvas** | Conferi: os números estão certos, mas "78,7 × 68,4" ao lado de "+9,3" não fecha (dá 10,3). "Quase igual nos dois turnos" só vale para L1. |
| 3 | Painel: f ≤ 1,4% (L1) e 1,7% (L2); poder de 80% para 1,6% e 2,1% | ressalvas / ressalvas / ressalvas | **Sustentado com ressalvas** | Os limites reproduzem. O poder correto, com o α = 0,025 declarado, é 1,74% e 2,32%. A conversão em votos está errada. |
| 4 | Faixa 1,0–100,0% (L1) e 3,4–99,9% (L2); 1.811 seções forçadas contra 1.635 (1,11); 1º turno 1,20 | ressalvas / ressalvas / ressalvas | **Sustentado com ressalvas** | Reproduz, mas o limite inferior de L2 é 3,48% (arredonda para 3,5%). O excesso de seções forçadas é significativo contra o nulo de zona. A estatística não tem poder para fraude, então não serve de evidência em nenhum sentido. |
| 5 | Cópia do banco com o 1º turno em 22 UFs (`secao`) e 20 (`perfil_log`) | refutado / desatualizado / não reproduzido | **Refutado para a cópia vigente** | Conferi: a cópia `eleicao2026-20261029T105000.sqlite` tem 28 UFs nos dois turnos, nas duas tabelas. Era verdade só na cópia `…T092711`, a usada pelo método 03. |
| 6 | BU bruto de BA 34290/0127/0335 e PR 79111/0086/0218 | sustentado / sustentado / sustentado | **Sustentado** | Conferi de novo no bruto (abaixo). |

### Divergências entre revisores e o que conferi

**Afirmação 2.** O revisor de poder deu "sustentado"; os outros dois, "com ressalvas". Conferi `ecologico-tabela.csv` (Nordeste, 2º turno, L1, M1):

- nível dos liberados 0,7866; nível dos biométricos da região 0,6841; contrafactual dos biométricos nas seções dos liberados 0,6940;
- difTotal +10,26; difCond +9,26; difComp +1,00 [+0,58; +1,43].

A Tabela B da síntese imprime o nível regional dos biométricos (68,4) ao lado da diferença contra o contrafactual (+9,3). O mesmo acontece no M2: em L1, 69,9 − 69,2 = +0,77 (difTotal), mas a difCond é −0,49, porque o contrafactual da própria seção é 70,4. O efeito de composição é **significativo**: +1,26 [+0,82; +1,70] em L1 e +0,72 [+0,09; +1,19] em L2. Ele quer dizer que os liberados estão em seções onde **os próprios biométricos** votam mais no 13. É geografia, e a síntese não o mostra. Fico com **sustentado com ressalvas**: os números estão certos, mas a apresentação induz a erro.

**Afirmação 5.** Um revisor disse "refutado", outro "desatualizado" e o terceiro "não reproduzido". Conferi com `node scripts/sql.mjs`:

- `secao`: 499.248 seções e 28 UFs em cada turno;
- `perfil_log`: 499.207 seções e 28 UFs em cada turno;
- ponteiro: "1º turno 28 UFs, 2º turno 28 UFs".

A afirmação descreve com fidelidade a cópia antiga, mas está escrita no presente, como estado do banco, e isso hoje é falso. Por isso o veredito é **refutado** para a cópia vigente. A consequência prática é que o método 03 rodou sem RS, SC, SE, SP e TO no 1º turno, e a variação entre turnos do Nordeste ficou **sem SE**. O revisor de confusão refez o M2 na cópia completa: no 1º turno, L1 +0,39 [−1,22; +1,98] e L2 +1,15 [−0,52; +2,66]; variação −0,88 e −0,37. Isso fica perto dos números dos autores (+0,5 e +1,3; −0,9 e −0,5), mas ainda não é a rodada oficial do método.

**Afirmação 6 (bruto).** Conferi de novo, com `node src/exportar.js --turno 2 ... --log nao --stdout`:

| Seção | Comparecimento | Sem biometria | Por biometria | Por biografia | 13 | 22 | Brancos | Nulos | Mínimo obrigado |
|---|---|---|---|---|---|---|---|---|---|
| BA 34290/0127/0335 | 314 | 26 | 7 | 281 | 256 | 51 | 0 | 7 (3 + 1 + 1 + 2) | 221 no 13 (L1 = 279 pelo log) |
| PR 79111/0086/0218 | 175 | 3 | 19 | 153 | 51 | 117 | 2 | 5 | 88 no 22 (L1 = 146 pelo log) |

Fato de conteúdo. Na BA, a assinatura não é verificada pelo exportar (`DER: comprimento ausente`, defeito de leitura conhecido, parecer 08). Por isso esses números ainda não são Fato de integridade. No PR, as 22 conferências de assinatura passam.

**Teto de impacto (ressalva menor do parecer 19).** O revisor de poder suspeitava que o piso de 166.144 (L2) deixasse de fora seções sem detalhamento no Nordeste. Conferi: no 2º turno, **0** seções do Nordeste têm o detalhamento de habilitação nulo. As 1.281 seções com comparecimento e sem detalhamento são todas do exterior (380.612 votantes). **Fato: a ressalva não se confirma para o Nordeste**, e o piso continua de pé.

## Resposta revisada (o alcance que os dados sustentam)

- **Fato (aritmética).** Os liberados do Nordeste podem ter dado ao 13 de 1,0% a 100,0% dos seus votos (L1) ou de 3,5% a 99,9% (L2). Essas faixas estão em % de todos os liberados, inclusive brancos e nulos. A aritmética sozinha não responde à H13.
- **Hipótese de modelo (ecológico).** Os liberados do Nordeste votaram cerca de 70% no 13 (13 contra 22), o mesmo que os biométricos da região (69,2%). A parte "majoritariamente no 13" da H13 é **provável**, mas vem do lugar e do perfil, não da liberação.
- **Hipótese de modelo (excesso).** Na mesma zona, ou no mesmo local de votação, e com o perfil controlado, os liberados não votam no 13 acima dos biométricos. Em todas as especificações completas, a diferença fica entre −0,8 e +1,5 ponto, e nenhum intervalo exclui zero. O sinal é estável com ou sem modelo de urna, com controles novos (gênero, estado civil, 70+ e 80+, analfabeto, deficiência, raça) e com efeito fixo de local.
- **Alcance (o que isso exclui).** Isso exclui uma fraude de voto inserido com liberação do mesário que seja:
  - **concentrada**, com 10 ou mais votos por seção afetada;
  - **só no 2º turno**;
  - a partir de cerca de **20 a 30 mil votos** no Nordeste, pelo painel entre turnos;
  - ou a partir de cerca de **70 mil votos** no corte do 2º turno, pelo M2.
- **Fora do alcance (o que não se pode afirmar).** Estes dados **não** excluem:
  - fraude difusa, de 1 a 3 votos por seção: com 1 voto por seção, nada é visto até 112 mil votos;
  - fraude igual em toda a UF: o painel não vê nem 1,4 milhão de votos espalhados por igual;
  - fraude igual nos dois turnos;
  - fraude alinhada ao perfil;
  - fraude concentrada numa escola inteira, que o efeito fixo de local absorveria.
- **Fato (assimetria).** No Nordeste, os testes são cerca de 2,3 vezes menos sensíveis a fraude pró-13 do que a fraude pró-22 do mesmo tamanho, porque o voto local já é cerca de 70% no 13. A mesma fraude de 28 mil votos dá z −4,17 no M2 se favorece o 22 e z 0,71 se favorece o 13. "Não foi encontrado" **não é absolvição** abaixo desses volumes.

## Nordeste

**Fato (contagens, perfis jsonl, universo completo).** 2º turno, com o 1º entre parênteses:

- L1 = 1.795.037 (4,94% do comparecimento; 4,35%);
- L2 = 4.269.379 (11,75%; 11,45%);
- o Nordeste não é a região que mais libera: o Sul tem L1 de 5,43%, e o país sem o exterior tem L2 de 12,42%;
- ponto homogêneo: 70,5% (L1) e 70,0% (L2), contra 69,4% da região.

**Hipótese de modelo (M2, zona e perfil).**

| Grupo | Parcela do 13 | Contrafactual (biométricos nas mesmas seções) | difCond | difComp (lugar) |
|---|---|---|---|---|
| Liberados L1 | 69,9% | 70,4% | −0,49 [−1,75; +0,75] | +1,26 |
| Liberados L2 | 70,7% | 69,9% | +0,78 [−0,47; +2,06] | +0,72 |
| Biométricos da região | 69,2% | | | |

**Robustez (revisor de confusão, conferido em `cetico-confusao.json`).**

| Especificação (2º turno) | L1 | L2 | Outros sem digital (L2 − L1) |
|---|---|---|---|
| Zona, sem perfil (M1) | +9,26 | +7,26 | +6,74 |
| Zona + perfil (M2) | −0,49 | +0,78 | **+2,41 [+0,64; +4,02]** |
| Zona + perfil + controles novos + urna | +0,07 | +1,15 | **+2,55 [+0,85; +4,25]** |
| Local + perfil | −0,81 | −0,65 | −0,44 [−1,38; +0,52] |
| Local + perfil + controles novos + urna | −0,48 | −0,39 | −0,26 [−1,15; +0,77] |

**Por UF (Hipótese).** Em L2, no M2, CE (+4,6), PB (+4,7) e PE (+3,0) têm intervalo acima de zero. Nenhuma passa por Bonferroni. As três já eram positivas no 1º turno (CE +6,0, PB +3,3, PE +3,1). Três ou mais de 9 UFs assim, sob o nulo e supondo independência entre UFs, teriam probabilidade de cerca de 0,001; essa conta é Hipótese, porque as UFs não são independentes. No painel, PE em L1 dá f = 4,7% [1,5; 7,9], estável com efeito fixo de município e de UF, e não passa na correção. Pelo princípio 8, "já existia no 1º turno" não absolve: só mostra que não é efeito próprio do 2º turno.

**Resíduo do eleitor sem biometria cadastrada (L2a, Hipótese).**

- No painel (modelo D), a fração implícita é f = 19,3% [8,3; 30,2], p 0,0007 (número do revisor de confusão, tirado do `entreturnos-resumo.json`; não refiz).
- Em zona, é o único efeito condicional positivo do Nordeste (+2,41), e já existia no 1º turno (+1,91).
- **Com efeito fixo de local de votação, desaparece** (−0,44 e −0,26). Duas leituras possíveis:
  - geografia dentro da zona (a escola);
  - fraude concentrada por escola, que o efeito de local também absorveria.

  Os dados não separam as duas.
- A síntese reporta o resíduo como "cerca de 6.000 votos". Essa conversão tem o mesmo defeito da conversão de f (ver adiante) e deve sair.

**Teto (Fato, método 02, conferido aqui).** Anulando os liberados do Nordeste no pior caso para o 13, o 13 ainda venceria no país por pelo menos 2.636.721 votos (L1) ou 166.144 (L2). No Nordeste, todas as seções têm o detalhamento de habilitação.

## Problemas encontrados

1. **Diferença total e condicional misturadas (afirmações 1 e 2).** "69,9 contra 69,2, dif. −0,5" e "78,7 contra 68,4, dif. +9,3" põem lado a lado níveis regionais e diferença contra o contrafactual. O efeito de composição (+1,0 a +1,3 ponto em L1, significativo) fica sem aparecer.
2. **Sensibilidade aos controles.** Com efeito fixo de zona e um controle só, a diferença de L1 vai de −2,85 (só escolaridade baixa) a +16,81 (só % sem biometria cadastrada), e a de L2 chega a +20,89. Com 10 ou mais controles, as especificações convergem. A identificação ecológica é frágil, e a síntese não diz isso.
3. **"Quase igual nos dois turnos" só vale para L1.** Sem perfil, a vantagem de L2 cresce do 1º para o 2º turno: +0,94 [+0,55; +1,44] na zona e +1,53 [+1,22; +1,94] no local. Com perfil, some (−0,37 na zona e +0,26 no local). O controle de escolaridade a absorve. Isso foi testado, não só suposto, mas a síntese deve mencionar o L2.
4. **Conversão de f em votos errada.** O f é uma inclinação de regressão, não a fração dos votos. Na simulação (`cetico-poder.json`), 28.170 votos inseridos em 2% das seções do Nordeste dão f médio de 2,58% em L1. A conta da síntese (f × ΔL1 = 2,58% × 249.957) daria cerca de 6.450 votos, 4,4 vezes menos. Devem sair: "≈ 4.000/4.300 votos" (doc 04), "PE ≈ 1.920 votos inseridos / 940 de margem" e "L2a ≈ 6.000 votos".
5. **Poder do painel com o α errado.** O teste declarou α = 0,025 (Bonferroni sobre 2), mas o poder foi calculado com 2,8 erros-padrão (α 0,05). Corrigido (3,08 erros-padrão): 1,74% (L1) e 2,32% (L2).
6. **Assimetria de poder não declarada.** Os testes M2 e painel medem excesso sobre o voto local, que já é cerca de 70% no 13. Fraude pró-13 se camufla cerca de 2,3 vezes melhor (deslocamento de +0,95 contra −2,22 pontos no M2). Além disso, a linha de base do M2 em L1 é negativa (−0,49), o que puxa o z da fraude pró-13 para baixo.
7. **Porta da "zona inteira" fechada pela metade.** A síntese diz que fraude espalhada por uma zona inteira não pode ser vista. O próprio método 04 rodou com efeito fixo de UF (γ L1 +0,0018, |t| ≤ 0,5), e essa versão detecta, na simulação, fraude em 10% das zonas (t 8,07). A porta que continua aberta é a da fraude igual em toda a UF, igual nos dois turnos ou dentro de um local (no M2).
8. **Seções forçadas: estatística sem poder, e excesso significativo omitido.** Contra o embaralhamento na zona, 0 de 200 sorteios alcançam 1.811 nos dois turnos. A síntese não diz isso e compara 1,11 com 1,20 do 1º turno, que tem estrutura diferente (no 1º turno, os outros candidatos entram em O). Com embaralhamento dentro da zona e do quintil de perfil (parecer 18), cai para 1,02 (p 0,11) em L1 e 1,005 (p 0,17) em L2 no 2º turno. Sobra 1,08 (p 0,01) em L1 no 1º turno. Na simulação, a fraude sobe observado e esperado juntos (razão 1,115 → 1,106). A estatística não informa nada sobre fraude, em nenhum sentido.
9. **Tabela A mistura bases.** "Faixa 13" está em % de todos os liberados (com brancos e nulos), e "Homog." está em 13/(13+22). O limite inferior de L2 no Nordeste é 3,48%, que arredonda para 3,5%, não 3,4%.
10. **Cobertura do banco desatualizada (afirmação 5 e pendência 1 da síntese).** O método 03 deve ser refeito na cópia completa.
11. **Reclassificação dilui o f de L1.** Parte do ΔL1 do Nordeste (+16%) é rótulo novo: a liberação manual sem mesário caiu 11%, e a manual total subiu só 6,1%. Pelo PG do modelo D, que não sofre com a reclassificação, γ = −0,0038 (erro-padrão 0,0046), e o limite superior de f fica perto de 0,9%. Número do revisor de confusão, não refeito por mim. A conclusão se mantém, mas o limite de L1 deve ser lido como "por liberação a mais registrada", não "por eleitor novo liberado".
12. **O efeito fixo de zona descarta a variação técnica.** Conferi: no 2º turno, só 2 das 1.903 zonas do Nordeste misturam urnas antigas (UE2013/UE2015) e novas, num total de 808 seções. Dentro da zona, a variação de L1 vem do mesário e da idade, isto é, do canal humano do princípio 8, e não do equipamento. O controle negativo entre zonas (urna antiga como instrumento) dá IV +1,15 [−0,34; +2,69] no 2º turno e +1,39 no 1º, com variação −0,24 [−0,41; −0,05]: não há sinal próprio do 2º turno, mas o poder é baixo e há confusão geográfica.
13. **Coeficientes fora de [0, 1] só diagnosticados.** O M0 dá 108,8%. Nos modelos com zona ou local, a parcela implícita fica fora dos limites determinísticos da própria seção em menos de 0,1% das seções (41 em L1 e 134 em L2 com o M2). Não é material.
14. **Explicações benignas: testadas ou supostas.**
    - Perfil: **testada** (M2, controles novos, local).
    - Reclassificação: **testada** (contagens e PG).
    - Urna antiga: **testada**, com pouco poder.
    - Composição do L2a: **suposta**. O efeito fixo de local a absorve, mas também absorveria fraude por escola.
    - "Já era assim no 1º turno": **não absolve** (princípio 8).

## Poder do teste

Fonte: simulação do revisor de poder (`scripts/auditoria/cetico-liberacao-poder.mjs`, 20 sorteios, semente 7). Universo: todas as 140.828 seções do Nordeste no 2º turno. Fraude simulada: voto inserido junto com liberação do mesário, com o BU e o log coerentes. É **Hipótese de cenário**: depende dos cenários escolhidos e não vai para `docs/pericia/`.

| Método | Detecta fraude pró-13 no Nordeste a partir de | Cego para |
|---|---|---|
| 04 painel, efeito fixo de zona | cerca de 21 mil votos (k = 30), 28 mil (k = 10), 170 mil (k = 3); k = 1: nada até 112 mil | fraude igual nos dois turnos (t 0,45); fraude igual em todas as seções (até 1,4 milhão); zona inteira |
| 04 painel, efeito fixo de UF | 28 mil votos (k = 10, t 3,01); zona inteira (t 8,07) | fraude igual em toda a UF; fraude igual nos dois turnos |
| 03 M2, corte do 2º turno | cerca de 70 mil votos (5% das seções com +10, z 2,61, no limiar) | 28 mil (z 0,71); +3 em todas as seções (422 mil); fraude alinhada à escolaridade baixa (140 mil, z 2,48) |
| 02 seções forçadas | nenhum cenário | todos (a razão até cai com a fraude) |
| Pró-22, mesmo tamanho | M2 z −4,17 e painel t −9,03 com 28 mil votos | não se aplica |

Painel com o α declarado: fração detectável com 80% de poder de **1,74% (L1) e 2,32% (L2)** das liberações a mais, e não 1,6% e 2,1%.

**Para comparação.** A margem nacional é de 4.430.191 votos. A fraude que estes métodos conseguem ver (20 a 70 mil votos no Nordeste) é 0,5% a 1,6% da margem. Fraudes estáveis ou difusas do tamanho da margem ficam fora do alcance.

## Pendências

1. **Refazer o método 03** na cópia vigente (`…T105000`, 28 UFs nos dois turnos) e substituir os números do 1º turno e da variação entre turnos. Isso fecha a pendência 1 da síntese.
2. **Corrigir na síntese:**
   - as conversões de f em votos (4.000/4.300, PE 1.920/940, L2a 6.000), trocando-as pela tabela de votos mínimos por k;
   - o poder para α = 0,025 (1,74% e 2,32%);
   - o limite inferior de L2 para 3,5%;
   - a Tabela B, mostrando difTotal, difCond e difComp separados.
3. **Declarar o alcance de poder** e a assimetria pró-13 no texto principal, trocando "certeza alta contra excesso dentro da zona" pela faixa medida (20 a 30 mil votos no painel, cerca de 70 mil no M2, só no 2º turno e só para fraude concentrada).
4. **Usar o painel com efeito fixo de UF** como evidência contra fraude de zona inteira que cresce entre turnos.
5. **H13b confirmatória, declarada antes de rodar:** o L2a vota acima do biométrico da mesma seção, no Nordeste, com efeito fixo de zona **e** de local como especificações alternativas.
6. **Auditoria nominal** com CE, PB e PE (L2 positivo nos dois turnos), PE em L1 no painel e os dois lados extremos (Candeias e Tapejara), para evitar viés de seleção.
7. **Seções forçadas:** retirar a estatística como evidência ou permutar dentro de zona e perfil (ou de local). Explicar o resíduo de 1,08 (p 0,01) de L1 no 1º turno.
8. **Covariáveis que faltam:** renda e urbano/rural por seção.
9. **Linha de base externa** (2022, mesmas seções) para fechar a porta da fraude igual nos dois turnos.
10. **Fraude difusa:** só uma verificação nominal por amostragem com probabilidade conhecida, ou um rastro por eleitor no log, a enxerga.
11. **Integridade da BA 34290/0127/0335:** concluir a verificação de assinatura das UE2013 (`DER: comprimento ausente`) antes de citar a seção como Fato de integridade.
12. **Números citados do revisor de confusão sem refazer** (f do L2a no modelo D e γ do PG): conferir no `entreturnos-resumo.json` antes de levá-los a qualquer documento de conclusão.

## Comandos

```
# cobertura da cópia de leitura
node scripts/sql.mjs "select turno, count(distinct uf) ufs, count(*) n from secao group by turno"
node scripts/sql.mjs "select turno, count(distinct uf) ufs, count(*) n from perfil_log group by turno"

# seções sem detalhamento de habilitação (2º turno), por região
node scripts/sql.mjs "select case when uf in ('al','ba','ce','ma','pb','pe','pi','rn','se') then 'NE' when uf='zz' then 'ZZ' else 'outras' end reg, count(*) secoes, sum(comparecimento) comp from secao where turno=2 and comparecimento>0 and (sem_biometria is null or por_biometria is null or por_biografia is null) group by reg"

# zonas do Nordeste que misturam urna antiga e nova
node scripts/sql.mjs "select count(*) zonas, sum(mix) mistas, sum(nmix) secoes_em_mistas from (select uf, municipio, zona, case when sum(modelo_urna in ('ue2013','ue2015'))>0 and sum(modelo_urna in ('ue2020','ue2022'))>0 then 1 else 0 end mix, case when sum(modelo_urna in ('ue2013','ue2015'))>0 and sum(modelo_urna in ('ue2020','ue2022'))>0 then count(*) else 0 end nmix from secao where turno=2 and uf in ('al','ba','ce','ma','pb','pe','pi','rn','se') group by uf, municipio, zona)"

# bruto das seções extremas
node src/exportar.js --turno 2 --uf ba --municipio 34290 --zona 0127 --secao 0335 --log nao --stdout
node src/exportar.js --turno 2 --uf pr --municipio 79111 --zona 0086 --secao 0218 --log nao --stdout

# composição total/condicional (Nordeste)
grep -E "^Nordeste;2t;L[12];M[12];(bio|M|L);(tp|tp0|difTotal|difCond|difComp)" data/parsed/auditoria/liberacao/ecologico-tabela.csv

# revisões que este parecer consolida
node scripts/auditoria/cetico-liberacao-reproducao.mjs
node scripts/auditoria/cetico-liberacao-estratos.mjs
node scripts/auditoria/cetico-liberacao-confusao.mjs
node --max-old-space-size=8192 scripts/auditoria/cetico-liberacao-poder.mjs --reps 20 --semente 7
```

Saídas: `data/parsed/auditoria/cetico-revisor/liberacao-reproducao.json`, `liberacao-estratos.json`, `data/parsed/auditoria/liberacao/cetico-confusao.json` e `cetico-poder.json`.

**Anomalia estatística não é prova de fraude, e ausência de anomalia não é prova de ausência.** Estes dados afastam com boa confiança uma fraude concentrada, só no 2º turno, de dezenas de milhares de votos pró-13 por liberação no Nordeste. Eles não afastam fraude difusa nem fraude estável.
