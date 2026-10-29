## Revisão: 05-soma-dos-boletins.md

| # | Trecho exato | Problema (tipo) | Conta refeita ou explicação | Gravidade |
|---|---|---|---|---|
| 1 | "LULA 64.256.232 / FLAVIO BOLSONARO 59.826.041 / Nulos 2.723.305 / Brancos 1.430.496" | 3 (contradição com tabela de referência) | Soma dos 4 valores: 64.256.232 + 59.826.041 + 2.723.305 + 1.430.496 = **128.236.074**. Tabela nacional: comparecimento (BU) Brasil = **128.235.243**. Votos superam comparecimento em **831**. Voto acima do comparecimento é anômalo (voto é subconjunto do comparecimento). Tópico não mostra total, então contradição não aparece no texto, mas números cruzados não fecham. Exigir explicação (ex.: seções sem comparecimento nominal, divergência BU×CSV) ou marcar Pendente. | Média |
| 2 | "(`votacao_secao_2026_BR.csv`, gerado em 26/10/2026 às 12:07)" | 4 (não verificável) | Data/hora de geração do CSV não conferível só com texto. Se veio de metadado do arquivo oficial, ok; se não, remover ou marcar Pendente. | Baixa |

Sem mais problemas. Demais números batem.

**Números conferidos sem problema: 8**

- **64.256.232 + 59.826.041 = 124.082.273** (votos válidos 13+22) ✓
- **% 13 cruzada:** 64.256.232 / 124.082.273 = 0,51785 → **51,79%**, idêntico ao "% 13 entre 13+22" do Brasil na tabela nacional ✓ (boa consistência interna entre tópico e referência)
- **Universo 499.205** usado de forma consistente em todo tópico ("0 de 499.205", "as 499.205 seções aparecem nos dois lados"); respeita hierarquia 499.248 ⊃ 499.207 ⊃ 499.205 ✓
- **Coluna Diferença = 0** nas 4 linhas: valores idênticos nos dois lados, subtração trivial ✓
- **Contraprova 143 vs 144:** diferença de 1 voto, cenário de teste coerente, sem conta envolvida ✓
- **Caso AC/Bujari/zona 9/seção 3: 81 e 146** — sem total declarado, nada a refazer; não contradiz nada ✓
- **Somas de verificação da tabela nacional (contexto):** 10.317.110+36.335.632+9.595.354+52.895.255+18.711.280+380.612 = 128.235.243 ✓; 7.251.810+8.632.488 = 15.884.298 ✓; 15.884.298/128.235.243 = 12,387% → 12,39 ✓
- **Regra dos 100%:** "Recebida" e 1º turno/demais cargos corretamente marcados como **Pendente**, sem número ✓

Observação sobre força da afirmação: bloco "Prova / Não prova" bem calibrado — não há falso alarme nem falsa absolvição. Único ponto que sustenta ressalva é achado #1: antes de publicar, explicar diferença de 831 entre votos totais e comparecimento, senão crítico externo usa isso contra relatório.