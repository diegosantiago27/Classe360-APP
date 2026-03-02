package com.classe360.service;

import com.classe360.domain.Aviso;
import com.classe360.repository.AvisoRepository;
import com.classe360.service.dto.AvisoDTO;
import com.classe360.service.mapper.AvisoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class AvisoService {

    private final AvisoRepository avisoRepository;
    private final AvisoMapper avisoMapper;

    public AvisoDTO save(AvisoDTO avisoDTO) {
        Aviso aviso = avisoMapper.toEntity(avisoDTO);
        aviso = avisoRepository.save(aviso);
        return avisoMapper.toDto(aviso);
    }

    @Transactional(readOnly = true)
    public Page<AvisoDTO> findAll(Pageable pageable) {
        return avisoRepository.findAll(pageable).map(avisoMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<AvisoDTO> findOne(Long id) {
        return avisoRepository.findById(id).map(avisoMapper::toDto);
    }

    public void delete(Long id) {
        avisoRepository.deleteById(id);
    }
}