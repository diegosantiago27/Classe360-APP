import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const PasswordRecovery: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    toast({
      title: 'Solicitacao enviada',
      description: 'Se o usuario existir, enviaremos instrucoes em instantes.',
    });

    setIdentifier('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">
              EduGestao
            </h1>
            <p className="text-sm text-muted-foreground">
              Recuperacao de senha
            </p>
          </div>
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Redefinir senha</CardTitle>
            <CardDescription>
              Informe seu CPF ou email para receber as instrucoes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">CPF ou email</Label>
                <div className="relative">
                  <Input
                    id="identifier"
                    placeholder="000.000.000-00 ou email@dominio.com"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    required
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <Button type="submit" variant="gradient" className="w-full">
                Enviar instrucoes
              </Button>
            </form>
          </CardContent>
        </Card>

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
