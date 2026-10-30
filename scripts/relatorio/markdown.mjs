// Conversor markdown → HTML sem dependências, para o relatório de perícia.
//
// Cobre o subconjunto usado em docs/pericia: títulos ATX, parágrafos, listas
// (com marcador e numeradas, aninhadas, com tarefa [x]), tabelas com alinhamento,
// citações e alertas `> [!WARNING]`, código em bloco e em linha, negrito, itálico,
// ~~riscado~~, links, imagens e réguas. HTML cru no texto é sempre escapado.
//
// Os pontos de extensão (titulo, link, imagem, figura, rotulo) deixam o gerador
// mudar a apresentação sem tocar no texto.

const PONTUACAO_ASCII = /[!-/:-@[-`{-~]/;
const ESPACO = /\s/u;
const PONTUACAO = /[\p{P}\p{S}]/u;
const ROTULOS = ['Fato', 'Hipótese', 'Pendente', 'Recomendação'];
const RE_ROTULO = new RegExp(`^(${ROTULOS.join('|')})(?![\\p{L}\\p{N}])`, 'u');
const ALERTAS = { NOTE: 'Nota', TIP: 'Dica', IMPORTANT: 'Importante', WARNING: 'Atenção', CAUTION: 'Cuidado' };

const RE_CERCA = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const RE_ATX = /^ {0,3}(#{1,6})(?=[ \t]|$)(.*)$/;
const RE_REGUA = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const RE_CITACAO = /^ {0,3}> ?/;
const RE_ITEM = /^( {0,3})([-+*]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/;
const RE_DELIMITADOR = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const RE_ALERTA = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/i;

export function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Âncora no padrão do GitHub: minúsculas, sem pontuação, espaço vira hífen. */
export function slug(texto) {
  return texto
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-');
}

const vazia = (l) => /^[ \t]*$/.test(l);
const recuo = (l) => l.match(/^ */)[0].length;
const expandirTabs = (l) => (l.includes('\t') ? l.replace(/^\t+/, (t) => '    '.repeat(t.length)) : l);

function lerAtx(l) {
  const m = RE_ATX.exec(l);
  if (!m) return null;
  const texto = m[2].trim().replace(/[ \t]+#+$/, '').replace(/^#+$/, '');
  return { nivel: m[1].length, texto };
}

function lerCerca(l) {
  const m = RE_CERCA.exec(l);
  if (!m) return null;
  if (m[2][0] === '`' && m[3].includes('`')) return null;
  return { recuo: m[1].length, cerca: m[2], info: m[3].trim() };
}

function lerItem(l) {
  const m = RE_ITEM.exec(l);
  if (!m) return null;
  const marcador = m[2];
  const ordenada = /\d/.test(marcador);
  const espacos = m[3] ? m[3].length : 0;
  const resto = m[4] ?? '';
  const largura = m[1].length + marcador.length;
  let conteudo;
  let inicio;
  if (resto === '') {
    conteudo = largura + 1;
    inicio = '';
  } else if (espacos > 4) {
    conteudo = largura + 1;
    inicio = ' '.repeat(espacos - 1) + resto;
  } else {
    conteudo = largura + espacos;
    inicio = resto;
  }
  return {
    ordenada,
    delim: ordenada ? marcador.slice(-1) : marcador,
    numero: ordenada ? Number.parseInt(marcador, 10) : null,
    conteudo,
    inicio,
    vazio: resto === '',
  };
}

function dividirCelulas(linha) {
  let s = linha.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const celulas = [];
  let atual = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') {
      atual += '|';
      i++;
    } else if (s[i] === '|') {
      celulas.push(atual.trim());
      atual = '';
    } else {
      atual += s[i];
    }
  }
  celulas.push(atual.trim());
  return celulas;
}

function inicioDeTabela(linhas, i) {
  const cab = linhas[i];
  const del = linhas[i + 1];
  if (del === undefined || !cab.includes('|') || !RE_DELIMITADOR.test(del) || !del.includes('|')) return null;
  const colunas = dividirCelulas(cab);
  const alinhamentos = dividirCelulas(del).map((c) => {
    const esq = c.startsWith(':');
    const dir = c.endsWith(':');
    return esq && dir ? 'c' : dir ? 'd' : esq ? 'e' : '';
  });
  if (colunas.length !== alinhamentos.length) return null;
  return { colunas, alinhamentos };
}

/** Linha que começa outro bloco (interrompe parágrafo ou continuação preguiçosa). */
function interrompe(l) {
  if (lerAtx(l) || lerCerca(l) || RE_REGUA.test(l) || RE_CITACAO.test(l)) return true;
  const it = lerItem(l);
  if (it && !it.vazio && (!it.ordenada || it.numero === 1)) return true;
  return false;
}

/** Divide as linhas em blocos (árvore). */
export function lerBlocos(linhas) {
  const blocos = [];
  let i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    if (vazia(l)) {
      i++;
      continue;
    }
    const cerca = lerCerca(l);
    if (cerca) {
      const conteudo = [];
      i++;
      const fecho = new RegExp(`^ {0,3}${cerca.cerca[0] === '`' ? '`' : '~'}{${cerca.cerca.length},}[ \\t]*$`);
      while (i < linhas.length && !fecho.test(linhas[i])) {
        const r = Math.min(recuo(linhas[i]), cerca.recuo);
        conteudo.push(linhas[i].slice(r));
        i++;
      }
      i++;
      blocos.push({ tipo: 'codigo', info: cerca.info, texto: conteudo.join('\n') });
      continue;
    }
    const atx = lerAtx(l);
    if (atx) {
      blocos.push({ tipo: 'titulo', nivel: atx.nivel, texto: atx.texto });
      i++;
      continue;
    }
    if (RE_REGUA.test(l)) {
      blocos.push({ tipo: 'regua' });
      i++;
      continue;
    }
    if (RE_CITACAO.test(l)) {
      const interior = [];
      while (i < linhas.length) {
        const s = linhas[i];
        if (RE_CITACAO.test(s)) interior.push(s.replace(RE_CITACAO, ''));
        else if (!vazia(s) && interior.length && !vazia(interior.at(-1)) && !interrompe(s)) interior.push(s);
        else break;
        i++;
      }
      let alerta = null;
      const m = RE_ALERTA.exec((interior[0] ?? '').trim());
      if (m) {
        alerta = m[1].toUpperCase();
        interior.shift();
      }
      blocos.push({ tipo: 'citacao', alerta, filhos: lerBlocos(interior) });
      continue;
    }
    const tabela = inicioDeTabela(linhas, i);
    if (tabela) {
      const linhasTab = [];
      i += 2;
      while (i < linhas.length && !vazia(linhas[i]) && linhas[i].includes('|') && !interrompe(linhas[i])) {
        const c = dividirCelulas(linhas[i]);
        while (c.length < tabela.colunas.length) c.push('');
        linhasTab.push(c.slice(0, tabela.colunas.length));
        i++;
      }
      blocos.push({ tipo: 'tabela', cabecalho: tabela.colunas, alinhamentos: tabela.alinhamentos, linhas: linhasTab });
      continue;
    }
    const item = lerItem(l);
    if (item) {
      const lista = { tipo: 'lista', ordenada: item.ordenada, inicio: item.numero, itens: [], solta: false };
      while (i < linhas.length) {
        const it = lerItem(linhas[i]);
        if (!it || it.ordenada !== lista.ordenada || it.delim !== item.delim) break;
        const doItem = [it.inicio];
        i++;
        while (i < linhas.length) {
          const s = linhas[i];
          if (vazia(s)) {
            doItem.push('');
          } else if (recuo(s) >= it.conteudo) {
            doItem.push(s.slice(it.conteudo));
          } else if (!vazia(doItem.at(-1)) && !interrompe(s) && !lerItem(s) && !inicioDeTabela(linhas, i)) {
            doItem.push(s.trim()); // continuação preguiçosa do parágrafo
          } else {
            break;
          }
          i++;
        }
        let fimEmBranco = false;
        while (doItem.length && vazia(doItem.at(-1))) {
          doItem.pop();
          fimEmBranco = true;
        }
        if (doItem.some(vazia)) lista.solta = true;
        const filhos = lerBlocos(doItem);
        let tarefa = null;
        if (filhos[0]?.tipo === 'paragrafo') {
          const t = /^\[([ xX])\][ \t]+/.exec(filhos[0].texto);
          if (t) {
            tarefa = t[1] !== ' ';
            filhos[0].texto = filhos[0].texto.slice(t[0].length);
          }
        }
        lista.itens.push({ filhos, tarefa });
        const prox = i < linhas.length ? lerItem(linhas[i]) : null;
        if (fimEmBranco && prox && prox.ordenada === lista.ordenada && prox.delim === item.delim) lista.solta = true;
      }
      blocos.push(lista);
      continue;
    }
    const paragrafo = [l.trimStart()];
    i++;
    while (i < linhas.length && !vazia(linhas[i]) && !interrompe(linhas[i])) {
      paragrafo.push(linhas[i].trimStart());
      i++;
    }
    blocos.push({ tipo: 'paragrafo', texto: paragrafo.join('\n').replace(/[ \t]+$/, '') });
  }
  return blocos;
}

// ---------------------------------------------------------------- inline

function aspas(fonte, i, c) {
  const antes = i > 0 ? fonte[i - 1] : ' ';
  const abre = /[\s([{—–/]/u.test(antes);
  if (c === '"') return abre ? '“' : '”';
  if (/[\p{L}\p{N}]/u.test(antes)) return '’';
  return abre ? '‘' : '’';
}

/** Lê `[texto](destino "título")` a partir de fonte[i] === '['. */
function lerLink(fonte, i) {
  let prof = 0;
  let j = i;
  for (; j < fonte.length; j++) {
    const c = fonte[j];
    if (c === '\\') {
      j++;
      continue;
    }
    if (c === '`') {
      const run = fonte.slice(j).match(/^`+/)[0];
      const fim = fonte.indexOf(run, j + run.length);
      if (fim > 0) j = fim + run.length - 1;
      continue;
    }
    if (c === '[') prof++;
    else if (c === ']' && --prof === 0) break;
  }
  if (j >= fonte.length || fonte[j + 1] !== '(') return null;
  const texto = fonte.slice(i + 1, j);
  let k = j + 2;
  while (fonte[k] === ' ' || fonte[k] === '\n') k++;
  let destino = '';
  if (fonte[k] === '<') {
    const fim = fonte.indexOf('>', k);
    if (fim < 0) return null;
    destino = fonte.slice(k + 1, fim);
    k = fim + 1;
  } else {
    let par = 0;
    while (k < fonte.length && !/\s/.test(fonte[k])) {
      if (fonte[k] === '\\' && PONTUACAO_ASCII.test(fonte[k + 1] ?? '')) {
        destino += fonte[k + 1];
        k += 2;
        continue;
      }
      if (fonte[k] === '(') par++;
      if (fonte[k] === ')') {
        if (par === 0) break;
        par--;
      }
      destino += fonte[k++];
    }
  }
  while (fonte[k] === ' ' || fonte[k] === '\n') k++;
  let titulo = null;
  if (fonte[k] === '"' || fonte[k] === "'") {
    const fim = fonte.indexOf(fonte[k], k + 1);
    if (fim < 0) return null;
    titulo = fonte.slice(k + 1, fim);
    k = fim + 1;
    while (fonte[k] === ' ') k++;
  }
  if (fonte[k] !== ')') return null;
  return { texto, destino, titulo, fim: k + 1 };
}

function noTexto(v) {
  return { t: 'txt', v, plano: v };
}

function renderNos(nos, ctx) {
  let html = '';
  for (const n of nos) {
    if (n.t === 'txt') html += escaparHtml(n.v);
    else if (n.t === 'del') html += escaparHtml(n.c.repeat(n.n));
    else html += n.v;
  }
  return html;
}

function planoNos(nos) {
  return nos.map((n) => (n.t === 'del' ? n.c.repeat(n.n) : n.plano)).join('');
}

function processarEnfase(nos, ctx) {
  for (let k = 0; k < nos.length; k++) {
    const fecha = nos[k];
    if (fecha.t !== 'del' || !fecha.fecha || fecha.n === 0) continue;
    let achou = -1;
    for (let j = k - 1; j >= 0; j--) {
      const abre = nos[j];
      if (abre.t !== 'del' || !abre.abre || abre.c !== fecha.c || abre.n === 0) continue;
      if (abre.c === '~') {
        if (abre.n !== 2 || fecha.n !== 2) continue;
      } else if (
        (abre.fecha || fecha.abre) &&
        (abre.orig + fecha.orig) % 3 === 0 &&
        !(abre.orig % 3 === 0 && fecha.orig % 3 === 0)
      ) {
        continue;
      }
      achou = j;
      break;
    }
    if (achou < 0) continue;
    const abre = nos[achou];
    const usa = abre.c === '~' ? 2 : abre.n >= 2 && fecha.n >= 2 ? 2 : 1;
    const tag = abre.c === '~' ? 'del' : usa === 2 ? 'strong' : 'em';
    const interior = nos.slice(achou + 1, k);
    const plano = planoNos(interior);
    let html = renderNos(interior, ctx);
    let rotulo = null;
    let classe = '';
    if (tag === 'strong') {
      const m = RE_ROTULO.exec(plano);
      if (m && interior[0]?.t === 'txt' && interior[0].v.startsWith(m[1])) {
        rotulo = m[1];
        html = ctx.rotulo(m[1]) + renderNos([noTexto(interior[0].v.slice(m[1].length)), ...interior.slice(1)], ctx);
        classe = ' class="com-rotulo"';
      }
    }
    abre.n -= usa;
    fecha.n -= usa;
    nos.splice(achou + 1, k - achou - 1, { t: 'html', v: `<${tag}${classe}>${html}</${tag}>`, plano, rotulo });
    k = achou + 1;
  }
}

function flanco(antes, depois) {
  const espAntes = ESPACO.test(antes);
  const espDepois = ESPACO.test(depois);
  const pontAntes = PONTUACAO.test(antes);
  const pontDepois = PONTUACAO.test(depois);
  const esquerda = !espDepois && (!pontDepois || espAntes || pontAntes);
  const direita = !espAntes && (!pontAntes || espDepois || pontDepois);
  return { esquerda, direita, pontAntes, pontDepois };
}

/** Converte o texto de um bloco em nós inline. */
function lerInline(fonte, ctx) {
  const nos = [];
  let buf = '';
  const descarregar = () => {
    if (buf) nos.push(noTexto(buf));
    buf = '';
  };
  let i = 0;
  while (i < fonte.length) {
    const c = fonte[i];
    if (c === '\\') {
      const p = fonte[i + 1];
      if (p === '\n') {
        descarregar();
        nos.push({ t: 'html', v: '<br>\n', plano: '\n' });
        i += 2;
        continue;
      }
      if (p !== undefined && PONTUACAO_ASCII.test(p)) {
        buf += p;
        i += 2;
        continue;
      }
    }
    if (c === '`') {
      const run = fonte.slice(i).match(/^`+/)[0];
      let fim = -1;
      for (let j = i + run.length; j < fonte.length; ) {
        const prox = fonte.indexOf(run, j);
        if (prox < 0) break;
        if (fonte[prox + run.length] !== '`' && fonte[prox - 1] !== '`') {
          fim = prox;
          break;
        }
        j = prox + fonte.slice(prox).match(/^`+/)[0].length;
      }
      if (fim < 0) {
        buf += run;
        i += run.length;
        continue;
      }
      let codigo = fonte.slice(i + run.length, fim).replace(/\n/g, ' ');
      if (/^ .*[^ ].* $/.test(codigo)) codigo = codigo.slice(1, -1);
      descarregar();
      // <wbr>: caminhos longos quebram nos separadores, não no meio de um nome
      const quebravel = escaparHtml(codigo).replace(/([/._-])(?=\S)/g, '$1<wbr>');
      nos.push({ t: 'html', v: `<code>${quebravel}</code>`, plano: codigo });
      i = fim + run.length;
      continue;
    }
    if ((c === '!' && fonte[i + 1] === '[') || c === '[') {
      const ini = c === '!' ? i + 1 : i;
      const r = lerLink(fonte, ini);
      if (r) {
        descarregar();
        if (c === '!') {
          nos.push({ t: 'html', v: ctx.imagem({ src: r.destino, alt: r.texto, titulo: r.titulo, bloco: false }), plano: '', imagem: true });
        } else {
          const interior = lerInline(r.texto, ctx);
          // o gancho devolve o destino (texto ou null) ou { href, depois }, com HTML gerado para depois do link
          const resolvido = ctx.link(r.destino, interior.plano);
          const destino = resolvido !== null && typeof resolvido === 'object' ? resolvido.href : resolvido;
          const depois = resolvido !== null && typeof resolvido === 'object' ? resolvido.depois ?? '' : '';
          const v =
            (destino == null
              ? `<span class="link-sem-destino">${interior.html}</span>`
              : `<a href="${escaparHtml(destino)}"${r.titulo ? ` title="${escaparHtml(r.titulo)}"` : ''}>${interior.html}</a>`) + depois;
          nos.push({ t: 'html', v, plano: interior.plano });
        }
        i = r.fim;
        continue;
      }
    }
    if (c === '<') {
      const m = /^<(https?:\/\/[^\s<>]+|mailto:[^\s<>]+)>/.exec(fonte.slice(i));
      if (m) {
        descarregar();
        const destino = ctx.link(m[1]) ?? m[1];
        nos.push({ t: 'html', v: `<a href="${escaparHtml(destino)}">${escaparHtml(m[1])}</a>`, plano: m[1] });
        i += m[0].length;
        continue;
      }
    }
    if (c === '*' || c === '_' || c === '~') {
      const run = fonte.slice(i).match(c === '*' ? /^\*+/ : c === '_' ? /^_+/ : /^~+/)[0];
      const antes = i > 0 ? fonte[i - 1] : ' ';
      const depois = fonte[i + run.length] ?? ' ';
      const f = flanco(antes, depois);
      let abre = f.esquerda;
      let fecha = f.direita;
      if (c === '_') {
        abre = f.esquerda && (!f.direita || f.pontAntes);
        fecha = f.direita && (!f.esquerda || f.pontDepois);
      }
      descarregar();
      nos.push({ t: 'del', c, n: run.length, orig: run.length, abre, fecha });
      i += run.length;
      continue;
    }
    if (c === '\n') {
      if (/ {2,}$/.test(buf)) {
        buf = buf.replace(/ +$/, '');
        descarregar();
        nos.push({ t: 'html', v: '<br>\n', plano: '\n' });
      } else {
        buf = buf.replace(/ +$/, '') + '\n';
      }
      i++;
      while (fonte[i] === ' ') i++;
      continue;
    }
    if ((c === '"' || c === "'") && ctx.tipografia) {
      buf += aspas(fonte, i, c);
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  descarregar();
  processarEnfase(nos, ctx);
  const primeiro = nos.find((n) => !(n.t === 'txt' && n.v.trim() === '') && !(n.t === 'del' && n.n === 0));
  return {
    html: renderNos(nos, ctx),
    plano: planoNos(nos),
    rotulo: primeiro?.t === 'html' ? primeiro.rotulo ?? null : null,
  };
}

// ---------------------------------------------------------------- render

function classeRotulo(rotulo) {
  return rotulo ? ` class="com-rotulo rotulo-${slug(rotulo)}"` : '';
}

function renderBlocos(blocos, ctx, apertado = false) {
  let html = '';
  for (const b of blocos) html += renderBloco(b, ctx, apertado);
  return html;
}

const RE_SO_IMAGEM = /^!\[((?:[^\]\\]|\\.)*)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)$/;

