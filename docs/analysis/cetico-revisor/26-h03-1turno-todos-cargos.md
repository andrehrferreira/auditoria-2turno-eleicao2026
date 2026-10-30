# 26. Parecer: H03 no 1º turno completo, todos os cargos (matemático forense)

Revisado: [matematico-forense/06](../matematico-forense/06-h03-1turno-todos-cargos.md) (commit `b6f1142`), o script `scripts/auditoria/matematico-h03-1turno.mjs` e os três scripts de contagem que ele usa (`contagem-detalhe.mjs`, `contagem-munzona.mjs`, `contagem-secao-presidente.mjs`). Revisão de 29/10/2026. Este parecer substitui os números parciais do [parecer 09](09-numeros-omitidos-munzona.md) (22 a 25 UFs).

**Universo (princípio 9): completo.** Cópia de leitura de 2026-10-29T10:50:00.542Z (`eleicao2026-20261029T105000.sqlite`), 28 UFs do 1º turno. Referências: os 109 JSON `*-u.json` da divulgação em `data/raw/1t/referencia`, `detalhe_votacao_secao_2026.zip`, `votacao_candidato_munzona_2026.zip` e `votacao_secao_2026_BR.zip` (gerado em 26/10/2026 12:07:25).

Exclusões, com contagem e motivo:

| Exclusão | Contagem | Motivo | Conferido |
|---|---:|---|---|
| Seções do exterior sem arquivo | 41 | "Não instalada", origem "Totalização", comparecimento 0 no oficial | sim, no banco e no `detalhe` |
| Seção completa sem voto | 1 (ZZ 29564/0001/0091) | contingência com comparecimento 0, nos dois lados | sim, no banco |
| Eleição 6261 (PE) | 10 seções, 2.445 votantes | consulta popular (cargo 25), fora da divulgação de cargos | sim; ver item 7 |

## Veredito final: sustentado com ressalvas

As quatro medidas do autor reproduzem **byte a byte**. A conferência independente (outro código, votos das agremiações tirados do BU e não do JSON) dá os mesmos números. Nenhuma afirmação cai. As ressalvas são de alcance e de texto, não de número:

1. **O teste só prova coerência entre dois produtos do TSE.** O BU do 1º turno ainda não teve a assinatura conferida (extração com `--sem-lacres`, parecer [24](24-integridade-h04-h11.md)). Até essa conferência, "soma dos BUs = oficial" no 1º turno quer dizer que os BUs publicados e a totalização publicada concordam. Não quer dizer que os BUs são os que as urnas assinaram.
2. **"Seção a seção" por candidato só existe para presidente.** O `votacao_secao_2026_BR` traz só o cargo 1 (3.800.511 linhas do 1º turno, todas de presidente). Para os outros cargos, a seção é conferida em 6 totais (aptos, comparecimento, nominais, brancos, nulos, legenda), e o candidato, por zona.
3. **Os 11 campos não são 11 testes independentes.** No JSON, `tv = vv + vb + vn + vnt + van + vansj` (vale nos 109 arquivos). Se `tv` e os outros campos fecham, o `vnt` fecha por conta. A identidade do `vnt` vale como decomposição (números ausentes mais legendas ausentes), não como prova extra.
4. **Dois erros de texto no doc 06** (itens 6a e 6b abaixo). Nenhum muda número.

## Vereditos por afirmação

| # | Afirmação | Veredito |
|---|---|---|
| 1 | Universo: 499.248 seções, 499.207 completas, 41 sem arquivo; igual à divulgação em cada UF | **sustentado** |
| 2 | `detalhe`, 6 campos, 0 divergência em todos os cargos; `votacao_secao` presidente, 0 em 499.206 seções | **sustentado com ressalvas** (alcance: ressalva 2) |
| 3 | `munzona`: 14.672 divergências, todas "BU sem linha", 250 números, 628.629 votos | **sustentado** |
| 4 | 109/109 pares em 11 campos; resolve os 12 pares do parecer 09 | **sustentado com ressalvas** (ressalva 3) |
| 5 | `vnt` = números ausentes + legenda de partido ausente: 630.541; tabela por cargo; SP 29 = 1.173 | **sustentado** |
| 6 | Modelo reproduz o oficial; com o `vnt` válido só muda RJ governador | **sustentado com ressalvas** (texto; 3ª fase nunca usada) |
| 7 | Os três falsos alarmes corrigidos não escondem outro problema | **sustentado** (a consulta popular fica sem auditoria: Pendente) |
| — | Limite declarado (não alcança manipulação no próprio BU) | **sustentado, e mais estreito do que o doc diz** (ressalva 1) |

