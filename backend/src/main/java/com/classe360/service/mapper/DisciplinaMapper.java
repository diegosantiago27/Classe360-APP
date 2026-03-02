package com.classe360.service.mapper;

import com.classe360.domain.Disciplina;
import com.classe360.service.dto.DisciplinaDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DisciplinaMapper {

    DisciplinaDTO toDto(Disciplina disciplina);

    Disciplina toEntity(DisciplinaDTO disciplinaDTO);
}