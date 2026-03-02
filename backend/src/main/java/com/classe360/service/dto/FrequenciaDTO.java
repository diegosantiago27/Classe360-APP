package com.classe360.service.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FrequenciaDTO {

    private Long id;
    private Long alunoId;
    private Long turmaId;
    private Long disciplinaId;
    private LocalDate data;
    private Boolean presente;
}