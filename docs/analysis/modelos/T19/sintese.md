# T19: que outras fraudes vale testar com os dados que já temos? Síntese da discussão

30/10/2026. Participantes: GPT Astra (estatístico forense), Kimi 3 (engenheiro de segurança), Grok (cientista político e prática de campo) e Claude (coordenador). Duas rodadas: 35 propostas independentes ([rodada1-consolidada.md](rodada1-consolidada.md); posição do Claude escrita antes de ler os outros, em [claude/posicao.md](claude/posicao.md)) e depois crítica e ordenação ([astra/r2](astra/r2/astra.md), [grok/r2](grok/r2/grok.md), [kimi/r2](kimi/r2/kimi.md)). Prompts, respostas e hashes ficam nas subpastas. Tudo o que vem dos modelos é **Hipótese** até um script do repositório reproduzir.

## Resposta curta

- Os três modelos convergiram. As propostas que dependem de fatos já medidos saíram (abaixo). Sobraram **10 hipóteses novas**, registradas como **H15 a H24** em [../../../hipoteses.md](../../../hipoteses.md), com status `aberta`.
- O consenso mais forte (topo das três listas): **votos no lugar de ausentes, liberados em bloco pelo mesmo mesário, sobretudo no fim do dia e de eleitores que faltaram no 1º turno** (H15), e a **reconciliação sessão a sessão** entre habilitação e voto computado no log (H16).
- Regra comum pedida pelos três: **declarar antes de rodar o modelo, o limiar e o menor efeito que o teste enxerga**, e exigir **conjunção de sinais** em vez de um único indicador. Resultado não significativo não é absolvição; o relatório tem de dizer o tamanho do efeito compatível com os dados.

## Descartadas (já respondidas por fatos medidos)

| Proposta | Por quê |
|---|---|
| K1 carga clonada em várias urnas | Nenhum código de carga se repete entre seções nos dois turnos; mídia de carga só se repete em lote dentro da zona |
| K2 BU de RED/contingência sem falha registrada | As 5.714 seções com reserva do 2º turno têm o evento de troca no log da titular; RED: votos do log = BU em todas |
| K7 RDV diverge do BU | No 2º turno, RDV = BU em todos os pares seção × cargo (tópico 2, C3). **Resta o 1º turno**, absorvido por H16 |
| K8 vetor de votos clonado | 2º turno: 54.381 grupos de votos iguais, nenhum compartilha urna, cartão ou pacote. **Resta o vetor multicargo do 1º turno**, absorvido por H16 |
| K10 BU segurado entre emissão e registro, direcionado | Dentro do mesmo local, a hora de registro não depende do voto da seção (parecer 28) |
| C8 ordem dos estados na divulgação | Já medido no parecer 28 (−0,28 no 2º turno; −0,49 no 1º); não testável contra escolha deliberada |

**Conferido pelo coordenador (Fato):** o log **não** grava o ano de nascimento digitado; grava só "Ano de nascimento digitado é igual ao do cadastro" (seção AC 01015/0002/0093, 2º turno, `node src/exportar.js --turno 2 --uf ac --municipio 01015 --zona 0002 --secao 0093 --log dia --stdout`). A proposta do Grok de contar o comparecimento de 100+ no 2º turno pelo log não é possível.

## As 10 hipóteses escolhidas (ordem de consenso)

Posição média nos três rankings da rodada 2 entre parênteses (Astra / Grok / Kimi).

