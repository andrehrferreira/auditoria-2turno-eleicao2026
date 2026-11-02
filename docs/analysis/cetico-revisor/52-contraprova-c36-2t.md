# 52. Contraprova independente das contas internas do boletim (C3 a C7) no 2º turno (H03)

Parecer do revisor cético, 02/11/2026. Revisa os números do 2º turno de C3, C4, C5 e C6 publicados no tópico 2 da perícia (`docs/pericia/02-coerencia-entre-arquivos.md`, seção "O que foi encontrado: 2º turno, país inteiro"), que saíram de `scripts/auditoria/contagem-coerencia.mjs` (saída `data/parsed/auditoria/contagem/coerencia-2t.txt`). Acrescenta C6b e C7, que o 2º turno ainda não tinha, e a contraprova com boletim alterado de propósito, que é a pendência da H03 no tópico 2.

Universo: as 28 UFs (26 estados, DF e exterior), as 499.248 pastas de seção da árvore `data/raw/2t/urnas` e os 499.207 boletins que existem nela. Banco só para comparar: cópia de leitura `eleicao2026-20261029T105000.sqlite` (a que `data/db/leitura/atual.json` aponta). Sem rede. `data/raw` não foi varrido com `find`. Nenhum CPF nem número de título foi lido ou gravado.

## Resposta curta

**Os números do tópico 2 se sustentam. Uma frase está errada e a C3 pode ser feita nas 395 seções que ficaram de fora.**

| Conta | Tópico 2 (2º turno) | Contraprova própria | Veredito |
|---|---|---|---|
| C3 soma dos votos × quantos votaram | 539.420 seção × cargo, 0 | **539.817**, 0 (inclui as 395 consultas populares e as 2 seções de cédula sem voto) | **Sustentado com ressalvas** |
| C4 aptos = seção + trânsito | 539.817 seção × eleição, 0 | 539.817, 0 | **Sustentado** |
| C5 formas de liberação | 497.897 seções, 0 | 497.897, 0 | **Sustentado** |
| C6 seção × eleição federal | 499.178 seções, 0 | 499.178, 0 | **Sustentado com ressalvas** (definição do quadro) |
| C6b 0 ≤ federal − outra eleição ≤ aptos federal − aptos da outra | não existia no 2º turno | 39.739 seções com governador + 871 seção × consulta, 0 | **Novo, Fato** |
| C7 comparecimento ≤ aptos | "Comparecimento > aptos: 499.207, 0" | 539.817 blocos + 499.207 seções, 0 | **Sustentado** |
| Exceções: 41 sem arquivo; 29 do Sistema de Apuração (831 votos); 1.310 sem detalhamento | iguais | iguais, e conferidas no arquivo bruto | **Sustentado** |
| Contraprova com boletim alterado de propósito | Pendente | 9 alterações, todas acusadas exatamente onde deviam | **A pendência pode virar Fato** |

**A frase errada.** O tópico 2 diz: "Em 395 seções houve também uma de 3 consultas populares, e **o boletim não traz o comparecimento dessas consultas**". **Fato:** o boletim traz. Cada consulta tem um bloco de resultado próprio com o campo de comparecimento (`qtdComparecimento`), do tipo "consulta". Quem perde o número é a **carga do banco da auditoria**: `src/banco.js` (linha 369) só guarda o comparecimento dos blocos "majoritário" e "proporcional", e por isso `secao_eleicao` fica com os dois nulos nessas 395 linhas. Com o número do boletim, a C3 fecha também nas 395: 98.889 votantes, 98.889 votos somados.

## Como refiz (caminho próprio)

| Script | O que faz | Tempo |
|---|---|---|
| `scripts/auditoria/cetico-52-ber.mjs` | Leitor BER/DER escrito do zero para o `-bu.dat` e o `-busa.dat`. Não usa `src/asn1.js`, `src/esquemas.js` nem `src/banco.js`. Segue a estrutura de `spec/bu.asn1` do TSE e confere a etiqueta (tag) de cada campo: etiqueta inesperada é erro, não é descartada em silêncio | |
| `scripts/auditoria/cetico-52-c36-2t.mjs` | Percorre a árvore `data/raw/2t/urnas` (`readdir` por nível), lê todos os boletins e faz C3, C4, C5, C6, C6b e C7 e a checagem de estrutura. Depois compara o boletim lido com o banco (campo a campo) e com o boletim impresso. Por fim, a contraprova com alterações na memória | 917 s (país inteiro) |
| `scripts/auditoria/cetico-52-amostras.mjs` | Conferência de casos no bruto: etiquetas dos campos do boletim, blocos de resultado e as linhas do boletim impresso (`-imgbu.dat` / `-imgbusa.dat`) | segundos |

