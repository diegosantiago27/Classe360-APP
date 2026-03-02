package com.classe360.service.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AtividadeDTO {

    private Long id;
    private String titulo;
    private String descricao;
    private Long turmaId;
    private Long disciplinaId;
    private LocalDate dataEntrega;
}