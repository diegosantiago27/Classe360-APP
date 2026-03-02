package com.classe360.service.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialDidaticoDTO {

    private Long id;
    private String titulo;
    private String descricao;
    private String urlArquivo;
    private Long disciplinaId;
}