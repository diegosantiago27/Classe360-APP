package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Atividade {

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

    @Column(nullable = false)
    private LocalDate dataEntrega;
}