package com.classe360.service.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvaRespostaViewDTO {
    private Long id;
    private Long provaId;
    private String provaTitulo;
    private Long alunoId;
    private String alunoNome;
    private String turma;
    private String disciplina;
    private String status;
    private Double pontosMaximos;
    private Double pontosObtidos;
    private Double notaFinal;
    private LocalDateTime enviadoEm;
    private LocalDateTime corrigidoEm;
    private Boolean finalizadaPorTempo;
    @Builder.Default
    private List<ProvaRespostaItemDTO> respostas = new ArrayList<>();
}
