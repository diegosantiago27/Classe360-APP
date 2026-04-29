package com.classe360.service;

import com.classe360.domain.PasswordResetToken;
import com.classe360.domain.Usuario;
import com.classe360.repository.PasswordResetTokenRepository;
import com.classe360.repository.UsuarioRepository;
import com.classe360.web.rest.errors.BadRequestAlertException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Redefinição de senha por código enviado ao e-mail para usuários {@link Usuario}.
 */
@Service
public class UsuarioPasswordResetService {

    private static final Logger LOG = LoggerFactory.getLogger(UsuarioPasswordResetService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int CODE_TTL_MINUTES = 15;
    private static final int SENHA_MIN_LENGTH = 8;
    private static final int SENHA_MAX_LENGTH = 100;
    private static final int MAX_REQUESTS_PER_HOUR = 5;
    private static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(1);

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final Map<String, LocalDateTime> lastRequestByKey = new ConcurrentHashMap<>();

    public UsuarioPasswordResetService(
        UsuarioRepository usuarioRepository,
        PasswordResetTokenRepository passwordResetTokenRepository,
        PasswordEncoder passwordEncoder,
        MailService mailService
    ) {
        this.usuarioRepository = usuarioRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
    }

    /**
     * Gera código e envia e-mail sem revelar se o e-mail existe.
     */
    @Transactional
    public void solicitarResetPorEmail(String email, String origem) {
        String emailNormalizado = normalizeEmail(email);
        aplicarRateLimit(emailNormalizado, origem);

        usuarioRepository.findByEmailIgnoreCase(emailNormalizado).ifPresentOrElse(
            usuario -> {
                if (!Boolean.TRUE.equals(usuario.getAtivo())) {
                    LOG.info("Recuperação ignorada para usuário inativo id={}", usuario.getId());
                    return;
                }
                long requestsNaHora = passwordResetTokenRepository.countByUsuarioAndCreatedAtAfter(
                    usuario,
                    LocalDateTime.now().minusHours(1)
                );
                if (requestsNaHora >= MAX_REQUESTS_PER_HOUR) {
                    throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Muitas solicitações. Aguarde alguns minutos para tentar novamente."
                    );
                }

                String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));
                passwordResetTokenRepository.markAllUnusedAsUsed(usuario);
                passwordResetTokenRepository.save(
                    PasswordResetToken
                        .builder()
                        .usuario(usuario)
                        .token(codigo)
                        .expiresAt(LocalDateTime.now().plusMinutes(CODE_TTL_MINUTES))
                        .used(false)
                        .build()
                );
                mailService.sendUsuarioPasswordResetCodeEmailOrThrow(usuario.getEmail(), usuario.getNome(), codigo);
                LOG.info("Código de recuperação gerado para usuário id={}", usuario.getId());
            },
            () -> LOG.info("Solicitação de recuperação para e-mail não cadastrado")
        );
    }

    @Transactional(readOnly = true)
    public void validarCodigoPorEmail(String email, String codigo) {
        Usuario usuario = buscarUsuarioAtivoPorEmail(email);
        PasswordResetToken token = buscarTokenPorCodigo(usuario, codigo);
        validarToken(token);
    }

    @Transactional
    public void resetarSenhaPorEmail(String email, String codigo, String novaSenha) {
        if (novaSenha == null || novaSenha.length() < SENHA_MIN_LENGTH || novaSenha.length() > SENHA_MAX_LENGTH) {
            throw new BadRequestAlertException("A senha deve conter no mínimo 8 caracteres", "usuario", "senhaFraca");
        }
        Usuario usuario = buscarUsuarioAtivoPorEmail(email);
        PasswordResetToken token = buscarTokenPorCodigo(usuario, codigo);
        validarToken(token);

        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuarioRepository.save(usuario);
        token.setUsed(true);
        passwordResetTokenRepository.save(token);
        LOG.info("Senha redefinida com sucesso para usuário id={}", usuario.getId());
    }

    /**
     * Compatibilidade com endpoint legado.
     */
    @Transactional
    public void solicitarReset(String cpfOuEmail) {
        Usuario usuario = findUsuario(cpfOuEmail);
        if (usuario == null) {
            LOG.info("Solicitação de recuperação para identificador não cadastrado");
            return;
        }
        solicitarResetPorEmail(usuario.getEmail(), "legacy");
    }

    /**
     * Compatibilidade com endpoint legado.
     */
    @Transactional
    public void concluirReset(String cpfOuEmail, String codigo, String novaSenha) {
        Usuario usuario = findUsuario(cpfOuEmail);
        if (usuario == null) {
            throw new BadRequestAlertException(
                "Código inválido ou expirado",
                "usuario",
                "codigoInvalidoOuExpirado"
            );
        }
        resetarSenhaPorEmail(usuario.getEmail(), codigo, novaSenha);
    }

    private Usuario buscarUsuarioAtivoPorEmail(String email) {
        String emailNormalizado = normalizeEmail(email);
        Usuario usuario = usuarioRepository
            .findByEmailIgnoreCase(emailNormalizado)
            .orElseThrow(() -> new BadRequestAlertException("Código inválido ou expirado", "usuario", "codigoInvalidoOuExpirado"));
        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new BadRequestAlertException("Código inválido ou expirado", "usuario", "codigoInvalidoOuExpirado");
        }
        return usuario;
    }

    private PasswordResetToken buscarTokenPorCodigo(Usuario usuario, String codigo) {
        String codigoNormalizado = normalizeCodigo(codigo);
        return passwordResetTokenRepository
            .findTopByUsuarioAndTokenOrderByCreatedAtDesc(usuario, codigoNormalizado)
            .orElseThrow(() -> new BadRequestAlertException("Código inválido ou expirado", "usuario", "codigoInvalidoOuExpirado"));
    }

    private void validarToken(PasswordResetToken token) {
        if (Boolean.TRUE.equals(token.getUsed())) {
            throw new BadRequestAlertException(
                "Este código já foi utilizado",
                "usuario",
                "codigoJaUtilizado"
            );
        }
        if (LocalDateTime.now().isAfter(token.getExpiresAt())) {
            throw new BadRequestAlertException("Código expirado. Solicite um novo", "usuario", "codigoExpirado");
        }
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestAlertException("E-mail inválido", "usuario", "emailInvalido");
        }
        return email.trim().toLowerCase();
    }

    private String normalizeCodigo(String codigo) {
        String codigoNormalizado = codigo != null ? codigo.replaceAll("\\s+", "") : "";
        if (!codigoNormalizado.matches("\\d{6}")) {
            throw new BadRequestAlertException("Código inválido ou expirado", "usuario", "codigoInvalidoOuExpirado");
        }
        return codigoNormalizado;
    }

    private void aplicarRateLimit(String email, String origem) {
        LocalDateTime now = LocalDateTime.now();
        String emailKey = "email:" + email;
        String origemNormalizada = origem == null || origem.isBlank() ? "unknown" : origem;
        String origemKey = "origem:" + origemNormalizada;
        validarJanelaRateLimit(emailKey, now);
        validarJanelaRateLimit(origemKey, now);
    }

    private void validarJanelaRateLimit(String key, LocalDateTime now) {
        LocalDateTime ultimoEnvio = lastRequestByKey.get(key);
        if (Objects.nonNull(ultimoEnvio) && ultimoEnvio.plus(RATE_LIMIT_WINDOW).isAfter(now)) {
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Muitas solicitações. Aguarde alguns minutos para tentar novamente."
            );
        }
        lastRequestByKey.put(key, now);
    }

    private Usuario findUsuario(String cpfOuEmail) {
        if (cpfOuEmail == null || cpfOuEmail.isBlank()) {
            return null;
        }
        String valor = cpfOuEmail.trim();
        if (valor.contains("@")) {
            return usuarioRepository.findByEmailIgnoreCase(valor.toLowerCase()).orElse(null);
        }
        String cpf = valor.replaceAll("\\D", "");
        if (cpf.isBlank()) {
            return null;
        }
        return usuarioRepository.findByCpf(cpf).orElse(null);
    }
}
