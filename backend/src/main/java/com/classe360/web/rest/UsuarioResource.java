package com.classe360.web.rest;

import com.classe360.service.UsuarioService;
import com.classe360.service.dto.UsuarioDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioResource {

    private final UsuarioService usuarioService;

    @PostMapping
    public ResponseEntity<UsuarioDTO> createUsuario(@RequestBody UsuarioDTO usuarioDTO) throws URISyntaxException {
        UsuarioDTO result = usuarioService.save(usuarioDTO);
        return ResponseEntity.created(new URI("/api/usuarios/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<UsuarioDTO>> getAllUsuarios(Pageable pageable) {
        Page<UsuarioDTO> page = usuarioService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioDTO> getUsuario(@PathVariable Long id) {
        Optional<UsuarioDTO> usuarioDTO = usuarioService.findOne(id);
        return usuarioDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUsuario(@PathVariable Long id) {
        usuarioService.delete(id);
        return ResponseEntity.noContent().build();
    }
}