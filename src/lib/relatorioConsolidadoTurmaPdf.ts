import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AZUL_ESCURO: [number, number, number] = [16, 32, 64];
const AZUL_DESTAQUE: [number, number, number] = [64, 128, 255];
const VERDE: [number, number, number] = [22, 163, 74];
const AZUL_FREQ: [number, number, number] = [37, 99, 235];
const LARANJA: [number, number, number] = [234, 88, 12];
const VERMELHO: [number, number, number] = [220, 38, 38];
const CINZA_CARD: [number, number, number] = [248, 249, 252];

export type LinhaDesempenhoDisciplina = {
  disciplina: string;
  media: string;
  maior: string;
  menor: string;
  aprovados: number;
  recuperacao: number;
};

export type LinhaAlunoResumo = {
  num: number;
  nome: string;
  media: string;
  freq: string;
  situacao: string;
  situacaoRecuperacao: boolean;
};

export type DistribuicaoFaixa = { faixa: string; count: number; color: [number, number, number] };

export type PayloadConsolidadoTurma = {
  escolaNome: string;
  turmaNome: string;
  periodoLabel: string;
  totalAlunos: number;
  professorNome: string;
  mediaTurma: number;
  freqMediaPct: number;
  aprovadosCount: number;
  recuperacaoCount: number;
  distribuicao: DistribuicaoFaixa[];
  desempenhoDisciplinas: LinhaDesempenhoDisciplina[];
  listaAlunos: LinhaAlunoResumo[];
  maisAlunosN: number;
};

function faixaHeader(
  doc: jsPDF,
  margem: number,
  pageW: number,
  faixaH: number,
  titulo: string,
  subtitulo: string,
) {
  doc.setFillColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.rect(0, 0, pageW, faixaH + margem * 0.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, margem, 14);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 230);
  doc.text(subtitulo, margem, 20);
  doc.setFillColor(AZUL_DESTAQUE[0], AZUL_DESTAQUE[1], AZUL_DESTAQUE[2]);
  doc.roundedRect(pageW - margem - 24, 6, 22, 8, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ESCOLA', pageW - margem - 13, 10.5, { align: 'center' });
}

function rodapePaginas(doc: jsPDF, margem: number, pageW: number, pageH: number) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Gerado automaticamente pelo sistema escolar', margem, pageH - 8);
    doc.text(`Página ${i}`, pageW - margem, pageH - 8, { align: 'right' });
  }
}

