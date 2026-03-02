package com.classe360.service.mapper;

import com.classe360.domain.Usuario;
import com.classe360.service.dto.UsuarioDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UsuarioMapper {

    UsuarioDTO toDto(Usuario usuario);

    Usuario toEntity(UsuarioDTO usuarioDTO);
}