# Parecer sobre T11 (Kimi 3 e GPT Astra): liberação manual sem mesário associado

Respostas: [kimi.md](kimi.md) e [astra.md](astra.md) (hashes em [consultas.jsonl](consultas.jsonl)). 29/10/2026.

**Os dois concordam na leitura principal**, e eu aceito: no passo "digital do mesário" da liberação manual, a urna colhe uma digital. Se ela não bate com um mesário registrado, a urna a grava ("vai salvar a digital em novo arquivo") ou a reconhece como já gravada ("bate com uma digital gravada após o registro inicial"), e **a liberação segue sem associação nominal a mesário**. Quem é o dono dessa digital só o TSE pode dizer, com os arquivos `wsq*` não publicados.

| Achado | Decisão |
|---|---|
| Os números enviados não fechavam (Kimi A3: diferença de 126; Astra A1: 126 e 127) | **Aceito. Erro meu:** eu tinha somado ocorrências de mensagens. Reconciliado por atendimento no AC: 453.654 votos = 415.675 biometria + 15.325 ano de nascimento + 22.654 manual. Os 126 são atendimentos cancelados depois do dado conferido. Registrado no doc 06 |
| Astra A2: o termo certo é "sem associação nominal a mesário", não "sem digital" | Aceito. Doc 06 corrigido |
| Astra A3: o material não prova que a urna aceita **qualquer** digital (pode haver exigência de qualidade de captura) | Aceito como ressalva. Afirmo só que a correspondência com mesário registrado não é condição para liberar |
| Astra A6: "mesma digital liberando 5 eleitores" exige provar que só havia uma digital gravada | Aceito. No caso de ES fica como hipótese forte, não fato |
| Kimi A4 / Astra A4–A5: como separar mesário sem digital registrada, substituto, falha de leitor e registro tardio | Aceito. Vira teste: horário do primeiro "vai salvar" × registros de mesário × falhas de leitura, por seção |
| Kimi A5 / Astra A7: padrões de abuso e limiar | Aceito como triagem, sem limiar de fraude. Entra na comparação entre turnos como métrica `manualSemMesario` |
| Kimi A6 / Astra A9: `wsqman.jez` deve guardar essas digitais | Hipótese plausível pelo nome, não comprovada |
| Kimi A7: o BU não separa liberação manual com e sem mesário | Aceito como recomendação ao TSE |
| Astra A8: "no máximo 1 erro antes de liberar" vale por atendimento, não por eleitor | Aceito. O log não grava o número do eleitor, então não dá para ver tentativas em atendimentos diferentes |

**Fato registrado (AC, 2º turno):** 6.974 dos 22.654 votos liberados manualmente (30,8%) tiveram a digital do "mesário" sem associação nominal, em 733 das 2.270 seções.
