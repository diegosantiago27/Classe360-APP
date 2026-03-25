package com.classe360.repository;

import com.classe360.domain.ProvaResposta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProvaRespostaRepository extends JpaRepository<ProvaResposta, Long> {
    Optional<ProvaResposta> findByProvaIdAndAlunoId(Long provaId, Long alunoId);
    List<ProvaResposta> findByAlunoId(Long alunoId);
    List<ProvaResposta> findByProvaProfessorId(Long professorId);
}
