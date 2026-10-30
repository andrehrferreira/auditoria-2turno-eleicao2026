# Rastreio: docs/pericia/temas/certificado-ac-urna.md

Índice do que foi retirado do relatório temático da AC URNA em 30/10/2026, quando o relatório passou a ser independente do processo (CLAUDE.md, "Relatório de perícia"). Nenhum número, rótulo ou conclusão mudou; só saíram as referências abaixo. Este arquivo não entra no relatório.

## Fontes

- Hipótese: H25 em [docs/hipoteses.md](../../hipoteses.md).
- Assinaturas: [parecer cético 24](../cetico-revisor/24-integridade-h04-h11.md); [integridade-nacional/02](../integridade-nacional/02-lacres-h04-2turno.md).
- Carteiras de cada urna e votos: [parecer cético 33](../cetico-revisor/33-h25-certificado-ac-urna.md); [engenheiro de segurança, doc 07](../engenheiro-seguranca-urna/07-h25-certificados.md); [estatístico, doc 10](../estatistico-eleitoral/10-h25-urnas-ac-vencida.md).
- Riscos fora da criptografia: [integridade-nacional/06](../integridade-nacional/06-riscos-fora-da-criptografia.md).
- No relatório, "segunda verificação independente" = pareceres 24 e 33; "primeira análise" / "a análise" = engenheiro doc 07 e estatístico doc 10; "conta feita para este relatório" / "contado à parte" = `scripts/auditoria/grafico-h25-dados.mjs`.
- Pedido do coordenador (30/10/2026): o "Base" não cita revisor, parecer nem H25; a frase "Os poucos números que não estão num parecer foram refeitos por duas contas independentes, e o texto diz onde" saiu. Os números que não estão nos pareceres 24 e 33 são os que o relatório marca como "conta feita para este relatório" ou "contado à parte" (todos por `grafico-h25-dados.mjs`): datas de validade dos três cartórios; marca de fora da validade no 1º turno; colunas por UF (1º turno e zeros a mais); contagem por dia antes do vencimento; 101.756 carteiras.

## Referências retiradas, seção por seção

| Seção | Texto no relatório agora | Referência retirada |
|---|---|---|
| Base | "Todos os números deste relatório foram recalculados por uma segunda verificação independente, sobre todas as seções dos dois turnos." | "revisor cético"; parecer 24 (assinaturas); parecer 33 (carteiras e votos); "hipótese H25"; "números que não estão num parecer [...] duas contas independentes" |
| Validade dos três cartórios | "por uma conta feita para este relatório. São iguais às registradas quando os certificados foram obtidos" | `data/certificados/ac/*.der`; `grafico-h25-dados.mjs`; `data/certificados/README.md`; parecer 24; integridade-nacional/02 |
| Validade, pacotes por cartório | "recontagem feita pela segunda verificação" | "revisor cético"; `cetico-integridade-recontagem.mjs`; parecer 24, itens 1 e 4 |
| Validade, gráfico | (sem link de dados) | `docs/pericia/graficos/dados/h25-ac-validade.csv`; `docs/pericia/graficos/dados/h25-marcos.csv` |
| Carteiras dentro da validade | "2º turno pela segunda verificação; 1º turno pela recontagem desse turno" | parecer 24, item 1 |
| Assinaturas conferem | "2º turno: segunda verificação; 1º turno: [...] recontada com o programa da segunda verificação" | parecer 24, itens 1 a 3; "código do revisor" |
| Assinaturas, marca do 1º turno | "contada mais uma vez para este relatório [...]; o total bate com o da recontagem independente" | `grafico-h25-dados.mjs`; "recontagem cética" |
| Zeros a mais | "conferido pela segunda verificação" | parecer 24, itens 2 e 3; integridade-nacional/02; parecer 24, item 2 |
| Por UF | "Uma conta feita para este relatório confere todas"; "nova conferência desses pacotes"; "recontagem da segunda verificação" | `grafico-h25-dados.mjs` ("o script para se algum número não bater"); "linhas da reverificação" (`integridade-reverificar.mjs`); "recontagem cética"; `docs/pericia/graficos/dados/h25-ac-urna-por-uf.csv` |
| Votos no resultado oficial | só o link do tópico 5 | parecer 33, item d |
| Contraprova | "A segunda verificação alterou de propósito"; "Fato." | parecer 24, item 1; "revisor cético"; comando `node scripts/auditoria/cetico-integridade-controle.mjs`; parecer 33, tabela C2 |
| Título "As carteiras de cada urna e os votos" | sem "(parecer 33)" | parecer 33 |
| Abertura dessa seção | "Os testes sobre as carteiras e os votos [...] em duas frentes"; "um programa padrão de verificação de certificados (OpenSSL)"; "afirmações que resistiram a essa verificação" | "hipótese H25"; engenheiro doc 07; estatístico doc 10; "revisor cético"; parecer 33 (afirmações revisadas) |
| Carteiras depois do vencimento | "Fato."; "(pergunta 3, no fim deste relatório)" | parecer 33, C1 e C5; C4; "Hipótese (parecer 33)"; C3 e item a |
| Contagem por dia | "refeita para este relatório [...] igual à da primeira análise e [...] à lista da segunda verificação" | `grafico-h25-dados.mjs`; "do engenheiro"; "lista do parecer 33"; `docs/pericia/graficos/dados/h25-acurna-2026-por-dia.csv`; "(**Fato**, parecer 33)" |
| Hipótese recertificação | "Hipótese (a mais simples)" | parecer 33, C15 |
| Para qual certificado apontam | "Fato:"; "Hipótese forte:" | parecer 33, C2; C10; "Hipótese forte (parecer 33)" |
| Repetições e coerência | "universo completo dos dois turnos"; "contado à parte [...] bate com o da segunda verificação" | parecer 33, C6 e C7; `grafico-h25-dados.mjs`; "bate com o do parecer" |
| Data vencida permite forjar? | "Isso é uma propriedade da assinatura digital" | parecer 33, C9; "O parecer registra que" (demonstração: `seguranca-h25-demonstracao.mjs`) |
| Verificador padrão | "A segunda verificação conferiu 5 das 54 [...] com o OpenSSL" | parecer 33, item b; "O revisor"; "OpenSSL de linha de comando" (`cetico-33-h25-bruto.mjs`) |
| Duas regras de data | "(Fato)" | parecer 33, C11, C12 e item d |
| Zeros a mais, por quê | "Fato."; "Ressalva:" | parecer 33, C8; "Ressalva do parecer" |
| Votos das seções tardias | sem fonte | parecer 33, item c (`cetico-33-h25-votos.mjs`) |
| Votos urnas antigas × novas | "a análise registrou"; "A segunda verificação rodou de novo"; "a análise acrescentou depois" | estatístico doc 10; parecer 33, metade 2; itens V1 a V7; "o estatístico"; "O revisor" |
| V7 | "o registro dos testes e os resultados foram guardados juntos, no mesmo momento [...] A segunda verificação não acusa nada" | "entraram juntos no repositório (mesmo commit)"; "O parecer não acusa nada" |
| Totalização | "Fato:" | parecer 33, item d; "(parecer 33)" na frase "Não se pode escrever [...]" |
| "Não há como comprovar quem emitiu" | "Fato (tópico 1)"; "Fato:" | parecer 24, tópico 1 e parecer 33; parecer 33 |
| "Um sistema alterado poderia assinar" | "Fato:" (quatro itens) | parecer 33; parecer 24 (duas vezes); parecer 33 |
| Limites, item 2 | "A auditoria tentou baixá-las" | "O engenheiro tentou"; parecer 33, item e |
| Próximos passos | "Segunda verificação independente das carteiras"; "Hoje ela vem só da verificação de lacres." | "Revisão cética [...] (parecer 33)"; "(parecer 33)" |
| Fim | (retirado) | "Registro da hipótese: H25 em hipoteses.md"; link para integridade-nacional/06 |

