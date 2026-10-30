# 21. Parecer: invariantes sem violação (matemático forense)

Revisado: [matematico-forense/01](../matematico-forense/01-catalogo.md) a [05](../matematico-forense/05-invariantes-do-banco.md), com os scripts `matematico-brutos.mjs`, `matematico-resumo-brutos.mjs`, `matematico-turnos.mjs` e `matematico-banco.mjs` e as saídas em `data/parsed/auditoria/matematico/`. Este parecer consolida três revisões independentes (lentes reprodução, definições e alternativas) e uma conferência própria dos pontos em que elas divergiam. Revisão de 29/10/2026.

**Universo (princípio 9): completo.** Cópia de leitura de 2026-10-29T10:50:00.542Z, com os dois turnos e 28 UFs em cada um (499.248 seções por turno).

Exclusões, com contagem e motivo:

| Exclusão | Contagem | Motivo | Onde pesa |
|---|---:|---|---|
| Seções do exterior sem arquivo | 41 por turno | `situacao = sem_arquivo` ("Não instalada"); conferido no banco | todos os itens; 499.207 pacotes por turno |
| Diretórios de pacote duplicados no AC, 2º turno | 1.040 seções | cópias iguais byte a byte (nome em base64 com `-` ou `/`), artefato da coleta | nenhum: o autor escolhe o pacote pelo `aux.json` |
| Seções sem cadastro aberto | 390 | chave ausente no perfil de 14/07/2026 (lista em `cetico/isv/turnos.json`) | item (c) e T2 |
| Seções de apuração mista de MG | 2 | sem detalhamento de habilitação no 1º turno | T3 e T2 do 1º turno (497.505 testadas em vez de 497.507) |
| Exterior | 1.310 seções | sem cadastro por seção | item (c) |
| Pacotes sem "Urna pronta" no log | 31 (1º turno) e 30 (2º turno) | 31 e 29 boletins do Sistema de Apuração, mais 1 perfil nulo | I14 |
| Sem "Inicio do Encerramento" (além dos SA) | 11 (1º turno) e 6 (2º turno) | o fim da janela não é testado nelas | I14 |
| SP 64777/0395/0298, 2º turno | 1 | `perfil_log` todo nulo; conferida no bruto: 0 voto fora da janela | I13a, I13b e I14 |

## Afirmação original

Matemático forense:

- **(a)** A cadeia de hashes do BU não tem divergência no país inteiro:
  - 2º turno: 2.091.951 linhas de votos em 539.817 eleições;
  - 1º turno: 67.858.974 linhas em 997.114 eleições;
  - ordemGeracaoHash = posição, e último hash = valor gravado.
- **(b)** `quantidadeEscolhas` não tem violação (senador 2 no 1º turno, os outros cargos 1). Registros do RDV = escolhas × comparecimento, sem violação nos dois turnos. As 20 violações da 1ª passada eram as 2 seções de apuração mista de MG.
- **(c)** Entre os turnos, em 497.897 seções:
  - aptos ≤ cadastro, sem violação em 497.507;
  - limite cruzado de biometria, sem violação em 497.505;
  - variação de aptos entre −5 e +5 em todas.
- **(d)** `QT_ELEITORES_BIOMETRIA` do cadastro aberto não serve de limite. Há 30.054 casos seção × turno com mais habilitados por biometria no BU do que o cadastro diz ter (MG 19.768, ES 4.347, RJ 2.107, MS 1.349, SP 1.144).
- **(e)** O log de RJ 60011/0008/0061 (1º turno) tem bits corrompidos, e BU, RDV e detalhamento fecham em 311.
- **(f)** Banco:
  - aptos iguais entre as eleições federal e estadual;
  - 0 ≤ comparecimento federal − estadual ≤ trânsito;
  - 0 voto fora da janela.

## Veredito final: sustentado com ressalvas

As três lentes deram **sustentado com ressalvas**, e a conferência própria confirma. Todos os números reproduzem, no universo completo, com leitores independentes do código do autor.

O que limita o achado é o **poder** dos testes: os "zero violação" atestam que o nosso leitor está certo e que os arquivos são coerentes entre si. **Não** atestam que os arquivos não foram alterados. Uma alteração coerente passa por todos os invariantes de I1 a I5. Só a assinatura da urna pega essa alteração, e ela ainda não foi conferida no país inteiro.