## 1. Universo

**Reproduzido (Fato).** `h03-1t-resumo.txt` e `h03-1t-universo.csv` saíram idênticos aos do autor:

- 499.248 seções, 499.207 completas e 41 sem arquivo, todas no ZZ;
- em cada uma das 27 UFs, seções no banco = `ts` e completas = `si` do JSON de governador;
- nacional (presidente): `ts` 499.248, `si` 499.207, `sni` 41.

**Lido no código.**
- O ZZ "fecha" sem comparação, porque não tem JSON próprio. A conferência dele é só pelo nacional. O script imprime o `ts`/`si` nacional, mas não os testa. Conferi à mão: são iguais.
- Nenhuma seção em situação diferente de `completa`/`sem_arquivo`. Nenhuma completa sem `secao_eleicao`.

**Seção sem voto (Fato).** A única completa sem nenhuma linha em `voto_bu` é a ZZ 29564/0001/0091 (contingência, comparecimento 0). Isso explica 499.206 seções com voto de presidente.

**Achado lateral, sem efeito no H03 (Fato).** Duas seções de apuração mista de MG (41238/0039/0168 e 50075/0047/0041, `saMistaBUImpressoCedula`) têm `secao.comparecimento = 0`, mas 281 e 278 votantes em `secao_eleicao` e em `voto_bu`. O H03 lê `secao_eleicao`, por isso não é afetado. Script que usar `secao.comparecimento` erra nessas duas.

## 2. `detalhe_votacao_secao` e `votacao_secao`

**Reproduzido (Fato).**
- `votacao_secao`, presidente: 499.206 seções com BU e as mesmas 499.206 no oficial, 0 só de um lado e 0 divergência nos 15 votáveis (13 candidatos, branco e nulo). O CSV de divergências saiu idêntico ao do autor.
- `detalhe`: 2.490.836 linhas do oficial. 0 divergência nos 6 campos em todos os cargos: presidente 499.207 de 499.248 linhas, governador, senador e dep. federal 497.897, dep. estadual 490.928 e distrital 6.969. 41 linhas sem BU, todas não instaladas (origem "Totalização", comparecimento 0). 0 seção completa ausente do oficial. Origem: 2.490.506 urna, 250 RED, 39 Sistema de Apuração, 41 Totalização. Os CSVs de divergência e de "sem BU" saíram idênticos aos do autor.

**Lido no código.**
- O `detalhe` compara aptos com `secao_eleicao.aptos` e comparecimento com o majoritário ou o proporcional, conforme o cargo. Está certo.
- A junção é por chave com zeros à esquerda (`pad`). Uma seção do oficial que não existe no banco cai em "sem BU", não some. Foram 41, as não instaladas.
- O teste de "seção completa ausente do oficial" só olha seções com voto. A ZZ 0091 (sem voto) aparece no `detalhe` com comparecimento 0 dos dois lados.
- Os 250 números omitidos entram como "nominais" no `detalhe` e no `votacao_secao` (o nº 28 de presidente tem 5.246 votos nos dois). Só o `munzona` e a divulgação os tiram. A divergência é de classificação entre produtos do TSE, não de contagem.

**Ressalva de alcance.** O `votacao_secao_2026_BR.zip` tem uma entrada (`votacao_secao_2026_BR.csv`). No 1º turno ela traz 3.800.511 linhas, **todas do cargo 1**. Para governador, senador e deputados, não há no repositório o voto por candidato e por seção. A frase do doc "isso vale seção a seção, zona a zona por candidato" está certa se lida como "seção a seção nos 6 totais". Não vale como "seção a seção por candidato". Para o resultado isso não pesa, porque o resultado soma zonas, e a zona é conferida por candidato.

