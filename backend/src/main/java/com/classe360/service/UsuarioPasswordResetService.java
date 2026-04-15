package com.classe360.service;

import com.classe360.domain.Usuario;
import com.classe360.repository.UsuarioRepository;
import com.classe360.web.rest.errors.BadRequestAlertException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Redefinição de senha por código enviado ao e-mail (usuários {@link Usuario} — login por CPF).
 */
@Service
public class UsuarioPasswordResetService {

    private static final Logger LOG = LoggerFactory.getLogger(UsuarioPasswordResetService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int CODE_TTL_MINUTES = 15;
    private static final int SENHA_MIN_LENGTH = 6;
    private static final int SENHA_MAX_LENGTH = 100;

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final Environment environment;

    public UsuarioPasswordResetService(
        UsuarioRepository usuarioRepository,
        PasswordEncoder passwordEncoder,
        MailService mailService,
        Environment environment
    ) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.environment = environment;
    }

    private boolean isDevProfile() {
        return Arrays.stream(environment.getActiveProfiles()).anyMatch("dev"::equalsIgnoreCase);
    }

    /**
     * Gera código e envia e-mail. Não revela se CPF/e-mail existem (mesma resposta HTTP).
     */
    @Transactional
    public void solicitarReset(String cpfOuEmail) {
        findUsuario(cpfOuEmail).ifPresentOrElse(
            u -> {
                if (!Boolean.TRUE.equals(u.getAtivo())) {
                    LOG.debug("Reset ignorado: usuário inativo id={}", u.getId());
                    return;
                }
                String code = String.format("%06d", RANDOM.nextInt(1_000_000));
                u.setPasswordResetCode(code);
                u.setPasswordResetExpiresAt(LocalDateTime.now().plusMinutes(CODE_TTL_MINUTES));
                usuarioRepository.save(u);
                mailService.sendUsuarioPasswordResetCodeEmail(u.getEmail(), u.getNome(), code);
                LOG.debug("Código de reset enviado para usuário id={}", u.getId());
                if (isDevProfile()) {
                    LOG.warn(
                        "[DEV] Código de redefinição de senha para {}: {} — se o e-mail não chegou, o SMTP local provavelmente não está rodando (veja application-dev.yml). Use este código só em desenvolvimento.",
                        u.getEmail(),
                        code
                    );
                }
            },
            () -> {
                if (isDevProfile()) {
                    LOG.warn(
                        "[DEV] Nenhum usuário ativo com esse CPF/e-mail — a API responde igual por segurança. Confira se o e-mail no banco é exatamente o mesmo."
                    );
                }
                LOG.debug("Reset solicitado para CPF/e-mail não cadastrado (resposta neutra)");
            }
        );
    }

    @Transactional
    public void concluirReset(String cpfOuEmail, String codigo, String novaSenha) {
        if (novaSenha == null || novaSenha.length() < SENHA_MIN_LENGTH || novaSenha.length() > SENHA_MAX_LENGTH) {
            throw new BadRequestAlertException("Senha inválida", "usuario", "senhaInvalida");
        }
        String codigoNorm = codigo != null ? codigo.replaceAll("\\s+", "") : "";
        if (!codigoNorm.matches("\\d{6}")) {
            throw new BadRequestAlertException(
                "Código inválido. Informe os 6 dígitos enviados ao seu e-mail.",
                "usuario",
                "codigoInvalido"
            );
        }

        Usuario usuario = findUsuario(cpfOuEmail).orElseThrow(() ->
            new BadRequestAlertException("Não foi possível redefinir a senha. Verifique os dados e solicite um novo código.", "usuario", "resetInvalido")
        );

        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new BadRequestAlertException("Não foi possível redefinir a senha. Verifique os dados e solicite um novo código.", "usuario", "resetInvalido");
        }

        if (usuario.getPasswordResetCode() == null || usuario.getPasswordResetExpiresAt() == null) {
            throw new BadRequestAlertException(
                "Código não encontrado ou já utilizado. Solicite um novo código.",
                "usuario",
                "resetInvalido"
            );
        }

        if (LocalDateTime.now().isAfter(usuario.getPasswordResetExpiresAt())) {
            usuario.setPasswordResetCode(null);
            usuario.setPasswordResetExpiresAt(null);
            usuarioRepository.save(usuario);
            throw new BadRequestAlertException("Código expirado. Solicite um novo código.", "usuario", "codigoExpirado");
        }

        if (!codigoNorm.equals(usuario.getPasswordResetCode())) {
            throw new BadRequestAlertException("Código incorreto. Verifique o e-mail e tente novamente.", "usuario", "codigoIncorreto");
        }

        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuario.setPasswordResetCode(null);
        usuario.setPasswordResetExpiresAt(null);
        usuarioRepository.save(usuario);
        LOG.info("Senha redefinida com sucesso para usuário id={}", usuario.getId());
    }

    private Optional<Usuario> findUsuario(String cpfOuEmail) {
        if (cpfOuEmail == null) return Optional.empty();
        String s = cpfOuEmail.trim();
        if (s.isEmpty()) return Optional.empty();
        if (s.contains("@")) {
            return usuarioRepository.findByEmailIgnoreCase(s.toLowerCase());
        }
        String cpf = s.replaceAll("\\D", "");
        if (cpf.isEmpty()) return Optional.empty();
        return usuarioRepository.findByCpf(cpf);
    }
}