| Nova ID | Hipótese | Propostas | Posições | Objeção mais forte | Como o teste deve resistir |
|---|---|---|---|---|---|
| **H15** | Votos no lugar de ausentes liberados em bloco: rajada de liberações sem digital pelo mesmo mesário, em ritmo regular, no fim do dia, em seções cujo comparecimento subiu no 2º turno | G1, G8, C2, A3 | 3 / 1–3 / 1 | Fila real de fim de dia; idoso falha mais a digital; 2,79 milhões de liberações manuais sem mesário gravado | Linha de base dentro da própria seção e do mesmo mesário (1º × 2º turno, hora a hora); exigir conjunção: rajada + ritmo de baixa variância + mesmo título + Δ comparecimento; tratar liberação sem mesário como cobertura faltante, não como ausência |
| **H16** | Máquina de estados do eleitor: toda habilitação termina em voto computado, suspensão ou cancelamento, e todo voto tem habilitação; reconciliação multicargo e vetores repetidos no 1º turno | A1, C5, K7, A6, K8 | 1 / 10 / 2 | Contingência, reinício e log incompleto geram órfãos falsos; software adulterado gera estados coerentes | Classificar órfãos por contexto (reinício, contingência, cartão) antes de contar; validar a regra nas 5.714 seções com troca documentada; reportar extra e falta, não só o saldo |
| **H17** | Supressão e roubo de voto na mesa: suspensão e cancelamento seletivos, e "já votou" de eleitor presente depois de liberação sem digital | A4, G9, G10, K5, K6 | 2 / 7 e 9 / 3 e 5 | Desistência, urna travada, título digitado errado; "já votou" pode ser consulta (padrão de ~10 s já visto em 21 seções) | Denominador = sessões iniciadas; separar consulta periódica de sessão efetiva; peso na sequência temporal (liberação sem digital seguida de "já votou"); perfil da seção e falhas técnicas como controle |
| **H18** | Inserção uniforme num município inteiro (ponto cego reconhecido): swing alto **e** variância baixa entre seções do mesmo município, contra os outros cargos | G7 | — / 2 / 4 | Máquina política municipal legal gera o mesmo resíduo; confusão ecológica (Astra a deixou fora das 10) | Exigir os dois sinais juntos (orgânico deixa heterogeneidade); voto de outros cargos do 1º turno como controle de preferência local; resultado vira lista de auditoria de campo, não prova |
| **H19** | Falha de digital induzida na seção-alvo: taxa de falha que muda localmente entre turnos e prevê o voto dentro do local | G6 | 7 / 4 / 6 | Sensor, idade, trabalho manual e umidade explicam a falha; sinal instável no H05 | Modelar primeiro a falha (tentativas no log), depois o voto; dentro do local e do modelo de urna; separar H02 (definição do BU × cadastro). **Em andamento** no agente de falha do leitor (H05) |
| **H20** | Relógio e ordem temporal: votos antes da abertura ou da zerésima, inversões de ordem física, janela deslocada | G5, A7, K4, C5 | 6 / 5 / 10 | Erro de fuso (MT, já achado) e hora digitada errada de boa-fé | Normalizar fuso primeiro (correção de MT em andamento); priorizar inversão de ordem física, impossível por deriva; usar o registro no TSE como limite externo |
| **H21** | Compra de voto conferida pelo RDV: número nulo raro usado como "senha", concentrado em poucas zonas e crescendo no 2º turno | C1, A2, A6 | 5 / 8 / 7 | Erros de tecla e números de candidatos locais se agrupam; seção pequena colide por acaso | Respeitar os dígitos de cada cargo; excluir famílias de erro comum e números de candidatos de qualquer cargo; exigir raridade nacional + concentração + crescimento juntos; reportar o teto em votos |
| **H22** | Exterior e urnas de fluxo especial: comparecimento e ritmo anômalos no exterior (100% sem digital), Sistema de Apuração, RED | G4, C7 | 9 / — / 8 | Perfil e mobilização próprios do exterior; países com poucos eleitores | Linha de base por país em 2022 [a confirmar disponibilidade]; testar excesso de comparecimento e ritmo, não a forma de liberação |
| **H23** | Recarga e carga fora da cerimônia: urnas com mais de uma carga sem erro anterior, carga fora do bloco da zona | A5, K3, C4 | 8 / — / 9 | Recarga legítima é documentada em ata; sem calendário de cerimônias não há denominador | Contagens brutas primeiro; pedir calendário e atas aos TREs; exigir conjunção: sem erro prévio + fora do bloco + desvio de voto |
| **H24** | Eleitores em trânsito e atributos especiais (preso provisório, militar, servidor da Justiça Eleitoral, deficiência visual) usados para inflar seções | G2, C3, G3, K9, C6 | 10 / 6 / — | Trânsito, profissão e deficiência não são indício; sem dado pessoal, só agregado | Controle espacial estreito (mesmo local, com e sem trânsito); 1º × 2º turno; exigir anomalia operacional adicional; nada de inferência individual |

## Divergências registradas

- **H03 "é tautologia" (Claude):** Astra, Grok e Kimi concordam só em parte. O BU = oficial prova que a totalização não mexeu nos BUs assinados, e o H03 não parou aí (RDV × BU, log × BU, votos sem rastro, nulo técnico). Fica a ressalva: não prova que o BU registra a intenção do eleitor.
- **H07 (Grok):** Astra e Kimi: a H07 refutou um mecanismo estreito (modelo antigo não lê digital). Taxa de falha diferente por modelo é outra hipótese, coberta por H19.
- **H05 e H14 (Astra):** consenso de que "não significativo" não é equivalência; os testes têm de publicar o efeito mínimo detectável. O H05 fica "não decidido", absorvido por H19.
- **Tópico 9 (Astra, Kimi):** sem curva de poder declarada, "sem marca de fraude grande" não é resultado. Pedido: simulação de poder por mecanismo antes de usar essa frase na perícia.
- **Unidade do universo (Astra):** não somar 499.207 dos dois turnos como se fossem pacotes distintos; inventariar pacotes, seções, urnas e turnos.

## Próximos passos

1. Registrar H15–H24 em `docs/hipoteses.md` (feito junto com esta síntese).
2. Testar primeiro H15, H16 e H17 (consenso mais forte; rastro direto no log); H19 e H20 já estão com agentes em andamento; H18, H21–H24 em seguida.
3. Cada teste declara antes: modelo, limiar, efeito mínimo detectável e a conjunção de sinais exigida. Depois, revisão cética e só então perícia.
