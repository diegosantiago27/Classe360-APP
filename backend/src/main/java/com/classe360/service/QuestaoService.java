package com.classe360.service;

import com.classe360.domain.Questao;
import com.classe360.repository.QuestaoRepository;
import com.classe360.service.dto.QuestaoDTO;
import com.classe360.service.mapper.QuestaoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class QuestaoService {

    private final QuestaoRepository questaoRepository;
    private final QuestaoMapper questaoMapper;

    public QuestaoDTO save(QuestaoDTO questaoDTO) {
        Questao questao = questaoMapper.toEntity(questaoDTO);
        questao = questaoRepository.save(questao);
        return questaoMapper.toDto(questao);
    }

    @Transactional(readOnly = true)
    public Page<QuestaoDTO> findAll(Pageable pageable) {
        return questaoRepository.findAll(pageable).map(questaoMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<QuestaoDTO> findOne(Long id) {
        return questaoRepository.findById(id).map(questaoMapper::toDto);
    }

    public void delete(Long id) {
        questaoRepository.deleteById(id);
    }
}