## 3. `munzona`

**Reproduzido (Fato).** Saída e CSV idênticos aos do autor: 14.672 pares zona × número divergentes, todos "só no BU" (0 "só no oficial", 0 par com valores diferentes dos dois lados). A diferença BU − oficial por cargo é 5.246, 342.427, 221.990, 48.241, 10.238 e 487, que somam 628.629.

**Conferência independente (Fato).** Somei as divergências do `munzona` por número (o presidente, somado no país) e comparei com a lista de omitidos que o script do autor tira do JSON:
- 0 divergência que não seja "BU com voto, oficial sem linha";
- 250 números e 628.629 votos de cada lado;
- 0 número só de um lado, 0 número com votos diferentes.

Os dois produtos do TSE (dados abertos e divulgação) omitem exatamente os mesmos números, com os mesmos votos.

**Caso conferido no arquivo bruto (Fato), escolhido por mim, fora dos casos do autor.**
- **SE 31038/0003/0001, governador nº 22.** O `bu.dat` traz `nominal:22 = 4`. O BU impresso (`imgbu.dat`) lista "RICARDO MARQUES 22 0004", e os nominais fecham: 84 + 4 + 7 + 158 = 253. O banco tem 4. O candidato estava na urna, com nome.
- **RJ 60011/0023/0100, dep. federal nº 7062.** O `bu.dat` traz `nominal:7062 = 3`, o BU impresso traz `7062 0003` e o banco tem 3.

## 4. Fechamento UF × cargo

**Reproduzido (Fato).** `h03-1t-fechamento.csv`, `h03-1t-omitidos.csv`, `h03-1t-efeito.csv` e o resumo saíram idênticos aos do autor: 109/109 pares nos 11 campos, 0 voto sem destino, 0 candidato com BU ≠ `vap`, 0 candidato publicado com voto e sem BU, 0 partido com legenda válida BU ≠ `tvtl`.

**Conferências próprias (Fato).**
- **Identidade interna dos 109 JSON:** `tv = vv + vb + (vn + vnt) + van + vansj` e `vv = vnom + vl`, 109/109. `tvn = vn + vnt`.
- **Campos que o autor não compara:** `vsan` e `vscv` são 0 nos 109 arquivos. Não há voto escondido neles.
- **Tipos de voto do BU no 1º turno:** só `nominal`, `legenda`, `branco` e `nulo`. A legenda aparece só nos cargos 6, 7 e 8 (3.438.437, 7.204.215 e 71.631). Os totais por tipo e cargo batem com o `detalhe` (por exemplo, presidente: 119.306.034 nominais, 2.300.798 brancos e 3.669.003 nulos).

**Os 12 pares do parecer 09.** A classificação pelo `dvt` do partido fecha `vl`, `van` e `vansj` nos 109 pares. Os 12 pares eram: 10 com legenda "Anulado" ou "Anulado sub judice", o PB (legenda de partido ausente, que vai para `vnt`) e o MS dep. estadual (16.884 nominais de candidato "Válido (legenda)"). Resolvidos.

**Ressalva 3 (alcance).** O `vnt` é o resto: se `tv` e os outros seis destinos fecham, ele fecha por conta. O ganho real da identidade é mostrar de onde vem o resto: números ausentes e legendas ausentes, sem sobra.

**O que o teste não decide (Hipótese, princípio 8).** `van` (71.059), `vansj` (1.393.984) e `vnt` (630.541) somam 2.095.584 votos que saem dos válidos por decisão humana sobre registro de candidatura ou partido. O teste mostra que a decisão foi aplicada de forma coerente em todos os arquivos. Não mostra que ela estava certa, nem quando foi tomada.

## 5. Identidade do nulo técnico

**Reproduzido (Fato).** Igual ao doc 06: 109/109 pares, 63 com `vnt` > 0, 630.541 votos, sendo 628.629 nominais (250 números) e 1.912 de legenda (PB 70: 304; SE 25: 309; SE 77: 126; **SP 29: 1.173**). A tabela por cargo confere linha a linha (presidente 5.246; governador 342.427; senador 221.990; dep. federal 50.153, sendo 48.241 nominais e 1.912 de legenda; dep. estadual 10.238; distrital 487).

