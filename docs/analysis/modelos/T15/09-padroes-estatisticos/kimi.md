# Revisão: 09-padroes-estatisticos.md

| # | Trecho exato | Problema (tipo) | Conta refeita / explicação | Gravidade |
|---|---|---|---|---|
| 1 | "Das 64 do 13: 34 em aldeia, 2 em quilombo, 1 em presídio e 29 classificadas como 'comuns'." | 1 – conta errada | 34 + 2 + 1 + 29 = **66**, não 64. Soma não fecha com total declarado (64). Ou um dos parciais errado, ou total errado. | Alta |
| 2 | "Das 715: 243 em aldeia, 89 em presídio, 6 em quilombo e 374 'comuns'." | 1 – conta errada | 243 + 89 + 6 + 374 = **712**, não 715. Faltam 3 seções sem categoria (exterior/temporário?) ou parcial errado. | Alta |
| 3 | "o perfil cobre **cerca de** 478 mil das 499 mil seções" | 4 – "cerca de" | Regra dura: número arredondado não entra. Dar exato ou marcar Pendente. | Média |
| 4 | "centro em 80% a 84% de comparecimento (**cerca de** 156 mil seções nessa faixa)" | 4 – "cerca de" | Mesmo problema. | Média |
| 5 | "a permutação esperava **cerca de** 7" / "o esperado era **cerca de** 26 e 14" | 4 – "cerca de" | Esperado de permutação é saída de script, existe exato. Dar número ou Pendente. | Média |
| 6 | Tabela "Vezes o esperado": "**cerca de** 8", "**cerca de** 6,5", "**cerca de** 11" | 4 – arredondado | Refeito: 517/64 = 8,08; 103/16 = 6,44; 39/3,6 = 10,83. Razões derivadas de números exatos — podem entrar exatas (8,1 / 6,4 / 10,8) ou sair. "cerca de" viola regra. | Média |
| 7 | Tabela redondos: "Percentual múltiplo de 5%": observado **10.972** para o 13 e **10.972** para o 22 | 3 – possível contradição/cópia | Esperados diferem (10.894 vs 10.910) mas observados idênticos. Coincidência possível, improvável. Conferir no `redondos-2t.json` se não é célula copiada. | Média |
| 8 | 1º turno: "Nenhuma seção com comparecimento acima de 100% (**12** com exatamente 100%)" vs 2º turno: "**12** seções tiveram exatamente 100%" | 3 – mesmo valor, universos diferentes | 1º turno parcial (228.269 seções, 15 UFs) e 2º turno completo (499.205) com mesma contagem 12. Coincidência possível, mas exige conferência no JSON dos dois turnos. | Média |
| 9 | "13, esperado pelo modelo: 4.039 + 601 + 17 + 