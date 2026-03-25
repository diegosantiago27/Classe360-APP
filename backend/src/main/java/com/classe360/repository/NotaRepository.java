package com.classe360.repository;

import com.classe360.domain.Nota;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
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
}