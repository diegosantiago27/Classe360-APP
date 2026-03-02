package com.classe360.service.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvisoDTO {

    private Long id;
    private String titulo;
    private String conteudo;
    private Long criadoPorId;
    private LocalDateTime dataCriacao;
}