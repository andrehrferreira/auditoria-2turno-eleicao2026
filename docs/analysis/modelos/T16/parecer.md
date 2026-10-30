# Parecer do coordenador sobre a T16 (GPT Astra, revisão do método da integridade)

Resposta: [astra.md](astra.md). Lida em 29/10/2026, junto com o parecer cético [24](../../cetico-revisor/24-integridade-h04-h11.md), que saiu no mesmo dia.

| Item | Decisão | Por quê / o que mudou |
|---|---|---|
| 1. Uniformidade dos seriais FV | Já respondido | Parecer 24, item 5: pelos 16 bits altos observados o esperado é 29,02 (contra 29,01 uniforme); primeiro dígito uniforme (χ² = 13,5, 15 g.l.) |
| 2. Poder contra reuso deliberado de poucos cartões | **Aceito como limite** | A contagem nacional não vê poucos pares a mais. Teste com poder, a fazer: nos 29 pares, um mesmo cartão físico não pode estar nas duas urnas durante o dia inteiro; conferir no log que as duas seções votaram com o cartão inserido no mesmo horário. **Pendente** no doc 03 |
| 3. Denominadores (00000000, pares × valores, cartão que fica na mesma seção) | Em parte respondido | n = 499.177 sem `00000000` (parecer 24). Falta conferir no script entre turnos se o cartão que continuou na mesma seção fica fora da contagem de "outra seção". **Pendente** |
| 4. Cópia seguida de bifurcação | Recusado | A classe "cópia" exige que um dos lados não tenha nenhuma linha exclusiva na janela comum. Uma bifurcação deixa linhas exclusivas nos dois lados e cai em "sobreposição real", que deu 0 |
| 5. MR "no mesmo minuto" | Aceito em parte | Redação: a conclusão sobre a MR fica condicionada à validação do pacote e à totalização. O parecer 24 achou 3 computadores com pares de MR na mesma zona (hipótese de pouca entropia) |
| 6. Erro seguido de sucesso | Aceito como limite (já no doc 07) | Testes sugeridos (recorrência por arquivo, modelo e lote; tempo até o sucesso) viram **Recomendação** |
| 7. Votos depois do erro como exposição, não voto alterado | Já no doc 07 | O doc já diz que o log é cumulativo, que os votos são contados uma vez por seção × urna × dia e que 138 = 128 + 10 trocas |
| 8. "32 deles" aplicado a 138 | **Aceito, corrigido** | Doc 07: são 41 eventos internos com voto depois (32 sem nova carga + 9 de urnas trocadas depois) |
| 9. Coerência ≠ prova de que nada mudou | **Aceito, corrigido** | Doc 04, "Limite": quem prova é a assinatura; no RED os identificadores estão sob a assinatura da recuperadora |
| 10. RED: comparecimento não autentica escolhas | Já respondido | BU = RDV em 539.815 pares seção × cargo no 2º turno, RED incluído (`coerencia-contagem`) |
| 11. Trocas entre turnos | Aceito | É o Pendente já registrado no doc 03 (1.562 trocas, 81 urnas) |
| 12. Seleção de pacotes exclui falhas | **Aceito** | A conferência de assinaturas do 1º turno (rodando) precisa listar todo diretório descartado e o motivo. **Pendente** |
| 13. "Todas as conferências criptográficas" | Aceito em parte | AC vencida já registrada (R3). 1º turno sem assinaturas = Pendente (parecer 24) |
| 14. Doc 05 desatualizado | **Aceito, corrigido** | 12.966 aninhados (12.964 com linha de versão + 2 sem); 1º turno incluído (499.207 BUs e logs, versão única) |
| 15. Cadeia de hashes interna do log não conferida | **Aceito** | O hash do `log.jez` está na lista assinada, mas a cadeia linha a linha do `logd.dat` não foi testada. **Recomendação**: script que refaz a cadeia em todos os logs |

Nenhuma resposta do modelo mudou status de hipótese.
