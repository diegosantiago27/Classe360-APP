import React, { useEffect, useState } from 'react';
import { Mail, Phone, UserCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';

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

const Perfil: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const storageKey = `school-compass:perfil:${user?.id ?? 'guest'}`;
  const [nome, setNome] = useState(user?.nome ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [telefone, setTelefone] = useState(user?.telefone ?? '');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [cep, setCep] = useState('');
  const [dataNascimento, setDataNascimento] = useState(user?.dataNascimento ?? '');

  useEffect(() => {
    const stored = loadFromStorage<PerfilData | null>(storageKey, null);
    if (!stored) return;
    setNome(stored.nome ?? '');
    setEmail(stored.email ?? '');
    setTelefone(stored.telefone ?? '');
    setRua(stored.rua ?? '');
    setNumero(stored.numero ?? '');
    setComplemento(stored.complemento ?? '');
    setBairro(stored.bairro ?? '');
    setCidade(stored.cidade ?? '');
    setCep(stored.cep ?? '');
    setDataNascimento(stored.dataNascimento ?? '');
  }, [storageKey]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    saveToStorage<PerfilData>(storageKey, {
      nome,
      email,
      telefone,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      cep,
      dataNascimento,
    });
    toast({
      title: 'Perfil atualizado',
      description: 'Seus dados foram salvos com sucesso.',
    });
  };

  const handleReset = () => {
    setNome(user?.nome ?? '');
    setEmail(user?.email ?? '');
    setTelefone(user?.telefone ?? '');
    setRua('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setCep('');
    setDataNascimento(user?.dataNascimento ?? '');
    saveToStorage<PerfilData>(storageKey, {
      nome: user?.nome ?? '',
      email: user?.email ?? '',
      telefone: user?.telefone ?? '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      cep: '',
      dataNascimento: user?.dataNascimento ?? '',
    });
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
      </div>
    </DashboardLayout>
  );
};

export default Perfil;
