package com.classe360.repository;

import com.classe360.domain.Prova;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProvaRepository extends JpaRepository<Prova, Long> {
    List<Prova> findByProfessorIdOrderByDataDesc(Long professorId);
    List<Prova> findByTurmaIdInAndPublicadaTrueAndAtivaTrueOrderByDataAsc(List<Long> turmaIds);
}