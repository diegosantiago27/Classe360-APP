package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvaResposta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Prova prova;

    @ManyToOne(optional = false)
    private Usuario aluno;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private Double pontosMaximos;

    @Column(nullable = false)
    private Double pontosObtidos;

    private Double notaFinal;

    @Column(nullable = false)
    private LocalDateTime enviadoEm;

    private LocalDateTime corrigidoEm;

    @Column(nullable = false)
    private Boolean finalizadaPorTempo;

    @Column(nullable = false, length = 100000)
    private String respostasJson;
}
