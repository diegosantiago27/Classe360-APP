package com.classe360.service;

import com.classe360.domain.Disciplina;
import com.classe360.domain.DisciplinaTurma;
import com.classe360.domain.Turma;
import com.classe360.domain.Usuario;
import com.classe360.repository.DisciplinaRepository;
import com.classe360.repository.DisciplinaTurmaRepository;
import com.classe360.repository.TurmaRepository;
import com.classe360.repository.UsuarioRepository;
import com.classe360.service.dto.DisciplinaTurmaDTO;
import com.classe360.web.rest.errors.BadRequestAlertException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class DisciplinaTurmaService {

    private final DisciplinaTurmaRepository disciplinaTurmaRepository;
    private final DisciplinaRepository disciplinaRepository;
    private final TurmaRepository turmaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<DisciplinaTurmaDTO> findAll() {
        return disciplinaTurmaRepository.findAll().stream().map(this::toDto).toList();
    }

    public DisciplinaTurmaDTO save(DisciplinaTurmaDTO dto) {
        Disciplina disciplina = disciplinaRepository
            .findById(dto.getDisciplinaId())
            .orElseThrow(() -> new BadRequestAlertException("Disciplina inválida", "disciplinaTurma", "disciplinaInvalida"));
        Turma turma = turmaRepository
            .findById(dto.getTurmaId())
            .orElseThrow(() -> new BadRequestAlertException("Turma inválida", "disciplinaTurma", "turmaInvalida"));

        Usuario professor = null;
        if (dto.getProfessorId() != null) {
            professor = usuarioRepository
                .findById(dto.getProfessorId())
                .orElseThrow(() -> new BadRequestAlertException("Professor inválido", "disciplinaTurma", "professorInvalido"));
        }

        DisciplinaTurma entity;
        if (dto.getId() != null) {
            entity = disciplinaTurmaRepository.findById(dto.getId()).orElseGet(DisciplinaTurma::new);
        } else {
            entity = disciplinaTurmaRepository
                .findByDisciplina_IdAndTurma_Id(dto.getDisciplinaId(), dto.getTurmaId())
                .orElseGet(DisciplinaTurma::new);
        }

        entity.setDisciplina(disciplina);
        entity.setTurma(turma);
        entity.setProfessor(professor);

        entity = disciplinaTurmaRepository.save(entity);
        return toDto(entity);
    }

    public void delete(Long id) {
        disciplinaTurmaRepository.deleteById(id);
    }

    private DisciplinaTurmaDTO toDto(DisciplinaTurma e) {
        return DisciplinaTurmaDTO.builder()
            .id(e.getId())
            .disciplinaId(e.getDisciplina() != null ? e.getDisciplina().getId() : null)
            .turmaId(e.getTurma() != null ? e.getTurma().getId() : null)
            .professorId(e.getProfessor() != null ? e.getProfessor().getId() : null)
            .disciplinaNome(e.getDisciplina() != null ? e.getDisciplina().getNome() : null)
            .turmaNome(e.getTurma() != null ? e.getTurma().getNome() : null)
            .professorNome(e.getProfessor() != null ? e.getProfessor().getNome() : null)
            .build();
    }
}