**Lido no código.** A soma de 628.629 por cargo bate com a diferença BU − oficial do `munzona` (5.246 + 342.427 + 221.990 + 48.241 + 10.238 + 487). O presidente entra uma vez, no par "br". Os 250 números são 250 candidatos distintos.

## 6. Efeito no resultado

**Reproduzido (Fato).** O modelo do autor reproduz o oficial em 109/109 pares. Com o `vnt` válido, só muda o RJ governador.

**Modelo independente (Fato).** Escrevi outro modelo (`cetico-h03-1turno.mjs`, parte D) com os votos de cada agremiação tirados do BU, e não do `tvtn`/`tvtl` do JSON:
- reproduz `vv`, QE, vagas por agremiação e a lista de eleitos em **54/54** pares proporcionais;
- Σ(`tvtn` + `tvtl`) do JSON = `vv` em todos os 54;
- **nenhum par usa a 3ª fase** (sobras sem as cláusulas 80%/20%), nem no oficial nem no cenário. A escolha do autor pela leitura do STF (ADIs 7228/7263/7325) não foi exercida pelos dados. Ela não foi validada, mas também não pesa no resultado;
- no cenário "`vnt` válido", nenhum par proporcional muda de eleitos;
- variante "voto do omitido vale só para a agremiação" (o candidato não pode ser eleito): também não muda nenhum par.

**RJ dep. federal, conferido (Fato).**

| | Oficial | Cenário `vnt` válido |
|---|---:|---:|
| Válidos | 8.743.753 | 8.767.976 |
| QE | 190.082 | 190.608 |
| 80% do QE | 152.065,6 | 152.486,4 |
| 20% do QE | 38.016,4 | 38.121,6 |
| Vagas por fase (1ª / 2ª / 3ª) | 37 / 9 / 0 | 37 / 9 / 0 |
| Partido 70: votos | 159.772 | 183.887 |
| Partido 70: maior candidato | 32.149 | 32.149 (o nº 7062, 23.684, fica em 2º) |

- No oficial, a média do 70 (159.772) é maior que a menor média vencedora nas sobras (158.682). O 70 fica sem vaga só porque nenhum candidato dele chega a 20% do QE. O doc 06 diz isso, e confere.
- No cenário, o 70 ganha 24.115 votos (o nº 7062 e mais 431 de outros números omitidos do mesmo partido; o doc cita só o 7062). Fica com 96,5% do QE e continua sem candidato com 20%.
- Margem mais apertada no cenário: uma agremiação com o próximo candidato a 20,7% do QE (39.382) e outra a 19,7% (37.590). Nenhuma troca de lado. Nenhuma agremiação entre 70% e 80% do QE.

**Majoritários, conferidos (Fato).**
- **RJ governador.** nº 22: 4.271.199 de 8.394.627 válidos (50,880%). Bastariam **147.771** válidos a mais de outros candidatos para tirar a maioria absoluta. O nº 10 tem 274.411, quase o dobro. Contado como válido: 49,270%.
- Senado: 2 eleitos em cada uma das 27 UFs. O maior omitido (SP nº 300, 120.575) fica muito abaixo do último eleito (12.703.089).
- Presidente: nº 22 com 47,028%; 2º turno com ou sem os 5.246 do nº 28.

**Por que "nulo técnico" × "sub judice" não muda a conta do 1º turno.** Nos dois destinos o voto fica fora dos válidos. O RJ só muda se os votos do nº 10 devessem ser **válidos**, isto é, se o registro estivesse em ordem no dia. Essa é a pendência que importa.

**Erros de texto no doc 06 (não mudam número).**
- **6a.** Na lista "Governadores perto do limite, sem `vnt`", o doc põe o DF (49,990%, faltaram 168 votos). O DF **tem** `vnt`: o nº 55, com 8.456 votos. A saída do script lista o DF entre os majoritários com `vnt`. A lista "sem `vnt`" do script tem só AC, ES e PR. Contar o nº 55 como válido só afasta o líder do DF da maioria. Por outro lado, bastaria anular **335 votos válidos** de outros candidatos do DF para o nº 11 vencer no 1º turno.
- **6b.** "Nos outros pares, o maior omitido fica abaixo de 1,0% do quociente". Está certo (CE nº 1300: 2.463 votos, 0,98%), mas o CSV do autor arredonda para "1.0%". Melhor escrever "até 0,98%".

