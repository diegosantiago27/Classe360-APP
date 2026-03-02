package com.classe360.service.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisciplinaDTO {

    private Long id;
    private String nome;
    private String descricao;
}