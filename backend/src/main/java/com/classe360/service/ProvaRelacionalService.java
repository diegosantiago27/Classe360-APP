package com.classe360.service;

import com.classe360.domain.*;
import com.classe360.repository.*;
import com.classe360.service.dto.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class ProvaRelacionalService {

    private final ProvaRepository provaRepository;
    private final QuestaoRepository questaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final TurmaRepository turmaRepository;
    private final DisciplinaRepository disciplinaRepository;
    private final ProvaRespostaRepository provaRespostaRepository;
    private final ObjectMapper objectMapper;
    private final NotaLancamentoService notaLancamentoService;

    public ProvaRelacionalDTO criar(ProvaRelacionalDTO req) {
        if (req.getProfessorId() == null) {
            throw new IllegalArgumentException("professorId é obrigatório");
        }
        Usuario professor = usuarioRepository.findById(req.getProfessorId())
            .orElseThrow(() -> new IllegalArgumentException("Professor não encontrado"));

        Disciplina disciplina = resolverDisciplina(req.getDisciplinaId(), req.getDisciplinaNome());
        Turma turma = resolverTurma(req.getTurmaId(), req.getTurmaNome(), req.getTurno(), professor);

        Prova prova = Prova.builder()
            .titulo(req.getTitulo())
            .descricao(req.getDescricao())
            .turma(turma)
            .disciplina(disciplina)
            .professor(professor)
            .data(req.getData())
            .ativa(Boolean.TRUE)
            .periodo(req.getPeriodo())
            .horario(req.getHorario())
            .instrucoes(req.getInstrucoes())
            .status(req.getStatus() != null ? req.getStatus() : "Agendada")
            .publicada(Boolean.TRUE.equals(req.getPublicada()))
            .turno(req.getTurno())
            .build();
        prova = provaRepository.save(prova);

        List<Questao> questoes = new ArrayList<>();
        for (ProvaQuestaoPayloadDTO q : req.getQuestoes()) {
            Questao.TipoQuestao tipo = normalizarTipo(q.getTipo());
            String respostaCorreta = q.getCorretaIndex() != null ? String.valueOf(q.getCorretaIndex()) : null;
            Questao questao = Questao.builder()
                .prova(prova)
                .enunciado(q.getEnunciado())
                .tipo(tipo)
                .alternativas(q.getOpcoes() != null ? q.getOpcoes() : List.of())
                .respostaCorreta(respostaCorreta)
                .pontos(q.getPontos() != null ? q.getPontos() : 1d)
                .build();
            questoes.add(questaoRepository.save(questao));
        }
        return toProvaDto(prova, questoes);
    }

    @Transactional(readOnly = true)
    public List<ProvaRelacionalDTO> listarParaProfessor(Long professorId) {
        if (professorId == null) return List.of();
        List<Prova> provas = provaRepository.findByProfessorIdOrderByDataDesc(professorId);
        return provas.stream().map(this::toProvaDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ProvaRelacionalDTO> listarParaAluno(Long alunoId, String disciplinaNome) {
        if (alunoId == null) return List.of();
        List<Turma> turmasAluno = turmaRepository.findByAlunosId(alunoId);
        if (turmasAluno.isEmpty()) return List.of();
        List<Long> turmaIds = turmasAluno.stream().map(Turma::getId).toList();
        List<Prova> provas = provaRepository.findByTurmaIdInAndPublicadaTrueAndAtivaTrueOrderByDataAsc(turmaIds);

        String filtroDisciplina = normalizar(disciplinaNome);
        return provas.stream()
            .filter(p -> filtroDisciplina.isBlank() || normalizar(p.getDisciplina().getNome()).equals(filtroDisciplina))
            .map(this::toProvaDto)
            .toList();
    }

    @Transactional(readOnly = true)
    public Optional<ProvaRelacionalDTO> buscar(Long provaId) {
        return provaRepository.findById(provaId).map(this::toProvaDto);
    }

    public ProvaRespostaViewDTO enviarResposta(Long provaId, ProvaRespostaSubmitDTO req) {
        if (req.getAlunoId() == null) throw new IllegalArgumentException("alunoId é obrigatório");
        Prova prova = provaRepository.findById(provaId)
            .orElseThrow(() -> new IllegalArgumentException("Prova não encontrada"));
        Usuario aluno = usuarioRepository.findById(req.getAlunoId())
            .orElseThrow(() -> new IllegalArgumentException("Aluno não encontrado"));
        List<Questao> questoes = questaoRepository.findByProvaIdOrderByIdAsc(provaId);

        Map<Long, ProvaRespostaItemDTO> respostaPorQuestao = new HashMap<>();
        for (ProvaRespostaItemDTO item : req.getRespostas()) {
            if (item.getQuestaoId() != null) respostaPorQuestao.put(item.getQuestaoId(), item);
        }

        double pontosMaximos = 0d;
        double pontosObtidos = 0d;
        List<ProvaRespostaItemDTO> respostasFinal = new ArrayList<>();
        for (Questao q : questoes) {
            ProvaRespostaItemDTO enviada = respostaPorQuestao.getOrDefault(q.getId(), ProvaRespostaItemDTO.builder()
                .questaoId(q.getId())
                .tipo(q.getTipo() == Questao.TipoQuestao.ABERTA ? "aberta" : "multipla")
                .build());
            double pontosQuestao = q.getPontos() != null ? q.getPontos() : 0d;
            pontosMaximos += pontosQuestao;

            Double pontosDaResposta = null;
            if (q.getTipo() == Questao.TipoQuestao.MULTIPLA_ESCOLHA) {
                boolean correta = enviada.getAlternativaIndex() != null
                    && q.getRespostaCorreta() != null
                    && q.getRespostaCorreta().equals(String.valueOf(enviada.getAlternativaIndex()));
                pontosDaResposta = correta ? pontosQuestao : 0d;
                pontosObtidos += pontosDaResposta;
            }
            enviada.setPontosObtidos(pontosDaResposta);
            respostasFinal.add(enviada);
        }

        ProvaResposta entity = provaRespostaRepository.findByProvaIdAndAlunoId(provaId, req.getAlunoId())
            .orElse(ProvaResposta.builder()
                .prova(prova)
                .aluno(aluno)
                .build());
        entity.setStatus("Enviado");
        entity.setPontosMaximos(pontosMaximos);
        entity.setPontosObtidos(pontosObtidos);
        entity.setNotaFinal(pontosMaximos > 0 ? Math.round((pontosObtidos / pontosMaximos) * 10_000d) / 1000d : null);
        entity.setEnviadoEm(LocalDateTime.now());
        entity.setFinalizadaPorTempo(Boolean.TRUE.equals(req.getFinalizadaPorTempo()));
        entity.setRespostasJson(writeJson(respostasFinal));
        entity = provaRespostaRepository.save(entity);

        return toRespostaDto(entity, prova, aluno, respostasFinal);
    }

    @Transactional(readOnly = true)
    public Optional<ProvaRespostaViewDTO> buscarRespostaAluno(Long provaId, Long alunoId) {
        if (provaId == null || alunoId == null) return Optional.empty();
        return provaRespostaRepository.findByProvaIdAndAlunoId(provaId, alunoId)
            .map(entity -> {
                Prova prova = entity.getProva();
                Usuario aluno = entity.getAluno();
                List<ProvaRespostaItemDTO> itens = readItens(entity.getRespostasJson());
                return toRespostaDto(entity, prova, aluno, itens);
            });
    }

    @Transactional(readOnly = true)
    public List<ProvaRespostaViewDTO> listarRespostasParaProfessor(Long professorId) {
        if (professorId == null) return List.of();
        return provaRespostaRepository.findByProvaProfessorId(professorId).stream()
            .map(entity -> {
                Prova prova = entity.getProva();
                Usuario aluno = entity.getAluno();
                List<ProvaRespostaItemDTO> itens = readItens(entity.getRespostasJson());
                return toRespostaDto(entity, prova, aluno, itens);
            })
            .sorted(Comparator.comparing(ProvaRespostaViewDTO::getEnviadoEm, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    }

    public ProvaRespostaViewDTO corrigirRespostaProfessor(Long provaId, Long alunoId, ProvaRespostaCorrecaoDTO req) {
        if (provaId == null || alunoId == null) throw new IllegalArgumentException("provaId e alunoId são obrigatórios");
        if (req.getProfessorId() == null) throw new IllegalArgumentException("professorId é obrigatório");
        if (req.getNotaFinal() == null || req.getNotaFinal() < 0 || req.getNotaFinal() > 10) {
            throw new IllegalArgumentException("notaFinal deve estar entre 0 e 10");
        }
        Prova prova = provaRepository.findById(provaId)
            .orElseThrow(() -> new IllegalArgumentException("Prova não encontrada"));
        if (prova.getProfessor() == null || !prova.getProfessor().getId().equals(req.getProfessorId())) {
            throw new IllegalArgumentException("Professor não autorizado a corrigir esta prova");
        }
        ProvaResposta entity = provaRespostaRepository.findByProvaIdAndAlunoId(provaId, alunoId)
            .orElseThrow(() -> new IllegalArgumentException("Resposta não encontrada"));
        Usuario aluno = entity.getAluno();

        double pontosMax = entity.getPontosMaximos() != null ? entity.getPontosMaximos() : 0d;
        double pontosObtidos;
        if (pontosMax > 0) {
            pontosObtidos = Math.round((req.getNotaFinal() / 10.0) * pontosMax * 1000d) / 1000d;
        } else {
            pontosObtidos = req.getNotaFinal();
        }
        entity.setNotaFinal(req.getNotaFinal());
        entity.setPontosObtidos(pontosObtidos);
        entity.setStatus("Corrigido");
        entity.setCorrigidoEm(LocalDateTime.now());
        entity = provaRespostaRepository.save(entity);

        try {
            notaLancamentoService.sincronizarNotaAposCorrecaoProva(alunoId, prova);
        } catch (Exception ex) {
            // Não falha a correção da prova se o espelho em Nota falhar (ex.: período inválido)
        }

        List<ProvaRespostaItemDTO> itens = readItens(entity.getRespostasJson());
        return toRespostaDto(entity, prova, aluno, itens);
    }

    private ProvaRelacionalDTO toProvaDto(Prova prova) {
        List<Questao> questoes = questaoRepository.findByProvaIdOrderByIdAsc(prova.getId());
        return toProvaDto(prova, questoes);
    }

    private ProvaRelacionalDTO toProvaDto(Prova prova, List<Questao> questoes) {
        List<ProvaQuestaoPayloadDTO> questoesDto = questoes.stream().map(q ->
            ProvaQuestaoPayloadDTO.builder()
                .id(q.getId())
                .enunciado(q.getEnunciado())
                .tipo(q.getTipo() == Questao.TipoQuestao.ABERTA ? "aberta" : "multipla")
                .pontos(q.getPontos())
                .opcoes(q.getAlternativas() != null ? q.getAlternativas() : List.of())
                .corretaIndex(parseIntOrNull(q.getRespostaCorreta()))
                .build()
        ).toList();

        return ProvaRelacionalDTO.builder()
            .id(prova.getId())
            .professorId(prova.getProfessor() != null ? prova.getProfessor().getId() : null)
            .professorNome(prova.getProfessor() != null ? prova.getProfessor().getNome() : null)
            .turmaId(prova.getTurma() != null ? prova.getTurma().getId() : null)
            .turmaNome(prova.getTurma() != null ? prova.getTurma().getNome() : null)
            .disciplinaId(prova.getDisciplina() != null ? prova.getDisciplina().getId() : null)
            .disciplinaNome(prova.getDisciplina() != null ? prova.getDisciplina().getNome() : null)
            .titulo(prova.getTitulo())
            .descricao(prova.getDescricao())
            .periodo(prova.getPeriodo())
            .data(prova.getData())
            .horario(prova.getHorario())
            .instrucoes(prova.getInstrucoes())
            .status(prova.getStatus())
            .publicada(prova.getPublicada())
            .turno(prova.getTurno())
            .questoes(questoesDto)
            .build();
    }

    private ProvaRespostaViewDTO toRespostaDto(
        ProvaResposta entity,
        Prova prova,
        Usuario aluno,
        List<ProvaRespostaItemDTO> itens
    ) {
        return ProvaRespostaViewDTO.builder()
            .id(entity.getId())
            .provaId(prova.getId())
            .provaTitulo(prova.getTitulo())
            .alunoId(aluno.getId())
            .alunoNome(aluno.getNome())
            .turma(prova.getTurma().getNome())
            .disciplina(prova.getDisciplina().getNome())
            .status(entity.getStatus())
            .pontosMaximos(entity.getPontosMaximos())
            .pontosObtidos(entity.getPontosObtidos())
            .notaFinal(entity.getNotaFinal())
            .enviadoEm(entity.getEnviadoEm())
            .corrigidoEm(entity.getCorrigidoEm())
            .finalizadaPorTempo(entity.getFinalizadaPorTempo())
            .respostas(itens)
            .build();
    }

    private Disciplina resolverDisciplina(Long disciplinaId, String disciplinaNome) {
        if (disciplinaId != null) {
            return disciplinaRepository.findById(disciplinaId)
                .orElseThrow(() -> new IllegalArgumentException("Disciplina não encontrada"));
        }
        if (disciplinaNome == null || disciplinaNome.isBlank()) {
            throw new IllegalArgumentException("Disciplina é obrigatória");
        }
        return disciplinaRepository.findByNomeIgnoreCase(disciplinaNome)
            .orElseGet(() -> disciplinaRepository.save(Disciplina.builder()
                .nome(disciplinaNome)
                .descricao("")
                .build()));
    }

    private Turma resolverTurma(Long turmaId, String turmaNome, String turno, Usuario professor) {
        if (turmaId != null) {
            return turmaRepository.findById(turmaId)
                .orElseThrow(() -> new IllegalArgumentException("Turma não encontrada"));
        }
        if (turmaNome == null || turmaNome.isBlank()) {
            throw new IllegalArgumentException("Turma é obrigatória");
        }
        return turmaRepository.findByNomeIgnoreCase(turmaNome)
            .orElseGet(() -> turmaRepository.save(Turma.builder()
                .nome(turmaNome)
                .turno(turno != null && !turno.isBlank() ? turno : "Manha")
                .status("Ativa")
                .professor(professor)
                .alunos(new HashSet<>())
                .build()));
    }

    private Questao.TipoQuestao normalizarTipo(String tipo) {
        String v = normalizar(tipo);
        if ("aberta".equals(v) || "dissertativa".equals(v)) return Questao.TipoQuestao.ABERTA;
        return Questao.TipoQuestao.MULTIPLA_ESCOLHA;
    }

    private String normalizar(String value) {
        if (value == null) return "";
        return value
            .trim()
            .toLowerCase(Locale.ROOT);
    }

    private String writeJson(List<ProvaRespostaItemDTO> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao serializar respostas", e);
        }
    }

    private List<ProvaRespostaItemDTO> readItens(String raw) {
        try {
            if (raw == null || raw.isBlank()) return List.of();
            return objectMapper.readValue(raw, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private Integer parseIntOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
