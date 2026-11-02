# 27. H13, fechamento: plano final (registrado antes de rodar)

Estatístico eleitoral, **02/11/2026**. Hipótese H13 de [hipoteses.md](../../hipoteses.md): os eleitores liberados sem digital votaram no 13, sobretudo no Nordeste.

**Registro prévio.** Este plano foi escrito antes de qualquer conta nova. Nenhum número novo foi calculado para escrevê-lo. Os números citados vêm de docs já commitados, e os cortes de Bonferroni são só aritmética. O coordenador faz o commit **deste arquivo sozinho**, antes da etapa 2. O resultado vai no doc 28 e cita o hash desse commit. O que não estiver aqui entra no doc 28 marcado **exploratório**. Os cortes, as medidas e a regra de decisão não mudam depois de ver os dados. A razão desse cuidado: no adendo 6 do [plano 16](16-h13-log-plano.md), o plano e o resultado entraram no mesmo commit, e o registro prévio deixou de ser verificável ([parecer 51](../cetico-revisor/51-v2-sul-2022.md)).

## 0. Ponto de partida (o que já está assentado)

- **Nordeste ([doc 18](18-h13-log-resultado.md), parecer 42):** nenhuma via sem digital se associa a mais voto no 13 dentro do mesmo local de votação. Isso vale no nível do 2º turno e na variação entre os turnos.
- **Fora do Nordeste (docs [19](19-h13-v2-composicao.md), [22](22-h13-v2-sul-mg-rs.md), [24](24-h13-v2-mg-2022-diario.md) e [26](26-h13-v2-sul-2022-diario.md); pareceres 46, 48 e 51):** em MG, no RS e no Sul há um sinal pequeno e espalhado, sem marca de inserção. Mais eleitores pela V2 (liberação pelo ano de nascimento) voltando a votar no 2º turno acompanham mais ganho do 13. O teste direto com os diários de 2022 mostra que o sinal já existia em 2022 (MG, RS e Sul). Se cresceu em 2026, ficou inconclusivo.
- **Aritmética (Fato):** mesmo que toda a V2 a mais do 2º turno fosse voto falso no 13, ele ainda venceria por 3.978.044 (parecer 46). A margem nacional do 2º turno é 4.430.191.
- **Faltam:** (a) o exame nominal de CE, PB e PE (pendência dos pareceres 15 e 18); (b) um método único para as 28 UFs, no lugar das análises por região; (c) casos como o de RS 87912/0060/0322 de 2022 (boletim normal, diário sem nenhum voto e sem marca de falha), procurados em 2026.

## 1. Perguntas

A H13 tem duas leituras. O plano separa as duas porque elas pedem respostas de natureza diferente.

- **H13-L (literal, descritiva):** "a maioria dos liberados sem digital votou no 13". O voto é secreto. Só o **cerco aritmético** decide, seção a seção, e só quando o cerco inteiro fica de um lado de 50%. Mesmo verdadeira, ela não indica nada de errado: no Nordeste, os eleitores pela digital também deram cerca de 69% ao 13.
- **H13-E (excesso, o núcleo da suspeita):** "os liberados sem digital deram ao 13 **mais** do que os eleitores pela digital do mesmo local, e isso é mais forte no Nordeste". É ela que um uso da liberação para pôr votos no 13 deixaria nos dados. **A conclusão final da H13 é a da H13-E.** A H13-L vai ao lado, como Fato ou como "não decidível (voto secreto)".

Perguntas da etapa 2:

- **Q-b (método único):** com o mesmo modelo nas 27 UFs, em que UFs e para que via (V2, V3m, V3s) os liberados se associam a mais voto no 13? Isso vale no nível do 2º turno e na variação entre os turnos. Qual é a média do Brasil e qual é a média do Nordeste, por um modelo hierárquico?
- **Q-a (exame nominal de CE, PB e PE):** nessas três UFs, há seções ou mesários em que a liberação sem digital venha junto com um excesso concentrado de voto no 13, do tipo que o modelo linear não vê?
- **Q-c (diário sem votos):** em 2026, nos dois turnos e em todas as seções, quantas têm boletim com votos e diário sem nenhum voto? Quantas delas não têm nenhuma marca de falha? Elas pesam no resultado?
- **Q-final:** qual destas formas vale para a H13: refutada; sem sinal nos dados públicos; fato que pede explicação; não decidível com dados públicos (e por quê)? A regra fica fixada na seção 8.

## 2. Arquivos que vou ler (e os que não vou ler)

