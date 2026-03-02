package com.classe360.web.rest;

import com.classe360.service.TurmaService;
import com.classe360.service.dto.TurmaDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/turmas")
@RequiredArgsConstructor
public class TurmaResource {

    private final TurmaService turmaService;

    @PostMapping
    public ResponseEntity<TurmaDTO> createTurma(@RequestBody TurmaDTO turmaDTO) throws URISyntaxException {
        TurmaDTO result = turmaService.save(turmaDTO);
        return ResponseEntity.created(new URI("/api/turmas/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<TurmaDTO>> getAllTurmas(Pageable pageable) {
        Page<TurmaDTO> page = turmaService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TurmaDTO> getTurma(@PathVariable Long id) {
        Optional<TurmaDTO> turmaDTO = turmaService.findOne(id);
        return turmaDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTurma(@PathVariable Long id) {
        turmaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}