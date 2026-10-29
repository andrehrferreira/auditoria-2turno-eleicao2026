# Registro de evidências da perícia

Esta pasta guarda a prova de **quais arquivos foram analisados** e de **como cada verificação foi feita**. O objetivo é que qualquer pessoa consiga conferir que nada foi trocado, inventado ou ajustado depois.

## O que tem aqui

| Arquivo ou pasta | O que é, em palavras simples |
|---|---|
| `indice/2t/{uf}.tsv.gz` | A lista de **todos os arquivos de urna usados**, por estado: uma linha por seção, com a "impressão digital" (SHA-256) de cada arquivo (boletim, registro dos votos, diário da urna, pacote de lacres, imagem do boletim e índice do TSE). Abre com qualquer descompactador e lê como planilha (separada por TAB) |
| `cadeia.jsonl` | O "livro de registro" da perícia. Cada linha é um acontecimento: um índice criado, uma verificação rodada, um documento de referência guardado. Cada linha leva a impressão digital da linha anterior, como elos de uma corrente |
| `ancora.txt` | A impressão digital da última linha do livro. Ela resume o livro inteiro: mudar qualquer coisa em qualquer linha anterior muda esse valor |
| `referencias/` | Cópias dos documentos usados como base: a especificação oficial do TSE, os certificados das autoridades do TSE e os arquivos da biblioteca de criptografia de onde saíram os parâmetros |
| `saidas/` | O resultado completo de cada verificação, quando é pequeno. Os grandes ficam fora do repositório (`data/evidencias/saidas/`), mas a impressão digital deles fica registrada no livro |

## Por que isso impede contestação

1. **Os arquivos analisados são os do TSE.** Para cada seção, a impressão digital do pacote de lacres é a mesma que o próprio portal do TSE informa. Qualquer pessoa pode baixar a mesma seção do site do TSE e comparar com a linha do índice.
2. **O livro não pode ser editado sem deixar marca.** Se alguém mudar um resultado antigo (por exemplo, trocar "0 falhas" por "3 falhas"), a corrente quebra a partir dali, e a verificação acusa.
3. **Cada verificação registra o programa exato usado.** Ficam gravados o comando, o commit do git e a impressão digital de cada arquivo do programa. Dá para provar que o resultado saiu daquele código, e não de outro.
4. **A data pode ser provada por terceiros** (passo recomendado): a impressão digital da âncora é registrada num serviço de carimbo do tempo, por exemplo ICP-Brasil, um serviço RFC 3161 ou OpenTimestamps. Esse registro prova que o livro existia, exatamente assim, naquela data. Só a impressão digital é enviada, nunca os dados.

## Como conferir

```bash
node src/evidencias.js verificar              # confere a corrente e os arquivos registrados
node src/evidencias.js verificar --profundo   # refaz cada índice a partir dos arquivos em disco e compara
```

Para conferir uma seção à mão, sem nenhum programa deste projeto:

1. Achar a seção no índice (`indice/2t/{uf}.tsv.gz`): colunas município, zona, seção e impressões digitais.
2. Baixar os arquivos da seção no portal do TSE (endereços no doc [02](../../02-fontes-tse.md)).
3. Calcular a impressão digital de cada arquivo (`sha256sum` no Linux/Mac, `certutil -hashfile <arquivo> SHA256` no Windows) e comparar com a linha.

## Como registrar novos passos

```bash
node src/evidencias.js indexar --turno 2 --uf sp                         # índice de uma UF
node src/evidencias.js executar --nome lacres-2t-sp -- node src/lacres.js data/raw/2t/urnas/sp
node src/evidencias.js referencia --arquivo <doc> --origem <url> --descricao "<para que serve>"
```

Regras:
- **Commitar o código antes de rodar uma verificação que vai para o relatório.** A entrada registra se havia alteração não commitada em `src/`.
- **Nunca editar `cadeia.jsonl` à mão.** Correção é uma entrada nova, que explica o erro da anterior.
- **Nunca registrar dado pessoal.** Os arquivos de urna publicados pelo TSE não identificam eleitores; o log traz o título dos mesários e por isso não é copiado para cá, só a impressão digital dele.
