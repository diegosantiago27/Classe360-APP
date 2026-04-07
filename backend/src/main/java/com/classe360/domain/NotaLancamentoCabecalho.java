package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "nota_lancamento_cabecalho",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_nota_lancamento_cabecalho_triple", columnNames = { "turma_id", "disciplina_id", "periodo_id" }),
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotaLancamentoCabecalho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "turma_id", nullable = false)
    private Turma turma;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "disciplina_id", nullable = false)
    private Disciplina disciplina;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "periodo_id", nullable = false)
    private Periodo periodo;
}
