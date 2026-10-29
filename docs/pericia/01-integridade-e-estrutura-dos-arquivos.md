# 1. Integridade e estrutura dos arquivos

## A pergunta

Os arquivos que o TSE publica na internet são exatamente os que a urna gerou no fim da votação, sem nenhuma alteração no caminho?

## Resposta curta

Na seção analisada em detalhe, **sim**. As "impressões digitais" dos arquivos baixados batem com as que a urna anotou, e os "lacres" (assinaturas digitais) da urna foram conferidos e são válidos. Mudar um único voto no arquivo é detectado na hora.

Seção analisada em detalhe: Vila Velha (ES), zona 55, seção 372, 2º turno de 25/10/2026. O mesmo teste foi rodado em todas as 2.270 seções com urna do Acre, e nenhuma falhou (seção "Alcance" abaixo). O download de todas as seções está completo e as impressões digitais dos arquivos foram refeitas em todas elas, nos dois turnos ([tópico 0](00-coleta-completa.md)); a conferência dos lacres no país inteiro ainda não foi feita (**Pendente**).

Há quatro limites, explicados adiante; os dois principais: um dos dois lacres usa um método secreto do governo e não pode ser conferido por ninguém de fora; e a "carteira de identidade" da urna foi conferida até a autoridade intermediária do TSE, não até a autoridade raiz.

## O que a urna entrega no fim do dia

Quando a votação termina, a urna grava um conjunto de arquivos. O TSE publica estes para qualquer pessoa baixar:

| Arquivo | O que é, em palavras simples | Tamanho nesta seção |
|---|---|---|
| Boletim de Urna (`-bu.dat`) | O placar da urna: votos de cada candidato, brancos, nulos, quantos eleitores podiam votar e quantos votaram, horário de abertura e de encerramento | 1.527 bytes (menos que uma página de texto) |
| Registro Digital do Voto (`-rdv.dat`) | A lista de todos os votos, um por um, **em ordem embaralhada**. Não tem nome nem identificação de eleitor. Serve para recontar os votos de forma independente | 5.015 bytes |
| Diário da urna (`-log.jez`) | Um arquivo compactado (como um .zip) com o diário de bordo da urna: cada evento com data e hora, desde a preparação da urna semanas antes até o encerramento | 177.719 bytes compactado, 962.771 bytes aberto, 9.916 linhas |
| Pacote de lacres (`-vota.vsc`) | A "nota fiscal" dos arquivos: lista os arquivos que a urna gerou, o tamanho de cada um, a impressão digital de cada um e o lacre de cada um | 62.605 bytes |

Os arquivos de boletim, registro de votos e lacres não são texto comum: estão num formato padronizado de computador (chamado ASN.1), parecido com um formulário de campos fixos. O TSE publica o "molde" desse formulário (a especificação), e com ele cada campo pode ser lido: município, zona, seção, número de cada candidato, quantidade de votos.

### O pacote de lacres por dentro

O pacote de lacres tem **duas listas** com os mesmos arquivos:

1. Uma lista lacrada pelo **software de votação do TSE**, com um método de cálculo do governo (chamado CEPESC) que não é público.
2. Outra lista lacrada pela **própria urna**, com um método público, acompanhada da "carteira de identidade" digital da urna (o certificado).

A urna gerou **11 arquivos**, e o pacote lista os 11. O portal publica 4 deles: o boletim, o registro dos votos, o diário e o boletim impresso (`-imgbu.dat`, que vem no arquivo compactado por estado). Os outros 7 aparecem no pacote apenas com nome, tamanho, impressão digital e lacre. Entre eles estão as imagens das digitais dos eleitores e mesários, que são dados pessoais e por isso não são divulgadas.

## Como funciona a conferência

Pense numa encomenda pelo correio:

