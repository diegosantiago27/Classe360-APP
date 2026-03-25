package com.classe360.repository;

import com.classe360.domain.Questao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestaoRepository extends JpaRepository<Questao, Long> {
    List<Questao> findByProvaIdOrderByIdAsc(Long provaId);
    void deleteByProvaId(Long provaId);
}