## Seção "Como reproduzir" (retirada inteira)

Uma seção: `node src/lacres.js <pasta da seção>`. A validade do certificado público da AC URNA:

```
openssl x509 -inform der -in data/certificados/ac/acurna.der -noout -dates -serial
```

Assinaturas de todas as seções (parecer 24 e tópico 1):

```
node scripts/auditoria/integridade-lacres.mjs --turno 2 --procs 10 --refazer     # confere todos os pacotes (horas)
node scripts/auditoria/integridade-reverificar.mjs --turno 2 --cli 20            # carteiras com zeros a mais
node scripts/auditoria/integridade-resumo.mjs --turno 2                          # totais
node scripts/auditoria/integridade-lacres.mjs --turno 1
node scripts/auditoria/integridade-reverificar.mjs --turno 1
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 2
node scripts/auditoria/cetico-integridade-recontagem.mjs --turno 1 --dir data/parsed/auditoria/integridade/1t
node scripts/auditoria/cetico-integridade-controle.mjs                           # 1 bit alterado em cada tipo de pacote
```

Carteiras de cada urna e votos (doc 07, doc 10 e parecer 33):

```
node scripts/auditoria/seguranca-h25-certificados.mjs --turno 2
node scripts/auditoria/seguranca-h25-certificados.mjs --turno 1 --ed521-exceto 2
node scripts/auditoria/seguranca-h25-analise.mjs
node scripts/auditoria/seguranca-h25-demonstracao.mjs
node --max-old-space-size=8192 scripts/auditoria/estatistico-h25.mjs

# revisão cética
node scripts/auditoria/cetico-33-h25-certificados.mjs                            # segunda leitura das carteiras, dois turnos (30 a 40 min)
node scripts/auditoria/cetico-33-h25-repeticoes.mjs                              # repetições e validades
node scripts/auditoria/cetico-33-h25-bruto.mjs                                   # 5 carteiras no arquivo original, com o OpenSSL
node --max-old-space-size=6144 scripts/auditoria/cetico-33-h25-votos.mjs         # votos das seções com carteira tardia
```

Tabelas e gráficos deste relatório (só leem as saídas acima e conferem as somas):

```
node scripts/auditoria/grafico-h25-dados.mjs                                     # CSVs h25-* em docs/pericia/graficos/dados/
node scripts/auditoria/grafico-h25.mjs                                           # ac-urna-linha-do-tempo.svg e ac-urna-emissoes-2026.svg
```

## Gráficos (continuam no relatório)

- `docs/pericia/graficos/ac-urna-linha-do-tempo.svg`, `ac-urna-emissoes-2026.svg` (de `grafico-h25.mjs`) e `lacres-por-modelo-2t.svg`.
