package com.classe360.service;

import com.classe360.domain.Nota;
import com.classe360.repository.NotaRepository;
import com.classe360.service.dto.NotaDTO;
import com.classe360.service.mapper.NotaMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class NotaService {

    private final NotaRepository notaRepository;
    private final NotaMapper notaMapper;

    public NotaDTO save(NotaDTO notaDTO) {
        Nota nota = notaMapper.toEntity(notaDTO);
        nota = notaRepository.save(nota);
        return notaMapper.toDto(nota);
    }

    @Transactional(readOnly = true)
    public Page<NotaDTO> findAll(Pageable pageable) {
        return notaRepository.findAll(pageable).map(notaMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<NotaDTO> findOne(Long id) {
        return notaRepository.findById(id).map(notaMapper::toDto);
    }

    public void delete(Long id) {
        notaRepository.deleteById(id);
    }
}