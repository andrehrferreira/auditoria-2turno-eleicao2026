# 12. Parecer: H08, nenhum voto em sequência humanamente impossível

Achado revisado: [docs/analysis/linha-do-tempo/03-intervalos-minimos.md](../linha-do-tempo/03-intervalos-minimos.md) (Auditor C, A10/H08). Scripts do autor: `scripts/auditoria/tempo-perfil.mjs`, `tempo-ciclos.mjs` e `tempo-conferir.mjs`.

Revisão de 29/10/2026 feita por três lentes independentes: reprodução, definições e explicações alternativas. Depois conferi pessoalmente os pontos em que elas divergiram, com consultas curtas na cópia de leitura do banco. O achado é do **2º turno**, que está completo no banco. Nada aqui usa o 1º turno.

## Afirmação original

> Não existem votos em sequência humanamente impossível: os 339 intervalos < 15 s vinham de linhas de log duplicadas em 3 pacotes de contingência (bug do lerLogs, já corrigido pela sessão -64). Sem esse artefato, o menor intervalo entre votos do país é 16 s, com ciclo completo de eleitor (identificação, habilitação e voto); da habilitação ao voto, mínimo de 2 s (1 cargo) e 4 s (2 cargos). Nenhum voto sem ciclo de eleitor.

## Veredito final: sustentado com ressalvas

As três lentes deram o mesmo veredito, cada uma com o próprio código. A conferência própria confirma.

- **Os números centrais se reproduzem (Fato).** Os 339 intervalos abaixo de 15 s estão em 3 seções e são artefato de leitura. Medido por urna, o menor intervalo entre votos do país é 16 s. As 7 seções com 16 a 17 s têm ciclo completo no log bruto. Da habilitação ao voto, o mínimo é 2 s com 1 cargo e 4 s com 2 cargos.
- **O mecanismo está errado em 1 das 3 seções (Fato).** Em ES 57932/0009/0085 não há nenhuma linha duplicada. O pacote traz o log de outra seção, a 0112. A conclusão continua de pé, mas por outro motivo, e quem a corrige é o filtro por seção declarada, não a deduplicação.
- **A explicação para os 7.702 ciclos com 3 confirmações está errada (Fato).** Eles são a eleição suplementar para prefeito em TO 95338 (Goiatins). Não são "correção na tela".
- **"Nenhum voto sem ciclo de eleitor" está forte demais.** Isso só vale para os votos que estão no log. 50 votos do BU não têm nenhum "computado" em log publicado, e o ciclo deles não pode ser observado. Detalhes no [parecer 08](08-votos-sem-log-contingencia.md).
- **O teste só tem poder contra votos mais rápidos que um humano.** Ele não diz nada sobre votos indevidos no ritmo humano nem sobre log forjado por software.

## Afirmação revisada

> No 2º turno, nenhum voto registrado no log público aparece em sequência mais rápida do que um eleitor consegue votar. Os 339 intervalos abaixo de 15 s, em 3 seções, são artefato de leitura. Em BA 39870/0133/0184 e MG 40690/0016/0264, o log da urna original estava copiado em mais de um `.jez`, e o mesmo registro foi lido duas vezes. Em ES 57932/0009/0085, o pacote traz também o log da seção 0112, porque a mesma urna de recuperação de dados (RED) foi usada nas duas. Lendo urna por urna e só a seção declarada, o log das 3 seções fica igual ao BU (228, 114 e 308). Com isso, o menor intervalo entre dois votos do país é 16 s (3 seções), seguido de 17 s (4 seções). As 7 têm ciclo completo de eleitor no log bruto: identificador, habilitação e confirmação na mesma urna. Da habilitação ao voto, o mínimo é 2 s com 1 cargo (2.656 seções) e 4 s com 2 cargos (2 casos nas 6 UFs com governador: DF 97012/0013/0418 e AM 02712/0044/0019). Os 7.702 ciclos com 3 confirmações são a eleição suplementar para prefeito em TO 95338. Todo voto que está no log tem habilitação antes. 50 votos do BU, em 3 seções com urna de contingência, não deixaram "computado" em nenhum log publicado (MA 36, BA 13, RS 1), e o ciclo deles não pode ser verificado. O teste não detecta votos indevidos feitos no ritmo humano (16 s ou mais por voto) nem ciclos forjados pelo próprio software.

