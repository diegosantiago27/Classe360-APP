-- Execute este script no PostgreSQL se o cadastro retornar erro 500
-- Adiciona colunas de dados pessoais na tabela usuario (caso o Liquibase não tenha rodado)

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS data_nascimento VARCHAR(50);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS telefone VARCHAR(50);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS rua VARCHAR(255);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS complemento VARCHAR(255);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS bairro VARCHAR(255);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS cidade VARCHAR(255);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS cep VARCHAR(20);
