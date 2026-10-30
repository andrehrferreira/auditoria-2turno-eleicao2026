import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  baseGithub,
  embutirSvg,
  escoparCss,
  gerar,
  localizarNavegador,
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

test('endereço do GitHub a partir do remoto', () => {
  assert.equal(baseGithub('git@github.com:fulano/repo.git'), 'https://github.com/fulano/repo');
  assert.equal(baseGithub('https://github.com/fulano/repo'), 'https://github.com/fulano/repo');
  assert.equal(baseGithub('https://gitlab.com/x/y.git'), null);
});

test('navegador: variável RELATORIO_NAVEGADOR tem prioridade; nada achado devolve null', async (t) => {
  const dir = await diretorioTemporario(t);
  const falso = path.join(dir, 'meu-chrome');
  await import('node:fs/promises').then((fs) => fs.writeFile(falso, ''));
  assert.equal(localizarNavegador({ RELATORIO_NAVEGADOR: falso, PATH: '' }, 'linux'), falso);
  assert.equal(localizarNavegador({ PATH: dir }, 'linux'), null);
});

test('gera o relatório HTML completo e autocontido a partir de docs/pericia', async (t) => {
  const dir = await diretorioTemporario(t);
  const r = await gerar({ saida: dir, registrar: () => {} });
  const doc = await readFile(r.htmlAbs, 'utf8');
  assert.match(doc, /^<!doctype html>\n<html lang="pt-BR">/);
  assert.match(doc, /<h1 class="capa-titulo">Relatório de perícia<\/h1>/);
  assert.match(doc, /<nav class="sumario"/);
  for (let n = 0; n <= 10; n++) assert.match(doc, new RegExp(`<section class="topico" id="t${String(n).padStart(2, '0')}">`));
  assert.match(doc, /id="anexo-a"[\s\S]*Glossário[\s\S]*id="anexo-b"/);
  assert.match(doc, /@page p-t05\{@top-right\{content:"5 · /);
  // nada externo: sem <script>, sem <link>, imagens embutidas
  assert.doesNotMatch(doc, /<script|<link |<img src="(?!data:)/);
  // links entre tópicos viram âncoras internas
  assert.match(doc, /href="#t01"/);
  assert.equal(r.total.imagens, (doc.match(/<figure class="grafico"/g) ?? []).length);
});