## O que foi reproduzido

| Número | Autor | Lentes | Situação |
|---|---|---|---|
| Intervalos < 15 s no país | 339, em 3 seções | 339 = 185 (BA) + 46 (MG) + 108 (ES) | Bate |
| Faixas < 5 / 5–9 / 10–14 s | 267 / 43 / 29 | 267 / 43 / 29 | Bate |
| Excesso do log sobre o BU nas 3 seções | +185, +304, +46 | +185, +304, +46 | Bate |
| Log das 3 seções depois da correção | igual ao BU | 228, 308 e 114, igual ao BU | Bate |
| Menor intervalo no país, sem as 3 seções | 16 s (3) e 17 s (4) | 16 s (3) e 17 s (4), também por urna | Bate |
| Casos de 16–17 s conferidos no bruto | "cinco" | 7 seções, todas com ciclo completo | Bate, mas o autor deixou 2 de fora |
| Habilitação até o voto, 1 cargo | 2 s, 2.656 seções | 2 s, 2.656 seções, nenhuma com 1 s | Bate |
| Habilitação até o voto, 2 cargos (AC, DF, RN, TO) | 4 s, 1 caso; 33 de 5 s; 1.049 de 6 s | iguais | Bate |
| Idem, nas 6 UFs com governador (+AM, ES) | não medido | 4 s, 2 casos; 52 de 5 s; 1.702 de 6 s | Mínimo se mantém |
| Ciclos com 2 cargos (4 UFs) | 5.482.507 | 5.482.507 (nas 6 UFs: 10.077.755) | Bate |
| Ciclos com 3 confirmações | 7.702 | 7.702 | Bate, mas a causa é outra |
| Linhas duplicadas em BA / MG | 2.730 / 811 | 2.730 / 811 só no dia 25/10; 9.549 / 4.419 no log inteiro | Bate; a diferença vem da base de contagem |

**Os 7 casos de 16–17 s**, conferidos no log bruto: PE 24570/0147/0393, RS 88390/0162/0403, ZZ 30562/0001/1952, MG 41238/0030/0211, PE 24775/0024/0054, ZZ 30341/0001/1881 e ZZ 39063/0001/3194. Todos estão na mesma urna e têm ciclo completo: identificador, habilitação por biometria, por ano de nascimento ou pelo mesário, "Voto confirmado" e "computado". Em todos, o número de votos do log é igual ao comparecimento do BU. Os dois que o autor não conferiu (ZZ 30562 e ZZ 39063) são do exterior, sem biometria, com habilitação por ano de nascimento. Em RS 88390 e ZZ 30562 há 2 logs no pacote, mas o intervalo curto está numa urna só e as urnas não se sobrepõem no tempo.

**Os dois casos de 4 s com 2 cargos:**
- DF 97012/0013/0418: habilitado às 11:32:52, Governador às 11:32:54, Presidente e "computado" às 11:32:56, com 4 "Tecla indevida".
- AM 02712/0044/0019: biometria na 2ª tentativa, habilitado às 09:25:17, Governador às 09:25:19, Presidente e "computado" às 09:25:21. O ciclo inteiro, do "Aguardando" ao "computado", levou 56 s.

**Conferência própria** (cópia de leitura de 29/10 10:50):

| Seção | Comparecimento no BU | Votos no perfil de log (antes da correção) | Intervalo mínimo no perfil | Logs no pacote |
|---|---|---|---|---|
| ES 57932/0009/0085 | 308 | 612 | 0 | 3 |
| ES 57932/0009/0112 | 304 | 304 | 30 | 2 |
| BA 39870/0133/0184 | 228 | 413 | 0 | 3 |
| MG 40690/0016/0264 | 114 | 160 | 0 | 3 |

O excesso da ES 0085 (612 − 308 = 304) é exatamente o comparecimento da 0112. No `perfil_log` nacional, os valores de intervalo mínimo abaixo de 18 s são 0 s (3 seções), 16 s (3) e 17 s (4).

## Pontos em que as lentes divergiram, e como decidi

