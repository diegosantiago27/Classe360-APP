package com.classe360.web.rest;

import com.classe360.service.AtividadeService;
import com.classe360.service.dto.AtividadeDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/atividades")
@RequiredArgsConstructor
public class AtividadeResource {

    private final AtividadeService atividadeService;

    @PostMapping
    public ResponseEntity<AtividadeDTO> createAtividade(@RequestBody AtividadeDTO atividadeDTO) throws URISyntaxException {
        AtividadeDTO result = atividadeService.save(atividadeDTO);
        return ResponseEntity.created(new URI("/api/atividades/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<AtividadeDTO>> getAllAtividades(Pageable pageable) {
        Page<AtividadeDTO> page = atividadeService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AtividadeDTO> getAtividade(@PathVariable Long id) {
        Optional<AtividadeDTO> atividadeDTO = atividadeService.findOne(id);
        return atividadeDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAtividade(@PathVariable Long id) {
        atividadeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}