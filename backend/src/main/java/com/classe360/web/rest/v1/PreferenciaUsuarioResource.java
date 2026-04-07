package com.classe360.web.rest.v1;

import com.classe360.security.SecurityUtils;
import com.classe360.service.PreferenciaUsuarioService;
import com.classe360.service.dto.PreferenciaUsuarioDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/preferencias")
@RequiredArgsConstructor
public class PreferenciaUsuarioResource {

    private final PreferenciaUsuarioService preferenciaUsuarioService;

    @GetMapping("/me")
    public ResponseEntity<PreferenciaUsuarioDTO> getMyPreferences() {
        Long userId = SecurityUtils.getCurrentUserId().orElse(null);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(preferenciaUsuarioService.findOrCreateByUsuarioId(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<PreferenciaUsuarioDTO> saveMyPreferences(@RequestBody PreferenciaUsuarioDTO payload) {
        Long userId = SecurityUtils.getCurrentUserId().orElse(null);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(preferenciaUsuarioService.saveByUsuarioId(userId, payload));
    }
}