| Arquivo | Para quê |
|---|---|
| Cópia de leitura do banco, `data/db/leitura/atual.json` → `eleicao2026-20261029T105000.sqlite`, por `abrirLeitura()` | `secao` (comparecimento, local, modelo da urna, `tipo_urna`, `tipo_arquivo`, os dois turnos) e `voto_bu` do presidente (cargo 1): 13, 22, branco e nulo por seção e turno; margens dos dois turnos |
| `data/parsed/auditoria/estatistico/h08/{1t,2t}/*.secoes.jsonl` | Vias por seção (V1, V2, V3m, V3s, outra) e votos do diário, dos dois turnos e de todas as seções no disco |
| `data/parsed/auditoria/estatistico/h08-uniao/{1t,2t}/selecao.secoes.jsonl` | As 10 + 5 seções relidas com a união das cópias. Substituem as linhas correspondentes do `h08` (doc 22, seção 1) |
| `data/parsed/auditoria/forense/perfil/<uf>.csv` | Perfil do eleitorado de 2026 por seção: eleitores, biometria, 60+, 16–24, escolaridade baixa, superior |
| `data/raw/{1t,2t}/urnas/{ce,pb,pe}/…` (diários extraídos, no F:) | Leitura nova só de CE, PB e PE, nos dois turnos, para o exame por mesário (seção 5). O identificador do mesário fica só na memória |
| `data/raw/{1t,2t}/urnas/<uf>/…`: listagem de diretórios por `readdir`, nunca `find`, e os `logd.dat` só das seções candidatas da seção 6 | Cobertura do disco contra o banco, e a leitura própria dos diários candidatos a "sem votos" |
| `data/raw/2022/{1t,2t}/zip/bu_imgbu_logjez_rdv_vscmr_2022_<t>t_{PR,RS}.zip` (no F:) | Controle positivo do classificador da seção 6: só as 5 seções de diário curto de 2022 (parecer 51) |
| Zips de 2026 em `L:\MyClean-cold\F\Node\auditoria-2turno-eleicao2026\data\raw\…` | Só a lista de entradas, e só se aparecer seção do banco sem diretório no F: (seção 6). É o que separa "falta na publicação" de "falta na nossa extração" |
| Resultados já commitados: `h13-log/testes.csv`, `h13-v2/…resultado*.json`, docs 18 a 26, pareceres 42, 46, 48 e 51 | Conferências de reprodução (seção 9) e a lista das UFs com teste direto de 2022 (seção 8) |
| `src/exportar.js --uf .. --municipio .. --zona .. --secao .. --log nao --stdout` (e `--log dia`, quando o caso for de diário) | Conferência no bruto de toda seção citada |

**Não leio:** `data/private/` e a base de CPFs. Nenhum título de eleitor ou de mesário vai para arquivo, saída ou doc. Isso inclui os números com formato de título nas mensagens de suspensão do diário. Nas saídas, o mesário vira só contagem. **Sem rede.**

## 3. Medidas (iguais em todas as UFs)

- **Vias por voto computado no diário** (leitura do doc 17 com a união das cópias do doc 22; prioridade: V1 digital > V2 ano de nascimento > V3m dado pessoal com mesário identificado > V3s dado pessoal sem mesário > outra). L_v,t = votos da via v na seção, no turno t.
- **Desfecho:** Y_t = 100 × v13 / (v13 + v22) do presidente no turno t. ΔY = Y_2 − Y_1. Peso n = v13 + v22 do 2º turno (no nível do 1º turno, o do 1º).
- **Exposição no nível:** x_v,t = L_v,t ÷ votos do diário da seção no turno t (como no doc 18).
- **Exposição no painel:** e_v = (L_v,2 − L_v,1) ÷ eleitores do perfil de 2026, com Δc = (votos do diário 2 − 1) ÷ eleitores como controle (medida do adendo 3, a que o parecer 42 pediu). O coeficiente de e_v é a **parte própria da via**: quanto um votante a mais pela via acompanha o ganho do 13 além de um votante a mais pela digital.
- **Controles:** fração sem biometria no cadastro, 60+, 16–24, escolaridade baixa, superior, log dos eleitores, e um indicador por modelo de urna presente na UF (base: o mais recente presente).
- **Efeito fixo de local de votação** (UF, município, zona, local; o do turno do desfecho, e no painel o do 2º turno). Cada seção é comparada só com as do mesmo prédio. O efeito fixo absorve tudo o que é comum ao prédio, à zona e ao município.
- **Erro-padrão robusto** por agrupamento no local (CR1).
- **Exclusões, com contagem e motivo, por UF:** seção sem perfil; votos do diário ≠ comparecimento do BU no turno usado; menos de 20 votos em 13 + 22 no turno usado (no painel, em algum dos dois); sem os dois turnos (painel); sozinha no local (sai pela própria construção do efeito fixo).

## 4. (b) Método único: modelo hierárquico em dois estágios, igual nas 28 UFs

**Por que este modelo.** A pergunta "sobretudo no Nordeste" precisa de um efeito por UF e de uma média que diga quanto as UFs diferem entre si. Um modelo com efeito aleatório de local, zona e município suporia que esses níveis não se correlacionam com a liberação, e eles se correlacionam (o perfil de quem tem a digital gasta muda de bairro para bairro). Por isso:

- os níveis seção → local → zona → município ficam no **efeito fixo de local**, que não depende dessa suposição;
- o nível **UF → Brasil** vira um **modelo de efeitos aleatórios** sobre as 27 estimativas.

É o desenho hierárquico mais simples que responde à pergunta, em Node puro e sem simulação.

**Estágio 1, em cada UF u (as 27, sem o exterior):**

- **N2 (nível, 2º turno):** Y_2 ~ x_V2 + x_V3m + x_V3s + controles | efeito fixo de local. Peso n, erro CR1.
- **P (painel):** ΔY ~ e_V2 + e_V3m + e_V3s + Δc + controles | efeito fixo de local. Peso n, erro CR1.
- **N1 (linha de base, sem teste):** o mesmo N2 com os dados do 1º turno.
- Saída: β_u,v,d e o erro, para v ∈ {V2, V3m, V3s} e d ∈ {N2, P, N1}. Se uma UF não tiver variação numa via dentro dos locais, aquela via fica "não estimável" e sai do estágio 2, com contagem.

