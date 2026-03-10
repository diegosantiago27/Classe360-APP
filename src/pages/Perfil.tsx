import React, { useEffect, useState } from 'react';
import { Lock, Mail, Phone, UserCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';

// Sempre usa URL relativa para que o proxy do Vite (vite.config) encaminhe /api ao backend
const API_BASE = "";

interface PerfilData {
  nome: string;
  email: string;
  telefone: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  cep: string;
  dataNascimento: string;
}

const toInputDate = (value?: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
};

const toStorageDate = (value?: string) => {
  if (!value) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [yyyy, mm, dd] = value.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
  return value;
};

const Perfil: React.FC = () => {
  const { user, token, updateUser } = useAuth();
  const { toast } = useToast();

  const storageKey = `school-compass:perfil:${user?.id ?? 'guest'}`;
  const [nome, setNome] = useState(user?.nome ?? '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [telefone, setTelefone] = useState(user?.telefone ?? '');
  const [rua, setRua] = useState(user?.rua ?? '');
  const [numero, setNumero] = useState(user?.numero ?? '');
  const [complemento, setComplemento] = useState(user?.complemento ?? '');
  const [bairro, setBairro] = useState(user?.bairro ?? '');
  const [cidade, setCidade] = useState(user?.cidade ?? '');
  const [cep, setCep] = useState(user?.cep ?? '');
  const [dataNascimento, setDataNascimento] = useState(toInputDate(user?.dataNascimento));

  useEffect(() => {
    if (user) {
      setNome(user.nome ?? '');
      setEmail(user.email ?? '');
      setTelefone(user.telefone ?? '');
      setRua(user.rua ?? '');
      setNumero(user.numero ?? '');
      setComplemento(user.complemento ?? '');
      setBairro(user.bairro ?? '');
      setCidade(user.cidade ?? '');
      setCep(user.cep ?? '');
      setDataNascimento(toInputDate(user.dataNascimento));
    }
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const data = {
      nome,
      email,
      telefone,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      cep,
      dataNascimento: toStorageDate(dataNascimento),
    };

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        const result = (await res.json().catch(() => ({}))) as { user?: Record<string, unknown>; detail?: string };
        if (!res.ok) {
          toast({
            title: 'Erro ao salvar',
            description: (result?.detail as string) ?? 'Não foi possível atualizar o perfil.',
            variant: 'destructive',
          });
          return;
        }
        if (result?.user) {
          const u = result.user as Record<string, unknown>;
          const str = (v: unknown) => (v != null && v !== '' ? String(v) : undefined);
          updateUser({
            id: String(u.id ?? user?.id),
            cpf: String(u.cpf ?? user?.cpf ?? ''),
            nome: String(u.nome ?? ''),
            email: String(u.email ?? ''),
            perfil: (u.perfil as number) ?? user?.perfil ?? 4,
            primeiroAcesso: false,
            telefone: str(u.telefone),
            dataNascimento: str(u.dataNascimento),
            rua: str(u.rua),
            numero: str(u.numero),
            complemento: str(u.complemento),
            bairro: str(u.bairro),
            cidade: str(u.cidade),
            cep: str(u.cep),
            createdAt: String(u.createdAt ?? user?.createdAt ?? ''),
          });
        }
        toast({
          title: 'Perfil atualizado',
          description: 'Seus dados foram salvos com sucesso.',
        });
      } catch {
        toast({
          title: 'Erro',
          description: 'Não foi possível conectar ao servidor.',
          variant: 'destructive',
        });
      }
    } else if (user) {
      saveToStorage<PerfilData>(storageKey, data);
      updateUser({
        ...user,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone || undefined,
        dataNascimento: data.dataNascimento || undefined,
        rua: data.rua || undefined,
        numero: data.numero || undefined,
        complemento: data.complemento || undefined,
        bairro: data.bairro || undefined,
        cidade: data.cidade || undefined,
        cep: data.cep || undefined,
      });
      toast({
        title: 'Perfil atualizado',
        description: 'Seus dados foram salvos localmente.',
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      toast({
        title: 'Erro',
        description: 'A nova senha e a confirmação não coincidem.',
        variant: 'destructive',
      });
      return;
    }
    if (novaSenha.length < 6) {
      toast({
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    if (!token) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a senha. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string; message?: string; error?: string };
      if (!res.ok) {
        const msg = data?.detail ?? data?.message ?? data?.error ?? 'Senha atual incorreta ou dados inválidos.';
        toast({
          title: 'Erro ao alterar senha',
          description: msg,
          variant: 'destructive',
        });
        return;
      }
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi atualizada com sucesso.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar ao servidor.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    const data = {
      nome: user?.nome ?? '',
      email: user?.email ?? '',
      telefone: user?.telefone ?? '',
      rua: user?.rua ?? '',
      numero: user?.numero ?? '',
      complemento: user?.complemento ?? '',
      bairro: user?.bairro ?? '',
      cidade: user?.cidade ?? '',
      cep: user?.cep ?? '',
      dataNascimento: toInputDate(user?.dataNascimento),
    };
    setNome(data.nome);
    setEmail(data.email);
    setTelefone(data.telefone);
    setRua(data.rua);
    setNumero(data.numero);
    setComplemento(data.complemento);
    setBairro(data.bairro);
    setCidade(data.cidade);
    setCep(data.cep);
    setDataNascimento(data.dataNascimento);
    saveToStorage<PerfilData>(storageKey, data);
    toast({
      title: 'Dados restaurados',
      description: 'Os dados foram restaurados a partir do perfil atual.',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Meu perfil
          </h1>
          <p className="text-muted-foreground">
            Atualize seus dados pessoais e mantenha o cadastro em dia.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" />
              Informacoes pessoais
            </CardTitle>
            <CardDescription>
              Esses dados sao usados para comunicacoes e relatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de nascimento</Label>
                  <Input
                    id="dataNascimento"
                    type="date"
                    value={dataNascimento}
                    onChange={(event) => setDataNascimento(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                    <Mail className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <div className="relative">
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(event) => setTelefone(event.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                    <Phone className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rua">Rua</Label>
                  <Input
                    id="rua"
                    value={rua}
                    onChange={(event) => setRua(event.target.value)}
                    placeholder="Nome da rua"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Numero</Label>
                  <Input
                    id="numero"
                    value={numero}
                    onChange={(event) => setNumero(event.target.value)}
                    placeholder="Numero"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={complemento}
                    onChange={(event) => setComplemento(event.target.value)}
                    placeholder="Apartamento, bloco, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={bairro}
                    onChange={(event) => setBairro(event.target.value)}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={cidade}
                    onChange={(event) => setCidade(event.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(event) => setCep(event.target.value)}
                    placeholder="00000-000"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={handleReset}>
                    Restaurar dados
                  </Button>
                  <Button type="submit" variant="gradient">
                    Salvar alteracoes
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Alterar senha
            </CardTitle>
            <CardDescription>
              Digite sua senha atual e a nova senha desejada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha atual</Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" variant="gradient">
                Alterar senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Perfil;
