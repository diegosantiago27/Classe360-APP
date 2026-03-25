package com.classe360.service.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotaLancamentoViewDTO {
    private Long id;

    private Long alunoId;
    private String alunoNome;

    private Long turmaId;
    private String turmaNome;

    private Long disciplinaId;
    private String disciplinaNome;

    private Long periodoId;
    private String bimestre;

    private Double trabalhosNota;
    private Double provasNota;
    private Double nota;
}
