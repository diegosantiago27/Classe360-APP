import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { UserProfile } from "@/types/auth";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProfessorDashboard from "./pages/ProfessorDashboard";
import AlunoDashboard from "./pages/AlunoDashboard";
import UserList from "./pages/UserList";
import UserForm from "./pages/UserForm";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import PasswordRecovery from "./pages/PasswordRecovery";
import Turmas from "./pages/Turmas";
import Disciplinas from "./pages/Disciplinas";
import Periodos from "./pages/Periodos";
import Notas from "./pages/Notas";
import Frequencia from "./pages/Frequencia";
import Provas from "./pages/Provas";
import NovaProva from "./pages/NovaProva";
import Avisos from "./pages/Avisos";
import Materiais from "./pages/Materiais";
import MinhasMaterias from "./pages/MinhasMaterias";
import MinhasNotas from "./pages/MinhasNotas";
import MinhaFrequencia from "./pages/MinhaFrequencia";
import Atividades from "./pages/Atividades";
import NovaAtividade from "./pages/NovaAtividade";
import AtividadeRealizar from "./pages/AtividadeRealizar";
import NotaTurma from "./pages/NotaTurma";
import Perfil from "./pages/Perfil";
import Configuracoes from "./pages/Configuracoes";
import DadosInstituicao from "./pages/DadosInstituicao";
import SolicitacoesCadastro from "./pages/SolicitacoesCadastro";
import Correcoes from "./pages/Correcoes";
import CorrecoesDetalhe from "./pages/CorrecoesDetalhe";
import Agenda from "./pages/Agenda";
import Relatorios from "./pages/Relatorios";
import ProvasAluno from "./pages/ProvasAluno";
import ProvaRealizar from "./pages/ProvaRealizar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/recuperar-senha" element={<PasswordRecovery />} />
            
            {/* Protected routes */}
            <Route
              path="/index"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/professor-dashboard"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.PROFESSOR,
                  ]}
                >
                  <ProfessorDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/aluno-dashboard"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.ALUNO,
                  ]}
                >
                  <AlunoDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/usuario-listar"
              element={
                <ProtectedRoute
                  allowedProfiles={[UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.SECRETARIA]}
                >
                  <UserList />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/usuario-criar-novo"
              element={
                <ProtectedRoute
                  allowedProfiles={[UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.SECRETARIA]}
                >
                  <UserForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="/solicitacoes-cadastro"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.SECRETARIA,
                  ]}
                >
                  <SolicitacoesCadastro />
                </ProtectedRoute>
              }
            />

            <Route
              path="/turmas"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.PROFESSOR,
                    UserProfile.SECRETARIA,
                  ]}
                >
                  <Turmas />
                </ProtectedRoute>
              }
            />

            <Route
              path="/disciplinas"
              element={
                <ProtectedRoute
                  allowedProfiles={[UserProfile.GESTOR, UserProfile.ADMINISTRADOR]}
                >
                  <Disciplinas />
                </ProtectedRoute>
              }
            />

            <Route
              path="/periodos"
              element={
                <ProtectedRoute
                  allowedProfiles={[UserProfile.GESTOR, UserProfile.ADMINISTRADOR, UserProfile.SECRETARIA]}
                >
                  <Periodos />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notas"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.PROFESSOR,
                    UserProfile.SECRETARIA,
                  ]}
                >
                  <Notas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notas/:id"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.PROFESSOR,
                    UserProfile.SECRETARIA,
                  ]}
                >
                  <NotaTurma />
                </ProtectedRoute>
              }
            />

            <Route
              path="/frequencia"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.PROFESSOR,
                    UserProfile.SECRETARIA,
                  ]}
                >
                  <Frequencia />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provas"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.PROFESSOR,
                  ]}
                >
                  <Provas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provas/nova"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.PROFESSOR]}>
                  <NovaProva />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provas-aluno"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.ALUNO]}>
                  <ProvasAluno />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provas/:id"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.ALUNO]}>
                  <ProvaRealizar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.PROFESSOR]}>
                  <Agenda />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.PROFESSOR]}>
                  <Relatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/correcoes"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.PROFESSOR]}>
                  <Correcoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/correcoes/detalhe"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.PROFESSOR]}>
                  <CorrecoesDetalhe />
                </ProtectedRoute>
              }
            />

            <Route
              path="/avisos"
              element={
                <ProtectedRoute>
                  <Avisos />
                </ProtectedRoute>
              }
            />

            <Route
              path="/materiais"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.PROFESSOR,
                  ]}
                >
                  <Materiais />
                </ProtectedRoute>
              }
            />

            <Route
              path="/minhas-materias"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.ALUNO]}>
                  <MinhasMaterias />
                </ProtectedRoute>
              }
            />

            <Route
              path="/minhas-notas"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.ALUNO]}>
                  <MinhasNotas />
                </ProtectedRoute>
              }
            />

            <Route
              path="/minha-frequencia"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.ALUNO]}>
                  <MinhaFrequencia />
                </ProtectedRoute>
              }
            />

            <Route
              path="/atividades"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.PROFESSOR,
                    UserProfile.ALUNO,
                  ]}
                >
                  <Atividades />
                </ProtectedRoute>
              }
            />

            <Route
              path="/atividades/:id"
              element={
                <ProtectedRoute allowedProfiles={[UserProfile.ALUNO]}>
                  <AtividadeRealizar />
                </ProtectedRoute>
              }
            />

            <Route
              path="/atividades/nova"
              element={
                <ProtectedRoute
                  allowedProfiles={[
                    UserProfile.GESTOR,
                    UserProfile.ADMINISTRADOR,
                    UserProfile.PROFESSOR,
                  ]}
                >
                  <NovaAtividade />
                </ProtectedRoute>
              }
            />

            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Perfil />
                </ProtectedRoute>
              }
            />

            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dados-instituicao"
              element={
                <ProtectedRoute>
                  <DadosInstituicao />
                </ProtectedRoute>
              }
            />

            {/* Root route */}
            <Route path="/" element={<Index />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
