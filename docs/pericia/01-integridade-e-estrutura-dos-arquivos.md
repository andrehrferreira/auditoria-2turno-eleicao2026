# 1. Integridade e estrutura dos arquivos

## A pergunta

Os arquivos que o TSE publica na internet são exatamente os que a urna gerou no fim da votação, sem nenhuma alteração no caminho?

## Resposta curta (até agora)

Na seção conferida, **sim, no que já foi possível verificar**. As "impressões digitais" (hashes) dos arquivos baixados batem com as que a própria urna anotou no fim da votação. Falta ainda conferir os "lacres" (assinaturas digitais), porque eles usam um tipo de cálculo que as ferramentas comuns não fazem. Detalhes abaixo.

Seção conferida: Vila Velha (ES), zona 55, seção 372, 2º turno de 25/10/2026. A conferência de todas as seções do país depende do download completo, que está em andamento.

## O que a urna entrega no fim do dia

Quando a votação termina, a urna grava um conjunto de arquivos. O TSE publica quatro deles para qualquer pessoa baixar:

| Arquivo | O que é, em palavras simples | Tamanho nesta seção |
|---|---|---|
| Boletim de Urna (`-bu.dat`) | O placar da urna: votos de cada candidato, brancos, nulos, quantos eleitores podiam votar e quantos votaram, horário de abertura e de encerramento | 1,5 KB (menos que uma página de texto) |
| Registro Digital do Voto (`-rdv.dat`) | A lista de todos os votos, um por um, **em ordem embaralhada**. Não tem nome nem identificação de eleitor. Serve para recontar os votos de forma independente | 4,9 KB |
| Diário da urna (`-log.jez`) | Um arquivo compactado (como um .zip) com o diário de bordo da urna: cada evento com data e hora, desde a preparação da urna semanas antes até o encerramento | 174 KB compactado, 940 KB aberto, quase 10 mil linhas |
| Pacote de lacres (`-vota.vsc`) | A "nota fiscal" dos arquivos: lista os arquivos que a urna gerou, o tamanho de cada um, a impressão digital (hash) de cada um e o lacre (assinatura digital) de cada um | 61 KB |

Os arquivos de boletim, registro de votos e lacres não são texto comum: estão num formato padronizado de computador (chamado ASN.1), parecido com um formulário de campos fixos. Com um programa de leitura, cada campo aparece com seu valor: município, zona, seção, número de cada candidato, quantidade de votos.

### O pacote de lacres por dentro

O pacote de lacres tem **duas listas** com os mesmos arquivos:

1. Uma lista lacrada com a chave do **software de votação do TSE** (identificada como `SEVIN`).
2. Outra lista lacrada com a chave **da própria urna** (identificada como `UEAO`), acompanhada da "carteira de identidade" digital da urna (certificado).

A urna gerou **11 arquivos**; o pacote lista os 11. O portal publica só 4. Os outros 7 aparecem no pacote apenas com nome, tamanho e impressão digital. Entre eles estão as imagens das digitais dos eleitores e mesários, que são dados pessoais e por isso não são divulgadas.

## Como funciona a conferência (em três degraus)

Pense numa encomenda pelo correio:

1. **A etiqueta da caixa** (o portal): o portal do TSE informa um código para cada seção. Esse código é a impressão digital do pacote de lacres. Se o pacote baixado gerar o mesmo código, ele chegou intacto.
2. **A nota fiscal dentro da caixa** (o pacote de lacres): o pacote informa a impressão digital de cada arquivo. Se cada arquivo baixado gerar a mesma impressão digital, nenhum foi trocado ou alterado.
3. **O carimbo de quem enviou** (as assinaturas): o pacote traz lacres que só a urna e o software do TSE conseguem produzir. Conferir o lacre prova que a nota fiscal foi feita pela urna, e não por outra pessoa que trocou tudo.

Os degraus 1 e 2 mostram que **nada mudou entre a nota fiscal e o arquivo baixado**. O degrau 3 mostra que **a própria nota fiscal é verdadeira**.

## O que foi conferido nesta seção

| Degrau | Conferência | Resultado | Rótulo |
|---|---|---|---|
| 1 | Impressão digital do pacote de lacres = código informado pelo portal | Igual | **Fato** |
| 2 | Tamanho e impressão digital do Boletim de Urna = valores no pacote de lacres | Iguais, nas duas listas | **Fato** |
| 2 | Tamanho e impressão digital do Registro Digital do Voto = valores no pacote | Iguais, nas duas listas | **Fato** |
| 2 | Tamanho e impressão digital do diário da urna = valores no pacote | Iguais, nas duas listas | **Fato** |
| 2 | Impressão digital de cada lista = valor anotado no cabeçalho dela | Igual, nas duas listas | **Fato** |
| 3 | A "carteira de identidade" que acompanha os lacres é da mesma urna que aparece no boletim e no diário (urna nº 2199150) | Mesma urna | **Fato** |
| 3 | A carteira de identidade foi emitida pela autoridade do TSE para urnas modelo 2020 | Emitida por "AC UE2020, TSE" | **Fato** (falta conferir a cadeia até a raiz do TSE) |
| 3 | Os lacres (assinaturas) são válidos | Ainda não verificado | **Pendente** |

Fonte: arquivos baixados de `resultados.tse.jus.br` em 29/10/2026, com registro de cada download (endereço, data, tamanho e impressão digital) em `data/manifest/caso-es-57037-0055-0372.jsonl`. Detalhes técnicos em [../06-leitura-bu-rdv-log.md](../06-leitura-bu-rdv-log.md).

Para as impressões digitais foram usados os cálculos padrão chamados SHA-256 (degrau 1) e SHA-512 (degrau 2). São métodos públicos, usados no mundo todo, e qualquer pessoa pode repetir a conta com programas gratuitos.

## Por que o degrau 3 ainda está pendente

Os lacres da urna usam um tipo de cálculo que as ferramentas comuns (como o OpenSSL, a mais usada no mundo) não reconhecem. O certificado indica o código `1.3.6.1.4.1.44588.2.1`.

- **Hipótese:** é a curva "Ed521", que o TSE usou em eleições anteriores. Ainda não confirmado.
- **Pendente:** localizar a documentação e a ferramenta oficial de verificação do TSE para 2026, verificar os lacres desta seção e, se der certo, de todas.

Enquanto o degrau 3 não for feito, a conclusão correta é: **os arquivos publicados batem com a nota fiscal da urna; ainda não está provado, por esta perícia, que a nota fiscal foi assinada pela urna**.

## Próximos passos

- [ ] Verificar os lacres (degrau 3) com a ferramenta oficial do TSE
- [ ] Conferir a carteira de identidade da urna até a autoridade raiz do TSE
- [ ] Repetir os degraus 1 e 2 em todas as seções baixadas e publicar a contagem: quantas conferem, quantas não
- [ ] Comparar com o pacote consolidado por estado que o TSE também publica (arquivo `.zip` por UF), para ver se é idêntico ao baixado seção por seção