**Exterior (ZZ), a 28ª.** Lá não há leitor de digital: todos os eleitores entram pela V2. Então x_V2 = 1 em toda seção, e não existe grupo pela digital para comparar. O coeficiente não é identificável, e isso fica dito. O exterior entra no cerco (H13-L) e no item (c), iguais aos das outras UFs.

**Estágio 2, entre as UFs, para cada via e desfecho:**

- **Brasil (μ_BR):** média de efeitos aleatórios das 27 UFs. Cada UF pesa w_u = 1/(EP_u² + τ²), e τ² sai pelo estimador de DerSimonian-Laird. O teste usa o erro de Hartung-Knapp-Sidik-Jonkman com piso (variância nunca menor que a do modelo comum) e t com 26 graus de liberdade. Com só 27 unidades, esse teste é o mais honesto.
- **Nordeste (μ_NE) e diferença (δ_NE):** meta-regressão β_u = a + δ·NE_u + erro, com τ² residual pelo mesmo estimador, erro HKSJ com piso e t com 25 graus de liberdade. μ_NE = a + δ.
- **Relatados sem teste:** Q de Cochran e I² (quanto as UFs diferem além do acaso); estimativa encolhida de cada UF (empírica de Bayes); média de efeito comum; a mesma meta com N1.
- **As regiões deixam de ser estimadas à parte.** Para a decisão, os números regionais dos docs 18 a 26 dão lugar a μ_BR, μ_NE, δ_NE e às 27 UFs. As regiões aparecem só como soma descritiva.

**Tamanho em votos (para o mínimo detectável e para a equivalência).** Um β em pontos vira votos de margem por esta fórmula:

M = (β/100) × Σ_s a_s · n_s · max(2, 1/(1 − p_s))

- a_s = x_v,s no nível e max(0, e_v,s) × eleitores_s / votos_s no painel (só onde a via cresceu, como no doc 18);
- p_s = parcela do 13 na seção;
- max(2, 1/(1 − p)) escolhe a leitura que dá mais votos entre "voto trocado do 22 para o 13" (2 por voto) e "voto inserido no 13" (1/(1 − p) por ponto de parcela). É o lado conservador para quem quer descartar efeito.

**Efeito mínimo detectável (por UF, μ_BR e μ_NE):**

- Injeção nos dados reais, como no doc 18: em cada seção, f = 1% dos liberados pela via viram voto a mais no 13 (ou no 22, por simetria); no painel, só na parte que cresceu. Os pesos ficam fixos e a conta é refeita.
- f_MDE = 0,01 × (z_B + 0,84) ÷ (deslocamento de z por f = 1%), onde z_B é o corte da seção 7. O resultado sai em fração e em votos.

**Equivalência no Nordeste (para poder escrever "refutada"):**

- Para cada via e desfecho, o limite superior de μ_NE é μ_NE + t_crit × EP, com t_crit o corte de Bonferroni da seção 7 na distribuição t com 25 graus de liberdade.
- Esse limite vira votos de margem pela fórmula M, somada nas seções do Nordeste.
- **Margem de equivalência: 44.302 votos (1% da margem nacional do 2º turno).** A equivalência vale se, nas 6 combinações de via e desfecho, o limite em votos ficar abaixo dela.

**H13-L por UF (Fato), nas 28 UFs:**

- O cerco do doc 18, parte A, por via e para V2 + V3, nos dois turnos: a parte no 13 fica entre max(0, L − (T − v13)) e min(L, v13), somada seção a seção.
- Leitura:
  - "maioria no 13" é **Fato** se o mínimo passar de 50%;
  - "maioria fora do 13" é **Fato** se o máximo ficar abaixo de 50%;
  - fora isso, é "não decidível (voto secreto)".
- Ao lado vai a estimativa ecológica (Hipótese de modelo): p̂_v = Σ_s L_v,s · Ŷ_s(x_v = 1, outras vias = 0) / Σ_s L_v,s, pelo N2 da UF.

**Sensibilidade (relatada, sem teste):**

- erro agrupado por município;
- efeito fixo de zona no lugar de local;
- sem controles;
- com as seções em que o diário difere do BU;
- τ² por REML;
- sem uma UF de cada vez (estágio 2).

## 5. (a) Exame nominal de CE, PB e PE

**O que "nominal" pode ser com dados públicos (premissa declarada).** A auditoria nominal no sentido pleno conferiria, pessoa a pessoa, que cada eleitor liberado existe, estava vivo e foi votar. Para isso é preciso o caderno de votação com as assinaturas, o cadastro com identidade e as imagens das digitais lidas (`wsqman.jez`). **Nada disso é público.** Com dados públicos, o exame mais fino possível é feito em três níveis:

- **seção a seção:** cada seção pelo seu número;
- **ciclo a ciclo:** cada eleitor liberado pelo seu registro no diário, sem identidade;
- **mesário a mesário:** o identificador do mesário que liberou, guardado só na memória.

Este item mira o que o modelo linear da seção 4 não vê: excesso **concentrado** em poucas seções ou em poucos mesários.

