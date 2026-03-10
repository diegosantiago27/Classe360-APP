package com.classe360.web.rest.v1;

import static com.classe360.security.SecurityUtils.USER_ID_CLAIM;

import com.classe360.domain.SolicitacaoCadastro;
import com.classe360.domain.Usuario;
import com.classe360.service.SolicitacaoCadastroService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class SolicitacaoCadastroResource {

    private final SolicitacaoCadastroService solicitacaoService;

    public SolicitacaoCadastroResource(SolicitacaoCadastroService solicitacaoService) {
        this.solicitacaoService = solicitacaoService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        SolicitacaoCadastro sol = solicitacaoService.criarSolicitacao(toServiceRequest(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
            "id", sol.getId(),
            "message", "Solicitação enviada com sucesso. Aguarde a aprovação de um administrador."
        ));
    }

    @GetMapping("/solicitacoes")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_GESTOR','ROLE_SECRETARIA')")
    public List<SolicitacaoDTO> listarPendentes() {
        return solicitacaoService.listarPendentes().stream()
            .map(SolicitacaoDTO::from)
            .toList();
    }

    @PostMapping("/solicitacoes/{id}/aprovar")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_GESTOR','ROLE_SECRETARIA')")
    public ResponseEntity<Map<String, Object>> aprovar(
        @PathVariable Long id,
        @RequestBody AprovarRequest body,
        Authentication auth
    ) {
        Long userId = getUserId(auth);
        Usuario usuario = solicitacaoService.aprovar(id, body.perfil(), userId);
        return ResponseEntity.ok(Map.of(
            "message", "Usuário aprovado com sucesso.",
            "usuarioId", usuario.getId()
        ));
    }

    @PostMapping("/solicitacoes/{id}/rejeitar")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_GESTOR','ROLE_SECRETARIA')")
    public ResponseEntity<Map<String, Object>> rejeitar(@PathVariable Long id, Authentication auth) {
        Long userId = getUserId(auth);
        solicitacaoService.rejeitar(id, userId);
        return ResponseEntity.ok(Map.of("message", "Solicitação rejeitada."));
    }

    private Long getUserId(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
            Object claim = jwt.getClaim(USER_ID_CLAIM);
            if (claim instanceof Number n) return n.longValue();
        }
        return null;
    }

    private SolicitacaoCadastroService.RegisterRequest toServiceRequest(RegisterRequest r) {
        return new SolicitacaoCadastroService.RegisterRequest(
            r.cpf(),
            r.nome(),
            r.email(),
            r.senha(),
            r.dataNascimento(),
            r.telefone(),
            r.rua(),
            r.numero(),
            r.complemento(),
            r.bairro(),
            r.cidade(),
            r.cep()
        );
    }

    public record RegisterRequest(
        @NotBlank String cpf,
        @NotBlank String nome,
        @NotBlank String email,
        @NotBlank String senha,
        String dataNascimento,
        String telefone,
        String rua,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String cep
    ) {}

    public record AprovarRequest(String perfil) {}

    public record SolicitacaoDTO(
        Long id,
        String cpf,
        String nome,
        String email,
        String dataNascimento,
        String telefone,
        String rua,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String cep,
        String createdAt
    ) {
        static SolicitacaoDTO from(SolicitacaoCadastro s) {
            return new SolicitacaoDTO(
                s.getId(),
                s.getCpf(),
                s.getNome(),
                s.getEmail(),
                s.getDataNascimento(),
                s.getTelefone(),
                s.getRua(),
                s.getNumero(),
                s.getComplemento(),
                s.getBairro(),
                s.getCidade(),
                s.getCep(),
                s.getCreatedAt() != null ? s.getCreatedAt().toString() : null
            );
        }
    }
}
