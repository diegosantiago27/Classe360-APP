package com.classe360.service;

import com.classe360.domain.Turma;
import com.classe360.repository.TurmaRepository;
import com.classe360.repository.TurnoRepository;
import com.classe360.repository.UsuarioRepository;
import com.classe360.service.dto.TurmaDTO;
import com.classe360.service.mapper.TurmaMapper;
import com.classe360.web.rest.errors.BadRequestAlertException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class TurmaService {

    private final TurmaRepository turmaRepository;
    private final TurmaMapper turmaMapper;
    private final UsuarioRepository usuarioRepository;
    private final TurnoRepository turnoRepository;

    public TurmaDTO save(TurmaDTO turmaDTO) {
        if (turmaDTO.getTurnoId() == null) {
            throw new BadRequestAlertException("Turno é obrigatório", "turma", "turnoObrigatorio");
        }
        turnoRepository
            .findById(turmaDTO.getTurnoId())
            .orElseThrow(() -> new BadRequestAlertException("Turno inválido", "turma", "turnoInvalido"));
        if (turmaDTO.getProfessorId() == null) {
            throw new BadRequestAlertException("Professor é obrigatório", "turma", "professorObrigatorio");
        }
        usuarioRepository
            .findById(turmaDTO.getProfessorId())
            .orElseThrow(() -> new BadRequestAlertException("Professor inválido", "turma", "professorInvalido"));
        Turma turma = turmaMapper.toEntity(turmaDTO);
        turma = turmaRepository.save(turma);
        return turmaMapper.toDto(turma);
    }

    @Transactional(readOnly = true)
    public Page<TurmaDTO> findAll(Pageable pageable) {
        return turmaRepository.findAll(pageable).map(turmaMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<TurmaDTO> findOne(Long id) {
        return turmaRepository.findById(id).map(turmaMapper::toDto);
    }

    public void delete(Long id) {
        turmaRepository.deleteById(id);
    }
}