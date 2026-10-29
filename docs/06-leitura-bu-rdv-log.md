# 06. Leitura do BU, do RDV e do log (formato observado em 2026)

Mapa construído em 29/10/2026 a partir da seção ES 57037/0055/0372 ([casos/es-57037-z0055-s0372.md](casos/es-57037-z0055-s0372.md)), cruzando campo a campo com o log da urna. Não há especificação oficial de 2026 em mãos: os nomes dos campos são **inferidos** (estrutura do BU de 2022 + conferência com o log). Quando a especificação for localizada, revisar este documento.

## Ferramentas

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
| `[1] { a, b, c }` | `38, 213, 12` | a = habilitados por ano de nascimento; b = biometria; c = por dado pessoal (com ou sem mesário). Ver tabela do log |
| resultados por eleição | `6258` (federal), `6260` (estadual) | — |
| → aptos (aparece 2×) | `363`, `363` | — |
| → tipo de cargo ENUM, comparecimento | `1`, `263` | — |
| → cargo `[1]` | `1` Presidente, `3` Governador | — |
| → votável `{[1] tipo, [2] qtd, [3] {partido, número}, ordem, assinatura 64 B}` | ver caso | soma = comparecimento |

**Enum de tipo de voto no BU:** `1` nominal, `2` branco, `3` nulo.

## RDV (`-rdv.dat`)

Estrutura observada: `SEQUENCE { cabeçalho, urna (igual ao BU), SEQUENCE { pleito, fase, identificação, código de carga, [1] eleições } }`. Cada eleição: `{ id, SEQUENCE OF { [1] cargo, qtd. escolhas, SEQUENCE OF voto } }`; cada voto: `{ tipo ENUM, digitação NumericString opcional }`. Os votos vêm **ordenados**, não na ordem de votação (preserva o sigilo).

**Atenção: o enum do RDV é diferente do BU.** No RDV: `2` nominal, `3` branco (sem digitação), `4` nulo (com a digitação feita, ex. `00`, `66`).

O nulo no RDV guarda o número digitado. Exemplo do caso: 5 nulos para Governador com digitação `13`, que é o número de um candidato a Presidente. Isso ajuda a separar "nulo intencional" de "eleitor confundiu o cargo".

## Pacote de assinaturas (`-vota.vsc`)

Dois blocos com a mesma forma: `{ data, versão, metadados { nome+id, algoritmo de hash, algoritmo+tamanho de assinatura, {tamanho, hash, assinatura} da lista }, OCTET STRING (lista de arquivos), chave/certificado }`. Cada item da lista: `{ nome do arquivo, { tamanho, hash 64 B, assinatura } }`.

| Bloco | Id | Hash | Assinatura | Extra |
|---|---|---|---|---|
| `SEVIN` | `20260708` | código 4 = **SHA-512** (conferido) | código 3, "256", 4.765 B, começa com o texto `24.01.03` | `[0]` com 12 bytes de texto |
| `UEAO` | nº interno da urna | código 4 = **SHA-512** (conferido) | código 4, "521", 132 B | `[1]` certificado PEM `CN=UEAO0<nº urna>`, emitido por `CN=AC UE2020, O=TSE`, válido 2022–2036 |

- A lista tem 11 arquivos; só 3 são publicados no portal (`bu.dat`, `rdv.dat`, `log.jez`). Os outros (`jufa.dat`, `imgbu.dat`, `imgze.dat`, `hash.dat`, `wsqbio.jez`, `wsqman.jez`, `wsqmes.jez`, `mr.ver`) aparecem só com nome, tamanho e hash. `wsq*` são imagens de digitais (dado pessoal sensível, não publicável).
- O algoritmo do certificado é o OID `1.3.6.1.4.1.44588.2.1`, que o OpenSSL não conhece. **Hipótese:** curva Ed521 usada pelo TSE. **[a confirmar]** na documentação/ferramenta oficial de verificação.
- O `hash` do aux.json é o SHA-256 do arquivo `.vsc` inteiro (doc 02).

## Log (`logd.dat`)

- Colunas separadas por TAB: `data hora`, `nível` (INFO/ALERTA/ERRO), `nº interno da urna`, `aplicação` (LOGD, GAP, SCUE, VOTA, ATUE, INITJE), `mensagem`, `hash de encadeamento` (16 hex).
- O log é **cumulativo**: o arquivo do 2º turno traz a carga, os testes, o 1º turno inteiro e o 2º turno. Para analisar um turno, filtrar pela data.
- Ciclo de um eleitor: `Aguardando digitação do identificador` → `Identificador digitado pelo mesário foi: (CPF | Título de eleitor)` → forma de habilitação → `Eleitor foi habilitado` → `Voto confirmado para [cargo]` (1 por cargo) → `O voto do eleitor foi computado`.

Formas de habilitação no log e campo correspondente no BU `[1]`:

| Sequência no log | Classe | BU |
|---|---|---|
| `Tipo de habilitação do eleitor [biométrica]` | biometria | b |
| `Ano de nascimento digitado é igual ao do cadastro`, sem tentativa de digital | eleitor sem biometria usável (hipótese: sem biometria cadastrada) | a |
| `Solicitação de dado pessoal…` → `Dado digitado confere` → `Mesário … habilitou o eleitor` | falha biométrica, liberado pelo mesário | c |
| `Solicitação de dado pessoal…` → `Dado digitado confere`, sem linha do mesário | falha biométrica, liberado por dado pessoal | c |

**Dados pessoais no log.** O log traz o **número do título dos mesários** (registro, habilitação e "Título digitado para encerramento"). É dado pessoal: mascarar em qualquer saída (ex.: "Mesário A") e nunca publicar. Ver [05-dados-pessoais-lgpd.md](05-dados-pessoais-lgpd.md).

## Mensagens recorrentes, sem indício de problema até aqui

- `ERRO GAP Problema ao desmontar a MR`: aparece em toda inicialização da mídia de resultado no caso estudado (14/10, 19/10, 24/10, 25/10), logo antes de passar o controle ao VOTA, e a votação segue normal. **Hipótese:** mensagem benigna do aplicativo. Medir a frequência em outras urnas antes de concluir.
- `ALERTA GAP Urna não testada`: na carga e na preparação do 2º turno.
- `ALERTA VOTA Identificador do eleitor digitado inválido`: erro de digitação do mesário.
- Duas linhas "Urna ligada" com 1–2 min de intervalo, sem aplicação iniciada na primeira: reinício logo após ligar. **Hipótese:** manuseio da chave/energia; o log não registra o motivo.
