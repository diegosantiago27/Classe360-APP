package com.classe360.service.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvaRespostaItemDTO {
    private Long questaoId;
    private String tipo;
    private Integer alternativaIndex;
    private String respostaTexto;
    private Double pontosObtidos;
}
