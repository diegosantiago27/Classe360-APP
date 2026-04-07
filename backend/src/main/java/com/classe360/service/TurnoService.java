package com.classe360.service;

import com.classe360.domain.Turno;
import com.classe360.repository.TurnoRepository;
import com.classe360.service.dto.TurnoDTO;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TurnoService {

    private final TurnoRepository turnoRepository;

    public List<TurnoDTO> findAll() {
        return turnoRepository.findAllByOrderByIdAsc().stream().map(this::toDto).toList();
    }

    private TurnoDTO toDto(Turno t) {
        return TurnoDTO.builder().id(t.getId()).codigo(t.getCodigo()).nome(t.getNome()).build();
    }
}