Saídas: `data/parsed/auditoria/cetico/52-c36-2t-resumo.txt` e `52-c36-2t-violacoes.csv` (só o cabeçalho: 0 violação).

**Independência.** Nada de `contagem-coerencia.mjs` foi importado ou copiado. A diferença de método que mais importa: o script do autor parte do banco e só testa os pares (eleição, cargo) que têm alguma linha de voto. Este parecer parte de cada bloco de resultado do boletim, tenha voto ou não, e compara a soma de cada cargo com o comparecimento **do próprio bloco**. Essa diferença é o que mostrou o comparecimento das consultas.

**Três leituras do mesmo boletim, iguais em 100% das seções (Fato):**

| Comparação | Seções | Seção × eleição | Seção × cargo | Diferenças |
|---|---:|---:|---:|---:|
| Leitor próprio × banco (aptos, aptos da seção, trânsito, comparecimento majoritário e proporcional, comparecimento da seção, as 3 formas de liberação, tipo de urna e de arquivo, votos por tipo e cargo) | 499.207 | 539.817 | 539.817 | **0** |
| Leitor próprio × boletim impresso (extração do parecer 40: comparecimento, liberação, aptos, aptos da seção e em trânsito, nominal, branco, nulo, legenda, total apurado) | 499.207 | | 539.817 | **0** |

O impresso é outra representação gerada pela mesma urna, não uma fonte independente da urna. O que as três leituras provam é que o banco e o script do autor leram o boletim corretamente.

## Universo e estrutura (Fato)

- 499.248 pastas de seção: 41 sem nenhum arquivo de boletim (as 41 do exterior não instaladas) e **499.207 com boletim**. Nenhuma tem mais de um pacote distinto, nenhum boletim é ilegível, e em nenhum a identificação gravada (município, zona, seção) difere da pasta.
- Tipos: 492.212 urnas de seção e 5.670 reservas no Brasil; 15 boletins do Recuperador de Dados no Brasil (13 de seção e 2 de reserva que encerrou a seção); no exterior, 1.238 urnas de seção, 42 reservas, 1 do Recuperador de Dados e 29 do Sistema de Apuração (`saManual`).
- Estrutura: todas as seções têm a eleição federal 6258, com um bloco majoritário de Presidente; as 39.739 com eleição estadual 6260 têm um bloco majoritário de Governador. Consultas: 476 seções com bloco majoritário (código de cargo 11) e 395 com bloco "consulta" (PR 6287: 86; MT 6288: 97; MT 6289: 212). Nenhuma eleição repetida, nenhum tipo de voto fora dos 5 do formato, 0 voto em "cargo sem candidato".
- 2 blocos sem nenhuma linha de voto: ZZ 29564/0001/0091 (72 aptos) e ZZ 30686/0001/0443 (30 aptos), ambos do Sistema de Apuração, com comparecimento 0. Isso explica a diferença de 2 entre C1 e C4 que o tópico 2 descreve.

## As contas (Fato, país inteiro)

### C3. Soma dos votos de cada cargo = comparecimento do bloco

539.817 comparações, **0 violação**.

| Eleição / bloco / cargo | Seções | Quantos votaram | Votos somados |
|---|---:|---:|---:|
| Federal, Presidente | 499.207 | 128.236.074 | 128.236.074 |
| Estadual, Governador | 39.739 | 10.086.066 | 10.086.066 |
| Consultas com bloco majoritário (6282, 6283, 6284, 6285, 6286, 6290, 6293) | 476 | 120.790 | 120.790 |
| Consultas com bloco "consulta" (6287 PR, 6288 MT, 6289 MT) | 395 | 98.889 | 98.889 |
| **Total** | **539.817** | | |

Com a regra do tópico 2 (fora as 395 consultas) seriam 539.422 comparações: as 539.420 do tópico mais os 2 blocos sem linha de voto que o script do autor não enxerga. Esses 2 têm comparecimento 0 e soma 0, então não mudam nada.

### C4. Aptos = aptos da seção + aptos em trânsito

539.817 seção × eleição, **0 violação**. Trânsito somado: 584.117 na federal, 41.804 na estadual e 476 nas consultas. É igual à saída do autor, eleição por eleição.

### C5. Digital + dados pessoais + sem digital cadastrada = comparecimento