Há também três correções de texto:

- o "10.209" é a soma dos dois turnos;
- o item (d) não é "por biometria", e sim "com biometria cadastrada" (digital mais liberação à mão);
- as linhas "Voto confirmado" do log de RJ não faltam: estão no arquivo, corrompidas.

Por fim, a retirada de T2 do catálogo não pode virar absolvição. A causa do T2 é Hipótese, e o T2 fica como risco aberto.

## Afirmação revisada (alcance que os dados sustentam)

- **Fato.** A cadeia de hashes do BU não tem divergência em todos os pacotes do país:
  - 2º turno: 2.091.951 tuplas em 539.817 eleições;
  - 1º turno: 67.858.974 tuplas em 997.114 eleições;
  - 0 hash, 0 ordem e 0 último hash divergentes;
  - universo: 499.207 pacotes por turno, sem as 41 seções do exterior sem arquivo.

  A cadeia não tem chave, e por isso esse zero prova a leitura e a coerência, não a integridade. Quem pode trazer integridade é a assinatura da urna sobre o último hash e sobre o SHA-512 de cada arquivo. Essa assinatura é **Pendente** no país (2º turno em andamento; 1º turno rodado só com `--sem-lacres`).
- **Fato.** `quantidadeEscolhas` vale 2 para senador no 1º turno e 1 nos outros cargos. Registros do RDV = escolhas × comparecimento e soma dos votos do BU = escolhas × comparecimento valem sem violação nos dois turnos. Nas 2 seções de apuração mista de MG, as partes cargo × origem, somadas, fecham. Ali o teste é em parte circular, porque a parte "bu" do RDV vem do próprio BU.
- **Fato.** Há 497.897 seções do Brasil nos dois turnos, 390 delas sem cadastro, e nenhuma com agregação diferente entre os turnos.
  - T1 (aptos ≤ cadastro): 0 violação em 995.014 pares seção × turno.
  - T3 (limite cruzado de biometria): 0 violação em 497.505 seções. As 2 que faltam são as seções de apuração mista de MG.
  - A variação de aptos vai de −5 a +5. A soma é +10.890, contra −11.039 nos aptos em trânsito.
  - T1 tem poder alto. T3 tem poder baixo, com folga mediana de 60 eleitores: o zero de T3 não exclui troca de grupo de dezenas de eleitores por seção.
- **Fato.** T2 (votantes com biometria cadastrada no BU ≤ biometria do cadastro aberto + trânsito) é violado em 12.433 seções no 1º turno (156.880 eleitores além do limite) e em 17.621 no 2º (229.717). São 30.054 casos seção × turno, mas só 18.116 seções distintas: 11.938 delas aparecem nos dois turnos, e 17.940 usaram a mesma carga da urna nos dois.
  - "Com biometria cadastrada" soma os liberados pela digital e os liberados à mão que têm biometria (`por_biometria + por_biografia`).
  - Contando só os liberados pela digital, o limite é ultrapassado em 4.331 seções no 1º turno (47.391 eleitores) e em 5.878 no 2º (66.431). O total dos dois turnos é 10.209.
  - Por UF, somando os turnos: MG 19.768, ES 4.347, RJ 2.107, MS 1.349, SP 1.144. Nas outras UFs, no máximo 481 (SC).
- **Hipótese.** O cadastro aberto (14/07) e o arquivo da urna (carga de 17/09 a 04/10) não contam o mesmo conjunto de "com biometria". Com dados públicos, isso não se separa de digitais gravadas no arquivo da urna que o cadastro não tem (princípio 8: a carga é feita por pessoas). **T2 sai do catálogo de invariantes, mas fica como risco aberto, e não como explicado.**
- **Fato.** RJ 60011/0008/0061, 1º turno:
  - BU = RDV = log = 311, e o detalhamento é 21 + 252 + 38;
  - `src/lacres.js` faz 25 conferências, com 0 falha;
  - o SHA-512 do log.jez é igual ao hash lacrado, e a assinatura da urna sobre ele confere.

  A corrupção já existia quando a urna assinou, ou seja, aconteceu dentro da urna. São 11 linhas fora do formato, com 18 trechos corrompidos em dois surtos (08:31 e 09:32 a 09:33). Toda troca é o bit 0x02 apagado (de 1 para 0), inclusive em quebras de linha (0x0A virou 0x08, o que funde linhas). Nas linhas corrompidas por inteiro, **nenhum byte de posição ímpar** tem o bit 0x02 ligado, contra cerca de 39% no resto do arquivo.
