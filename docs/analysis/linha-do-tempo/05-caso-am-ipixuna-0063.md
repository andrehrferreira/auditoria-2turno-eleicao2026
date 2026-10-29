# 05. Caso AM, Ipixuna 02399/0045/0063 (aldeia Piau): linha do tempo dos dois turnos

Pedido do Auditor D (forense). Pelo BU: o 22 caiu de 61 para 2 votos, o 13 subiu de 135 para 167 e o comparecimento caiu de 227 para 197. A urna é de reserva nos dois turnos e os lacres não têm falha.

Ipixuna tem diferença de **−2 h** para Brasília ([01](01-fuso-horario.md)): 17h de Brasília = 15h locais. Horários abaixo no relógio **local**, com Brasília entre parênteses quando importa.

## Como reproduzir

```bash
node src/exportar.js --turno 1 --uf am --municipio 02399 --zona 0045 --secao 0063 --stdout
node src/exportar.js --turno 2 --uf am --municipio 02399 --zona 0045 --secao 0063 --stdout
node scripts/auditoria/tempo-conferir.mjs --turno 1 --secao am/02399/0045/0063 --min-intervalo 0 --min-hab 0
node scripts/sql.mjs "select turno, abertura, encerramento, emissao, comparecimento, numero_interno_urna from secao where uf='am' and municipio='02399' and zona='0045' and secao='0063'"
```

## Fatos (log bruto, 29/10/2026)

### Quando a urna foi trocada

- **1º turno (04/10).** A urna original, nº 02018634, foi ligada às 05:39 e abriu às **06:48:13 (08:48 de Brasília), 48 min atrasada**. Funcionou o dia todo **sem rede elétrica** (`Urna ligada desconectada da rede CA … 0.00V`, a cada 30 min).
  - Bateria interna crítica às 15:53:34. Religou às 16:05 na bateria externa (`Apresentada tela do reinício da votação`, `Urna pronta` às 16:08:22). A bateria externa ficou crítica às 16:19:40 e a urna parou sem desligamento registrado.
  - A urna de contingência, nº 02018717, já tinha sido ligada e preparada às 12:00:20 (`Urna de contingência pronta para eleição`) e desligada às 12:05.
  - **Troca às 16:46:42–16:48:39 (18:46–18:48 de Brasília):** `Início do procedimento de contingência`, `Contingência executada com sucesso`, reinício e `Urna pronta` às 16:53:52.
  - Votos: 175 na urna original e 52 na de contingência, que emitiu o BU.
- **2º turno (25/10).** **Não houve troca.** A urna 02018717, a reserva que assumiu no 1º turno, foi a urna da seção desde o início (`Modo de carga da UE - Votação`; o banco tem o mesmo nº interno e a carga de 18/09 nos dois turnos). Por isso o BU sai como `reservaSecao`. O pacote tem 2 logs, mas o 2º é o da urna 02018634 e não tem nenhuma linha de 25/10.
  - Ligada às 05:28. Urna pronta às 06:00:01 (08:00 de Brasília).
  - **Desligada pela chave às 12:51:33 (`Votação suspensa`)**, religada às 13:23:45 e pronta às 13:35:22.
  - Encerramento às 15:01:13–15:02:07 (17:01–17:02 de Brasília), com `Todas as pessoas presentes já votaram? SIM`.

### Votos depois das 17h de Brasília

- **1º turno: sim, 81 de 227 votos (35,7%)** a partir das 15:00 locais. O último foi às 18:53:58 local (**20:53:58 de Brasília**). Encerramento às 18:58:19 (20:58 de Brasília), a última seção de Ipixuna a fechar no 1º turno; as outras fecharam entre 15h e 17h locais.
  - Os votos depois das 17h de Brasília chegam em ritmo constante (por hora local: 15h: 22, 16h: 9, 17h: 25, 18h: 25), sem cara de fim de fila.
  - Às 18:56:48 o mesário respondeu `Todas as pessoas presentes já votaram? SIM`, cancelou o encerramento às 18:57:37 e respondeu SIM de novo às 18:57:52, antes de confirmar.