export function gerarRelatorioConsolidadoTurmaPdf(p: PayloadConsolidadoTurma): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margem = 14;
  const faixaH = 22;

  faixaHeader(doc, margem, pageW, faixaH, 'Consolidado por Turma', 'Visão geral de todas as turmas');
  let y = faixaH + margem + 4;

  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Relatório Consolidado por Turma', margem, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    body: [
      ['Turma', p.turmaNome, 'Período', p.periodoLabel],
      ['Total de Alunos', String(p.totalAlunos), 'Professor(a)', p.professorNome],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [220, 220, 230] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: AZUL_ESCURO, fillColor: [245, 246, 250] },
      2: { fontStyle: 'bold', textColor: AZUL_ESCURO, fillColor: [245, 246, 250] },
    },
    margin: { left: margem, right: margem },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 8;

  const cardW = (pageW - margem * 2 - 9) / 4;
  const cardH = 16;
  const kpi = [
    { l: 'Média da Turma', v: p.mediaTurma.toFixed(1), c: VERDE },
    { l: 'Freq. Média', v: `${p.freqMediaPct.toFixed(0)}%`, c: AZUL_FREQ },
    { l: 'Aprovados', v: String(p.aprovadosCount), c: VERDE },
    { l: 'Recuperação', v: String(p.recuperacaoCount), c: LARANJA },
  ];
  for (let i = 0; i < 4; i++) {
    const x = margem + i * (cardW + 3);
    const k = kpi[i]!;
    doc.setFillColor(CINZA_CARD[0], CINZA_CARD[1], CINZA_CARD[2]);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 110);
    doc.setFont('helvetica', 'normal');
    doc.text(k.l, x + cardW / 2, y + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(k.c[0], k.c[1], k.c[2]);
    doc.text(k.v, x + cardW / 2, y + 12.5, { align: 'center' });
  }
  y += cardH + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.text('Distribuição de Notas', margem, y);
  y += 5;

  const totalDist = p.distribuicao.reduce((a, d) => a + d.count, 0) || 1;
  let xBar = margem;
  const barH = 12;
  const barTotalW = pageW - margem * 2;
  p.distribuicao.forEach((d) => {
    const w = totalDist > 0 ? (d.count / totalDist) * barTotalW : 0;
    if (w > 0.5) {
      doc.setFillColor(d.color[0], d.color[1], d.color[2]);
      doc.rect(xBar, y, w, barH, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      const label = `${d.faixa}: ${d.count}`;
      doc.text(label, xBar + w / 2, y + barH / 2 + 1, { align: 'center', maxWidth: w });
      xBar += w;
    }
  });
  y += barH + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 90);
  p.distribuicao.forEach((d, i) => {
    doc.setFillColor(d.color[0], d.color[1], d.color[2]);
    doc.circle(margem + 2 + i * 38, y + 2, 1.5, 'F');
    doc.text(`${d.faixa}: ${d.count}`, margem + 6 + i * 38, y + 3);
  });
  y += 10;

  if (y > pageH - 90) {
    doc.addPage();
    y = margem;
    faixaHeader(doc, margem, pageW, faixaH, 'Consolidado por Turma', 'Visão geral de todas as turmas');
    y = faixaH + margem + 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.text('Desempenho por Disciplina', margem, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Disciplina', 'Média', 'Maior Nota', 'Menor Nota', 'Aprovados', 'Recuperação']],
    body: p.desempenhoDisciplinas.map((r) => [
      r.disciplina,
      r.media,
      r.maior,
      r.menor,
      String(r.aprovados),
      String(r.recuperacao),
    ]),
    theme: 'striped',
    headStyles: { fillColor: AZUL_ESCURO, textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: margem, right: margem },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 12;

  doc.addPage();
  faixaHeader(doc, margem, pageW, faixaH, 'Consolidado por Turma', 'Visão geral de todas as turmas');
  y = faixaH + margem + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.text('Lista de Alunos - Resumo', margem, y);
  y += 5;

  const bodyAlunos = p.listaAlunos.map((r) => [
    String(r.num),
    r.nome,
    r.media,
    r.freq,
    r.situacao,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Nº', 'Aluno', 'Média', 'Freq.', 'Situação']],
    body:
      bodyAlunos.length > 0
        ? bodyAlunos
        : [['—', 'Nenhum aluno com notas no período', '—', '—', '—']],
    theme: 'striped',
    headStyles: { fillColor: AZUL_ESCURO, textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
    },
    margin: { left: margem, right: margem },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const row = p.listaAlunos[data.row.index];
        if (row?.situacaoRecuperacao) {
          data.cell.styles.textColor = VERMELHO;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 4;
  if (p.maisAlunosN > 0) {
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 100);
    doc.setFont('helvetica', 'italic');
    doc.text(`... (${p.maisAlunosN} aluno(s) adicionais não listados — ajuste filtros ou exporte por turma menor)`, margem, y + 4);
  }

  rodapePaginas(doc, margem, pageW, pageH);
  doc.save(`relatorio-consolidado-turma-${Date.now()}.pdf`);
}

type NotaIn = {
  alunoId?: number | null;
  turmaId?: number | null;
  disciplinaId?: number | null;
  periodoId?: number | null;
  valor?: number | null;
};

type FreqIn = {
  alunoId?: number | null;
  turmaId?: number | null;
  presente?: boolean | null;
};

export function montarPayloadConsolidadoTurma(options: {
  turmaId: number;
  turmaNome: string;
  notas: NotaIn[];
  frequencias: FreqIn[];
  usuarios: Array<{ id?: number; nome?: string }>;
  disciplinasMap: Map<number, string>;
  vinculos: Array<{ turmaId?: number | null; professorNome?: string | null }>;
  bimestreFiltro: string;
  periodosMap: Map<number, string>;
  escolaNome: string;
}): PayloadConsolidadoTurma | null {
  let notasT = options.notas.filter((n) => n.turmaId === options.turmaId);
  if (options.bimestreFiltro !== 'todos') {
    notasT = notasT.filter((n) => String(n.periodoId ?? '') === options.bimestreFiltro);
  }

  if (notasT.length === 0) return null;

  const periodoLabel =
    options.bimestreFiltro === 'todos'
      ? 'Todos os períodos'
      : options.periodosMap.get(Number(options.bimestreFiltro)) ?? `Período ${options.bimestreFiltro}`;

  const vProf = options.vinculos.find((v) => v.turmaId === options.turmaId);
  const professorNome = vProf?.professorNome?.trim() || '—';

  const alunoIds = new Set(
    notasT.map((n) => n.alunoId).filter((x): x is number => x != null && Number.isFinite(Number(x))),
  );
  const totalAlunos = alunoIds.size;

  const mediaTurma =
    notasT.length > 0
      ? Math.round(
          (notasT.reduce((s, n) => s + (Number(n.valor) || 0), 0) / notasT.length) * 10,
        ) / 10
      : 0;

  let freqsT = options.frequencias.filter((f) => f.turmaId === options.turmaId);
  const totalF = freqsT.length;
  const pres = freqsT.filter((f) => f.presente === true).length;
  const freqMediaPct = totalF > 0 ? Math.round((pres / totalF) * 1000) / 10 : 0;

  const mediasPorAluno = new Map<number, number[]>();
  notasT.forEach((n) => {
    if (n.alunoId == null) return;
    if (!mediasPorAluno.has(n.alunoId)) mediasPorAluno.set(n.alunoId, []);
    mediasPorAluno.get(n.alunoId)!.push(Number(n.valor) || 0);
  });

  let aprovadosCount = 0;
  let recuperacaoCount = 0;
  mediasPorAluno.forEach((vals) => {
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (m >= 7) aprovadosCount++;
    else if (m >= 5) recuperacaoCount++;
  });

  const faixas = [
    { faixa: '0-4', min: 0, max: 4.99, color: [239, 68, 68] as [number, number, number] },
    { faixa: '5-6', min: 5, max: 6.99, color: [245, 158, 11] as [number, number, number] },
    { faixa: '7-8', min: 7, max: 8.99, color: [6, 182, 212] as [number, number, number] },
    { faixa: '9-10', min: 9, max: 10, color: [34, 197, 94] as [number, number, number] },
  ];
  const distribuicao = faixas.map((f) => {
    const count = notasT.filter((n) => {
      const v = Number(n.valor);
      return Number.isFinite(v) && v >= f.min && v <= f.max;
    }).length;
    return { faixa: f.faixa, count, color: f.color };
  });

  const discIds = [
    ...new Set(
      notasT
        .map((n) => n.disciplinaId)
        .filter((x): x is number => x != null && Number.isFinite(Number(x))),
    ),
  ].sort((a, b) => a - b);

  const desempenhoDisciplinas: LinhaDesempenhoDisciplina[] = [];
  for (const dId of discIds) {
    const ns = notasT.filter((n) => n.disciplinaId === dId);
    const vals = ns.map((n) => Number(n.valor)).filter((v) => Number.isFinite(v));
    const media = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const maior = vals.length ? Math.max(...vals) : 0;
    const menor = vals.length ? Math.min(...vals) : 0;

    let ap = 0;
    let rec = 0;
    const porAluno = new Map<number, number[]>();
    ns.forEach((n) => {
      if (n.alunoId == null) return;
      if (!porAluno.has(n.alunoId)) porAluno.set(n.alunoId, []);
      porAluno.get(n.alunoId)!.push(Number(n.valor) || 0);
    });
    porAluno.forEach((vs) => {
      const m = vs.reduce((a, b) => a + b, 0) / vs.length;
      if (m >= 7) ap++;
      else if (m >= 5) rec++;
    });

    desempenhoDisciplinas.push({
      disciplina: options.disciplinasMap.get(dId) ?? `Disciplina ${dId}`,
      media: media.toFixed(1),
      maior: maior.toFixed(1),
      menor: menor.toFixed(1),
      aprovados: ap,
      recuperacao: rec,
    });
  }

  const nomeAluno = (id: number) =>
    options.usuarios.find((u) => Number(u.id) === id)?.nome?.trim() ?? `Aluno ${id}`;

  const listaRaw: LinhaAlunoResumo[] = [];
  mediasPorAluno.forEach((vals, aid) => {
    const media = vals.reduce((a, b) => a + b, 0) / vals.length;
    const fq = freqsT.filter((f) => f.alunoId === aid);
    const tf = fq.length;
    const pr = fq.filter((f) => f.presente === true).length;
    const fpct = tf > 0 ? Math.round((pr / tf) * 1000) / 10 : 0;
    const situacao = media >= 7 ? 'Aprovado' : media >= 5 ? 'Recuperação' : 'Reprovado';
    listaRaw.push({
      num: 0,
      nome: nomeAluno(aid),
      media: media.toFixed(1),
      freq: `${fpct.toFixed(0)}%`,
      situacao,
      situacaoRecuperacao: situacao === 'Recuperação',
    });
  });
  listaRaw.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const maxLinhas = 35;
  const slice = listaRaw.slice(0, maxLinhas);
  slice.forEach((row, idx) => {
    row.num = idx + 1;
  });
  const maisAlunosN = Math.max(0, listaRaw.length - maxLinhas);

  return {
    escolaNome: options.escolaNome,
    turmaNome: options.turmaNome,
    periodoLabel,
    totalAlunos,
    professorNome,
    mediaTurma,
    freqMediaPct,
    aprovadosCount,
    recuperacaoCount,
    distribuicao,
    desempenhoDisciplinas,
    listaAlunos: slice,
    maisAlunosN,
  };
}
