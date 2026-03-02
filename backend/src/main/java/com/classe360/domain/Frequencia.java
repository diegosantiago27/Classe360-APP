package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Frequencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Usuario aluno;

    @ManyToOne(optional = false)
    private Turma turma;

    @ManyToOne(optional = false)
    private Disciplina disciplina;

    @Column(nullable = false)
    private LocalDate data;

    @Column(nullable = false)
    private Boolean presente;
}