package com.classe360.service.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestaoDTO {

    private Long id;
    private Long provaId;
    private String enunciado;
    private String tipo;
    private List<String> alternativas;
    private String respostaCorreta;
}