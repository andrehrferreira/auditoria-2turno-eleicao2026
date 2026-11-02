# T25: posição do Claude, partes a e b (escrita antes de ver as respostas dos modelos)

Data: 02/11/2026. Escrita depois de gerar `prompt-a.md` e `prompt-b.md` e antes de rodar a consulta.

| Hipótese | Veredito | Resultado | Motivo em uma linha |
|---|---|---|---|
| H01 | F | nao | O cadastro tem mais eleitores de 100+ do que o Censo permite (títulos antigos sem limpeza), sem sinal de uso em massa; mesmo todos os 297.977 ficam abaixo da margem. |
| H02 | F | nao | A foto explica quase todo o excesso; sobram poucas seções com liberação à mão fora do normal e sem rastro técnico, somando menos de 1% da margem. |
| H03 | R | nao | A soma dos boletins é igual ao resultado oficial em todos os campos, nos dois turnos, com contraprovas independentes. |
| H04 | R | nao | Nenhum arquivo foi alterado depois da urna e nenhum voto entrou sem a urna conferir o programa; a variante "programa adulterado e assinado com a chave oficial" é de outra natureza e fica declarada como limite. |
| H05 | N | nao_excluido | O teste vê inserção concentrada e não acha; 1 a 3 votos por seção passam sem sinal e podem chegar perto da margem. |
| H06 | S | nao | Os 34.315 votos depois das 17h são menos de 1% da margem; a ordem de registro dos boletins não mostrou dependência do voto no que é público. |
| H07 | R | nao | Todo modelo de urna lê digital. |
| H08 | R | nao | Nenhum ciclo de eleitor abaixo do limite físico, nos dois turnos. |
| H09 | F | nao | O diário público traz o título de quem estava na cabine na suspensão, com presença, hora e desfecho; não liga voto a pessoa, salvo 1 caso de seção unânime. |
| H10 | R | nao | A afirmação "em todos os estados" não ocorreu: o excesso aparece só em 6 UFs e é igual à perda líquida do 22 nelas. |
| H11 | R | nao | Nenhum cartão, urna ou código de carga repetido, e cada pacote é assinado pela própria urna. |
| H12 | N | nao_excluido | A urna não registra o e-Título; decidir exige teste de laboratório com e-Títulos de voluntários. |
| H13 | N | nao_excluido | Nordeste sem sinal; MG e RS com padrão igual ao de 2022; com voto secreto, os dados públicos não separam perfil de inserção com o mesmo formato. |
| H15 | S | nao_excluido | O teste de blocos não acha sinal, mas é estreito; o voto no lugar de ausente espalhado só tem teto na abstenção. |
| H16 | R | nao | Zero sessão fora da máquina de estados nos dois turnos; os votos confirmados e não gravados têm mecanismo conhecido (urna desligada). |
| H17 | S | nao_excluido | Os atendimentos registrados que não viraram voto ficam abaixo da margem; o eleitor mandado embora sem registro não tem teto. |
| H18 | S | nao_excluido | Nenhuma cidade com urnas parecidas demais; uma mudança igual num estado inteiro é ponto cego. |
| H20 | S | nao | Relógio e ordem sem adulteração; um relógio atrasado na BA (fato menor) não criou nem tirou voto. |