- **Hipótese (técnica, forte).** Falha física intermitente na urna: um bit de dados preso em 0 numa das duas faixas de byte. Não se sabe se foi na memória ou na gravação.
- **Fato.** No banco:
  - aptos iguais nas eleições federal e estadual, com 0 violação em 497.897 seções (1º turno) e 39.739 (2º);
  - 0 ≤ comparecimento federal − estadual ≤ aptos federal − aptos estadual, com 0 violação;
  - 0 voto fora da janela, medido nos pacotes que têm janela no log: 499.176 no 1º turno (sem os 31 do Sistema de Apuração) e 499.177 no 2º (sem os 29 do Sistema de Apuração e a seção de perfil nulo). A seção de perfil nulo, SP 64777/0395/0298, foi conferida no bruto e também dá 0. Em 11 e 6 pacotes não há fim da janela.

  A "janela" é definida pela **ordem** dos eventos do log ("Urna pronta" até "Inicio do Encerramento"), e não pelo relógio. É coerência interna do log, não horário legal.

## O que foi reproduzido

| Item | Número do autor | Conferido | Fonte |
|---|---|---|---|
| (a) cadeia, 2º turno | 2.091.951 / 539.817 / 0 | igual, com leitor guiado pelo esquema, sem `lerBu`. Sem deduplicar o AC: 500.247 pacotes e 2.100.014 tuplas, das quais 8.063 são cópias | `cetico-isv-reproducao.mjs --turno 2` |
| (a) cadeia, 1º turno | 67.858.974 / 997.114 / 0 | igual | `cetico-isv-reproducao.mjs --turno 1` |
| (b) escolhas | senador 2, os outros 1 | igual: 497.897 seções, ou 497.899 registros (as 2 de MG contam duas partes) | `cetico-isv-reproducao.mjs`, `cetico-invariantes-dados-sa.mjs` |
| (b) RDV = escolhas × comparecimento | 0 nos dois turnos | igual. Partes de MG somadas fecham (presidente 499.209 partes = 499.207 seções) | idem |
| (c) T1 | 0 em 497.507 | 0 em 995.014 pares seção × turno (sem somar agregadas: 29.703) | `cetico-isv-turnos.mjs`, `cetico-invariantes-dados-turnos.mjs` |
| (c) T3 | 0 em 497.505 | igual; folga mínima 0, mediana 60 | idem |
| (c) variação de aptos | −5 a +5 | igual; 451.006 sem mudança, 28.390 subiram e 18.501 caíram | idem |
| (c) cadastro reduzido × CSV bruto | — | AC: 2.411 de 2.411 seções iguais | `cetico-isv-turnos.mjs --conferir-uf ac` |
| (d) T2 | 30.054 (12.433 + 17.621) | igual; 156.880 e 229.717 eleitores; 18.116 seções distintas | `cetico-isv-turnos.mjs`, `cetico-invariantes-dados-biometria.mjs` |
| (d) "10.209 só por biometria" | posto ao lado do 2º turno | **4.331 (1º) + 5.878 (2º)**; excesso de 47.391 e 66.431 eleitores | `cetico-isv-consolidacao.mjs` |
| (d) × parecer 01, 2º turno | — | idêntico seção a seção: 17.621 / 229.717, 0 diferença | `cetico-invariantes-dados-biometria.mjs` |
| (e) RJ 60011/0008/0061 | bits trocados; 311 | 25 conferências de lacre, 0 falha; 11 linhas fora do formato; paridade dos bytes | `cetico-isv-rj60011.mjs`, `cetico-invariantes-log.mjs`, `cetico-isv-consolidacao.mjs` |
| (f) I8, I9b, I7, I14 | 0 | 0; 1 nulo no 2º turno, conferido no bruto | SQL abaixo, `sp-64777-0395-0298-2t.json` |

