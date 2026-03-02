package com.classe360.service.mapper;

import com.classe360.domain.MaterialDidatico;
import com.classe360.service.dto.MaterialDidaticoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MaterialDidaticoMapper {

    @Mapping(source = "disciplina.id", target = "disciplinaId")
    MaterialDidaticoDTO toDto(MaterialDidatico materialDidatico);

    @Mapping(source = "disciplinaId", target = "disciplina.id")
    MaterialDidatico toEntity(MaterialDidaticoDTO materialDidaticoDTO);
}