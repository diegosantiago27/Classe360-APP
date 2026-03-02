package com.classe360.service;

import com.classe360.domain.Disciplina;
import com.classe360.repository.DisciplinaRepository;
import com.classe360.service.dto.DisciplinaDTO;
import com.classe360.service.mapper.DisciplinaMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class DisciplinaService {

    private final DisciplinaRepository disciplinaRepository;
    private final DisciplinaMapper disciplinaMapper;

    public DisciplinaDTO save(DisciplinaDTO disciplinaDTO) {
        Disciplina disciplina = disciplinaMapper.toEntity(disciplinaDTO);
        disciplina = disciplinaRepository.save(disciplina);
        return disciplinaMapper.toDto(disciplina);
    }

    @Transactional(readOnly = true)
    public Page<DisciplinaDTO> findAll(Pageable pageable) {
        return disciplinaRepository.findAll(pageable).map(disciplinaMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<DisciplinaDTO> findOne(Long id) {
        return disciplinaRepository.findById(id).map(disciplinaMapper::toDto);
    }

    public void delete(Long id) {
        disciplinaRepository.deleteById(id);
    }
}