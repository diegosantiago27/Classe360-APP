package com.classe360.repository;

import com.classe360.domain.MaterialDidatico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialDidaticoRepository extends JpaRepository<MaterialDidatico, Long> {
}