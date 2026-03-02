package com.classe360.service.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EntregaAtividadeDTO {

    private Long id;
    private Long atividadeId;
    private Long alunoId;
    private String resposta;
    private Double nota;
    private Boolean corrigido;
}