function renderParagrafo(b, ctx, apertado) {
  const m = RE_SO_IMAGEM.exec(b.texto.trim());
  if (m) return { html: ctx.figura({ src: m[2], alt: m[1], titulo: m[3] ?? null }) + '\n', rotulo: null };
  const r = lerInline(b.texto, ctx);
  if (apertado) return { html: r.html, rotulo: r.rotulo };
  return { html: `<p${classeRotulo(r.rotulo)}>${r.html}</p>\n`, rotulo: r.rotulo };
}

function renderBloco(b, ctx, apertado) {
  switch (b.tipo) {
    case 'titulo': {
      const r = lerInline(b.texto, ctx);
      let id = ctx.prefixoId + slug(r.plano);
      const base = id;
      for (let n = 1; ctx.ids.has(id); n++) id = `${base}-${n}`;
      ctx.ids.add(id);
      const info = { nivel: b.nivel, html: r.html, plano: r.plano, id };
      ctx.titulos.push(info);
      return ctx.titulo(info) + '\n';
    }
    case 'paragrafo':
      return renderParagrafo(b, ctx, apertado).html;
    case 'codigo': {
      const lang = b.info ? ` class="lang-${escaparHtml(b.info.split(/\s+/)[0])}"` : '';
      const linhas = b.texto.split('\n').map((l) => `<span class="linha">${l === '' ? ' ' : escaparHtml(l)}</span>`);
      return `<pre><code${lang}>${linhas.join('')}</code></pre>\n`;
    }
    case 'regua':
      return '<hr>\n';
    case 'citacao': {
      if (b.alerta) {
        const tit = `<p class="alerta-titulo" data-ger>${ALERTAS[b.alerta]}</p>`;
        return `<aside class="alerta alerta-${b.alerta.toLowerCase()}" role="note">${tit}\n${renderBlocos(b.filhos, ctx)}</aside>\n`;
      }
      return `<blockquote>\n${renderBlocos(b.filhos, ctx)}</blockquote>\n`;
    }
    case 'tabela': {
      const al = (k) => (b.alinhamentos[k] ? ` class="${b.alinhamentos[k]}"` : '');
      const n = b.cabecalho.length;
      const maior = Math.max(...b.linhas.flat().map((c) => c.length), ...b.cabecalho.map((c) => c.length));
      const classes = ['tabela', `cols-${Math.min(n, 7)}`];
      if (maior > 60 || n >= 5) classes.push('texto');
      if (maior > 600) classes.push('longa');
      let html = `<table class="${classes.join(' ')}">\n<thead><tr>`;
      b.cabecalho.forEach((c, k) => {
        html += `<th${al(k)}>${lerInline(c, ctx).html}</th>`;
      });
      html += '</tr></thead>\n<tbody>\n';
      for (const linha of b.linhas) {
        html += '<tr>';
        linha.forEach((c, k) => {
          html += `<td${al(k)}>${lerInline(c, ctx).html}</td>`;
        });
        html += '</tr>\n';
      }
      return `${html}</tbody>\n</table>\n`;
    }
    case 'lista': {
      const tag = b.ordenada ? 'ol' : 'ul';
      const inicio = b.ordenada && b.inicio !== 1 ? ` start="${b.inicio}"` : '';
      const tarefas = b.itens.some((it) => it.tarefa !== null);
      let html = `<${tag}${inicio}${tarefas ? ' class="tarefas"' : ''}>\n`;
      for (const it of b.itens) {
        let rot = null;
        let corpo = '';
        let resto = it.filhos;
        if (it.filhos[0]?.tipo === 'paragrafo') {
          const p = renderParagrafo(it.filhos[0], ctx, !b.solta);
          rot = p.rotulo;
          corpo = p.html;
          resto = it.filhos.slice(1);
        }
        corpo += renderBlocos(resto, ctx, !b.solta);
        const caixa =
          it.tarefa === null
            ? ''
            : `<span class="caixa${it.tarefa ? ' feita' : ''}" role="img" aria-label="${it.tarefa ? 'feito' : 'a fazer'}"></span>`;
        html += `<li${classeRotulo(rot)}>${caixa}${corpo}</li>\n`;
      }
      return `${html}</${tag}>\n`;
    }
    default:
      throw new Error(`bloco desconhecido: ${b.tipo}`);
  }
}

