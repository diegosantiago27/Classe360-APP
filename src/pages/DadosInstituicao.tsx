import React, { useEffect, useState } from 'react';
import { Building2, Save, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import {
  defaultInstituicao,
  instituicaoStorageKey,
  DadosInstituicao,
} from '@/lib/mockInstituicao';

const DadosInstituicaoPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const podeEditar =
    user?.perfil === UserProfile.GESTOR || user?.perfil === UserProfile.ADMINISTRADOR;

  const [formData, setFormData] = useState<DadosInstituicao>(defaultInstituicao);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = loadFromStorage<DadosInstituicao | null>(instituicaoStorageKey, null);
    if (stored) {
      setFormData(stored);
    } else {
      setFormData(defaultInstituicao);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8)
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12)
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleChangeFormatted = (
    e: React.ChangeEvent<HTMLInputElement>,
    formatter: (v: string) => string,
    maxLen: number
  ) => {
    const { name, value } = e.target;
    const formatted = formatter(value);
    if (formatted.replace(/\D/g, '').length > maxLen) return;
    setFormData((prev) => ({ ...prev, [name]: formatted }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeEditar) return;
    setIsLoading(true);
    saveToStorage(instituicaoStorageKey, formData);
    toast({
      title: 'Dados salvos',
      description: 'Os dados da instituição foram atualizados.',
    });
    setIsLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            Dados da Instituição
          </h1>
          <p className="text-muted-foreground mt-1">
            {podeEditar
              ? 'Edite as informações da instituição de ensino.'
              : 'Visualize os dados cadastrais da instituição.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Informações da Instituição</CardTitle>
              <CardDescription>
                Nome, CNPJ e dados de contato da escola.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="nome">Nome da Instituição *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Nome da escola"
                    disabled={!podeEditar}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleChangeFormatted(e, formatCnpj, 14)}
                    placeholder="00.000.000/0001-00"
                    disabled={!podeEditar}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleChangeFormatted(e, formatPhone, 11)}
                    placeholder="(00) 00000-0000"
                    disabled={!podeEditar}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="contato@escola.com"
                    disabled={!podeEditar}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>
                Endereço completo da instituição.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="endereco">Logradouro</Label>
                  <Input
                    id="endereco"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleChange}
                    placeholder="Rua, Avenida..."
                    disabled={!podeEditar}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    placeholder="Nº"
                    disabled={!podeEditar}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    placeholder="Sala, bloco..."
                    disabled={!podeEditar}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    placeholder="Bairro"
                    disabled={!podeEditar}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={(e) => handleChangeFormatted(e, formatCep, 8)}
                    placeholder="00000-000"
                    disabled={!podeEditar}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    placeholder="Cidade"
                    disabled={!podeEditar}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    placeholder="UF"
                    maxLength={2}
                    disabled={!podeEditar}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {podeEditar && (
            <div className="mt-6 flex justify-end">
              <Button type="submit" variant="gradient" disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
};

export default DadosInstituicaoPage;
