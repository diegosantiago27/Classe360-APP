package com.classe360.web.rest;

import com.classe360.service.NotaService;
import com.classe360.service.dto.NotaDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/notas")
@RequiredArgsConstructor
public class NotaResource {

    private final NotaService notaService;

    @PostMapping
    public ResponseEntity<NotaDTO> createNota(@RequestBody NotaDTO notaDTO) throws URISyntaxException {
        NotaDTO result = notaService.save(notaDTO);
        return ResponseEntity.created(new URI("/api/notas/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<NotaDTO>> getAllNotas(Pageable pageable) {
        Page<NotaDTO> page = notaService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotaDTO> getNota(@PathVariable Long id) {
        Optional<NotaDTO> notaDTO = notaService.findOne(id);
        return notaDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNota(@PathVariable Long id) {
        notaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}