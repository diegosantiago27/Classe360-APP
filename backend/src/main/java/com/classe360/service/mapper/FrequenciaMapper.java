package com.classe360.service.mapper;

import com.classe360.domain.Frequencia;
import com.classe360.service.dto.FrequenciaDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FrequenciaMapper {

    @Mapping(source = "aluno.id", target = "alunoId")
    @Mapping(source = "turma.id", target = "turmaId")
    @Mapping(source = "disciplina.id", target = "disciplinaId")
    FrequenciaDTO toDto(Frequencia frequencia);

    @Mapping(source = "alunoId", target = "aluno.id")
    @Mapping(source = "turmaId", target = "turma.id")
    @Mapping(source = "disciplinaId", target = "disciplina.id")
    Frequencia toEntity(FrequenciaDTO frequenciaDTO);
}