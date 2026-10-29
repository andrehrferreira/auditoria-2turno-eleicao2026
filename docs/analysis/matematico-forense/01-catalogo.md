# 01. Catálogo de invariantes: o que não pode acontecer, e quem garante

Matemático forense, 29/10/2026. Um invariante é uma igualdade ou desigualdade que vale em toda seção se os arquivos forem honestos. Uma violação comprovada vale mais que qualquer desvio estatístico. Antes de chamar algo de violação, porém, é preciso provar que o invariante vale de fato: pela especificação do TSE (`spec/*.asn1`, doc 06) ou pela lógica do processo.

## Quem garante cada invariante (princípio 8)

Pelo princípio 8 de [01-premissas](../../01-premissas.md), procedimento humano não conta como garantia. Cada invariante foi classificado pelo que o sustenta:

| Classe | O que sustenta | O que uma violação indicaria | O que o invariante **não** pega |
|---|---|---|---|
| **S** (software) | o programa da urna gera BU, RDV e log, e a urna assina BU e RDV | arquivo alterado depois da urna, urna fora do padrão ou erro nosso de leitura | fraude humana dentro das regras. Um mesário que libera alguém no lugar de um eleitor ausente gera arquivos 100% coerentes |
| **C** (cadastro) | o cadastro fecha antes do 1º turno e alimenta a carga das urnas. Isso é feito por servidores, então é **risco a testar**, não premissa | eleitor que surgiu, sumiu ou trocou de grupo fora do prazo | troca pequena que não estoura nenhum limite |
| **P** (procedimento) | só comportamento humano | — | não entra no catálogo como invariante: vira risco, testado por padrão (auditor B, biometria e mesários) |

**Fato (lógica da construção):** a cadeia de hashes das tuplas do BU usa SHA-512 **sem chave**, sobre dados públicos (doc 06). Quem altera um BU consegue recalcular a cadeia inteira. Sozinha, ela só mostra que o BU não foi corrompido e que o nosso leitor está certo. O controle contra adulteração é a **assinatura da urna** sobre o último hash, que é conferida pelo auditor de integridade (`integridade-lacres.mjs`).

## Catálogo

Legenda: ✔ medido aqui, no país inteiro (2º turno) e nas UFs do 1º turno disponíveis; ↔ medido também pelo auditor A ([03-coerencia-interna](../coerencia-contagem/03-coerencia-interna.md)), e aqui de forma independente; → coberto por outro auditor.

| # | Invariante | Classe | Prova | Onde |
|---|---|---|---|---|
| I1 | Cadeia de hashes: cada tupla recalculada = gravada; `ordemGeracaoHash` = posição no cargo; último hash recalculado = `ultimoHashVotosVotavel` | S | README do pacote de formatos do TSE (doc 06) | ✔ [03](03-cadeia-e-escolhas.md) |
| I2 | `quantidadeEscolhas` do RDV = vagas do cargo (1 em presidente, governador, deputados e prefeito; 2 em senador no 1º turno de 2026) | S | spec/rdv.asn1. Em 2026 se renovam 2/3 do Senado, 2 vagas por UF (CF, art. 46, § 2º) | ✔ [03](03-cadeia-e-escolhas.md) |
| I3 | Registros do RDV no cargo = escolhas × comparecimento do tipo de cargo | S | o RDV tem um registro por escolha de cada eleitor; voto suspenso vira `nuloAposSuspensao`, sem sumir | ✔ [03](03-cadeia-e-escolhas.md) |
| I4 | Σ votos do BU no cargo = escolhas × comparecimento | S | idem, agregado | ✔↔ |
| I5 | Cargos do RDV = cargos do BU | S | os dois saem da mesma votação | ✔ |
| I6 | Detalhamento do comparecimento: sem biometria + biometria + biografia = comparecimento | S | spec/bu.asn1: o detalhamento particiona quem votou | ✔↔ |
| I7 | aptos = aptos da seção + aptos em trânsito (TTE), por eleição | S | spec/bu.asn1 | ✔↔ (A6) |
| I8 | Aptos da seção iguais nas eleições federal e estadual | C | o eleitor original da seção vota nas duas | ✔ |
| I9 | Comparecimento da eleição federal = comparecimento do BU; 0 ≤ federal − estadual ≤ aptos federal − aptos estadual | S+C | todo eleitor vota para presidente; só o eleitor em trânsito de outra UF fica fora da estadual | ✔ |
| I10 | Log: todo voto computado fecha uma habilitação aberta; habilitações = votos computados + suspensos sem voto + interrompidas | S | ciclo do eleitor (doc 06) | ✔ [02](02-ciclo-do-eleitor.md) |
| I11 | Log, por cargo: confirmações + nulos atribuídos por suspensão = escolhas × comparecimento do cargo | S | a urna só computa o voto depois de passar por todos os cargos | ✔ [02](02-ciclo-do-eleitor.md) |
| I12 | Nulos por suspensão no log = votos "após suspensão" do RDV, por cargo | S | as duas coisas saem do mesmo evento | ✔ [02](02-ciclo-do-eleitor.md) |
| I13 | Classes de habilitação no log (biometria, ano de nascimento, dado pessoal) somam os votos computados e batem com o detalhamento do BU | S | idem | ✔↔ |
| I14 | Nenhum voto fora da janela (antes de "Urna pronta" ou depois do início do encerramento) | S | — | ✔ |
| I15 | Aptos da seção ≤ eleitores da seção no cadastro, nos dois turnos | C | o cadastro fecha antes do 1º turno | ✔ [04](04-entre-turnos.md) |
| I16 | Com biometria num turno + sem biometria no outro ≤ cadastro + TTE dos dois turnos | C | o eleitor não troca de grupo entre os turnos | ✔ [04](04-entre-turnos.md) |
| I17 | Com biometria ≤ biometria no cadastro aberto + TTE | C | **refutado como invariante**: o campo do dado aberto não é o da urna | [04](04-entre-turnos.md) |
| I18 | Toda linha do log é uma mensagem do catálogo, com hash de 16 caracteres hexadecimais | S | formato do log (doc 06) | **não medido**. Proposto depois do log corrompido de RJ 60011/0008/0061 ([02](02-ciclo-do-eleitor.md)) |
| — | Liberação por ano de nascimento ≤ sem biometria no cadastro (B1a) | C | — | → auditor B |
| — | Comparecimento ≤ aptos (A7); BU = RDV; votos computados no log = comparecimento; BU = oficial | S | — | → auditor A |
| — | Assinatura da urna sobre BU, RDV e log | S | — | → auditor de integridade |

