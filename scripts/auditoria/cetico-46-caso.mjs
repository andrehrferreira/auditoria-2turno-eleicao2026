// Cético revisor, parecer 46: confere uma seção no bruto (JSON de src/exportar.js), nos dois turnos.
// Por ciclo de eleitor que termina em voto computado: via (digital, ano de nascimento = V2, dado pessoal = V3),
// hora, foto apresentada, pedido de digital. Resume V2 por hora, intervalos entre V2 seguidos, maior sequência,
// V2 na última hora antes do "Inicio do Encerramento". Não imprime título, nome nem identificador de eleitor.
// Uso: node src/exportar.js --turno <t> --uf rj --municipio 58041 --zona 0152 --secao 0084 --saida <dir_t>
//      node scripts/auditoria/cetico-46-caso.mjs <json_1t> <json_2t>
import { readFile } from 'node:fs/promises';

const seg = (d) => Number(d.slice(11, 13)) * 3600 + Number(d.slice(14, 16)) * 60 + Number(d.slice(17, 19));
for (const arq of process.argv.slice(2)) {
  const j = JSON.parse(await readFile(arq, 'utf8'));
  const urnas = [];
  for (const p of j.pacotes) {
    const ev = p.log?.eventos ?? [];
    let m = { bio: false, ano: false, dado: false, foto: false, pede: false }, enc = null;
    const votos = [];
    for (const e of ev) {
      const msg = e.mensagem ?? '';
      if (msg === 'Identificador do eleitor digitado pelo mesário' || msg === 'Aguardando digitação do identificador do eleitor') m = { bio: false, ano: false, dado: false, foto: false, pede: false };
      else if (msg.startsWith('Inicio do Encerramento')) enc = seg(e.dataHora);
      else if (msg.includes('Tipo de habilitação do eleitor [biométrica]')) m.bio = true;
      else if (msg.startsWith('Ano de nascimento digitado é igual ao do cadastro')) m.ano = true;
      else if (msg === 'Dado digitado confere') m.dado = true;
      else if (msg === 'Foto do eleitor apresentada') m.foto = true;
      else if (msg.startsWith('Solicita digital. Tentativa')) m.pede = true;
      else if (msg === 'O voto do eleitor foi computado') { votos.push({ t: seg(e.dataHora), via: m.bio ? 'V1' : m.ano ? 'V2' : m.dado ? 'V3' : 'outra', foto: m.foto, pede: m.pede }); m = { bio: false, ano: false, dado: false, foto: false, pede: false }; }
    }
    urnas.push({ votos, enc, modelo: p.log?.metricasDoDia?.modeloUrna });
  }
  for (const { votos, enc, modelo } of urnas) {
    const v2 = votos.filter((v) => v.via === 'V2');
    const porHora = {}; for (const v of v2) { const h = Math.floor(v.t / 3600); porHora[h] = (porHora[h] ?? 0) + 1; }
    const ints = []; let seq = 0, maxSeq = 0, emSeq = 0, prev = null;
    for (const v of votos) { if (v.via === 'V2') { if (prev?.via === 'V2') { ints.push(v.t - prev.t); emSeq++; seq++; } else seq = 1; maxSeq = Math.max(maxSeq, seq); } else seq = 0; prev = v; }
    const cont = (f) => votos.filter(f).length;
    console.log(JSON.stringify({
      arquivo: arq.split(/[\\/]/).slice(-3).join('/'), turno: j.turno, modelo, votos: votos.length, V1: cont((v) => v.via === 'V1'), V2: v2.length, V3: cont((v) => v.via === 'V3'),
      V2comFoto: cont((v) => v.via === 'V2' && v.foto), V2pedeDigital: cont((v) => v.via === 'V2' && v.pede), V2porHora: porHora,
      V2ultimaHora: enc === null ? null : v2.filter((v) => v.t >= enc - 3600).length, todosUltimaHora: enc === null ? null : votos.filter((v) => v.t >= enc - 3600).length,
      V2emSequencia: emSeq, maiorSequencia: maxSeq, menorIntervaloV2V2: ints.length ? Math.min(...ints) : null,
      primeiroV2: v2.length ? new Date(v2[0].t * 1000).toISOString().slice(11, 19) : null, ultimoV2: v2.length ? new Date(v2.at(-1).t * 1000).toISOString().slice(11, 19) : null,
    }));
  }
}
