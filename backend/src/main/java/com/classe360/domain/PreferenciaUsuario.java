package com.classe360.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "preferencia_usuario")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreferenciaUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false, unique = true)
    private Long usuarioId;

    @Column(nullable = false)
    private Boolean notificacoes;

    @Column(nullable = false)
    private Boolean emails;

    @Column(name = "modo_escuro", nullable = false)
    private Boolean modoEscuro;

    @Column(name = "duplo_fator", nullable = false)
    private Boolean duploFator;
}
