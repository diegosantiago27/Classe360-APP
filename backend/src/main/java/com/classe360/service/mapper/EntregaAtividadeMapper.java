package com.classe360.service.mapper;

import com.classe360.domain.EntregaAtividade;
import com.classe360.service.dto.EntregaAtividadeDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface EntregaAtividadeMapper {

    @Mapping(source = "atividade.id", target = "atividadeId")
    @Mapping(source = "aluno.id", target = "alunoId")
    EntregaAtividadeDTO toDto(EntregaAtividade entregaAtividade);

    @Mapping(source = "atividadeId", target = "atividade.id")
    @Mapping(source = "alunoId", target = "aluno.id")
    EntregaAtividade toEntity(EntregaAtividadeDTO entregaAtividadeDTO);
}