497.897 seções (127.854.631 votantes), **0 violação**. Ficam fora 1.310 seções do exterior: 1.280 urnas, 1 do Recuperador de Dados e 29 do Sistema de Apuração.

### C6. Comparecimento da seção = comparecimento da eleição federal

499.178 seções, **0 violação**. Ficam fora as 29 do Sistema de Apuração, que gravam 0 na seção. País: 128.235.243 votantes somados nas seções e 128.236.074 na eleição federal. A diferença, 831, é exatamente o comparecimento federal das 29.

### C6b. 0 ≤ comparecimento federal − comparecimento da outra eleição ≤ aptos federal − aptos da outra

- Estadual: 39.739 seções, **0 violação**. Em 1.818 seções a federal tem mais votantes, somando 24.727 eleitores que votaram só para Presidente: é o eleitor em trânsito vindo de outra UF.
- Consultas: 871 seção × consulta, **0 violação**. Em 50 seções a federal tem mais votantes (192 eleitores, também eleitores em trânsito).

### C7. Comparecimento ≤ aptos

539.817 blocos (seção × eleição × tipo) e 499.207 seções (comparecimento da seção ≤ aptos federais): **0 violação**. Há 14 blocos com comparecimento igual aos aptos (100%), em 12 seções de urna no Brasil (BA 2, CE 2, MA 1, MG 2, MS 1, PA 1, RN 1 com federal e estadual, SE 1, TO 1 com federal e estadual). Não violam a conta; o comparecimento alto é tema do A7, não deste parecer.

## Contraprova: boletim alterado de propósito na memória (Fato)

Cada alteração foi feita numa cópia do boletim lido, na memória, sem mudar nenhum arquivo. A cópia passou pela mesma função de contas do universo. O script escolhe sozinho seções que fechavam antes, nas quais a alteração só pode quebrar a conta-alvo.

| Alteração | Seção | Esperado | Acusado |
|---|---|---|---|
| +1 nulo de Presidente | AC 01007/0009/0002 | C3 | C3 (soma 233 ≠ 232) |
| +1 branco na consulta popular (bloco "consulta") | MT 89788/0011/0036 | C3 | C3 (289 ≠ 288) |
| +1 apto da seção na estadual | AC 01007/0009/0002 | C4 | C4 |
| +1 liberado por digital | AC 01007/0009/0002 | C5 | C5 |
| +1 no comparecimento da seção e +1 sem digital (C5 continua fechando) | AC 01007/0009/0002 | C6 | C6 (233 ≠ 232) |
| +1 no comparecimento estadual e +1 nulo de Governador (C3 continua fechando) | AC 01007/0009/0002 | C6b | C6b (232 − 233 = −1) |
| aptos federais = comparecimento − 1, com os aptos da seção ajustados (C4 continua fechando) | AL 27006/0017/0012 | C7 duas vezes (bloco e seção) | C7, C7 |
| +1 voto nominal num boletim do Sistema de Apuração | ZZ 29173/0001/0494 | C3 | C3 (14 ≠ 13) |
| comparecimento da seção de 0 para 1 no Sistema de Apuração | ZZ 29173/0001/0494 | nada (fora do C6 por desenho) | nada |

As 9 deram o resultado esperado. Com isso, a pendência do tópico 2 ("contraprova de C3 a C6 no 2º turno") fica coberta, e também C6b e C7. A última linha registra um limite: o C6 não enxerga a seção do Sistema de Apuração. Nela, o comparecimento só é conferido pelo C3 (soma = comparecimento da eleição) e pelo C7.

## Exceções conferidas no arquivo bruto (amostra só para conferir)

`node scripts/auditoria/cetico-52-amostras.mjs <uf/mun/zona/secao> ...` mostra a etiqueta de cada campo de cima do boletim. `C1*` é o detalhamento da liberação; sem ele, depois do comparecimento (`U2`) vem direto a lista de eleições (`U16*`).

