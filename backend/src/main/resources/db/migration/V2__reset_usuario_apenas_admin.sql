-- Remove tabela usuario existente (pode ter schema de outro projeto)
-- CASCADE remove FKs que referenciam usuario
DROP TABLE IF EXISTS usuario CASCADE;

-- Recria tabela com schema do Classe360
CREATE TABLE usuario (
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

-- Insere APENAS o usuário administrador (senha: admin123)
INSERT INTO usuario (id, cpf, nome, email, senha, role, ativo, created_at, updated_at)
VALUES (1, '00000000000', 'Administrador', 'admin@classe360.com', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'ROLE_ADMIN', true, NOW(), NOW());

-- Reseta a sequência para o próximo ID ser 2
SELECT setval('usuario_id_seq', 1);
