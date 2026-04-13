import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { NotaLancamentoRelApi } from '@/lib/notasRelApi';
import type { FrequenciaApi, InstituicaoApi, PeriodoApi } from '@/lib/entityCrudApi';

const AZUL_ESCURO: [number, number, number] = [16, 32, 64];
const AZUL_DESTAQUE: [number, number, number] = [64, 128, 255];
const VERMELHO: [number, number, number] = [220, 38, 38];

export type LinhaRendimentoBoletim = {
  disciplina: string;
  b1: string;
  b2: string;
  b3: string;
  b4: string;
  mediaFinal: string;
  faltas: number;
  resultado: string;
  /** índices 1–4 (colunas de nota no PDF) com valor numérico < 7 */
  colunasBaixas: Set<number>;
};

export type MesFreqCol = { key: string; label: string };

export type PayloadBoletimEscolar = {
  escolaNome: string;
  escolaEndereco: string;
  escolaCnpj: string;
  escolaTelefone: string;
  tituloBanner: string;
  subtituloBanner: string;
  anoLetivoLabel: string;
  alunoNome: string;
  matricula: string;
  turmaNome: string;
  turnoLabel: string;
  dataNascLabel: string;
  responsavelLabel: string;
  colunasBim: string[];
  rendimento: LinhaRendimentoBoletim[];
  mesesFreq: MesFreqCol[];
  freqAulas: number[];
  freqPresencas: number[];
  freqFaltas: number[];
  freqPct: string[];
};

function faixaHeader(doc: jsPDF, pageW: number, margem: number, faixaH: number, titulo: string, subtitulo: string) {
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

function assinaturas(doc: jsPDF, margem: number, pageW: number, y: number) {
  const gap = 8;
  const colW = (pageW - margem * 2 - gap * 2) / 3;
  const y1 = y;
  const yLine = y1 + 2;
  doc.setDrawColor(160, 160, 170);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 110);
  doc.line(margem, yLine, margem + colW, yLine);
  doc.text('Diretor(a)', margem + colW / 2, yLine + 5, { align: 'center' });
  const x2 = margem + colW + gap;
  doc.line(x2, yLine, x2 + colW, yLine);
  doc.text('Professor(a) Responsável', x2 + colW / 2, yLine + 5, { align: 'center' });
  const y2 = yLine + 18;
  doc.line(margem, y2, margem + colW, y2);
  doc.text('Responsável', margem + colW / 2, y2 + 5, { align: 'center' });
}

