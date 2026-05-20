package com.classe360.service;

import com.classe360.domain.Aviso;
import com.classe360.domain.Turma;
import com.classe360.domain.Usuario;
import com.classe360.repository.AvisoRepository;
import com.classe360.repository.DisciplinaTurmaRepository;
import com.classe360.repository.TurmaRepository;
import com.classe360.repository.UsuarioRepository;
import com.classe360.security.SecurityUtils;
import com.classe360.service.dto.AvisoDTO;
import com.classe360.service.mapper.AvisoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AvisoService {

    private final AvisoRepository avisoRepository;
    private final AvisoMapper avisoMapper;
    private final UsuarioRepository usuarioRepository;
    private final TurmaRepository turmaRepository;
    private final DisciplinaTurmaRepository disciplinaTurmaRepository;

    public AvisoDTO save(AvisoDTO avisoDTO) {
        Aviso aviso = avisoMapper.toEntity(avisoDTO);
        if (aviso.getDataCriacao() == null) {
            if (aviso.getId() != null) {
                Optional<Aviso> existente = avisoRepository.findById(aviso.getId());
                if (existente.isPresent() && existente.get().getDataCriacao() != null) {
                    aviso.setDataCriacao(existente.get().getDataCriacao());
                } else {
                    aviso.setDataCriacao(LocalDateTime.now());
                }
            } else {
                aviso.setDataCriacao(LocalDateTime.now());
            }
        }
        aviso = avisoRepository.save(aviso);
        return avisoMapper.toDto(aviso);
    }

    @Transactional(readOnly = true)
    public Page<AvisoDTO> findAll(Pageable pageable) {
        List<Aviso> avisosOrdenados = avisoRepository.findAll(Sort.by(Sort.Order.desc("dataCriacao"), Sort.Order.desc("id")));
        List<Aviso> avisosVisiveis = filtrarAvisosPorPerfil(avisosOrdenados);

        int start = (int) pageable.getOffset();
        if (start >= avisosVisiveis.size()) {
            return new PageImpl<>(List.of(), pageable, avisosVisiveis.size());
        }
        int end = Math.min(start + pageable.getPageSize(), avisosVisiveis.size());
        List<AvisoDTO> content = avisosVisiveis.subList(start, end).stream().map(avisoMapper::toDto).toList();
        return new PageImpl<>(content, pageable, avisosVisiveis.size());
    }

    @Transactional(readOnly = true)
    public Optional<AvisoDTO> findOne(Long id) {
        return avisoRepository.findById(id).map(avisoMapper::toDto);
    }

    public void delete(Long id) {
        avisoRepository.deleteById(id);
    }

    private List<Aviso> filtrarAvisosPorPerfil(List<Aviso> avisos) {
        Optional<Long> currentUserId = SecurityUtils.getCurrentUserId();
        if (currentUserId.isEmpty()) {
            return avisos;
        }

        Optional<Usuario> currentUser = usuarioRepository.findById(currentUserId.get());
        if (currentUser.isEmpty() || currentUser.get().getRole() == null) {
            return avisos;
        }

        Usuario usuario = currentUser.get();
        Usuario.Role role = usuario.getRole();
        if (role == Usuario.Role.ROLE_ADMIN || role == Usuario.Role.ROLE_GESTOR || role == Usuario.Role.ROLE_SECRETARIA) {
            return avisos;
        }

        if (role == Usuario.Role.ROLE_PROFESSOR) {
            Set<String> vinculosProfessor = disciplinaTurmaRepository.findByProfessor_Id(usuario.getId()).stream()
                .map(v -> makePairKey(v.getDisciplina().getId(), v.getTurma().getId()))
                .collect(Collectors.toSet());

            return avisos.stream().filter(aviso -> {
                if (isGlobal(aviso)) {
                    return true;
                }
                if (foiCriadoPeloUsuario(aviso, usuario.getId())) {
                    return true;
                }
                if (aviso.getDisciplina() == null || aviso.getTurma() == null) {
                    return false;
                }
                return vinculosProfessor.contains(makePairKey(aviso.getDisciplina().getId(), aviso.getTurma().getId()));
            }).toList();
        }

        if (role == Usuario.Role.ROLE_ALUNO) {
            Set<Long> turmasDoAluno = turmaRepository.findByAlunosId(usuario.getId()).stream().map(Turma::getId).collect(Collectors.toSet());
            return avisos.stream().filter(aviso -> {
                if (isGlobal(aviso)) {
                    return true;
                }
                return aviso.getTurma() != null && turmasDoAluno.contains(aviso.getTurma().getId());
            }).toList();
        }

        return avisos;
    }

    private boolean isGlobal(Aviso aviso) {
        return aviso.getDisciplina() == null && aviso.getTurma() == null;
    }

    private boolean foiCriadoPeloUsuario(Aviso aviso, Long usuarioId) {
        return aviso.getCriadoPor() != null && aviso.getCriadoPor().getId() != null && aviso.getCriadoPor().getId().equals(usuarioId);
    }

    private String makePairKey(Long disciplinaId, Long turmaId) {
        return disciplinaId + ":" + turmaId;
    }
}