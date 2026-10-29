"""Relatório das hipóteses em teste: PDF e seção do README a partir de docs/relatorios/hipoteses-em-teste.json.

Uso: python scripts/relatorios/hipoteses.py           (gera o PDF e atualiza o README)
     python scripts/relatorios/hipoteses.py --so-readme

Os números do JSON vêm só do relatório de perícia (docs/pericia/), que segue a regra dos 100%.
Requer reportlab. Fontes: Calibri e Georgia do Windows (acentos do português).
"""
import json
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

RAIZ = Path(__file__).resolve().parents[2]
DADOS = RAIZ / 'docs' / 'relatorios' / 'hipoteses-em-teste.json'
PDF = RAIZ / 'docs' / 'relatorios' / 'hipoteses-em-teste.pdf'
README = RAIZ / 'README.md'
INICIO, FIM = '<!-- hipoteses:inicio -->', '<!-- hipoteses:fim -->'

COR_STATUS = {
    'aberta': '#8a6d00', 'em teste': '#1f5fa8', 'refutada': '#2e7d32',
    'sustentada': '#b3261e', 'inconclusiva': '#5f6368',
}


def atualizar_readme(d):
    linhas = [
        INICIO,
        f'Retrato de {d["data"]}. Gerado por `python scripts/relatorios/hipoteses.py` a partir de '
        '[docs/relatorios/hipoteses-em-teste.json](docs/relatorios/hipoteses-em-teste.json); '
        'relatório completo em [PDF](docs/relatorios/hipoteses-em-teste.pdf). Os números vêm do relatório de perícia '
        '(universo completo, conferidos); o registro com toda a evidência está em [docs/hipoteses.md](docs/hipoteses.md) '
        'e o quadro em linguagem simples em [docs/pericia/10](docs/pericia/10-quadro-das-hipoteses.md).',
        '',
        '| # | Suspeita | Status | O que já se sabe | Próximo teste |',
        '|---|---|---|---|---|',
    ]
    for h in d['hipoteses']:
        status = f'**{h["status"]}**' if h['status'] in ('refutada', 'sustentada') else h['status']
        linhas.append(f'| {h["id"]} | {h["titulo"]} | {status} | {h["readme_sabe"]} | {h["readme_proximo"]} |')
    linhas += ['', 'Na fila, ainda sem número de hipótese: ' + '; '.join(f['titulo'].lower() for f in d['fila']) + '.', FIM]
    bloco = '\n'.join(linhas)
    texto = README.read_text(encoding='utf-8').replace('\r\n', '\n')
    if INICIO in texto:
        texto = re.sub(re.escape(INICIO) + r'.*?' + re.escape(FIM), lambda _: bloco, texto, flags=re.S)
    else:
        alvo = '## Números do 2º turno (Fatos)'
        if alvo not in texto:
            raise SystemExit(f'README sem a seção "{alvo}" para ancorar as hipóteses')
        texto = texto.replace(alvo, f'## Hipóteses em análise\n\n{bloco}\n\n{alvo}', 1)
    README.write_text(texto, encoding='utf-8', newline='\n')
    print(f'README atualizado: {len(d["hipoteses"])} hipóteses')


