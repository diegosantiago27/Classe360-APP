package com.classe360.repository;

import com.classe360.domain.ProvaResposta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProvaRespostaRepository extends JpaRepository<ProvaResposta, Long> {
    Optional<ProvaResposta> findByProvaIdAndAlunoId(Long provaId, Long alunoId);
    List<ProvaResposta> findByAlunoId(Long alunoId);
    List<ProvaResposta> findByProvaProfessorId(Long professorId);

    @Query(
        "SELECT DISTINCT pr FROM ProvaResposta pr " +
        "JOIN FETCH pr.prova p JOIN FETCH p.turma JOIN FETCH p.disciplina JOIN FETCH pr.aluno " +
        "WHERE p.turma.id = :turmaId AND p.disciplina.id = :disciplinaId"
    )
    List<ProvaResposta> findByProvaTurmaIdAndProvaDisciplinaIdFetched(
        @Param("turmaId") Long turmaId,
        @Param("disciplinaId") Long disciplinaId
    );
}
