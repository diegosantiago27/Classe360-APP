package com.classe360.service.dto;

import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvaRelacionalDTO {
    private Long id;
    private Long professorId;
    private String professorNome;
    private Long turmaId;
    private String turmaNome;
    private Long disciplinaId;
    private String disciplinaNome;
    private String titulo;
    private String descricao;
    private String periodo;
    private LocalDate data;
    private String horario;
    private String instrucoes;
    private String status;
    private Boolean publicada;
    private String turno;
    @Builder.Default
    private List<ProvaQuestaoPayloadDTO> questoes = new ArrayList<>();
}
