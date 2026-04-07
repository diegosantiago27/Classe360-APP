import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
} from 'lucide-react';
import { UserProfile, getProfileLabel, getProfileColor } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { loadFromStorage, saveToStorage } from '@/lib/mockStorage';
import { defaultUsers, usersStorageKey, StoredUser } from '@/lib/mockUsers';
import { Loader2 } from 'lucide-react';
import { deleteUsuarioApi, isApiEnabled, listUsuariosApi } from '@/lib/entityCrudApi';

function roleToPerfil(role: string): UserProfile {
  switch (role) {
    case 'ROLE_GESTOR':
      return UserProfile.GESTOR;
    case 'ROLE_ADMIN':
    case 'ADMIN':
      return UserProfile.ADMINISTRADOR;
    case 'ROLE_SECRETARIA':
      return UserProfile.SECRETARIA;
    case 'ROLE_PROFESSOR':
      return UserProfile.PROFESSOR;
    case 'ROLE_ALUNO':
    default:
      return UserProfile.ALUNO;
  }
}

const UserList: React.FC = () => {
  const { user } = useAuth();
  const podeDeletar = user?.perfil !== UserProfile.GESTOR && user?.perfil !== UserProfile.SECRETARIA;
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [loading, setLoading] = useState(isApiEnabled());
  const [searchTerm, setSearchTerm] = useState('');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!isApiEnabled()) {
      setUsers(loadFromStorage<StoredUser[]>(usersStorageKey, defaultUsers));
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listUsuariosApi()
      .then((content) => {
        if (cancelled) return;
        const mapped: StoredUser[] = content.map((u) => ({
          id: String(u.id ?? ''),
          cpf: u.cpf ?? '',
          nome: u.nome ?? '',
          email: u.email ?? '',
          perfil: roleToPerfil(u.role ?? 'ROLE_ALUNO'),
          turno: u.turno as StoredUser['turno'] | undefined,
          status: u.ativo ? 'ativo' : 'inativo',
        }));
        setUsers(mapped);
        saveToStorage(usersStorageKey, mapped);
      })
      .catch(() => {
        if (!cancelled) {
          window.alert('Não foi possível carregar usuários. Verifique a API e tente novamente.');
          setUsers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.cpf.includes(searchTerm);
      const matchesProfile =
        profileFilter === 'all' || user.perfil === Number(profileFilter);
      return matchesSearch && matchesProfile;
    });
  }, [users, searchTerm, profileFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, profileFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getProfileBadgeClass = (perfil: UserProfile) => {
    const color = getProfileColor(perfil);
    return `profile-${color}`;
  };

  const handleDelete = async (userToDelete: StoredUser) => {
    const confirmed = window.confirm(
      `Deseja remover o usuário ${userToDelete.nome}?`,
    );
    if (!confirmed) return;
    if (isApiEnabled()) {
      try {
        const idNum = Number(userToDelete.id);
        if (Number.isFinite(idNum)) {
          await deleteUsuarioApi(idNum);
          setUsers((prev) => {
            const updated = prev.filter((u) => u.id !== userToDelete.id);
            return updated;
          });
        }
      } catch {
        window.alert('Não foi possível remover o usuário. Verifique a API e tente novamente.');
      }
      return;
    }
    const updated = users.filter((item) => item.id !== userToDelete.id);
    setUsers(updated);
    saveToStorage(usersStorageKey, updated);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-3xl text-foreground mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Usuários
          </h1>
          <p className="text-muted-foreground">
            Gerencie os usuários do sistema escolar
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={profileFilter} onValueChange={setProfileFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os perfis</SelectItem>
                  <SelectItem value={String(UserProfile.GESTOR)}>Gestor</SelectItem>
                  <SelectItem value={String(UserProfile.ADMINISTRADOR)}>Administrador</SelectItem>
                  <SelectItem value={String(UserProfile.PROFESSOR)}>Professor</SelectItem>
                  <SelectItem value={String(UserProfile.ALUNO)}>Aluno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{user.nome}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.cpf}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          getProfileBadgeClass(user.perfil)
                        )}
                      >
                        {getProfileLabel(user.perfil)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.turno === 'Manha' ? 'Manhã' : user.turno === 'Tarde' ? 'Tarde' : user.turno === 'Noite' ? 'Noite' : '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          user.status === 'ativo'
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {user.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/usuario-criar-novo?id=${user.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        {podeDeletar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(user)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          )}

          {/* Pagination */}
          {!loading && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length === 0
                ? 'Nenhum usuário para exibir'
                : `Mostrando ${(currentPage - 1) * itemsPerPage + 1} a ${Math.min(
                    currentPage * itemsPerPage,
                    filteredUsers.length
                  )} de ${filteredUsers.length} usuários`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages || filteredUsers.length === 0}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserList;
