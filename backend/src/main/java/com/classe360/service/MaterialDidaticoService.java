package com.classe360.service;

import com.classe360.domain.MaterialDidatico;
import com.classe360.repository.MaterialDidaticoRepository;
import com.classe360.service.dto.MaterialDidaticoDTO;
import com.classe360.service.mapper.MaterialDidaticoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class MaterialDidaticoService {

    private final MaterialDidaticoRepository materialDidaticoRepository;
    private final MaterialDidaticoMapper materialDidaticoMapper;

    public MaterialDidaticoDTO save(MaterialDidaticoDTO materialDidaticoDTO) {
        MaterialDidatico materialDidatico = materialDidaticoMapper.toEntity(materialDidaticoDTO);
        materialDidatico = materialDidaticoRepository.save(materialDidatico);
        return materialDidaticoMapper.toDto(materialDidatico);
    }

    @Transactional(readOnly = true)
    public Page<MaterialDidaticoDTO> findAll(Pageable pageable) {
        return materialDidaticoRepository.findAll(pageable).map(materialDidaticoMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<MaterialDidaticoDTO> findOne(Long id) {
        return materialDidaticoRepository.findById(id).map(materialDidaticoMapper::toDto);
    }

    public void delete(Long id) {
        materialDidaticoRepository.deleteById(id);
    }
}