**Reconciliação de (d) com o parecer 01 e com o B1a.**

- 2º turno: o T2 do autor é exatamente o "excesso inverso" do auditor B. A folga do B tem um termo a mais, `max(0, aptos − cadastro)`, mas ele vale 0 porque T1 não tem violação.
- 1º turno: o B1a (12.082 seções e 154.673 eleitores, 26 UFs) está desatualizado.
  - Ele foi gerado às 05:48, sem SP (326 seções e 2.118 eleitores) e sem as agregadas do 1º turno.
  - Por isso, 4.076 seções ganharam a folga indevida `max(0, aptos − cadastro)`. Exemplo: PB 19011/0074/0100, com 353 aptos e 266 no cadastro.
  - Isso explica as 25 seções e os 89 eleitores restantes.
  - O número certo do 1º turno é o do autor: 12.433 seções e 156.880 eleitores.
  - Duas lentes chegaram a esse resultado de forma independente.

## Problemas

1. **Poder contra alteração coerente (Fato; as três lentes o mediram, com 3 conjuntos de mutações sobre cópias de AC 01007/0009/0001, 2º turno).** O verificador do próprio autor, rodado sem mudança de lógica, dá **0 violação** nestes casos:
   - um voto trocado de candidato com a cadeia refeita;
   - um registro do RDV trocado;
   - BU e RDV trocados de forma coerente;
   - enchimento completo, com BU, RDV reserializado e um ciclo inserido no log com hash inventado;
   - aptos +1;
   - detalhamento trocado com a mesma soma.

   O verificador pega só alteração ingênua: +1 voto sem refazer a cadeia, inserção ou remoção de registro do RDV, e voto a mais sem mexer no RDV e no log. A assinatura (`src/lacres.js`) pegou todas as mutações, e o controle sem mudança passou.

   Em aptos e detalhamento, só o SHA-512 do arquivo, lacrado no `-vota.vsc`, acusa. A assinatura sobre o último hash continua válida, porque a cadeia não cobre esses campos.

   O autor reconhece o limite em I1. O catálogo não diz que I2 a I5 também não têm poder contra alteração coerente.
2. **"O que fecha a porta é a assinatura" é premissa ainda não medida no universo (Pendente).**
   - 2º turno: `integridade-lacres.mjs` ainda estava rodando às 09:38 de 29/10. Todas as UFs têm arquivo parcial em `data/parsed/auditoria/integridade/2t/`, e não há resumo.
   - 1º turno: só `--sem-lacres` (identificadores).
   - `docs/analysis/integridade-nacional/` só tem os docs 01 e 06.

   Até isso fechar, a frase "nenhum BU alterado" não é Fato.
3. **O verificador não compara BU × RDV por candidato.** I5 compara só o conjunto de cargos. A comparação por candidato (C1 do auditor A) pega a troca no BU sozinha e a troca no RDV sozinha, mas não a troca coerente.
4. **O hash de encadeamento de cada linha do log não é conferido.** O algoritmo é desconhecido. A lente de alternativas testou 7 funções de hash com 7 formas de juntar a linha ao hash anterior, e nenhuma reproduziu o hash. Uma linha forjada com 16 hexadecimais quaisquer passa no ciclo do log. O log só é controle pela assinatura do log.jez.
5. **"10.209" mal posicionado (Fato).** No doc 04 do autor, "17.621 no 2º (10.209 só com a classe por biometria)". O 10.209 é 4.331 + 5.878, a soma dos dois turnos, porque o script soma `T2soBiometria` sem separar o turno.
6. **Item (d) mal rotulado (Fato).** O T2 usa `por_biometria + por_biografia`, isto é, todos os votantes com biometria cadastrada, e não "habilitados por biometria". O mesmo erro de rótulo está em `docs/pericia/04` e `06` (ver Correções).
7. **T2 retirado com explicação benigna não testada (absolvição por redefinição).**
   - Fato medido: o BU e o cadastro aberto discordam.
   - Hipótese: que o campo do cadastro seja o "errado".
   - Nas 10.209 combinações seção × turno em que até a classe "pela digital" passa do limite, a urna tinha um modelo de digital que o cadastro de julho não conta. Ou a coleta foi feita depois de julho, ou o modelo foi gravado na carga sem estar no cadastro.

   Os dados públicos não separam as duas explicações.
