package com.classe360.service;

import com.classe360.domain.PreferenciaUsuario;
import com.classe360.repository.PreferenciaUsuarioRepository;
import com.classe360.service.dto.PreferenciaUsuarioDTO;
import com.classe360.service.mapper.PreferenciaUsuarioMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class PreferenciaUsuarioService {

    private final PreferenciaUsuarioRepository preferenciaUsuarioRepository;
    private final PreferenciaUsuarioMapper preferenciaUsuarioMapper;

    @Transactional(readOnly = true)
    public PreferenciaUsuarioDTO findOrCreateByUsuarioId(Long usuarioId) {
        PreferenciaUsuario entity = preferenciaUsuarioRepository
            .findByUsuarioId(usuarioId)
            .orElseGet(() -> createDefault(usuarioId));
        return preferenciaUsuarioMapper.toDto(entity);
    }

    public PreferenciaUsuarioDTO saveByUsuarioId(Long usuarioId, PreferenciaUsuarioDTO payload) {
        PreferenciaUsuario entity = preferenciaUsuarioRepository
            .findByUsuarioId(usuarioId)
            .orElseGet(() -> createDefault(usuarioId));

        entity.setNotificacoes(Boolean.TRUE.equals(payload.getNotificacoes()));
        entity.setEmails(Boolean.TRUE.equals(payload.getEmails()));
        entity.setModoEscuro(Boolean.TRUE.equals(payload.getModoEscuro()));
        entity.setDuploFator(Boolean.TRUE.equals(payload.getDuploFator()));

        entity = preferenciaUsuarioRepository.save(entity);
        return preferenciaUsuarioMapper.toDto(entity);
    }

    private PreferenciaUsuario createDefault(Long usuarioId) {
        PreferenciaUsuario entity = PreferenciaUsuario.builder()
            .usuarioId(usuarioId)
            .notificacoes(true)
            .emails(true)
            .modoEscuro(false)
            .duploFator(false)
            .build();
        return preferenciaUsuarioRepository.save(entity);
    }
}
