import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Loader2, UserPlus } from 'lucide-react';
import { UserProfile } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { loadFromStorage } from '@/lib/mockStorage';
import { defaultUsers, usersStorageKey } from '@/lib/mockUsers';
import { Turma, defaultTurmas, turmasStorageKey } from '@/lib/mockTurmas';
import {
  CatalogItem,
  defaultDisciplinas,
  disciplinasStorageKey,
} from '@/lib/mockAcademics';
import { getUsuarioApi, isApiEnabled, saveUsuarioApi } from '@/lib/entityCrudApi';

function roleToPerfil(role: string): UserProfile {
  switch (role) {
    case 'ROLE_GESTOR': return UserProfile.GESTOR;
    case 'ROLE_ADMIN':
    case 'ADMIN': return UserProfile.ADMINISTRADOR;
    case 'ROLE_SECRETARIA': return UserProfile.SECRETARIA;
    case 'ROLE_PROFESSOR': return UserProfile.PROFESSOR;
    case 'ROLE_ALUNO':
    default: return UserProfile.ALUNO;
  }
}

function perfilToRole(perfil: UserProfile): string {
  switch (perfil) {
    case UserProfile.GESTOR:
      return 'ROLE_GESTOR';
    case UserProfile.ADMINISTRADOR:
      return 'ROLE_ADMIN';
    case UserProfile.SECRETARIA:
      return 'ROLE_SECRETARIA';
    case UserProfile.PROFESSOR:
      return 'ROLE_PROFESSOR';
    case UserProfile.ALUNO:
    default:
      return 'ROLE_ALUNO';
  }
}

const UserForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const editingId = searchParams.get('id');
  const isEditing = Boolean(editingId);
  const somenteConsulta = user?.perfil === UserProfile.SECRETARIA;

  const [formData, setFormData] = useState({
    cpf: '',
    nome: '',
    email: '',
    telefone: '',
    dataNascimento: '',
    perfil: '',
    turno: '' as '' | 'Manha' | 'Tarde' | 'Noite',
    status: 'ativo' as 'ativo' | 'inativo',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    senha: '',
    confirmarSenha: '',
    materias: [] as string[],
    turmas: [] as string[],
  });

  const currentUsers = useMemo(
    () => loadFromStorage<StoredUser[]>(usersStorageKey, isApiEnabled() ? [] : defaultUsers),
    [],
  );
  const turmasCadastradas = useMemo(
    () => loadFromStorage<Turma[]>(turmasStorageKey, isApiEnabled() ? [] : defaultTurmas),
    [],
  );
  const disciplinasCadastradas = useMemo(
    () => loadFromStorage<CatalogItem[]>(disciplinasStorageKey, isApiEnabled() ? [] : defaultDisciplinas),
    [],
  );

  useEffect(() => {
    if (somenteConsulta && !editingId) {
      navigate('/usuario-listar');
      return;
    }
    if (!editingId) return;

    if (isApiEnabled() && Number.isFinite(Number(editingId))) {
      void getUsuarioApi(Number(editingId))
        .then((data) => {
          setFormData((prev) => ({
            ...prev,
            cpf: data.cpf ?? '',
            nome: data.nome ?? '',
            email: data.email ?? '',
            telefone: data.telefone ?? '',
            dataNascimento: data.dataNascimento ?? '',
            perfil: String(roleToPerfil(data.role ?? 'ROLE_ALUNO')),
            turno: (data.turno as '' | 'Manha' | 'Tarde' | 'Noite' | undefined) ?? '',
            status: data.ativo === false ? 'inativo' : 'ativo',
            endereco: data.endereco ?? '',
            cidade: data.cidade ?? '',
            estado: data.estado ?? '',
            cep: data.cep ?? '',
            materias: data.materias ?? [],
            turmas: data.turmas ?? [],
          }));
        })
        .catch(() => {
          window.alert('Não foi possível carregar o usuário. Verifique a API e tente novamente.');
        });
      return;
    }

    const foundUser = currentUsers.find((item) => item.id === editingId);
    if (!foundUser) return;
    setFormData((prev) => ({
      ...prev,
      cpf: foundUser.cpf ?? '',
      nome: foundUser.nome ?? '',
      email: foundUser.email ?? '',
      telefone: foundUser.telefone ?? '',
      dataNascimento: foundUser.dataNascimento ?? '',
      perfil: String(foundUser.perfil ?? ''),
      turno: foundUser.turno ?? '',
      status: foundUser.status ?? 'ativo',
      endereco: foundUser.endereco ?? '',
      cidade: foundUser.cidade ?? '',
      estado: foundUser.estado ?? '',
      cep: foundUser.cep ?? '',
      materias: foundUser.materias ?? [],
      turmas: foundUser.turmas ?? [],
    }));
  }, [editingId, currentUsers, somenteConsulta, navigate]);

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') {
      formattedValue = formatCpf(value);
      if (formattedValue.replace(/\D/g, '').length > 11) return;
    } else if (name === 'telefone') {
      formattedValue = formatPhone(value);
      if (formattedValue.replace(/\D/g, '').length > 11) return;
    } else if (name === 'cep') {
      formattedValue = formatCep(value);
      if (formattedValue.replace(/\D/g, '').length > 8) return;
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  const handleMateriaToggle = (materia: string) => {
    setFormData((prev) => ({
      ...prev,
      materias: prev.materias.includes(materia)
        ? prev.materias.filter((m) => m !== materia)
        : [...prev.materias, materia],
    }));
  };

  const handleTurmaToggle = (turma: string) => {
    setFormData((prev) => ({
      ...prev,
      turmas: prev.turmas.includes(turma)
        ? prev.turmas.filter((t) => t !== turma)
        : [...prev.turmas, turma],
    }));
  };

  const validatePassword = (password: string): boolean => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    return minLength && hasUpperCase && hasLowerCase && hasNumber;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (somenteConsulta) return;
    if (!isApiEnabled()) {
      toast({
        title: 'Backend não configurado',
        description: 'Configure o backend para salvar usuários.',
        variant: 'destructive',
      });
      return;
    }

    if (!isEditing && !validatePassword(formData.senha)) {
      toast({
        title: 'Senha fraca',
        description:
          'A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas e números.',
        variant: 'destructive',
      });
      return;
    }

    if (!isEditing && formData.senha !== formData.confirmarSenha) {
      toast({
        title: 'Senhas não coincidem',
        description: 'Por favor, verifique as senhas digitadas.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const perfilNumerico = Number(formData.perfil) as UserProfile;

    try {
      await saveUsuarioApi({
        id: isEditing && editingId && Number.isFinite(Number(editingId)) ? Number(editingId) : undefined,
        cpf: formData.cpf,
        nome: formData.nome,
        email: formData.email,
        role: perfilToRole(perfilNumerico),
        ativo: formData.status === 'ativo',
        telefone: formData.telefone || undefined,
        dataNascimento: formData.dataNascimento || undefined,
        endereco: formData.endereco || undefined,
        cidade: formData.cidade || undefined,
        estado: formData.estado || undefined,
        cep: formData.cep || undefined,
        turno: formData.turno || undefined,
        materias: formData.materias,
        turmas: formData.turmas,
        senha: formData.senha || undefined,
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Nao foi possivel salvar o usuario.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: isEditing ? 'Usuário atualizado!' : 'Usuário criado!',
      description: isEditing
        ? 'Os dados do usuário foram atualizados com sucesso.'
        : 'O usuário foi cadastrado com sucesso.',
    });

    setIsLoading(false);
    navigate('/usuario-listar');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/usuario-listar">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display font-bold text-3xl text-foreground flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-primary" />
              {somenteConsulta ? 'Dados do usuário' : isEditing ? 'Editar Usuário' : 'Novo Usuário'}
            </h1>
            <p className="text-muted-foreground">
              {somenteConsulta
                ? 'Consulta dos dados cadastrais (sem acesso à senha)'
                : isEditing
                ? 'Atualize os dados do usuário cadastrado'
                : 'Preencha os dados para cadastrar um novo usuário'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Data */}
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <h2 className="font-display font-semibold text-lg text-foreground mb-4">
              Dados Pessoais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleChange}
                  required
                  disabled={somenteConsulta}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  name="nome"
                  placeholder="Nome completo"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  disabled={somenteConsulta}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={somenteConsulta}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={handleChange}
                  disabled={somenteConsulta}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  name="dataNascimento"
                  type="date"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  disabled={somenteConsulta}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil">Perfil *</Label>
                <Select
                  value={formData.perfil}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, perfil: value }))
                  }
                  disabled={somenteConsulta}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(UserProfile.GESTOR)}>Gestor</SelectItem>
                    <SelectItem value={String(UserProfile.ADMINISTRADOR)}>
                      Administrador
                    </SelectItem>
                    <SelectItem value={String(UserProfile.PROFESSOR)}>
                      Professor
                    </SelectItem>
                    <SelectItem value={String(UserProfile.ALUNO)}>Aluno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="turno">Turno</Label>
                <Select
                  value={formData.turno}
                  onValueChange={(value: 'Manha' | 'Tarde' | 'Noite') =>
                    setFormData((prev) => ({ ...prev, turno: value }))
                  }
                  disabled={somenteConsulta}
                >
                  <SelectTrigger id="turno">
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manha">Manhã</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                    <SelectItem value="Noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'ativo' | 'inativo') =>
                      setFormData((prev) => ({ ...prev, status: value }))
                    }
                    disabled={somenteConsulta}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <h2 className="font-display font-semibold text-lg text-foreground mb-4">
              Endereço
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  name="endereco"
                  placeholder="Rua, número, complemento"
                  value={formData.endereco}
                  onChange={handleChange}
                  disabled={somenteConsulta}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  name="cidade"
                  placeholder="Cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  disabled={somenteConsulta}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  name="estado"
                  placeholder="Estado"
                  value={formData.estado}
                  onChange={handleChange}
                  disabled={somenteConsulta}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  name="cep"
                  placeholder="00000-000"
                  value={formData.cep}
                  onChange={handleChange}
                  disabled={somenteConsulta}
                />
              </div>
            </div>
          </div>

          {/* Password - oculto para Secretaria (sem acesso à senha) */}
          {!somenteConsulta && (
          <div className="bg-card rounded-xl p-6 border border-border/50">
            <h2 className="font-display font-semibold text-lg text-foreground mb-4">
              Senha de Acesso
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Senha *</Label>
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.senha}
                  onChange={handleChange}
                  required={!isEditing}
                />
                <p className="text-xs text-muted-foreground">
                  {isEditing
                    ? 'Preencha somente se desejar alterar a senha'
                    : 'Use maiúsculas, minúsculas e números'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                <Input
                  id="confirmarSenha"
                  name="confirmarSenha"
                  type="password"
                  placeholder="Digite novamente"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  required={!isEditing}
                />
              </div>
            </div>
          </div>
          )}

          {/* Subjects (only for teachers) */}
          {formData.perfil === String(UserProfile.PROFESSOR) && (
            <div className="bg-card rounded-xl p-6 border border-border/50">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">
                Matérias Lecionadas
              </h2>
              {disciplinasCadastradas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma disciplina cadastrada ainda.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {disciplinasCadastradas.map((disciplina) => (
                    <div
                      key={disciplina.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`disciplina-${disciplina.id}`}
                        checked={formData.materias.includes(disciplina.nome)}
                        onCheckedChange={() => handleMateriaToggle(disciplina.nome)}
                        disabled={somenteConsulta}
                      />
                      <label
                        htmlFor={`disciplina-${disciplina.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {disciplina.nome}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {formData.perfil === String(UserProfile.PROFESSOR) && (
            <div className="bg-card rounded-xl p-6 border border-border/50">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">
                Turmas Lecionadas
              </h2>
              {turmasCadastradas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma turma cadastrada ainda.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {turmasCadastradas.map((turma) => (
                    <div
                      key={turma.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`turma-${turma.id}`}
                        checked={formData.turmas.includes(turma.nome)}
                        onCheckedChange={() => handleTurmaToggle(turma.nome)}
                        disabled={somenteConsulta}
                      />
                      <label
                        htmlFor={`turma-${turma.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {turma.nome}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link to="/usuario-listar">
              <Button type="button" variant="outline">
                {somenteConsulta ? 'Voltar' : 'Cancelar'}
              </Button>
            </Link>
            {!somenteConsulta && (
            <Button type="submit" variant="gradient" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Salvar Alterações' : 'Salvar Usuário'}
                </>
              )}
            </Button>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default UserForm;
