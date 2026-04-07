package com.classe360.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeAulaDTO {

    private Long id;
    private Long disciplinaId;
    private Long turmaId;
    private String dia;
    private String inicio;
    private String fim;
}
