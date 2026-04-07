package com.classe360.service.mapper;

import com.classe360.domain.PreferenciaUsuario;
import com.classe360.service.dto.PreferenciaUsuarioDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PreferenciaUsuarioMapper {

    PreferenciaUsuarioDTO toDto(PreferenciaUsuario entity);

    PreferenciaUsuario toEntity(PreferenciaUsuarioDTO dto);
}
