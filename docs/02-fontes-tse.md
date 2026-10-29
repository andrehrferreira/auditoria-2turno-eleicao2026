# 02. Fontes de dados do TSE (verificadas em 29/10/2026)

## Configuração global

**Fato.** `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json` lista ciclos, pleitos e eleições:

| Ciclo | Pleito | Data | Eleições |
|---|---|---|---|
| `ele2026` | `3220` | 04/10/2026 (1º turno) | Federal `6257`, Estadual `6259` |
| `ele2026` | `3221` | 25/10/2026 (2º turno) | Federal `6258`, Estadual `6260` (campo `cdt2` das eleições do 1º turno) |

O mesmo arquivo descreve o padrão de diretórios:

```
aux: <base>/<ambiente>/<ciclo>/arquivo-urna/<cd_pleito>/dados/<uf>/<municipio>/<zona>/<secao>
cs : <base>/<ambiente>/<ciclo>/arquivo-urna/<cd_pleito>/config/<uf>
```

com `base = https://resultados.tse.jus.br` e `ambiente = oficial`.

## Lista de seções por UF

**Fato.** `https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/config/{uf}/{uf}-p003221-cs.json`

- Estrutura: `abr[].mu[]` (município: `cd`, `nm`) → `zon[]` (zona: `cd`) → `sec[]` (seção: `ns`, data/hora `da`/`ha`).
- O arquivo de SP tem cerca de 6,3 MB.
- Também existe para o 1º turno, trocando `3221` por `3220`.

## Arquivos por seção

**Fato.** JSON auxiliar da seção:

```
https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3221/dados/{uf}/{mun}/{zona}/{secao}/p003221-{uf}-m{mun}-z{zona}-s{secao}-aux.json
```

O JSON traz `st` (ex.: `Totalizada`) e uma lista `hashes[]`. Cada hash tem `hash`, data/hora de recebimento (`dr`/`hr`), status e os arquivos (`arq[]`):

| Tipo (`tp`) | Exemplo de nome | Conteúdo |
|---|---|---|
| `bu` | `o03221sp6106902390162-bu.dat` | Boletim de Urna, binário |
| `rdv` | `o03221sp6106902390162-rdv.dat` | Registro Digital do Voto, binário |
| `log` | `o03221sp6106902390162-log.jez` | Log da urna. **Em 2026 é ZIP** (assinatura `PK`), não 7z como em 2022/2024. Contém um único `logd.dat` em ISO-8859-1 |
| `vota` | `o03221sp6106902390162-vota.vsc` | Arquivo DER/ASN.1 (provável pacote de assinaturas). O `hash` da seção é o SHA-256 dele (ver abaixo) |

Os arquivos ficam no mesmo diretório do `aux.json`, sob o subdiretório do hash:

```
.../dados/{uf}/{mun}/{zona}/{secao}/{hash}/{nome_do_arquivo}
```

**Fato (29/10/2026).** Caminho confirmado no download da seção ES 57037/0055/0372 (ver [casos/es-57037-z0055-s0372.md](casos/es-57037-z0055-s0372.md)).

**Fato.** O campo `hash` do `aux.json` é uma string base64 codificada em hex, com `/` trocado por `-` para não quebrar a URL (`+` e `=` ficam). No AC, 1040 de 2270 hashes têm `-`. Decodificando hex → base64 (desfazendo a troca) → bytes, o resultado é o **SHA-256 do arquivo `-vota.vsc`**. Serve como checagem de integridade do download:

```
echo <hash> | xxd -r -p | tr -- '-' '/' | base64 -d | xxd -p -c64   # deve ser igual a sha256sum *-vota.vsc
```

**Fato.** O número da seção **não é único dentro do município**: em Vila Velha (57037) a seção 0372 existe nas zonas 0032 e 0055. A chave de uma seção é sempre `(uf, município, zona, seção)`.

Observação: uma seção pode ter **mais de um hash**, por exemplo quando houve reenvio ou contingência. Todos os hashes devem ser baixados e registrados, não só o último.

## Pacotes consolidados por UF (CDN)

**Fato.** Existe pacote zip por UF para o 2º turno:

```
https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/arqurnatot/bu_imgbu_logjez_rdv_vscmr_2026_2t_{UF}.zip
```

Conferido para `AC` (HTTP 200, `Last-Modified: Mon, 26 Oct 2026 19:56:12 GMT`).

**[a confirmar]** Disponibilidade das demais UFs e do 1º turno (`_1t_`), e se o conteúdo do zip é idêntico ao dos arquivos por seção. Validar comparando SHA-256 numa amostra.

## Decodificação do BU/RDV

- Em 2024 o crawler capturava o BU já decodificado pelo console do site (objeto `entidadeBoletimUrna`), via Puppeteer.
- **Recomendação.** Em 2026, decodificar o `.dat` direto pela especificação ASN.1 que o TSE publica, sem depender do front-end do site. É mais rápido, não exige navegador e permite validar assinatura e hash.
- **[a confirmar]** URL da especificação ASN.1 do BU/RDV e das ferramentas de verificação de 2026, no portal do TSE (seção "Arquivos de urna" / "Eleições 2026").
- **Fato.** Mesmo sem a especificação, os `.dat` de 2026 são DER e dão para ler com um leitor DER genérico. O mapa dos campos observados está em [06-leitura-bu-rdv-log.md](06-leitura-bu-rdv-log.md).

## Dados abertos complementares

- Portal: <https://dadosabertos.tse.jus.br/>
- De interesse: perfil do eleitorado por seção (faixa etária, biometria), locais de votação, correspondências esperadas/efetivadas (cruzamento urna × seção) e resultados por seção.
- **[a confirmar]** Publicação dos datasets de 2026, com nomes e datas.
