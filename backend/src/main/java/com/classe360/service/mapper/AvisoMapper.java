package com.classe360.service.mapper;

import com.classe360.domain.Aviso;
import com.classe360.service.dto.AvisoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AvisoMapper {

    @Mapping(source = "criadoPor.id", target = "criadoPorId")
    @Mapping(source = "disciplina.id", target = "disciplinaId")
    @Mapping(source = "turma.id", target = "turmaId")
    AvisoDTO toDto(Aviso aviso);

    @Mapping(source = "criadoPorId", target = "criadoPor.id")
    @Mapping(source = "disciplinaId", target = "disciplina.id")
    @Mapping(source = "turmaId", target = "turma.id")
    Aviso toEntity(AvisoDTO avisoDTO);
}