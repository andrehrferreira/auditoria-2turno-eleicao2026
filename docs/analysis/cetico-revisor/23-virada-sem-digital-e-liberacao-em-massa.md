# 23. Parecer: virada sem digital e liberação manual em massa (tópico 4 da perícia, itens 8 e 9)

Revisado: [docs/pericia/04-liberacao-dos-eleitores.md](../../pericia/04-liberacao-dos-eleitores.md), itens 8 e 9, com as fontes do autor: [virada-sem-digital/01](../virada-sem-digital/01-resultado.md), [virada-sem-digital/02](../virada-sem-digital/02-liberacao-manual-em-massa.md), `scripts/auditoria/virada-sem-digital.mjs` e `scripts/auditoria/liberacao-manual-em-massa.mjs`. Consolida três revisões independentes (lentes reprodução, definições e alternativas) e uma conferência própria dos pontos em que elas divergiam. Revisão em 29/10/2026.

**Universo (princípio 9): completo.** Cópia de leitura de 2026-10-29T10:50:00.542Z, dois turnos com 28 UFs cada (499.248 seções por turno). Brasil, 2º turno: 497.897 seções com comparecimento > 0; nenhuma tem `por_biometria` nulo, nenhuma falta no 1º turno e todas têm voto 13 ou 22 nos dois turnos. Exclusões, todas do exterior: 41 seções sem arquivo nos dois turnos e 29 boletins do Sistema de Apuração (cédula, `saManual`) sem comparecimento nem forma de liberação. Os controles de idade usam o perfil do eleitorado de 14/07/2026 e excluem 389 seções do Brasil sem perfil (motivo: chave ausente em `cadastro-secao.jsonl`).

## Afirmação original

Item 9: só 1 seção do Brasil votou 100% sem digital no 2º turno (MS 91693/0027/0108, 186 votantes, 18 sem biometria cadastrada e 168 liberados à mão), sem virada. Pela parcela de votantes sem digital no 2º turno (100% / 80–99,9% / 50–79,9% / 20–49,9% / <20%): seções 1 / 74 / 2.922 / 61.027 / 433.873; viradas para o 13: 0 / 7 / 218 / 4.584 / 26.532; para o 22: 0 / 1 / 3 / 101 / 450; ganho do 13 +1,94 / +2,64 / +2,94 / +2,90 / +2,78 p.p.: "sem gradiente". Exterior: 53 viradas para o 13 e 10 para o 22 em 1.281 seções; +1,62 p.p. "Duas contas independentes iguais". Item 8: 97 seções em 69 zonas com liberação manual ≥ 50% no 2º turno (23.050 votantes, 18.452 à mão), todas UE2013/UE2015; 65 também ≥ 50% no 1º turno; parcela do 13 58,79% → 61,20% (+2,41) nelas contra 55,14% → 57,94% (+2,80) nas 12.165 outras seções das mesmas zonas; "o 13 cresceu menos nelas".

## Veredito final: sustentado com ressalvas

As três lentes deram **sustentado com ressalvas**, e a conferência própria confirma. Os fatos centrais se sustentam: uma única seção do Brasil votou 100% sem digital, e ela não virou; a tabela agregada não mostra gradiente do ganho do 13; os números do item 8 batem. Mas o achado tem um erro de código na tabela, rótulos acima do que sustenta, e uma conclusão ("a virada não cresce com a falta de digital") que **não** sobrevive ao teste dentro da zona com controle de idade.

## Afirmação revisada (alcance que os dados sustentam)

