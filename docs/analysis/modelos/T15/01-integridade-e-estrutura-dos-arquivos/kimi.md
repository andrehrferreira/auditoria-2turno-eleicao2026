Revisão do tópico **01-integridade-e-estrutura-dos-arquivos.md**. Sem acesso aos dados: só conferência aritmética e interna possível.

| # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade |
|---|---|---|---|---|
| 1 | "No total foram 24 conferências nesta seção" / "24 de 24 conferências positivas" | 1 e 3 | Total não reproduzível a partir da tabela. Contagem por sub-item: 1 (hash pacote) + 6 (tamanho+hash de BU/RDV/diário × 2 listas, ou 12 se separado) + 2 (hash das 2 listas) + 11 (lacres dos arquivos) + 1 (lacre lista) + 8 (elos) + 2 (lacres último elo) + 1 (mesma urna) + 1 (assinatura AC) + 1 (validade) = **34** (ou 40, ou 28, conforme contagem). 24 só sai se "11 de 11 válidos" for contado como 1 — contradiz próprio rótulo "11 de 11". Falta decomposição que feche em 24. | Alta |
| 2 | "quase 10 mil linhas" | 4 | Aproximação explícita ("quase"). Regra dura: número exato de linhas ou "Pendente". | Média |
| 3 | "1,5 KB", "4,9 KB", "174 KB compactado, 940 KB aberto", "61 KB" | 4 | Tamanhos aparentam arredondamento (BU exato em bytes improvável ser 1,5 KB redondo). Regra: tamanho exato em bytes (conferível no pacote de lacres, que lista tamanho de cada arquivo) ou "Pendente". | Média |
| 4 | "A conferência de todo o país depende do download completo, em andamento" + próximo passo "ao fim do download" | 3 | Tabela nacional anexada, gerada 2026-10-29 (mesma data dos downloads registrados no tópico), cobre "Todas as seções do 2º turno; nenhuma amostra" — 499.177 seções com log. Universo completo pressupõe download concluído. Contradição direta com "em andamento". Ou download acabou (corrigir frase), ou tabela não é universo completo (corrigir tabela). | Alta |
| 5 | "Há dois limites, explicados adiante" | 3 | Seção "Limites desta conferência" lista **4** itens numerados. Contagem não bate. | Baixa |
| 6 | "O mesmo teste foi rodado em todas as 2.270 seções com urna do Acre, e nenhuma falhou" | 5 | Método descrito cobre só Ed521 (UE2020). Próprio tópico lista como pendente urnas 2013/2015 (ECDSA). Se AC tem seção com urna antiga, "todas... nenhuma falhou" é mais forte que evidência — texto não esclarece se AC é 100% UE2020. | Baixa |
| 7 | "as 8 linhas de votos (4 de Presidente, 4 de Governador)" | 2 | 2º turno com Governador só existe em UF com segundo turno estadual. Aritmética interna fecha (4+4=8), mas presença de Governador em seção do ES não é verificável pelo texto nem pela tabela nacional (só Presidente). Sem explicação, leigo pode ler como erro. | Baixa |

**Números conferidos sem problema: 8**

- "A urna gerou **11 arquivos**... O portal publica **4**... Os outros **7**" → 11 − 4 = 7 ✓
- "**2.270** (3.310 cópias... **1.040** seções... dois caminhos)" → 2.270 + 1.040 = 3.310 ✓
- AC **2.270** seções = tabela nacional, linha AC "Seções com log" 2.270 ✓
- "**8** linhas de votos (**4** de Presidente, **4** de Governador)" → 4 + 4 = 8 ✓ (2 candidatos + brancos + nulos por eleição)
- "**2 de 2** válidos" lacres último elo = 2 eleições (Presidente, Governador) ✓
- Validade "**2022 a 2036**" contém 25/10/2026 ✓
- Contraprova: "**três problemas**" = 3 itens listados (hash do arquivo, elos, último elo vs lacre) ✓
- Data "25/10/2026" = data oficial do 2º turno ✓

Nota: "24 de 24" em Alcance é internamente consistente com "24 conferências... todas positivas", mas não entra na lista acima porque o total 24 em si não fecha (achado #1).