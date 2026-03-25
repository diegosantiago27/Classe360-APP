package com.classe360.web.rest.v1;

import com.classe360.service.NotaLancamentoService;
import com.classe360.service.dto.NotaLancamentoUpsertDTO;
import com.classe360.service.dto.NotaLancamentoViewDTO;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notas-rel")
@RequiredArgsConstructor
public class NotasRelacionalResource {

    private final NotaLancamentoService notaLancamentoService;

    @GetMapping("/lancamentos")
    public ResponseEntity<List<NotaLancamentoViewDTO>> listarLancamentos(
        @RequestParam String turma,
        @RequestParam String disciplina,
        @RequestParam String bimestre
    ) {
        return ResponseEntity.ok(notaLancamentoService.listarLancamentos(turma, disciplina, bimestre));
    }

    @GetMapping("/aluno")
    public ResponseEntity<List<NotaLancamentoViewDTO>> listarPorAluno(@RequestParam Long alunoId) {
        return ResponseEntity.ok(notaLancamentoService.listarPorAluno(alunoId));
    }

    @PatchMapping("/lancamentos")
    public ResponseEntity<NotaLancamentoViewDTO> upsert(@RequestBody NotaLancamentoUpsertDTO body) {
        return ResponseEntity.ok(notaLancamentoService.upsert(body));
    }

    @PutMapping("/lancamentos")
    public ResponseEntity<List<NotaLancamentoViewDTO>> upsertLote(@RequestBody List<NotaLancamentoUpsertDTO> body) {
        return ResponseEntity.ok(notaLancamentoService.upsertLote(body));
    }
}
