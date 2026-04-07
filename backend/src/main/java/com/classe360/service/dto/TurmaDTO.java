package com.classe360.service.dto;

import lombok.*;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TurmaDTO {

    private Long id;
    private String nome;
    private Long turnoId;
    /** Preenchido na leitura; ignorado na persistência via MapStruct. */
    private String turnoNome;
    private String status;
    private Long professorId;
    private Set<Long> alunosIds;
}