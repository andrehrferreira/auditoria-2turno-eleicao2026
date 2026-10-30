# Rastreio de `docs/pericia/01-integridade-e-estrutura-dos-arquivos.md`

Índice técnico do que saiu do texto do tópico 1 quando o relatório passou a ser independente do processo (pedido do André, 30/10/2026). **Este arquivo não entra no relatório.** Nenhum número, rótulo ou conclusão mudou.

No texto do relatório, "revisão independente" quer dizer o agente `cetico-revisor`, e em especial:

- [parecer 24](../cetico-revisor/24-integridade-h04-h11.md) (H04 e H11, integridade e identificadores, dois turnos);
- [parecer 33](../cetico-revisor/33-h25-certificado-ac-urna.md) (H25, certificado da AC URNA).

Documentos de análise de origem: [`integridade-nacional/01`](../integridade-nacional/01-metodo.md) (método), [`02`](../integridade-nacional/02-lacres-h04-2turno.md) (lacres do 2º turno), [`07`](../integridade-nacional/07-autoverificacao-no-log.md) (autoverificação).

## Resposta curta

- "revisado pelo cético no parecer 24" virou "com revisão independente": parecer 24.
- "**Fato (2º turno, parecer 24):** ao ligar..." virou "**Fato (2º turno):**": parecer 24, itens 10 a 13.

## O que a urna entrega no fim do dia / O pacote de lacres por dentro

- Retirados os nomes `-imgbu.dat` (boletim impresso) do texto. Ficaram na tabela os sufixos dos arquivos da urna como o TSE os publica (`-bu.dat`, `-rdv.dat`, `-log.jez`, `-vota.vsc`), porque ajudam quem baixar os arquivos do portal.

## Exemplo: o que foi conferido numa seção

Texto retirado:

> O programa `src/lacres.js` faz 25 dessas conferências [...] As outras linhas da tabela [...] são conferidas à parte, por `src/conferencia.js` e `scripts/auditoria/t15-integridade.mjs`, também com resultado positivo.

- "programa de conferência de lacres desta perícia" = `src/lacres.js`.
- "programas separados" = `src/conferencia.js` e `scripts/auditoria/t15-integridade.mjs`.

## O que foi conferido no país inteiro (2º turno)

- Rótulo: "revisado no parecer 24, item 1, 'sustentada'".
- Varredura: `scripts/auditoria/integridade-lacres.mjs`, com o verificador de `src/lacres.js`; recontagem do revisor a partir das linhas de saída de cada pacote (`scripts/auditoria/cetico-integridade-recontagem.mjs`).
- Tabela por UF: `scripts/auditoria/integridade-resumo.mjs`, saída `resumo.json` → `teste1.porUf`; total e separação por modelo recontados pelo revisor (parecer 24).
- Dados do gráfico e da tabela: [`docs/pericia/graficos/dados/lacres-por-uf-2t.csv`](../../pericia/graficos/dados/lacres-por-uf-2t.csv) e [`lacres-por-modelo-2t.csv`](../../pericia/graficos/dados/lacres-por-modelo-2t.csv); gerados por `scripts/auditoria/grafico-integridade-dados.mjs` e `grafico-integridade.mjs`.

### Urnas antigas: carteira gravada com zeros a mais

- Rótulos retirados: "parecer 24, itens 2 e 3" (zeros a mais) e "parecer 24, item 2" (sobra acompanha a carteira).
- "a correção está recomendada no parecer 24" virou "foi recomendada na revisão independente".
- Reverificação dos 37.457: `scripts/auditoria/integridade-reverificar.mjs --turno 2 --cli 20`.

## Prova de que o teste funciona (contraprova)

- Testes do verificador: `node --test test/lacres.test.js test/ed521.test.js` (14 de 14), refeitos pelo revisor no parecer 24.
- Adulteração de 1 bit em cada tipo de pacote: parecer 24, item 1; script `scripts/auditoria/cetico-integridade-controle.mjs`.
- Conferência de confirmação por sorteio: `node src/lacres.js <pasta da seção>` ("o programa de conferência de uma seção, que é público").

## O que a urna anota sobre o próprio programa (autoverificação)

