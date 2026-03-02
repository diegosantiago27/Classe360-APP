package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Nota {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Usuario aluno;

    @ManyToOne(optional = false)
    private Turma turma;

    @ManyToOne(optional = false)
    private Disciplina disciplina;

    @ManyToOne(optional = false)
    private Periodo periodo;

    @Column(nullable = false)
    private Double valor;
}