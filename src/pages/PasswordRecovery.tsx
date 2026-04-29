import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, Mail } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmacaoSenha, setMostrarConfirmacaoSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const senhasConferem = novaSenha.length > 0 && confirmarSenha.length > 0 && novaSenha === confirmarSenha;
  const senhasDiferentes = confirmarSenha.length > 0 && novaSenha !== confirmarSenha;

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
    if (!email.trim()) return;
    setLoading(true);
    try {
      await postJson('/api/v1/auth/recuperar-senha', { email: email.trim() });
      toast({
        title: 'Código solicitado',
        description: 'Se o email estiver cadastrado, enviaremos um código',
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

  const handleValidarCodigo = async (event: React.FormEvent) => {
    event.preventDefault();
    const codigoNorm = codigo.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(codigoNorm)) {
      toast({
        title: 'Código inválido',
        description: 'Informe os 6 dígitos enviados ao seu email.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      await postJson('/api/v1/auth/verificar-codigo', { email: email.trim(), codigo: codigoNorm });
      toast({
        title: 'Código validado',
        description: 'Agora você pode cadastrar sua nova senha.',
      });
      setStep(3);
    } catch (e) {
      toast({
        title: 'Não foi possível validar',
        description: e instanceof Error ? e.message : 'Código inválido ou expirado',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedefinir = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step !== 3) {
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }
    if (novaSenha.length < 8) {
      toast({
        title: 'Erro',
        description: 'A senha deve conter no mínimo 8 caracteres',
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
      await postJson('/api/v1/auth/resetar-senha', {
        email: email.trim(),
        codigo: codigoNorm,
        novaSenha,
      });
      toast({
        title: 'Senha alterada',
        description: 'Você já pode entrar com a nova senha.',
      });
      navigate('/login');
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
              <CardTitle>Recuperar senha</CardTitle>
              <CardDescription>
                Informe seu email cadastrado para receber o código de verificação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEnviarCodigo} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      placeholder="email@dominio.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                    <Mail className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Se o email estiver cadastrado, enviaremos um código</p>
                <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Enviar código
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Validar código
              </CardTitle>
              <CardDescription>Digite o código de 6 dígitos recebido no seu email.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleValidarCodigo} className="space-y-4">
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
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={loading}
                    onClick={() => {
                      setStep(1);
                      setCodigo('');
                    }}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-1" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Validar código
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Redefinir senha
              </CardTitle>
              <CardDescription>Defina sua nova senha para concluir a recuperação.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRedefinir} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="novaSenha">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="novaSenha"
                      type={mostrarNovaSenha ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarNovaSenha((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={mostrarNovaSenha ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                    >
                      {mostrarNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmarSenha"
                      type={mostrarConfirmacaoSenha ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repita a nova senha"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmacaoSenha((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={mostrarConfirmacaoSenha ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                    >
                      {mostrarConfirmacaoSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {senhasConferem ? (
                    <p className="text-xs text-green-600">As senhas conferem.</p>
                  ) : null}
                  {senhasDiferentes ? (
                    <p className="text-xs text-red-600">As senhas não coincidem.</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={loading}
                    onClick={() => {
                      setStep(2);
                      setNovaSenha('');
                      setConfirmarSenha('');
                    }}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-1" disabled={loading || senhasDiferentes}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Redefinir senha
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

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
