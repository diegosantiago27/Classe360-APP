package com.classe360.repository;

import com.classe360.domain.PreferenciaUsuario;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PreferenciaUsuarioRepository extends JpaRepository<PreferenciaUsuario, Long> {
    Optional<PreferenciaUsuario> findByUsuarioId(Long usuarioId);
}
