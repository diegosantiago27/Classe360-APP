# Como Rodar o Classe 360 Localmente

Este guia considera um PC novo, com o projeto recém-baixado.

## Pré-Requisitos

- **Java 17**
- **Node.js 18+**
- **Docker Desktop** rodando
- **Git**

## Fluxo Do Sistema

1. O usuário faz cadastro.
2. O cadastro fica pendente de aprovação.
3. Um administrador aprova a solicitação.
4. O usuário aprovado consegue fazer login.

## 1. Configurar O Frontend

Na raiz do projeto, crie o arquivo `.env` a partir do exemplo:

```powershell
cd C:\Workspace\Classe360-APP
copy .env.example .env
```

Confirme que o `.env` contém:

```env
VITE_API_URL=http://localhost:8080
```

> Sempre que criar ou alterar o `.env`, reinicie o frontend. O Vite só carrega variáveis de ambiente ao iniciar.

## 2. Subir O Banco PostgreSQL

Com o Docker Desktop aberto, rode:

```powershell
cd C:\Workspace\Classe360-APP\backend
docker compose -f src/main/docker/services.yml up -d
```

Configuração local do banco:

| Campo | Valor |
|-------|-------|
| Host | `localhost` |
| Porta | `5432` |
| Banco | `classe360` |
| Usuário | `postgres` |
| Senha | `postgres` |

Essa configuração precisa bater com `backend/src/main/resources/config/application-dev.yml`.

## 3. Iniciar O Backend

Em um terminal, rode:

```powershell
cd C:\Workspace\Classe360-APP\backend
.\mvnw.cmd -ntp spring-boot:run
```

O projeto já usa o perfil `dev` por padrão. Se quiser forçar explicitamente no PowerShell:

```powershell
.\mvnw.cmd -ntp spring-boot:run "-Dspring-boot.run.profiles=dev"
```

Quando estiver correto, o log deve mostrar:

```text
Profile(s): [dev, api-docs]
Application 'classe360' is running!
Local: http://localhost:8080/
```

O Liquibase cria/atualiza as tabelas automaticamente ao iniciar.

## 4. Iniciar O Frontend

Em outro terminal, na raiz do projeto:

```powershell
cd C:\Workspace\Classe360-APP
npm install
npm run dev
```

O frontend fica em:

```text
http://localhost:3000
```

## 5. Login Local

No perfil `dev`, usuários de demonstração são criados automaticamente quando o backend inicia, se ainda não existirem.

Todos usam a senha:

```text
admin@Classe360
```

| Perfil | CPF | Nome |
|--------|-----|------|
| Administrador | `111.111.111-11` | Administrador |
| Administrador | `222.222.222-22` | João Santos |
| Gestor | `999.999.999-99` | Maria Silva |
| Professor | `333.333.333-33` | Ana Costa |
| Aluno | `444.444.444-44` | Pedro Oliveira |
| Professor inativo | `555.555.555-55` | Carlos Mendes |
| Aluno | `666.666.666-66` | Lucia Ferreira |
| Aluno | `777.777.777-77` | Roberto Lima |
| Professor | `888.888.888-88` | Fernanda Souza |

O login do frontend usa a tabela `usuario`, não a tabela `jhi_user`.

Para conferir no pgAdmin:

```sql
SELECT id, cpf, nome, email, role, ativo
FROM usuario
ORDER BY id;
```

## Problemas Comuns

### Backend Não Conecta No Banco

Verifique se o PostgreSQL está rodando na porta `5432` e se a senha é `postgres`.

Se você já tinha um container antigo com outra senha, recrie o volume local:

```powershell
cd C:\Workspace\Classe360-APP\backend
docker compose -f src/main/docker/services.yml down -v
docker compose -f src/main/docker/services.yml up -d
```

### Frontend Mostra Erro E Não Chega Log No Backend

Geralmente o `.env` não existe ou o frontend não foi reiniciado depois de criá-lo.

Confirme:

```env
VITE_API_URL=http://localhost:8080
```

Depois reinicie:

```powershell
npm run dev
```

### Login Retorna CPF Ou Senha Inválidos

Confira se está usando a tabela `usuario`:

```sql
SELECT id, cpf, nome, role, ativo
FROM usuario
ORDER BY id;
```

Use um CPF ativo e a senha `admin@Classe360`.
