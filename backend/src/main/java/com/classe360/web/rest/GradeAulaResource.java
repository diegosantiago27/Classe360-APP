package com.classe360.web.rest;

import com.classe360.service.GradeAulaService;
import com.classe360.service.dto.GradeAulaDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/grade-aulas")
@RequiredArgsConstructor
public class GradeAulaResource {

    private final GradeAulaService gradeAulaService;

    @GetMapping
    public ResponseEntity<List<GradeAulaDTO>> getAll() {
        return ResponseEntity.ok(gradeAulaService.findAll());
    }

    @PostMapping
    public ResponseEntity<GradeAulaDTO> save(@RequestBody GradeAulaDTO dto) {
        return ResponseEntity.ok(gradeAulaService.save(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        gradeAulaService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
