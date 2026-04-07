package com.classe360.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotaLancamentoCabecalhoCreateDTO {

    private Long turmaId;
    private String turmaNome;
    private Long disciplinaId;
    private String disciplinaNome;
    private String bimestre;
}
