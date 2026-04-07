package com.classe360.service.mapper;

import com.classe360.domain.Turma;
import com.classe360.domain.Usuario;
import com.classe360.service.dto.TurmaDTO;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", uses = {UsuarioMapper.class})
public interface TurmaMapper {

    @Named("usuariosToIds")
    default Set<Long> usuariosToIds(Set<Usuario> usuarios) {
        if (usuarios == null) return Collections.emptySet();
        return usuarios.stream().map(Usuario::getId).collect(Collectors.toSet());
    }

    @Named("idsToUsuarios")
    default Set<Usuario> idsToUsuarios(Set<Long> ids) {
        if (ids == null) return Collections.emptySet();
        return ids.stream().map(id -> {
            Usuario u = new Usuario();
            u.setId(id);
            return u;
        }).collect(Collectors.toSet());
    }

    @Mapping(source = "turno.id", target = "turnoId")
    @Mapping(source = "turno.nome", target = "turnoNome")
    @Mapping(source = "professor.id", target = "professorId")
    @Mapping(source = "alunos", target = "alunosIds", qualifiedByName = "usuariosToIds")
    TurmaDTO toDto(Turma turma);

    @BeanMapping(ignoreUnmappedSourceProperties = "turnoNome")
    @Mapping(source = "turnoId", target = "turno.id")
    @Mapping(source = "professorId", target = "professor.id")
    @Mapping(source = "alunosIds", target = "alunos", qualifiedByName = "idsToUsuarios")
    Turma toEntity(TurmaDTO turmaDTO);
}