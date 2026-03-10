package com.classe360.service;

import com.classe360.domain.SolicitacaoCadastro;
import com.classe360.domain.Usuario;
import com.classe360.repository.SolicitacaoCadastroRepository;
import com.classe360.repository.UsuarioRepository;
import com.classe360.web.rest.errors.BadRequestAlertException;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Serviço de cadastro temporário.
 * Fluxo: 1) Pessoa se cadastra → dados vão para cadastro_temporario
 *        2) Admin autoriza → dados são transferidos para tabela usuario (cadastro definitivo)
 */
@Service
public class SolicitacaoCadastroService {

    private static final Logger LOG = LoggerFactory.getLogger(SolicitacaoCadastroService.class);

    private final SolicitacaoCadastroRepository solicitacaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public SolicitacaoCadastroService(
        SolicitacaoCadastroRepository solicitacaoRepository,
        UsuarioRepository usuarioRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.solicitacaoRepository = solicitacaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public SolicitacaoCadastro criarSolicitacao(RegisterRequest request) {
        String cpfNorm = request.cpf().replaceAll("\\D", "");

        if (usuarioRepository.findByCpf(cpfNorm).isPresent()) {
            throw new BadRequestAlertException("CPF já cadastrado no sistema", "solicitacaoCadastro", "cpfJaCadastrado");
        }

        boolean cpfOuEmailJaSolicitado = solicitacaoRepository.findByStatusOrderByCreatedAtDesc(SolicitacaoCadastro.Status.PENDENTE)
            .stream()
            .anyMatch(s -> {
                String sCpf = s.getCpf() != null ? s.getCpf().replaceAll("\\D", "") : "";
                String sEmail = s.getEmail() != null ? s.getEmail() : "";
                String reqEmail = request.email() != null ? request.email() : "";
                return sCpf.equals(cpfNorm) || sEmail.equalsIgnoreCase(reqEmail);
            });
        if (cpfOuEmailJaSolicitado) {
            throw new BadRequestAlertException("Já existe solicitação pendente para este CPF ou e-mail", "solicitacaoCadastro", "solicitacaoDuplicada");
        }

        SolicitacaoCadastro sol = SolicitacaoCadastro.builder()
            .cpf(cpfNorm)
            .nome(request.nome())
            .email(request.email().toLowerCase())
            .senha(passwordEncoder.encode(request.senha()))
            .dataNascimento(request.dataNascimento())
            .telefone(request.telefone())
            .rua(request.rua())
            .numero(request.numero())
            .complemento(request.complemento())
            .bairro(request.bairro())
            .cidade(request.cidade())
            .cep(request.cep())
            .status(SolicitacaoCadastro.Status.PENDENTE)
            .build();

        return solicitacaoRepository.save(sol);
    }

    public List<SolicitacaoCadastro> listarPendentes() {
        return solicitacaoRepository.findByStatusOrderByCreatedAtDesc(SolicitacaoCadastro.Status.PENDENTE);
    }

    @Transactional
    public Usuario aprovar(Long solicitacaoId, String perfil, Long aprovadoPorId) {
        SolicitacaoCadastro sol = solicitacaoRepository.findById(solicitacaoId)
            .orElseThrow(() -> new BadRequestAlertException("Solicitação não encontrada", "solicitacaoCadastro", "solicitacaoNaoEncontrada"));

        if (sol.getStatus() != SolicitacaoCadastro.Status.PENDENTE) {
            throw new BadRequestAlertException("Solicitação já foi processada", "solicitacaoCadastro", "solicitacaoJaProcessada");
        }

        if (usuarioRepository.findByCpf(sol.getCpf()).isPresent()) {
            throw new BadRequestAlertException("CPF já cadastrado no sistema", "solicitacaoCadastro", "cpfJaCadastrado");
        }

        if (usuarioRepository.findByEmailIgnoreCase(sol.getEmail()).isPresent()) {
            throw new BadRequestAlertException("E-mail já cadastrado no sistema", "solicitacaoCadastro", "emailJaCadastrado");
        }

        Usuario.Role role = mapPerfilToRole(perfil);

        Usuario usuario = Usuario.builder()
            .cpf(sol.getCpf())
            .nome(sol.getNome())
            .email(sol.getEmail())
            .senha(sol.getSenha())
            .role(role)
            .ativo(true)
            .dataNascimento(sol.getDataNascimento())
            .telefone(sol.getTelefone())
            .rua(sol.getRua())
            .numero(sol.getNumero())
            .complemento(sol.getComplemento())
            .bairro(sol.getBairro())
            .cidade(sol.getCidade())
            .cep(sol.getCep())
            .build();

        usuario = usuarioRepository.save(usuario);

        solicitacaoRepository.delete(sol);

        LOG.info("Solicitação {} aprovada. Usuário {} criado com perfil {}", solicitacaoId, usuario.getId(), perfil);
        return usuario;
    }

    @Transactional
    public void rejeitar(Long solicitacaoId, Long rejeitadoPorId) {
        SolicitacaoCadastro sol = solicitacaoRepository.findById(solicitacaoId)
            .orElseThrow(() -> new BadRequestAlertException("Solicitação não encontrada", "solicitacaoCadastro", "solicitacaoNaoEncontrada"));

        if (sol.getStatus() != SolicitacaoCadastro.Status.PENDENTE) {
            throw new BadRequestAlertException("Solicitação já foi processada", "solicitacaoCadastro", "solicitacaoJaProcessada");
        }

        sol.setStatus(SolicitacaoCadastro.Status.REJEITADO);
        sol.setAprovadoPorId(rejeitadoPorId);
        sol.setDataAprovacao(LocalDateTime.now());
        solicitacaoRepository.save(sol);

        LOG.info("Solicitação {} rejeitada.", solicitacaoId);
    }

    private Usuario.Role mapPerfilToRole(String perfil) {
        return switch (perfil != null ? perfil.toUpperCase() : "ALUNO") {
            case "GESTOR" -> Usuario.Role.ROLE_GESTOR;
            case "ADMIN", "ADMINISTRADOR" -> Usuario.Role.ROLE_ADMIN;
            case "SECRETARIA" -> Usuario.Role.ROLE_SECRETARIA;
            case "PROFESSOR" -> Usuario.Role.ROLE_PROFESSOR;
            default -> Usuario.Role.ROLE_ALUNO;
        };
    }

    public record RegisterRequest(
        String cpf,
        String nome,
        String email,
        String senha,
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
