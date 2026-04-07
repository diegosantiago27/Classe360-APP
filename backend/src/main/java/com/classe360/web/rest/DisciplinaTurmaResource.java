package com.classe360.web.rest;

import com.classe360.service.DisciplinaTurmaService;
import com.classe360.service.dto.DisciplinaTurmaDTO;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/disciplina-turmas")
@RequiredArgsConstructor
public class DisciplinaTurmaResource {

    private final DisciplinaTurmaService disciplinaTurmaService;

    @GetMapping
    public ResponseEntity<List<DisciplinaTurmaDTO>> getAll() {
        return ResponseEntity.ok(disciplinaTurmaService.findAll());
    }

    @PostMapping
    public ResponseEntity<DisciplinaTurmaDTO> save(@RequestBody DisciplinaTurmaDTO dto) {
        return ResponseEntity.ok(disciplinaTurmaService.save(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        disciplinaTurmaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
