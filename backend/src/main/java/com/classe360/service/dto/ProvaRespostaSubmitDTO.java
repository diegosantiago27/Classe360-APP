package com.classe360.service.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProvaRespostaSubmitDTO {
    private Long alunoId;
    private Boolean finalizadaPorTempo;
    @Builder.Default
    private List<ProvaRespostaItemDTO> respostas = new ArrayList<>();
}
