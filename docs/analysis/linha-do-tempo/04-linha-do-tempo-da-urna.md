# 04. Linha do tempo da urna: carga, abertura, reinícios, encerramento e BU (2º turno)

Auditor C. Horários em Brasília pelo fuso do [01](01-fuso-horario.md). Premissa 8: só conta como controle o que deixa rastro técnico.

## Comandos

```bash
node scripts/auditoria/tempo-perfil.mjs --turno 2      # resumo.json (linhaDoTempo), linha-do-tempo-anomalias.csv
node scripts/auditoria/tempo-reinicios.mjs --paralelo 4   # reinicios.json: causa de cada religamento (≈1,5 min)
node scripts/auditoria/tempo-conferir.mjs --secao ac/01392/0009/0225 --min-intervalo 0 --min-hab 0
node scripts/sql.mjs "select ... from secao where turno=2 ..."   # emissão × encerramento (banco)
```

## Hipótese nula

A urna é carregada antes do 1º turno, abre às 8h, fica ligada até as 17h, encerra e emite o BU em poucos minutos. Desvios vêm de falha de equipamento ou de energia e deixam rastro no log.

## Fatos (29/10/2026, 499.206 seções com log)

### Carga

- 496.962 urnas foram carregadas entre 15/09 e 04/10, a carga do 1º turno, e serviram nos dois turnos. 2.245 foram carregadas entre 09/10 e 25/10 (1.970 de seção e 275 de reserva), 709 delas em 24/10 (`resumo.json`, `cargaPorData`).
- **5 urnas foram carregadas no próprio dia 25/10**, horas antes de abrir: MS 90514/0008/0486, MS 91650/0051/0044, PR 74918/0056/0037 (carga às 09:20, abertura às 10:02:54), PR 75833/0043/0397 (10:04 e 10:51:03) e SP 61816/0016/0436 (07:58 e 08:32:01). **Hipótese:** urna trocada antes da abertura. **Recomendação:** conferir os lacres dessas 5 (H04, `src/lacres.js`).

### Abertura

- 0 urna pronta antes das 8h de Brasília. 0 voto antes das 8h. Mediana de `Urna pronta`: 08:00:01; p99: 08:05:46.
- 927 seções abriram depois das 08:15; 88 depois das 09:00; 18 depois das 10:00 (lista em `linha-do-tempo-anomalias.csv`, `urna_pronta_apos_10h_bsb`). A pior foi MG 46477/0134/0295: a urna só foi ligada às 13:00:02 (1ª linha do dia) e abriu às 13:08:44, com 9 votos de 25 aptos.
- Em 5 seções com 1 log, o BU diz que a abertura foi às 08:00:01, mas o 1º `Urna pronta` do log é de 15 a 42 min depois: CE 15296/0011/0258, PE 23370/0035/0045, PE 23515/0054/0003, RJ 60011/0191/0045 e SP 71072/0420/0322. Em PE 23370/0035/0045, o log registra `Carga da bateria: CRÍTICA` às 07:17, nenhuma linha até 08:04 (urna religada, sem desligamento registrado) e `Urna pronta` às 08:42:27. **Hipótese:** a urna entrou em votação às 08:00:01, perdeu energia e o fim do log se perdeu; ou então o BU usa outra fonte para a abertura. Pendente.

### Religada durante a votação

- **13.385 seções (2,7%), 23.081 religamentos** entre `Urna pronta` e o encerramento (`reinicios.json`).
  - 17.787 foram desligamentos pela chave: 7.210 logo depois de um erro registrado e 10.577 sem erro.
  - 5.294 não têm desligamento registrado (queda de energia ou travamento): 705 depois de erro e 4.589 sem erro.
- Erros antes do religamento: falha na captura da digital (5330: 2.832; 5243: 466; 5314: 151; 5306: 113) e falha no microterminal do mesário (`Erro (12) exibindo imagem`: 2.656). Os próprios erros mandam "Desligue e ligue a urna". Em 285, o erro foi `Erro inesperado durante a votação | O voto do eleitor NÃO foi registrado (5362)`.
- Tempo parada: mediana de 68 s; p90 de 6,5 min; p99 de 37 min; máximo de 3h11.
- Caso extremo: AC 01392/0009/0225, 11 religamentos, todos depois do erro 5330 do leitor biométrico (conferido no log bruto).
- **Volta Redonda (RJ 59250), zona 0090:** em 20 seções, a urna foi desligada pela chave às 17:00:30 (`Votação suspensa`, sem encerrar), ficou desligada cerca de 2h30 e foi religada entre 19:1x e 19:4x, já na bateria interna (`Urna operando com bateria interna`), só para encerrar. Não houve voto depois das 17:00:41 (conferido em 0397). **Hipótese:** falta de energia no local ou erro de procedimento. As urnas ficaram desligadas e sem BU por 2h30, e a integridade nesse caso depende das assinaturas (H04).
- **Hipótese:** o "voto não registrado" (5362) é seguido de nova votação do mesmo eleitor. **[a confirmar]** no log: conferir se o mesmo atendimento termina em `computado` depois do religamento.

### Encerramento e BU

- 0 encerramento antes das 17h, pela trava técnica (ver [02](02-votos-apos-17h.md)). 0 voto depois do encerramento do BU. 0 BU com data de encerramento fora de 25/10.
- Tempo da emissão do BU depois do encerramento (banco, `emissao − encerramento`): até 4 min em 493.529 seções; de 5 a 14 min em 4.408; de 15 a 59 min em 873; de 1 a 2 h em 358; 2 h ou mais em 39. O máximo é 2h45 (RJ 59250/0090/0232).
  - Os atrasos longos ficam entre o encerramento e o fim do registro de mesários: por exemplo, AC 01082/0004/0440 encerrou às 17:02:07 e o `Inicio do Encerramento` foi às 19:00:08, depois de repetidos `Operador indagado se finaliza registro mesários`. Entre o encerramento e a emissão não há votos.
- 5 seções não têm `Inicio do Encerramento` no dia, mas têm BU (ES 57932/0009/0112, MG 46256/0131/0046, RS 89630/0072/0054, SC 83593/0008/0143, SP 61654/0014/0250). **Hipótese:** BU gerado depois de religar, com o log dessa parte em outra mídia. Pendente.

### Contingência

- 5.712 seções com urna de contingência (`tipoUrna` 4) e 11.748 pacotes com mais de um log. Em 3 deles, a leitura duplica registros (ver [03](03-intervalos-minimos.md)).

## Recomendações

1. Conferir H04 (lacres) nas 5 urnas carregadas no dia da eleição e nas 20 de Volta Redonda (zona 0090), religadas 2h30 depois.
2. Pedir ao TRE-RJ a ocorrência registrada na ata da zona 0090 de Volta Redonda **[a confirmar]**.
3. Repetir no 1º turno quando os perfis terminarem.
