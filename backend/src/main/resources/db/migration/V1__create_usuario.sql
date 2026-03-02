CREATE TABLE IF NOT EXISTS usuario (
    id BIGSERIAL PRIMARY KEY,
    cpf VARCHAR(255) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

INSERT INTO usuario (id, cpf, nome, email, senha, role, ativo, created_at, updated_at)
VALUES (1, '00000000000', 'Administrador', 'admin@classe360.com', '$2a$10$hashedpassword', 'ROLE_ADMIN', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
