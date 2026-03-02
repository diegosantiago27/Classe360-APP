package com.classe360.web.rest;

import com.classe360.service.EntregaAtividadeService;
import com.classe360.service.dto.EntregaAtividadeDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/entregas-atividades")
@RequiredArgsConstructor
public class EntregaAtividadeResource {

    private final EntregaAtividadeService entregaAtividadeService;

    @PostMapping
    public ResponseEntity<EntregaAtividadeDTO> createEntregaAtividade(@RequestBody EntregaAtividadeDTO entregaAtividadeDTO) throws URISyntaxException {
        EntregaAtividadeDTO result = entregaAtividadeService.save(entregaAtividadeDTO);
        return ResponseEntity.created(new URI("/api/entregas-atividades/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<EntregaAtividadeDTO>> getAllEntregasAtividades(Pageable pageable) {
        Page<EntregaAtividadeDTO> page = entregaAtividadeService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EntregaAtividadeDTO> getEntregaAtividade(@PathVariable Long id) {
        Optional<EntregaAtividadeDTO> entregaAtividadeDTO = entregaAtividadeService.findOne(id);
        return entregaAtividadeDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEntregaAtividade(@PathVariable Long id) {
        entregaAtividadeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}