1. **Linhas duplicadas em BA e MG (2.730/811 contra 9.549/4.419).** As duas contagens estão certas. 2.730 e 811 são as linhas do dia 25/10. 9.549 e 4.419 são as do log inteiro, incluindo carga e testes. Isso está em `h08-contingencia.json` (campos `linhasDia` e `linhasRepetidasIdenticas`). O que importa para o achado são os votos computados repetidos: 185 em BA e 46 em MG, iguais ao excesso do log sobre o BU.
2. **Quantos votos do BU ficaram sem ciclo (49, 50 ou cerca de 53).** O RS 89060/0017/0191 tem 92 votos no BU, 91 "Voto confirmado" e 90 "computado". Então 1 voto não tem nenhum rastro e 1 foi confirmado sem "computado". Isso dá **50 votos sem "computado"** (MA 36, BA 13, RS 1), além de 1 voto do RS confirmado sem "computado". É o mesmo número do parecer 08. Os casos de −1 em BA 34711/0021/0178, PB 21750/0002/0254 e PI 11533/0003/0216 **não** são votos sem ciclo. Neles, as habilitações e as confirmações são iguais ao BU, e só falta o "computado" de um voto. A lente de alternativas contou esses casos junto, e por isso chegou a cerca de 53.
3. **Mínimo de 2 cargos em AM e ES.** A lente de reprodução não mediu ciclo a ciclo. As outras duas mediram com códigos diferentes e acharam o mesmo 2º caso de 4 s (AM 02712/0044/0019). Conferi o trecho do log. O mínimo de 4 s se mantém nas 6 UFs.
4. **Votos sem habilitação nas 3 seções do artefato (373 ou 403).** As métricas são diferentes: 373 votos sem habilitação antes, contra 403 votos sem tipo de habilitação. As duas estão só nas 3 seções do artefato, e as duas zeram quando a leitura é feita por urna. Isso não muda a conclusão.

## Problemas encontrados

