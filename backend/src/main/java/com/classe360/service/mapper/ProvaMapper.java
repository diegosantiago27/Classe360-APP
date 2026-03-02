package com.classe360.service.mapper;

import com.classe360.domain.Prova;
import com.classe360.service.dto.ProvaDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProvaMapper {

    @Mapping(source = "turma.id", target = "turmaId")
    @Mapping(source = "disciplina.id", target = "disciplinaId")
    @Mapping(source = "professor.id", target = "professorId")
    ProvaDTO toDto(Prova prova);

    @Mapping(source = "turmaId", target = "turma.id")
    @Mapping(source = "disciplinaId", target = "disciplina.id")
    @Mapping(source = "professorId", target = "professor.id")
    Prova toEntity(ProvaDTO provaDTO);
}