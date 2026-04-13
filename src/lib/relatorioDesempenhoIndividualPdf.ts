import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AZUL_ESCURO: [number, number, number] = [16, 32, 64];
const AZUL_DESTAQUE: [number, number, number] = [64, 128, 255];
const VERDE_OK: [number, number, number] = [22, 163, 74];
const AZUL_FREQ: [number, number, number] = [37, 99, 235];
const VERMELHO: [number, number, number] = [220, 38, 38];

export type LinhaNotaDisciplinaPdf = {
  disciplina: string;
  n1: string;
  n2: string;
  n3: string;
  n4: string;
  media: string;
  situacaoLabel: string;
};

export type LinhaFreqMensalPdf = {
  mes: string;
  aulas: number;
  presencas: number;
  faltas: number;
  pct: string;
};

export type GerarRelatorioIndividualParams = {
  escolaNome: string;
  alunoNome: string;
  turmaNome: string;
  professorNome: string;
  matricula: string;
  periodoLabel: string;
  dataRelatorio: string;
  mediaGeral: number;
  frequenciaPct: number;
  qtdDisciplinas: number;
  situacaoGeralLabel: string;
  linhasNotas: LinhaNotaDisciplinaPdf[];
  linhasFreq: LinhaFreqMensalPdf[];
  textoEvolucao: string;
};