1. **Causa errada na ES 57932/0009/0085 (Fato, nas 3 lentes).** São 108 dos 339 intervalos (32%), e a seção tem 0 linhas repetidas em 22.030. A urna RED 01758779 recuperou a seção 0112 às 19:40 e a 0085 às 21:24. O pacote da 0085 trouxe o log da urna 01750820, que declara "Seção Eleitoral: 0112" e votou das 08:01 às 16:40, ao mesmo tempo que a 0085. Só a deduplicação não resolve: `juntarLogs` sem a seção dá 612 votos, e com a seção dá 308, igual ao BU. O documento também diz que nas 3 seções "o mesmo registro aparece duas vezes" e que a urna foi "substituída duas vezes". As duas coisas são falsas para a ES. O fato de o log publicado da 0085 ter sido gerado pela urna reserva da 0112 fica para a equipe de integridade.
2. **Os scripts do autor não aplicam o filtro de seção.** `tempo-ciclos.mjs` e `tempo-conferir.mjs` chamam `lerLogs` sem o argumento `secao`. Além disso, `tempo-ciclos.mjs` acompanha um único ciclo por pacote, e não um por urna. Nas 4 UFs que o autor varreu, isso não mudou nada (0 pacotes com log diferente do BU, com ou sem a seção). Numa UF com urna RED reaproveitada, como o ES, os ciclos sairiam misturados. A deduplicação feita dentro de `tempo-ciclos.mjs` não teve efeito (`linhasDuplicadasIgnoradas = 0`), porque `lerLogs` já tira as cópias.
3. **O perfil e o banco não foram regerados depois da correção.** O `perfil_log` ainda mostra 0 s e 612, 413 e 160 votos nas 3 seções. Pela regra da perícia, o número nacional precisa sair de perfis regerados com o código corrigido. As lentes testaram que a correção não esconde votos em 52.545 pacotes: as 6 UFs com governador e todos os pacotes do país com 2 logs ou mais. Nos pacotes de 1 log fora dessas UFs, essa garantia é inferência, não medição.
4. **Os 7.702 ciclos com 3 confirmações têm outra causa (Fato).** 100% deles são "Governador > Presidente > Prefeito", nas 34 seções de Goiatins/TO (município 95338), que teve eleição suplementar para prefeito (eleição 6286) junto com o 2º turno. A conta fecha cargo a cargo. No log: Governador 7.704, Presidente 7.704 e Prefeito 7.702 + 1 voto nulo atribuído por suspensão. No BU: 7.704, 7.704 e 7.703. A mensagem "Eleitor corrigiu na tela de confirmação" aparece em só 213 desses ciclos.
5. **Definição incompleta das eleições do 2º turno.** `src/config.js` só conhece as eleições 6258 e 6260. O banco tem 12 eleições suplementares (6282 a 6293) em 13 municípios de SP, RJ, TO, PR, MT e RS. Os cargos 25 a 27 não existem na tabela `cargo`, e em MT e PR o `comparecimento_majoritario` está vazio. O efeito sobre o H08 foi medido: o mínimo da habilitação ao voto nesses municípios é de 4 s ou mais, e de 11 s com 3 cargos. A lacuna explica os ciclos com 3 cargos, mas não muda os mínimos. Ela pode afetar outras análises que contam cargos.
6. **Escopo do mínimo com 2 cargos.** O autor mediu em 4 das 6 UFs com governador. Ficaram de fora AM e ES, com 18.001 seções. Refeito com as 6, o mínimo continua 4 s, mas são 2 casos, 52 casos de 5 s e 1.702 de 6 s.
7. **"Cinco casos de 16–17 s", mas são 7 seções.** Os 2 que faltaram foram conferidos e estão limpos.
8. **"Nenhum voto sem ciclo" não foi testado pelo autor.** `tempo-ciclos.mjs` ignora sem aviso todo "computado" que não tem habilitação antes (`hab === null`), e `perfilLog` também não conta esse caso. As lentes fizeram o teste: 0 votos sem habilitação por urna nas 6 UFs com governador, e 0 no país fora das 3 seções do artefato. Para os votos fora do log, ver o problema 9.
9. **50 votos do BU sem ciclo observável.** MA 08893/0047/0609 (36), BA 35653/0173/0235 (13) e RS 89060/0017/0191 (1). Neles falta o log da urna que recebeu os votos. É lacuna de rastro, não prova de inserção, e já foi revisada no parecer 08. Mas a frase "nenhum voto sem ciclo de eleitor" precisa dessa exceção.
10. **Achado lateral (risco do princípio 8, fora do H08).** Nas 6 UFs com governador, 34 seções têm "Voto confirmado" sem "computado", porque a urna foi desligada pela chave no meio do voto. Exemplo: DF 97012/0019/0226, com Governador e Presidente confirmados às 10:10:09 e a urna desligada no mesmo segundo. O BU fecha com os votos computados, então esses votos parciais foram descartados. É uma ação humana que anula um voto e deixa rastro técnico. Vale um teste nacional por seção e por horário.

## Explicações alternativas

### Testadas

