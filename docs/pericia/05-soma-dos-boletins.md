# 5. Soma dos boletins × resultado oficial

## A pergunta

Se somarmos o "placar" de cada urna (o Boletim de Urna), chegamos ao resultado que o TSE divulgou? Ou existe diferença entre o que as urnas registraram e o que foi totalizado?

## Resposta curta

**Fato (2º turno, Presidente):** a soma dos boletins das 499.205 seções que votaram para Presidente é **idêntica** ao resultado oficial publicado pelo TSE. A comparação foi feita **seção por seção**, e nenhuma divergiu.

| | Soma dos boletins das urnas | Resultado oficial do TSE | Diferença |
|---|---|---|---|
| LULA (13) | 64.256.232 | 64.256.232 | 0 |
| FLAVIO BOLSONARO (22) | 59.826.041 | 59.826.041 | 0 |
| Nulos | 2.723.305 | 2.723.305 | 0 |
| Brancos | 1.430.496 | 1.430.496 | 0 |
| Seções com alguma diferença | — | — | **0 de 499.205** |

**Fato (1º turno, Presidente):** a mesma comparação, seção por seção, nas 499.206 seções que votaram para Presidente no 1º turno (28 UFs), também não tem nenhuma divergência: 0 seções diferentes, 0 só no boletim, 0 só no resultado oficial, e 125.275.835 votos de cada lado. O oficial foi lido direto do mesmo CSV (`scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1`, cópia de leitura do banco de 29/10/2026, 10h50 UTC). A mesma igualdade aparece no [tópico 8](08-virada-do-2-turno.md), por outro script.

**Pendente:** os demais cargos (governador, senador, deputados). Ver "Próximos passos".

## O que foi comparado

- **De um lado:** o boletim de cada urna, lido diretamente do arquivo que a urna gravou e assinou. A integridade desses arquivos foi conferida nos tópicos [0](00-coleta-completa.md) e [1](01-integridade-e-estrutura-dos-arquivos.md).
- **Do outro:** o arquivo oficial de **votação por seção** que o TSE publica no portal de dados abertos (`votacao_secao_2026_BR.csv`, gerado em 26/10/2026 às 12:07). É o resultado que o TSE apresenta como totalizado, seção por seção.

Para cada seção e cada número votado (candidato, branco ou nulo), os dois valores foram comparados. Somar só o total do país poderia esconder erros que se compensam (um a mais aqui, um a menos ali). A comparação seção por seção não deixa isso passar.

## Prova de que o teste funciona (contraprova)

- A comparação junta os dois lados por completo: uma seção que existisse só no boletim, ou só no resultado oficial, contaria como divergência. Não há nenhuma: as 499.205 seções aparecem nos dois lados.
- Nos testes automáticos do banco (`test/banco.test.js`), um valor oficial alterado de propósito (143 votos onde o boletim tem 144) e uma seção que só existe no oficial **são** apontados como divergência. Ou seja, o teste é capaz de detectar diferença.
- Caso conferido: AC, Bujari, zona 9, seção 3, com LULA 81 e FLAVIO BOLSONARO 146 no boletim, no registro dos votos e no resultado oficial.

## Um caso que parecia estranho

**Fato:** algumas seções aparecem no site de resultados com a situação "Recebida", e não "Totalizada". **Parcial** ([tópico 0](00-coleta-completa.md)): 5.270 nas 395.227 seções com urna cuja lista oficial já foi baixada (AM, BA, MA, MG, PA, PE, PI, PR, RJ e RS; ainda faltam 99.596 seções de SP e as 4.384 de TO). Quantas são no país inteiro: **Pendente: em verificação**.

**Fato:** como a comparação acima cobre **todas** as seções que votaram para Presidente, essas seções "Recebida" estão incluídas nela: estão no resultado oficial e os votos de Presidente são **iguais** aos do boletim da urna.

**Hipótese:** a situação "Recebida" se refere ao pacote completo de arquivos da urna (diário, registro dos votos), e não ao boletim, que já estava totalizado. Seja qual for o motivo, não há diferença de votos.

## O que este resultado prova e o que não prova

- **Prova:** o resultado oficial de Presidente no 2º turno é exatamente a soma do que as urnas registraram. Não houve alteração de votos **entre a urna e o resultado divulgado**: nenhum voto somado, tirado ou trocado na totalização.
- **Não prova** que os votos registrados pelas urnas são todos legítimos. Se alguém votou no lugar de outra pessoa (por exemplo, com liberação sem biometria), esse voto está no boletim **e** no resultado oficial, e os dois batem. Essa possibilidade é examinada no tópico 4, "Como os eleitores foram liberados para votar".

## Como repetir

```
node src/banco.js --turno 2 --oficial      # carrega boletins e resultado oficial no banco (doc 09)
node scripts/h03-bu-x-oficial.mjs 2        # compara e lista qualquer seção divergente
node scripts/auditoria/verifica-pericia-soma-boletins.mjs   # conferência independente: lê o CSV oficial direto do zip
node --max-old-space-size=8192 scripts/auditoria/verifica-pericia-coerencia-topicos.mjs --turno 1   # o mesmo, 1º turno
```

## Próximos passos

- **Pendente:** demais cargos dos dois turnos. O arquivo oficial por seção só traz Presidente. Para governador, senador e deputados, a comparação será por município e zona (`votacao_candidato_munzona`). Pendente: em verificação.
