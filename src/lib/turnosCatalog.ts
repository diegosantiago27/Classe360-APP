import type { TurmaApi } from '@/lib/entityCrudApi';
import type { Turma, TurmaTurno } from '@/lib/mockTurmas';

export interface TurnoOption {
  id: number;
  codigo?: string;
  nome: string;
}

/** Alinhado aos IDs seed do Liquibase (MANHA=1, TARDE=2, NOITE=3) quando a API ainda não carregou. */
export const TURNOS_PADRAO: TurnoOption[] = [
  { id: 1, codigo: 'MANHA', nome: 'Manhã' },
  { id: 2, codigo: 'TARDE', nome: 'Tarde' },
  { id: 3, codigo: 'NOITE', nome: 'Noite' },
];

export function turnoNomeParaTipo(nome: string | undefined | null): TurmaTurno {
  const n = (nome ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (n.includes('tarde')) return 'Tarde';
  if (n.includes('noite')) return 'Noite';
  return 'Manha';
}

export function turnoTipoParaIdPadrao(t: TurmaTurno): string {
  if (t === 'Tarde') return '2';
  if (t === 'Noite') return '3';
  return '1';
}

export function rotuloTurnoParaExibicao(turma: Pick<Turma, 'turnoNome' | 'turno'>): string {
  if (turma.turnoNome?.trim()) return turma.turnoNome.trim();
  if (turma.turno === 'Tarde') return 'Tarde';
  if (turma.turno === 'Noite') return 'Noite';
  return 'Manhã';
}

export function idTurnoEfetivo(turma: Pick<Turma, 'turnoId' | 'turno'>): string {
  const raw = turma.turnoId?.trim();
  if (raw) return raw;
  return turnoTipoParaIdPadrao(turma.turno);
}

/** Mapeia resposta da API de turmas para os campos de turno no modelo de tela. */
export function mapTurnoFieldsFromTurmaApi(t: TurmaApi): Pick<Turma, 'turno' | 'turnoId' | 'turnoNome'> {
  const nomeTurno = t.turnoNome?.trim() ?? '';
  const turno = turnoNomeParaTipo(nomeTurno);
  const turnoId =
    t.turnoId != null && Number.isFinite(Number(t.turnoId))
      ? String(t.turnoId)
      : turnoTipoParaIdPadrao(turno);
  return {
    turno,
    turnoId,
    turnoNome: nomeTurno || undefined,
  };
}

export function rotuloTurnoDeTurmaApi(t: TurmaApi): string {
  if (t.turnoNome?.trim()) return t.turnoNome.trim();
  return rotuloTurnoParaExibicao({
    turno: turnoNomeParaTipo(t.turnoNome ?? ''),
    turnoNome: undefined,
  });
}
