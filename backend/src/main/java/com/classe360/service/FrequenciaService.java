package com.classe360.service;

import com.classe360.domain.Frequencia;
import com.classe360.repository.FrequenciaRepository;
import com.classe360.service.dto.FrequenciaDTO;
import com.classe360.service.mapper.FrequenciaMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class FrequenciaService {

    private final FrequenciaRepository frequenciaRepository;
    private final FrequenciaMapper frequenciaMapper;

    public FrequenciaDTO save(FrequenciaDTO frequenciaDTO) {
        Frequencia frequencia = frequenciaMapper.toEntity(frequenciaDTO);
        frequencia = frequenciaRepository.save(frequencia);
        return frequenciaMapper.toDto(frequencia);
    }

    @Transactional(readOnly = true)
    public Page<FrequenciaDTO> findAll(Pageable pageable) {
        return frequenciaRepository.findAll(pageable).map(frequenciaMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<FrequenciaDTO> findOne(Long id) {
        return frequenciaRepository.findById(id).map(frequenciaMapper::toDto);
    }

    public void delete(Long id) {
        frequenciaRepository.deleteById(id);
    }
}