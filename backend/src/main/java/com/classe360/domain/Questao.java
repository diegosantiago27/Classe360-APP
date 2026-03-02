package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Questao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Prova prova;

    @Column(nullable = false)
    private String enunciado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoQuestao tipo;

    @ElementCollection
    private List<String> alternativas;

    private String respostaCorreta;

    public enum TipoQuestao {
        MULTIPLA_ESCOLHA,
        ABERTA
    }
}