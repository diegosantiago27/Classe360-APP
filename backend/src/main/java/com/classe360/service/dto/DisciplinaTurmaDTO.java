package com.classe360.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisciplinaTurmaDTO {

    private Long id;
    private Long disciplinaId;
    private Long turmaId;
    private Long professorId;
    private String disciplinaNome;
    private String turmaNome;
    private String professorNome;
}
