package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prova {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    private String descricao;

    @ManyToOne(optional = false)
    private Turma turma;

    @ManyToOne(optional = false)
    private Disciplina disciplina;

    @ManyToOne(optional = false)
    private Usuario professor;

    @Column(nullable = false)
    private LocalDate data;

    @Column(nullable = false)
    private Boolean ativa;

    private String periodo;

    private String horario;

    @Column(length = 4000)
    private String instrucoes;

    private String status;

    @Column(nullable = false)
    @Builder.Default
    private Boolean publicada = false;

    private String turno;

    @PrePersist
    @PreUpdate
    private void ensureDefaults() {
        if (publicada == null) publicada = false;
        if (ativa == null) ativa = true;
        if (status == null || status.isBlank()) status = "Agendada";
    }
}