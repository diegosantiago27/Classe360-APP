package com.classe360.service;

import com.classe360.domain.Prova;
import com.classe360.repository.ProvaRepository;
import com.classe360.service.dto.ProvaDTO;
import com.classe360.service.mapper.ProvaMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProvaService {

    private final ProvaRepository provaRepository;
    private final ProvaMapper provaMapper;

    public ProvaDTO save(ProvaDTO provaDTO) {
        Prova prova = provaMapper.toEntity(provaDTO);
        prova = provaRepository.save(prova);
        return provaMapper.toDto(prova);
    }

    @Transactional(readOnly = true)
    public Page<ProvaDTO> findAll(Pageable pageable) {
        return provaRepository.findAll(pageable).map(provaMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<ProvaDTO> findOne(Long id) {
        return provaRepository.findById(id).map(provaMapper::toDto);
    }

    public void delete(Long id) {
        provaRepository.deleteById(id);
    }
}