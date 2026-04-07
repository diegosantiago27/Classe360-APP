CREATE TABLE IF NOT EXISTS preferencia_usuario (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    notificacoes BOOLEAN NOT NULL DEFAULT true,
    emails BOOLEAN NOT NULL DEFAULT true,
    modo_escuro BOOLEAN NOT NULL DEFAULT false,
    duplo_fator BOOLEAN NOT NULL DEFAULT false
);