1. **A etiqueta da caixa** (o portal): o portal informa um código para cada seção. Esse código é a impressão digital do pacote de lacres. Se o pacote baixado gerar o mesmo código, ele chegou intacto.
2. **A nota fiscal dentro da caixa** (o pacote de lacres): o pacote informa a impressão digital de cada arquivo. Se cada arquivo baixado gerar a mesma impressão digital, nenhum foi trocado ou alterado.
3. **O carimbo de quem enviou** (as assinaturas): cada item da nota fiscal tem um lacre que só a urna consegue produzir, porque depende de uma chave secreta guardada dentro dela. Qualquer pessoa consegue *conferir* o lacre usando a parte pública dessa chave, que vem na carteira de identidade da urna.
4. **A carteira de identidade da urna** (o certificado): a carteira foi assinada por uma autoridade do TSE. Conferir essa assinatura mostra que a urna é uma urna oficial, e não um computador qualquer fingindo ser urna.

Há ainda um **lacre dentro do próprio boletim**. Cada linha de votos do boletim (por exemplo, "candidato 22, 161 votos") tem sua impressão digital, que é calculada a partir da linha anterior, como elos de uma corrente. O último elo é lacrado pela urna. Se alguém mudar uma linha, todos os elos dali para frente mudam e deixam de bater com o lacre.

Os degraus 1 e 2 mostram que **nada mudou entre a nota fiscal e o arquivo baixado**. Os degraus 3 e 4 mostram que **a nota fiscal foi assinada por uma urna cuja carteira de identidade foi emitida pela autoridade do TSE** (conferida até a autoridade intermediária, com certificados vindos de cópia pública do pacote do TSE; limites 2 e 3).

## O que foi conferido nesta seção

| Degrau | Conferência | Resultado | Rótulo |
|---|---|---|---|
| 1 | Impressão digital do pacote de lacres = código informado pelo portal | Igual | **Fato** |
| 2 | Tamanho e impressão digital do Boletim de Urna, do Registro Digital do Voto, do boletim impresso (`-imgbu.dat`) e do diário = valores na nota fiscal | Iguais nas duas listas | **Fato** |
| 2 | Impressão digital de cada lista = valor anotado no cabeçalho dela | Igual nas duas listas | **Fato** |
| 3 | Lacre da urna em cada um dos 11 arquivos da lista (inclusive os 7 não publicados) | 11 de 11 válidos | **Fato** |
| 3 | Lacre da urna na lista inteira | Válido | **Fato** |
| 3 | Corrente de elos do boletim: as 8 linhas de votos (4 de Presidente, 4 de Governador) foram recalculadas uma a uma | Todas iguais às gravadas | **Fato** |
| 3 | Lacre da urna no último elo de cada eleição (Presidente e Governador) | 2 de 2 válidos | **Fato** |
| 4 | A carteira de identidade é da mesma urna que aparece no boletim e no diário (urna nº 2199150) | Mesma urna | **Fato** |
| 4 | A carteira de identidade foi assinada pela autoridade do TSE para urnas modelo 2020 ("AC UE2020") | Assinatura válida | **Fato** |
| 4 | A carteira estava dentro da validade no dia da eleição | Válida de 2022 a 2036 | **Fato** |
| — | Lacre do software do TSE (método CEPESC) | Não verificável | **Limite** |

O programa `src/lacres.js` faz 25 dessas conferências nesta seção (2 da carteira de identidade, 2 da lista da urna, 4 impressões digitais de arquivo, 11 lacres de arquivo e 6 da corrente do boletim), todas com resultado positivo, refeitas em 29/10/2026 nos dois turnos; a mesma contagem, 25 de 25, vale para a seção 364 da mesma zona, citada no tópico 4. As outras linhas da tabela (código do portal, tamanhos, lista do software e número da urna no boletim e no diário) são conferidas à parte, por `src/conferencia.js` e `scripts/auditoria/t15-integridade.mjs`, também com resultado positivo.

### Prova de que o teste funciona (contraprova)

Para mostrar que o teste não aprova qualquer coisa, foi feita uma cópia do boletim com **um único voto a mais** (candidato 13 a Presidente passou de 96 para 97). O teste acusou três problemas: a impressão digital do arquivo deixou de bater com a nota fiscal, os elos da corrente de Presidente deixaram de bater e o último elo deixou de bater com o lacre. Também foi testado um lacre com um único sinal trocado: foi rejeitado. Esses testes ficam gravados junto com o programa e rodam sempre que ele é alterado.

