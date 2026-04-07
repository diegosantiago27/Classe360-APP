package com.classe360.web.rest;

import com.classe360.service.InstituicaoService;
import com.classe360.service.dto.InstituicaoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/instituicao")
@RequiredArgsConstructor
public class InstituicaoResource {

    private final InstituicaoService instituicaoService;

    @GetMapping
    public ResponseEntity<InstituicaoDTO> getInstituicao() {
        return instituicaoService.findPrincipal()
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping
    public ResponseEntity<InstituicaoDTO> saveInstituicao(@RequestBody InstituicaoDTO payload) {
        InstituicaoDTO result = instituicaoService.savePrincipal(payload);
        return ResponseEntity.ok(result);
    }
}