| Explicação | Resultado |
|---|---|
| Os 339 intervalos < 15 s são votos injetados em sequência impossível | **Refutada.** BA e MG: tirando as linhas idênticas, o log fica igual ao BU, e os mínimos sobem para 25 s e 29 s. ES: duas urnas de seções diferentes intercaladas; por urna, os mínimos são 30 s e 36 s, e cada urna bate com o BU da própria seção. |
| A deduplicação (data/hora + urna + hash) apaga registros reais | **Refutada.** Em 52.545 pacotes, 0 chaves repetidas no mesmo texto e 0 chaves iguais com linha diferente. Há 1,42 milhão de pares com mesmo segundo, mesma urna e mesma mensagem que o hash separa, o que mostra que o teste tinha poder. |
| O filtro por seção declarada joga fora votos da própria seção | **Refutada.** Ele só tirou votos do dia 25/10 na ES 0085: os 304 da 0112, que estão no BU da própria 0112. Nos 11.748 pacotes com mais de um log, 11.745 ficam iguais ao BU depois da correção. Os 3 que ficam abaixo (MA, BA 35653 e RS 89060) já estavam abaixo no log bruto. |
| Os intervalos da ES vêm de linhas duplicadas, como diz o autor | **Refutada.** São duas urnas de seções diferentes no mesmo pacote. |
| As 3 confirmações por ciclo são correção na tela, defeito ou voto duplo | **Refutada.** É a eleição suplementar de Goiatins/TO, e a contagem por cargo fecha com o BU. |
| Algum ciclo soma voto extra num cargo | **Refutada** nas 6 UFs com governador. O log fecha com o BU em 38.554 de 38.588 seções. As 34 restantes têm confirmação **a mais** no log (urna desligada antes do "computado"), nunca voto a mais no BU. |
| Os 16–17 s são intercalação de duas urnas | **Refutada.** O intervalo está numa urna só, e as urnas não se sobrepõem. |
| Há ciclos de 2 cargos mais curtos em AM e ES | **Refutada.** O mínimo continua 4 s, com 1 caso a mais no AM, que tem ciclo biométrico completo. |
| Os intervalos mais curtos do país são o mesário votando pelos faltosos sem biometria | **Sem sinal.** Nos 244 pares com menos de 20 s, 20 têm os dois votos sem biometria, contra 16,3 esperados pela taxa de cada seção (Poisson, p ≈ 0,2). 185 são biometria seguida de biometria. |
| Rajada de votos sem biometria no ritmo humano (16 a 30 s por voto) | **Sem sinal**, com teste próprio da lente de alternativas (R3, série de votos seguidos sem biometria). Nas 6 UFs com governador, a maior série é de 3 votos (3 seções). É resultado de 6 UFs, não do país. |

### Só supostas

| Explicação | Situação |
|---|---|
| Os 50 votos sem log foram feitos na urna original, cujo log se perdeu na troca de mídia | Plausível pela estrutura e analisada no parecer 08 (mecanismo "GAP erro 72" em MA e BA). O log que mostraria esses votos não está no pacote público. |
| Os mínimos de 2 s (1 cargo) e 4 s (2 cargos) são eleitores rápidos, em branco ou nulo | É argumento pelo número de teclas, não teste. O sigilo impede separar o tipo de voto. |
| 2 s entre a habilitação biométrica e o voto são fisicamente possíveis (ir até a cabine) | Ninguém mediu o tempo físico. Há 2.656 seções com mínimo de 2 s e 89.308 com mínimo de 3 s, algumas logo depois de várias tentativas de digital. Fica pendente, para comparar com a linha de base e com o H05. |
| Software que escreve ciclos completos e plausíveis no log | Não dá para testar com os arquivos públicos. O log é escrito pelo próprio sistema, e o algoritmo do hash de encadeamento não é público. |
| Unicidade do hash de encadeamento por registro | Confirmada nos dados (0 colisões), mas não pela especificação, que não é pública. |

## Poder do teste

- **Contra votos sem ciclo, mais rápidos que um humano:** poder total para os votos que estão no log. A simulação em 3.000 seções reais (k = 5 a 40 votos) deu poder 1 contra rajadas abaixo de 15 s por voto.
- **Contra votos indevidos no ritmo humano:** poder **zero** a partir de 15–16 s por voto. Um mesário que libera por ano de nascimento e vota pelos faltosos a cada 16 a 30 s não aparece. O ciclo mais rápido do país, de 16 s, já foi feito assim, com ano de nascimento. A estatística de série sem biometria (R3) cobre a faixa até 30 s e não achou nada nas 6 UFs com governador. Rajadas mais lentas ficam para o H05.
- **Contra "o voto é real, mas não foi o eleitor quem votou":** poder zero. O tempo não mostra quem digitou (princípio 8).
- **Contra log forjado pelo software:** poder zero, porque o log e o voto saem do mesmo sistema.
- **Contra votos fora do log:** poder zero por definição. Os 50 votos do problema 9 não foram testados.

Então "não há sequência impossível" é uma afirmação de **absolvição limitada**. Ela descarta a injeção grosseira de votos sem eleitor, mas não deve ser lida como "não houve voto indevido".

## Pendências

