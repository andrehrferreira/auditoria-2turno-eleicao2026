Você é revisor independente de uma auditoria pública dos arquivos de urna do 2º turno das eleições brasileiras de 2026 (25/10/2026; 1º turno em 04/10/2026). Os arquivos (BU, RDV, log, assinaturas .vsc) são publicados pelo TSE. Seu trabalho é achar erros, riscos de interpretação e explicações alternativas, não confirmar o que já foi feito.

Regras:
- Responda em português do Brasil.
- Separe Fato (verificável no material abaixo ou em fonte primária citada), Hipótese e Recomendação.
- Não invente números, URLs, normas nem nomes de resolução. Se não souber, diga "não sei" e como verificar.
- Responda SOMENTE com um JSON neste formato:
{"resumo": "<3 a 6 frases>", "achados": [{"id": "A1", "tipo": "erro|risco|explicacao-alternativa|melhoria|fonte", "afirmacao": "<o que você afirma>", "evidencia": "<trecho, linha de código ou fonte que sustenta>", "confianca": 0.0, "como_verificar": "<teste ou consulta concreta>"}]}
- Lista vazia só com justificativa no resumo.

## Tarefa T11: interpretar a liberação manual de eleitor com digital que não é de mesário cadastrado

Mensagens do log de urna (2º turno, AC inteiro, 2.270 seções, 453.714 habilitações; logs duplicados removidos):
- Habilitação: por biometria do eleitor 415.724; "Ano de nascimento digitado é igual ao do cadastro" sem tentativa de digital 15.329; "Solicitação de dado pessoal do eleitor para habilitação manual" seguida de "Dado digitado confere" 22.788.
- Nenhuma habilitação sem uma dessas três conferências (0 de 453.714).
- Tentativas de ano/dado: no máximo 1 erro antes de liberar (175 liberações sem biometria e 306 manuais acertaram na 2ª tentativa).
- Depois de "Dado digitado confere" vem "Solicita digital do mesário". Em 15.686 casos aparece "Mesário <título> habilitou o eleitor". Em 2.899: "Digital coletada bate com uma digital gravada após o registro inicial de mesário. Não é possível associar a habilitação a um mesário." Em 4.077: "Não encontrou digital coletada em nenhum dos arquivos, vai salvar a digital em novo arquivo." Isso ocorreu em 733 das 2.270 seções.
- Numa seção de 263 votantes (ES): 12 liberações manuais, 7 com "Mesário habilitou", 1 "vai salvar a digital em novo arquivo" seguida de 4 "bate com uma digital gravada após o registro inicial", ou seja, a mesma digital desconhecida liberando 5 eleitores. Há também linhas "Biometria coletada não é do mesário <título> (<número>)", "Pedido de leitura da biometria do mesário" e "Biometria do mesário <título> encontrada nos arquivos coletados".
- O pacote de assinaturas lista arquivos não publicados: wsqbio.jez, wsqman.jez, wsqmes.jez (imagens de digitais, formato WSQ).
- Comparando 1º e 2º turno nas mesmas seções, a quantidade dessas liberações manuais sem mesário associado muda muito em algumas seções (em AL, uma seção teve 120 a menos no 2º turno).

Perguntas:
1. Qual a leitura mais provável dessas mensagens? A urna aceita qualquer digital no passo "digital do mesário" quando ela não bate com um mesário registrado?
2. Explicações inocentes (mesário que não registrou digital na abertura, substituto, falha de leitor, registro de mesário no meio do dia) e como distinguir cada uma com o próprio log (ordem e horário das mensagens).
3. Que padrões no log indicariam abuso (uma pessoa liberando muitos eleitores sem biometria) e que limiar faz sentido?
4. Qual dos arquivos wsq* provavelmente guarda essas digitais e o que só o TSE consegue verificar?

### Arquivo `docs/06-leitura-bu-rdv-log.md`

