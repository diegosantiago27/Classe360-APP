package com.classe360.service.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvaQuestaoPayloadDTO {
    private Long id;
    private String enunciado;
    private String tipo;
    private Double pontos;
    private List<String> opcoes;
    private Integer corretaIndex;
}
