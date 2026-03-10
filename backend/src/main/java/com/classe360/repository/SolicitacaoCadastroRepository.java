package com.classe360.repository;

import com.classe360.domain.SolicitacaoCadastro;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitacaoCadastroRepository extends JpaRepository<SolicitacaoCadastro, Long> {

    List<SolicitacaoCadastro> findByStatusOrderByCreatedAtDesc(SolicitacaoCadastro.Status status);
}
