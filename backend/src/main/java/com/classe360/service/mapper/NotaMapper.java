package com.classe360.service.mapper;

import com.classe360.domain.Nota;
import com.classe360.service.dto.NotaDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotaMapper {

    @Mapping(source = "aluno.id", target = "alunoId")
    @Mapping(source = "turma.id", target = "turmaId")
    @Mapping(source = "disciplina.id", target = "disciplinaId")
    @Mapping(source = "periodo.id", target = "periodoId")
    NotaDTO toDto(Nota nota);

    @Mapping(source = "alunoId", target = "aluno.id")
    @Mapping(source = "turmaId", target = "turma.id")
    @Mapping(source = "disciplinaId", target = "disciplina.id")
    @Mapping(source = "periodoId", target = "periodo.id")
    Nota toEntity(NotaDTO notaDTO);
}