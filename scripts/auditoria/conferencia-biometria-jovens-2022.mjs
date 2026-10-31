// Conferência independente (31/10/2026): eleitores de 16–17 e 18–20 anos sem biometria no perfil por seção de 2022, direto dos 28 zips do TSE.
// Uso: node scripts/auditoria/conferencia-biometria-jovens-2022.mjs
import { createReadStream, readdirSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createInflateRaw } from 'node:zlib';
const { DIR_DADOS } = await import('../../src/config.js');
const { entradasZip } = await import('./contagem-zip.mjs');
const { separar } = await import('./cetico-50-perfil.mjs');
const DIR = path.join(DIR_DADOS,'raw','dadosabertos','perfil_eleitor_secao');
const ufs = readdirSync(DIR).map(n=>/^perfil_eleitor_secao_2022_([A-Z]{2})\.zip$/.exec(n)?.[1]).filter(Boolean);
const T={};let tot=0;
for (const uf of ufs){const zip=path.join(DIR,`perfil_eleitor_secao_2022_${uf}.zip`);const e=(await entradasZip(zip)).find(x=>x.nome.toLowerCase().endsWith('.csv'));
let f=createReadStream(zip,{start:e.inicioDados,end:e.inicioDados+e.tamanhoComprimido-1,highWaterMark:1<<20});if(e.metodo===8)f=f.pipe(createInflateRaw({chunkSize:1<<20}));
let col=null;for await(const l of readline.createInterface({input:f.setEncoding('latin1'),crlfDelay:Infinity})){if(!l)continue;const c=separar(l);if(!col){col=Object.fromEntries(c.map((x,i)=>[x.trim(),i]));continue;}
const fx=Number(c[col.CD_FAIXA_ETARIA]);const qt=Number(c[col.QT_ELEITORES_PERFIL??col.QT_ELEITORES]);const b=Number(c[col.QT_ELEITORES_BIOMETRIA]);tot+=qt;
const k=fx===1600||fx===1700?'16-17':(fx>=1800&&fx<=2000?'18-20':null);if(k){T[k]??={t:0,b:0};T[k].t+=qt;T[k].b+=b;}}}
console.log(ufs.length,'arquivos',tot,'eleitores');for(const k in T)console.log(k,T[k].t,'sem bio',T[k].t-T[k].b,((T[k].t-T[k].b)/T[k].t*100).toFixed(2)+'%');
