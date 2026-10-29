# 04. Seções com comparecimento ≥ aptos ou acima de 95% (teste 4, doc 07 A7)

Auditor A (contagem e coerência), 29/10/2026. Princípio 8 (doc 01): "o mesário conferiu", "voto de mesário", "fila" etc. não contam como explicação. Só contam medidas nos arquivos: tamanho da seção, eleitores em trânsito (TTE) e seções agregadas (do BU), e **liberação com ou sem biometria** (contadores do BU e log).

## Hipóteses

- **H0a (impossibilidade):** nenhuma seção tem comparecimento > aptos.
- **H0b (raridade):** o número de seções ≥ 95% é compatível com a variação natural do comparecimento entre seções da mesma zona.
- **H0c (sinal técnico de risco):** nas seções ≥ 95%, a parcela liberada sem biometria (sem biometria cadastrada + por biografia) não é maior que a da zona.

## Método

- Aptos e comparecimento da eleição federal (6258 no 2º turno), do BU. Taxa da zona sem a própria seção.
- **Modelo nulo 1:** binomial(aptos, taxa da zona). Ignora a variação entre seções, então serve só como piso.
- **Modelo nulo 2:** beta-binomial, com a correlação intra-seção (rho) estimada por momentos entre seções da mesma zona.
- **Liberação sem biometria:** `(semBiometria + porBiografia) / comparecimento`, do BU. Em cada seção ≥ 95%, compara-se com a da zona por cauda binomial. Isso é um filtro de triagem; com 639 testes, p < 0,001 ainda dá falsos positivos se a taxa sem biometria também variar entre seções, o que é o esperado (idade, ocupação).

## Resultado: 2º turno (499.207 seções com BU, comparecimento nacional 80,78%)

**Fato.**

- **Comparecimento > aptos: 0 seções.** H0a vale.
- Faixas: < 90%: 484.366 · 90–95%: 14.202 · 95–99,9%: 627 · = 100%: 12.
- **Seções ≥ 95%: 639.** Esperado pela binomial: 22,2. Mas o comparecimento varia **3,21×** mais que a binomial entre seções da mesma zona (rho = 0,0070). Pela beta-binomial, o esperado é **341**.
  - O excesso que sobra (≈ 1,9×) é **Hipótese**: pode vir de um modelo simples demais (um único rho para o país). Seções com cadastro recente ou de TTE têm comparecimento estruturalmente maior.
- **Composição das 639:**
  - por tamanho: 200+ aptos: 251 · 100–199: 228 · 50–99: 141 · 10–49: 19;
  - por tipo de urna: urna de seção 629 · urna de contingência 10;
  - com TTE > 0: 287; em **44**, metade ou mais dos aptos é TTE (ex.: BA 39659/0041/0400, 53/53, todos TTE). Quem pede voto em trânsito escolheu votar ali, então é efeito de seleção, medido no BU;
  - com seção agregada: 12;
  - por UF: CE 86, BA 81, PE 58, MG 51, PA 41, RS 40, SP 39, PI 38, PB 33 e outras.
- **Persistência entre turnos** (13 UFs com 1º turno carregado): das 284 seções ≥ 95% no 2º turno, **124 também passaram de 95% no 1º turno**. A variação mediana do comparecimento foi de +3 eleitores (mínima −6, máxima +26).
- **Sinal técnico:** a liberação sem biometria nas 639 seções é **9,37%**, menor que a média nacional (12,42%). No conjunto, o comparecimento alto **não** vem com mais liberação sem digital. Isso vai contra a hipótese de mesários votando em massa no lugar de ausentes nessas seções.
- **12 seções com 100%:**
  - RN 16454/0036/0069 (163/163);
  - CE 15989/0055/0160 (127/127; também 127/127 no 1º turno);
  - MG 40282/0063/0194 (103/103);
  - SE 32336/0021/0286 (80/80);
  - CE 15415/0044/0193 (69/69; 69/69 no 1º turno);
  - TO 96210/0009/0184 (62/62);
  - BA 39659/0041/0400 (53/53, só TTE);
  - MA 07714/0014/0196 (51/51);
  - PA 04235/0035/0238 (51/51);
  - MG 51110/0237/0371 (40/40);
  - BA 37931/0115/0210 (37/37);
  - MS 90557/0028/0100 (26/26).
  - Em 10 das 12, a liberação sem biometria é **menor** que a da zona. Nenhuma passa no filtro de risco abaixo.
- **Filtro de risco (≥ 95% e liberação sem biometria acima da zona, p < 0,001): 23 seções.** As mais fortes:

| Seção | Comparecimento | Sem biometria seção × zona | p | 1º turno |
|---|---|---|---|---|
| RN 17132/0010/0145 (João Câmara) | 220/229 (96,1%) | 36,4% × 12,9% | 8×10⁻¹⁹ | pendente |
| RS 86959/0091/0085 (Humaitá) | 106/109 (97,2%) | 29,2% × 11,7% | 1×10⁻⁶ | pendente |
| PI 10430/0096/0103 (Campo Maior) | 158/165 (95,8%) | 32,3% × 16,5% | 8×10⁻⁷ | pendente |
| PR 79278/0075/0403 (Toledo) | 107/112 (95,5%) | 26,2% × 9,9% | 1×10⁻⁶ | pendente |
| CE 13897/0095/0104 (Fortaleza) | 376/395 (95,2%) | 18,4% × 9,5% | 9×10⁻⁸ | 352/395 |
| SE 31690/0012/0282 (Lagarto) | 213/223 (95,5%) | 22,5% × 10,4% | 2×10⁻⁷ | pendente |
| PI 10103/0034/0085 (Buriti dos Montes) | 128/133 (96,2%) | 28,1% × 12,7% | 3×10⁻⁶ | pendente |
| PI 10626/0037/0090 (Bela Vista do Piauí) | 341/350 (97,4%) | 23,2% × 14,3% | 9×10⁻⁶ | pendente |

Lista completa: `data/parsed/auditoria/contagem/a7-2t-secoes.csv`, colunas `pct_sem_bio`, `pct_sem_bio_zona` e `p_sem_bio`.

## Conclusão

- **Fato:** nenhuma seção com comparecimento acima dos aptos (H0a).
- **Fato:** há mais seções ≥ 95% (639) do que os modelos simples preveem (22 binomial; 341 beta-binomial). **Hipótese:** heterogeneidade real do cadastro (seções novas, TTE, perfil etário), não testada aqui. Para testá-la, falta o perfil do eleitorado por seção.
- **Fato:** no agregado, essas seções têm **menos** liberação sem biometria que o país. O rastro técnico não sustenta voto em massa no lugar de ausentes.
- **Risco (princípio 8):** 23 seções juntam comparecimento ≥ 95% e liberação sem digital acima da zona. Isso é triagem, não achado.

**Recomendação:**

1. Passar as 23 seções ao auditor de biometria. Ele deve comparar "sem biometria cadastrada" do BU com os aptos sem biometria do `perfil_eleitor_secao` (acima de 100% é impossível, doc 07 B1a), e ver no log as rajadas e o mesário por liberação (B1).
2. Comparar com o 1º turno na mesma seção quando a carga terminar.

## Reproduzir

```bash
node scripts/auditoria/contagem-a7.mjs --turno 2        # resumo + data/parsed/auditoria/contagem/a7-2t-secoes.csv
node scripts/auditoria/contagem-a7.mjs --turno 1        # quando a carga do 1º turno terminar
```

## Pendente

- A7 do 1º turno e coluna "1º turno" completa (14 UFs + ZZ em carga).
- Controle por perfil do eleitorado (idade, biometria cadastrada) por seção.
