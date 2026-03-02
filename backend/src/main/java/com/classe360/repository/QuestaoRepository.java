package com.classe360.repository;

import com.classe360.domain.Questao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestaoRepository extends JpaRepository<Questao, Long> {
    // Métodos personalizados, se necessário
}