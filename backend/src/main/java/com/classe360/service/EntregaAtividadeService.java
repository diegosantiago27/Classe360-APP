package com.classe360.service;

import com.classe360.domain.EntregaAtividade;
import com.classe360.repository.EntregaAtividadeRepository;
import com.classe360.service.dto.EntregaAtividadeDTO;
import com.classe360.service.mapper.EntregaAtividadeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class EntregaAtividadeService {

    private final EntregaAtividadeRepository entregaAtividadeRepository;
    private final EntregaAtividadeMapper entregaAtividadeMapper;

    public EntregaAtividadeDTO save(EntregaAtividadeDTO entregaAtividadeDTO) {
        EntregaAtividade entregaAtividade = entregaAtividadeMapper.toEntity(entregaAtividadeDTO);
        entregaAtividade = entregaAtividadeRepository.save(entregaAtividade);
        return entregaAtividadeMapper.toDto(entregaAtividade);
    }

    @Transactional(readOnly = true)
    public Page<EntregaAtividadeDTO> findAll(Pageable pageable) {
        return entregaAtividadeRepository.findAll(pageable).map(entregaAtividadeMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<EntregaAtividadeDTO> findOne(Long id) {
        return entregaAtividadeRepository.findById(id).map(entregaAtividadeMapper::toDto);
    }

    public void delete(Long id) {
        entregaAtividadeRepository.deleteById(id);
    }
}