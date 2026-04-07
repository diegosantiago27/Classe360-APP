import React, { useEffect, useState } from 'react';
import { Bell, Moon, Shield } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { getPreferenciasApi, isApiEnabled, savePreferenciasApi } from '@/lib/entityCrudApi';

interface Preferencias {
  notificacoes: boolean;
  emails: boolean;
  modoEscuro: boolean;
  duploFator: boolean;
}

const storageKey = 'school-compass:configuracoes';

const Configuracoes: React.FC = () => {
  const { toast } = useToast();
  const [notificacoes, setNotificacoes] = useState(true);
  const [emails, setEmails] = useState(true);
  const [modoEscuro, setModoEscuro] = useState(false);
  const [duploFator, setDuploFator] = useState(false);

  useEffect(() => {
    if (isApiEnabled()) {
      void getPreferenciasApi()
        .then((row) => {
          const mapped: Preferencias = {
            notificacoes: row.notificacoes ?? true,
            emails: row.emails ?? true,
            modoEscuro: row.modoEscuro ?? false,
            duploFator: row.duploFator ?? false,
          };
          setNotificacoes(mapped.notificacoes);
          setEmails(mapped.emails);
          setModoEscuro(mapped.modoEscuro);
          setDuploFator(mapped.duploFator);
          saveToStorage(storageKey, mapped);
        })
        .catch(() => {
          toast({
            title: 'Erro ao carregar',
            description: 'Nao foi possivel carregar preferencias do servidor.',
            variant: 'destructive',
          });
        });
      return;
    }
    void syncKeysFromBackend([storageKey]).finally(() => {
      const stored = loadFromStorage<Preferencias | null>(storageKey, null);
      if (!stored) return;
      setNotificacoes(stored.notificacoes);
      setEmails(stored.emails);
      setModoEscuro(stored.modoEscuro);
      setDuploFator(stored.duploFator);
    });
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: Preferencias = {
      notificacoes,
      emails,
      modoEscuro,
      duploFator,
    };
    if (isApiEnabled()) {
      try {
        const saved = await savePreferenciasApi(payload);
        saveToStorage<Preferencias>(storageKey, {
          notificacoes: saved.notificacoes ?? notificacoes,
          emails: saved.emails ?? emails,
          modoEscuro: saved.modoEscuro ?? modoEscuro,
          duploFator: saved.duploFator ?? duploFator,
        });
      } catch {
        toast({
          title: 'Erro ao salvar',
          description: 'Nao foi possivel salvar as preferencias no servidor.',
          variant: 'destructive',
        });
        return;
      }
    } else {
      saveToStorage<Preferencias>(storageKey, payload);
    }
    toast({
      title: 'Configuracoes salvas',
      description: 'Suas preferencias foram atualizadas.',
    });
  };

  const handleReset = () => {
    const defaults: Preferencias = {
      notificacoes: true,
      emails: true,
      modoEscuro: false,
      duploFator: false,
    };
    setNotificacoes(defaults.notificacoes);
    setEmails(defaults.emails);
    setModoEscuro(defaults.modoEscuro);
    setDuploFator(defaults.duploFator);
    if (isApiEnabled()) {
      void savePreferenciasApi(defaults).catch(() => {
        toast({
          title: 'Erro ao restaurar',
          description: 'Nao foi possivel restaurar as preferencias no servidor.',
          variant: 'destructive',
        });
      });
    } else {
      saveToStorage(storageKey, defaults);
    }
    toast({
      title: 'Preferencias restauradas',
      description: 'As configuracoes voltaram ao padrao.',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Configuracoes
          </h1>
          <p className="text-muted-foreground">
            Ajuste preferencias gerais do sistema e notificacoes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notificacoes
              </CardTitle>
              <CardDescription>
                Escolha como deseja receber avisos e atualizacoes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notificacoes" className="text-sm text-muted-foreground">
                  Notificacoes no sistema
                </Label>
                <Switch
                  id="notificacoes"
                  checked={notificacoes}
                  onCheckedChange={setNotificacoes}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="emails" className="text-sm text-muted-foreground">
                  Receber emails semanais
                </Label>
                <Switch id="emails" checked={emails} onCheckedChange={setEmails} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-accent" />
                Aparencia
              </CardTitle>
              <CardDescription>
                Personalize o modo de exibicao da plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="modoEscuro" className="text-sm text-muted-foreground">
                  Ativar modo escuro
                </Label>
                <Switch
                  id="modoEscuro"
                  checked={modoEscuro}
                  onCheckedChange={setModoEscuro}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-warning" />
                Seguranca
              </CardTitle>
              <CardDescription>
                Configure a camada extra de protecao para sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="duploFator" className="text-sm text-muted-foreground">
                  Habilitar autenticacao em dois fatores
                </Label>
                <Switch
                  id="duploFator"
                  checked={duploFator}
                  onCheckedChange={setDuploFator}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleReset}>
                Restaurar padrao
              </Button>
              <Button type="submit" variant="gradient">
                Salvar configuracoes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;
