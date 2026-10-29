import path from 'node:path';
import { parseArgs } from 'node:util';
import { DIR_DADOS, TURNOS, UFS, caminhos } from './config.js';
import { etapaAux, etapaConferir, etapaExtrair, etapaIndice, etapaZips } from './etapas.js';
import { criarRegistro } from './registro.js';

const ETAPAS = ['indice', 'zips', 'extrair', 'aux', 'conferir'];

const AJUDA = `Coleta de arquivos de urna (BU, RDV, log, vota.vsc, imgbu) do TSE.

Uso: node src/coleta.js [opções]

  --turno <1|2>            turno (padrão: 2)
  --uf <ac,sp,...>         restringe às UFs informadas (padrão: todas + zz)
  --etapas <lista>         ${ETAPAS.join(',')} (padrão: todas, nessa ordem)
  --concorrencia <n>       requisições/extrações simultâneas (padrão: 16)
  --zips-paralelos <n>     zips baixados ao mesmo tempo (padrão: 2)
  --atualizar-indice       baixa de novo os cs.json mesmo se já existirem
  --reextrair              extrai os zips de novo mesmo se já marcados como extraídos
  --sem-reparo             etapa conferir só verifica, não baixa o que falta
  -h, --ajuda              mostra esta ajuda

Saída: código 0 somente se a conferência fechar 100% das seções das UFs processadas.`;

function inteiroPositivo(valor, nome) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) throw new Error(`--${nome} deve ser inteiro positivo`);
  return n;
}

async function main() {
  const { values } = parseArgs({
    options: {
      turno: { type: 'string', default: '2' },
      uf: { type: 'string' },
      etapas: { type: 'string', default: ETAPAS.join(',') },
      concorrencia: { type: 'string', default: '16' },
      'zips-paralelos': { type: 'string', default: '2' },
      'atualizar-indice': { type: 'boolean', default: false },
      reextrair: { type: 'boolean', default: false },
      'sem-reparo': { type: 'boolean', default: false },
      ajuda: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.ajuda) {
    console.log(AJUDA);
    return 0;
  }

  const turno = values.turno;
  if (!TURNOS[turno]) throw new Error(`--turno inválido: ${turno}`);
  const ufs = values.uf ? values.uf.toLowerCase().split(',').map((u) => u.trim()) : UFS;
  const invalidas = ufs.filter((u) => !UFS.includes(u));
  if (invalidas.length) throw new Error(`UF inválida: ${invalidas.join(', ')}`);
  const etapas = values.etapas.split(',').map((e) => e.trim());
  const desconhecidas = etapas.filter((e) => !ETAPAS.includes(e));
  if (desconhecidas.length) throw new Error(`etapa desconhecida: ${desconhecidas.join(', ')}`);

  const dirs = caminhos(turno);
  const ctx = {
    turno,
    ...TURNOS[turno],
    ufs,
    totalUfs: UFS.length,
    dirs,
    dirDados: DIR_DADOS,
    registro: criarRegistro(dirs.manifesto),
    concorrencia: inteiroPositivo(values.concorrencia, 'concorrencia'),
    zipsParalelos: inteiroPositivo(values['zips-paralelos'], 'zips-paralelos'),
    atualizarIndice: values['atualizar-indice'],
    reextrair: values.reextrair,
    reparar: !values['sem-reparo'],
  };

  let codigo = 0;
  try {
    const precisaIndice = etapas.some((e) => e !== 'zips');
    const indice = precisaIndice ? await etapaIndice(ctx) : null;
    for (const etapa of ETAPAS.filter((e) => etapas.includes(e))) {
      if (etapa === 'zips') await etapaZips(ctx);
      if (etapa === 'extrair') await etapaExtrair(ctx, indice);
      if (etapa === 'aux') await etapaAux(ctx, indice);
      if (etapa === 'conferir' && !(await etapaConferir(ctx, indice))) codigo = 1;
    }
  } finally {
    await ctx.registro.concluir();
  }
  if (codigo !== 0) console.log(`Há seções pendentes: veja ${path.join(dirs.manifesto, 'cobertura')} e ocorrencias.jsonl`);
  return codigo;
}

main().then(
  (codigo) => { process.exitCode = codigo; },
  (erro) => {
    console.error(erro);
    process.exitCode = 2;
  },
);
