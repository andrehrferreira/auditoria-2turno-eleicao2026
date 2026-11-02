# T25: síntese da votação dos vereditos finais (02/11/2026)

Votaram Astra, Grok, Kimi e Claude. A posição do Claude foi escrita e commitada antes das consultas: f184f0d para as partes a e b, 16f7c8c para a parte c. As respostas estão em `a/`, `b/` e `c/`, com os hashes em `consultas.jsonl`. A contagem sai de `contagem.json`.

Na primeira rodada o Astra ficou fora: o servidor de modelos devolveu 503 para o provedor dele. Depois ele voltou, e as três partes foram consultadas de novo com o mesmo prompt.

**Regra de decisão:** vence a maioria dos quatro votos. Em empate fica a opção mais conservadora com a regra do relatório, isto é, a que não afirma mais do que os dados mostram e não esconde fato comprovado.
- Entre F e S, quando há fato documentado, fica F.
- Entre N e S, quando há sinal que não se separa, fica N.
- No resultado, fica "não excluído".

Os empates foram:
- veredito: H13 (N), H14 (F), H19 (F) e H20 (F);
- resultado: H01, H11, H19 e H21, todos "não excluído".

Legenda:
- **R** refutada; **S** sem sinal nos dados públicos; **F** fato que pede explicação; **C** confirmada; **N** não decidível com dados públicos.
- Resultado: **nao** = efeito máximo abaixo da margem de 4.430.191; **nao_excluido** = os dados públicos não limitam o efeito abaixo da margem; **sim** = efeito capaz de mudar o vencedor.

| Hipótese | Astra | Grok | Kimi | Claude | **Veredito** | **Resultado** |
|---|---|---|---|---|---|---|
| H01 títulos de falecidos | N/nao_exc | S/nao_exc | F/nao | F/nao | **F** | **nao_excluido** (empate) |
| H02 excesso sem digital por seção | F/nao | F/nao | F/nao | F/nao | **F** | **nao** |
| H03 soma ≠ oficial | R/nao | R/nao | R/nao | R/nao | **R** | **nao** |
| H04 arquivos alterados | N/nao_exc | R/nao | R/nao | R/nao | **R** | **nao** |
| H05 mesários liberando outros | F/nao_exc | S/nao_exc | S/nao_exc | N/nao_exc | **S** | **nao_excluido** |
| H06 horário estendido | N/nao | S/nao | R/nao | S/nao | **S** | **nao** |
| H07 urnas antigas de propósito | N/nao_exc | R/nao | R/nao | R/nao | **R** | **nao** |
| H08 sequência impossível | S/nao | R/nao | R/nao | R/nao | **R** | **nao** |
| H09 sigilo | F/nao_exc | F/nao | F/nao | F/nao | **F** | **nao** |
| H10 crescimento maior que o disponível | R/nao_exc | R/nao | R/nao | R/nao | **R** | **nao** |
| H11 cartão repetido / troca no caminho | N/nao_exc | S/nao | S/nao_exc | R/nao | **S** | **nao_excluido** (empate) |
| H12 QR do e-Título | N/nao_exc | R/nao | N/nao_exc | N/nao_exc | **N** | **nao_excluido** |
| H13 liberados sem digital no 13 | N/nao_exc | S/nao_exc | S/nao | N/nao_exc | **N** (empate) | **nao_excluido** |
| H14 urnas reserva | F/nao | S/nao | F/nao | S/nao | **F** (empate) | **nao** |
| H15 votos em bloco no lugar de ausentes | N/nao_exc | S/nao_exc | S/nao_exc | S/nao_exc | **S** | **nao_excluido** |
| H16 sessão fora da máquina de estados | R/nao_exc | R/nao | R/nao | R/nao | **R** | **nao** |
| H17 supressão de voto na mesa | N/nao_exc | N/nao_exc | F/nao_exc | S/nao_exc | **N** | **nao_excluido** |
| H18 inserção uniforme num município | N/nao_exc | S/nao | S/nao_exc | S/nao_exc | **S** | **nao_excluido** |
| H19 falha de digital provocada | F/nao_exc | S/nao | F/nao | S/nao_exc | **F** (empate) | **nao_excluido** (empate) |
| H20 relógio adulterado | F/nao_exc | F/nao | S/nao | S/nao | **F** (empate) | **nao** |
| H21 compra de voto pelo RDV | N/nao_exc | R/nao | S/nao | S/nao_exc | **S** | **nao_excluido** (empate) |
| H22 exterior e fluxo especial | N/nao_exc | S/nao | S/nao | S/nao | **S** | **nao** |
| H23 recarga fora da cerimônia | F/nao | F/nao | F/nao | S/nao | **F** | **nao** |
| H24 trânsito e atributos especiais | N/nao_exc | S/nao | S/nao | S/nao | **S** | **nao** |
| H25 certificado da AC URNA vencido | F/nao_exc | F/nao_exc | F/nao | F/nao_exc | **F** | **nao_excluido** |
| H26 virada por zona | S/nao_exc | S/nao_exc | S/nao_exc | S/nao_exc | **S** | **nao_excluido** |
| H27 pacote trocado / seção fantasma | F/nao_exc | F/nao | F/nao | F/nao | **F** | **nao** |