## Como a conferência foi feita, e como repetir

- O método é o mesmo dos programas de exemplo que o próprio TSE publica junto com a especificação dos arquivos (pacote "Formato dos arquivos de BU, RDV e assinatura digital").
- As impressões digitais usam os cálculos padrão chamados SHA-256 e SHA-512, usados no mundo todo.
- Os lacres da urna usam um método chamado **Ed521**, uma variante de um padrão internacional de assinatura digital, adotada também pela ICP-Brasil (a infraestrutura oficial de certificados digitais do país). As ferramentas mais comuns (como o OpenSSL) ainda não trazem esse método, então ele foi programado para esta perícia e testado com exemplos de resultado conhecido, publicados pelos autores da biblioteca que o próprio TSE usa. Um desses exemplos é o certificado raiz da ICP-Brasil.
- Qualquer pessoa pode repetir: `node src/lacres.js <pasta da seção>`. O programa e os testes estão no repositório.
- Cada verificação feita para este relatório está registrada no [livro de evidências](evidencias/README.md): o comando, o programa exato usado e a impressão digital do resultado. A lista de todos os arquivos analisados, com a impressão digital de cada um, está em `evidencias/indice/`.

Fonte dos arquivos: `resultados.tse.jus.br`, baixados em 29/10/2026, com registro de cada download (endereço, data, tamanho e impressão digital). Detalhes técnicos em [../06-leitura-bu-rdv-log.md](../06-leitura-bu-rdv-log.md).

## Limites desta conferência

1. **O lacre do software do TSE não pode ser conferido por terceiros.** Ele usa um método de cálculo do governo (CEPESC) que não é publicado. O próprio TSE informa isso na especificação. A impressão digital dessa lista confere; o lacre em si, não há como checar de fora. O lacre da urna, que é público, foi conferido.
2. **A carteira de identidade foi conferida até a autoridade intermediária.** A carteira da urna é assinada pela "AC UE2020", e essa assinatura foi conferida. A AC UE2020, por sua vez, é assinada por outra autoridade do TSE ("AC URNA v2") e esta por uma autoridade raiz. Os certificados dessas duas não estão disponíveis para download automático no site do TSE. Os certificados usados (das autoridades intermediárias) vieram do pacote oficial de exemplos do TSE.
3. **O pacote oficial foi obtido de uma cópia pública**, porque o site do TSE bloqueia download automático. A cópia tem a mesma impressão digital registrada de forma independente por outro projeto de auditoria. Falta baixar o pacote direto do site do TSE, pelo navegador, e comparar.
4. **Lacre não prova que o voto registrado é o voto que o eleitor quis dar.** O lacre prova que o arquivo não mudou depois que a urna o gerou e que foi gerado por uma urna oficial. O que acontece *dentro* da urna antes disso é assunto de outros tópicos deste relatório.

## Alcance

| Conjunto | Seções conferidas | Resultado |
|---|---|---|
| ES · Vila Velha · zona 55 · seções 364 e 372, nos dois turnos | 2 | 25 de 25 conferências positivas em cada seção e turno |
| AC · todas as seções com urna | 2.270 (3.310 cópias de pacotes, porque 1.040 seções foram baixadas por dois caminhos) | Todas as conferências positivas, em todas as cópias |

## Próximos passos

- [ ] Rodar a conferência dos lacres em todas as seções do país (o download já está completo; [tópico 0](00-coleta-completa.md))
- [ ] Conferir uma seção com urna de modelo antigo (2013/2015), que usa outro método de lacre (ECDSA)
- [ ] Baixar pelo navegador o pacote oficial e os certificados das autoridades do TSE e comparar com as cópias usadas
- [ ] Comparar o pacote consolidado por estado que o TSE publica com os arquivos baixados seção por seção
