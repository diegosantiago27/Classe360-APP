package com.classe360.service;

import com.classe360.domain.Usuario;
import com.classe360.repository.UsuarioRepository;
import com.classe360.service.dto.UsuarioDTO;
import com.classe360.service.mapper.UsuarioMapper;
import com.classe360.web.rest.errors.BadRequestAlertException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UsuarioService {

    private static final int SENHA_MIN_LENGTH = 6;
    private static final int SENHA_MAX_LENGTH = 100;

    private final UsuarioRepository usuarioRepository;
    private final UsuarioMapper usuarioMapper;
    private final PasswordEncoder passwordEncoder;

    public UsuarioDTO save(UsuarioDTO usuarioDTO) {
        Usuario usuario = usuarioMapper.toEntity(usuarioDTO);
        usuario = usuarioRepository.save(usuario);
        return usuarioMapper.toDto(usuario);
    }

    @Transactional(readOnly = true)
    public Page<UsuarioDTO> findAll(Pageable pageable) {
        return usuarioRepository.findAll(pageable).map(usuarioMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<UsuarioDTO> findOne(Long id) {
        return usuarioRepository.findById(id).map(usuarioMapper::toDto);
    }

    public void delete(Long id) {
        usuarioRepository.deleteById(id);
    }

    public void changePassword(Long userId, String senhaAtual, String novaSenha) {
        if (novaSenha == null || novaSenha.length() < SENHA_MIN_LENGTH || novaSenha.length() > SENHA_MAX_LENGTH) {
            throw new BadRequestAlertException(
                "Senha inválida",
                "usuario",
                "senhaInvalida"
            );
        }

        Usuario usuario = usuarioRepository
            .findById(userId)
            .orElseThrow(() -> new BadRequestAlertException("Usuário não encontrado", "usuario", "usuarioNaoEncontrado"));

        if (!passwordEncoder.matches(senhaAtual, usuario.getSenha())) {
            throw new BadRequestAlertException("Senha atual incorreta", "usuario", "senhaAtualIncorreta");
        }

        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuarioRepository.save(usuario);
    }

    public Usuario updateProfile(
        Long userId,
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
    ) {
        Usuario usuario = usuarioRepository
            .findById(userId)
            .orElseThrow(() -> new BadRequestAlertException("Usuário não encontrado", "usuario", "usuarioNaoEncontrado"));

        if (nome != null) {
            if (nome.isBlank()) {
                throw new BadRequestAlertException("Nome é obrigatório", "usuario", "nomeObrigatorio");
            }
            usuario.setNome(nome.trim());
        }
        if (email != null) {
            if (email.isBlank()) {
                throw new BadRequestAlertException("E-mail é obrigatório", "usuario", "emailObrigatorio");
            }
            String emailNorm = email.toLowerCase().trim();
            usuarioRepository
                .findByEmailIgnoreCase(emailNorm)
                .filter(u -> !u.getId().equals(userId))
                .ifPresent(u -> {
                    throw new BadRequestAlertException("E-mail já cadastrado", "usuario", "emailJaCadastrado");
                });
            usuario.setEmail(emailNorm);
        }
        if (dataNascimento != null) usuario.setDataNascimento(dataNascimento);
        if (telefone != null) usuario.setTelefone(telefone);
        if (rua != null) usuario.setRua(rua);
        if (numero != null) usuario.setNumero(numero);
        if (complemento != null) usuario.setComplemento(complemento);
        if (bairro != null) usuario.setBairro(bairro);
        if (cidade != null) usuario.setCidade(cidade);
        if (cep != null) usuario.setCep(cep);

        return usuarioRepository.save(usuario);
    }
}