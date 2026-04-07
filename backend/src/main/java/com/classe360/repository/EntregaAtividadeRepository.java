package com.classe360.repository;

import com.classe360.domain.EntregaAtividade;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EntregaAtividadeRepository extends JpaRepository<EntregaAtividade, Long> {
    @Query(
        "SELECT DISTINCT e FROM EntregaAtividade e " +
        "JOIN FETCH e.atividade a JOIN FETCH a.turma JOIN FETCH a.disciplina JOIN FETCH e.aluno " +
        "WHERE a.turma.id = :turmaId AND a.disciplina.id = :disciplinaId"
    )
    List<EntregaAtividade> findByAtividadeTurmaAndDisciplinaFetched(
        @Param("turmaId") Long turmaId,
        @Param("disciplinaId") Long disciplinaId
    );
}