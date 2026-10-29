# 05. Comparecimento × mortalidade recente, por município

Comando: `node --max-old-space-size=8192 scripts/auditoria/demografo-analise.mjs` (seção `t3_mortalidade` de `resumo.json`; colunas de óbitos em `municipios.tsv`).

## Teste

- **Óbitos esperados ainda no caderno:** óbitos de adultos (15+) residentes no município, média anual de 2023–2024 (IBGE, Registro Civil, tabela 2654) × 171/365 (de 07/05 ao 2º turno) × min(1, R), onde R é a razão eleitores/população do doc 02. Estima quantos eleitores do município morreram depois do fechamento do cadastro. Pelo princípio 8, os óbitos anteriores ao fechamento que o cartório não comunicou também podem continuar no caderno. Por isso o número é um **piso**, não um teto.
- **Hipótese nula:** abstenção ≥ óbitos esperados em todo município (um título de morto não usado é uma abstenção).
- **Sinal de uso:** abstenção menor que os óbitos esperados, ou comparecimento acima do previsto pela idade e pela mortalidade.

## Resultados (Fato, 29/10/2026)

| Medida | Valor |
|---|---|
| Abstenção no 2º turno (Presidente, 5.570 municípios) | 29.973.194 |
| Óbitos esperados de eleitores na janela | ≈ 603.944 |
| Abstenção ÷ óbitos esperados (Brasil) | 49,6 |
| Municípios com abstenção < óbitos esperados | **0** |
| Municípios com abstenção < 2 × óbitos esperados | **0** |
| Spearman: comparecimento × mortalidade adulta | +0,13 |
| Spearman: comparecimento × parcela 70+ | +0,05 |
| Spearman: mortalidade × parcela 70+ | +0,67 |

Regressão municipal do comparecimento no 2º turno (R² 0,07): intercepto 0,823; mortalidade adulta anual +4,77; parcela 70+ −0,10; razão eleitores/população −0,046. Desvio-padrão do resíduo: 4,2 pontos. Só 1 município fica mais de 3 desvios acima do previsto: **Bela Vista do Piauí (PI)**, 3.461 aptos, comparecimento 93,1% no 2º turno (92,7% no 1º) contra 80,2% previstos; R = 1,00; 25 óbitos de adultos por ano; abstenção de 238 contra 11,7 óbitos esperados.

**Conferência de recência (Portal da Transparência do Registro Civil):** os óbitos registrados de 07/05 a 25/10/2026 somam 741.570 no país. Por UF, ficam entre 0,82 (PI) e 1,26 (DF) vezes a média 2023–2024 do IBGE na mesma janela, e perto de 1,1 na maioria. A mortalidade de 2026 não foi atípica a ponto de mudar a conclusão. O portal identifica a cidade só pelo nome e, ao que parece, pela cidade do cartório, não pela de residência **[a confirmar]**. 503 municípios não casaram pelo nome. Por isso ele foi usado só por UF.

## Leitura

- **Fato:** em nenhum município a abstenção chega perto do número de eleitores que morreram desde o fechamento do cadastro. A abstenção é dezenas de vezes maior. O teste por município **não tem poder** para detectar títulos de mortos: os mortos cabem com folga dentro da abstenção, mesmo se uma parte deles tiver "votado".
- **Fato:** a mortalidade não reduz o comparecimento municipal (correlação levemente positiva). Municípios pequenos e envelhecidos do interior comparecem tanto quanto ou mais que os grandes. Isso não indica uso de títulos de mortos por si: o efeito por seção, com controle de município (doc 03), mostra que os grupos muito idosos faltam.
- **Hipótese:** Bela Vista do Piauí tem comparecimento alto e estável nos dois turnos. Candidata a contexto (cientista político) e a exame de habilitação sem biometria no log.

## Recomendação

- O teste útil para H01 é por seção e por grupo sem biometria (docs 03 e 04), não por município.
- Óbitos de 2025 (IBGE, publicação prevista para o fim de 2026 **[a confirmar]**) e o SIM/DataSUS 2025 refinariam a janela. Não foram baixados: o IBGE 2023–2024 mais a conferência do Registro Civil 2026 já mostram folga de 50 vezes.
