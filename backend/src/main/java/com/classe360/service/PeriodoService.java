package com.classe360.service;

import com.classe360.domain.Periodo;
import com.classe360.repository.PeriodoRepository;
import com.classe360.service.dto.PeriodoDTO;
import com.classe360.service.mapper.PeriodoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class PeriodoService {

    private final PeriodoRepository periodoRepository;
    private final PeriodoMapper periodoMapper;

    public PeriodoDTO save(PeriodoDTO periodoDTO) {
        Periodo periodo = periodoMapper.toEntity(periodoDTO);
        periodo = periodoRepository.save(periodo);
        return periodoMapper.toDto(periodo);
    }

    @Transactional(readOnly = true)
    public Page<PeriodoDTO> findAll(Pageable pageable) {
        return periodoRepository.findAll(pageable).map(periodoMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<PeriodoDTO> findOne(Long id) {
        return periodoRepository.findById(id).map(periodoMapper::toDto);
    }

    public void delete(Long id) {
        periodoRepository.deleteById(id);
    }
}