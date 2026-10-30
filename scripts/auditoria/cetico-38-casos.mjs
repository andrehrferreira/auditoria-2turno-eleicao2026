import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { abrirLeitura } from '../../src/banco-leitura.js';
import { DIR_DADOS } from '../../src/config.js';
import { linhasZip } from './seguranca-h27-lib.mjs';

// Parecer cético 38 (H27), parte 2: as seções cujo par urna × carga do BU não está na CESP da véspera (estrito), com
// a vida da urna nas CESP dos DOIS turnos (papel, município, carga, data da carga), e as reservas que usaram urna de
// contingência registrada para outra zona (mesmo município ou não).
// Entrada: data/parsed/auditoria/cetico-revisor/38/correspondencias-{1,2}t.json (cetico-38-correspondencias.mjs).
// Saída: data/parsed/auditoria/cetico-revisor/38/casos.json
// Uso: node --max-old-space-size=4000 scripts/auditoria/cetico-38-casos.mjs

const DIR = path.join(DIR_DADOS, 'parsed', 'auditoria', 'cetico-revisor', '38');
const z = (s) => String(s ?? '').replace(/^0+/, '');
const k4 = (uf, m, zn, s) => `${uf.toLowerCase()}/${String(m).padStart(5, '0')}/${String(zn).padStart(4, '0')}/${String(s).padStart(4, '0')}`;
const vida = new Map(); // urna -> [{t, versao, papel, mun, carga, dc}]
for (const t of [1, 2]) {
  const dir = path.join(DIR_DADOS, 'raw', 'dadosabertos', 'correspondencias', `2026-${t}t`);
  for (const n of (await readdir(dir)).filter((x) => x.startsWith('CESP_'))) {
    const versao = n.slice(-16, -4);
    for await (const r of linhasZip(path.join(dir, n))) {
      const u = Number(r.NR_URNA_ESPERADA);
      const papel = r._arquivo.startsWith('csec') ? `secao ${k4(r.SG_UF, r.CD_MUNICIPIO, r.NR_ZONA, r.NR_SECAO)}` : `cont ${r.SG_UF.toLowerCase()}/${String(r.CD_MUNICIPIO).padStart(5, '0')}/${String(r.NR_ZONA).padStart(4, '0')}`;
      (vida.get(u) ?? vida.set(u, []).get(u)).push({ t, versao, papel, carga: z(r.CD_CARGA_URNA_ESPERADA).slice(-6), dc: r.DT_CARGA_URNA_ESPERADA, maq: r.NM_MAQUINA_GERACAO_MIDIA });
    }
  }
}
const { db } = await abrirLeitura();
const pres = db.prepare(`SELECT numero, quantidade FROM voto_oficial WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ? AND cargo = 1`);
const outroT = db.prepare(`SELECT tipo_urna, numero_interno_urna u, codigo_carga c, data_hora_carga dc, comparecimento FROM secao WHERE turno = ? AND uf = ? AND municipio = ? AND zona = ? AND secao = ?`);
const S = {};
for (const t of [1, 2]) {
  const R = JSON.parse(await readFile(path.join(DIR, `correspondencias-${t}t.json`), 'utf8'));
  S[t] = { fora: [], reservaOutraZona: {} };
  for (const x of R.foraDaVespera) {
    const [uf, mun, zn, sec] = x.k.split('/');
    const v = (vida.get(x.urna) ?? []).map((e) => `${e.t}t ${e.versao} ${e.papel} carga …${e.carga} ${e.dc} ${e.maq}`);
    const o = outroT.get(3 - t, uf, mun, zn, sec);
    const este = outroT.get(t, uf, mun, zn, sec);
    const votos = Object.fromEntries(pres.all(t, uf, mun, zn, sec).map((r) => [r.numero, r.quantidade]));
    const votosOutro = Object.fromEntries(pres.all(3 - t, uf, mun, zn, sec).map((r) => [r.numero, r.quantidade]));
    S[t].fora.push({ ...x, vidaDaUrna: v, outroTurno: o ? { tipo: o.tipo_urna, mesmaUrna: Number(o.u) === x.urna, mesmaCarga: z(o.c) === z(este.c), dc: o.dc, comparecimento: o.comparecimento } : null, votos, votosOutro });
  }
  for (const y of R.parEmOutroLugar) {
    const ok = y.k.split('/');
    const v = (vida.get(y.urna) ?? []).filter((e) => e.t === t && e.papel.startsWith('cont')).map((e) => e.papel.split(' ')[1]);
    const mesmoMun = v.some((p) => p.split('/')[1] === ok[1]);
    const chaveG = `${mesmoMun ? 'mesmoMunicipio' : 'outroMunicipio'}`;
    (S[t].reservaOutraZona[chaveG] ??= []).push(`${y.k} <- ${[...new Set(v)].join(',')}`);
  }
}
await writeFile(path.join(DIR, 'casos.json'), JSON.stringify(S, null, 1));
for (const t of [1, 2]) {
  console.log(`== ${t}t reservas com contingência de outra zona:`, Object.fromEntries(Object.entries(S[t].reservaOutraZona).map(([a, b]) => [a, b.length])));
  console.log(S[t].reservaOutraZona.outroMunicipio ?? []);
}