**Universo:** todas as seções de CE, PB e PE, nos dois turnos, com as exclusões da seção 3.

**Resíduo robusto por seção (por UF e desfecho):**

- O resíduo e_s sai do modelo da seção 4 **sem as vias**: efeito fixo de local mais controles; no painel, com Δc.
- O resíduo padronizado é z_s = (e_s·√n_s − mediana) ÷ (1,4826 × MAD), com mediana e MAD tomados dentro da UF (MAD = mediana dos desvios absolutos; o fator 1,4826 faz o MAD valer um desvio-padrão quando a distribuição é normal).
- "Cauda" = z_s ≥ 3.

**Leitura nova dos diários de CE, PB e PE** (mesmas funções do leitor do doc 17, união das cópias):

- Em cada ciclo V3m, a marca `Mesário <id> habilitou o eleitor` dá o id, que fica só na memória.
- Por seção e turno, a saída tem só contagens:
  - número de ids distintos;
  - a maior parte dos votos da seção liberada por um mesmo id;
  - o maior número de liberações do mesmo id em 10 minutos;
  - o menor intervalo entre duas liberações seguidas do mesmo id.
- Na UF, entram também o número de ids que liberam em mais de uma seção do mesmo turno, as seções envolvidas e se essas seções são de locais diferentes.
- **Conferência da leitura:** a soma dos V3m por seção tem de ser igual à do `h08`. Se não for, a etapa para.

**Testes (unilaterais, a favor do 13), por UF e desfecho (N2 e P):**

- **a1 (cauda × liberação alta):** "liberação alta" é o decil superior, dentro da UF, de (V2 + V3m + V3s) ÷ votos no N2 e de (ΔV2 + ΔV3m + ΔV3s) ÷ eleitores no P. Teste exato de Fisher: a fração de seções na cauda é maior entre as de liberação alta do que nas outras?
- **a2 (cauda × mesário concentrado):** "mesário concentrado" é a seção em que um único id liberou pelo menos 25% dos votos computados no 2º turno. Mesmo teste de Fisher. Se uma UF tiver menos de 5 seções assim, o teste é relatado como "sem casos suficientes", mas **conta** no número de testes.
- São 3 UFs × 2 desfechos × 2 = **12 testes**.

**Triagem de seções (exploratória, não decide):**

- O corte é z_s ≥ Φ⁻¹(1 − 0,05/N), com N = número de seções das três UFs no desfecho. Como gerador de hipótese, relato também o Benjamini-Hochberg a 5%.
- Toda seção acima do corte é conferida no bruto antes de ser citada. Se forem mais de 30, confiro as 30 de maior z e conto todas.
- As 10 seções de maior concentração por mesário e as 10 maiores rajadas também vão ao bruto.
- **Relatados ao lado:** a mesma conta no 1º turno, como linha de base, e o N2 com efeito fixo de zona nas três UFs. Esse último concilia o resultado com o M2 do parecer 18, que tinha CE +4,6, PB +4,7 e PE +3,0 com efeito fixo de zona.

## 6. (c) Diário sem votos com boletim normal

**Universo:** toda linha de `secao` com comparecimento ≥ 1, nos dois turnos e nas 28 UFs, exterior incluído.

**Leitura do diário da seção:**

- todos os `logd.dat` de todos os pacotes da seção no disco, inclusive os `.jez` aninhados;
- pacote repetido conta uma vez;
- união das cópias da mesma urna;
- linha idêntica conta uma vez.

Contagens:

- **N_dia** = linhas `O voto do eleitor foi computado` com a data do turno (04/10/2026 ou 25/10/2026), só das linhas da seção declarada. É o `votos` do `h08`.
- **N_amplo** = as mesmas linhas, com datas do dia anterior ao dia seguinte ao turno e **sem** o filtro de seção declarada. Pega relógio errado e urna carregada com outro número de seção (como a 0437 do parecer 51).

**Definições exatas:**

- **D0, "diário sem votos":** comparecimento do BU ≥ 1 e N_dia = 0. Subtipos:
  - **D0-a:** nenhum `logd.dat` no disco para a seção (sem diretório, sem pacote ou pacote sem log). Nesse caso, a lista de entradas do zip de 2026 no L: diz se o diário falta na publicação ou só na nossa extração.
  - **D0-b:** há log, mas nenhuma linha do dia da seção.
  - **D0-c:** há linhas do dia, mas nenhum voto computado.
- **DP, "diário parcial":** 1 ≤ N_dia < comparecimento. Relatado ao lado, com os votos que faltam (comparecimento − N_dia).
- **D+:** N_dia > comparecimento. Esperado: 0.

**"Marca de falha"** é qualquer um dos itens abaixo, procurados em todas as linhas de todos os textos do pacote da seção, de qualquer urna e de qualquer seção declarada, do dia anterior ao seguinte; ou no BU da seção no banco. A comparação de texto ignora caixa.

| Marca | Onde |
|---|---|
| M1 contingência | mensagem com "contingência"; ou mais de um nº de urna com linhas do dia na seção; ou `tipo_urna` ≠ `secao` |
| M2 recuperação | mensagem ou aplicação com "recuperador"; ou `tipo_arquivo` = `votacaoRED` |
| M3 log corrompido | mensagem com "log corrompido"; ou nível fora de {INFO, ALERTA, ERRO, WHAT, EXTERNO} (linha corrompida) |
| M4 apuração manual | mensagem com "Sistema de Apuração"; ou `tipo_arquivo` começando por `sa` |
| M5 energia | mensagem de nível ERRO ou ALERTA com "bateria" ou "energia" |

