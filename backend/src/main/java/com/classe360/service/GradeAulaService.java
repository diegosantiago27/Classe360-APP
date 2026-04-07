package com.classe360.service;

import com.classe360.domain.Disciplina;
import com.classe360.domain.GradeAula;
import com.classe360.domain.Turma;
import com.classe360.repository.DisciplinaRepository;
import com.classe360.repository.GradeAulaRepository;
import com.classe360.repository.TurmaRepository;
import com.classe360.service.dto.GradeAulaDTO;
import com.classe360.web.rest.errors.BadRequestAlertException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class GradeAulaService {

    private final GradeAulaRepository gradeAulaRepository;
    private final DisciplinaRepository disciplinaRepository;
    private final TurmaRepository turmaRepository;

    @Transactional(readOnly = true)
    public List<GradeAulaDTO> findAll() {
        return gradeAulaRepository.findAll().stream().map(this::toDto).toList();
    }

    public GradeAulaDTO save(GradeAulaDTO dto) {
        Disciplina disciplina = disciplinaRepository
            .findById(dto.getDisciplinaId())
            .orElseThrow(() -> new BadRequestAlertException("Disciplina inválida", "gradeAula", "disciplinaInvalida"));
        Turma turma = turmaRepository
            .findById(dto.getTurmaId())
            .orElseThrow(() -> new BadRequestAlertException("Turma inválida", "gradeAula", "turmaInvalida"));

        GradeAula entity = dto.getId() != null
            ? gradeAulaRepository.findById(dto.getId()).orElseGet(GradeAula::new)
            : new GradeAula();

        entity.setDisciplina(disciplina);
        entity.setTurma(turma);
        entity.setDia(dto.getDia());
        entity.setInicio(dto.getInicio());
        entity.setFim(dto.getFim());

        entity = gradeAulaRepository.save(entity);
        return toDto(entity);
    }

    public void delete(Long id) {
        gradeAulaRepository.deleteById(id);
    }

    private GradeAulaDTO toDto(GradeAula entity) {
        return GradeAulaDTO.builder()
            .id(entity.getId())
            .disciplinaId(entity.getDisciplina() != null ? entity.getDisciplina().getId() : null)
            .turmaId(entity.getTurma() != null ? entity.getTurma().getId() : null)
            .dia(entity.getDia())
            .inicio(entity.getInicio())
            .fim(entity.getFim())
            .build();
    }
}