- **Fato.** No Brasil, no 2º turno, só 1 seção teve 100% dos votantes sem digital (MS 91693/0027/0108: 186 votantes, 0 pela digital, 18 sem biometria cadastrada, 168 à mão; urna UE2013). Ela não virou: o 13 foi de 33,54% para 35,48%. Conferido no BU e no log brutos.
- **Fato (tabela corrigida, aritmética inteira).** Faixas 100% / 80–99,9% / 50–79,9% / 20–49,9% / <20%: seções 1 / 74 / 2.922 / **61.804** / **433.096**; viradas para o 13: 0 / 7 / 218 / **4.644** / **26.472**; para o 22: 0 / 1 / 3 / **104** / **447**; ganho do 13: +1,94 / +2,64 / +2,94 / +2,90 / +2,78. Na **comparação agregada entre faixas**, o ganho do 13 não cresce com a parcela sem digital.
- **Fato.** A tabela é ecológica: 2.550 das 2.922 seções da faixa 50–79,9% são do ES; a faixa 20–49,9% é 36% MG. As linhas comparam sobretudo estados diferentes.
- **Hipótese (associação, não prova de inserção).** Comparando seções da mesma zona, a relação entre a parcela sem digital e o ganho do 13 depende do controle: negativa sem controles (−0,45 p.p. por 100% sem digital), **positiva** com o perfil etário da seção (+0,45; t 5,0) e com idade e voto do 1º turno (+0,81; t 8,3). O componente "sem biometria cadastrada" (liberação pelo ano de nascimento) é positivo em todas as especificações (+0,93 a +1,72; t de 5,8 a 9,8) e nas 5 regiões com controles. O tamanho é pequeno: de 0,45 a 1,1 ponto entre uma seção sem nenhum e uma com 100% sem digital. Não se separa de causa demográfica ou social não medida.
- **Fato.** Exterior: 1.281 urnas, 53 viradas para o 13 e 10 para o 22, 52,23% → 53,85% (+1,62). Há mais 29 boletins do Sistema de Apuração (27 com voto, 831 votos para Presidente) que não dividem eleitores pela forma de liberação; com eles, 1.308 seções com voto, 54 e 10 viradas, +1,62.
- **Fato.** Item 8: 97 seções, em **68 zonas eleitorais** (69 pares município-zona), 23.050 votantes, 18.452 à mão, nenhuma com 100%; modelo da urna usada no 2º turno: 84 UE2013 e 13 UE2015, sendo 23 delas urna reserva. 65 também ≥ 50% no 1º turno. A diferença agregada de ganho (+2,41 contra +2,80) **some dentro da zona** (−0,04 a −0,07 ponto, EP 0,18 a 0,21): não se distingue do acaso.

## O que foi reproduzido

| Item | Número do autor | Conferido | Fonte |
|---|---|---|---|
| Seção 100% sem digital | MS 91693/0027/0108, 186 / 18 / 168, 33,54 → 35,48 | igual, e no BU e log brutos (1º turno: 2 pela digital em 174) | `cetico-vsd-codigo.mjs`, `cetico-vsd-ms91693-0027-0108-{1t,2t}.json` |
| Faixas 100%, 80–99,9%, 50–79,9% | 1/74/2.922; 0/7/218; 0/1/3; +1,94/+2,64/+2,94 | igual (3 lentes e conferência) | `cetico-vsd-consolidacao.mjs` |
| Faixa 20–49,9% | 61.027 / 4.584 / 101 / 48,85→51,75 | **61.804 / 4.644 / 104 / 48,87→51,77 (+2,90)**; comparecimento 15.146.908; virada 7,51% e 0,17% | idem (2 lentes + conferência) |
| Faixa <20% | 433.873 / 26.532 / 450 / 49,04→51,82 | **433.096 / 26.472 / 447 / 49,03→51,82 (+2,78)**; comparecimento 111.939.839; virada 6,11% e 0,10% | idem |
| Seções com exatamente 20% sem digital | — | **777** (por exemplo AC 01392/0009/0446: 244 pela digital em 305) | SQL abaixo |
| Exterior (urnas) | 1.281 / 53 / 10 / +1,62 | igual | SQL abaixo |
| Exterior com Sistema de Apuração | — | 1.308 seções com voto; 54 / 10; 52,24 → 53,86 | SQL abaixo |
| Item 8 | 97 / 69 zonas / 23.050 / 18.452 / UE2013–2015 / 65 / +2,41 × +2,80 | igual, mas **68 zonas** (69 pares município-zona); 23 urnas reserva | SQL abaixo; `cetico-vsd-dados.mjs` |

A lente de definições disse que "todos os números batem exatamente". Ela reproduziu a mesma regra de faixa em ponto flutuante do autor. A divergência foi resolvida a favor das lentes de reprodução e alternativas pela contagem direta em inteiros (777 seções na fronteira; tabela acima).

Reconciliação com o item 1 do tópico 4 (lente de definições): o comparecimento do Brasil no item 9 fica 660 acima do item 1 (e 115 em "sem biometria", 57 em "à mão") porque o item 9 inclui as 2 seções de MG cujo boletim do 1º turno veio do Sistema de Apuração (41238/0039/0168 e 50075/0047/0041), e o item 1 as exclui. Universos diferentes, sem erro.

## Problemas

