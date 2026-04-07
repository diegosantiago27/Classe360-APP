package com.classe360.repository;

import com.classe360.domain.DisciplinaTurma;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DisciplinaTurmaRepository extends JpaRepository<DisciplinaTurma, Long> {

    Optional<DisciplinaTurma> findByDisciplina_IdAndTurma_Id(Long disciplinaId, Long turmaId);

    List<DisciplinaTurma> findByProfessor_Id(Long professorId);
}
