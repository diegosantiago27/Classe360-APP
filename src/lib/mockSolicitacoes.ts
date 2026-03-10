import { User, UserProfile } from '@/types/auth';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';

export const solicitacoesStorageKey = 'classe360:solicitacoes-pendentes';
export const approvedUsersStorageKey = 'classe360:usuarios-aprovados';
const BROADCAST_CHANNEL = 'classe360:solicitacoes-update';

const notifySolicitacoesUpdate = () => {
  try {
    new BroadcastChannel(BROADCAST_CHANNEL).postMessage('update');
  } catch {
    // BroadcastChannel não suportado
  }
};

export interface SolicitacaoMock {
  id: number;
  cpf: string;
  nome: string;
  email: string;
  senha: string;
  dataNascimento?: string;
  telefone?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  createdAt: string;
}

export interface ApprovedUserEntry {
  user: User;
  senha: string;
}

const getNextId = () => {
  const stored = loadFromStorage<SolicitacaoMock[]>(solicitacoesStorageKey, []);
  const maxStored = stored.length > 0 ? Math.max(...stored.map((s) => s.id)) : 0;
  return maxStored + 1;
};

export const addSolicitacao = (data: Omit<SolicitacaoMock, 'id' | 'createdAt'>): SolicitacaoMock => {
  const list = loadFromStorage<SolicitacaoMock[]>(solicitacoesStorageKey, []);
  const cpfNorm = data.cpf.replace(/\D/g, '');
  const exists = list.some(
    (s) => s.cpf.replace(/\D/g, '') === cpfNorm || s.email.toLowerCase() === data.email.toLowerCase()
  );
  if (exists) {
    throw new Error('Já existe solicitação pendente para este CPF ou e-mail');
  }
  const nova: SolicitacaoMock = {
    ...data,
    id: getNextId(),
    cpf: cpfNorm,
    createdAt: new Date().toISOString(),
  };
  list.push(nova);
  saveToStorage(solicitacoesStorageKey, list);
  notifySolicitacoesUpdate();
  return nova;
};

export const listSolicitacoes = (): SolicitacaoMock[] => {
  return loadFromStorage<SolicitacaoMock[]>(solicitacoesStorageKey, []);
};

export const onSolicitacoesUpdate = (callback: () => void): (() => void) => {
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channel.onmessage = callback;
    return () => channel.close();
  } catch {
    return () => {};
  }
};

export const removeSolicitacao = (id: number): void => {
  const list = listSolicitacoes().filter((s) => s.id !== id);
  saveToStorage(solicitacoesStorageKey, list);
  notifySolicitacoesUpdate();
};

export const aprovarSolicitacao = (
  id: number,
  perfil: string
): { user: User; senha: string } => {
  const list = listSolicitacoes();
  const sol = list.find((s) => s.id === id);
  if (!sol) throw new Error('Solicitação não encontrada');
  const perfilMap: Record<string, UserProfile> = {
    ALUNO: UserProfile.ALUNO,
    PROFESSOR: UserProfile.PROFESSOR,
    GESTOR: UserProfile.GESTOR,
    SECRETARIA: UserProfile.SECRETARIA,
    ADMIN: UserProfile.ADMINISTRADOR,
    ADMINISTRADOR: UserProfile.ADMINISTRADOR,
  };
  const userPerfil = perfilMap[perfil?.toUpperCase()] ?? UserProfile.ALUNO;
  const userId = `approved-${Date.now()}-${id}`;
  const user: User = {
    id: userId,
    cpf: sol.cpf,
    nome: sol.nome,
    email: sol.email,
    perfil: userPerfil,
    primeiroAcesso: false,
    createdAt: sol.createdAt,
  };
  const approved = loadFromStorage<ApprovedUserEntry[]>(approvedUsersStorageKey, []);
  approved.push({ user, senha: sol.senha });
  saveToStorage(approvedUsersStorageKey, approved);
  removeSolicitacao(id);
  return { user, senha: sol.senha };
};

export const rejeitarSolicitacao = (id: number): void => {
  removeSolicitacao(id);
};

export const findApprovedUserByCpf = (cpfNorm: string): ApprovedUserEntry | null => {
  const approved = loadFromStorage<ApprovedUserEntry[]>(approvedUsersStorageKey, []);
  return approved.find((e) => e.user.cpf === cpfNorm) ?? null;
};
