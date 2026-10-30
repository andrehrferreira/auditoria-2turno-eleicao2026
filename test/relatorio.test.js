import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  EXCECOES_PROCESSO,
  RE_PROCESSO,
  acharReferenciasDeProcesso,
  dadosDoCertificado,
  embutirSvg,
  escoparCss,
  filtrarGlossario,
  gerar,
  gerarTema,
  gerarTemas,
  localizarNavegador,
  prepararAssinatura,
  validarAssinatura,
} from '../scripts/relatorio/gerar.mjs';
import {
  contarHtml,
  contarMarkdown,
  converter,
  diferencaPalavras,
  escaparHtml,
  palavrasHtml,
  palavrasMarkdown,
  slug,
} from '../scripts/relatorio/markdown.mjs';
import {
  CABECALHO,
  RE_DOCUMENTO,
  conferirPlanilha,
  dataBr,
  linhaCsv,
  serieHex,
} from '../scripts/auditoria/anexo-h25-urnas.mjs';
import { diretorioTemporario } from './auxiliares.js';

const html = (md, op) => converter(md, op).html;

test('escapa HTML do texto, inclusive o que parece tag', () => {
  assert.equal(escaparHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  assert.equal(html('use <dir> & <script>'), '<p>use &lt;dir&gt; &amp; &lt;script&gt;</p>\n');
  assert.match(html('`<pasta da seção>`'), /<code>&lt;pasta da seção&gt;<\/code>/);
});

test('âncoras no padrão do GitHub, com acentos e ordinais', () => {
  assert.equal(slug('O que foi conferido no país inteiro (2º turno)'), 'o-que-foi-conferido-no-país-inteiro-2º-turno');
  assert.equal(slug('5. Soma dos boletins × resultado oficial'), '5-soma-dos-boletins--resultado-oficial');
  const { titulos } = converter('# A\n\n## Limites\n\n## Limites');
  assert.deepEqual(titulos.map((t) => t.id), ['a', 'limites', 'limites-1']);
});

test('títulos de 1 a 4 níveis, com prefixo de id e gancho', () => {
  const r = converter('# 5. Título\n### Sub *it*', {
    prefixoId: 't05-',
    titulo: ({ nivel, html: h, id }) => `<h${nivel} data-id="${id}">${h}</h${nivel}>`,
  });
  assert.equal(r.html, '<h1 data-id="t05-5-título">5. Título</h1>\n<h3 data-id="t05-sub-it">Sub <em>it</em></h3>\n');
});

test('negrito, itálico, riscado e código, inclusive negrito com link dentro', () => {
  assert.equal(html('**a** *b* _c_ ~~d~~ `e`'), '<p><strong>a</strong> <em>b</em> <em>c</em> <del>d</del> <code>e</code></p>\n');
  assert.equal(
    html('**Fato (no [parecer 24](x.md), item 1).** Texto'),
    '<p class="com-rotulo rotulo-fato"><strong class="com-rotulo"><span class="rotulo">Fato</span> (no <a href="x.md">parecer 24</a>, item 1).</strong> Texto</p>\n',
  );
  // sublinhado no meio da palavra e asterisco solto não viram ênfase
  assert.equal(html('arquivo_de_teste e 2 * 3'), '<p>arquivo_de_teste e 2 * 3</p>\n');
  assert.equal(html('`data/*-cs.json` e `a7-*`'), '<p><code>data/<wbr>*-<wbr>cs.<wbr>json</code> e <code>a7-<wbr>*</code></p>\n');
  assert.equal(html('\\*literal\\*'), '<p>*literal*</p>\n');
  assert.equal(html('~30 min'), '<p>~30 min</p>\n');
});

test('rótulos Fato, Hipótese, Pendente e Recomendação viram marcador; outras palavras não', () => {
  const h = html('**Hipótese (revisada):** x\n\n**Pendente: em verificação**\n\n**Recomendação.** y\n\n**Fatos** z');
  assert.match(h, /<p class="com-rotulo rotulo-hipótese"><strong class="com-rotulo"><span class="rotulo">Hipótese<\/span> \(revisada\):<\/strong> x<\/p>/);
  assert.match(h, /<span class="rotulo">Pendente<\/span>: em verificação/);
  assert.match(h, /rotulo-recomendação/);
  assert.match(h, /<p><strong>Fatos<\/strong> z<\/p>/);
  assert.equal(contarHtml(h).rotulos, 3);
});

test('aspas tipográficas fora do código', () => {
  assert.equal(html('a "nota fiscal" e `"x"`'), '<p>a “nota fiscal” e <code>&quot;x&quot;</code></p>\n');
  assert.equal(html("marcado 'Pendente'", { tipografia: false }), "<p>marcado 'Pendente'</p>\n");
});

test('links: gancho resolve o destino; null vira texto sem link', () => {
  const op = { link: (d) => (d.startsWith('05') ? '#t05' : d.startsWith('http') ? d : null) };
  assert.equal(html('[tópico 5](05-soma.md) e [x](https://tse.jus.br/a_(b)) e [y](../analysis/z.md)', op),
    '<p><a href="#t05">tópico 5</a> e <a href="https://tse.jus.br/a_(b)">x</a> e <span class="link-sem-destino">y</span></p>\n');
  assert.match(html('<https://exemplo.org/a>'), /<a href="https:\/\/exemplo.org\/a">https:\/\/exemplo.org\/a<\/a>/);
});

test('imagem sozinha no parágrafo vira figura; na linha, imagem', () => {
  const op = { figura: ({ src, alt }) => `<figure data-imagem>${src}|${alt}</figure>` };
  assert.equal(html('![Lacres, por modelo](graficos/a.svg)', op), '<figure data-imagem>graficos/a.svg|Lacres, por modelo</figure>\n');
  assert.match(html('veja ![x](a.png) aqui'), /<p>veja <img src="a.png" alt="x" data-imagem> aqui<\/p>/);
});

test('listas aninhadas, numeradas com início, soltas e de tarefas', () => {
  const md = '- um\n  - dois\n    1. três\n- quatro\n\n3. a\n4. b\n\n- [x] feito\n- [ ] falta';
  assert.equal(
    html(md),
    '<ul>\n<li>um<ul>\n<li>dois<ol>\n<li>três</li>\n</ol>\n</li>\n</ul>\n</li>\n<li>quatro</li>\n</ul>\n' +
      '<ol start="3">\n<li>a</li>\n<li>b</li>\n</ol>\n' +
      '<ul class="tarefas">\n<li><span class="caixa feita" role="img" aria-label="feito"></span>feito</li>\n' +
      '<li><span class="caixa" role="img" aria-label="a fazer"></span>falta</li>\n</ul>\n',
  );
  // item com parágrafo, tabela e imagem recuados (lista solta)
  const solta = html('- texto:\n\n  | a | b |\n  |---|--:|\n  | 1 | 2 |\n\n  **Como ler:** fim\n- outro');
  assert.match(solta, /<li><p>texto:<\/p>\n<table class="tabela cols-2">/);
  assert.match(solta, /<td class="d">2<\/td>/);
  assert.match(solta, /<p><strong>Como ler:<\/strong> fim<\/p>\n<\/li>\n<li><p>outro<\/p>\n<\/li>/);
  // continuação preguiçosa
  assert.equal(html('- a\nb'), '<ul>\n<li>a\nb</li>\n</ul>\n');
});

test('tabelas: alinhamento, barra escapada, célula vazia, linhas curtas', () => {
  const h = html('| | Nº | Total |\n|:-:|---|---:|\n| a \\| b | `x\\|y` |\n| c | d | 3 |');
  assert.match(h, /<th class="c"><\/th><th>Nº<\/th><th class="d">Total<\/th>/);
  assert.match(h, /<td class="c">a \| b<\/td><td><code>x\|y<\/code><\/td><td class="d"><\/td>/);
  assert.match(h, /<thead>[\s\S]*<\/thead>\n<tbody>[\s\S]*<\/tbody>/);
  assert.equal(contarHtml(h).tabelas, 1);
});

test('citação, alerta [!WARNING], régua e código em bloco (também dentro de lista)', () => {
  assert.equal(html('> **Situação:** ok\nlazy'), '<blockquote>\n<p><strong>Situação:</strong> ok\nlazy</p>\n</blockquote>\n');
  const alerta = html('> [!WARNING]\n> **Atenção** aqui');
  assert.match(alerta, /^<aside class="alerta alerta-warning" role="note"><p class="alerta-titulo" data-ger>Atenção<\/p>\n<p><strong>Atenção<\/strong> aqui<\/p>\n<\/aside>/);
  assert.equal(html('---'), '<hr>\n');
  assert.equal(
    html('```bash\nnode a.mjs <dir>   # x\n\nfim\n```'),
    '<pre><code class="lang-bash"><span class="linha">node a.mjs &lt;dir&gt;   # x</span><span class="linha"> </span><span class="linha">fim</span></code></pre>\n',
  );
  assert.match(html('1. passo:\n   ```\n   cmd\n   ```\n2. outro'), /<li>passo:<pre><code><span class="linha">cmd<\/span><\/code><\/pre>\n<\/li>\n<li>outro<\/li>/);
});

test('conferência: contagens e palavras do .md batem com o HTML, e acusam perda', () => {
  const md = '# 1. T\n\n**Fato:** 499.207 seções.\n\n| a | b |\n|---|---|\n| 1 | [x](y.md) |\n\n![g](g.svg)\n\n```\ncmd --uf sp\n```\n\n1. **Pendente** z';
  const h = converter(md).html;
  assert.deepEqual(contarMarkdown(md), { titulos: 1, tabelas: 1, imagens: 1, rotulos: 2, codigos: 1 });
  assert.deepEqual(contarHtml(h), contarMarkdown(md));
  assert.deepEqual(diferencaPalavras(palavrasMarkdown(md), palavrasHtml(h)), { faltam: [], sobram: [] });
  const perdido = h.replace('499.207', '');
  assert.deepEqual(diferencaPalavras(palavrasMarkdown(md), palavrasHtml(perdido)).faltam.sort(), ['207×1', '499×1']);
  assert.deepEqual(palavrasHtml('<span data-ger>5.1</span> x <svg><text>y</text></svg>'), new Map([['x', 1]]));
});

test('todos os arquivos de docs/pericia convertem sem perder estrutura nem palavra', async () => {
  const dir = path.join(import.meta.dirname, '..', 'docs', 'pericia');
  const arquivos = (await readdir(dir)).filter((n) => n.endsWith('.md')).map((n) => path.join(dir, n));
  arquivos.push(path.join(dir, 'evidencias', 'README.md'));
  for (const a of arquivos) {
    const md = await readFile(a, 'utf8');
    const h = converter(md).html;
    assert.deepEqual(contarHtml(h), contarMarkdown(md), a);
    assert.deepEqual(diferencaPalavras(palavrasMarkdown(md), palavrasHtml(h)), { faltam: [], sobram: [] }, a);
  }
});

test('SVG embutido: classes e ids prefixados, sem tema escuro, largura fluida', () => {
  const svg =
    '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 300" width="760" height="300" aria-labelledby="titulo desc">' +
    '<title id="titulo">T</title><desc id="desc">D</desc><style>.fundo{fill:#fcfcfb}.t1,.t2{fill:#000} text{font-family:x}' +
    '@media (prefers-color-scheme:dark){.fundo{fill:#111}}</style><rect class="fundo s0" width="760"/><use href="#titulo"/></svg>';
  const s = embutirSvg(svg, 'g3', 'alt');
  assert.match(s, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 760 300" aria-labelledby="g3-titulo g3-desc" id="g3" class="grafico-svg" style="max-width:760px">/);
  assert.match(s, /#g3 \.g3-fundo\{fill:#fcfcfb\}#g3 \.g3-t1,#g3 \.g3-t2\{fill:#000\}#g3 text\{font-family:x\}<\/style>/);
  assert.doesNotMatch(s, /prefers-color-scheme|#111|width="760" height/);
  assert.match(s, /<rect class="g3-fundo g3-s0" width="760"\/>/);
  assert.match(s, /href="#g3-titulo"/);
  assert.equal(escoparCss('@media print{.a{x:1}}', 'p'), '@media print{#p .p-a{x:1}}');
});

test('navegador: variável RELATORIO_NAVEGADOR tem prioridade; nada achado devolve null', async (t) => {
  const dir = await diretorioTemporario(t);
  const falso = path.join(dir, 'meu-chrome');
  await writeFile(falso, '');
  assert.equal(localizarNavegador({ RELATORIO_NAVEGADOR: falso, PATH: '' }, 'linux'), falso);
  assert.equal(localizarNavegador({ PATH: dir }, 'linux'), null);
});

// ------------------------------------------------------------------ pasta de perícia de exemplo
// Os testes do documento usam uma perícia pequena numa pasta temporária, e não docs/pericia,
// cujo texto muda a cada revisão.

const README_FIXO = `# Relatório de perícia: exemplo

> [!WARNING]
> **Relatório em elaboração.** Nada aqui é conclusão final.

Toda afirmação traz um destes rótulos:

- **Fato**: conferido nos arquivos oficiais.
- **Hipótese**: possibilidade ainda não comprovada.
- **Pendente**: o que ainda falta conferir.

## Tópicos

| # | Tópico |
|---|---|
| 0 | [Coleta](00-coleta.md) |
| 1 | [Integridade](01-integridade.md) |

**Registro de evidências:** o livro de registro do processo.

## Glossário

| Termo | Em palavras simples |
|---|---|
| **Hash** | A impressão digital de um arquivo |
| **Autoridade certificadora (AC)** | O cartório digital do TSE |
| **Coorte** | Um grupo de pessoas |
`;

const TOPICOS_FIXOS = {
  '00-coleta.md':
    '# 0. Coleta\n\n## A pergunta\n\n**Fato:** todas as seções, conferidas pela lista oficial de cada uma (aux.json). ' +
    'Ver [limites](01-integridade.md#limites) e os [dados do gráfico](graficos/dados/g.csv).\n',
  '01-integridade.md': '# 1. Integridade\n\n## Limites\n\n![Gráfico de exemplo](graficos/g.svg)\n\n**Pendente:** 1º turno.\n',
};

const SVG_FIXO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50"><style>.b{fill:#2a78d6}</style>\n' +
  '<rect class="b" width="40" height="20"/>\n<text x="1" y="45">Fonte: arquivos oficiais do TSE</text>\n</svg>';

async function montarPericia(base, { readme = README_FIXO, topicos = {}, svg = SVG_FIXO } = {}) {
  const pericia = path.join(base, 'pericia');
  await mkdir(path.join(pericia, 'graficos'), { recursive: true });
  await mkdir(path.join(pericia, 'temas'), { recursive: true });
  await writeFile(path.join(pericia, 'README.md'), readme);
  for (const [nome, md] of Object.entries({ ...TOPICOS_FIXOS, ...topicos })) await writeFile(path.join(pericia, nome), md);
  await writeFile(path.join(pericia, 'graficos', 'g.svg'), svg);
  return pericia;
}

const semRegistro = () => {};

test('gera o relatório completo autocontido: tópicos, glossário, links internos, sem anexo do registro', async (t) => {
  const dir = await diretorioTemporario(t);
  const pericia = await montarPericia(dir);
  const r = await gerar({ pericia, saida: path.join(dir, 'saida'), registrar: semRegistro });
  const doc = await readFile(r.htmlAbs, 'utf8');
  assert.match(doc, /^<!doctype html>\n<html lang="pt-BR">/);
  assert.match(doc, /<h1 class="capa-titulo">Relatório de perícia<\/h1>/);
  assert.match(doc, /<nav class="sumario"/);
  assert.match(doc, /<section class="topico" id="t00">[\s\S]*<section class="topico" id="t01">/);
  assert.match(doc, /@page p-t00\{@top-right\{content:"0 · Coleta"\}\}/);
  // 1. sem o anexo do registro de evidências (nem o parágrafo do README), só o glossário
  assert.match(doc, /<section class="anexo" id="anexo-a">[\s\S]*Glossário/);
  assert.doesNotMatch(doc, /anexo-b|Anexo B|Registro de evidências|livro de registro/);
  // links: tópico → âncora interna; dado de gráfico → só o texto
  assert.match(doc, /<a href="#t01-limites">limites<\/a>/);
  assert.match(doc, /<span class="link-sem-destino">dados do gráfico<\/span>/);
  assert.match(doc, /href="#t00"/);
  assert.equal(r.total.imagens, 1);
  // nada externo
  assert.doesNotMatch(doc, /<script|<link |<img src="(?!data:)|github\.com/);
  // 4. versão sem caminho nem nota de alterações
  assert.doesNotMatch(doc, /alterações|docs\/pericia/);
  assert.match(doc, /@page\{@bottom-left\{content:"Versão [^"·]+ · gerado em \d{2}\/\d{2}\/\d{4}"\}\}/);
});

test('link para fora do relatório (análises, hipóteses, registro) faz a geração falhar com arquivo e linha', async (t) => {
  const dir = await diretorioTemporario(t);
  const pericia = await montarPericia(dir, {
    topicos: {
      '00-coleta.md': '# 0. Coleta\n\n## A pergunta\n\nVer a [análise](../analysis/x/01.md) e o [registro](../hipoteses.md).\n',
    },
    readme: README_FIXO.replace('Toda afirmação', 'O [registro](evidencias/README.md) fica à parte.\n\nToda afirmação'),
  });
  await assert.rejects(gerar({ pericia, saida: dir, registrar: semRegistro }), (e) => {
    assert.match(e.message, /links para arquivos que não fazem parte do relatório/);
    assert.match(e.message, /00-coleta\.md:5: link para fora do relatório: \.\.\/analysis\/x\/01\.md/);
    assert.match(e.message, /00-coleta\.md:5: link para fora do relatório: \.\.\/hipoteses\.md/);
    assert.match(e.message, /README\.md:6: link para fora do relatório: evidencias\/README\.md/);
    return true;
  });
});

test('relatório completo: link para um relatório temático vira texto com nota de documento à parte', async (t) => {
  const dir = await diretorioTemporario(t);
  const pericia = await montarPericia(dir, {
    topicos: {
      '00-coleta.md': '# 0. Coleta\n\n## A pergunta\n\nVer o [relatório temático](temas/x.md) e [O certificado](temas/x.md#a-pergunta).\n',
    },
  });
  const r = await gerar({ pericia, saida: path.join(dir, 'saida'), registrar: semRegistro });
  const doc = await readFile(r.htmlAbs, 'utf8');
  assert.match(doc, /<span class="link-sem-destino">relatório temático<\/span><span class="ref-completo" data-ger> \(documento à parte\)<\/span>/);
  assert.match(doc, /<span class="link-sem-destino">O certificado<\/span><span class="ref-completo" data-ger> \(relatório temático à parte\)<\/span>/);
  assert.doesNotMatch(doc, /temas\/x/);
});

test('referências do processo: regex, exceções e linhas', () => {
  const positivos = [
    'sustentado no parecer cético 24',
    'Pareceres céticos 25 e 26',
    'o revisor cético refez',
    'o redator escreveu',
    'Auditor C mediu',
    'revisado pelo Astra, Grok e Kimi',
    'rode verifica-pericia.mjs',
    'saída em resumo.json e cadeia.jsonl',
    'ver docs/analysis/x',
    'em scripts/auditoria',
    'em data/parsed',
    'src/lacres.js',
    'npm run relatorio',
    'node scripts/x',
  ];
  for (const p of positivos) assert.equal(acharReferenciasDeProcesso([p]).length > 0, true, p);
  const negativos = [
    'a lista oficial de cada seção (aux.json)',
    'o auditor pediu',
    'a data de emissão',
    'redatora? não: redação do boletim',
    'Figura 5.1',
    'Versão abc1234 · gerado em 30/10/2026',
  ];
  for (const n of negativos) assert.deepEqual(acharReferenciasDeProcesso([n]), [], n);
  assert.deepEqual(
    acharReferenciasDeProcesso(['ok', 'ver docs/x e aux.json']).map((a) => [a.linha, a.achado]),
    [[2, 'docs/']],
  );
  assert.ok(RE_PROCESSO.flags.includes('g'));
  assert.equal(EXCECOES_PROCESSO.length, 1);
});

test('texto com referência do processo (no .md ou no gráfico) faz a geração falhar com arquivo e linha', async (t) => {
  const dir = await diretorioTemporario(t);
  const pericia = await montarPericia(dir, {
    topicos: {
      '00-coleta.md': '# 0. Coleta\n\n## A pergunta\n\n**Fato:** sustentado no parecer cético 24.\n\n```\nnode scripts/auditoria/x.mjs\n```\n',
    },
    svg: SVG_FIXO.replace('Fonte: arquivos oficiais do TSE', 'Fonte: docs/analysis/x.md'),
  });
  await assert.rejects(gerar({ pericia, saida: dir, registrar: semRegistro }), (e) => {
    assert.match(e.message, /referências do processo da auditoria/);
    assert.match(e.message, /00-coleta\.md:5: "parecer cético"/);
    assert.match(e.message, /00-coleta\.md:8: "node scripts"/);
    assert.match(e.message, /00-coleta\.md:8: "\.mjs"/);
    assert.match(e.message, /g\.svg:3: "docs\/" no texto do gráfico/);
    return true;
  });
  // destino de link e endereço de imagem não são texto visível: não acusam
  const ok = await montarPericia(path.join(dir, 'ok'), {
    topicos: { '00-coleta.md': '# 0. Coleta\n\n[Integridade](01-integridade.md)\n' },
  });
  await gerar({ pericia: ok, saida: path.join(dir, 'ok', 'saida'), registrar: semRegistro });
});

// ------------------------------------------------------------------ relatórios temáticos

const GLOSSARIO = [
  '## Glossário',
  '',
  '| Termo | Em palavras simples |',
  '|---|---|',
  '| **BU** (Boletim de Urna) | O placar da urna |',
  '| **Hash** | A impressão digital de um arquivo |',
  '| **Cartão de votação (mídia de votação, MV)** | O cartão de memória |',
  '| **Comparecimento / abstenção** | Quantos votaram / não votaram |',
  '| **Coorte** | Um grupo de pessoas |',
].join('\n');

test('glossário do tema: só os termos usados; sigla exige maiúsculas; nada usado devolve tudo', () => {
  const g = filtrarGlossario(GLOSSARIO, 'O hash do BU confere. A abstenção caiu e a MV foi trocada. bu minúsculo não conta.');
  assert.match(g, /\*\*BU\*\*/);
  assert.match(g, /\*\*Hash\*\*/);
  assert.match(g, /\*\*Cartão de votação/);
  assert.match(g, /\*\*Comparecimento \/ abstenção\*\*/);
  assert.doesNotMatch(g, /Coorte/);
  assert.match(g, /^## Glossário\n\n\| Termo \| Em palavras simples \|\n\|---\|---\|\n/);
  // siglas em minúsculas não contam: nenhum termo usado, volta o glossário inteiro
  assert.equal(filtrarGlossario(GLOSSARIO, 'o bu e a mv'), GLOSSARIO);
  assert.equal(filtrarGlossario(GLOSSARIO, 'texto sem termo nenhum'), GLOSSARIO);
  const comTexto = `${GLOSSARIO}\n\nUm parágrafo fora da tabela.`;
  assert.equal(filtrarGlossario(comTexto, 'hash'), comTexto);
});

async function montarTema(base, md) {
  const pericia = await montarPericia(base);
  const arquivo = path.join(pericia, 'temas', 'certificado-exemplo.md');
  await writeFile(arquivo, md);
  return arquivo;
}

const TEMA = `# Certificado vencido da autoridade

> **Situação:** exemplo de teste.

## A pergunta

O certificado da **AC** venceu? Ver o [tópico 1](../01-integridade.md#limites) e a [coleta](../00-coleta.md).

## Resposta curta

- **Fato:** o **hash** e a assinatura digital conferem.
- **Pendente:** pedido ao TSE.

| Item | Valor |
|---|---:|
| Pacotes | 499.207 |

![Gráfico de exemplo](../graficos/g.svg)
`;

test('relatório temático: capa com o H1, frente, numeração 1/1.1, nota de tópico do completo, glossário filtrado', async (t) => {
  const dir = await diretorioTemporario(t);
  const arquivo = await montarTema(dir, TEMA);
  const saida = path.join(dir, 'saida');
  const r = await gerarTema({ arquivo, saida, registrar: semRegistro });
  assert.equal(r.htmlAbs, path.join(saida, 'certificado-exemplo.html'));
  const doc = await readFile(r.htmlAbs, 'utf8');
  assert.match(doc, /<title>Relatório de perícia — Certificado vencido da autoridade<\/title>/);
  assert.match(doc, /<h1 class="capa-titulo">Certificado vencido da autoridade<\/h1>/);
  assert.match(doc, /<p class="capa-subtitulo">Arquivos das urnas das eleições de 2026 — 1º e 2º turno<\/p>/);
  assert.match(doc, /<section class="frente" id="como-ler">[\s\S]*<span class="rotulo">Fato<\/span>/);
  assert.match(doc, /<nav class="sumario"[\s\S]*<span class="num">1\.1<\/span><span class="texto">A pergunta/);
  assert.match(doc, /<h1 id="tema-certificado-vencido-da-autoridade" class="titulo-topico"><span class="num" data-ger>1<\/span>/);
  assert.match(doc, /<h2 id="tema-resposta-curta"><span class="num" data-ger>1\.2<\/span>/);
  assert.match(doc, /Figura 1\.1<\/figcaption><svg/);
  // tópicos do relatório completo: só o texto e a nota, sem endereço
  assert.match(doc, /<span class="link-sem-destino">tópico 1<\/span><span class="ref-completo" data-ger> \(no relatório completo\)<\/span>/);
  assert.match(doc, /<span class="link-sem-destino">coleta<\/span><span class="ref-completo" data-ger> \(ver tópico 0 do relatório completo\)<\/span>/);
  assert.doesNotMatch(doc, /href="#t0\d|github\.com|id="topicos"|class="topico" id="t0|anexo-b|Registro de evidências/);
  const glossario = doc.slice(doc.indexOf('id="anexo-a"'));
  assert.match(glossario, /<strong>Hash<\/strong>/);
  assert.match(glossario, /Autoridade certificadora \(AC\)/);
  assert.doesNotMatch(glossario, /Coorte/);
  assert.equal(r.total.imagens, 1);
});

test('relatório temático: link para fora e referência do processo também falham', async (t) => {
  const dir = await diretorioTemporario(t);
  const fora = await montarTema(dir, '# Tema\n\nVer a [análise](../../analysis/x.md).\n');
  await assert.rejects(gerarTema({ arquivo: fora, saida: dir, registrar: semRegistro }), /certificado-exemplo\.md:3: link para fora do relatório/);
  const processo = await montarTema(dir, '# Tema\n\nConferido pelo Grok.\n');
  await assert.rejects(gerarTema({ arquivo: processo, saida: dir, registrar: semRegistro }), /certificado-exemplo\.md:3: "Grok"/);
});

test('relatório temático: exige exatamente um título "# "', async (t) => {
  const dir = await diretorioTemporario(t);
  const sem = await montarTema(dir, '## Só subtítulo\n\ntexto');
  await assert.rejects(gerarTema({ arquivo: sem, saida: dir, registrar: semRegistro }), /exatamente um título/);
  const dois = await montarTema(dir, '# Um\n\n# Dois\n');
  await assert.rejects(gerarTema({ arquivo: dois, saida: dir, registrar: semRegistro }), /tem 2/);
});

test('gerar todos os temas: pasta vazia ou ausente só avisa; com temas gera cada um', async (t) => {
  const dir = await diretorioTemporario(t);
  const msgs = [];
  assert.deepEqual(await gerarTemas({ dir: path.join(dir, 'nao-existe'), saida: dir, registrar: (m) => msgs.push(m) }), []);
  assert.match(msgs[0], /Nenhum tema em .*: nada a gerar\./);
  const arquivo = await montarTema(dir, TEMA);
  const r = await gerarTemas({ dir: path.dirname(arquivo), saida: path.join(dir, 'saida'), registrar: semRegistro });
  assert.equal(r.length, 1);
  assert.match(await readFile(r[0].htmlAbs, 'utf8'), /Certificado vencido da autoridade/);
});

test('linha de comando: --tema sem arquivo sai com erro de uso', () => {
  const script = path.join(import.meta.dirname, '..', 'scripts', 'relatorio', 'gerar.mjs');
  const r = spawnSync(process.execPath, [script, '--tema'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Uso: .*--tema docs\/pericia\/temas\/<slug>\.md/);
});

// ------------------------------------------------------------------ resumo executivo

test('resumo executivo presente: logo depois da capa, antes de "Como ler", no sumário, links internos e conferido', async (t) => {
  const dir = await diretorioTemporario(t);
  const pericia = await montarPericia(dir);
  const resumo = path.join(dir, 'resumo.md');
  await writeFile(
    resumo,
    '# Resumo executivo\n\n1. **499.207 pacotes, 0 falha.** **Fato:** lacres conferem. [→ tópico 1](01-integridade.md)\n' +
      '2. **Pendente:** 1º turno. [→ tópico 0](00-coleta.md)\n',
  );
  const r = await gerar({ pericia, resumo, saida: path.join(dir, 'saida'), registrar: semRegistro });
  const doc = await readFile(r.htmlAbs, 'utf8');
  const capa = doc.indexOf('<section class="capa"');
  const sec = doc.indexOf('<section class="frente resumo" id="resumo">');
  const comoLer = doc.indexOf('<section class="frente" id="como-ler">');
  assert.ok(capa >= 0 && capa < sec && sec < comoLer, 'ordem: capa, resumo, como ler');
  assert.match(doc, /#resumo\{page:p-resumo\}\n@page p-resumo\{@top-right\{content:"Resumo executivo"\}\}/);
  assert.match(doc, /<h1 id="resumo-resumo-executivo" class="titulo-secao">Resumo executivo<\/h1>/);
  assert.match(doc, /<a href="#t01">→ tópico 1<\/a>/);
  assert.match(doc, /<a href="#t00">→ tópico 0<\/a>/);
  assert.match(doc, /<span class="rotulo">Fato<\/span>/);
  const sumario = doc.slice(doc.indexOf('<nav class="sumario"'), doc.indexOf('</nav>'));
  assert.ok(sumario.indexOf('href="#resumo"') < sumario.indexOf('href="#como-ler"'));
  assert.equal((sumario.match(/href="#resumo"/g) ?? []).length, 1);

  // sem título "# ": o gerador dá o nome, que não entra na conferência
  await writeFile(resumo, '- **Fato:** item.\n');
  const r2 = await gerar({ pericia, resumo, saida: path.join(dir, 'saida2'), registrar: semRegistro });
  const doc2 = await readFile(r2.htmlAbs, 'utf8');
  assert.match(doc2, /<section class="frente resumo" id="resumo">\n<h1 class="titulo-secao" data-ger>Resumo executivo<\/h1>/);
  assert.match(doc2, /<li class="sum-1 sum-frente"><a href="#resumo"><span class="num"><\/span><span class="texto">Resumo executivo<\/span>/);
});

test('resumo executivo ausente: o relatório começa por "Como ler"; temas nunca levam o resumo', async (t) => {
  const dir = await diretorioTemporario(t);
  const pericia = await montarPericia(dir);
  const r = await gerar({ pericia, saida: path.join(dir, 'saida'), registrar: semRegistro });
  const doc = await readFile(r.htmlAbs, 'utf8');
  assert.doesNotMatch(doc, /id="resumo"|href="#resumo"/);
  assert.match(doc, /<ol class="sum">\n<li class="sum-1 sum-frente"><a href="#como-ler">/);
  await writeFile(path.join(pericia, 'resumo.md'), '# Resumo executivo\n\n- **Fato:** item.\n');
  const arquivo = path.join(pericia, 'temas', 'certificado-exemplo.md');
  await writeFile(arquivo, TEMA);
  const tema = await gerarTema({ arquivo, saida: path.join(dir, 'tema'), registrar: semRegistro });
  assert.doesNotMatch(await readFile(tema.htmlAbs, 'utf8'), /id="resumo"|Resumo executivo/);
});

// ------------------------------------------------------------------ assinatura digital (PAdES)

const PYTHON = process.env.RELATORIO_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const TEM_PYHANKO = spawnSync(PYTHON, ['-m', 'pyhanko', '--version'], { encoding: 'utf8' }).status === 0;
const OPENSSL = ['C:/Program Files/OpenSSL-Win64/bin/openssl.exe', 'openssl'].find(
  (c) => spawnSync(c, ['version'], { encoding: 'utf8' }).status === 0,
);
const NAVEGADOR = localizarNavegador();

async function chaveTemporaria(dir) {
  const pasta = path.join(dir, 'chave');
  await mkdir(pasta, { recursive: true });
  const r = spawnSync(
    OPENSSL,
    [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2',
      '-keyout', path.join(pasta, 'chave.pem'), '-out', path.join(pasta, 'certificado.pem'),
      '-subj', '/CN=Teste do relatorio',
      '-addext', 'basicConstraints=critical,CA:FALSE',
      '-addext', 'keyUsage=critical,digitalSignature,nonRepudiation',
    ],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  return pasta;
}

test('certificado público versionado: nome e impressão digital SHA-256', async () => {
  const pem = await readFile(path.join(import.meta.dirname, '..', 'docs', 'relatorio', 'certificado-assinatura.pem'), 'utf8');
  assert.doesNotMatch(pem, /PRIVATE KEY/);
  assert.deepEqual(dadosDoCertificado(pem), {
    nome: 'Auditoria independente das urnas — Eleições 2026',
    impressao: 'CF:FB:8B:52:0A:97:11:94:8D:5A:32:FF:4A:5A:4E:1D:F7:6F:A9:84:E2:26:9F:16:8C:DF:62:3C:28:F3:CB:E3',
  });
});

test('assinatura: sem chave ou sem pyHanko, não assina e explica por quê', async (t) => {
  const dir = await diretorioTemporario(t);
  const semChave = prepararAssinatura({ pasta: path.join(dir, 'nao-existe') });
  assert.equal(semChave.ok, false);
  assert.match(semChave.motivo, /chave de assinatura não encontrada .*RELATORIO_CHAVE.*sem assinatura/);
  await writeFile(path.join(dir, 'chave.pem'), 'x');
  await writeFile(path.join(dir, 'certificado.pem'), 'x');
  const semPython = prepararAssinatura({ pasta: dir, python: path.join(dir, 'python-que-nao-existe') });
  assert.equal(semPython.ok, false);
  assert.match(semPython.motivo, /pyHanko não encontrado/);
});

test(
  'PDF sem chave: sai sem assinatura, com aviso e com o .sha256',
  { skip: !NAVEGADOR && 'sem Chrome/Edge nesta máquina' },
  async (t) => {
    const dir = await diretorioTemporario(t);
    const pericia = await montarPericia(dir);
    const msgs = [];
    const r = await gerar({
      pericia,
      pdf: true,
      saida: path.join(dir, 'saida'),
      assinatura: { pasta: path.join(dir, 'sem-chave') },
      registrar: (m) => msgs.push(m),
    });
    assert.equal(r.pdf.assinado, false);
    assert.ok(msgs.some((m) => /^Aviso: chave de assinatura não encontrada/.test(m)));
    const pdf = path.join(dir, 'saida', 'relatorio.pdf');
    const hash = createHash('sha256').update(await readFile(pdf)).digest('hex');
    assert.equal(await readFile(`${pdf}.sha256`, 'utf8'), `${hash}  relatorio.pdf\n`);
    assert.doesNotMatch(await readFile(r.htmlAbs, 'utf8'), /assinado digitalmente/);
  },
);

test(
  'PDF assinado dentro do arquivo (PAdES), conferido, com certificado público copiado e .sha256',
  { skip: (!NAVEGADOR && 'sem Chrome/Edge') || (!TEM_PYHANKO && 'sem python -m pyhanko') || (!OPENSSL && 'sem OpenSSL') },
  async (t) => {
    const dir = await diretorioTemporario(t);
    const pasta = await chaveTemporaria(dir);
    const pericia = await montarPericia(dir);
    const certificadoPublico = path.join(dir, 'publico', 'certificado-assinatura.pem');
    const msgs = [];
    const r = await gerar({
      pericia,
      pdf: true,
      saida: path.join(dir, 'saida'),
      assinatura: { pasta, certificadoPublico },
      registrar: (m) => msgs.push(m),
    });
    assert.equal(r.pdf.assinado, true);
    const pdf = path.join(dir, 'saida', 'relatorio.pdf');
    assert.ok(!existsSync(`${pdf}.assinando.pdf`));
    // certificado público copiado; a chave não sai da pasta nem aparece nas mensagens
    assert.ok((await readFile(certificadoPublico)).equals(await readFile(path.join(pasta, 'certificado.pem'))));
    assert.ok(msgs.every((m) => !/PRIVATE KEY|chave\.pem/.test(m)));
    assert.ok(msgs.some((m) => /^Assinatura: PDF assinado e conferido \(certificado SHA-256 [0-9A-F:]{95}\)$/.test(m)));
    // linha da capa para o leitor
    const { impressao } = dadosDoCertificado(await readFile(certificadoPublico, 'utf8'));
    const doc = await readFile(r.htmlAbs, 'utf8');
    assert.ok(
      doc.includes(
        `Documento assinado digitalmente por Teste do relatorio. Impressão digital do certificado <span class="inteiro">(SHA-256):</span> <span class="digital">${impressao}</span>.`,
      ),
    );
    assert.match(doc, /não é de uma autoridade certificadora reconhecida[\s\S]*alterado depois de assinado/);
    // .sha256 do arquivo assinado
    const bytes = await readFile(pdf);
    assert.equal(await readFile(`${pdf}.sha256`, 'utf8'), `${createHash('sha256').update(bytes).digest('hex')}  relatorio.pdf\n`);
    assert.match(bytes.toString('latin1'), /\/ByteRange/);
    // a mesma conferência que o leitor faz
    assert.equal(validarAssinatura(pdf, certificadoPublico, PYTHON).ok, true);
    // um byte trocado no meio do arquivo: a assinatura deixa de conferir
    const adulterado = Buffer.from(bytes);
    adulterado[Math.floor(adulterado.length / 3)] ^= 0xff;
    const pdfAdulterado = path.join(dir, 'adulterado.pdf');
    await writeFile(pdfAdulterado, adulterado);
    assert.equal(validarAssinatura(pdfAdulterado, certificadoPublico, PYTHON).ok, false);
  },
);

test('README sem o parágrafo "Registro de evidências" também é aceito', async (t) => {
  const dir = await diretorioTemporario(t);
  const readme = README_FIXO.replace('**Registro de evidências:** o livro de registro do processo.\n\n', '');
  assert.notEqual(readme, README_FIXO);
  const pericia = await montarPericia(dir, { readme });
  const r = await gerar({ pericia, saida: path.join(dir, 'saida'), registrar: semRegistro });
  assert.match(await readFile(r.htmlAbs, 'utf8'), /<section class="anexo" id="anexo-a">/);
});

// ------------------------------------------------------------------ anexos do tema (planilhas embutidas no PDF)

const TEM_FITZ = spawnSync(PYTHON, ['-c', 'import fitz'], { encoding: 'utf8' }).status === 0;

/** Anexos embutidos num PDF: { nome: conteúdo } (via PyMuPDF). */
function lerAnexosPdf(pdf) {
  const r = spawnSync(
    PYTHON,
    ['-c', 'import sys, json, fitz\nd = fitz.open(sys.argv[1])\nprint(json.dumps({n: d.embfile_get(n).decode("utf-8") for n in d.embfile_names()} | {"__toc": len(d.get_toc())}))', pdf],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test(
  'tema com pasta de anexos: planilha embutida no PDF antes da assinatura, que cobre o arquivo inteiro',
  {
    skip:
      (!NAVEGADOR && 'sem Chrome/Edge') ||
      (!TEM_PYHANKO && 'sem python -m pyhanko') ||
      (!TEM_FITZ && 'sem PyMuPDF') ||
      (!OPENSSL && 'sem OpenSSL'),
  },
  async (t) => {
    const dir = await diretorioTemporario(t);
    const pasta = await chaveTemporaria(dir);
    const arquivo = await montarTema(dir, TEMA);
    const anexos = path.join(path.dirname(arquivo), 'certificado-exemplo', 'anexos');
    await mkdir(anexos, { recursive: true });
    const csv = '﻿UF;Município;Seção\r\nSP;SÃO PAULO;0024\r\n';
    await writeFile(path.join(anexos, 'urnas-exemplo.csv'), csv);
    const certificadoPublico = path.join(dir, 'publico.pem');
    const msgs = [];
    const r = await gerarTema({
      arquivo,
      pdf: true,
      saida: path.join(dir, 'saida'),
      assinatura: { pasta, certificadoPublico },
      registrar: (m) => msgs.push(m),
    });
    const pdf = path.join(dir, 'saida', 'certificado-exemplo.pdf');
    assert.deepEqual(r.pdf.anexos, ['urnas-exemplo.csv']);
    assert.equal(r.pdf.assinado, true);
    assert.ok(msgs.includes('Anexos embutidos no PDF: urnas-exemplo.csv'));
    // o anexo está no PDF, igual ao arquivo, e o PDF continua com marcadores
    const lidos = lerAnexosPdf(pdf);
    assert.equal(lidos['urnas-exemplo.csv'], csv);
    assert.ok(lidos.__toc > 0);
    // assinatura depois dos anexos: cobre o arquivo inteiro
    const v = validarAssinatura(pdf, certificadoPublico, PYTHON);
    assert.equal(v.ok, true, v.saida);
    assert.match(v.saida, /The signature covers the entire file/);
    // capa: nome do anexo e onde abrir, sem caminho
    const doc = await readFile(r.htmlAbs, 'utf8');
    assert.match(doc, /<dt>Anexos<\/dt><dd><span class="digital">urnas-exemplo\.csv<\/span>\.<span class="capa-nota">[^<]*painel de anexos/);
    assert.doesNotMatch(doc, /certificado-exemplo\/anexos|temas\//);
  },
);

test('tema sem pasta de anexos: nada muda', async (t) => {
  const dir = await diretorioTemporario(t);
  const arquivo = await montarTema(dir, TEMA);
  const r = await gerarTema({ arquivo, saida: path.join(dir, 'saida'), registrar: semRegistro });
  assert.doesNotMatch(await readFile(r.htmlAbs, 'utf8'), /<dt>Anexos<\/dt>/);
});

test('planilha das urnas da AC URNA: formato das células e conferências', () => {
  assert.equal(serieHex('2cfa0b'), '2C FA 0B');
  assert.equal(serieHex('12e345'), '12 E3 45'); // o Excel leria "12e345" como número
  assert.equal(serieHex('34aea'), '03 4A EA');
  assert.equal(dataBr('2026-07-18T21:59:57Z'), '18/07/2026');
  assert.equal(dataBr('2026-07-19T01:00:00Z'), '18/07/2026'); // horário de Brasília
  const fim = Date.parse('2026-07-18T21:59:57Z');
  const o = {
    uf: 'sp', mun: '71072', zona: '0254', secao: '0024', modelo: 'ue2013', numeroInternoUrna: 1682534,
    serie: '34aea5', nb: { iso: '2026-07-20T18:25:51Z' }, na: { iso: '2037-12-31T23:00:00Z' },
  };
  assert.equal(linhaCsv(o, 'SÃO PAULO', fim), 'SP;71072;SÃO PAULO;0254;0024;2013;1682534;34 AE A5;20/07/2026;31/12/2037;sim');
  assert.match(linhaCsv({ ...o, nb: { iso: '2016-06-28T11:05:47Z' } }, 'A;B', fim), /^SP;71072;"A;B";.*;não$/);
  assert.equal(CABECALHO.length, 11);
  const linhas = [linhaCsv(o, 'SÃO PAULO', fim), linhaCsv({ ...o, secao: '0025', nb: { iso: '2016-01-01T00:00:00Z' } }, 'SÃO PAULO', fim)];
  const tardias = new Set(['sp/71072/0254/0024']);
  assert.deepEqual(conferirPlanilha({ linhas, esperado: { secoes: 2, tardias: 1 }, tardiasRevisao: tardias, chavesTardias: tardias }), []);
  const falhas = conferirPlanilha({
    linhas: [...linhas, 'SP;71072;X;0001;0001;2015;12345678901;AA;01/01/2016;01/01/2030;não'],
    esperado: { secoes: 2, tardias: 1 },
    tardiasRevisao: tardias,
    chavesTardias: new Set(['sp/71072/0254/0099']),
  });
  assert.equal(falhas.length, 3);
  assert.match(falhas.join('\n'), /3 seções na planilha; o esperado é 2/);
  assert.match(falhas.join('\n'), /faltam \[sp\/71072\/0254\/0024\] sobram \[sp\/71072\/0254\/0099\]/);
  assert.match(falhas.join('\n'), /formato de título de eleitor ou CPF/);
  assert.equal(RE_DOCUMENTO.test('1682534'), false);
  assert.equal(RE_DOCUMENTO.test('123.456.789-00'), true); // só o formato (dígito verificador inválido)
});
