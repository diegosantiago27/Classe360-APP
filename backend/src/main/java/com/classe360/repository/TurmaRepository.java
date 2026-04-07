package com.classe360.repository;

import com.classe360.domain.Turma;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TurmaRepository extends JpaRepository<Turma, Long> {
    Optional<Turma> findByNomeIgnoreCase(String nome);
    List<Turma> findByAlunosId(Long alunoId);

    @EntityGraph(attributePaths = { "alunos" })
    @Query("SELECT t FROM Turma t WHERE t.id = :id")
    Optional<Turma> findWithAlunosById(@Param("id") Long id);
}