# Biometria e mesários: método, dados e premissa

Auditor B. Pergunta: mesários liberaram pessoas para votar no lugar de eleitores reais (H05, H02, H07; doc 07, itens A5, A9, A11, A13, B1, B1a, B1b e B4)?

## Premissa: nunca confiar em pessoas

Vale o princípio 8 de [01-premissas](../../01-premissas.md): procedimento feito por gente não é controle nem explicação benigna. Nesta análise:

- **Controle técnico com rastro:** só a habilitação por **biometria** registrada no log (`Tipo de habilitação do eleitor [biométrica]`).
- **Brecha humana:** as três formas de liberação sem digital do eleitor. Cada uma depende só do que alguém digita ou decide na mesa:
  1. **ano de nascimento, eleitor sem biometria na urna:** pede título (ou CPF) e o ano de nascimento;
  2. **liberação manual com digital de mesário identificado:** título, dado pessoal e uma digital que a urna associa a um mesário registrado;
  3. **liberação manual sem associação nominal:** título, dado pessoal e uma digital que a urna grava sem ligar a mesário nenhum.
- Não valem como explicação: conferência de documento com foto, foto do eleitor na tela da urna (`Foto do eleitor apresentada`, que só o mesário vê) e acompanhamento de fiscal.
- Explicações **técnicas** continuam valendo, desde que verificáveis nos arquivos. Por exemplo: o caminho de habilitação é decidido pela urna a partir do arquivo de eleitores carregado nela, e o log mostra se a urna pediu digital.

Uma brecha aberta, sozinha, não prova fraude. Os testes abaixo medem se o uso da brecha deixa padrão compatível com fraude.

## Dados (sem coleta nova)

| Fonte | Uso | Observação |
|---|---|---|
| Perfis por seção `data/parsed/<t>t/perfil/` (`src/perfil-secoes.js`) | detalhamento do BU (`semBiometriaCadastrada`, `porBiometria`, `comBiometriaHabilitadosPorAnoNascimento`), votos de presidente, modelo da urna | 2º turno: 499.207 seções. 1º turno: 26 UFs. SP ainda estava sendo gerado e ficou fora |
| `perfil_eleitor_secao_2026_<UF>.zip` (dados abertos, gerado em 14/07/2026) | `QT_ELEITORES_PERFIL`, `QT_ELEITORES_BIOMETRIA` ("aptos com biometria cadastrada", segundo o leiame do TSE) e faixa etária por seção | **Não traz urbano/rural.** O `eleitorado_local_votacao` também não traz |
| Banco `data/db/eleicao2026.sqlite` | seções agregadas (o cadastro da agregada é somado ao da principal), local de votação, hash do pacote | só leitura |
| Logs brutos do 2º turno, `.../urnas/<uf>/.../*-log.jez` | rajadas de `já votou`, classe de cada habilitação, mesários, horários | 499.207 pacotes, 0 erro. O log é cumulativo e traz também o dia do 1º turno da mesma urna |

## Scripts (Node 24, sem dependências)

Rodar na ordem. As saídas ficam em `data/parsed/auditoria/biometria/` (fora do git).

```bash
node scripts/auditoria/biometria-cadastro.mjs                 # cadastro por seção (11 min)
node scripts/auditoria/biometria-varredura-logs.mjs --paralelo 3   # logs do 2º turno (~1 h, retomável por UF)
node scripts/auditoria/biometria-b1a.mjs --turno 2
node scripts/auditoria/biometria-b1a.mjs --turno 1 --uf ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt,pa,pb,pe,pi,pr,rj,rn,ro,rr,rs,sc,se,to
node scripts/auditoria/biometria-b1a-diagnostico.mjs
node scripts/auditoria/biometria-rajadas.mjs
node scripts/auditoria/biometria-mesarios.mjs
node scripts/auditoria/biometria-rajadas-alvo.mjs                 # relê os logs das seções com rajada de 10 ou mais
node scripts/auditoria/biometria-manual-massa.mjs                 # relê os logs das seções com 50% ou mais de liberação manual
node --max-old-space-size=16000 scripts/auditoria/biometria-a9-h07.mjs --ufs-1t ac,al,am,ap,ba,ce,df,es,go,ma,mg,ms,mt,pa,pb,pe,pi,pr,rj,rn,ro,rr,rs,sc,se,to
```

**Validação da varredura (Fato, 29/10/2026).** No AC, as classes de habilitação contadas no log batem com o detalhamento do BU nas 2.270 seções. Os totais (biometria 415.675; ano de nascimento 15.325; mesário identificado 15.680; sem associação nominal 6.974) são iguais aos do doc 06.

**Dia do 1º turno lido do log do 2º turno.** A urna pode ter servido outra seção no 1º turno. A varredura compara município, zona e seção gravados na inicialização do dia com a seção do pacote e descarta o dia quando não batem (`mesmaSecao = false`). Ficam 497.211 seções com o 1º turno da mesma seção e 499.000 com o 2º turno: as 207 restantes são urnas reserva (178) ou de contingência sem votos (29), que no log se identificam pela seção de origem. **Limite:** os votos dessas 178 urnas reserva ficam fora dos testes 2 e 3.

**Banco.** Os scripts abrem o banco com `abrirLeitura()` de `src/banco-leitura.js` (cópia imutável, doc 09). As consultas avulsas usam `node scripts/sql.mjs`.

**Mesários.** O título nunca é gravado. Vira pseudônimo `M` + 10 hex de HMAC-SHA256, com chave aleatória local (`data/parsed/auditoria/biometria/.chave-pseudonimo`, fora do git). Quem precisar do título acha no log público da seção.

## Estatística

- Regressões: MQO com efeito fixo (média subtraída por UF ou por zona) e erro-padrão agrupado por município. Implementação em `biometria-comum.mjs`.
- Concentração geográfica: contagem observada × esperada pela taxa nacional, com cauda de Poisson. Não há correção para comparações múltiplas: o p serve só para ordenar.
- Grupos com menos de 5 seções não aparecem nos documentos.

Documentos: [02](02-b1a-impossibilidade.md) B1a · [03](03-rajadas-ja-votou.md) rajadas de `já votou` · [04](04-mesarios.md) mesários · [05](05-a9-regressao.md) A9 · [06](06-h07-modelo-urna.md) H07 · [07](07-exterior-sem-biometria.md) exterior.
