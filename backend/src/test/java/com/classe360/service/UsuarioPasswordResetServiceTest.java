package com.classe360.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.classe360.domain.PasswordResetToken;
import com.classe360.domain.Usuario;
import com.classe360.repository.PasswordResetTokenRepository;
import com.classe360.repository.UsuarioRepository;
import com.classe360.web.rest.errors.BadRequestAlertException;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UsuarioPasswordResetServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private MailService mailService;

    private UsuarioPasswordResetService service;

    @BeforeEach
    void setup() {
        service = new UsuarioPasswordResetService(usuarioRepository, passwordResetTokenRepository, passwordEncoder, mailService);
    }

    @Test
    void solicitarResetPorEmailDeveGerarTokenEEnviarEmail() {
        Usuario usuario = usuarioAtivo();
        when(usuarioRepository.findByEmailIgnoreCase("user@classe360.com")).thenReturn(Optional.of(usuario));
        when(passwordResetTokenRepository.countByUsuarioAndCreatedAtAfter(eq(usuario), any(LocalDateTime.class))).thenReturn(0L);

        service.solicitarResetPorEmail("user@classe360.com", "127.0.0.1");

        verify(passwordResetTokenRepository).markAllUnusedAsUsed(usuario);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        verify(mailService).sendUsuarioPasswordResetCodeEmailOrThrow(eq("user@classe360.com"), eq("User Teste"), any(String.class));
    }

    @Test
    void validarCodigoPorEmailDeveFalharQuandoTokenExpirado() {
        Usuario usuario = usuarioAtivo();
        PasswordResetToken token = PasswordResetToken
            .builder()
            .usuario(usuario)
            .token("123456")
            .used(false)
            .expiresAt(LocalDateTime.now().minusMinutes(1))
            .build();
        when(usuarioRepository.findByEmailIgnoreCase("user@classe360.com")).thenReturn(Optional.of(usuario));
        when(passwordResetTokenRepository.findTopByUsuarioAndTokenOrderByCreatedAtDesc(usuario, "123456")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> service.validarCodigoPorEmail("user@classe360.com", "123456"))
            .isInstanceOf(BadRequestAlertException.class)
            .hasMessageContaining("Código expirado");
    }

    @Test
    void resetarSenhaPorEmailNaoDeveAceitarSenhaFraca() {
        assertThatThrownBy(() -> service.resetarSenhaPorEmail("user@classe360.com", "123456", "1234567"))
            .isInstanceOf(BadRequestAlertException.class)
            .hasMessageContaining("mínimo 8");
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    private Usuario usuarioAtivo() {
        Usuario usuario = new Usuario();
        usuario.setId(1L);
        usuario.setNome("User Teste");
        usuario.setEmail("user@classe360.com");
        usuario.setAtivo(true);
        usuario.setRole(Usuario.Role.ROLE_ALUNO);
        usuario.setCpf("12345678901");
        usuario.setSenha("senha-antiga");
        return usuario;
    }
}
