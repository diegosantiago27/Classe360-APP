import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadFromStorage } from '@/lib/mockStorage';

interface Aviso {
  id: string;
}

const avisosStorageKey = 'school-compass:avisos';
const avisosLidosKey = 'school-compass:avisos-lidos';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const showAttention = useMemo(() => {
    const avisos = loadFromStorage<Aviso[]>(avisosStorageKey, []);
    if (!user?.id) return avisos.length > 0;
    const lidos = loadFromStorage<Record<string, string[]>>(avisosLidosKey, {});
    const lidosUsuario = new Set(lidos[user.id] ?? []);
    return avisos.some((aviso) => !lidosUsuario.has(aviso.id));
  }, [user?.id]);

  return (
    <header className="h-16 bg-card border-b border-border px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2 w-72">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar..."
            className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/avisos">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {showAttention && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </Button>
        </Link>

        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Olá,</span>
          <span className="font-medium">{user?.nome.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
