package com.classe360.repository;

import com.classe360.domain.GradeAula;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GradeAulaRepository extends JpaRepository<GradeAula, Long> {}