## 7. Os três falsos alarmes corrigidos

1. **Eleição 6261 em PE (Fato).** São 10 seções da zona 0004 do município 30015, com cargo 25 e 23 opções numéricas, mais branco e nulo.
   - A 6261 tem 3.634 aptos, contra 3.647 da 6259 nas mesmas seções. A diferença, 13, é exatamente a soma de `aptos_tte` (eleitores em trânsito temporário) dessas seções: 2 + 6 + 1 + 3 + 1. O comparecimento cai de 2.456 para 2.445, sempre dentro do `tte` de cada seção.
   - Os votos do BU somam 2.339 + 44 + 62 = 2.445 = comparecimento.
   - Somar a 6261 à estadual era erro. Separar não esconde nada no H03.
   - **Mas a consulta popular fica sem nenhuma auditoria contra referência oficial.** Não há JSON da 6261 em `data/raw/1t/referencia`, e o `detalhe` não traz o cargo 25 (Pendente).
2. **`vl` ausente nos majoritários (Fato).** O BU não tem nenhum voto de legenda nos cargos 1, 3 e 5. Tratar o campo ausente como 0 está certo. Se houvesse legenda num majoritário, o par divergiria e apareceria.
3. **`e` × `st` (Fato).** Nos JSON majoritários, `st` assume "Eleito", "2º turno" e "Não eleito", e `e = 's'` marca os dois primeiros. Com `st`, o modelo reproduz o oficial em 55/55 pares majoritários. Nos proporcionais, a contagem de `e = 's'` bate com as vagas e com os eleitos do modelo independente em 54/54. A correção não esconde nada.

## 8. Limite declarado

O doc diz que o teste "não diz nada" contra manipulação gravada no próprio BU. **Sustentado, e o limite é maior no 1º turno.**
- O oficial é derivado do BU, então os dois concordam por construção, se o TSE for honesto na totalização.
- O que liga o BU à urna é a assinatura. No 1º turno ela ainda não foi conferida: a extração foi feita com `--sem-lacres`, segundo o parecer 24 e a H04.
- Hoje, no 1º turno, o H03 prova coerência entre arquivos publicados pelo TSE: BU, `detalhe`, `votacao_secao`, `munzona` e divulgação. Não prova que os BUs publicados são os que as urnas assinaram.
- A conferência das assinaturas do 1º turno fecha esse buraco. Até lá, o H03 do 1º turno não pode ser apresentado como prova contra adulteração entre a urna e a publicação.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Bug de junção ou de zeros à esquerda no `munzona` ou no `detalhe` | Sim: o conjunto do `munzona` foi comparado com o do JSON, que não usa chave de zona | descartada: 250 = 250, votos iguais |
| Voto do BU com tipo fora dos quatro (escondido em "outros") | Sim | descartada: só nominal, legenda, branco e nulo |
| Voto escondido em campo do JSON não comparado (`vsan`, `vscv`) | Sim | descartada: 0 nos 109 |
| Modelo de vagas "acertando" por usar o `tvtn` do próprio JSON | Sim: modelo refeito com votos do BU | descartada: 54/54 |
| 3ª fase das sobras mal implementada | Sim: nenhum par chega à 3ª fase | sem efeito |
| Omitido que não estava na urna (número digitado sem candidato) | Sim, em 2 casos brutos (SE nº 22, RJ nº 7062) e no SP nº 300 do autor | descartada nesses 3: o BU impresso traz o candidato. Nas outras urnas: Pendente |
| BU publicado diferente do assinado pela urna | **Não** (assinatura do 1º turno não conferida) | Pendente |
| Registro do RJ nº 10 em ordem no dia, ou seja, votos que deveriam ser válidos | **Não** (exige rede) | Pendente; decide o 2º turno do RJ |

