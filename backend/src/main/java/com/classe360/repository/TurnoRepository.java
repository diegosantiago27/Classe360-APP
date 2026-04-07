package com.classe360.repository;

import com.classe360.domain.Turno;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TurnoRepository extends JpaRepository<Turno, Long> {
    Optional<Turno> findByCodigoIgnoreCase(String codigo);

    List<Turno> findAllByOrderByIdAsc();
}
