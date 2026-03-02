package com.classe360.service.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PeriodoDTO {

    private Long id;
    private String nome;
    private LocalDate dataInicio;
    private LocalDate dataFim;
}