package com.classe360.web.rest.v1;

import com.classe360.service.ProvaRelacionalService;
import com.classe360.service.dto.ProvaRelacionalDTO;
import com.classe360.service.dto.ProvaRespostaCorrecaoDTO;
import com.classe360.service.dto.ProvaRespostaSubmitDTO;
import com.classe360.service.dto.ProvaRespostaViewDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/provas-rel")
@RequiredArgsConstructor
public class ProvasRelacionalResource {

    private final ProvaRelacionalService provaRelacionalService;

    @PostMapping
    public ResponseEntity<ProvaRelacionalDTO> criar(@RequestBody ProvaRelacionalDTO body) {
        ProvaRelacionalDTO created = provaRelacionalService.criar(body);
        return ResponseEntity.created(URI.create("/api/v1/provas-rel/" + created.getId())).body(created);
    }

    @GetMapping
    public ResponseEntity<List<ProvaRelacionalDTO>> listar(
        @RequestParam(required = false) Long professorId,
        @RequestParam(required = false) Long alunoId,
        @RequestParam(required = false) String disciplina
    ) {
        if (professorId != null) {
            return ResponseEntity.ok(provaRelacionalService.listarParaProfessor(professorId));
        }
        if (alunoId != null) {
            return ResponseEntity.ok(provaRelacionalService.listarParaAluno(alunoId, disciplina));
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProvaRelacionalDTO> buscar(@PathVariable Long id) {
        return provaRelacionalService.buscar(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/respostas")
    public ResponseEntity<ProvaRespostaViewDTO> enviarResposta(
        @PathVariable Long id,
        @RequestBody ProvaRespostaSubmitDTO body
    ) {
        return ResponseEntity.ok(provaRelacionalService.enviarResposta(id, body));
    }

    @GetMapping("/{id}/respostas/me")
    public ResponseEntity<ProvaRespostaViewDTO> buscarRespostaDoAluno(
        @PathVariable Long id,
        @RequestParam Long alunoId
    ) {
        return provaRelacionalService.buscarRespostaAluno(id, alunoId)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/respostas")
    public ResponseEntity<List<ProvaRespostaViewDTO>> listarRespostasProfessor(
        @RequestParam Long professorId
    ) {
        return ResponseEntity.ok(provaRelacionalService.listarRespostasParaProfessor(professorId));
    }

    @PatchMapping("/{provaId}/respostas/aluno/{alunoId}")
    public ResponseEntity<ProvaRespostaViewDTO> corrigirResposta(
        @PathVariable Long provaId,
        @PathVariable Long alunoId,
        @RequestBody ProvaRespostaCorrecaoDTO body
    ) {
        return ResponseEntity.ok(provaRelacionalService.corrigirRespostaProfessor(provaId, alunoId, body));
    }
}
