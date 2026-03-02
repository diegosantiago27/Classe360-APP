package com.classe360.repository;

import com.classe360.domain.Frequencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FrequenciaRepository extends JpaRepository<Frequencia, Long> {
}