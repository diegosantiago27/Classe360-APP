package com.classe360.service;

import com.classe360.domain.Atividade;
import com.classe360.repository.AtividadeRepository;
import com.classe360.service.dto.AtividadeDTO;
import com.classe360.service.mapper.AtividadeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class AtividadeService {

    private final AtividadeRepository atividadeRepository;
    private final AtividadeMapper atividadeMapper;

    public AtividadeDTO save(AtividadeDTO atividadeDTO) {
        Atividade atividade = atividadeMapper.toEntity(atividadeDTO);
        atividade = atividadeRepository.save(atividade);
        return atividadeMapper.toDto(atividade);
    }

    @Transactional(readOnly = true)
    public Page<AtividadeDTO> findAll(Pageable pageable) {
        return atividadeRepository.findAll(pageable).map(atividadeMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<AtividadeDTO> findOne(Long id) {
        return atividadeRepository.findById(id).map(atividadeMapper::toDto);
    }

    public void delete(Long id) {
        atividadeRepository.deleteById(id);
    }
}