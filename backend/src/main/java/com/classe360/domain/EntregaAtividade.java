package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EntregaAtividade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Atividade atividade;

    @ManyToOne(optional = false)
    private Usuario aluno;

    private String resposta;

    private Double nota;

    @Column(nullable = false)
    private Boolean corrigido;
}