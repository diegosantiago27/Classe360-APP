package com.classe360.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.classe360.domain.EntregaAtividade;

@Repository
public interface EntregaAtividadeRepository extends JpaRepository<EntregaAtividade, Long> {
}