package com.classe360.service.mapper;

import com.classe360.domain.Aviso;
import com.classe360.service.dto.AvisoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AvisoMapper {

    @Mapping(source = "criadoPor.id", target = "criadoPorId")
    AvisoDTO toDto(Aviso aviso);

    @Mapping(source = "criadoPorId", target = "criadoPor.id")
    Aviso toEntity(AvisoDTO avisoDTO);
}