1. **Bug de código (Fato).** Em `virada-sem-digital.mjs` (linhas 50 e 71), a faixa usa `p = 1 - pb/c`. Para pb/c = 0,8, o JavaScript dá 0,19999999999999996, e as 777 seções com exatamente 20% sem digital caem em "menos de 20%". As fronteiras de 50% e 80% não erram. Correção: comparar inteiros, `(c - pb) * 5 >= c`.
2. **"Duas contas independentes" não é conferência (Fato).** As duas contas usam a mesma fórmula de faixa e os mesmos boletins (perfil JSON e banco carregado dos mesmos BUs). A igualdade mostra que a leitura está certa, não que a classificação está certa; por isso não pegou o bug.
3. **Tabela ecológica (Fato).** Ver a afirmação revisada. O autor não comparou seções dentro da mesma zona.
4. **"A virada não cresce com a falta de digital" (absolvição falsa parcial).** Vale para a tabela agregada. Dentro da zona:
   - sem controles, o gradiente é negativo (−0,448; EP 0,096; t −4,68), porque a liberação manual se concentra em seções de eleitores mais velhos, onde o 13 cresceu menos;
   - só com o perfil etário, o sinal vira: **+0,45** (EP 0,09; t 5,0); com idade e voto do 1º turno, **+0,81** (t 8,3);
   - o componente sem biometria cadastrada é positivo sempre: +0,93 (t 5,8) sem controles, +0,95 (t 7,2) com idade, +1,14 (t 8,0) com idade e 1º turno, +1,72 (t 9,8) com efeito fixo de município;
   - o componente manual vai de −3,31 (t −23,7) a −0,77 (só idade) e −0,01 (idade e 1º turno): o negativo dele é composição etária.
   A frase também contradiz a própria tabela na coluna de viradas (6,1% → 7,5% → 9,5%); o que não cresce é o ganho agregado.