- **Não contam como marca:** o nível ERRO por si só (aparece em quase todas as seções, como `ERRO GAP Problema ao desmontar a MR`) e a urna religada várias vezes. É a mesma leitura do parecer 51 para RS 87912/0060/0322.
- **"Caso como o do RS 0322"** = D0 **sem nenhuma marca** e com N_amplo = 0. Um D0 sem marca, mas com N_amplo > 0, é relatado à parte: os votos estão no diário, com outra data ou com outra seção declarada.

**Controle positivo, antes de olhar 2026:** o classificador roda primeiro nas 5 seções de 2022 do parecer 51, a partir dos zips de 2022 no F:.

- Esperado: RS 87912/0060/0322 sai como D0 sem marca nos dois turnos; as outras 4 (PR 75833/0043/0074 e 77275/0167/0100; RS 88013/0002/0199 e 88013/0114/0336) saem como DP **com** marca.
- Se não sair assim, a lista de marcas é corrigida **só com o texto dessas 5 seções de 2022**, e a correção é documentada no doc 28 antes de rodar 2026.

**Peso no resultado (Fato, conta exata):**

- **2º turno:** sejam S0 = soma do comparecimento dos casos D0 sem marca e S0' = soma dos votos que faltam nos DP sem marca. O caso **pesa** se 2 × (S0 + S0') ≥ margem do 2º turno, ou seja, se trocar todos esses votos do 22 para o 13 pudesse mudar o vencedor. Relato também a margem anulando os votos do 13 dessas seções.
- **1º turno:** o caso **pesa** se S0 + S0' alcançar a menor de duas distâncias: o que faltou ao primeiro colocado para ter mais de 50% dos válidos, ou a diferença entre o 2º e o 3º colocados.
- Os mesmos números vão também com todos os D0 e DP, com marca ou sem.

**Conferência no bruto:** todo caso D0 sem marca e todo DP sem marca, até 50 (acima disso, os 50 de maior comparecimento e a contagem de todos), com `exportar.js --log dia`. Abro o BU impresso, a abertura e o encerramento, e as linhas do dia.

## 7. Família de testes e correção

| Bloco | Conta | Testes |
|---|---|---|
| UF (seção 4) | 27 UFs × 3 vias × 2 desfechos (N2, P), bicaudais | 162 |
| Estágio 2 (seção 4) | μ_BR e μ_NE × 3 vias × 2 desfechos, bicaudais | 12 |
| Estágio 2 (seção 4) | δ_NE × 3 vias × 2 desfechos, bicaudal | 6 |
| CE, PB, PE (seção 5) | a1 e a2 × 3 UFs × 2 desfechos, unilaterais | 12 |
| **Total** | | **192** |

- **Bonferroni a 5% sobre os 192 testes:** p ≤ 0,05/192 = 2,604 × 10⁻⁴.
  - Na normal, isso dá |z| ≥ 3,652 nos testes bicaudais e z ≥ 3,470 nos unilaterais.
  - Nos testes de estágio 2, o mesmo p entra na t com 26 ou 25 graus de liberdade.
- **Por que Bonferroni:** um único teste positivo muda a conclusão final (seção 8). O que precisa ser controlado é a chance de **algum** falso positivo, e não a fração deles.
- O Benjamini-Hochberg a 5% vai ao lado, só como gerador de hipótese.
- **Fora da família (relatados, sem teste):** N1, sensibilidades, triagem de seções, Q e I², estimativas encolhidas e cerco.
- **Confirmatório** = os 192 testes e a regra da seção 8. **Exploratório** = todo o resto, marcado assim no doc 28.

## 8. Critério de decisão (fixado agora)

**Sinal positivo** = β > 0 que passa por Bonferroni (seção 7). Cada sinal positivo de UF ou de μ ganha uma de duas classes:

- **Sinal estável:**
  - no painel (P): a UF tem teste direto com o diário de 2022 que já mostrava a associação, ou seja, um coeficiente de 2022 positivo que passou no seu teste. Pelos docs 24 e 26 e pelos pareceres 48 e 51, são **MG e RS**. O Sul junto também passou, mas PR e SC sozinhos não tinham sinal de 2026. Em μ_BR ou μ_NE, o sinal é estável se as UFs com 2022 assim responderem por mais da metade do peso do estágio 2;
  - no nível (N2): o N1 da mesma UF e via é positivo com z ≥ 2 (a associação já estava no 1º turno).
- **Sinal novo:** qualquer outro sinal positivo, incluindo um sinal no painel numa UF sem diário de 2022 analisado.

**Status de cada parte:**

- **Nordeste:**
  - **fato** se houver sinal positivo numa UF do Nordeste, em μ_NE ou num teste a1 ou a2. Um δ_NE > 0 sozinho **não** basta, porque o Nordeste pode ser só "menos negativo" que o resto, como no doc 18; ele é relatado e conta para a "refutada" abaixo;
  - **refutada** se não for fato, se a equivalência da seção 4 valer nas 6 combinações e se nenhum δ_NE for positivo e significativo;
  - **sem sinal** nos outros casos.
