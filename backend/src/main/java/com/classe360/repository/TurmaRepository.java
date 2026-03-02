package com.classe360.repository;

import com.classe360.domain.Turma;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TurmaRepository extends JpaRepository<Turma, Long> {
    // Métodos personalizados, se necessário
}