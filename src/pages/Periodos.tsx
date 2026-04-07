import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createId, loadFromStorage, saveToStorage, syncKeysFromBackend } from '@/lib/mockStorage';
import { CatalogItem, defaultPeriodos, periodosStorageKey } from '@/lib/mockAcademics';
import { deletePeriodoApi, isApiEnabled, listPeriodosApi, savePeriodoApi } from '@/lib/entityCrudApi';

const Periodos: React.FC = () => {
  const { user } = useAuth();
  const somenteConsulta = user?.perfil === UserProfile.SECRETARIA;
  const [periodos, setPeriodos] = useState<CatalogItem[]>(
    () => loadFromStorage<CatalogItem[]>(periodosStorageKey, isApiEnabled() ? [] : defaultPeriodos),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isApiEnabled()) {
      setLoading(true);
      void listPeriodosApi()
        .then((items) => {
          const mapped = items.map((item) => ({ id: String(item.id ?? createId('periodo')), nome: item.nome }));
          setPeriodos(mapped);
          saveToStorage(periodosStorageKey, mapped);
        })
        .catch(() => {
          window.alert('Não foi possível carregar os períodos. Verifique a API e tente novamente.');
        })
        .finally(() => setLoading(false));
      return;
    }
    void syncKeysFromBackend([periodosStorageKey]).finally(() => {
      setPeriodos(loadFromStorage<CatalogItem[]>(periodosStorageKey, defaultPeriodos));
    });
  }, []);

  const total = useMemo(() => periodos.length, [periodos]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setNome('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setNome(item.nome);
    setDialogOpen(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) return;

    if (isApiEnabled()) {
      setLoading(true);
      const payload = {
        id: editingId ? Number(editingId) : undefined,
        nome: trimmed,
      };
      void savePeriodoApi(payload)
        .then((saved) => {
          const savedRow: CatalogItem = {
            id: String(saved.id ?? editingId ?? createId('periodo')),
            nome: saved.nome,
          };
          const updated = editingId
            ? periodos.map((item) => (item.id === editingId ? savedRow : item))
            : [savedRow, ...periodos];
          setPeriodos(updated);
          saveToStorage(periodosStorageKey, updated);
          setDialogOpen(false);
        })
        .catch(() => {
          window.alert('Não foi possível salvar o período. Verifique a API e tente novamente.');
          setDialogOpen(false);
        })
        .finally(() => setLoading(false));
      return;
    }

    if (editingId) {
      const updated = periodos.map((item) =>
        item.id === editingId ? { ...item, nome: trimmed } : item,
      );
      setPeriodos(updated);
      saveToStorage(periodosStorageKey, updated);
    } else {
      const updated = [{ id: createId('periodo'), nome: trimmed }, ...periodos];
      setPeriodos(updated);
      saveToStorage(periodosStorageKey, updated);
    }

    setDialogOpen(false);
  };

  const handleDelete = (item: CatalogItem) => {
    const confirmed = window.confirm(`Deseja remover o periodo "${item.nome}"?`);
    if (!confirmed) return;
    if (isApiEnabled() && Number.isFinite(Number(item.id))) {
      setLoading(true);
      void deletePeriodoApi(Number(item.id))
        .catch(() => window.alert('Não foi possível remover o período. Verifique a API e tente novamente.'))
        .finally(() => setLoading(false));
    }
    if (!isApiEnabled()) {
      const updated = periodos.filter((row) => row.id !== item.id);
      setPeriodos(updated);
      saveToStorage(periodosStorageKey, updated);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Periodos
            </h1>
            <p className="text-muted-foreground">
              Cadastre os periodos usados para provas e notas.
            </p>
          </div>
          {!somenteConsulta && (
          <Button variant="gradient" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4" />
            Novo periodo
          </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de periodos
                </CardTitle>
                <div className="text-2xl font-semibold text-foreground">
                  {loading ? '...' : total}
                </div>
              </div>
              <Calendar className="w-5 h-5 text-primary" />
            </CardHeader>
          </Card>
        </div>

        {periodos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum periodo cadastrado. Clique em "Novo periodo".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {periodos.map((item) => (
              <Card key={item.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg">{item.nome}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  {!somenteConsulta && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(item)}>
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar periodo' : 'Novo periodo'}</DialogTitle>
            <DialogDescription>
              Informe o periodo conforme calendario escolar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex: 1º Bimestre"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="gradient">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Periodos;