- **Fora do Nordeste:** "sem sinal", "só sinal estável" ou "há sinal novo".
- **Rastro (item c):** "ausente" (zero caso como o do RS 0322), "presente sem peso" ou "presente com peso" (seção 6).

**Forma final da H13 (a primeira que se aplicar):**

1. **Fato que pede explicação:** o Nordeste é fato; ou há sinal novo em qualquer UF; ou o rastro está presente com peso. O doc 28 diz onde, de que tamanho em votos e qual dado público fecharia a questão. Exemplo: os diários de 2022 da UF, que são arquivos públicos do TSE. **Baixá-los pede autorização de rede do André.** Sem ela, a UF fica "sem linha de base de 2022", e isso fica escrito.
2. **Não decidível com dados públicos:** a regra 1 não vale, mas há sinal estável. O porquê é este: o sinal estável é compatível com duas causas, e as duas deixam o mesmo rastro público.
   - Uma é a composição: quem volta a votar sem digital pende mais para o 13.
   - A outra é uma inserção com o mesmo formato nos dois turnos ou nas duas eleições.
   - Os testes públicos que separariam as duas já rodaram sem separá-las: hora, sequência, foto, concentração, escolaridade, estado civil, idade e 2022.
   - Separá-las exige ligar voto a pessoa, com o caderno de votação assinado, as imagens das digitais (`wsqman.jez`) e o cadastro com identidade. **Nenhum desses é público**, e o voto é secreto.
   - O doc 28 dá também o peso máximo desse sinal em votos, contra a margem.
3. **Refutada:** nenhum sinal positivo em lugar nenhum, o Nordeste "refutado" e o rastro ausente ou sem peso.
4. **Sem sinal nos dados públicos:** nenhum sinal positivo, mas a equivalência do Nordeste não vale (falta poder), com rastro ausente ou sem peso. O doc 28 diz o tamanho que o teste veria.

**Sempre, qualquer que seja a forma:**

- o status da parte do Nordeste vai em frase própria;
- a H13-L vai por UF;
- vão os sinais contra o 13 que passarem (não sustentam a H13; ficam relatados);
- vão os pontos cegos da seção 10, com tamanho;
- nenhuma conclusão depende de resposta do TSE.

## 9. Conferências obrigatórias (antes de ler qualquer resultado de teste)

1. **Totais das vias:** a soma nacional das vias no 2º turno, com as seções relidas pela união, tem de bater com o doc 18 (V2 7.632.421, V3m 5.841.108, V3s 2.791.363, com o exterior). A diferença esperada se limita às 5 seções relidas do 2º turno.
2. **Reprodução:** o P de MG e do RS na V2, com esta especificação, tem de reproduzir o doc 26 e o doc 24: RS +9,66 (z 3,69) com 24.405 seções; MG +5,68 (z 4,19). Se não reproduzir, a etapa para até achar a causa.
3. **Injeção:** com f = 10% dos V3m do Nordeste injetados no 13, μ_NE de V3m no N2 tem de subir e passar. É a prova de que o encanamento vê fraude quando ela existe.
4. **Controle positivo do classificador de diário vazio** (seção 6).
5. **Cobertura:** seções do banco com comparecimento ≥ 1 × seções com diretório no disco, por UF e turno. A diferença vai com motivo.
6. **Leitura por mesário:** a soma dos V3m de CE, PB e PE tem de ser igual à do `h08`.
7. **Bruto:** toda seção citada no doc 28 é conferida com `exportar.js` antes de ser citada.
8. **Segredo:** ao final, busca por sequências de 12 dígitos e por números com formato de título nas saídas e no doc 28. Esperado: 0.

## 10. O que este desenho não vê (declarado agora)

- Fraude **igual em todas as seções de um local**: o efeito fixo a absorve. O cerco segue valendo.
- Fraude **alinhada aos controles** (idade, escolaridade, falta de biometria).
- Fraude **igual nos dois turnos**: some no painel e se confunde com a base no nível. Por isso o N1 entra como linha de base, e 2022 entra onde há diário.
- Fraude **difusa**, abaixo do mínimo detectável que o doc 28 vai relatar por UF.
- O voto de quem foi liberado, que nunca é observado.
- A existência e a presença física do eleitor liberado: pede dados não públicos (seção 5).

## 11. Scripts, saídas e recursos

- `scripts/auditoria/estatistico-h13-final-modelo.mjs`: seção 4 (estágios 1 e 2, mínimo detectável, equivalência, cerco, H13-L), reaproveitando `mqEfeitoFixo` de `estatistico-lib.mjs`.
- `scripts/auditoria/estatistico-h13-final-nominal.mjs`: seção 5 (leitura por mesário de CE, PB e PE, resíduos, a1, a2 e triagem).
- `scripts/auditoria/estatistico-h13-final-diario-vazio.mjs`: seção 6 (cobertura, classificador, controle de 2022, peso).
- Saídas em `data/parsed/auditoria/estatistico/h13-final/`: `testes.csv` (os 192 testes, com β, erro, z ou t, p, Bonferroni, BH, classe e mínimo detectável), `ufs.csv`, `meta.json`, `cerco.csv`, `nominal.json`, `diario-vazio.json`, `conferencias.json`. Nenhum id de mesário nem título.
- Resultado: `docs/analysis/estatistico-eleitoral/28-h13-resultado-final.md`.
- **Recursos:** no máximo 2 processos Node pesados; sem rede; sem `find` em `data/raw`; não edito `docs/pericia/` nem `docs/hipoteses.md`; não faço commit.

