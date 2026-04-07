package com.classe360.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreferenciaUsuarioDTO {

    private Long id;
    private Long usuarioId;
    private Boolean notificacoes;
    private Boolean emails;
    private Boolean modoEscuro;
    private Boolean duploFator;
}
