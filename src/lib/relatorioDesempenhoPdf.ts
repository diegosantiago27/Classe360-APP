import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AZUL_ESCURO: [number, number, number] = [16, 32, 64];
const AZUL_DESTAQUE: [number, number, number] = [64, 128, 255];
const CINZA_INFO: [number, number, number] = [245, 245, 248];

export type LinhaComparativoTurma = {
  turma: string;
  media: number;
  frequencia: number;
};

export type LinhaResumoTurma = {
  turma: string;
  alunos: number;
  media: number;
  freqPct: number;
  aprovados: number;
  recuperacao: number;
  reprovados: number;
};

export type LinhaRankingDisciplina = {
  disciplina: string;
  primeiroLugar: string;
  media1: number;
  segundoLugar: string;
  media2: number;
};

export type LinhaComparativoDisciplina = {
  disciplina: string;
  col1Turma: string;
  col1Media: number;
  col2Turma: string;
  col2Media: number;
};

export type GerarRelatorioDesempenhoPdfParams = {
  escolaNome: string;
  periodoLabel: string;
  comparativo: LinhaComparativoTurma[];
  resumoTurmas: LinhaResumoTurma[];
  rankingDisciplinas: LinhaRankingDisciplina[];
  comparativoDisciplinas: LinhaComparativoDisciplina[];
};

function desenharGraficoBarrasMedia(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  dados: LinhaComparativoTurma[],
) {
  if (dados.length === 0) return;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  const pad = 8;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2 - 14;
  const baseY = y + h - pad - 4;
  const maxVal = 10;
  const n = dados.length;
  const barW = Math.min(14, innerW / n - 2);
  const gap = (innerW - n * barW) / Math.max(1, n + 1);

  doc.setFontSize(8);
  doc.setTextColor(60, 60, 80);
  dados.forEach((d, i) => {
    const bx = x + pad + gap + i * (barW + gap);
    const alt = (d.media / maxVal) * innerH;
    doc.setFillColor(AZUL_DESTAQUE[0], AZUL_DESTAQUE[1], AZUL_DESTAQUE[2]);
    doc.rect(bx, baseY - alt, barW, alt, 'F');
    const label = d.turma.length > 10 ? `${d.turma.slice(0, 9)}…` : d.turma;
    doc.text(label, bx + barW / 2, baseY + 4, { align: 'center', maxWidth: barW + 4 });
  });

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 120);
  for (let t = 0; t <= 10; t += 2) {
    const ty = baseY - (t / maxVal) * innerH;
    doc.setDrawColor(220, 220, 230);
    doc.line(x + pad, ty, x + w - pad, ty);
    doc.text(String(t), x + pad - 2, ty + 1, { align: 'right' });
  }
}

/**
 * PDF no estilo dos mockups: faixa superior, metadados, gráfico de médias, tabelas.
 */
export function gerarRelatorioDesempenhoPdf(params: GerarRelatorioDesempenhoPdfParams): void {
  const {
    escolaNome,
    periodoLabel,
    comparativo,
    resumoTurmas,
    rankingDisciplinas,
    comparativoDisciplinas,
  } = params;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margem = 14;
  let y = margem;

  const faixaH = 22;
  doc.setFillColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.rect(0, 0, pageW, faixaH + margem * 0.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Comparativo Entre Turmas', margem, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 230);
  doc.text('Análise comparativa de desempenho', margem, y + 14);

  doc.setFillColor(AZUL_DESTAQUE[0], AZUL_DESTAQUE[1], AZUL_DESTAQUE[2]);
  doc.roundedRect(pageW - margem - 24, y + 4, 22, 8, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ESCOLA', pageW - margem - 13, y + 8.5, { align: 'center' });

  y = faixaH + margem + 4;

  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Comparativo Entre Turmas', margem, y);
  y += 8;

  doc.setFillColor(CINZA_INFO[0], CINZA_INFO[1], CINZA_INFO[2]);
  doc.rect(margem, y, pageW - margem * 2, 10, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 90);
  doc.text(`Escola: ${escolaNome}`, margem + 3, y + 6);
  doc.text(`Período: ${periodoLabel}`, margem + 85, y + 6);
  y += 16;

  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Média por Turma', margem, y);
  y += 4;
  desenharGraficoBarrasMedia(doc, margem, y, pageW - margem * 2, 52, comparativo);
  y += 58;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumo por Turma', margem, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Turma', 'Alunos', 'Média', 'Freq.', 'Aprovados', 'Recuperação', 'Reprovados']],
    body: resumoTurmas.map((r) => [
      r.turma,
      String(r.alunos),
      r.media.toFixed(1),
      `${r.freqPct.toFixed(0)}%`,
      String(r.aprovados),
      String(r.recuperacao),
      String(r.reprovados),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: AZUL_ESCURO,
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: margem, right: margem },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.text('Ranking por Disciplina (Melhor Turma)', margem, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Disciplina', '1º Lugar', 'Média', '2º Lugar', 'Média']],
    body: rankingDisciplinas.map((r) => [
      r.disciplina,
      r.primeiroLugar,
      r.media1.toFixed(1),
      r.segundoLugar,
      r.media2.toFixed(1),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: AZUL_ESCURO,
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: margem, right: margem },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;

  doc.setFillColor(AZUL_ESCURO[0], AZUL_ESCURO[1], AZUL_ESCURO[2]);
  doc.rect(0, y, pageW, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Comparativo Entre Turmas', margem, y + 9);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 230);
  doc.text('Análise comparativa de desempenho', margem, y + 15);
  doc.setFillColor(AZUL_DESTAQUE[0], AZUL_DESTAQUE[1], AZUL_DESTAQUE[2]);
  doc.roundedRect(pageW - margem - 24, y + 5, 22, 8, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ESCOLA', pageW - margem - 13, y + 9.5, { align: 'center' });

  y += 26;

  autoTable(doc, {
    startY: y,
    head: [['Disciplina', 'Turma', 'Média', 'Turma', 'Média']],
    body: comparativoDisciplinas.map((r) => [
      r.disciplina,
      r.col1Turma,
      r.col1Media.toFixed(1),
      r.col2Turma,
      r.col2Media.toFixed(1),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: AZUL_ESCURO,
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: margem, right: margem },
  });

  const pageH = doc.internal.pageSize.getHeight();
  const ultima = doc.getNumberOfPages();
  doc.setPage(ultima);
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('Gerado automaticamente pelo sistema escolar', margem, pageH - 8);
  doc.text(`Página ${ultima}`, pageW - margem, pageH - 8, { align: 'right' });

  doc.save(`relatorio-desempenho-${Date.now()}.pdf`);
}