export function gerarBoletimEscolarPdf(p: PayloadBoletimEscolar): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margem = 14;
  const faixaH = 22;

  faixaHeader(doc, pageW, margem, faixaH, 'Boletim Escolar', p.subtituloBanner);
  let y = faixaH + margem + 4;

  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Boletim Escolar', margem, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 130);
  doc.text(p.anoLetivoLabel, pageW / 2, y + 6, { align: 'center' });
  y += 14;

  autoTable(doc, {
    startY: y,
    body: [
      [p.escolaNome, `CNPJ: ${p.escolaCnpj}`],
      [p.escolaEndereco, `Tel: ${p.escolaTelefone}`],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [220, 220, 230] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: AZUL_ESCURO },
      1: { halign: 'right' },
    },
    margin: { left: margem, right: margem },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 8;

  autoTable(doc, {
    startY: y,
    body: [
      [`Aluno(a): ${p.alunoNome}`, `Matrícula: ${p.matricula}`],
      [`Turma: ${p.turmaNome}`, `Turno: ${p.turnoLabel}`],
      [`Data Nasc.: ${p.dataNascLabel}`, `Responsável: ${p.responsavelLabel}`],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5, lineColor: [220, 220, 230] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: AZUL_ESCURO },
      1: { fontStyle: 'bold', textColor: AZUL_ESCURO },
    },
    margin: { left: margem, right: margem },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.text('Rendimento Escolar', margem, y);
  y += 5;

  const head = [
    'Disciplina',
    p.colunasBim[0] ?? '1º Bim',
    p.colunasBim[1] ?? '2º Bim',
    p.colunasBim[2] ?? '3º Bim',
    p.colunasBim[3] ?? '4º Bim',
    'Média Final',
    'Faltas',
    'Resultado',
  ];

  const bodyR = p.rendimento.map((row) => [
    row.disciplina,
    row.b1,
    row.b2,
    row.b3,
    row.b4,
    row.mediaFinal,
    String(row.faltas),
    row.resultado,
  ]);

  autoTable(doc, {
    startY: y,
    head: [head],
    body: bodyR,
    theme: 'striped',
    headStyles: {
      fillColor: AZUL_ESCURO,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    styles: { fontSize: 8, cellPadding: 1.5, halign: 'center', valign: 'middle' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 32 },
    },
    margin: { left: margem, right: margem },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index >= 1 && data.column.index <= 4) {
        const row = p.rendimento[data.row.index];
        const colIdx = data.column.index;
        if (row?.colunasBaixas.has(colIdx)) {
          data.cell.styles.textColor = VERMELHO;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.section === 'body' && data.column.index === 5) {
        const row = p.rendimento[data.row.index];
        const t = parseFloat(String(row?.mediaFinal ?? '').replace(',', '.'));
        if (!Number.isNaN(t) && t < 7) {
          data.cell.styles.textColor = VERMELHO;
          data.cell.styles.fontStyle = 'bold';
        }
      }
      if (data.section === 'body' && data.column.index === 7) {
        const t = String(data.cell.raw ?? '');
        if (t.includes('Recuperação') || t.includes('Recuperacao')) {
          data.cell.styles.textColor = VERMELHO;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 12;

  if (y > pageH - 100) {
    doc.addPage();
    y = margem;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.text('Frequência', margem, y);
  y += 5;

  const headF = ['', ...p.mesesFreq.map((m) => m.label), 'Total'];
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const totalAulas = sum(p.freqAulas);
  const totalPres = sum(p.freqPresencas);
  const totalF = sum(p.freqFaltas);
  const pctTotal =
    totalAulas > 0 ? `${Math.round((totalPres / totalAulas) * 1000) / 10}%` : '—';

  const bodyF = [
    ['Aulas', ...p.freqAulas.map(String), String(totalAulas)],
    ['Presenças', ...p.freqPresencas.map(String), String(totalPres)],
    ['Faltas', ...p.freqFaltas.map(String), String(totalF)],
    ['%', ...p.freqPct, pctTotal],
  ];

  autoTable(doc, {
    startY: y,
    head: [headF],
    body: bodyF,
    theme: 'striped',
    headStyles: {
      fillColor: AZUL_ESCURO,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 22, fontStyle: 'bold', textColor: AZUL_ESCURO },
    },
    margin: { left: margem, right: margem },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable!.finalY + 16;

  if (y > pageH - 45) {
    doc.addPage();
    y = margem;
  }

  assinaturas(doc, margem, pageW, y);

  rodapePaginas(doc, margem, pageW, pageH);
  doc.save(`boletim-escolar-${Date.now()}.pdf`);
}

function valorNota(n: NotaLancamentoRelApi): number | null {
  if (typeof n.nota === 'number' && !Number.isNaN(n.nota)) return n.nota;
  const t = n.trabalhosNota;
  const p = n.provasNota;
  if (typeof t === 'number' && typeof p === 'number') return Math.round(((t + p) / 2) * 10) / 10;
  if (typeof t === 'number') return t;
  if (typeof p === 'number') return p;
  return null;
}

function labelBimCurto(nome: string, idx: number): string {
  const n = nome.trim();
  if (!n) return `${idx + 1}º Bim`;
  if (n.length <= 7) return n;
  return `${idx + 1}º Bim`;
}

function formatarEnderecoEscola(i: InstituicaoApi): string {
  const parts = [
    [i.endereco, i.numero].filter(Boolean).join(', '),
    i.complemento,
    i.bairro,
    [i.cidade, i.estado].filter(Boolean).join(' - '),
  ]
    .filter((x) => x && String(x).trim())
    .map((x) => String(x).trim());
  return parts.join(' — ') || '—';
}

function formatarCnpj(cnpj?: string): string {
  const d = (cnpj ?? '').replace(/\D/g, '');
  if (d.length !== 14) return cnpj?.trim() || '—';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Meses escolares exibidos (fev–nov) + chave para agregação */
const MESES_ESCOLA = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MESES_ABBR = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function montarPayloadBoletimEscolar(options: {
  alunoId: number;
  alunoNome: string;
  alunoCpf?: string;
  dataNascimento?: string;
  responsavelNome?: string;
  notas: NotaLancamentoRelApi[];
  frequencias: FrequenciaApi[];
  periodos: PeriodoApi[];
  disciplinasMap: Map<number, string>;
  turmasMap: Map<number, string>;
  turmaId: number;
  turnoLabel: string;
  instituicao: InstituicaoApi;
  anoLetivo: number;
}): PayloadBoletimEscolar | null {
  const notasT = options.notas.filter(
    (n) => n.alunoId === options.alunoId && n.turmaId === options.turmaId,
  );
  if (notasT.length === 0) return null;

  const periodosOrd = [...options.periodos]
    .filter((p) => p.id != null)
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
    .slice(0, 4);

  if (periodosOrd.length === 0) return null;

  const periodoIds = periodosOrd.map((x) => x.id as number);
  const colunasBim = periodosOrd.map((p, i) => labelBimCurto(p.nome ?? '', i));

  const turmaNome = options.turmasMap.get(options.turmaId) ?? `Turma ${options.turmaId}`;
  const matricula = options.alunoCpf?.replace(/\D/g, '') || String(options.alunoId).padStart(8, '0');

  const dataNascLabel = options.dataNascimento
    ? (() => {
        const d = new Date(options.dataNascimento);
        return Number.isNaN(d.getTime())
          ? options.dataNascimento
          : d.toLocaleDateString('pt-BR');
      })()
    : '—';

  const discIds = [
    ...new Set(
      notasT.map((n) => n.disciplinaId).filter((x): x is number => x != null && Number.isFinite(Number(x))),
    ),
  ].sort((a, b) => a - b);

  const freqsAluno = options.frequencias.filter(
    (f) => f.alunoId === options.alunoId && f.turmaId === options.turmaId,
  );

  const rendimento: LinhaRendimentoBoletim[] = [];

  for (const dId of discIds) {
    const ns = notasT.filter((n) => n.disciplinaId === dId);
    const nomeDisc = options.disciplinasMap.get(dId) ?? `Disciplina ${dId}`;
    const colunasBaixas = new Set<number>();

    const celulas: string[] = [];
    const notasPorBim: (number | null)[] = [];
    for (let i = 0; i < 4; i++) {
      const pid = periodoIds[i];
      if (pid == null) {
        celulas.push('—');
        notasPorBim.push(null);
        continue;
      }
      const reg = ns.find((n) => n.periodoId === pid);
      const v = reg ? valorNota(reg) : null;
      if (v != null && Number.isFinite(v)) {
        celulas.push(v.toFixed(1));
        notasPorBim.push(v);
        if (v < 7) colunasBaixas.add(i + 1);
      } else {
        celulas.push('—');
        notasPorBim.push(null);
      }
    }

    const nums = notasPorBim.filter((x): x is number => x != null);
    const mediaFinal =
      nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : 0;
    const mediaStr = nums.length > 0 ? mediaFinal.toFixed(1) : '—';

    const temNotaEmTodosPeriodos = periodoIds.every((pid) => {
      const reg = ns.find((n) => n.periodoId === pid);
      const v = reg ? valorNota(reg) : null;
      return v != null && Number.isFinite(v);
    });

    let resultado = '—';
    if (temNotaEmTodosPeriodos) {
      if (mediaFinal >= 7) resultado = 'Aprovado';
      else if (mediaFinal >= 5) resultado = 'Recuperação';
      else resultado = 'Reprovado';
    }

    const faltasDisc = freqsAluno.filter(
      (f) => f.disciplinaId === dId && f.presente === false,
    ).length;

    rendimento.push({
      disciplina: nomeDisc,
      b1: celulas[0] ?? '—',
      b2: celulas[1] ?? '—',
      b3: celulas[2] ?? '—',
      b4: celulas[3] ?? '—',
      mediaFinal: mediaStr,
      faltas: faltasDisc,
      resultado,
      colunasBaixas,
    });
  }

  const ano = options.anoLetivo;
  const mesesFreq: MesFreqCol[] = MESES_ESCOLA.map((mes) => ({
    key: `${ano}-${String(mes).padStart(2, '0')}`,
    label: MESES_ABBR[mes] ?? String(mes),
  }));

  const byMonth = new Map<string, { aulas: number; pres: number; fal: number }>();
  freqsAluno.forEach((f) => {
    if (!f.data) return;
    const d = new Date(f.data);
    if (Number.isNaN(d.getTime())) return;
    if (d.getFullYear() !== ano) return;
    const m = d.getMonth() + 1;
    if (!MESES_ESCOLA.includes(m as (typeof MESES_ESCOLA)[number])) return;
    const key = `${ano}-${String(m).padStart(2, '0')}`;
    const cur = byMonth.get(key) ?? { aulas: 0, pres: 0, fal: 0 };
    cur.aulas += 1;
    if (f.presente === true) cur.pres += 1;
    else cur.fal += 1;
    byMonth.set(key, cur);
  });

  const freqAulas: number[] = [];
  const freqPresencas: number[] = [];
  const freqFaltas: number[] = [];
  const freqPct: string[] = [];

  mesesFreq.forEach((m) => {
    const v = byMonth.get(m.key);
    if (!v || v.aulas === 0) {
      freqAulas.push(0);
      freqPresencas.push(0);
      freqFaltas.push(0);
      freqPct.push('—');
    } else {
      freqAulas.push(v.aulas);
      freqPresencas.push(v.pres);
      freqFaltas.push(v.fal);
      const pct = Math.round((v.pres / v.aulas) * 1000) / 10;
      freqPct.push(String(pct));
    }
  });

  const inst = options.instituicao;
  const escolaNome = inst.nome?.trim() || 'Instituição de ensino';
  const escolaEndereco = formatarEnderecoEscola(inst);
  const escolaCnpj = formatarCnpj(inst.cnpj);
  const escolaTelefone = inst.telefone?.trim() || '—';

  return {
    escolaNome,
    escolaEndereco,
    escolaCnpj,
    escolaTelefone,
    tituloBanner: 'Boletim Escolar',
    subtituloBanner: `Ano Letivo ${options.anoLetivo} — ${turmaNome}`,
    anoLetivoLabel: `Ano Letivo ${options.anoLetivo}`,
    alunoNome: options.alunoNome,
    matricula,
    turmaNome,
    turnoLabel: options.turnoLabel || '—',
    dataNascLabel,
    responsavelLabel: options.responsavelNome?.trim() || '—',
    colunasBim,
    rendimento,
    mesesFreq,
    freqAulas,
    freqPresencas,
    freqFaltas,
    freqPct,
  };
}
