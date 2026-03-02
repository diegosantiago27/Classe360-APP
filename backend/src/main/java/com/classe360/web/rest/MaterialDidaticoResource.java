package com.classe360.web.rest;

import com.classe360.service.MaterialDidaticoService;
import com.classe360.service.dto.MaterialDidaticoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/materiais-didaticos")
@RequiredArgsConstructor
public class MaterialDidaticoResource {

    private final MaterialDidaticoService materialDidaticoService;

    @PostMapping
    public ResponseEntity<MaterialDidaticoDTO> createMaterialDidatico(@RequestBody MaterialDidaticoDTO materialDidaticoDTO) throws URISyntaxException {
        MaterialDidaticoDTO result = materialDidaticoService.save(materialDidaticoDTO);
        return ResponseEntity.created(new URI("/api/materiais-didaticos/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<MaterialDidaticoDTO>> getAllMateriaisDidaticos(Pageable pageable) {
        Page<MaterialDidaticoDTO> page = materialDidaticoService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaterialDidaticoDTO> getMaterialDidatico(@PathVariable Long id) {
        Optional<MaterialDidaticoDTO> materialDidaticoDTO = materialDidaticoService.findOne(id);
        return materialDidaticoDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMaterialDidatico(@PathVariable Long id) {
        materialDidaticoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}