1. Regerar `data/parsed/2t/perfil` e a tabela `perfil_log` com o `lerLogs` corrigido, deduplicação e filtro por seção, e refazer a distribuição nacional de intervalos e o teste de "voto sem habilitação" sobre o universo completo. Isso é condição para o número entrar no relatório de perícia.
2. Corrigir `tempo-ciclos.mjs` e `tempo-conferir.mjs` (passar a seção para `lerLogs` e acompanhar um ciclo por urna), e refazer a varredura de ciclos por número de cargos em todas as UFs, não só nas 4.
3. Corrigir o texto do doc 03 da linha do tempo: o mecanismo da ES 0085, a causa dos 7.702 ciclos com 3 confirmações, as 7 seções com 16–17 s e o mínimo de 2 cargos nas 6 UFs (2 casos).
4. Incluir em `src/config.js` e na tabela `cargo` as 12 eleições suplementares (6282 a 6293) e os cargos 25 a 27, e preencher `comparecimento_majoritario` em MT e PR.
5. Medir a distribuição dos tempos de até 2 s entre habilitação e voto, por tipo de habilitação e por seção, e comparar com a linha de base 2018–2022, junto com o H05.
6. Rodar a estatística R3 (série de votos sem biometria) no país inteiro, não só nas 6 UFs com governador.
7. Teste nacional dos "Voto confirmado" sem "computado" por desligamento da urna pela chave (problema 10), por seção e por horário.
8. Os 50 votos sem log: seguem as pendências do parecer 08.

## Comandos que reproduzem esta revisão

```bash
# Autor
node scripts/auditoria/tempo-perfil.mjs --turno 2
node scripts/auditoria/tempo-ciclos.mjs --uf ac,df,rn,to
node scripts/auditoria/tempo-conferir.mjs --secao mg/40690/0016/0264 --min-intervalo 15 --min-hab 3

# Lente de reprodução
node scripts/auditoria/cetico-h08-reproducao.mjs     # -> data/parsed/auditoria/cetico/h08-reproducao.json, h08-casos.json, h08-contingencia.json, h08-log-menor-que-bu.json
node scripts/auditoria/cetico-h08-ciclos.mjs         # -> h08-ciclos-ac.json, h08-ciclos-df-rn-to.json
node scripts/auditoria/cetico-h08-juntar.mjs         # -> h08-juntar.json (juntarLogs com e sem a seção)
node scripts/auditoria/cetico-h08-declaracoes.mjs    # seção declarada por urna (ES 0085 x 0112)
node scripts/auditoria/cetico-h08-texto.mjs

# Lente de definições
node scripts/auditoria/cetico-h08-dados-varredura.mjs   # -> h08-dados-gov6.json, h08-dados-multilog.json
node scripts/auditoria/cetico-h08-dados-pacote.mjs      # -> h08-dados-7casos.json, h08-dados-casos.json, h08-dados-al-1cargo.json, h08-dados-pacotes-3secoes.txt
node scripts/auditoria/cetico-h08-dados-perfil.mjs      # -> h08-dados-perfil.json

# Lente de alternativas
node scripts/auditoria/cetico-h08-bruto.mjs          # -> h08-bruto.json
node scripts/auditoria/cetico-h08-dedup.mjs          # -> h08-dedup.json
node scripts/auditoria/cetico-h08-alternativas.mjs   # -> h08-alternativas.json, h08-so-governador.json
node scripts/auditoria/cetico-h08-goiatins.mjs       # -> h08-goiatins.json
node scripts/auditoria/cetico-h08-poder.mjs          # -> h08-poder.json

# Conferência da consolidação (somente leitura)
node scripts/sql.mjs "select s.uf,s.municipio,s.zona,s.secao,s.comparecimento,p.votos_computados,p.intervalo_minimo_entre_votos,p.logs_no_pacote from secao s left join perfil_log p using(turno,uf,municipio,zona,secao) where s.turno=2 and ((s.uf='es' and s.municipio='57932' and s.zona='0009' and s.secao in ('0085','0112')) or (s.uf='ba' and s.municipio='39870' and s.secao='0184') or (s.uf='mg' and s.municipio='40690' and s.secao='0264'))"
node scripts/sql.mjs "select intervalo_minimo_entre_votos m, count(*) n from perfil_log where turno=2 and intervalo_minimo_entre_votos<18 group by 1"
```

Os arquivos de saída ficam em `data/parsed/auditoria/cetico/h08-*`.