**Totais:**
- veredito: 0 confirmada, 6 refutadas, 9 fatos que pedem explicação, 9 sem sinal e 3 não decidíveis;
- resultado: nenhuma hipótese tem evidência de efeito capaz de mudar o vencedor; em 15 o efeito máximo fica abaixo da margem; em 12 os dados públicos não limitam o efeito.

**Onde o Claude cedeu:**
- H11: ficou S, não R, porque o caminho do resultado até a totalização não é público.
- H23: ficou F, porque 502 recargas sem motivo escrito e 55 com mídia refeita são falha de registro comprovada.
- H05: ficou S, com o ponto cego declarado no texto.

**O que é comum aos 12 "não excluído":** um voto trocado, posto no lugar de ausente ou espalhado por igual, gravado por programa ou pessoa de forma coerente em todos os arquivos, não deixa marca em nenhuma conta sobre os arquivos públicos. Os testes mostram que isso não aconteceu de forma concentrada. A forma espalhada só se fecha com a integridade do programa (código-fonte contra os binários lacrados, Teste de Integridade) ou com o caderno de votação, nada disso público.

## Frases finais (linguagem simples, para o relatório)

- **H01:** O cadastro tem mais eleitores de 100 anos ou mais do que o Censo conta de pessoas com essa idade: são títulos antigos que não foram limpos. No 1º turno quase nenhum deles votou, e nada mostra uso em massa. Os arquivos públicos não dizem se algum título de pessoa falecida, de qualquer idade, foi usado.
- **H02:** Quase todo o excesso de eleitores liberados sem digital são pessoas que o arquivo da urna mostrava com foto e sem digital. Sobram poucas seções, com algumas centenas de liberações, em que a mesa liberou mais gente à mão. Só o caderno de votação explica por quê.
- **H03:** A soma dos boletins das urnas é igual ao resultado oficial, em todos os campos, nos dois turnos. Isso foi conferido por mais de um caminho independente.
- **H04:** Nenhum arquivo foi mexido depois de sair da urna, e nenhuma urna recebeu voto sem antes conferir o próprio programa. Um programa alterado e assinado com a chave oficial não apareceria nesses arquivos.
- **H05:** O teste veria mesários pondo gente no lugar de eleitores de forma concentrada em poucas seções, e isso não aparece. Uma inserção miúda, de 1 a 3 votos em muitas seções, passaria sem sinal.
- **H06:** Depois das 17h foram 34.315 votos. Mesmo todos de um lado só, não chegariam a 1% da diferença. A ordem em que os boletins foram registrados não muda a soma.
- **H07:** Todo modelo de urna lê digital, então a urna antiga não serve para dispensar a digital.
- **H08:** Nenhum eleitor votou mais depressa do que uma pessoa consegue, nos dois turnos.
- **H09:** O registro público da urna traz o número do título de quem estava na cabine quando a mesa interrompeu a votação, com hora e desfecho. Não diz em quem a pessoa votou, salvo numa seção em que todos votaram no mesmo candidato.
- **H10:** O 13 não ganhou mais votos do que havia para ganhar em todos os estados. Em 6 estados, o ganho só fecha com eleitores que mudaram de lado ou com eleitores diferentes em cada turno, e os arquivos públicos não dizem qual.
- **H11:** Nenhum cartão, urna ou código de carga apareceu em duas seções do mesmo município ou zona, e cada resultado vem assinado pela própria urna. O caminho do resultado até a totalização não é público.
- **H12:** A urna não lê nem registra o e-Título. Se o código do e-Título pode ser forjado, só um teste de laboratório com títulos de voluntários responde.
- **H13:** No Nordeste, as seções que liberaram mais gente sem digital não votaram mais no 13 do que as vizinhas. Em MG e no RS há um padrão que já existia em 2022. Como o voto é secreto, os dados públicos não dizem se é o jeito de votar desses eleitores ou outra coisa com o mesmo formato. Mesmo que todos esses votos tivessem sido trocados, o resultado não mudaria.
- **H14:** As seções com urna reserva votaram como as vizinhas. Há falhas de controle comprovadas: urna reserva aceita fora da zona para a qual foi preparada, e reservas cujo leitor não reconhecia os mesários. Não há sinal de manipulação.
- **H15:** O teste não achou votos em bloco no lugar de ausentes, mas só enxerga blocos bem marcados. Um voto no lugar de ausente feito aos poucos não aparece nos arquivos.
- **H16:** Todo voto registrado teve eleitor liberado antes, e todo eleitor liberado teve um fim registrado (votou ou saiu), nos dois turnos.
- **H17:** Os registros mostram atendimentos interrompidos e alguns votos não gravados. Não permitem saber se alguém foi mandado embora de propósito sem deixar registro.
- **H18:** Nenhuma cidade tem urnas parecidas demais entre si. Uma mudança igual num estado inteiro não seria vista por este teste.
- **H19:** A falha da digital não puxou voto para nenhum lado. Mas algumas seções liberaram muitos eleitores sem ler dedo nenhum. Num caso, o mesmo mesário liberou 47 de 54 com o leitor funcionando, e isso pede explicação.
- **H20:** Nenhuma urna gravou voto fora do horário ou fora de ordem. Uma urna estava com o relógio quase uma hora atrasado, o que atrasou a abertura da seção sem criar nem tirar voto.
- **H21:** Nenhum voto nulo raro apareceu concentrado como senha de compra de voto. Um esquema com número comum ou diferente em cada seção não seria visto.
- **H22:** O voto no exterior não teve anomalia de processo. Todos os eleitores do exterior juntos ficam abaixo da diferença.
- **H23:** As urnas recarregadas votaram como as vizinhas. Mas 502 recargas do 1º turno ficaram sem motivo escrito e 55 tiveram a mídia refeita. Só a ata do cartório explica.
- **H24:** As contas pegariam eleitor inventado ou mudado de seção, desde que o cadastro publicado seja o verdadeiro. Todos os eleitores em trânsito juntos ficam abaixo da diferença.
- **H25:** O certificado das urnas antigas venceu antes da eleição e ainda assim assinou 54 urnas depois. Os votos dessas urnas não diferem dos das outras. Um programa alterado e assinado com essa chave não apareceria nos arquivos.
- **H26:** A virada para o 13 aconteceu em quase todas as zonas, sem zona fora da curva a favor dele. Uma troca de votos espalhada por igual no país teria a mesma aparência, e nenhum arquivo de resultado separa uma coisa da outra.
- **H27:** Nenhum resultado foi trocado e não há seção fantasma. Algumas urnas que não estavam em nenhuma lista prévia pedem explicação, entre elas duas da BA.
