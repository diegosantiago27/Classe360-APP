package com.classe360.repository;

import com.classe360.domain.Nota;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface NotaRepository extends JpaRepository<Nota, Long> {
    Optional<Nota> findByAlunoIdAndTurmaIdAndDisciplinaIdAndPeriodoId(
        Long alunoId,
        Long turmaId,
        Long disciplinaId,
        Long periodoId
    );

    List<Nota> findByTurmaIdAndDisciplinaIdAndPeriodoIdOrderByAlunoNomeAsc(
        Long turmaId,
        Long disciplinaId,
        Long periodoId
    );

    List<Nota> findByAlunoIdOrderByPeriodoNomeAscDisciplinaNomeAscTurmaNomeAsc(Long alunoId);

    @Query(
        "SELECT DISTINCT n.turma.id, n.disciplina.id, n.periodo.id FROM Nota n " +
        "WHERE n.turma IS NOT NULL AND n.disciplina IS NOT NULL AND n.periodo IS NOT NULL"
    )
    List<Object[]> findDistinctTurmaDisciplinaPeriodoIds();
}