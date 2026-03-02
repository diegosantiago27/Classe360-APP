package com.classe360.service.mapper;

import com.classe360.domain.Atividade;
import com.classe360.service.dto.AtividadeDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AtividadeMapper {

    @Mapping(source = "turma.id", target = "turmaId")
    @Mapping(source = "disciplina.id", target = "disciplinaId")
    AtividadeDTO toDto(Atividade atividade);

    @Mapping(source = "turmaId", target = "turma.id")
    @Mapping(source = "disciplinaId", target = "disciplina.id")
    Atividade toEntity(AtividadeDTO atividadeDTO);
}