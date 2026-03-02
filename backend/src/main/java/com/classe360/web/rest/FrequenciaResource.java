package com.classe360.web.rest;

import com.classe360.service.FrequenciaService;
import com.classe360.service.dto.FrequenciaDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/frequencias")
@RequiredArgsConstructor
public class FrequenciaResource {

    private final FrequenciaService frequenciaService;

    @PostMapping
    public ResponseEntity<FrequenciaDTO> createFrequencia(@RequestBody FrequenciaDTO frequenciaDTO) throws URISyntaxException {
        FrequenciaDTO result = frequenciaService.save(frequenciaDTO);
        return ResponseEntity.created(new URI("/api/frequencias/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<FrequenciaDTO>> getAllFrequencias(Pageable pageable) {
        Page<FrequenciaDTO> page = frequenciaService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FrequenciaDTO> getFrequencia(@PathVariable Long id) {
        Optional<FrequenciaDTO> frequenciaDTO = frequenciaService.findOne(id);
        return frequenciaDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFrequencia(@PathVariable Long id) {
        frequenciaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}