# 01. H26: triagem das zonas com virada para o 13 entre os turnos (plano)

Pedido do André (30/10/2026): triagem de **todas as zonas eleitorais** em que a virada para o 13 (Lula) do 1º para o 2º turno foi grande, separada por região, modelo da urna e horário dos picos de votação. O resultado vira um relatório temático à parte, depois da revisão cética.

Rótulos: **Fato** (sai de script do repo sobre arquivo público), **Hipótese**, **Pendente**. A triagem aponta zonas para olhar de perto. **Não é prova nem teste calibrado de fraude.**

## Pergunta

Há zonas em que o 13 ganhou, do 1º para o 2º turno, muito mais do que a composição do voto da própria zona no 1º turno explica? Se há, essas zonas se concentram numa região, num modelo de urna ou num horário de votação?

## Suposições (dizer se divergir)

1. **"Data de picos de votação" = hora do dia.** Cada turno teve um só dia de votação (04/10/2026 e 25/10/2026). O pico é a hora (de Brasília) com mais votos, lida do log de cada urna (`votosPorHoraLocal`). Se a intenção era a hora em que o boletim chegou ao TSE (totalização), é outra métrica (`recebido_tse` da seção) e entra numa segunda rodada.
2. **Zona = UF + número da zona.** Zona que cobre mais de um município é somada inteira. O exterior (ZZ) entra como região própria.
3. **Os dois lados.** A mesma triagem lista as zonas com virada fora da curva para o 22. Uma triagem que só olha um lado não distingue anomalia de variação normal.

## Dados

- Pares de seções dos dois turnos: `data/parsed/auditoria/estatistico-eleitoral/pares-banco.csv` (499.207 seções, 28 UFs, gerado por `scripts/auditoria/estatistico-pares.mjs banco`).
- Votos de cada candidato eliminado no 1º turno, por seção: `voto_bu` (cargo 1, turno 1) da cópia de leitura.
- Horas de votação: `perfil_log.dados → $.log.votosPorHoraLocal`, nos dois turnos, convertidas para Brasília pelo fuso do município (moda da hora de abertura do BU − 8) e pelas exceções de relógio (`relogio-fora-do-fuso.csv`, linha-do-tempo/07).
- Conferência de universo: soma de 13 e 22 das seções contra o `voto_oficial` (resultado oficial por seção) nos dois turnos.

## Métricas por zona

| Métrica | Conta |
|---|---|
| Virada bruta | margem 13 − 22 no 2º turno menos a margem no 1º, em p.p. dos votos nominais de cada turno |
| Zona que virou | o vencedor da zona no 1º turno (entre todos os candidatos) não é o vencedor no 2º |
| Esperado do 13 e do 22 | por UF, mínimos quadrados por seção, sem intercepto: votos no 2º turno ~ votos do 13, do 22, de Renan Santos (14), Zema (30), Caiado (55), Augusto Cury (70), dos demais somados, brancos+nulos e abstenção, todos do 1º turno |
| **Virada além do esperado** | (resíduo do 13 − resíduo do 22) da zona, em votos e em p.p. dos nominais do 2º turno |
| z robusto | resíduo líquido / √(nominais do 2º turno), centrado na mediana e dividido por 1,4826 × MAD das zonas da mesma região |

O esperado por candidato eliminado é o ponto central: uma zona onde Caiado ou Zema foram fortes no 1º turno pode virar muito só porque o eleitor deles escolheu um lado. Esse caso não deve aparecer como fora da curva.

## Corte da triagem (fixado antes de rodar)

- **Fora da curva:** valor-q de Benjamini-Hochberg < 0,01 (normal, bicaudal, sobre o z robusto) **e** virada além do esperado de pelo menos 2 p.p.
- Listas complementares: as 50 zonas de maior z para cada lado; as 50 de maior virada bruta para cada lado; todas as zonas que viraram.

## Segmentos

1. **Região e UF:** distribuição da virada bruta e da virada além do esperado; zonas fora da curva por região e UF.
2. **Modelo da urna:** dentro da mesma zona, a virada além do esperado da seção por modelo da urna do 2º turno (UE2013, UE2015, UE2020, UE2022), com a média da zona subtraída; seções que trocaram de modelo entre turnos à parte. Zonas fora da curva × demais pela parcela de urnas antigas.
3. **Horário dos picos:** por zona, votos por hora de Brasília nos dois turnos, hora de pico e parcela de votos depois das 15h e das 17h. Zonas fora da curva × demais. Dentro da zona, relação entre a virada da seção e a mudança da parcela tardia.

## Explicações alternativas a descartar

- Transferência dos eliminados (Caiado em GO, Zema em MG) e de brancos/nulos, já no esperado.
- Queda ou alta de comparecimento diferente entre os lados (abstenção diferencial, Norte; cientista-politico/04).
- Zona pequena (variância maior), exterior, seções agregadas ou com aptos que mudaram.
- Padrão histórico: a mesma zona já virava em 2018 e 2022 (**Pendente**: base `munzona` de 2018 e 2022).
- Prorrogação até 19h (H06) e erro de fuso (linha-do-tempo/07) no segmento de horário.
- Relação com H10 (balanço por seção), H14 (urnas de reserva), H18 (município uniforme) e H25 (urnas UE2013/UE2015).

## Saídas

- Script: `scripts/auditoria/virada-zonas.mjs`.
- Dados: `data/parsed/auditoria/virada-zonas/` (`zonas.csv`, `triagem.csv`, `por-regiao.csv`, `por-modelo.csv`, `por-hora.csv`, `resumo.json`).
- Resultado: `02-resultado.md`. Depois, revisão cética; só então o relatório temático em `docs/pericia/temas/`, com o que estiver completo e conferido.
