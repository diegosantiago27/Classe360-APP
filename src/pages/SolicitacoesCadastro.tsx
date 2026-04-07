import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Loader2, UserPlus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import {
  listSolicitacoes,
  aprovarSolicitacao,
  rejeitarSolicitacao,
  onSolicitacoesUpdate,
  solicitacoesStorageKey,
  type SolicitacaoMock,
} from '@/lib/mockSolicitacoes';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

interface Solicitacao {
  id: number;
  cpf: string;
  nome: string;
  email: string;
  dataNascimento?: string;
  telefone?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  createdAt?: string;
}

const SolicitacoesCadastro: React.FC = () => {
  const { user } = useAuth();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [perfilSelecionado, setPerfilSelecionado] = useState<Record<number, string>>({});
  const { toast } = useToast();
  const podeAtribuirAdmin = user?.perfil === UserProfile.ADMINISTRADOR;

  const fetchSolicitacoes = async () => {
    if (API_URL) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/v1/auth/solicitacoes`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSolicitacoes(data);
        } else if (res.status === 401) {
          toast({
            title: 'Sessão expirada',
            description: 'Faça login novamente para ver as solicitações.',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as solicitações. Verifique se o backend está rodando.',
          variant: 'destructive',
        });
      }
    } else {
      // Modo mock: carrega do localStorage
      const data = listSolicitacoes().map((s: SolicitacaoMock) => ({
        id: s.id,
        cpf: s.cpf,
        nome: s.nome,
        email: s.email,
        dataNascimento: s.dataNascimento,
        telefone: s.telefone,
        rua: s.rua,
        numero: s.numero,
        complemento: s.complemento,
        bairro: s.bairro,
        cidade: s.cidade,
        cep: s.cep,
        createdAt: s.createdAt,
      }));
      setSolicitacoes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSolicitacoes();
  }, []);

  // Em modo mock: sincroniza estado com localStorage e verifica a cada 2s quando a aba está visível
  useEffect(() => {
    if (!API_URL) {
      const sync = () => {
        const stored = listSolicitacoes();
        if (stored.length !== solicitacoes.length) {
          setSolicitacoes(
            stored.map((s: SolicitacaoMock) => ({
              id: s.id,
              cpf: s.cpf,
              nome: s.nome,
              email: s.email,
              dataNascimento: s.dataNascimento,
              telefone: s.telefone,
              rua: s.rua,
              numero: s.numero,
              complemento: s.complemento,
              bairro: s.bairro,
              cidade: s.cidade,
              cep: s.cep,
              createdAt: s.createdAt,
            }))
          );
        }
      };
      sync();
      const id = setInterval(() => {
        if (document.visibilityState === 'visible') sync();
      }, 2000);
      return () => clearInterval(id);
    }
  }, [API_URL, solicitacoes.length]);

  // Atualiza quando outra aba faz um novo cadastro (storage event ou BroadcastChannel)
  useEffect(() => {
    if (API_URL) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === solicitacoesStorageKey) {
        setLoading(true);
        fetchSolicitacoes();
      }
    };
    window.addEventListener('storage', onStorage);
    const unsubscribe = onSolicitacoesUpdate(() => {
      setLoading(true);
      fetchSolicitacoes();
    });
    return () => {
      window.removeEventListener('storage', onStorage);
      unsubscribe();
    };
  }, [API_URL]);

  // Atualiza quando o usuário volta para a aba
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setLoading(true);
        fetchSolicitacoes();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const handleAtualizar = () => {
    setLoading(true);
    fetchSolicitacoes();
  };

  const handleAprovar = async (id: number) => {
    const perfil = perfilSelecionado[id] || 'ALUNO';
    setProcessingId(id);
    try {
      if (API_URL) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/v1/auth/solicitacoes/${id}/aprovar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ perfil }),
        });
        if (res.ok) {
          toast({
            title: 'Aprovado!',
            description: 'O usuário foi aprovado e já pode acessar o sistema.',
          });
          setSolicitacoes((prev) => prev.filter((s) => s.id !== id));
        } else {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || err.message || 'Erro ao aprovar');
        }
      } else {
        aprovarSolicitacao(id, perfil);
        toast({
          title: 'Aprovado!',
          description: 'O usuário foi aprovado e já pode acessar o sistema.',
        });
        setSolicitacoes((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Não foi possível aprovar.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejeitar = async (id: number) => {
    setProcessingId(id);
    try {
      if (API_URL) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/v1/auth/solicitacoes/${id}/rejeitar`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          toast({
            title: 'Rejeitado',
            description: 'A solicitação foi rejeitada.',
          });
          setSolicitacoes((prev) => prev.filter((s) => s.id !== id));
        } else {
          throw new Error('Erro ao rejeitar');
        }
      } else {
        rejeitarSolicitacao(id);
        toast({
          title: 'Rejeitado',
          description: 'A solicitação foi rejeitada.',
        });
        setSolicitacoes((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível rejeitar a solicitação.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatCpf = (cpf: string) => {
    const n = cpf.replace(/\D/g, '');
    if (n.length !== 11) return cpf;
    return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Solicitações de Cadastro</h1>
            <p className="text-muted-foreground">
              Aprove ou rejeite as solicitações de novos usuários e defina o perfil de cada um.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleAtualizar} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Pendentes de aprovação
            </CardTitle>
            <CardDescription>
              Escolha o perfil e libere o acesso ao sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : solicitacoes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma solicitação pendente.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Data solicitação</TableHead>
                    <TableHead className="w-[180px]">Perfil</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitacoes.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nome}</TableCell>
                      <TableCell>{formatCpf(s.cpf)}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.telefone || '-'}</TableCell>
                      <TableCell>
                        {s.createdAt
                          ? new Date(s.createdAt).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={perfilSelecionado[s.id] || 'ALUNO'}
                          onValueChange={(v) =>
                            setPerfilSelecionado((prev) => ({ ...prev, [s.id]: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Perfil" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALUNO">Aluno</SelectItem>
                            <SelectItem value="PROFESSOR">Professor</SelectItem>
                            <SelectItem value="GESTOR">Gestor</SelectItem>
                            <SelectItem value="SECRETARIA">Secretaria</SelectItem>
                            {podeAtribuirAdmin && (
                              <SelectItem value="ADMIN">Administrador</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAprovar(s.id)}
                            disabled={processingId !== null}
                          >
                            {processingId === s.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejeitar(s.id)}
                            disabled={processingId !== null}
                          >
                            <X className="w-4 h-4" />
                            Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SolicitacoesCadastro;
