package com.classe360.repository;

import com.classe360.domain.NotaLancamentoCabecalho;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotaLancamentoCabecalhoRepository extends JpaRepository<NotaLancamentoCabecalho, Long> {
    Optional<NotaLancamentoCabecalho> findByTurma_IdAndDisciplina_IdAndPeriodo_Id(
        Long turmaId,
        Long disciplinaId,
        Long periodoId
    );
}