5. **"Se a liberação sem digital tivesse sido usada para virar votos, o ganho seria maior nas faixas de cima, e não é" (acima do que o teste sustenta).** A tabela só percebe no limite trocas de cerca de 0,25 voto por seção nas seções com 20% ou mais sem digital (13 a 16 mil votos), e nenhum teste percebe trocas proporcionais a 0,25% dos votantes sem digital (cerca de 40 mil votos) nem fraude igual nos dois turnos (seção "Poder").
6. **Exclusões com motivo errado ou faltando (Fato).** As "29 seções sem comparecimento no boletim do 2º turno" são 29 boletins do Sistema de Apuração, todos do exterior; 27 têm voto (831 para Presidente: 445 no 13 e 353 no 22). As 41 seções do exterior sem arquivo nos dois turnos não aparecem como exclusão. Nenhuma seção do Brasil foi excluída.
7. **"1.281 seções do exterior com voto" e "380.612 votos" (rótulo errado).** São 1.281 urnas e 380.612 votantes de urna. Há 1.308 seções com voto para Presidente no 2º turno (381.443 votos). No 1º turno, além dos 340.977 votos de urna, há 789 votos de cédula em 28 boletins do Sistema de Apuração.
8. **Item 8, "69 zonas" (Fato):** são 68 zonas eleitorais; 69 é o número de pares município-zona, que é o agrupamento do script.
9. **Item 8, "o 13 cresceu menos nelas" (rótulo acima do que sustenta).** Comparando cada seção com o resto da própria zona: −0,04 (EP 0,18), −0,055 (EP 0,185) e −0,066 (EP 0,21) nas três lentes. Zero dentro do acaso; o −0,39 da tabela vem de as 97 estarem em zonas diferentes do resto.
10. **Item 8, Hipótese "leitor de digital gasto ou com defeito" (incompleta).** Em 96 das 97 seções a urna liberou ao menos um eleitor pela digital no 2º turno (conferido no banco: `por_biometria > 0`), e a lente de definições mediu no log que a urna leu a digital do mesário em parte das liberações manuais; o leitor não estava parado. Falta a hipótese de digitais do cadastro da urna que não conferem com as dos eleitores. E 23 das 97 usaram urna reserva: o modelo citado é o da reserva. (O percentual de 61,5% de liberações com digital do mesário veio de uma lente só e não foi refeito nesta consolidação.)
11. **Cosmético.** "80% a 99,9%" vai até menos de 100% (inclui 99,95%).

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Composição regional (falácia ecológica) | sim, 3 lentes | Existe. Dentro da zona o gradiente sem controles é negativo (−0,45), com efeito de município-zona −0,38, com efeito de UF −1,0. A mistura não escondia um positivo; o que esconde o positivo é a idade (linha seguinte) |
| Composição etária mascarando o gradiente | sim (lente alternativas e conferência própria) | **Confirmada.** Só com as faixas etárias do cadastro, o gradiente total passa de −0,46 para +0,45 (t 5,0) |
| Teto e regressão à média (seções pró-13 ganham menos) | sim | Com a parcela do 13 no 1º turno sem idade: −0,24 (t −2,3). Com idade: +0,81 (t 8,3). O controle do 1º turno é uma variável dependente defasada e pode enviesar; por isso o resultado só com idade (+0,45) é o mais limpo |
| "Sem digital" junta dois caminhos de sinal oposto | sim, 3 lentes | Confirmada. Sem biometria cadastrada sempre positivo; manual negativo só por composição etária |
| Causa demográfica ou social do positivo (eleitor novo, transferido, renda, urbano) | **só suposta** | Idade explica o manual, não o caminho do ano de nascimento. Renda e urbano/rural não existem por seção nos dados abertos (Limite 5 do tópico 4) |
| Placebo: o 1º turno já votava mais no 13 onde há mais sem biometria | sim (lente alternativas) | Sim: +2,87 (t 3,5) no nível do 1º turno com idade. A característica é estável da seção; isso é compatível com causa social e também com fraude presente nos dois turnos |
| Variação da parcela sem digital entre turnos (o que mudou só no 2º) | sim, 3 lentes | Total −0,08 (t −0,6), nulo. Sem biometria cadastrada +1,67 a +2,17 (t 3,2 a 4,1), da ordem de 2 mil votos |
| Viradas nas faixas de cima por disputas mais apertadas no 1º turno | sim, 2 lentes | Com efeito de zona e a margem do 1º turno: +0,14 (EP 1,77) e −2,8 ± 5,0 pontos. Sem efeito |
| Empates no 1º turno fora da definição de virada | sim | 2.139 empates no 1º turno (1.930 foram para o 13). Incluí-los acrescenta seções em proporção; não muda a conclusão |
| Erro de leitura: Sistema de Apuração, contingência, agregadas, null virando 0, log duplicado | sim, 3 lentes | Nenhum caso no 2º turno do Brasil. O único erro de classificação é o da fronteira de 20% |
| Item 8: diferença das 97 seções é composição | sim, 3 lentes | Confirmada (dentro da zona ≈ 0) |
| Item 8: leitor totalmente parado | sim (lente definições) | Refutada como leitor parado; leitor degradado e cadastro de digitais que não conferem continuam Hipótese |
| Fraude do mesmo tamanho nos dois turnos | não testável por desenho | Some na diferença entre turnos. Ponto cego declarado |

Nenhuma explicação benigna aceita aqui depende de procedimento humano (princípio 8).

## Poder do teste

Simulações das lentes de reprodução e de alternativas, trocando votos do 22 para o 13 numa cópia em memória dos dados reais, só no 2º turno (gerador mulberry32). Margem nacional 13 − 22: 4.401.534 votos.

| Inserção | Tabela por faixa | Faixas dentro da zona | Linear dentro da zona |
|---|---|---|---|
| 1 voto/seção nas 64.791 seções ≥ 20% (≈ 65 mil) | detecta (2,90 → 3,32 contra 2,78) | detecta (t 25) | detecta (t 8,2) |
| 0,5 voto/seção em média nas ≥ 20% (≈ 32 mil) | detecta | detecta | não (t 1,9) |
| 0,2 a 0,25 voto/seção em média nas ≥ 20% (13 a 16 mil) | no limite: t 2,4 pelo bootstrap de zonas, mas a olho 2,90 → 3,00 | detecta (t 4,7 com 13 mil) | não (t −1,3) |
| 2 votos/seção nas 2.997 seções ≥ 50% (≈ 6 mil) | detecta (3,76 contra 2,90) | detecta (t ≈ 5) | não (t −1,4) |
| 5 votos/seção nas ≥ 50% (≈ 15 mil) | detecta | detecta | no limite (t 2,9–3,0) |
| 0,25% dos votantes sem digital (≈ 40 mil) | não | não | não |
| 0,5% dos votantes sem digital (≈ 80 mil) | no limite (t 2,6) | no limite (t 3,1) | não (t 0,7–1,6) |
| 5 votos/seção nos dois turnos (≈ 647 mil) | cega | cega | cega (t −13,5 e −3,8) |

