package com.classe360.web.rest;

import com.classe360.service.ProvaService;
import com.classe360.service.dto.ProvaDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/provas")
@RequiredArgsConstructor
public class ProvaResource {

    private final ProvaService provaService;

    @PostMapping
    public ResponseEntity<ProvaDTO> createProva(@RequestBody ProvaDTO provaDTO) throws URISyntaxException {
        ProvaDTO result = provaService.save(provaDTO);
        return ResponseEntity.created(new URI("/api/provas/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<ProvaDTO>> getAllProvas(Pageable pageable) {
        Page<ProvaDTO> page = provaService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProvaDTO> getProva(@PathVariable Long id) {
        Optional<ProvaDTO> provaDTO = provaService.findOne(id);
        return provaDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProva(@PathVariable Long id) {
        provaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}