CREATE TABLE IF NOT EXISTS instituicao (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(32),
    telefone VARCHAR(32),
    email VARCHAR(255),
    endereco VARCHAR(255),
    numero VARCHAR(32),
    complemento VARCHAR(255),
    bairro VARCHAR(255),
    cidade VARCHAR(255),
    estado VARCHAR(8),
    cep VARCHAR(16)
);

INSERT INTO instituicao (
    id,
    nome,
    cnpj,
    telefone,
    email,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep
)
SELECT
    1,
    'Escola Classe 360',
    '',
    '',
    'contato@classe360.com',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
WHERE NOT EXISTS (SELECT 1 FROM instituicao);

SELECT setval('instituicao_id_seq', COALESCE((SELECT MAX(id) FROM instituicao), 1));