8. **30.054 conta duas vezes o mesmo arquivo.** São 18.116 seções distintas, e 17.940 delas usaram a mesma carga nos dois turnos. A repetição entre turnos não é evidência independente.
9. **Log de RJ descrito de forma imprecisa (doc 02 do autor).**
   - As 12 linhas "Voto confirmado" dos 2 ciclos não faltam: estão no arquivo, corrompidas ("Vmtm aolfirmado…", "Toto cmndipmadm papa…") ou fundidas a outra linha porque o `\n` virou `\b`.
   - A "urna 01740981" é a própria 01760983 com bits trocados.
   - As linhas que começam por "04-10/0006" são descartadas em silêncio pelo filtro `startsWith(dia)`. Isso explica `computadoSemHabilitacao = 2` e `habContabil = 1` nesse pacote.
   - A conclusão do autor não muda.
10. **I18 (linhas fora do catálogo) não foi medido no país.** Não se sabe quantos outros logs estão corrompidos. Com log corrompido, dois pontos do código ficam frágeis:
    - a deduplicação de cópias MI/ME por linha idêntica falha e pode contar votos em dobro (efeito de alarme falso);
    - o agrupamento pela coluna 3 cria "urnas fantasmas".
11. **Exclusões não declaradas pelo autor.** As 41 seções sem arquivo, as 1.040 cópias do AC, as 2 de MG fora de T3, as janelas sem fim e a seção com perfil nulo não aparecem nos docs 03 a 05 (tabela no início deste parecer).
12. **Nulo contado como "testada e sem violação".** Em SP 64777/0395/0298 (2º turno), a comparação `> 0` com NULL passa calada em D6, D7 e D8. No bruto, o log dá 241 + 1 + 26 = 268 votos, igual ao BU, e 0 voto fora da janela. O número não muda, mas o rótulo certo é "medidas no banco, sem a seção nula, mais 1 conferida no bruto".
13. **I14 descrito de forma errada (doc 05).** A janela não usa o relógio da urna, e sim a ordem dos eventos (`src/perfil-secoes.js`). I14 pega log fora de ordem, mas não testa ajuste de relógio nem o horário legal. Nos pacotes com 2 urnas, o perfil reordena por hora, defeito que o próprio autor já apontou.
14. **Menores.**
    - `mt.resumo.json` (2º turno) ainda mostra conf 309 e susp 10 da 1ª rodada. Só o resumo nacional reaplica `violacoes()`.
    - O casamento entre consulta popular e nome no log é uma regra prática: só vale com 1 consulta e 1 nome desconhecido.

## Explicações alternativas