Leitura: o teste é forte contra inserção concentrada nas faixas de cima; é fraco contra inserção proporcional e espalhada; é cego a fraude igual nos dois turnos. O teste linear sem controles parte de uma inclinação negativa real (composição etária) e absorve inserções de dezenas de milhares de votos. A associação positiva observada com controle de idade tem tamanho compatível com uma troca pequena e espalhada **ou** com uma causa social não medida; os dados públicos não separam as duas.

## Pendências

- **Pendente:** explicar a associação positiva do caminho "sem biometria cadastrada" com o ganho do 13 dentro da zona, com o perfil por idade, sexo e escolaridade e com a situação do cadastro (transferência, cadastro novo) por seção. Os dados abertos não têm renda nem urbano/rural por seção.
- **Pendente:** confirmar, de forma independente, o percentual de liberações manuais ligadas à digital de mesário nas 97 seções do item 8 (só uma lente mediu).
- **Pendente:** corrigir `virada-sem-digital.mjs` para aritmética inteira e refazer `01-resultado.md` (comparecimento 15.146.908 e 111.939.839; virada 7,51%/0,17% e 6,11%/0,10%), inclusive a tabela por UF.
- **Recomendação:** nenhuma estimativa em votos de regressão (−58 mil, +66 mil, +79 mil, +122 mil) entra na perícia; ficam aqui e nas saídas das lentes.

## Comandos que reproduzem a revisão

```
node --max-old-space-size=4096 scripts/auditoria/cetico-vsd-consolidacao.mjs   # faixas em inteiros + regressões dentro da zona com e sem idade → data/parsed/auditoria/cetico/vsd-consolidacao.json
node scripts/auditoria/cetico-vsd-codigo.mjs              # lente reprodução (contas próprias, poder, MS 91693)
node scripts/auditoria/cetico-vsd-dados.mjs               # lente definições
node scripts/auditoria/cetico-vsd-componentes.mjs         # lente definições, componentes
node scripts/auditoria/cetico-vsdl-alternativas.mjs       # lente alternativas, poder
node scripts/auditoria/cetico-vsdl-componentes.mjs        # lente alternativas, componentes com idade e 1º turno
node scripts/sql.mjs "select uf='zz' ext, count(*) n, sum(por_biometria is null) pbnull, sum((comparecimento-por_biometria)*5=comparecimento and comparecimento>0) exato20, sum(tipo_urna='contingencia') cont from secao where turno=2 group by 1"
node scripts/sql.mjs "select count(*) n, count(distinct uf||'/'||zona) zonas, count(distinct uf||'/'||municipio||'/'||zona) munzona, sum(comparecimento) comp, sum(por_biografia) man, sum(tipo_urna like 'reserva%') reserva, group_concat(distinct modelo_urna) modelos from secao where turno=2 and uf<>'zz' and por_biografia*2>=comparecimento and comparecimento>0"
node scripts/sql.mjs "select sum(por_biometria>0) com_digital_eleitor, count(*) n from secao where turno=2 and uf<>'zz' and por_biografia*2>=comparecimento and comparecimento>0"
node scripts/sql.mjs "select s.tipo_urna, s.tipo_arquivo, count(*) secoes, sum(v.tot>0) com_voto, sum(v.tot) votos from secao s left join (select uf,municipio,zona,secao,sum(quantidade) tot from voto_bu where turno=2 and cargo=1 and uf='zz' group by 1,2,3,4) v using(uf,municipio,zona,secao) where s.turno=2 and s.uf='zz' group by 1,2"
```

Resultados da conferência própria (`vsd-consolidacao.json`, efeito fixo de UF+zona, 2.640 zonas, peso 13+22 do 2º turno, EP agrupado por zona):

| Especificação | Sem digital total | Sem biometria cadastrada | Manual |
|---|---|---|---|
| Sem controles (497.897 seções) | −0,448 (0,096) | +0,932 (0,162) | −3,311 (0,140) |
| Mesmas seções com perfil (497.508), sem controles | −0,458 (0,096) | — | — |
| Só idade | **+0,450 (0,090)** | +0,949 (0,131) | −0,766 (0,121) |
| Só parcela do 13 no 1º turno | −0,237 (0,102) | — | — |
| Idade + parcela do 13 no 1º turno | **+0,806 (0,097)** | +1,141 (0,142) | −0,010 (0,117) |
