// T15: monta os prompts para GPT Astra, Grok e Kimi revisarem TODOS os números do relatório de perícia.
// Um prompt por tópico (conta, porcentagem, denominador, coerência interna) e um prompt com todos os tópicos
// (contradições entre tópicos). Os modelos só leem o texto: não rodam script. A resposta é Hipótese até
// um script do repo reproduzi-la (docs/08).
// Uso: node scripts/auditoria/modelos-revisao-pericia.mjs   → grava docs/analysis/modelos/T15/<nome>/prompt.md
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const PERICIA = 'docs/pericia';
const SAIDA = 'docs/analysis/modelos/T15';
const NACIONAL = 'docs/analysis/nacional/01-resumo-nacional-2t.md';

const topicos = readdirSync(PERICIA).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
const ler = (f) => readFileSync(f, 'utf8');

const CONTEXTO = `Você é revisor independente de uma auditoria das eleições brasileiras de 2026 (1º turno 04/10, 2º turno 25/10; Presidente: 13 = Lula, 22 = Flávio Bolsonaro). O relatório de perícia (docs/pericia/) é para leigos e tem uma regra dura: **só entra número 100% correto**, do universo completo (todas as seções, todas as UFs), conferido nos arquivos oficiais do TSE e reproduzível por script. Estimativa, amostra, "cerca de", número de terceiros não conferido e conta feita sobre suposição devem ficar FORA ou aparecer só como "Pendente", sem número.

Universo do 2º turno: 499.248 seções, 499.207 com pacote completo, 499.205 com voto para Presidente. Você não tem acesso aos dados nem pode rodar código: revise o que dá para revisar só com o texto.`;

const TAREFA_TOPICO = `## Sua tarefa

Revise **cada número** do tópico abaixo. Procure:

1. **Conta errada:** somas, diferenças, porcentagens, razões e totais que não fecham com os próprios números do texto (refaça as contas).
2. **Denominador ou universo trocado:** porcentagem calculada sobre base diferente da declarada; número que diz ser do país mas parece de parte das UFs; mistura de 1º e 2º turno.
3. **Contradição interna:** o mesmo dado com valores diferentes em lugares diferentes do tópico, ou diferente da tabela nacional de referência anexada.
4. **Violação da regra dos 100%:** número estimado, amostral, arredondado ("cerca de", "~", "aproximadamente"), parcial (só algumas UFs), de terceiros, ou conclusão que o número não sustenta.
5. **Afirmação mais forte que a evidência** (nos dois sentidos: falso alarme de fraude ou falsa absolvição).

## Formato da resposta (markdown)

Uma tabela com: | # | Trecho exato (cite) | Problema (tipo 1–5) | Conta refeita ou explicação | Gravidade (alta/média/baixa) |
Depois, uma linha "Números conferidos sem problema: N" e uma lista curta dos números que você conseguiu conferir aritmeticamente e batem.
Não invente números que não estão no texto. Se não houver problema, diga isso explicitamente. Seja específico: um achado vago não serve.`;

const referencia = `## Tabela nacional de referência (gerada por script sobre o universo completo do 2º turno)\n\n${ler(NACIONAL)}`;

const gravar = (nome, texto) => {
  const dir = path.join(SAIDA, nome);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'prompt.md'), texto);
  console.log(`${path.join(dir, 'prompt.md')} · ${texto.length} caracteres`);
};

for (const t of topicos) {
  gravar(t.replace(/\.md$/, ''), `${CONTEXTO}\n\n${TAREFA_TOPICO}\n\n## Tópico em revisão: ${t}\n\n${ler(path.join(PERICIA, t))}\n\n${referencia}\n`);
}

const todos = topicos.map((t) => `\n\n=== ARQUIVO ${t} ===\n\n${ler(path.join(PERICIA, t))}`).join('');
gravar('coerencia-entre-topicos', `${CONTEXTO}

## Sua tarefa

Abaixo estão TODOS os tópicos do relatório e o índice. Procure **só contradições entre tópicos**: o mesmo número, universo ou conclusão com valores ou status diferentes em arquivos diferentes (ex.: votos após 17h, votos sem digital, seções, comparecimento, status de hipóteses no quadro final × no tópico de origem). Ignore estilo.

## Formato da resposta (markdown)

| # | Número ou afirmação | Arquivo A (cite) | Arquivo B (cite) | Qual parece certo e por quê | Gravidade |
No fim: "Pares conferidos e coerentes:" com uma lista curta.

=== ARQUIVO README.md ===

${ler(path.join(PERICIA, 'README.md'))}${todos}

${referencia}
`);
