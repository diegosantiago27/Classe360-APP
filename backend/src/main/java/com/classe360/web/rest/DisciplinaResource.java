package com.classe360.web.rest;

import com.classe360.service.DisciplinaService;
import com.classe360.service.dto.DisciplinaDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/disciplinas")
@RequiredArgsConstructor
public class DisciplinaResource {

    private final DisciplinaService disciplinaService;

    @PostMapping
    public ResponseEntity<DisciplinaDTO> createDisciplina(@RequestBody DisciplinaDTO disciplinaDTO) throws URISyntaxException {
        DisciplinaDTO result = disciplinaService.save(disciplinaDTO);
        return ResponseEntity.created(new URI("/api/disciplinas/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<DisciplinaDTO>> getAllDisciplinas(Pageable pageable) {
        Page<DisciplinaDTO> page = disciplinaService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DisciplinaDTO> getDisciplina(@PathVariable Long id) {
        Optional<DisciplinaDTO> disciplinaDTO = disciplinaService.findOne(id);
        return disciplinaDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDisciplina(@PathVariable Long id) {
        disciplinaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}