| Seção | Tipo | O que o bruto mostra |
|---|---|---|
| ZZ 29262/0001/1406 | urna do exterior | comparecimento 360; **sem** o campo de detalhamento; o impresso também não tem as linhas de liberação |
| ZZ 30961/0001/3869 | Recuperador de Dados, exterior | comparecimento 208; sem detalhamento; Presidente 207 + 1 = 208 |
| ZZ 29173/0001/0494 | Sistema de Apuração | `dadosSecaoSA` = `[1]` (junta 1, turma 1); comparecimento da seção **0**; comparecimento da eleição 13; impresso "No. de votos MAJORITÁRIO 0013", "Total Apurado 0013" |
| ZZ 29564/0001/0091 e ZZ 30686/0001/0443 | Sistema de Apuração | bloco de Presidente sem nenhuma linha de voto; comparecimento 0; impresso "Total Apurado 0000" (72 e 30 aptos) |
| PR 78719/0151/0098 | consulta (bloco "consulta") | bloco 6287 do tipo "consulta" com **comparecimento 223**; soma 222 + 0 + 1 = 223; impresso "Consulta Popular Comunidade Alto Mirim … Total Apurado 0223". O exportador do próprio repositório (`node src/exportar.js --uf pr --municipio 78719 --zona 0151 --secao 0098 --log nao --stdout`) também traz `tipoCargo: "consulta"`, `qtdComparecimento: 223` |
| MT 89788/0011/0036 | plebiscito (bloco "consulta") | bloco 6288 com comparecimento 288 = 283 + 2 + 3; impresso "Plebiscito das Ilhas de Ocupação … Total Apurado 0288" |
| RJ 58394/0105/0001 | consulta com bloco majoritário (cargo 11) | bloco 6285 com comparecimento 216 = 197 + 7 + 12 |
| AC 01007/0009/0001 | urna de seção (controle) | com detalhamento (8 + 210 + 14 = 232) |

## Leitura do código do autor (`contagem-coerencia.mjs`)

1. **Abre o banco primário**, `new DatabaseSync('data/db/eleicao2026.sqlite')`, e não a cópia de leitura, contra a regra 2 do doc 10. O número pode mudar se o primário for recarregado. Aqui não mudou: a cópia de leitura bate com o boletim em 100% dos campos, e as contagens do autor batem com as minhas.
2. **C3 só vê os pares (eleição, cargo) que têm linha de voto** (o mapa `porCargo` nasce de `voto_bu`/`voto_rdv`). Um bloco de cargo sem nenhuma linha não é testado. Aqui são só os 2 do Sistema de Apuração com 0 votante, então nada muda. Num caso hostil, porém, um bloco com comparecimento > 0 e nenhuma linha de voto passaria sem ser visto pela C3 do autor. Pela C6 não passaria se fosse o bloco federal; se fosse outro, passaria.
3. **As 395 consultas ficam fora da C3 por falta de dado no banco, não no boletim** (ver "Resposta curta"). O script do autor registra isso como "sem comparecimento no BU", o que reforçou a frase errada do tópico.
4. **C6 no 2º turno só compara seção × federal**, mais o teste majoritário = proporcional, que no 2º turno não tem nada a comparar (não há bloco proporcional). O quadro "Como foi feito" do tópico 2 define a C6 como "quantos votaram na seção × quantos votaram em cada eleição (federal e estadual) — deve dar igual". Para a estadual isso não vale: em 1.818 seções do 2º turno (24.727 eleitores) e em 17.233 do 1º (165.584) a estadual tem menos votantes, por causa do eleitor em trânsito. A conta certa para a estadual é a C6b.
5. Sem filtros silenciosos além desses. A junção por cursor ordenado está correta: as contagens por eleição e o trânsito somado batem com os meus.

## Explicações alternativas e o que foi testado

- **Erro do decodificador ou da carga escondendo violações (absolvição falsa):** testado. Três leituras independentes do mesmo boletim (leitor BER próprio, banco e texto impresso) são iguais em todos os campos usados, em 100% das seções.
- **A conta não teria poder para achar nada:** testado. As 9 alterações de contraprova foram acusadas, e no parecer 40 um erro de leitura em 395 seções do impresso foi acusado na hora.
- **Seções escondidas pelas exclusões:** testado. As 41 não instaladas não têm boletim (pasta só com `aux.json`). As 29 do Sistema de Apuração e as 1.281 urnas do exterior sem detalhamento foram conferidas no bruto. A liberação no exterior (380.612 votos, todos por título e ano de nascimento, 0 por digital) já está no tópico 4. Pelo perfil do diário no banco, refeito aqui: 380.404 nas 1.280 urnas e 208 no Recuperador de Dados, iguais ao comparecimento do boletim nas 1.281.
- **Pacote duplicado contado duas vezes:** testado. 1.040 seções, todas do AC, têm o mesmo pacote gravado em duas pastas: o nome é o hash em base64 passado a hexadecimal, uma vez com "/" e outra com "-". Os boletins das duas cópias são **idênticos byte a byte** em todas as 1.040. O script junta as duas e conta cada seção uma vez. É um artefato da coleta, sem efeito em nenhum número. O banco não duplicou (499.207 seções).
- **Contas internas não pegam voto inventado e registrado de forma completa:** limite do teste, não testado aqui e não testável por estas contas. A defesa contra isso é o diário (C2) e a liberação pela digital (tópico 4).