| Explicação | Testada? | Resultado |
|---|---|---|
| Filtro silencioso no leitor do autor (`lerBu` posicional) produz zero sobre menos tuplas | Sim (reprodução) | Refutada: o leitor guiado pelo esquema conta as mesmas tuplas, com 0 divergência |
| T1 = 0 seria artefato da unidade (seção principal × agregadas) | Sim (definições) | Refutada: sem somar as agregadas seriam 29.703 violações; nenhuma seção mudou de agregação |
| O carregador copia aptos de uma eleição para outra, e I8 sai verdadeiro por construção | Sim (alternativas) | Refutada: `src/banco.js` grava `qtdEleitoresAptosSecao` de cada eleição do BU |
| Pacotes duplicados inflam ou escondem contagens | Sim (reprodução) | Existem 1.040 no AC, 2º turno, mas sem efeito: o autor escolhe pelo `aux.json` |
| Adversário fora da urna refaz a cadeia e altera BU e RDV de forma coerente | Sim (as três lentes) | Passa em I1 a I5 e no ciclo do log. Só a assinatura pega, e ela é Pendente no país |
| Adulteração por software dentro da urna, antes de assinar | Não (não é testável com estes arquivos) | Nem os invariantes nem a assinatura pegam por construção. É limite dos arquivos públicos (risco R4 e doc 07 da perícia) |
| Corrupção do log de RJ no transporte, na coleta ou na extração | Sim (as três lentes) | Refutada: o CRC-32 do zip, o SHA-512 lacrado e a assinatura da urna conferem |
| Edição deliberada do log de RJ | Sim (reprodução, alternativas e esta consolidação) | Improvável: 100% das trocas são o mesmo bit, sempre de 1 para 0, só em bytes de posição ímpar, inclusive no hash e nas quebras de linha; BU, RDV e log fecham. Quem tem a chave da urna não é excluído, mas o padrão não tem uso para fraude |
| Falha de hardware na urna de RJ | Sim | Fortemente apoiada (Hipótese técnica). Mecanismo exato não provado |
| A mesma falha afetaria o RDV, que não tem cadeia, sem violar contagem | Não | Aberta. Neste pacote, o RDV fecha com o BU por candidato |
| Cópias MI/ME do log do 1º turno dentro do pacote do 2º turno da mesma urna, com mais trocas do mesmo tipo e a linha original íntegra na ME | Sim, por uma lente (reprodução) | Relatado: 3.402 bytes trocados na MI; na ME, a linha das 08:31:25 traz o hash EF990EEB84DE5A4C, contra ED990EE@84DE5A4A no log assinado. **Não refeito nesta consolidação** |
| (d) O cadastro de julho e a carga de setembro contam conjuntos diferentes (data, base ou critério) | Não (só suposta) | Compatível; propriedade do arquivo, não do dia (17.940 de 18.116 seções com a mesma carga). Falta a fonte oficial por seção |
| (d) Digitais de terceiros inseridas na carga liberam eleitores ausentes | Sim, em parte (alternativas) | Sem sinal de comparecimento extra: +1,71 pp (2º turno) acima das vizinhas, contra +6,38 pp de efeito de seleção num placebo em 12 UFs. **Não exclui** troca de pessoa sem mudar o comparecimento. Uma lente só |
| (d) Reclassificação simples (urna diz "com" quem o cadastro dá "sem") | Sim, em parte (alternativas) | A parcela "sem biometria" do BU ÷ A não cai nas seções sinalizadas em relação às vizinhas (−0,0044 e +0,0009), como a reclassificação previa. As vizinhas também podem estar afetadas. Inconclusivo |
| A diferença do 1º turno entre o autor (12.433) e o B1a (12.082) seria erro do autor | Sim (definições e alternativas) | Refutada: o B1a está desatualizado (sem SP, sem as agregadas) |
| Votos fora da janela escondidos por perfil nulo | Sim | O único nulo foi conferido no bruto: 0 |

## Poder do teste

| Teste | O que pega | O que não pega |
|---|---|---|
| I1 cadeia | troca de voto sem refazer a cadeia | troca com a cadeia refeita; aptos, comparecimento e detalhamento (fora da cadeia) |
| I2 a I5 (contagens) | inserção ou remoção de registro do RDV; voto a mais sem mexer no RDV e no log | qualquer troca de candidato; alteração coerente |
| BU × RDV por candidato (C1 do auditor A, fora deste achado) | troca só no BU ou só no RDV | troca coerente nos dois |
| Assinatura da urna (`src/lacres.js`) | todas as mutações feitas fora da urna (6 de 6 numa lente, 9 de 9 noutra) | alteração feita dentro da urna antes de assinar; uso da chave da urna. **Ainda não rodada no país** |
| T1 | 1 eleitor fictício na carga em 43,2% das seções; 5 em 96,7%; 10 em 99,8% (alternativas). 214.742 seções com folga 0 | — |
| T3 | 1 troca de grupo em 0% das seções; 10 em 0,3%; 20 em 1,6%; 50 em 29,1% (alternativas) | troca de grupo de dezenas de eleitores |
| I14 | voto registrado fora da ordem "Urna pronta" → "Inicio do Encerramento" | ajuste de relógio; horário legal |

A curva de poder de T1 e T3 veio de uma só lente (alternativas). Ela não foi refeita nesta consolidação. As folgas (mediana 1 em T1 e 60 em T3) foram medidas por duas lentes.

## Pendências

