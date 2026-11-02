// Cético 56: conferência no bruto de seções da H04 (boots de votação sem a etapa "/dsk/fe/estatico/<seção>-lo.vsc").
// Para cada texto de log da seção, lista os boots do dia (abertos em "Início das operações do logd") com: nº de etapas,
// se tem a etapa da MV ("/dsk/fe/estatico/...-lo.vsc"), se houve "Contingência de MV executada com sucesso", se ficou
// pronta para votos e quantos votos computou. Só contagens; nenhum número de pessoa.
// Uso: node scripts/auditoria/cetico-56-h04-casos.mjs --turno 2 ce/13218/0008/0003 sp/62197/0300/0020 ...
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS } from '../../src/config.js';
import { lerEntrada, listarEntradas } from '../../src/zip.js';

const { values: v, positionals } = parseArgs({ options: { turno: { type: 'string', default: '2' } }, allowPositionals: true });
const DIA = { 1: '04/10/2026', 2: '25/10/2026' }[v.turno];
const mem = (b) => ({ read: async (d, o, n, p) => ({ bytesRead: b.copy(d, o, p, p + n) }), stat: async () => ({ size: b.length }) });
async function textos(h, prof = 0) {
  const out = [];
  for (const e of await listarEntradas(h)) {
    const d = await lerEntrada(h, e);
    if (e.nome.endsWith('.dat')) out.push({ prof, t: d.toString('latin1') });
    else if (e.nome.endsWith('.jez') && prof < 4) out.push(...(await textos(mem(d), prof + 1)));
  }
  return out;
}
for (const s of positionals) {
  const dir = path.join(DIR_DADOS, 'raw', `${v.turno}t`, 'urnas', ...s.split('/'));
  for (const h of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const nomes = await readdir(path.join(dir, h));
    const log = nomes.find((x) => /-log(sa)?\.jez$/.test(x));
    for (const { prof, t } of await textos(mem(await readFile(path.join(dir, h, log))))) {
      const boots = [];
      let b = null;
      for (const l of t.split('\n')) {
        const c = l.replace(/\r$/, '').split('\t');
        if (c.length < 5 || !c[0].startsWith(DIA)) continue;
        const msg = c[4];
        if (c[3] === 'LOGD' && msg.startsWith('Início das operações do logd')) boots.push((b = { hora: c[0].slice(11), urna: c[2], et: 0, mv: false, cont: false, pronta: false, votos: 0, falha: 0 }));
        if (!b) continue;
        if (msg.startsWith('Verificação de assinatura - Etapa')) { b.et++; if (/\/dsk\/fe\/estatico\/[^\]]*-lo\.vsc/.test(msg)) b.mv = true; if (!msg.endsWith('[SUCESSO]')) b.falha++; }
        if (msg === 'Contingência de MV executada com sucesso') b.cont = true;
        if (msg.startsWith('Urna pronta para receber votos')) b.pronta = true;
        if (msg === 'O voto do eleitor foi computado') b.votos++;
      }
      const vot = boots.filter((x) => x.pronta || x.votos);
      console.log(`${v.turno}t ${s} prof ${prof}: boots de votação ${vot.length}; sem etapa da MV: ${vot.filter((x) => !x.mv).map((x) => `${x.hora} urna ${x.urna} etapas ${x.et} contingênciaMV ${x.cont ? 'sim' : 'NÃO'} falhas ${x.falha} votos ${x.votos}`).join('; ') || 'nenhum'}`);
    }
  }
}
