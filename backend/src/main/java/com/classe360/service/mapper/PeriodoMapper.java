package com.classe360.service.mapper;

import com.classe360.domain.Periodo;
import com.classe360.service.dto.PeriodoDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PeriodoMapper {

    PeriodoDTO toDto(Periodo periodo);

    Periodo toEntity(PeriodoDTO periodoDTO);
}