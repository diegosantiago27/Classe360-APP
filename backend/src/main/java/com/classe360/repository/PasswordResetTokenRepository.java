package com.classe360.repository;

import com.classe360.domain.PasswordResetToken;
import com.classe360.domain.Usuario;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findTopByUsuarioAndTokenOrderByCreatedAtDesc(Usuario usuario, String token);

    long countByUsuarioAndCreatedAtAfter(Usuario usuario, LocalDateTime createdAt);

    @Modifying
    @Query("update PasswordResetToken t set t.used = true where t.usuario = :usuario and t.used = false")
    int markAllUnusedAsUsed(@Param("usuario") Usuario usuario);
}
