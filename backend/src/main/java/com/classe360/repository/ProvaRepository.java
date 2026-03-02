package com.classe360.repository;

import com.classe360.domain.Prova;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProvaRepository extends JpaRepository<Prova, Long> {
    // Métodos personalizados, se necessário
}