## O que muda no tópico 2 (pedidos ao redator, sem editar o tópico)

1. Trocar "o boletim não traz o comparecimento dessas consultas" por algo como: "o boletim traz o comparecimento dessas consultas, mas a primeira conferência leu o boletim por um caminho que não guardava esse número; a segunda verificação independente refez a conta com ele e as 395 também fecham". Com isso, a C3 do 2º turno pode passar a **539.817 comparações, 0 diferença**, todas as seções e todos os cargos (ou manter 539.420 e dizer que as 395 restantes foram conferidas à parte, com 0 diferença).
2. No quadro "Como foi feito", a C6 deve dizer: seção = eleição federal; na estadual o número pode ser menor, só pelos eleitores em trânsito vindos de outro estado (C6b).
3. Acrescentar ao 2º turno: C6b (39.739 seções com governador e 871 seção × consulta, 0 violação; 24.727 eleitores votaram só para Presidente em 1.818 seções) e C7 (539.817 blocos, 0).
4. A pendência "contraprova de C3 a C6 no 2º turno" pode virar Fato, com a tabela das 9 alterações em linguagem simples. Continuam pendentes as do 1º turno citadas no tópico: eleição estadual e trânsito.
5. Coerência entre tópicos (só nota): o tópico 2 fala em "29 seções do exterior apuradas pelo Sistema de Apuração (831 votos)" e o tópico 4 em "27 seções (831 votos)". As duas contas estão certas: 29 boletins, dos quais 27 têm voto. O texto deve dizer isso para o leigo não achar que os números se contradizem.

## Riscos que ficam em aberto

- **O mesmo emissor.** Boletim, impresso e banco são do mesmo TSE e da mesma urna. As contas provam coerência interna e leitura fiel. Não provam que a urna registrou o que o eleitor digitou.
- **Erro de carga no banco.** `src/banco.js` descarta o comparecimento dos blocos "consulta". Quem calcular comparecimento ou abstenção das consultas PR 6287 e MT 6288/6289 pelo banco vai achar nulo. **Recomendação:** registrar no doc 09 e, numa próxima carga, gravar esse comparecimento (por exemplo, numa coluna de consulta). Não muda nenhum número de Presidente ou Governador.
- **Leitor de um só autor.** O leitor BER deste parecer segue a mesma especificação publicada pelo TSE que o leitor do repositório. Se a especificação estiver errada num campo, os dois erram juntos. O impresso, que é texto e não ASN.1, cobre esse risco nos campos usados aqui.
- **Status do pacote (observação lateral, não investigada).** Os `aux.json` em disco hoje marcam 488.363 pacotes "Totalizado" e 10.844 "Recebido". A coluna `status_pacote` do banco tem 154.692 "Totalizado", 2.287 "Recebido" e 342.269 vazios. Nenhum script de auditoria usa essa coluna, e ela não afeta as contas, mas não é confiável para quem quiser usá-la.

## Reproduzir

```bash
node --check scripts/auditoria/cetico-52-ber.mjs
node --check scripts/auditoria/cetico-52-c36-2t.mjs
node --check scripts/auditoria/cetico-52-amostras.mjs
node --max-old-space-size=8192 scripts/auditoria/cetico-52-c36-2t.mjs              # ~15 min, país inteiro
node --max-old-space-size=8192 scripts/auditoria/cetico-52-c36-2t.mjs --uf ac,mt,ro,zz   # ~10 s com o disco já lido
node scripts/auditoria/cetico-52-amostras.mjs zz/29262/0001/1406 zz/30961/0001/3869 zz/29173/0001/0494 zz/29564/0001/0091 zz/30686/0001/0443 pr/78719/0151/0098 mt/89788/0011/0036 rj/58394/0105/0001 ac/01007/0009/0001
```

Entradas: `data/raw/2t/urnas/<uf>/<mun>/<zona>/<secao>/` (aux.json, `-bu.dat`, `-busa.dat`, `-imgbu.dat`, `-imgbusa.dat`); `data/parsed/auditoria/cetico/40-imgbu-2t.jsonl` (comparação com o impresso); cópia de leitura do banco (comparação com o banco). Os zips movidos para o disco L: não são usados.