## Adendo 1 de 02/11/2026: um só denominador, linha de base de 2022 em SP e regra "estável" por via (registrado antes de rodar)

**Por que este adendo existe.** O [parecer cético 54](../cetico-revisor/54-h13-fechamento.md) (commit f1b372e) mostrou que o único teste que levou a H13 a "fato que pede explicação" no [doc 28](28-h13-resultado-final.md) (MG, painel, V3m, +1,93, z 4,15) depende de 14 seções de MG. Nelas, a tabela pública de perfil do eleitorado, gerada em julho de 2026, tem de 1 a 23 eleitores para urnas com 139 a 419 aptos no boletim.

- No painel, a exposição é dividida pelos eleitores do perfil. Nessas seções ela vira um número absurdo (até −1.200% do cadastro) e carrega a alavanca do coeficiente.
- O risco já estava apontado antes do plano: parecer 48, item 6.2 e variante A, "÷ aptos do BU".

**Quando e por quem a troca foi decidida.**

- O coordenador decidiu a troca **depois** do parecer 54. O parecer já relata o coeficiente de algumas variantes de denominador em MG, no RS e em SP. Vi esses números ao ler o parecer, antes de escrever este adendo.
- Para que a escolha não dependa do resultado, fica **um único** denominador: o que o parecer 48 indicou antes do plano (variante A), aplicado a todos os testes. Não há escolha entre variantes depois de rodar.
- As outras variantes do parecer 54 (Q, A2, ÷ comparecimento do 1º turno) não entram nem como teste nem como sensibilidade. O resultado original do doc 28 fica de pé, como está, ao lado do resultado deste adendo.

### (1) Um só denominador: os aptos do próprio boletim de cada turno e ano

Em todos os testes de painel e de nível, em 2026 e em 2022, nada que divida uma contagem vem do perfil do eleitorado. A base passa a ser o boletim de urna (BU) da seção no turno: aptos e comparecimento.

- **Painel (P):**
  - e_v = L_v,2 ÷ aptos_2 − L_v,1 ÷ aptos_1, para v ∈ {V2, V3m, V3s};
  - Δc = votos_2 ÷ aptos_2 − votos_1 ÷ aptos_1;
  - aptos_t são os aptos do BU do turno t:
    - em 2026, o maior `aptos` da seção em `secao_eleicao` no turno, que é o mesmo campo usado pelo parecer 54;
    - em 2022, o `QT_APTOS` do `detalhe_votacao_secao_2022` do turno (presidente), que vem do BU.
  - O parecer 54 dividiu ΔL pelos aptos do 2º turno. Aqui cada turno usa os seus próprios aptos; como os aptos quase não mudam entre os turnos (parecer 48), a diferença deve ser pequena, e ela vai relatada.
  - O coeficiente de e_v continua sendo a parte própria da via, agora por eleitor apto da seção em cada turno.
- **Nível (N2 e N1):**
  - a exposição já tinha denominador do BU: x_v = L_v ÷ votos do diário do turno, e os votos do diário são iguais ao comparecimento do BU, porque as seções em que diferem ficam fora. **Ela não muda.**
  - **Premissa declarada:** não troco o comparecimento pelos aptos no nível. Isso misturaria o comparecimento na parcela dos votantes por via e mudaria o que o β mede (a diferença entre a parcela do 13 dos liberados pela via e a dos eleitores pela digital, seção 4). Se o coordenador quiser x_v = L_v ÷ aptos no nível, isso precisa ser dito antes do commit deste adendo.
- **Controle de tamanho, em todos os testes:** o log dos eleitores do perfil passa a ser o **log dos aptos do BU** do turno do desfecho (no painel, do 2º turno).
- **Controles de composição** (fração sem biometria no cadastro, 60+, 16–24, escolaridade baixa, superior): continuam vindo do perfil do mesmo ano, porque o BU não tem esses dados.
  - São proporções entre 0 e 1. Não dividem a exposição e não podem explodir.
  - Nas seções de perfil fora de data, elas são ruidosas. Fica declarado como limite, sem variante.
- **Onde mais o denominador entra:**
  - exclusão "sem perfil": continua, porque os controles de composição precisam do perfil;
  - injeção do mínimo detectável no painel: F votos entram em L_v,2 e em votos_2, e e_v e Δc sobem F ÷ aptos_2;
  - fórmula M da equivalência no painel: a_s = max(0, e_v,s) × aptos_2,s ÷ votos_2,s;
  - exame nominal (seção 5): no painel, o resíduo usa o Δc novo, e a "liberação alta" é o decil superior de (e_V2 + e_V3m + e_V3s) com o denominador novo. No nível, só muda o controle de tamanho. A leitura por mesário é refeita com o mesmo leitor, e as estatísticas por seção, sem identificador, ficam gravadas.
- **Sem aptos no BU** (campo vazio ou zero num dos turnos usados): a seção sai, com contagem.

