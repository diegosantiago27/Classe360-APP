# Backend (Classe360)

Backend pequeno para o front React/Vite deste repositório.

## Como rodar

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Servidor padrão em `http://localhost:4000`.

## Endpoints

- `GET /health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/password-recovery`
- `GET /api/v1/storage/:key`
- `PUT /api/v1/storage/:key`
- `DELETE /api/v1/storage/:key`

## Observação

Os dados são persistidos em um arquivo JSON (configurável via `DB_PATH`).
