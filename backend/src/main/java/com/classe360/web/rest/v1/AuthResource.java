package com.classe360.web.rest.v1;

import static com.classe360.security.SecurityUtils.AUTHORITIES_CLAIM;
import static com.classe360.security.SecurityUtils.JWT_ALGORITHM;
import static com.classe360.security.SecurityUtils.USER_ID_CLAIM;

import com.classe360.domain.Usuario;
import com.classe360.repository.UsuarioRepository;
import com.classe360.service.UsuarioService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for Classe360 auth (CPF + senha).
 * Endpoints: POST /api/v1/auth/login, GET /api/v1/auth/me
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthResource {

    private static final Logger LOG = LoggerFactory.getLogger(AuthResource.class);

    private final UsuarioRepository usuarioRepository;
    private final UsuarioService usuarioService;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;

    @Value("${jhipster.security.authentication.jwt.token-validity-in-seconds:86400}")
    private long tokenValidityInSeconds;

    public AuthResource(
        UsuarioRepository usuarioRepository,
        UsuarioService usuarioService,
        PasswordEncoder passwordEncoder,
        JwtEncoder jwtEncoder
    ) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioService = usuarioService;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        String cpfNormalizado = request.cpf.replaceAll("\\D", "");
        Usuario usuario = usuarioRepository
            .findByCpf(cpfNormalizado)
            .orElse(null);

        if (usuario == null || !usuario.getAtivo()) {
            LOG.warn("Login falhou: usuário não encontrado ou inativo - CPF {}", cpfNormalizado);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (!passwordEncoder.matches(request.senha, usuario.getSenha())) {
            LOG.warn("Login falhou: senha inválida para CPF {}", cpfNormalizado);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String jwt = createToken(usuario);
        Map<String, Object> user = toUserMap(usuario);

        return ResponseEntity.ok(Map.of("token", jwt, "user", user));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
        Authentication authentication,
        @Valid @RequestBody ChangePasswordRequest request
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long userId = null;
        if (authentication.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
            userId = jwt.getClaim(USER_ID_CLAIM);
        }
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        usuarioService.changePassword(userId, request.senhaAtual(), request.novaSenha());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/me")
    public ResponseEntity<Map<String, Object>> updateProfile(
        Authentication authentication,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long userId = null;
        if (authentication.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
            userId = jwt.getClaim(USER_ID_CLAIM);
        }
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Usuario usuario = usuarioService.updateProfile(
            userId,
            request.nome(),
            request.email(),
            request.dataNascimento(),
            request.telefone(),
            request.rua(),
            request.numero(),
            request.complemento(),
            request.bairro(),
            request.cidade(),
            request.cep()
        );
        return ResponseEntity.ok(Map.of("user", toUserMap(usuario)));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Object principal = authentication.getPrincipal();
        Long userId = null;
        if (principal instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
            userId = jwt.getClaim(USER_ID_CLAIM);
        }
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return usuarioRepository
            .findById(userId)
            .map(u -> ResponseEntity.ok(Map.<String, Object>of("user", toUserMap(u))))
            .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    private String createToken(Usuario usuario) {
        String authority = usuario.getRole().name();
        Instant now = Instant.now();
        Instant validity = now.plus(tokenValidityInSeconds, ChronoUnit.SECONDS);

        JwtClaimsSet claims = JwtClaimsSet
            .builder()
            .issuedAt(now)
            .expiresAt(validity)
            .subject(usuario.getCpf())
            .claim(AUTHORITIES_CLAIM, authority)
            .claim(USER_ID_CLAIM, usuario.getId())
            .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(JWT_ALGORITHM).build(), claims)).getTokenValue();
    }

    private Map<String, Object> toUserMap(Usuario u) {
        int perfil = switch (u.getRole()) {
            case ROLE_GESTOR -> 1;
            case ROLE_ADMIN -> 2;
            case ROLE_SECRETARIA -> 5;
            case ROLE_PROFESSOR -> 3;
            case ROLE_ALUNO -> 4;
        };
        Map<String, Object> m = new HashMap<>();
        m.put("id", String.valueOf(u.getId()));
        m.put("cpf", u.getCpf());
        m.put("nome", u.getNome());
        m.put("email", u.getEmail());
        m.put("perfil", perfil);
        m.put("primeiroAcesso", false);
        m.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : "");
        m.put("dataNascimento", u.getDataNascimento() != null ? u.getDataNascimento() : "");
        m.put("telefone", u.getTelefone() != null ? u.getTelefone() : "");
        m.put("rua", u.getRua() != null ? u.getRua() : "");
        m.put("numero", u.getNumero() != null ? u.getNumero() : "");
        m.put("complemento", u.getComplemento() != null ? u.getComplemento() : "");
        m.put("bairro", u.getBairro() != null ? u.getBairro() : "");
        m.put("cidade", u.getCidade() != null ? u.getCidade() : "");
        m.put("cep", u.getCep() != null ? u.getCep() : "");
        return m;
    }

    public record LoginRequest(@NotBlank String cpf, @NotBlank String senha) {}

    public record ChangePasswordRequest(@NotBlank String senhaAtual, @NotBlank String novaSenha) {}

    public record UpdateProfileRequest(
        String nome,
        String email,
        String dataNascimento,
        String telefone,
        String rua,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String cep
    ) {}
}