```markdown
# 06. Leitura do BU, do RDV e do log (formato observado em 2026)

Mapa construído em 29/10/2026 a partir da seção ES 57037/0055/0372 ([casos/es-57037-z0055-s0372.md](casos/es-57037-z0055-s0372.md)), cruzando campo a campo com o log da urna. Depois foi conferido contra a especificação oficial v2 do TSE (doc 02): os enums de tipo de voto do BU e do RDV e a ordem dos campos do BU batem com ela.

## Ferramentas

- **Conversor para JSON legível** (para pessoas e LLMs): `node src/exportar.js --uf ac --municipio 01007 [--zona 0009] [--secao 0003] [--log dia|completo|nao]`. Gera um arquivo por seção em `data/parsed/<t>t/json/<uf>/<município>/<zona>-<seção>.json`, com:
  - BU, RDV, BU impresso (`imgbu`, como texto) e pacote de assinaturas, decodificados pela **especificação oficial v2** (`src/esquemas.js` transcreve `bu.asn1`, `rdv.asn1` e `assinatura.asn1`; `src/asn1.js` é o decodificador). Os campos têm os nomes da especificação e os enums vêm por nome;
  - nome do candidato e do partido em cada votável (`node src/referencia.js --turno N` baixa os candidatos e municípios do TSE);
  - eventos do log (do dia da votação, por padrão), com resumo e métricas (`perfilLog`);
  - SHA-256 e URL de cada arquivo, e o resultado da verificação das assinaturas (`verificarLacres`).
  - O log ocupa ~99% do tamanho (~570 KB por seção); com `--log nao`, fica em ~40 KB.
- **Fato (29/10/2026).** Os arquivos reais de 2026 decodificam pela especificação v2 sem nenhum campo fora do previsto no BU, no RDV e no envelope do `imgbu`, inclusive nas urnas de contingência e no Sistema de Apuração. Desvios só no `.vsc`: `conjuntoChave [0]` e `certificadoDigital [1]` com tag de contexto, e o modelo do equipamento no fim, numa SEQUENCE com um segundo ENUMERATED não documentado (valor 4 nas amostras).
- **`imgbu.dat`** = envelope com o **BU impresso em texto** (latin1), intercalado com blocos binários. **Hipótese:** os blocos são QR codes e comandos de impressora; o formato deles não está na especificação v2.
- `openssl asn1parse -inform DER -in arquivo.dat -i` mostra a estrutura, mas **não mostra o valor das tags de contexto** (`[1]`, `[2]`...), onde ficam os votos. Use um leitor DER genérico (≈20 linhas de Node) que imprima inteiros e strings de qualquer tag.
- `7z x arquivo-log.jez` extrai o `logd.dat`. Converter com `iconv -f ISO-8859-1 -t UTF-8`.

## BU (`-bu.dat`)

Envelope externo: `SEQUENCE { cabeçalho {dataGeração, [2] pleito}, fase ENUM, [0] identificação {município, zona, local, seção}, tipo ENUM, OCTET STRING (conteúdo DER) }`.

Conteúdo (o OCTET STRING é outro DER):

| Campo observado | Exemplo (caso ES) | Conferido com o log |
|---|---|---|
| cabeçalho: data de geração, pleito | `20261025T170332`, `3221` | sim (geração do bu.dat 17:03:32–33) |
| fase | `2` (oficial) | "Fase da UE: Oficial" |
| urna → versão | `10.23.0.0 - Praia da Barra do Cahy` | sim |
| urna → correspondência → município/zona/seção | 57037 / 55 / 372 | sim |
| urna → carga → número interno da urna | `2199150` | coluna 3 do log (`02199150`) |
| urna → carga → computador da mídia | `ZES055STD01`, TPM `76FBD81B`, instalação `72791717` | sim |
| urna → carga → data/hora da carga | `20260922T182300` | log de 22/09 |
| urna → carga → código de carga | string de 24 dígitos | — |
| urna → serial da MV (inteiro) | `720251443` = `0x2AEE2A33` | "Serial da MV: 2AEE2A33" |
| identificação da seção → **local** | `1430` | — |
| data/hora de emissão | `20261025T170317` | "Inicio do Encerramento 17:03:16" |
| `[0]` abertura / encerramento | `T080001` / `T170139` | "Urna pronta" 08:00:01 / encerramento confirmado 17:01:39 |
| inteiro após `[0]` | `263` = comparecimento | 263 "voto computado" |
| `[1] detalhamentoComparecimento` | `38, 213, 12` | Nomes oficiais (spec v2): `qtdEleitoresCompareceramSemBiometria` (sem biometria cadastrada), `qtdEleitoresHabilitadosPorBiometria`, `qtdEleitoresHabilitadosPorBiografia` (tinham biometria e foram liberados por ano de nascimento). **Fato:** no AC inteiro os três batem com o log em 2.270/2.270 seções, contando só habilitações que terminaram em voto |
| resultados por eleição | `6258` (federal), `6260` (estadual) | — |
| → aptos: total, originais da seção, temporários (TTE) | `363`, `363`, `0` | — |
| → tipo de cargo ENUM, comparecimento | `1`, `263` | — |
| → cargo `[1]` | `1` Presidente, `3` Governador | — |
| → votável `{[1] tipo, [2] qtd, [3] {partido, número}, ordem, assinatura 64 B}` | ver caso | soma = comparecimento |

**Enum de tipo de voto no BU:** `1` nominal, `2` branco, `3` nulo.

## RDV (`-rdv.dat`)

Estrutura observada: `SEQUENCE { cabeçalho, urna (igual ao BU), SEQUENCE { pleito, fase, identificação, código de carga, [1] eleições } }`. Cada eleição: `{ id, SEQUENCE OF { [1] cargo, qtd. escolhas, SEQUENCE OF voto } }`; cada voto: `{ tipo ENUM, digitação NumericString opcional }`. Os votos vêm **ordenados**, não na ordem de votação (preserva o sigilo).

**Atenção: o enum do RDV é diferente do BU.** No RDV: `2` nominal, `3` branco (sem digitação), `4` nulo (com a digitação feita, ex. `00`, `66`).

O nulo no RDV guarda o número digitado. Exemplo do caso: 5 nulos para Governador com digitação `13`, que é o número de um candidato a Presidente. Isso ajuda a separar "nulo intencional" de "eleitor confundiu o cargo".

## Pacote de assinaturas (`-vota.vsc`)

Especificação: `spec/assinatura.asn1` do pacote oficial (doc 02). Verificador: `node src/lacres.js <diretório-do-hash>`.

**Estrutura observada em 2026** (difere da spec v2 de 2024, que põe `modeloEquipamento` primeiro):

```
SEQUENCE {
  assinaturaSW  EntidadeAssinatura   -- usuário "SEVIN", algoritmo 3 = CEPESC (não publicado), [0] conjunto de chaves
  assinaturaHW  EntidadeAssinatura   -- usuário "UEAO", id = nº interno da urna, algoritmo 4 = EdDSA (ou 2 = ECDSA), [1] certificado
  SEQUENCE { modelo ENUM (20 = UE2020), ENUM }
}
EntidadeAssinatura = { data, versão, autoAssinado {usuário, hash, algoritmo, {tamanho, hash, assinatura}}, OCTET STRING (lista), [0]|[1] extra }
item da lista      = { nome do arquivo, { tamanho, hash SHA-512 (64 B), assinatura } }
```

**Como verificar (Fato, conferido em 29/10/2026 contra os exemplos `assinatura_hash.py`, `bu_assinatura_tuplas.py` e `lib/mr_util.py` do TSE):**

| Conferência | Mensagem assinada | Chave |
|---|---|---|
| Certificado da urna | `TBSCertificate` (bytes DER). Em ECDSA, com SHA-512 | AC emissora (`data/certificados/ac/`) |
| Cada arquivo do bloco HW | **`SHA-512(hash do arquivo)`**, não o arquivo | certificado da urna |
| Lista do bloco HW (`autoAssinado`) | `SHA-512(hash da lista)` (o exemplo do TSE só confere o hash; a assinatura também confere) | certificado da urna |
| Último hash das tuplas do BU, por eleição | `SHA-512(ultimoHashVotosVotavel)` | certificado da urna |

- **Ed521**: OID `1.3.6.1.4.1.44588.2.1` (arco da Kryptus, registro IANA nº 44588). EdDSA sobre E-521: `p = 2^521 − 1`, `d = −376014`, SHAKE256 com saída de 132 bytes e prefixo `"SigEd521" 00 00`; chave de 66 bytes, assinatura de 132 bytes (R‖S, little-endian). Parâmetros da ECPy (`curve_defs.py`), a biblioteca usada pelos exemplos do TSE. Implementação em `src/ed521.js`, validada com os vetores de teste da ECPy (`test/ed521.test.js`).
- **ECDSA P-521** (urnas UE2013/UE2015, AC URNA): **Fato (29/10/2026)**, conferido em seção real: ZZ 29173/0001/0494 (Sistema de Apuração, urna UE2015, certificado DER `ueao01808076` emitido pela AC URNA). 17/17 conferências, inclusive a cadeia de hashes do BU. Amostra em `test/fixtures/lacres/zz-29173-0001-0494-sa-ue2015`.
- **Observação: AC URNA vencida.** O certificado publicado da AC URNA vale de 22/07/2011 a **18/07/2026**, antes da eleição, mas continua validando certificados de urna emitidos depois disso. **Hipótese:** a AC foi renovada com a mesma chave e o certificado novo não foi publicado. `src/lacres.js` registra isso em `observacoes` (não conta como falha). Esclarecer com o TSE.
- **Sistema de Apuração (SA):** pacote com `-sa.vsc`, `-busa.dat`, `-logsa.jez`, `-imgbusa.dat` (doc 03). No BU do SA, `dadosSecaoSA` vem como `[1] dadosSA` (sem abertura/encerramento) na mesma posição em que o BU de seção tem `[0]`; o detalhamento do comparecimento também é `[1]`, mas na posição seguinte. Ler por posição, não pela tag.
- **Fato (29/10/2026).** AC completo, 2º turno: 2.270 seções (3.310 diretórios de hash, contando as cópias zip + por seção), 0 falhas. Emissores: AC UE2022 em 1.884 diretórios, AC UE2020 em 1.426. Tempo: ~0,14 s por diretório (Ed521 em BigInt, sem paralelismo); projeção nacional de ~500 mil seções ≈ 20 h em um núcleo, e pode ser paralelizada.
- O **bloco SW (CEPESC)** usa algoritmo de criptografia não publicado: o hash confere, a assinatura não é verificável por terceiros.
- A lista tem 11 arquivos; o portal publica `bu.dat`, `rdv.dat`, `log.jez` e, no zip por UF, `imgbu.dat`. Os demais (`jufa.dat`, `imgze.dat`, `hash.dat`, `wsqbio.jez`, `wsqman.jez`, `wsqmes.jez`, `mr.ver`) só têm o lacre do hash conferível. `wsq*` são imagens de digitais (dado pessoal sensível).
- O `hash` do aux.json é o SHA-256 do arquivo `.vsc` inteiro, em base64 com `/` → `-`, codificado em hex (doc 02).

### Cadeia de hashes das tuplas do BU

Cada linha de votos do BU ("tupla") tem um hash que depende da anterior; o último é assinado pela urna.

```
h0 = SHA-512("pppp5|eeee5|mmmm5|zzz4|sss4|<codigoCarga 24>")         -- latin1; h em hex MAIÚSCULO
hN = SHA-512("<hN-1>|<ordem>|<codigoCargo>|<tipoVoto>|<qtd>|<codigo>|<partido>")   -- branco/nulo: sem os dois últimos
```

- `ordem` reinicia em 1 a cada cargo; `h0` é recalculado a cada eleição.
- **Urna de contingência** (`tipoUrna = 4`, "reservaSecao"): `correspondenciaResultado.identificacao` vem como `[1]` e traz só o município/zona de **origem** da urna reserva. O `h0` usa município/zona/seção de **`identificacaoSecao`** (onde a urna foi instalada) e o `codigoCarga` da própria urna. O exemplo do TSE (`bu_assinatura_tuplas.py`) assume `[0]` e falharia nesses casos. Conferido em AC 01007/0009/0002.
- `ResultadoVotacaoPorEleicao` traz três contagens de aptos: total, originais da seção e temporários (TTE).

## Log (`logd.dat`)

- **Horário local da UF**, não de Brasília (Fato: seção do AC abre às 06:00:01 e encerra às 15:03:35 = 08:00 e 17:03 de Brasília). O BU segue o mesmo relógio.
- Colunas separadas por TAB: `data hora`, `nível` (INFO/ALERTA/ERRO), `nº interno da urna`, `aplicação` (LOGD, GAP, SCUE, VOTA, ATUE, INITJE), `mensagem`, `hash de encadeamento` (16 hex).
- **Urna de contingência: dois logs no mesmo pacote.** O `log.jez` traz o `logd.dat` da urna reserva **e**, dentro dele, outro `.jez` com o log da urna original que quebrou (nome `{nº urna}{ddmmaaaa}{hhmmss}-01.jez`, ex.: `0227604025102026133917-01.jez`). Os votos dados antes da quebra estão no log da urna original. Para contar, juntar as linhas dos dois em ordem de horário (`src/perfil-secoes.js`, `lerLogs`). **Fato:** no AC, 39 pacotes com 2 ou mais logs; lendo só o `logd.dat`, 3 seções pareciam ter 10 vezes menos votos que o BU.
- **Leitura do `.jez`:** alguns ZIPs gravam o tamanho comprimido só no diretório central (bit 3 das flags), com zeros no cabeçalho local. Ler sempre pelo diretório central, como faz `src/zip.js` (que também confere o CRC-32). Um leitor que usa só o cabeçalho local falha em silêncio: no AC, 50 de 2.270 logs.
- **Seriais das mídias no log:** `Número de série da MR` (mídia de resultado, o cartão levado ao cartório) e `Serial da MV` (= `numeroSerieFV` do BU) aparecem a cada inicialização. Urna ligada na véspera (24/10) e não religada no dia lê a MR só em 24/10 (11 seções no AC).
- O log é **cumulativo**: o arquivo do 2º turno traz a carga, os testes, o 1º turno inteiro e o 2º turno. Para analisar um turno, filtrar pela data.
- Ciclo de um eleitor: `Aguardando digitação do identificador` → `Identificador digitado pelo mesário foi: (CPF | Título de eleitor)` → forma de habilitação → `Eleitor foi habilitado` → `Voto confirmado para [cargo]` (1 por cargo) → `O voto do eleitor foi computado`.

Formas de habilitação no log e campo correspondente no BU `[1]` (contar por ciclo de eleitor: de `Aguardando digitação do identificador do eleitor` até `O voto do eleitor foi computado`; habilitação cancelada não entra):

| Sequência no log | Classe | BU |
|---|---|---|
| `Tipo de habilitação do eleitor [biométrica]` | biometria | porBiometria |
| `Ano de nascimento digitado é igual ao do cadastro`, sem tentativa de digital | eleitor **sem biometria cadastrada** (confirmado pela spec) | semBiometria |
| `Solicitação de dado pessoal…` → `Dado digitado confere` → `Mesário … habilitou o eleitor` | tinha biometria, a digital falhou, liberado por ano de nascimento com a digital do mesário | porBiografia |
| `Solicitação de dado pessoal…` → `Dado digitado confere`, sem linha do mesário | tinha biometria, a digital falhou, liberado por ano de nascimento sem digital do mesário | porBiografia |

**Mensagens de situação do eleitor (catálogo do AC, 25/10/2026, 2.270 seções).** Úteis para os testes de H05: `O eleitor identificado já votou` (680), `Eleitor já justificou` (174), `Eleitor não encontrado para o identificador informado` (4.175), `Ano de nascimento digitado é diferente do cadastro` (245), `Habilitação cancelada durante confirmação de dado do eleitor` (1.776), `Eleitor foi suspenso pelo mesário` (103), `Eleitor impedido - título suspenso | título cancelado | vota na seção original | não tem idade mínima | convocado pela Justiça Eleitoral | solicitou voto em trânsito | é militar em serviço`. O log grava o **tipo** de identificador digitado, nunca o número do eleitor.

**Títulos de mesários no log.** O log traz o número do título dos mesários (registro, habilitação, encerramento). É dado de arquivo público do TSE e pode ser usado sem máscara (doc 05, regra 6a).

## Mensagens recorrentes, sem indício de problema até aqui

- `ERRO GAP Problema ao desmontar a MR`: aparece em toda inicialização da mídia de resultado no caso estudado (14/10, 19/10, 24/10, 25/10), logo antes de passar o controle ao VOTA, e a votação segue normal. **Hipótese:** mensagem benigna do aplicativo. Medir a frequência em outras urnas antes de concluir.
- `ALERTA GAP Urna não testada`: na carga e na preparação do 2º turno.
- `ALERTA VOTA Identificador do eleitor digitado inválido`: erro de digitação do mesário.
- Urna ligada em 24/10 e mantida ligada até a abertura de 25/10, sem nova inicialização: 11 seções no AC. **Hipótese:** preparação na véspera; conferir se é procedimento previsto.
- Duas linhas "Urna ligada" com 1–2 min de intervalo, sem aplicação iniciada na primeira: reinício logo após ligar. **Hipótese:** manuseio da chave/energia; o log não registra o motivo.

```
