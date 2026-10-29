# 04. Invariantes entre o 1º e o 2º turno na mesma seção

Matemático forense, 29/10/2026. Script: `scripts/auditoria/matematico-turnos.mjs`. Cópia de leitura do banco de 29/10 10:50 UTC, com os dois turnos completos. Entram as 27 UFs; o exterior fica fora porque não tem cadastro por seção no dado aberto. São 497.897 seções presentes nos dois turnos.

## Modelo e prova

O cadastro fecha antes do 1º turno. Numa seção (principal mais as agregadas daquele turno) há N eleitores; B deles têm biometria cadastrada e A = N − B não têm. Em cada turno t, TR_t desses eleitores pediram voto em trânsito e saem da seção, e TTE_t eleitores de fora votam ali. Cada eleitor é de um grupo só, e o grupo não muda entre os turnos. Daí, para quaisquer turnos t e t′:

| # | Invariante | Por quê |
|---|---|---|
| T1 | aptos da seção_t ≤ N | aptos da seção_t = N − TR_t |
| T2 | com biometria_t (biometria + biografia) ≤ B + TTE_t | só quem tem biometria cadastrada entra nessas duas classes do BU |
| T3 | com biometria_t + sem biometria_t′ ≤ N + TTE_t + TTE_t′ | os dois grupos são disjuntos e fixos; vale com t ≠ t′. Só usa N |
| T4 | descritivo: Δ aptos da seção = TR_1 − TR_2 | — |

N e B vêm do `perfil_eleitor_secao_2026_<UF>.zip` (dados abertos, gerado em 14/07/2026), lido com o módulo do auditor B (`biometria-cadastro.mjs`). O limite "sem biometria ≤ A + TTE" é o B1a do auditor B e não foi repetido.

**Princípio 8.** O fechamento do cadastro é um procedimento feito por servidores. Aqui ele não é presumido: T1 e T3 são o teste dele nos dados.

## Resultado

| Invariante | Testadas | Violações |
|---|---:|---:|
| T1 aptos da seção ≤ cadastro, nos dois turnos | 497.507 seções × 2 turnos | **0** |
| T3 limite cruzado entre turnos (só N) | 497.505 | **0** |
| T2 com biometria ≤ biometria do cadastro + TTE | 497.507 × 2 | 30.054 seção×turno: 12.433 no 1º, 17.621 no 2º (10.209 só com a classe "por biometria") |

- 390 seções ficaram de fora porque a seção (ou uma agregada dela) não está no cadastro aberto. Nenhuma seção mudou de agregação entre os turnos.
- **T4 (Fato):** em todas as 497.897 seções, |Δ aptos da seção| ≤ 5 (mínimo −5, máximo +5). 451.006 sem mudança, 28.390 subiram, 18.501 caíram. Soma +10.890 nas seções, contra −11.039 nos aptos em trânsito: sobra −149, que pode ser eleitor em trânsito vindo do exterior ou eleitor que saiu do cadastro entre os turnos. **[a confirmar]**: o arquivo não diz qual das duas.

### T2 não é invariante com esta fonte

**Fato.** As violações de T2 se concentram em MG (19.768 seção×turno), ES (4.347), RJ (2.107), MS (1.349) e SP (1.144). Nas outras 22 UFs são de 0 a 481. O excesso mediano é de 10 a 15 eleitores por seção. Na mesma seção, o BU diz que votaram mais eleitores com biometria cadastrada do que o cadastro aberto diz existir.

**Hipótese (benigna, técnica):** `QT_ELEITORES_BIOMETRIA` do dado aberto não é o mesmo conjunto que a urna trata como "com biometria". A urna confere a digital do eleitor contra um modelo gravado. Se ela habilitou por biometria, o modelo existia na carga. Explicações possíveis:

- data diferente: o dado aberto é de 14/07, a carga da urna é de setembro;
- biometria vinda de outra base, não contada no dado aberto (não verificado; a concentração em poucas UFs pede uma causa por UF);
- critério diferente de "biometria cadastrada".

Nenhuma está confirmada. Até lá, T2 sai do catálogo. Fica só T3, que não depende desse campo.

**Consequência para outros testes (Recomendação):** o B1a do auditor B usa A = N − B do mesmo arquivo. Se B do dado aberto é menor que o da urna, A fica superestimado e o B1a fica mais frouxo, mas não gera falso alarme. Isso vale ao menos em MG, ES, RJ, MS e SP. Falta confirmar com o TSE o significado de `QT_ELEITORES_BIOMETRIA`.

### "Biometria que surge entre os turnos"

Um eleitor sem biometria no 1º turno não pode ter biometria no 2º. Os arquivos não identificam o eleitor, então essa regra só é testável nos agregados da seção (T3), e **T3 tem 0 violação**. Por UF, a parcela "sem biometria cadastrada" do comparecimento é estável entre os turnos (Fato):

| UF | 1º turno | 2º turno |
|---|---:|---:|
| MG | 11,20% | 11,51% |
| ES | 20,91% | 21,08% |
| BA | 4,72% | 4,80% |
| PE | 7,67% | 7,80% |
| AC | 3,66% | 3,38% |

Quando o número absoluto muda (MG +86.034), muda junto com o comparecimento (+406.828). Não há sinal de eleitores trocando de grupo.

**Limite do teste.** T3 só pega troca de grupo grande o bastante para estourar o cadastro. Uma troca pequena numa seção com abstenção alta passa. Esse é um limite matemático: sem o eleitor identificado, nenhum teste agregado vê isso.

## Reproduzir

```bash
node scripts/auditoria/matematico-turnos.mjs              # UFs com os dois turnos no banco
node scripts/auditoria/matematico-turnos.mjs --uf rj,sp   # só algumas
```

Saídas: `data/parsed/auditoria/matematico/turnos.json` (por UF) e `turnos-violacoes.jsonl` (T1, T2 e T3, por seção).
