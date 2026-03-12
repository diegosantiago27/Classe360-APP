package com.classe360.web.rest.v1;

import com.classe360.domain.UserStorage;
import com.classe360.repository.UserStorageRepository;
import com.classe360.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.NotEmpty;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/storage")
@RequiredArgsConstructor
public class StorageResource {

    private static final String GLOBAL_SCOPE = "__global__";
    private static final Set<String> GLOBAL_KEYS = Set.of(
        "school-compass:usuarios",
        "school-compass:turmas",
        "school-compass:disciplinas",
        "school-compass:disciplinas-vinculos",
        "school-compass:periodos",
        "school-compass:notas",
        "school-compass:notas-alunos",
        "school-compass:frequencia",
        "school-compass:frequencia-diaria",
        "school-compass:provas",
        "school-compass:provas-respostas",
        "school-compass:provas-sessoes",
        "school-compass:atividades",
        "school-compass:atividades-entregas",
        "school-compass:materiais",
        "school-compass:avisos"
    );

    private final UserStorageRepository userStorageRepository;
    private final ObjectMapper objectMapper;

    @PutMapping("/{key}")
    public ResponseEntity<Void> putValue(
        @PathVariable("key") String key,
        @RequestBody Map<String, Object> payload
    ) throws Exception {
        String login = SecurityUtils.getCurrentUserLogin().orElse(null);
        if (login == null) {
            return ResponseEntity.status(401).build();
        }

        Object value = payload.get("value");
        String serializedValue = objectMapper.writeValueAsString(value);

        String scope = isGlobalKey(key) ? GLOBAL_SCOPE : login;
        UserStorage record = userStorageRepository
            .findByUserLoginAndStorageKey(scope, key)
            .orElse(UserStorage.builder().userLogin(scope).storageKey(key).build());
        record.setValueText(serializedValue);
        userStorageRepository.save(record);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/batch-get")
    public ResponseEntity<Map<String, Object>> batchGet(@RequestBody BatchGetRequest request) throws Exception {
        String login = SecurityUtils.getCurrentUserLogin().orElse(null);
        if (login == null) {
            return ResponseEntity.status(401).build();
        }

        Map<String, Object> items = new HashMap<>();
        for (String key : request.keys()) {
            items.put(key, null);
        }

        for (String key : request.keys()) {
            UserStorage row = null;
            if (isGlobalKey(key)) {
                row = userStorageRepository.findByUserLoginAndStorageKey(GLOBAL_SCOPE, key).orElse(null);
                // Compatibilidade: reaproveita primeiro valor já existente desse key.
                if (row == null) {
                    row = userStorageRepository.findFirstByStorageKey(key).orElse(null);
                    if (row != null) {
                        UserStorage globalRow = userStorageRepository
                            .findByUserLoginAndStorageKey(GLOBAL_SCOPE, key)
                            .orElse(UserStorage.builder().userLogin(GLOBAL_SCOPE).storageKey(key).build());
                        globalRow.setValueText(row.getValueText());
                        row = userStorageRepository.save(globalRow);
                    }
                }
            } else {
                row = userStorageRepository.findByUserLoginAndStorageKey(login, key).orElse(null);
            }
            if (row != null) {
                Object value = row.getValueText() == null ? null : objectMapper.readValue(row.getValueText(), Object.class);
                items.put(key, value);
            }
        }

        return ResponseEntity.ok(Map.of("items", items));
    }

    private boolean isGlobalKey(String key) {
        return GLOBAL_KEYS.contains(key);
    }

    public record BatchGetRequest(@NotEmpty List<String> keys) {}
}
