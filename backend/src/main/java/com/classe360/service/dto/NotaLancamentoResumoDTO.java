package com.classe360.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotaLancamentoResumoDTO {

    /** Identificador de linha: `syn-{turmaId}-{discId}-{periodoId}` ou `cab-{id}` */
    private String id;

    /** Quando preenchido, o lançamento foi persistido explicitamente e pode ser removido. */
    private Long cabecalhoId;

    private Long turmaId;
    private String turmaNome;
    private Long disciplinaId;
    private String disciplinaNome;
    private Long periodoId;
    private String bimestre;
    private Integer pendentes;
    private String status;
}
