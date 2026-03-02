package com.classe360.web.rest;

import com.classe360.service.QuestaoService;
import com.classe360.service.dto.QuestaoDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;

@RestController
@RequestMapping("/api/questoes")
@RequiredArgsConstructor
public class QuestaoResource {

    private final QuestaoService questaoService;

    @PostMapping
    public ResponseEntity<QuestaoDTO> createQuestao(@RequestBody QuestaoDTO questaoDTO) throws URISyntaxException {
        QuestaoDTO result = questaoService.save(questaoDTO);
        return ResponseEntity.created(new URI("/api/questoes/" + result.getId())).body(result);
    }

    @GetMapping
    public ResponseEntity<Page<QuestaoDTO>> getAllQuestoes(Pageable pageable) {
        Page<QuestaoDTO> page = questaoService.findAll(pageable);
        return ResponseEntity.ok().body(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuestaoDTO> getQuestao(@PathVariable Long id) {
        Optional<QuestaoDTO> questaoDTO = questaoService.findOne(id);
        return questaoDTO.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuestao(@PathVariable Long id) {
        questaoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}