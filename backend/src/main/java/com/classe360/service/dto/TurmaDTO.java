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
    private String turno;
    private String status;
    private Long professorId;
    private Set<Long> alunosIds;
}