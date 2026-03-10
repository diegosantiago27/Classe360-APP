# Como rodar o Classe 360 com banco de dados

## Fluxo de cadastro com autorização

1. **Cadastro** → Dados vão para a tabela `cadastro_temporario` (aguardando aprovação)
2. **Admin autoriza** → Dados são transferidos para a tabela `usuario` (cadastro definitivo)
3. **Usuário aprovado** → Pode fazer login e acessar o sistema

## Pré-requisitos

- **Docker** (para o PostgreSQL)
- **Java 17**
- **Node.js** (para o frontend)

## Passos

### 1. Subir o banco de dados (PostgreSQL)

No terminal, na pasta do projeto:

```powershell
cd backend
docker compose -f src/main/docker/services.yml up -d
```

Ou: ao iniciar o backend, o Spring Boot pode subir o PostgreSQL automaticamente (se o Docker estiver rodando).

### 2. Iniciar o backend

```powershell
cd backend
.\mvnw.cmd -ntp --batch-mode
```

O backend deve estar rodando em **http://localhost:8080**.

### 3. Iniciar o frontend

Em outro terminal, na raiz do projeto:

```powershell
npm run dev
```

O frontend está em **http://localhost:3000**.

### 4. Login

Para acessar como administrador:

- **CPF:** 111.111.111-11
- **Senha:** admin@Classe360

## Configuração do banco

- **URL:** jdbc:postgresql://localhost:5432/classe360
- **Usuário:** postgres
- **Senha:** Postgres123

O arquivo `.env` na raiz do projeto já define `VITE_API_URL=http://localhost:8080` para o frontend usar o backend.
