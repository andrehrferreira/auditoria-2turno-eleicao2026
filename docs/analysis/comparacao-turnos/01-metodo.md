# Comparação da mesma seção entre 1º e 2º turno: método

Objetivo: achar seções cuja mudança do 1º para o 2º turno foge do padrão, para olhar uma a uma. **Os alertas são triagem exploratória, não prova nem teste calibrado de fraude** (revisão T03, achado A4).

- Código: `src/comparar-turnos.js`, método **v2** (29/10/2026, revisado pelo GPT Astra: [parecer](../modelos/T03/parecer.md)).
- Entrada: perfis por seção dos dois turnos (`data/parsed/<t>t/perfil/<uf>.jsonl`, gerados por `src/perfil-secoes.js` a partir do BU e do log).
- Saída:
  - `data/parsed/comparacao-turnos/<uf>.jsonl`: todas as seções, da maior pontuação para a menor;
  - `<uf>.resumo.json`: cobertura e contagem por alerta;
  - `suspeitas.jsonl`: registro único das seções com alerta, com identificador `S00001`…;
  - `resumo-nacional.json`.
- Como rodar: `node src/comparar-turnos.js` (todas as UFs, na ordem de `UFS`) ou `--uf ac,al`. A consolidação roda no fim e só junta UFs geradas pelo mesmo método.

## O que se compara

Seção = mesmo município, zona e número nos dois turnos. Ficam de fora, e são contadas no resumo (`cobertura`):
- seções que só existem num turno;
- seções com mais de um pacote num dos turnos;
- seções com BU de apuração (`tipoUrna` 3) em algum turno, porque esse BU vem com comparecimento 0. São 2 em MG e 29 no exterior.

Urnas de contingência (`tipoUrna` 4) entram normalmente.

| Métrica | Conta | Denominador |
|---|---|---|
| `comparecimento` | Δ comparecimento | aptos da seção no 1º turno (sem trânsito) |
| `semBiometriaCadastrada` | Δ eleitores sem biometria cadastrada que votaram | idem |
| `manualSemMesario` | Δ liberações manuais sem associação nominal a mesário | idem |
| `jaVotou` | Δ "eleitor identificado já votou" | idem |
| `ganho13`, `ganho22` | Δ votos do finalista | idem |
| `residuo13`, `residuo22` | ganho que eliminados, aumento de comparecimento e queda de brancos/nulos não cobrem (resíduo contábil líquido; **não** identifica eleitor que trocou de candidato) | comparecimento do 2º turno |

## Tipos de alerta

| Tipo | Quando |
|---|---|
| estatístico | z robusto ≥ 5 em relação às vizinhas **e** desvio de pelo menos 10 eleitores em relação à mediana delas. Vizinhas = seções da mesma zona no município; se forem menos de 10, o município; se ainda forem poucas, a UF. Escala = MAD × 1,4826 ou, se o MAD for zero, desvio absoluto médio × 1,2533 |
| contábil | Migração mínima obrigatória ≥ 10: votos do finalista no 2º turno acima de (votos dele no 1º + eliminados + brancos/nulos + abstenção do 1º + novos aptos). Só fecha com eleitor que votou no outro finalista no 1º turno |
| consistência | Soma dos votos ≠ comparecimento num turno; ou mais liberações "pelo mesário" do que liberações manuais |
| cadastral | Aptos da seção mudam mais de 5 entre turnos, ou comparecimento > aptos (com trânsito) |

Cada suspeita leva o contexto operacional que pode explicá-la sem fraude: urna trocada, modelo, mesários em comum com o 1º turno.

## Limites conhecidos

- O limite |z| ≥ 5 não tem taxa de falso alerta calibrada. Falta simulação sob um modelo nulo.
- A seção entra na própria referência (mediana). O efeito é pequeno em grupos de 10 ou mais.
- **Aptos mudam entre turnos com o voto em trânsito:** no AC, +174 nas seções contra −201 em trânsito. Sobra uma queda líquida (−27 no AC, −45 em AL) ainda **[a confirmar]**.
- Seções com vários pacotes (agregadas, contingência) ficam fora até haver reconciliação.
- Votos são secretos: nenhuma métrica identifica em quem um eleitor votou. A migração mínima é limite contábil sobre totais.

## Resultado piloto (AC e AL, v2)

AC: 115 de 2.270 seções com alerta. AL: 325 de 7.101. Todos os alertas são estatísticos, a maioria em `manualSemMesario`. Nenhuma migração mínima obrigatória, nenhuma inconsistência de soma ou de cadastro.
