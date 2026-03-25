package com.classe360.service.dto;

import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvaDTO {

    private Long id;
    private String titulo;
    private String descricao;
    private Long turmaId;
    private Long disciplinaId;
    private Long professorId;
    private LocalDate data;
    private Boolean ativa;
    private String periodo;
    private String horario;
    private String instrucoes;
    private String status;
    private Boolean publicada;
    private String turno;
}