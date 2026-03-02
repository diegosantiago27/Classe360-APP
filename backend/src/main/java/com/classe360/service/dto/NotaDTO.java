package com.classe360.service.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotaDTO {

    private Long id;
    private Long alunoId;
    private Long turmaId;
    private Long disciplinaId;
    private Long periodoId;
    private Double valor;
}