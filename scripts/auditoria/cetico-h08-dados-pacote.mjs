// Cético (H08, dados): descreve cada logd.dat de um pacote bruto: urnas, seções declaradas, votos computados no dia
// por urna e por seção declarada, primeira/última hora, e quantas linhas se repetem em outro texto do pacote.
// Uso: node scripts/auditoria/cetico-h08-dados-pacote.mjs uf/mun/zona/secao [...]
import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { DIR_DADOS } from '../../src/config.js';
import { acharArquivo } from '../../src/lacres.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';
import { abrirLeitura } from '../../src/banco-leitura.js';

const DIA = '25/10/2026';
const emMemoria = (b) => ({ read: async (d, o, t, p) => ({ bytesRead: b.copy(d, o, p, p + t) }), stat: async () => ({ size: b.length }) });
async function textos(h, pre = '', prof = 0) {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome === 'logd.dat') out.push({ nome: `${pre}logd.dat`, linhas: d.toString('latin1').split('\n').filter((l) => /^\d\d\/\d\d\/\d{4} /.test(l)) });
    else if (e.nome.endsWith('.jez') && prof < 3) out.push(...(await textos(emMemoria(d), `${pre}${e.nome}/`, prof + 1)));
  }
  return out;
}
const { db } = await abrirLeitura({ aoAvisar: (m) => { throw new Error(m); } });
for (const rel of process.argv.slice(2)) {
  const [uf, mun, zona, secao] = rel.split('/');
  const bu = db.prepare('select comparecimento, numero_interno_urna, tipo_urna, pacotes, abertura, encerramento from secao where turno=2 and uf=? and municipio=? and zona=? and secao=?').get(uf, mun, zona, secao);
  const agreg = db.prepare('select secao from secao_agregada where turno=2 and uf=? and municipio=? and zona=? and secao_principal=?').all(uf, mun, zona, secao).map((r) => r.secao);
  console.log(`\n### ${rel} BU: ${JSON.stringify(bu)} agregadas: ${agreg.join(',') || '-'}`);
  const dir = path.join(DIR_DADOS, 'raw', '2t', 'urnas', uf, mun, zona, secao);
  for (const hash of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const nomes = await readdir(path.join(dir, hash));
    const nl = acharArquivo(nomes, 'log');
    if (!nl) continue;
    const h = await open(path.join(dir, hash, nl));
    const ts = await textos(h); await h.close();
    const conta = new Map();
    for (const t of ts) for (const l of new Set(t.linhas)) conta.set(l, (conta.get(l) ?? 0) + 1);
    console.log(`pacote ${hash.slice(0, 16)}… ${ts.length} texto(s)`);
    for (const t of ts) {
      const dia = t.linhas.filter((l) => l.startsWith(DIA));
      const porUrna = {}, porSecao = {};
      let decl = null;
      for (const l of t.linhas) {
        const m = /\tSeção Eleitoral: (\d+)\t/.exec(l); if (m) decl = m[1];
        if (!l.startsWith(DIA) || (l.split('\t')[4] ?? '') !== 'O voto do eleitor foi computado') continue;
        const u = l.split('\t')[2]; porUrna[u] = (porUrna[u] ?? 0) + 1; porSecao[decl] = (porSecao[decl] ?? 0) + 1;
      }
      const decls = [...new Set(t.linhas.map((l) => /\tSeção Eleitoral: (\d+)\t/.exec(l)?.[1]).filter(Boolean))];
      const repetidas = t.linhas.filter((l) => conta.get(l) > 1).length;
      const cmp = dia.filter((l) => (l.split('\t')[4] ?? '') === 'O voto do eleitor foi computado');
      console.log(`  ${t.nome}: linhas=${t.linhas.length} noDia=${dia.length} urnas=${[...new Set(t.linhas.map((l) => l.split('\t')[2]))].join(' ')} secoesDeclaradas=${decls.join(',')} computadosDia=${cmp.length} porUrna=${JSON.stringify(porUrna)} porSecaoDeclarada=${JSON.stringify(porSecao)} linhasTambemEmOutroTexto=${repetidas} 1º/último voto=${cmp[0]?.slice(11, 19) ?? '-'}/${cmp.at(-1)?.slice(11, 19) ?? '-'}`);
    }
  }
}
