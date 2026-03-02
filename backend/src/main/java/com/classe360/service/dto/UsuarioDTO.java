package com.classe360.service.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsuarioDTO {

    private Long id;
    private String cpf;
    private String nome;
    private String email;
    private String role;
    private Boolean ativo;
}