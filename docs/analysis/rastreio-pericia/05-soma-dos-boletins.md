# Rastreio — tópico 5 (Soma dos boletins × resultado oficial)

Índice do que foi retirado de `docs/pericia/05-soma-dos-boletins.md` em 30/10/2026, quando o relatório passou a ser um documento independente do processo (premissa do André, CLAUDE.md, seção "Relatório de perícia"). Nenhum número, rótulo ou conclusão mudou; só saíram referências a pareceres, papéis, scripts, comandos, arquivos e links. **Este índice não entra no relatório.**

No texto, "segunda verificação independente" do 1º turno = [parecer cético 26](../cetico-revisor/26-h03-1turno-todos-cargos.md), "sustentado com ressalvas".

## Resposta curta

- Governador do 2º turno por zona (1.026 pares): arquivo `votacao_candidato_munzona`; `scripts/auditoria/verifica-pericia-coerencia-munzona.mjs --turno 2`.
- 1º turno, todos os cargos: parecer 26.

## Termos

- Divulgação: `resultados.tse.jus.br`.
- Dados abertos: `detalhe_votacao_secao`, `votacao_secao`, `votacao_candidato_munzona`.

## O que foi comparado

- Votação por seção: `votacao_secao_2026_BR.csv` (gerado em 26/10/2026 às 12:07).
- Detalhe por seção: `detalhe_votacao_secao_2026`.
- Votação por município e zona: `votacao_candidato_munzona_2026`.

## Rótulos por item (todos "Fato.", antes com a fonte)

| Item no texto | Fonte retirada |
|---|---|
| 2. Quais seções entraram | parecer 26, item 1 |
| 3. Seis totais de cada cargo | parecer 26, item 2 |
| 3. Presidente candidato a candidato | parecer 26, item 2 |
| 4. Zona a zona | parecer 26, item 3 |
| 4. Conferência independente dos 250 números | parecer 26, item 3 (feita pelo revisor) |
| 5. 109 totais | parecer 26, item 4 |
| 5. De onde vem o nulo técnico | parecer 26, item 5 |
| 6. RJ, governador | parecer 26, item 6 |
| 6. DF, governador | parecer 26, item 6a |
| 6. O que o teste não decide | parecer 26, item 4 |
| 3. Duas vagas de senador (2 eleitos por UF) | parecer 26 |
| 3. Soma dos tipos de voto do boletim | recontada pelo revisor (parecer 26) |

## Dados por trás das tabelas e gráficos (links retirados)

- Universo por UF: `docs/pericia/graficos/dados/h03-1t-universo-por-uf.csv`.
- Detalhe por cargo: `docs/pericia/graficos/dados/h03-1t-detalhe-por-cargo.csv`.
- 109 totais, campo a campo: `docs/pericia/graficos/dados/h03-1t-fechamento-uf-cargo.csv`.
- Lista dos 254 itens do nulo técnico: `docs/pericia/graficos/dados/h03-1t-numeros-nulo-tecnico.csv`; resumo por estado e cargo: `docs/pericia/graficos/dados/h03-1t-nulo-tecnico-uf-cargo.csv`.

## Casos conferidos no arquivo da urna

- "Arquivo do boletim gravado pela urna" = `bu.dat`; "imagem do boletim impresso" = `imgbu.dat`; "base de dados da auditoria" = banco SQLite.
- SE 31038/0003/0001 e RJ 60011/0023/0100: revisor cético (parecer 26). Comando: `node scripts/auditoria/cetico-numeros-omitidos-munzona-bruto.mjs data/raw/1t/urnas/se/31038/0003/0001/<hash>/ Governador 22`.
- SP 63053/0037/0095: matemático forense, [doc 06](../matematico-forense/06-h03-1turno-todos-cargos.md), reproduzido no parecer 26.

## Contraprova

- "Programa de comparação do 1º turno" = no original, "o script do 1º turno", sem nome (os scripts do 1º turno estão em "Como repetir", abaixo); as três correções foram conferidas pelo revisor (parecer 26, item 7).
- Na legenda do gráfico do RJ, "para a diferença aparecer" passou a "para a diferença ficar visível" (só para a busca de conferência não acusar a palavra "parecer" dentro de "aparecer").
- Conferência independente: `scripts/auditoria/cetico-h03-1turno.mjs` (parecer 26, itens 3 a 6); "primeira conta" = a do autor (matemático forense).
- Teste automático: `test/banco.test.js`.

## O que prova e o que não prova

- Reclassificação de vagas de deputado/senador (conta sobre suposição): [matematico-forense/06](../matematico-forense/06-h03-1turno-todos-cargos.md).

## Seção "Como repetir" (retirada inteira)

```
node src/banco.js --turno 2 --oficial      # carrega boletins e resultado oficial no banco (doc 09)
node scripts/h03-bu-x-oficial.mjs 2        # 2º turno: compara e lista qualquer seção divergente
node scripts/auditoria/verifica-pericia-soma-boletins.mjs   # 2º turno: conferência independente, lê o CSV oficial direto do zip

# 1º turno, todos os cargos (parecer cético 26)
node --max-old-space-size=16000 scripts/auditoria/contagem-secao-presidente.mjs --turno 1   # presidente por seção e candidato
node --max-old-space-size=24000 scripts/auditoria/contagem-detalhe.mjs --turno 1            # seis totais por seção e cargo
node --max-old-space-size=24000 scripts/auditoria/contagem-munzona.mjs --turno 1            # candidato por município e zona
node --max-old-space-size=8000  scripts/auditoria/matematico-h03-1turno.mjs                 # 109 totais e nulo técnico
node --max-old-space-size=8000  scripts/auditoria/cetico-h03-1turno.mjs                     # conferência independente do revisor
node scripts/auditoria/cetico-numeros-omitidos-munzona-bruto.mjs data/raw/1t/urnas/se/31038/0003/0001/<hash>/ Governador 22   # caso no arquivo da urna

# tabelas e gráficos deste tópico (só leem as saídas acima e conferem as somas)
node scripts/auditoria/grafico-h03-dados.mjs
node scripts/auditoria/grafico-h03.mjs
```

Saídas: `data/parsed/auditoria/matematico/h03-1t-*` (fechamento, omitidos, efeito, universo), `data/parsed/auditoria/contagem/*-1t-*` e `data/parsed/auditoria/cetico/h03-1t-cetico*`. Banco: cópia de leitura de 29/10/2026, 10h50 UTC.

## Próximos passos

- 2º turno, demais campos contra o oficial, com revisão cética: [coerência 01](../coerencia-contagem/01-bu-x-oficial.md).