- **2º turno: não.** 0 voto depois das 15h locais. O último voto foi às 13:44:34 local. Até 11h locais votaram 193 dos 197; depois disso, só 3 votos às 11h e 1 às 13h.

### Habilitação sem biometria por horário

| | Total | Biometria | Ano de nascimento (sem biometria cadastrada) | Liberação manual |
|---|---|---|---|---|
| 1º turno | 227 | 172 | 49 | 6 |
| 1º turno, depois das 17h de Brasília | 81 | 61 | 16 | 4 |
| 2º turno | 197 | 156 | 33 | 8 |

- 1º turno: sem biometria em 24,2% do dia e em 24,7% depois das 17h de Brasília. Não se concentra no horário tardio. Distribuição por hora de 2 a 5, de 07h a 18h.
- 2º turno: 41 votos sem biometria, todos entre 06h e 11h locais (06h: 9; 07h: 12; 08h: 6; 09h: 8; 10h: 4; 11h: 1; 13h: 1), na mesma proporção dos votos com biometria.
- **Liberação manual sem mesário identificado:** nas 6 do 1º turno e nas 8 do 2º, a digital que liberou o eleitor **não é de mesário registrado**. O log mostra `Biometria coletada não é do mesário <título do mesário>` e depois `Não encontrou digital coletada em nenhum dos arquivos, vai salvar a digital em novo arquivo`. Nenhuma `Mesário … habilitou o eleitor` nos dois turnos. Pela premissa 8, é risco aberto: não se sabe de quem é a digital.

### Rajadas

- 1º turno: maior rajada de 5 votos sem biometria em 10 min, às 17:25:50–17:35:08 local (19:25–19:35 de Brasília), dentro do período depois das 17h. Intervalo mínimo entre votos: 73 s.
- 2º turno: maior rajada de 4 em 10 min, às 06:20–06:29. Intervalo mínimo: 40 s.
- Nenhuma das duas está fora do padrão nacional (AC: máximo de 8 em 10 min, doc 06/H05). Nenhum intervalo impossível ([03](03-intervalos-minimos.md)).

### Eventos raros

- 1º turno: o dia inteiro na bateria, sem rede elétrica, com troca por contingência às 16:46. `O eleitor identificado já votou` 3 vezes, todas no período tardio (17:37:14, 18:26:14 e 18:26:44, as duas últimas com 30 s de intervalo). `Eleitor já justificou` às 17:40:32. `Digitado título inválido para o registro de mesário` às 06:47:52.
- 2º turno: `Votação suspensa` pela chave às 12:51:33, com 32 min parada. `Mesário indagado se eleitor está votando` às 08:49:19 e `Eleitor voltou a digitar enquanto estava sendo suspenso` (eleitor 45 s sem atividade). `O eleitor identificado já votou` às 07:27:17. `Eleitor já justificou` 4 vezes. `Problema ao desmontar a MR` 2 vezes, comum em toda inicialização (doc 06).

## Hipóteses

- O atraso de 48 min na abertura e a parada na troca (da bateria crítica às 16:20 até a contingência pronta às 16:53, cerca de 35 min) **não explicam** 3h54 de votação depois das 17h de Brasília no 1º turno. **[a confirmar]** autorização do juiz eleitoral (ata da mesa ou da zona 0045). Sem ela, os 81 votos tardios do 1º turno entram na categoria de risco do [02](02-votos-apos-17h.md): admissão depois das 17h controlada só por pessoas.
- A queda do 22 (61 → 2) não pode ser ligada ao horário: o RDV não diz em quem votou cada eleitor (sigilo). O que o log mostra é diferente entre os turnos: no 1º, um terço dos votos veio depois das 17h de Brasília; no 2º, a votação praticamente acabou às 11h locais.
- **Recomendação:** pedir as atas da seção nos dois turnos e o registro de quem estava presente na urna de contingência. Comparar com as outras seções da aldeia ou do local de votação, para separar padrão do local de padrão da seção.