const PADRAO = {
  prefixoId: '',
  tipografia: true,
  titulo: ({ nivel, html, id }) => `<h${nivel} id="${escaparHtml(id)}">${html}</h${nivel}>`,
  link: (destino) => destino,
  imagem: ({ src, alt }) => `<img src="${escaparHtml(src)}" alt="${escaparHtml(alt)}" data-imagem>`,
  figura: null,
  rotulo: (palavra) => `<span class="rotulo">${escaparHtml(palavra)}</span>`,
};

/**
 * Converte markdown em HTML.
 * @param {string} md
 * @param {object} [opcoes] prefixoId, tipografia, ids (Set compartilhado),
 *   titulo(info), link(destino) → string|null, imagem({src,alt}), figura({src,alt}), rotulo(palavra)
 * @returns {{html: string, titulos: Array<{nivel:number, html:string, plano:string, id:string}>}}
 */
export function converter(md, opcoes = {}) {
  const ctx = { ...PADRAO, ...opcoes, titulos: [], ids: opcoes.ids ?? new Set() };
  ctx.figura ??= (img) => `<figure>${ctx.imagem({ ...img, bloco: true })}</figure>`;
  const linhas = md.replace(/\r\n?/g, '\n').split('\n').map(expandirTabs);
  const html = renderBlocos(lerBlocos(linhas), ctx);
  return { html, titulos: ctx.titulos };
}