## Afirmação revisada (pronta para a perícia)

> **Fato (1º turno, 28 UFs, 499.207 seções com BU, todos os cargos).**
> - **Seção a seção:** a soma dos boletins de urna é igual ao resultado oficial em aptos, comparecimento, nominais, brancos, nulos e legenda, em todos os cargos (0 divergência). Para presidente, também candidato a candidato (0 divergência em 499.206 seções com voto).
> - **Zona a zona, candidato a candidato:** o resultado oficial por município e zona é igual ao BU em todos os candidatos que publica. Ele deixa de fora 250 números de candidato, que somam 628.629 votos no BU.
> - **Por UF e cargo (109 totais):** a divulgação fecha com os BUs em todos os campos. Os 628.629 votos desses 250 números, mais 1.912 votos de legenda de 4 partidos ausentes, somam 630.541 e são exatamente o "nulo técnico" publicado.
> - **Onde a classificação pesa:** no governo do RJ, o eleito no 1º turno (nº 22) teve 4.271.199 de 8.394.627 votos válidos (50,880%). Os 274.411 votos do nº 10, classificados como nulo técnico, são mais que os 147.771 votos válidos a mais que tirariam essa maioria. Com eles, o nº 22 teria 49,270%.
>
> **Limite.** Isso mostra que os arquivos publicados pelo TSE concordam entre si. A conferência de assinatura dos boletins do 1º turno ainda não foi feita, e sem ela o teste não alcança alteração feita no próprio boletim.
>
> **Pendente** (sem número):
> - assinatura dos boletins do 1º turno;
> - situação e data da decisão sobre o registro do candidato nº 10 ao governo do RJ e dos demais números excluídos;
> - auditoria da consulta popular de PE (eleição 6261);
> - voto por candidato e por seção nos cargos que não são presidente (o arquivo de dados abertos lido só traz presidente).

**Não deve ir para a perícia:**
- "nenhuma outra vaga ou resultado mudaria". É conta sobre uma suposição: o cenário em que o nulo técnico vira válido, com um modelo de distribuição de vagas. O modelo é completo e reproduz o oficial em 109/109 pares (e o meu, independente, em 54/54 proporcionais), mas a regra do relatório deixa fora conta feita sobre suposição. Fica em `docs/analysis`. Se o coordenador quiser o ponto na perícia, que entre como fato aritmético par a par. Exemplo: "o maior número excluído de deputado, o nº 7062 no RJ, teve 23.684 votos, abaixo dos 38.017 (20% do quociente) que o candidato precisava para disputar sobra";
- a frase "o teste é forte contra desvio na totalização" sem o limite da assinatura;
- a lista de governadores "perto do limite" com o DF (item 6a).

## Reproduzir

```bash
# medidas do autor (saídas idênticas às do commit b6f1142)
node --max-old-space-size=8000  scripts/auditoria/matematico-h03-1turno.mjs
node --max-old-space-size=16000 scripts/auditoria/contagem-secao-presidente.mjs --turno 1
node --max-old-space-size=24000 scripts/auditoria/contagem-munzona.mjs --turno 1
node --max-old-space-size=24000 scripts/auditoria/contagem-detalhe.mjs --turno 1
# conferências deste parecer (A a G; --sem-g pula a leitura do votacao_secao, ~1 min)
node --max-old-space-size=8000  scripts/auditoria/cetico-h03-1turno.mjs
# casos no bruto
node scripts/auditoria/cetico-numeros-omitidos-munzona-bruto.mjs data/raw/1t/urnas/se/31038/0003/0001/<hash>/ Governador 22
node scripts/auditoria/cetico-numeros-omitidos-munzona-bruto.mjs data/raw/1t/urnas/rj/60011/0023/0100/<hash>/ "\s7062\s" 7062
```

Saídas: `data/parsed/auditoria/cetico/h03-1t-cetico.txt` e `h03-1t-cetico-proporcionais.csv`.

Observação: a última execução foi com `--sem-g`, depois de acrescentar a variante "só agremiação". A parte G (cargos do `votacao_secao`) é da execução anterior, que não tinha essa variante. As partes A a F coincidem nas duas execuções.