## Resultado em uma tabela (29/10/2026)

**Fato**, salvo onde está marcado. Os dois turnos, país inteiro: 499.207 pacotes com BU em cada turno nos brutos, e o banco completo (cópia de leitura de 29/10 10:50 UTC).

| # | 2º turno | 1º turno |
|---|---|---|
| I1 cadeia | 0 em 2.091.951 tuplas | 0 em 67.858.974 tuplas |
| I2 escolhas | 0 (tudo 1) | 0 (senador 2, o resto 1) |
| I3–I5 RDV e BU × comparecimento | 0 | 0 (depois de somar as partes do RDV do Sistema de Apuração misto) |
| I6–I9, I14 | 0 fora do formato do Sistema de Apuração | 0 fora do formato do Sistema de Apuração |
| I10 habilitações | resto 0 em 128.244.731 | resto 0 em 125.323.098; 2 linhas corrompidas numa seção |
| I11 confirmações por cargo | 7 seções: 1 log de outra seção, 3 interrupções que viraram voto, 3 contingências com **50 votos sem rastro** no log | 10 seções: 6 interrupções que viraram voto, 1 log corrompido, 3 contingências com **152 votos sem rastro** no log |
| I12 suspensão log = RDV | 0 | 0 |
| I13 classes do log (banco, perfil) | 10 seções, todas explicadas (leitura do perfil, ou I11) | 19 seções: 10 são erro de leitura do perfil (nos brutos, log = BU) e 9 são as de I11 |
| I15, I16 entre turnos | 0 em 497.507 seções (27 UFs) | — |
| I17 | refutado como invariante (fonte não comparável) | — |

Nenhuma violação de classe S ficou sem explicação técnica com rastro nos arquivos. As que sobram como **risco** (princípio 8) são as janelas sem log em contingências (202 votos nos dois turnos) e o efeito não uniforme de desligar a urna com o eleitor habilitado.

## Pendente

- I18: não medido.
- Significado de `QT_ELEITORES_BIOMETRIA` no dado aberto (I17), a confirmar com o TSE.

## Limite do método

Invariantes de classe S só pegam o que o software não faria. Isso inclui arquivo alterado, urna fora do padrão e erro nosso. **Não** pegam o voto dado por outra pessoa no lugar de um eleitor que existe no cadastro e não compareceu: esse voto gera BU, RDV e log coerentes e assinados. Nesse ponto, a única defesa técnica com rastro é a biometria do eleitor. As brechas (liberação sem digital) são medidas por padrão pelo auditor B, não por invariante.

## Scripts

| Script | Invariantes | Entrada |
|---|---|---|
| `scripts/auditoria/matematico-brutos.mjs` | I1–I5, I10–I12 | arquivos brutos (`data/raw/<t>t/urnas`) |
| `scripts/auditoria/matematico-resumo-brutos.mjs` | consolidação da saída anterior | `data/parsed/auditoria/matematico/<t>t/*.jsonl` |
| `scripts/auditoria/matematico-banco.mjs` | I4, I6–I9, I13, I14 | banco (cópia de leitura, `src/banco-leitura.js`) |
| `scripts/auditoria/matematico-turnos.mjs` | I15–I17 | banco + `perfil_eleitor_secao` |
