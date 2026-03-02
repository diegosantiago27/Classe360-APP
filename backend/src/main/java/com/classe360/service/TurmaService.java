package com.classe360.service;

import com.classe360.domain.Turma;
import com.classe360.repository.TurmaRepository;
import com.classe360.service.dto.TurmaDTO;
import com.classe360.service.mapper.TurmaMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class TurmaService {

    private final TurmaRepository turmaRepository;
    private final TurmaMapper turmaMapper;

    public TurmaDTO save(TurmaDTO turmaDTO) {
        Turma turma = turmaMapper.toEntity(turmaDTO);
        turma = turmaRepository.save(turma);
        return turmaMapper.toDto(turma);
    }

    @Transactional(readOnly = true)
    public Page<TurmaDTO> findAll(Pageable pageable) {
        return turmaRepository.findAll(pageable).map(turmaMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<TurmaDTO> findOne(Long id) {
        return turmaRepository.findById(id).map(turmaMapper::toDto);
    }

    public void delete(Long id) {
        turmaRepository.deleteById(id);
    }
}