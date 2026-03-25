package com.classe360.repository;

import com.classe360.domain.Turma;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TurmaRepository extends JpaRepository<Turma, Long> {
    Optional<Turma> findByNomeIgnoreCase(String nome);
    List<Turma> findByAlunosId(Long alunoId);
}