- Conferência nacional das assinaturas, nos dois turnos. Sem ela, "nenhum BU alterado" não é Fato.
- I18: linhas de log fora do catálogo, medidas no país inteiro, para saber quantos logs estão corrompidos como o de RJ 60011/0008/0061. Junto, endurecer a deduplicação MI/ME e o agrupamento por urna contra logs corrompidos.
- Refazer, por uma segunda lente, as cópias MI/ME do log do 1º turno no pacote do 2º turno de RJ 60011/0008/0061.
- T2: pedir ao TSE (LAI) o número de eleitores com digital carregada no arquivo da urna, por seção, e o significado exato de `QT_ELEITORES_BIOMETRIA`. Até lá, T2 é risco aberto.
- Refazer a coluna do 1º turno do B1a e do parecer 01, com SP e com as agregadas do 1º turno.
- Corrigir no texto do autor: o 10.209 por turno, o rótulo "com biometria cadastrada", o log de RJ, o I14 pela ordem dos eventos e as exclusões listadas.
- Contraprova de C1 a C6 do auditor A com boletim e registro alterados de propósito (`docs/pericia/02`, pendência já aberta). Os testes desta revisão cobrem só o verificador do matemático forense.

## Comandos que reproduzem a revisão

```
node scripts/auditoria/cetico-isv-reproducao.mjs --turno 2      # cadeia, escolhas, RDV (leitor próprio)
node scripts/auditoria/cetico-isv-reproducao.mjs --turno 1
node scripts/auditoria/cetico-isv-turnos.mjs --conferir-uf ac   # T1, T2, T3, variação de aptos, folgas
node scripts/auditoria/cetico-invariantes-dados-turnos.mjs      # entre turnos, refeito sem o código do autor
node scripts/auditoria/cetico-invariantes-dados-biometria.mjs   # T2 × excesso inverso do parecer 01
node scripts/auditoria/cetico-invariantes-dados-sa.mjs          # as 20 da 1ª passada (MG, apuração mista)
node scripts/auditoria/cetico-isv-poder.mjs                     # mutações M0–M9
node scripts/auditoria/cetico-invariantes-dados-poder.mjs       # mutações S1–S8
node scripts/auditoria/cetico-invariantes-poder.mjs             # mutações C0–C6
node scripts/auditoria/cetico-isv-rj60011.mjs                   # RJ 60011/0008/0061: lacres e log
node scripts/auditoria/cetico-invariantes-log.mjs               # linhas fora do formato e distância de bits
node scripts/auditoria/cetico-invariantes-dados-rj.mjs
node scripts/auditoria/cetico-invariantes-alternativas.mjs      # poder de T1/T3 e reclassificação
node scripts/auditoria/cetico-invariantes-placebo.mjs           # placebo do comparecimento
node scripts/auditoria/cetico-isv-consolidacao.mjs              # esta consolidação: paridade do bit e T2 por turno
node src/lacres.js <pasta do pacote de RJ 60011/0008/0061, 1º turno>
node scripts/sql.mjs "select turno, count(*), sum(votos_fora_da_janela), sum(votos_fora_da_janela is null), sum(urna_pronta_s is null), sum(inicio_encerramento_s is null) from perfil_log group by turno"
node scripts/sql.mjs "select turno, situacao, count(*) from secao s where not exists (select 1 from perfil_log p where p.turno=s.turno and p.uf=s.uf and p.municipio=s.municipio and p.zona=s.zona and p.secao=s.secao) group by 1,2"
```

Saídas: `data/parsed/auditoria/cetico/isv/` (incluindo `consolidacao-rj-paridade.json`) e `data/parsed/auditoria/cetico/invariantes/`. Também `invariantes-poder.json`, `invariantes-rj-60011-0008-0061.json`, `invariantes-biometria-reconciliacao.json` e `invariantes-turnos-refeito.json`, na mesma pasta `cetico/`.

## Correções propostas para docs/pericia/ (não aplicadas)

1. `docs/pericia/04-liberacao-dos-eleitores.md`, item 3, linha "há também o efeito contrário": o rótulo "pela digital" está errado. O número conta todos os votantes com biometria cadastrada (digital + à mão). Pela digital, são 5.878 seções.
2. `docs/pericia/06-titulos-de-falecidos.md`, linha "há também o efeito no sentido inverso": o mesmo erro de rótulo ("liberados por digital").

O texto exato está na entrega ao coordenador.
