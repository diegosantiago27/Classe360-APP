package com.classe360.service.mapper;

import com.classe360.domain.Questao;
import com.classe360.service.dto.QuestaoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface QuestaoMapper {

    @Mapping(source = "prova.id", target = "provaId")
    QuestaoDTO toDto(Questao questao);

    @Mapping(source = "provaId", target = "prova.id")
    Questao toEntity(QuestaoDTO questaoDTO);
}