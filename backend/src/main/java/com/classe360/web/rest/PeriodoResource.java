package com.classe360.web.rest;

import com.classe360.service.PeriodoService;
import com.classe360.service.dto.PeriodoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/periodos")
@RequiredArgsConstructor
public class PeriodoResource {

    private final PeriodoService periodoService;

    @PostMapping
    public ResponseEntity<PeriodoDTO> createPeriodo(@RequestBody PeriodoDTO periodoDTO) throws URISyntaxException {
        PeriodoDTO result = periodoService.save(periodoDTO);
        return ResponseEntity.created(new URI("/api/periodos/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<PeriodoDTO>> getAllPeriodos(Pageable pageable) {
        Page<PeriodoDTO> page = periodoService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PeriodoDTO> getPeriodo(@PathVariable Long id) {
        Optional<PeriodoDTO> periodoDTO = periodoService.findOne(id);
        return periodoDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePeriodo(@PathVariable Long id) {
        periodoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}