### (2) Linha de base de 2022 também em SP, e a mesma conta nas outras UFs com diário de 2022

**Arquivos (só leitura; não baixo nada).** Os diários de SP de 2022 foram baixados pela frente das H02/H05:

- `data/raw/2022/{1t,2t}/zip/bu_imgbu_logjez_rdv_vscmr_2022_<t>t_SP.zip`, registrados em `data/manifest/2022/zips.jsonl`;
- conferência em `data/manifest/2022/conferencia-sp-{1t,2t}.json`.

Ao lado: `votacao_secao_2022_BR.zip`, `detalhe_votacao_secao_2022.zip` e `perfil_eleitor_secao_2022_SP.zip`, já em `data/raw/dadosabertos/`.

**Leitura:**

- a do adendo 5 do plano 16: `estatistico-h13-v2-diario2022.mjs --uf sp`, com a mesma tabela de tradução e o mesmo ciclo;
- a tabela por seção de 2022 de `estatistico-h13-v2-dados2022.mjs`, com SP incluída;
- conferência das vias do diário contra o boletim de 2022 de SP, pelo critério do adendo 6 (V2 igual em pelo menos 99% das seções; senão, "medida não confirmada", e o teste roda assim mesmo).

**"SP 2022 pronto"** quer dizer: os dois `conferencia-sp-<t>t.json` existem, com `ok` verdadeiro e 0 falhas, e a leitura do diário de SP termina nos dois turnos. A conferência dos zips já estava assim quando este adendo foi escrito.

**Modelo de 2022:** o mesmo painel de 2026 com o denominador (1), em cada UF com diário de 2022: **MG, PR, SC, RS e SP**.

- e_v e Δc pelos aptos de 2022 de cada turno;
- controles do perfil de 2022, com o log dos aptos do 2º turno;
- efeito fixo de local do 2º turno de 2022, peso 13 + 22 do 2º turno, CR1 por local;
- as exclusões do adendo 5.
- MG, PR, SC e RS são **refeitos** com o denominador novo; os números de 2022 dos docs 24 e 26 deixam de valer para a classificação.

**Família da linha de base (só para classificar; fora dos 192):** 5 UFs × 3 vias = **15 testes** bicaudais do coeficiente de 2022. Bonferroni a 5%: |z| ≥ 2,935.

**Se SP 2022 não ficar pronto** (zip ausente, conferência com falha, ou leitura que não termina):

- os sinais positivos de SP no painel que passarem são classificados **novos**, pela letra da seção 8 (sem linha de base = novo);
- a forma final sai pela regra com essa classificação e leva a marca **"provisória: depende da linha de base de 2022 de SP"**;
- o doc 28 diz ao lado qual seria a forma se SP fosse classificado estável;
- a família de 2022 cai para 12 testes (|z| ≥ 2,865).

### (3) A regra "estável" é avaliada por via (UF × via)

Fica fixado o que a seção 8 deixava ambíguo (parecer 54, item 3.2):

- **Painel:** um sinal positivo de 2026 na UF u e na via v é **estável** se, na mesma UF e na **mesma via**, o coeficiente de 2022 (modelo (2), denominador (1)) for **positivo e passar** na família de 2022 (|z| ≥ 2,935). Senão é **novo**, incluindo o caso de UF sem diário de 2022.
- **Nível:** sem mudança; estável se o N1 da mesma UF e via for positivo com z ≥ 2.
- **μ_BR e μ_NE no painel:** estável se as UFs estáveis **naquela via** somarem mais da metade do peso do estágio 2 naquela via.
- Ter teste de 2022 na UF não basta: conta só a via.

### (4) Forma final recalculada

Tudo o mais fica como na seção 8:

- os 192 testes (162 de UF, 12 de μ, 6 de δ_NE, 12 do exame nominal), com o mesmo corte p ≤ 2,604 × 10⁻⁴;
- a ordem das formas;
- a equivalência (44.302 votos, fórmula M com o a_s novo; a variante pela injeção vai ao lado, como no doc 28);
- o item (c), que não usa denominador.

O doc 28 ganha a seção **"Adendo 1: resultado"**, sem apagar o resultado original, com a forma final recalculada e com a classificação de cada sinal positivo.

**Conferências antes de ler os testes:**

1. Com o denominador antigo, o script do adendo reproduz exatamente os 192 testes do doc 28.
2. MG V3m no painel com ÷ aptos fica igual ao do parecer 54 (+1,23, z 1,98, ou a diferença é explicada), e MG 2022 V3m com ÷ aptos igual ao do parecer 48 (−1,24, z −2,51). Os dois usam a mesma definição de aptos, ou a diferença de definição é relatada.
3. As vias de SP 2022 do diário contra o boletim de 2022.
4. Busca de números com formato de título nas saídas novas: 0.

**Saídas:** `data/parsed/auditoria/estatistico/h13-final/adendo1/`.

**Scripts:** os mesmos `estatistico-h13-final-*.mjs`, com a opção `--denominador aptos` e a saída em `adendo1/`. O padrão continua sendo o do plano, para reproduzir o doc 28. A linha de base de 2022 vai num script novo, `estatistico-h13-final-2022.mjs`.

**Recursos:** sem rede; no máximo 2 processos Node pesados; os zips de SP 2022 só são lidos.
