package com.classe360.web.rest;

import com.classe360.service.AvisoService;
import com.classe360.service.dto.AvisoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/avisos")
@RequiredArgsConstructor
public class AvisoResource {

    private final AvisoService avisoService;

    @PostMapping
    public ResponseEntity<AvisoDTO> createAviso(@RequestBody AvisoDTO avisoDTO) throws URISyntaxException {
        AvisoDTO result = avisoService.save(avisoDTO);
        return ResponseEntity.created(new URI("/api/avisos/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<AvisoDTO>> getAllAvisos(Pageable pageable) {
        Page<AvisoDTO> page = avisoService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AvisoDTO> getAviso(@PathVariable Long id) {
        Optional<AvisoDTO> avisoDTO = avisoService.findOne(id);
        return avisoDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAviso(@PathVariable Long id) {
        avisoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}