// ---------------------------------------------------------------- conferência

const RE_LINHA_CERCA = /^\s*(?:[-+*]\s+|\d+[.)]\s+)?(```|~~~)/;

/** Conta a estrutura do markdown (fora de blocos de código). */
export function contarMarkdown(md) {
  const c = { titulos: 0, tabelas: 0, imagens: 0, rotulos: 0, codigos: 0 };
  const linhas = md.replace(/\r\n?/g, '\n').split('\n');
  let cerca = false;
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (RE_LINHA_CERCA.test(l)) {
      cerca = !cerca;
      if (cerca) c.codigos++;
      continue;
    }
    if (cerca) continue;
    if (lerAtx(l)) c.titulos++;
    if (i > 0 && linhas[i - 1].includes('|') && RE_DELIMITADOR.test(l.trim()) && l.includes('|')) c.tabelas++;
    c.imagens += (l.match(/!\[[^\]]*\]\([^)]*\)/g) ?? []).length;
    c.rotulos += (l.match(new RegExp(`\\*\\*(${ROTULOS.join('|')})(?![\\p{L}\\p{N}])`, 'gu')) ?? []).length;
  }
  return c;
}

/** Conta a mesma estrutura no HTML gerado. */
export function contarHtml(html) {
  return {
    titulos: (html.match(/<h[1-6][\s>]/g) ?? []).length,
    tabelas: (html.match(/<table[\s>]/g) ?? []).length,
    imagens: (html.match(/\bdata-imagem\b/g) ?? []).length,
    rotulos: (html.match(/class="rotulo[\s"]/g) ?? []).length,
    codigos: (html.match(/<pre[\s>]/g) ?? []).length,
  };
}

function contarPalavras(texto) {
  const m = new Map();
  for (const p of texto.normalize('NFC').match(/[\p{L}\p{N}]+/gu) ?? []) m.set(p, (m.get(p) ?? 0) + 1);
  return m;
}

/** Palavras do texto do markdown (sem destinos de link, imagens, marcadores de lista e de alerta). */
export function palavrasMarkdown(md) {
  const linhas = md.replace(/\r\n?/g, '\n').split('\n');
  const saida = [];
  let cerca = false;
  for (const l of linhas) {
    if (RE_LINHA_CERCA.test(l)) {
      cerca = !cerca;
      continue;
    }
    if (cerca) {
      saida.push(l);
      continue;
    }
    saida.push(
      l
        .replace(/^\s*>\s*\[!\w+\]\s*$/, '')
        .replace(/^(\s*(?:>\s*)?)(?:[-+*]|\d+[.)])(\s+)(?:\[[ xX]\]\s)?/, '$1$2'),
    );
  }
  const texto = saida
    .join('\n')
    .replace(/!\[(?:[^\]\\]|\\.)*\]\([^)]*\)/g, ' ')
    .replace(/\]\((?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?\)/g, ']');
  return contarPalavras(texto);
}

/** Palavras visíveis do HTML, sem SVG e sem o que o gerador acrescentou (data-ger). */
export function palavrasHtml(html) {
  const texto = html
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<(\w+)[^>]*\sdata-ger\b[^>]*>[^<]*<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
  return contarPalavras(texto);
}

/** Diferença entre dois mapas de palavras: o que falta em `b` e o que sobra. */
export function diferencaPalavras(a, b) {
  const faltam = [];
  const sobram = [];
  for (const [p, n] of a) if ((b.get(p) ?? 0) < n) faltam.push(`${p}×${n - (b.get(p) ?? 0)}`);
  for (const [p, n] of b) if ((a.get(p) ?? 0) < n) sobram.push(`${p}×${n - (a.get(p) ?? 0)}`);
  return { faltam, sobram };
}
