# 03. Plausibilidade política dos achados dos outros auditores

Cientista político, 29/10/2026. Pergunta: o padrão tem explicação política, e ela foi testada? Princípio 8: "o mesário fez o procedimento" não conta como explicação.

Reproduzir: `node scripts/auditoria/politico-plausibilidade-casos.mjs` (banco + `data/parsed/comparacao-turnos/suspeitas.jsonl`). Saída: `data/parsed/auditoria/cientista-politico/plausibilidade-casos.json`. Compara cada seção com a mediana da sua zona.

## Casos de "já votou" (docs/casos)

As 9 seções com "já votou" ≈ 1 por voto, mais ES 0364 (mais "já votou" do que votos) e ES 0372:

| Seção | Fatia do 13 no 2º turno (zona) | Variação 1º → 2º turno (zona) | Comparecimento no 2º turno (zona) |
|---|---|---|---|
| AC 01007/0009/0440 | 27,3% (31,9%) | +2,1 (+2,4) | 61,3% (70,3%) |
| AM 02577/0016/0105 | 75,6% (68,2%) | +3,3 (+1,4) | 75,1% (78,6%) |
| AM 02836/0019/0071 | 76,3% (73,5%) | +2,2 (+0,4) | 74,3% (74,3%) |
| DF 97012/0006/0425 | 52,5% (46,6%) | +4,7 (+4,1) | 79,9% (82,7%) |
| ES 57037/0055/0364 | 40,5% (42,0%) | +2,6 (+2,9) | 81,4% (82,7%) |
| GO 93939/0029/0095 | 52,0% (55,6%) | +0,6 (+2,8) | 79,1% (79,1%) |
| MA 08974/0070/0224 | 78,2% (71,4%) | +2,5 (+2,1) | 82,3% (77,9%) |
| MA 09091/0051/0161 | 80,4% (77,2%) | **+7,0** (+2,1) | 73,7% (78,7%) |
| RS 85871/0014/0034 | 27,0% (38,6%) | 1º turno RS fora do banco | 73,3% (81,0%) |
| ZZ 29955/0001/3858 | 50,2% (57,4%) | 1º turno ZZ fora do banco | 42,6% (42,9%) |
| ES 57037/0055/0372 | 37,4% (42,0%) | +3,6 (+2,9) | 72,5% (82,7%) |

- **Fato.** O padrão não favorece um lado:
  - 5 seções têm a fatia do 13 acima da mediana da zona e 6 abaixo;
  - nas 9 seções com 1º turno, a variação entre turnos fica a até 2,2 p.p. da zona em 8;
  - o comparecimento fica igual ou abaixo da zona em 10 de 11. A exceção é MA 08974/0224, com +4,4 p.p.
- **Leitura.** Votar no lugar de um eleitor ausente (H05/B1, busca de título livre) aumenta o comparecimento. Em escala, o comparecimento ficaria **acima** do das vizinhas. Isso não aparece, então a hipótese de inserção de votos fica **sem apoio nos números da seção**. Ainda assim, poucas substituições (menos de 5 a 10 votos) não apareceriam nessa comparação. A hipótese de consulta indevida da lista de votantes (ES 0364, H-a) **não tem leitura política**: ela não mexe no resultado e continua com a frente de biometria e logs.
- **Exceção para olhar (Hipótese):** MA 09091/0051/0161 teve +7,0 p.p. para o 13, contra +2,1 na zona, com comparecimento abaixo da zona. É pequeno: cerca de 10 votos em 157. **Recomendação:** cruzar com a parcela de habilitações sem biometria dessa seção nos dois turnos.

## Alertas da comparação entre turnos (sessão −64, 26 UFs sem RJ e SP)

| Alerta | Seções | Municípios | Maior concentração |
|---|---|---|---|
| `residuo13` alto (ganho do 13 além do disponível líquido) | 762 | 473 | 17 (BA 38490) |
| `residuo22` alto | 4 | 4 | 1 |
| `ganho13` negativo | 144 | 96 | **22 em Macapá** |
| `ganho13` positivo | 138 | 120 | 7 (Brasília) |
| `ganho22` positivo / negativo | 80 / 110 | 78 / 93 | 2 / 4 |

- **A assimetria 762 × 4 é esperada pelo resultado, não por seção suspeita (Hipótese testada).** O `residuo` é truncado em zero. Ele só fica positivo onde o outro finalista perdeu votos líquidos. Com o 13 levando 73,6% do disponível, o 22 perdeu votos em **82.022 seções** e o 13 em **9.553** (Fato, [01](01-balanco-turnos.md)). Daí vêm muito mais resíduos do 13 acima de zero, e a referência (MAD zero → desvio médio) fica pequena.
  - Previsão: os alertas espalhados, sem concentração. Confirmado: 473 municípios, no máximo 17 por município.
  - **Recomendação à −64:** calibrar o z do resíduo **por finalista**, ou usar o resíduo com sinal (sem `max(0)`), antes de ler essa assimetria como achado.
- **Macapá, 22 alertas de `ganho13` negativo.** São as seções da zona 10 com queda grande de comparecimento (ex.: 197 → 128). É o mesmo fenômeno de [01, E1](01-balanco-turnos.md):
  - as maiores quedas estão em locais ribeirinhos, de ilha e quilombolas;
  - nessas seções o 13 é majoritário e perde mais;
  - a queda **prejudica o lado que lidera a seção**.
  - Um "local" com −83 p.p. numa primeira contagem (anexo da Escola Jardim Felicidade) **não** era queda: as 5 seções dele mudaram de local de votação no 2º turno. Fato do `detalhe_votacao_secao`. `politico-locais-comparecimento.mjs` já tira essas seções. Cuidado em qualquer agregação por local.
- **O único alerta contábil do país** (PI 11878/0028/0099) está em [02](02-geografia.md#exceção-a-seção-destoa-até-dentro-do-município). A virada a favor do 22 aconteceu no município todo, mas é 3 vezes maior nessa seção. A habilitação ali foi quase toda por biometria. Fica como caso a abrir.

## Outros achados

- **Integridade (docs/analysis/integridade-nacional/06):** são riscos de cadeia técnica, sem dimensão política. Uma única observação: um ataque por chave ou software (R2, R4, R5) não teria por que respeitar a geografia eleitoral. O resultado tem lealdade de 1,0 nos dois finalistas, redutos estáveis entre turnos (98,8% e 97,4%) e viradas homogêneas por município. Isso é **compatível com voto real, mas não exclui** um ataque desenhado para seguir proporções locais. Nenhuma assinatura política substitui o teste técnico.
- **Comparecimento oficial (docs/analysis/coerencia-contagem/02):** não revisado nesta passada.
- **Biometria e mesários (docs/analysis/biometria-mesarios/01):** o teste E2 de [01](01-balanco-turnos.md) complementa essa frente. Nas 12 UFs com o 1º turno no banco, o crescimento de cada finalista se divide igual entre habilitados por biometria e sem biometria. Os coeficientes diferem em no máximo 0,033.
- **T14 (transferência de votos, −64):** a réplica regional em [01](01-balanco-turnos.md) dá os mesmos números nacionais. Os coeficientes fora de [0, 1] (Zema, Caiado no Nordeste, categorias pequenas no Norte) mostram que a suposição de taxa constante falha. O limite determinístico de GO (pelo menos 37% dos votos de Caiado, ou de eleitores do 22, foram para o 13) é a evidência mais firme de transferência que contraria a previsão ideológica simples. A explicação política está **[a confirmar]**.