def gerar_pdf(d):
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (HRFlowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer,
                                    Table, TableStyle)

    fontes = Path('C:/Windows/Fonts')
    for nome, arq in [('Corpo', 'calibri.ttf'), ('Corpo-B', 'calibrib.ttf'), ('Corpo-I', 'calibrii.ttf'),
                      ('Titulo', 'georgia.ttf'), ('Titulo-B', 'georgiab.ttf')]:
        pdfmetrics.registerFont(TTFont(nome, str(fontes / arq)))
    pdfmetrics.registerFontFamily('Corpo', normal='Corpo', bold='Corpo-B', italic='Corpo-I', boldItalic='Corpo-B')

    tinta, suave, linha, fundo = colors.HexColor('#1d2330'), colors.HexColor('#5b6475'), colors.HexColor('#d9dde5'), colors.HexColor('#f4f6f9')
    corpo = ParagraphStyle('corpo', fontName='Corpo', fontSize=10.5, leading=14.5, textColor=tinta, alignment=TA_LEFT)
    pequeno = ParagraphStyle('pequeno', parent=corpo, fontSize=9.2, leading=12.2)
    item = ParagraphStyle('item', parent=corpo, leftIndent=11, bulletIndent=0, spaceAfter=2.5)
    rotulo = ParagraphStyle('rotulo', parent=corpo, fontName='Corpo-B', fontSize=9, leading=12, textColor=suave, spaceBefore=6, spaceAfter=2)
    h1 = ParagraphStyle('h1', fontName='Titulo-B', fontSize=17, leading=21, textColor=tinta, spaceBefore=4, spaceAfter=8)
    h2 = ParagraphStyle('h2', fontName='Titulo-B', fontSize=13, leading=17, textColor=tinta, spaceAfter=3)
    capa_t = ParagraphStyle('capa_t', fontName='Titulo-B', fontSize=30, leading=36, textColor=tinta)
    capa_s = ParagraphStyle('capa_s', fontName='Titulo', fontSize=14, leading=19, textColor=suave)

    def p(texto, estilo=corpo):
        return Paragraph(escape(texto), estilo)

    def lista(itens):
        return [Paragraph(escape(t), item, bulletText='•') for t in itens]

    def selo(status):
        cor = COR_STATUS.get(status, '#5f6368')
        return Paragraph(f'<font name="Corpo-B" color="{cor}">{escape(status.upper())}</font>', pequeno)

    hist = []
    # capa
    hist += [Spacer(1, 60 * mm), p(d['titulo'], capa_t), Spacer(1, 4 * mm), p(d['subtitulo'], capa_s),
             Spacer(1, 3 * mm), p(f'Retrato de {d["data"]}', capa_s), Spacer(1, 10 * mm)]
    aviso = Table([[Paragraph('<font name="Corpo-B">Análise em andamento. Nada aqui é conclusão final.</font> '
                              + escape(d['aviso']), corpo)]], colWidths=[None])
    aviso.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fff4e5')),
                               ('LINEBEFORE', (0, 0), (0, -1), 3, colors.HexColor('#b26a00')),
                               ('LEFTPADDING', (0, 0), (-1, -1), 10), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                               ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    hist += [aviso, Spacer(1, 8 * mm)]
    resumo = {}
    for h in d['hipoteses']:
        resumo[h['status']] = resumo.get(h['status'], 0) + 1
    plural = {'aberta': 'abertas', 'em teste': 'em teste', 'refutada': 'refutadas', 'sustentada': 'sustentadas',
              'inconclusiva': 'inconclusivas'}
    hist.append(p(f'{len(d["hipoteses"])} hipóteses registradas: '
                  + ', '.join(f'{v} {k if v == 1 else plural.get(k, k)}' for k, v in resumo.items()) + '.'))
    hist.append(Spacer(1, 3 * mm))
    hist.append(p('Este relatório lista o que está sendo testado, como, o que já se sabe e o que falta. '
                  'Os números são só os conferidos no relatório de perícia, com o universo completo das seções.', pequeno))
    hist.append(PageBreak())

    # como ler
    hist.append(p('Como ler', h1))
    hist += lista(d['regras'])
    hist.append(p('Status', rotulo))
    t = Table([[selo(k), p(v, pequeno)] for k, v in d['status'].items()], colWidths=[32 * mm, None])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEBELOW', (0, 0), (-1, -2), 0.4, linha),
                           ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    hist.append(t)
    hist.append(Spacer(1, 6 * mm))

    # quadro
    hist.append(p('Quadro geral', h1))
    cab = [Paragraph(f'<font name="Corpo-B">{c}</font>', pequeno) for c in ('#', 'Suspeita', 'Status', 'Próximo teste')]
    linhas_q = [cab] + [[p(h['id'], pequeno), p(h['titulo'], pequeno), selo(h['status']), p(h['readme_proximo'], pequeno)]
                        for h in d['hipoteses']]
    q = Table(linhas_q, colWidths=[12 * mm, 62 * mm, 24 * mm, None], repeatRows=1)
    q.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (-1, 0), fundo),
                           ('LINEBELOW', (0, 0), (-1, -1), 0.4, linha), ('TOPPADDING', (0, 0), (-1, -1), 4),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    hist.append(q)
    hist.append(PageBreak())

    # hipótese por hipótese
    hist.append(p('Hipótese por hipótese', h1))
    for i, h in enumerate(d['hipoteses']):
        if i:
            hist.append(HRFlowable(width='100%', thickness=0.5, color=linha, spaceBefore=4, spaceAfter=8))
        cor = COR_STATUS.get(h['status'], '#5f6368')
        cabeca = [p(f'{h["id"]}. {h["titulo"]}', h2),
                  Paragraph(f'Status: <font name="Corpo-B" color="{cor}">{escape(h["status"])}</font>', corpo),
                  p('Como será testada', rotulo)] + lista(h['como'][:1])
        hist.append(KeepTogether(cabeca))  # título nunca fica sozinho no pé da página
        hist += lista(h['como'][1:])
        if h['sabe']:
            hist += [p('O que já se sabe (Fato, conferido na perícia)', rotulo)] + lista(h['sabe'])
        hist += [p('O que falta testar', rotulo)] + lista(h['falta'])
        if h['alternativas'] and h['alternativas'] != '—':
            hist += [p('Explicações alternativas a descartar', rotulo), p(h['alternativas'], pequeno)]

    hist.append(PageBreak())
    hist.append(p('Testes na fila, ainda sem número de hipótese', h1))
    for f in d['fila']:
        hist.append(KeepTogether([p(f['titulo'], h2), p(f['texto']), Spacer(1, 3 * mm)]))
    hist.append(Spacer(1, 4 * mm))
    hist.append(p('Pedidos ao TSE pela Lei de Acesso à Informação', h1))
    hist += lista(d['lai'])
    hist.append(Spacer(1, 4 * mm))
    hist.append(p('Limites que valem para tudo', h1))
    hist += lista(d['limites'])

    def rodape(c, doc):
        c.saveState()
        c.setFont('Corpo', 8.5)
        c.setFillColor(suave)
        c.drawString(18 * mm, 11 * mm, f'{d["titulo"]} · {d["data"]} · análise em andamento, não é conclusão final')
        c.drawRightString(A4[0] - 18 * mm, 11 * mm, f'{doc.page}')
        c.restoreState()

    doc = SimpleDocTemplate(str(PDF), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm,
                            bottomMargin=20 * mm, title=d['titulo'], author='Auditoria independente 2026',
                            subject=d['subtitulo'])
    doc.build(hist, onFirstPage=lambda c, dd: None, onLaterPages=rodape)
    print(f'PDF gerado: {PDF}')


if __name__ == '__main__':
    dados = json.loads(DADOS.read_text(encoding='utf-8'))
    atualizar_readme(dados)
    if '--so-readme' not in sys.argv:
        gerar_pdf(dados)
