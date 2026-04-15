import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { mensagemErroApi } from '@/lib/apiError';

const API_BASE =
  typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '';

const PasswordRecovery: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const postJson = async (path: string, body: object) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(mensagemErroApi(data, `Erro HTTP ${res.status}`));
    }
  };

  const handleEnviarCodigo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      await postJson('/api/v1/auth/forgot-password', { cpfOuEmail: identifier.trim() });
      toast({
        title: 'Verifique seu e-mail',
        description:
          'Se encontrarmos uma conta com esses dados, enviamos um código de 6 dígitos. Ele expira em 15 minutos.',
      });
      setStep(2);
    } catch (e) {
      toast({
        title: 'Erro',
        description: e instanceof Error ? e.message : 'Não foi possível enviar o código.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedefinir = async (event: React.FormEvent) => {
    event.preventDefault();
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
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    const codigoNorm = codigo.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(codigoNorm)) {
      toast({
        title: 'Código inválido',
        description: 'Informe os 6 dígitos enviados ao seu e-mail.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      await postJson('/api/v1/auth/reset-password', {
        cpfOuEmail: identifier.trim(),
        codigo: codigoNorm,
        novaSenha,
      });
      toast({
        title: 'Senha alterada',
        description: 'Você já pode entrar com a nova senha.',
      });
      setIdentifier('');
      setCodigo('');
      setNovaSenha('');
      setConfirmarSenha('');
      setStep(1);
    } catch (e) {
      toast({
        title: 'Não foi possível redefinir',
        description: e instanceof Error ? e.message : 'Tente novamente ou solicite um novo código.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-4">
          <img
            src="/360-08.png"
            alt="Classe 360"
            className="h-24 sm:h-28 w-auto max-w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/360-08.png';
            }}
          />
        </div>

        {step === 1 ? (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Redefinir senha</CardTitle>
              <CardDescription>
                Informe seu CPF ou e-mail cadastrado. Enviaremos um código de verificação para o e-mail da conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEnviarCodigo} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">CPF ou e-mail</Label>
                  <div className="relative">
                    <Input
                      id="identifier"
                      autoComplete="username"
                      placeholder="000.000.000-00 ou email@dominio.com"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      required
                    />
                    <Mail className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Enviar código por e-mail
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Informe o código e a nova senha
              </CardTitle>
              <CardDescription>
                Digite o código de 6 dígitos recebido no e-mail cadastrado e defina uma nova senha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRedefinir} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código de verificação</Label>
                  <Input
                    id="codigo"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={8}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="novaSenha">Nova senha</Label>
                  <Input
                    id="novaSenha"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                  <Input
                    id="confirmarSenha"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={loading}
                    onClick={() => {
                      setStep(1);
                      setCodigo('');
                      setNovaSenha('');
                      setConfirmarSenha('');
                    }}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-1" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Redefinir senha
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Lembrou sua senha?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Voltar ao login
            </Link>
          </p>
          <p className="mt-2">
            Primeiro acesso?{' '}
            <Link to="/cadastro" className="text-primary hover:underline font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordRecovery;