- Fonte retirada: [integridade-nacional/07](../integridade-nacional/07-autoverificacao-no-log.md), revisado no parecer 24, itens 10 a 13.
- "O revisor abriu o diário original de cada uma das 181 anotações": `scripts/auditoria/cetico-integridade-boot-do-erro.mjs --turno 2` e `--turno 1`.
- 162 e 842 seções: `scripts/auditoria/cetico-integridade-casos.mjs`.
- 26 urnas com troca de cartão no dia: parecer 24, item 13.
- "O que aconteceu depois de cada erro": integridade-nacional/07, sustentado no parecer 24, item 10.
- Lista completa dos eventos: `data/parsed/auditoria/integridade/2t/autoverificacao-depois.json` → `casos`.
- Dados dos gráficos: [`autoverificacao-destino.csv`](../../pericia/graficos/dados/autoverificacao-destino.csv) e [`autoverificacao-por-uf.csv`](../../pericia/graficos/dados/autoverificacao-por-uf.csv).
- Contagem de inicializações sem segundo programa: parecer 24, item 13.

## 1º turno

- "Uma recontagem independente, com código do revisor cético, chegou aos mesmos números (parecer 24, item 4, previu os 37.440)" virou "com programa próprio [...] e a revisão independente do 2º turno tinha previsto os 37.440".
- Comandos retirados: `node scripts/auditoria/integridade-lacres.mjs --turno 1`, `node scripts/auditoria/integridade-reverificar.mjs --turno 1` e `node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t`.
- Boletim impresso de MG 50075/0047/0041 (`imgbu.dat`) fora da lista lacrada: parecer 24, item 4.

## Como a conferência foi feita (antes "e como repetir")

- "Qualquer pessoa pode repetir numa seção: `node src/lacres.js <pasta da seção>`. O programa e os testes estão no repositório." virou "O programa de conferência e os seus testes estão no índice técnico separado".
- Lista dos arquivos analisados: `docs/pericia/evidencias/indice/`.
- Link retirado: "Detalhes técnicos em [`docs/06-leitura-bu-rdv-log.md`](../../06-leitura-bu-rdv-log.md)".
- Saídas: `data/parsed/auditoria/integridade/2t/` e `data/parsed/auditoria/cetico/`. Método detalhado em [integridade-nacional/01](../integridade-nacional/01-metodo.md) e [02](../integridade-nacional/02-lacres-h04-2turno.md).

Bloco de comandos retirado, integral:

```
País inteiro, 2º turno (a primeira linha leva horas):

node scripts/auditoria/integridade-lacres.mjs --turno 2 --procs 10 --refazer     # confere todos os pacotes
node scripts/auditoria/integridade-reverificar.mjs --turno 2 --cli 20            # os 37.457 com zeros a mais na carteira
node scripts/auditoria/integridade-resumo.mjs --turno 2                          # totais

# revisão cética (parecer 24)
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 2               # recontagem independente
node scripts/auditoria/cetico-integridade-controle.mjs                           # 1 bit alterado em cada tipo de pacote
node --test test/lacres.test.js test/ed521.test.js                               # testes do verificador

# autoverificação do programa
node scripts/auditoria/integridade-autoverificacao.mjs --turno 2 --procs 8
node scripts/auditoria/integridade-autoverificacao-depois.mjs --turno 2
node scripts/auditoria/integridade-autoverificacao.mjs --turno 1 --procs 8
node scripts/auditoria/integridade-autoverificacao-depois.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t-identificadores
node scripts/auditoria/cetico-integridade-boot-do-erro.mjs --turno 2             # nenhum voto na inicialização do erro
node scripts/auditoria/cetico-integridade-boot-do-erro.mjs --turno 1
node scripts/auditoria/cetico-integridade-casos.mjs                              # 162 e 842 seções

# tabelas e gráficos deste tópico (só leem as saídas acima e conferem as somas)
node scripts/auditoria/grafico-integridade-dados.mjs                             # CSVs em docs/pericia/graficos/dados/
node scripts/auditoria/grafico-integridade.mjs                                   # SVGs em docs/pericia/graficos/
```

## Limites desta conferência

- Limite 3: link retirado [integridade-nacional/02](../integridade-nacional/02-lacres-h04-2turno.md) (validade da AC URNA até 18/07/2026).
- Limite 3: os quatro rótulos "**Fato (parecer 33 ...)**" viraram "**Fato**". Todos os itens (54 carteiras, série crescente, +0,13 ponto e 13 votos, recusa das 99.957) são do [parecer 33](../cetico-revisor/33-h25-certificado-ac-urna.md).

## Alcance e Próximos passos

- "(revisado no parecer 24)" virou "(com revisão independente)".
- "[x] Rodar a conferência dos lacres [...] 2º turno (parecer 24)": parecer 24.
