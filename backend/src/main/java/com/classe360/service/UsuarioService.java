package com.classe360.service;

import com.classe360.domain.Usuario;
import com.classe360.repository.UsuarioRepository;
import com.classe360.service.dto.UsuarioDTO;
import com.classe360.service.mapper.UsuarioMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioMapper usuarioMapper;

    public UsuarioDTO save(UsuarioDTO usuarioDTO) {
        Usuario usuario = usuarioMapper.toEntity(usuarioDTO);
        usuario = usuarioRepository.save(usuario);
        return usuarioMapper.toDto(usuario);
    }

    @Transactional(readOnly = true)
    public Page<UsuarioDTO> findAll(Pageable pageable) {
        return usuarioRepository.findAll(pageable).map(usuarioMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<UsuarioDTO> findOne(Long id) {
        return usuarioRepository.findById(id).map(usuarioMapper::toDto);
    }

    public void delete(Long id) {
        usuarioRepository.deleteById(id);
    }
}