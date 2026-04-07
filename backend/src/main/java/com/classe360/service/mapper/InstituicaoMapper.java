package com.classe360.service.mapper;

import com.classe360.domain.Instituicao;
import com.classe360.service.dto.InstituicaoDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface InstituicaoMapper {

    InstituicaoDTO toDto(Instituicao instituicao);

    Instituicao toEntity(InstituicaoDTO instituicaoDTO);
}
