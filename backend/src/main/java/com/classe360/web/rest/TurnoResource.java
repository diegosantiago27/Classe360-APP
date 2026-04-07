package com.classe360.web.rest;

import com.classe360.service.TurnoService;
import com.classe360.service.dto.TurnoDTO;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/turnos")
@RequiredArgsConstructor
public class TurnoResource {

    private final TurnoService turnoService;

    @GetMapping
    public ResponseEntity<List<TurnoDTO>> listTurnos() {
        return ResponseEntity.ok(turnoService.findAll());
    }
}