function faixaHeader(doc: jsPDF, y: number, pageW: number, margem: number, faixaH: number) {
  doc.setFillColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.rect(0, 0, pageW, faixaH + margem * 0.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Desempenho por Aluno', margem, y + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 230);
  doc.text('Notas, frequência e evolução individual', margem, y + 14);
  doc.setFillColor(AZUL_DESTAQUE[0], AZUL_DESTAQUE[1], AZUL_DESTAQUE[2]);
  doc.roundedRect(pageW - margem - 24, y + 4, 22, 8, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ESCOLA', pageW - margem - 13, y + 8.5, { align: 'center' });
}

export function gerarRelatorioDesempenhoIndividualPdf(p: GerarRelatorioIndividualParams): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margem = 14;
  let y = margem;
  const faixaH = 22;

  faixaHeader(doc, y, pageW, margem, faixaH);
  y = faixaH + margem + 6;

  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Relatório de Desempenho Individual', margem, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    body: [
      ['Aluno', p.alunoNome, 'Turma', p.turmaNome],
      ['Professor(a)', p.professorNome, 'Matrícula', p.matricula],
      ['Período', p.periodoLabel, 'Data', p.dataRelatorio],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [220, 220, 230], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', textColor: AZUL_ESCURO },
      1: { cellWidth: 58 },
      2: { cellWidth: 32, fontStyle: 'bold', textColor: AZUL_ESCURO },
      3: { cellWidth: 58 },
    },
    margin: { left: margem, right: margem },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 10;

  const cardW = (pageW - margem * 2 - 9) / 4;
  const cardH = 18;
  const labels = ['Média Geral', 'Frequência', 'Disciplinas', 'Situação'];
  const vals = [
    p.mediaGeral.toFixed(1),
    `${p.frequenciaPct.toFixed(0)}%`,
    String(p.qtdDisciplinas),
    p.situacaoGeralLabel,
  ];
  const cores: Array<[number, number, number]> = [VERDE_OK, AZUL_FREQ, [30, 30, 30], VERDE_OK];
  for (let i = 0; i < 4; i++) {
    const x = margem + i * (cardW + 3);
    doc.setFillColor(248, 249, 252);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 110);
    doc.setFont('helvetica', 'normal');
    doc.text(labels[i] ?? '', x + cardW / 2, y + 6, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(cores[i]![0], cores[i]![1], cores[i]![2]);
    if (i === 3 && p.situacaoGeralLabel === 'Recuperação') {
      doc.setTextColor(VERMELHO[0], VERMELHO[1], VERMELHO[2]);
    }
    doc.text(vals[i] ?? '', x + cardW / 2, y + 14, { align: 'center' });
  }
  y += cardH + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.text('Notas por Disciplina', margem, y);
  y += 5;

  const bodyNotas = p.linhasNotas.map((row) => [
    row.disciplina,
    row.n1,
    row.n2,
    row.n3,
    row.n4,
    row.media,
    row.situacaoLabel,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Disciplina', 'N1', 'N2', 'N3', 'N4', 'Média', 'Situação']],
    body: bodyNotas,
    theme: 'striped',
    headStyles: {
      fillColor: AZUL_ESCURO,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 8, cellPadding: 1.8, halign: 'center', valign: 'middle' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 38 },
    },
    margin: { left: margem, right: margem },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const t = String(data.cell.raw ?? '');
        if (t.includes('Recuperação') || t.includes('Recuperacao')) {
          data.cell.styles.textColor = VERMELHO;
          data.cell.styles.fontStyle = 'bold';
        }
        if (t.includes('Aprovado')) {
          data.cell.styles.textColor = [20, 20, 20];
        }
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 10;

  if (y > pageH - 70) {
    doc.addPage();
    y = margem;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.text('Frequência Mensal', margem, y);
  y += 5;

  const bodyFreq = p.linhasFreq.map((r) => [
    r.mes,
    String(r.aulas),
    String(r.presencas),
    String(r.faltas),
    r.pct,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Mês', 'Aulas Dadas', 'Presenças', 'Faltas', '% Frequência']],
    body: bodyFreq.length ? bodyFreq : [['—', '0', '0', '0', '—']],
    theme: 'striped',
    headStyles: {
      fillColor: AZUL_ESCURO,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
    margin: { left: margem, right: margem },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.text('Observações do Professor', margem, y);
  y += 4;
  doc.setDrawColor(200, 200, 210);
  doc.line(margem, y, pageW - margem, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 70);
  const obsLines = doc.splitTextToSize(
    'Espaço reservado para comentários qualitativos do professor (preenchimento manual ou em versões futuras do sistema).',
    pageW - margem * 2,
  );
  doc.text(obsLines, margem, y);

  doc.addPage();
  y = margem;
  faixaHeader(doc, y, pageW, margem, faixaH);
  y = faixaH + margem + 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 40);
  const evolucao = doc.splitTextToSize(p.textoEvolucao, pageW - margem * 2);
  doc.text(evolucao, margem, y);

  const ultima = doc.getNumberOfPages();
  for (let i = 1; i <= ultima; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Gerado automaticamente pelo sistema escolar', margem, pageH - 8);
    doc.text(`Página ${i}`, pageW - margem, pageH - 8, { align: 'right' });
  }

  doc.save(`relatorio-desempenho-individual-${Date.now()}.pdf`);
}

const MESES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export type NotaAggInput = {
  alunoId?: number | null;
  turmaId?: number | null;
  disciplinaId?: number | null;
  periodoId?: number | null;
  valor?: number | null;
};

export type FrequenciaAggInput = {
  alunoId?: number | null;
  turmaId?: number | null;
  data?: string | null;
  presente?: boolean | null;
};

export type PeriodoAggInput = { id: number; nome?: string };

export type VinculoProfInput = { turmaId?: number | null; professorNome?: string | null };

export function montarPayloadRelatorioIndividual(options: {
  alunoId: number;
  alunoNome: string;
  alunoCpf?: string;
  notas: NotaAggInput[];
  frequencias: FrequenciaAggInput[];
  periodos: PeriodoAggInput[];
  disciplinasMap: Map<number, string>;
  turmasMap: Map<number, string>;
  vinculos: VinculoProfInput[];
  turmaFiltro: string;
  bimestreFiltro: string;
  periodosMap: Map<number, string>;
  escolaNome: string;
}): GerarRelatorioIndividualParams | null {
  let notasAluno = options.notas.filter((n) => n.alunoId === options.alunoId);
  if (options.turmaFiltro !== 'todas') {
    notasAluno = notasAluno.filter((n) => String(n.turmaId ?? '') === options.turmaFiltro);
  }
  if (options.bimestreFiltro !== 'todos') {
    notasAluno = notasAluno.filter((n) => String(n.periodoId ?? '') === options.bimestreFiltro);
  }

  if (notasAluno.length === 0) return null;

  const turmaId0 = notasAluno[0]?.turmaId;
  const turmaNome = turmaId0 != null ? options.turmasMap.get(Number(turmaId0)) ?? '—' : '—';
  const vProf = options.vinculos.find((v) => v.turmaId === turmaId0);
  const professorNome = vProf?.professorNome?.trim() || '—';
  const matricula = options.alunoCpf?.replace(/\D/g, '') || String(options.alunoId).padStart(8, '0');

  const periodoLabel =
    options.bimestreFiltro === 'todos'
      ? 'Todos os períodos'
      : options.periodosMap.get(Number(options.bimestreFiltro)) ?? `Período ${options.bimestreFiltro}`;

  let periodosOrd: PeriodoAggInput[];
  if (options.bimestreFiltro === 'todos') {
    periodosOrd = [...options.periodos].sort((a, b) => a.id - b.id).slice(0, 4);
  } else {
    const p = options.periodos.find((x) => String(x.id) === options.bimestreFiltro);
    periodosOrd = p ? [p] : [...options.periodos].sort((a, b) => a.id - b.id).slice(0, 1);
  }
  const periodIds = periodosOrd.map((x) => x.id);

  const discIds = [
    ...new Set(
      notasAluno
        .map((n) => n.disciplinaId)
        .filter((x): x is number => x != null && Number.isFinite(Number(x))),
    ),
  ].sort((a, b) => a - b);

  const linhasNotas: LinhaNotaDisciplinaPdf[] = [];
  const emRecuperacao: string[] = [];

  for (const dId of discIds) {
    const nome = options.disciplinasMap.get(dId) ?? `Disciplina ${dId}`;
    const ns = notasAluno.filter((n) => n.disciplinaId === dId);
    const getN = (idx: number) => {
      const pid = periodIds[idx];
      if (pid == null) return '—';
      const v = ns.find((n) => n.periodoId === pid)?.valor;
      return v != null && Number.isFinite(Number(v)) ? Number(v).toFixed(1) : '—';
    };
    const nums = periodIds
      .map((pid) => {
        const v = ns.find((n) => n.periodoId === pid)?.valor;
        return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
      })
      .filter((x): x is number => x != null);
    const media = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    const situacaoLabel = media >= 7 ? 'Aprovado' : media >= 5 ? 'Recuperação' : 'Reprovado';
    if (situacaoLabel === 'Recuperação') emRecuperacao.push(nome);

    linhasNotas.push({
      disciplina: nome,
      n1: getN(0),
      n2: getN(1),
      n3: getN(2),
      n4: getN(3),
      media: media.toFixed(1),
      situacaoLabel,
    });
  }

  const mediasDisc = linhasNotas.map((l) => Number.parseFloat(l.media.replace(',', '.')));
  const mediaGeral =
    mediasDisc.length > 0
      ? Math.round((mediasDisc.reduce((a, b) => a + b, 0) / mediasDisc.length) * 10) / 10
      : 0;

  const situacaoGeralLabel =
    mediaGeral >= 7 ? 'Aprovado' : mediaGeral >= 5 ? 'Recuperação' : 'Reprovado';

  let freqAluno = options.frequencias.filter((f) => f.alunoId === options.alunoId);
  if (options.turmaFiltro !== 'todas') {
    freqAluno = freqAluno.filter((f) => String(f.turmaId ?? '') === options.turmaFiltro);
  }
  const totalF = freqAluno.length;
  const pres = freqAluno.filter((f) => f.presente === true).length;
  const frequenciaPct = totalF > 0 ? Math.round((pres / totalF) * 1000) / 10 : 0;

  const byMonth = new Map<string, { total: number; pres: number }>();
  freqAluno.forEach((f) => {
    if (!f.data) return;
    const d = new Date(f.data);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = byMonth.get(key) ?? { total: 0, pres: 0 };
    cur.total += 1;
    if (f.presente === true) cur.pres += 1;
    byMonth.set(key, cur);
  });

  const linhasFreq: LinhaFreqMensalPdf[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => {
      const parts = key.split('-');
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const mesLabel = `${MESES_PT[Math.max(0, Math.min(11, (m ?? 1) - 1))] ?? ''} ${y ?? ''}`;
      const faltas = v.total - v.pres;
      const pct = v.total > 0 ? Math.round((v.pres / v.total) * 1000) / 10 : 0;
      return {
        mes: mesLabel,
        aulas: v.total,
        presencas: v.pres,
        faltas,
        pct: `${pct.toFixed(0)}%`,
      };
    });

  const destaques = linhasNotas
    .filter((l) => {
      const m = Number.parseFloat(l.media);
      return !Number.isNaN(m) && m >= 8;
    })
    .map((l) => l.disciplina);

  const textoEvolucao = [
    `O aluno ${options.alunoNome} apresenta desempenho com média geral ${mediaGeral.toFixed(1)}. `,
    destaques.length ? `Destaque em ${destaques.slice(0, 3).join(', ')}. ` : '',
    emRecuperacao.length
      ? `Recomenda-se atenção especial em ${emRecuperacao.join(', ')}. `
      : '',
    'Participação e comportamento podem ser complementados com observações do professor na área reservada na página anterior.',
  ].join('');

  return {
    escolaNome: options.escolaNome,
    alunoNome: options.alunoNome,
    turmaNome,
    professorNome,
    matricula,
    periodoLabel,
    dataRelatorio: new Date().toLocaleDateString('pt-BR'),
    mediaGeral,
    frequenciaPct,
    qtdDisciplinas: discIds.length,
    situacaoGeralLabel,
    linhasNotas,
    linhasFreq,
    textoEvolucao,
  };
}
