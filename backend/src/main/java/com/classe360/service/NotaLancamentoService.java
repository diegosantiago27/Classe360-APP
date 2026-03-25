package com.classe360.service;

import com.classe360.domain.*;
import com.classe360.repository.*;
import com.classe360.service.dto.NotaLancamentoUpsertDTO;
import com.classe360.service.dto.NotaLancamentoViewDTO;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NotaLancamentoService {

    private static final Pattern BIMESTRE_NUM_PATTERN = Pattern.compile("(\\d+)");

    private final NotaRepository notaRepository;
    private final UsuarioRepository usuarioRepository;
    private final TurmaRepository turmaRepository;
    private final DisciplinaRepository disciplinaRepository;
    private final PeriodoRepository periodoRepository;
    private final ProvaRespostaRepository provaRespostaRepository;

    @Transactional(readOnly = true)
    public List<NotaLancamentoViewDTO> listarLancamentos(String turmaNome, String disciplinaNome, String bimestre) {
        Turma turma = resolverTurma(null, turmaNome);
        Disciplina disciplina = resolverDisciplina(null, disciplinaNome);
        Periodo periodo = resolverPeriodo(null, bimestre);
        return notaRepository
            .findByTurmaIdAndDisciplinaIdAndPeriodoIdOrderByAlunoNomeAsc(turma.getId(), disciplina.getId(), periodo.getId())
            .stream()
            .map(this::toView)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<NotaLancamentoViewDTO> listarPorAluno(Long alunoId) {
        if (alunoId == null) return List.of();
        return notaRepository.findByAlunoIdOrderByPeriodoNomeAscDisciplinaNomeAscTurmaNomeAsc(alunoId)
            .stream()
            .map(this::toView)
            .toList();
    }

    public NotaLancamentoViewDTO upsert(NotaLancamentoUpsertDTO req) {
        Usuario aluno = resolverAluno(req.getAlunoId(), req.getAlunoNome());
        Turma turma = resolverTurma(req.getTurmaId(), req.getTurmaNome());
        Disciplina disciplina = resolverDisciplina(req.getDisciplinaId(), req.getDisciplinaNome());
        Periodo periodo = resolverPeriodo(req.getPeriodoId(), req.getBimestre());

        Nota nota = notaRepository
            .findByAlunoIdAndTurmaIdAndDisciplinaIdAndPeriodoId(aluno.getId(), turma.getId(), disciplina.getId(), periodo.getId())
            .orElse(Nota.builder().aluno(aluno).turma(turma).disciplina(disciplina).periodo(periodo).build());

        Double trabalhos = sanitize(req.getTrabalhosNota());
        Double provas = sanitize(req.getProvasNota());
        Double valorFinal = sanitize(req.getNota());
        if (valorFinal == null) {
            valorFinal = mediaComponentes(trabalhos, provas);
        }

        nota.setValorTrabalhos(trabalhos);
        nota.setValorProvas(provas);
        nota.setValor(valorFinal);
        nota = notaRepository.save(nota);
        return toView(nota);
    }

    public List<NotaLancamentoViewDTO> upsertLote(List<NotaLancamentoUpsertDTO> rows) {
        if (rows == null || rows.isEmpty()) return List.of();
        return rows.stream().map(this::upsert).toList();
    }

    /**
     * Após corrigir uma prova, recalcula a média das provas corrigidas do aluno no mesmo
     * turma/disciplina/bimestre e grava em {@link Nota} (PostgreSQL).
     */
    public void sincronizarNotaAposCorrecaoProva(Long alunoId, Prova provaRef) {
        if (alunoId == null || provaRef == null) return;
        if (provaRef.getPeriodo() == null || provaRef.getPeriodo().isBlank()) return;
        if (provaRef.getTurma() == null || provaRef.getDisciplina() == null) return;

        Usuario aluno = usuarioRepository.findById(alunoId).orElse(null);
        if (aluno == null) return;

        Long turmaId = provaRef.getTurma().getId();
        Long disciplinaId = provaRef.getDisciplina().getId();
        int bimestreRef = indiceBimestre(provaRef.getPeriodo());
        if (bimestreRef < 1) return;

        List<Double> notasCorrigidas = new ArrayList<>();
        for (ProvaResposta pr : provaRespostaRepository.findByAlunoId(alunoId)) {
            Prova p = pr.getProva();
            if (p == null || p.getTurma() == null || p.getDisciplina() == null) continue;
            if (!p.getTurma().getId().equals(turmaId)) continue;
            if (!p.getDisciplina().getId().equals(disciplinaId)) continue;
            if (indiceBimestre(p.getPeriodo()) != bimestreRef) continue;
            if (!"Corrigido".equalsIgnoreCase(pr.getStatus())) continue;
            if (pr.getNotaFinal() == null) continue;
            notasCorrigidas.add(pr.getNotaFinal());
        }
        if (notasCorrigidas.isEmpty()) return;

        double mediaArred =
            Math.round(notasCorrigidas.stream().mapToDouble(Double::doubleValue).average().orElse(0d) * 10d) / 10d;

        Turma turma = provaRef.getTurma();
        Disciplina disciplina = provaRef.getDisciplina();
        Periodo periodo = resolverPeriodo(null, provaRef.getPeriodo());

        Optional<Nota> existingOpt =
            notaRepository.findByAlunoIdAndTurmaIdAndDisciplinaIdAndPeriodoId(
                alunoId, turma.getId(), disciplina.getId(), periodo.getId());
        Double trabalhosExistente = existingOpt.map(Nota::getValorTrabalhos).orElse(null);

        upsert(
            NotaLancamentoUpsertDTO
                .builder()
                .alunoId(alunoId)
                .alunoNome(aluno.getNome())
                .turmaId(turma.getId())
                .turmaNome(turma.getNome())
                .disciplinaId(disciplina.getId())
                .disciplinaNome(disciplina.getNome())
                .periodoId(periodo.getId())
                .bimestre(periodo.getNome())
                .trabalhosNota(trabalhosExistente)
                .provasNota(mediaArred)
                .nota(null)
                .build()
        );
    }

    private int indiceBimestre(String periodo) {
        if (periodo == null || periodo.isBlank()) return -1;
        Matcher m = BIMESTRE_NUM_PATTERN.matcher(normalize(periodo));
        if (m.find()) {
            try {
                int idx = Integer.parseInt(m.group(1));
                return Math.max(1, Math.min(4, idx));
            } catch (NumberFormatException ignored) {}
        }
        return -1;
    }

    private NotaLancamentoViewDTO toView(Nota n) {
        return NotaLancamentoViewDTO
            .builder()
            .id(n.getId())
            .alunoId(n.getAluno() != null ? n.getAluno().getId() : null)
            .alunoNome(n.getAluno() != null ? n.getAluno().getNome() : null)
            .turmaId(n.getTurma() != null ? n.getTurma().getId() : null)
            .turmaNome(n.getTurma() != null ? n.getTurma().getNome() : null)
            .disciplinaId(n.getDisciplina() != null ? n.getDisciplina().getId() : null)
            .disciplinaNome(n.getDisciplina() != null ? n.getDisciplina().getNome() : null)
            .periodoId(n.getPeriodo() != null ? n.getPeriodo().getId() : null)
            .bimestre(n.getPeriodo() != null ? n.getPeriodo().getNome() : null)
            .trabalhosNota(n.getValorTrabalhos())
            .provasNota(n.getValorProvas())
            .nota(n.getValor())
            .build();
    }

    private Usuario resolverAluno(Long alunoId, String alunoNome) {
        if (alunoId != null) {
            return usuarioRepository.findById(alunoId).orElseThrow(() -> new IllegalArgumentException("Aluno não encontrado"));
        }
        if (alunoNome == null || alunoNome.isBlank()) throw new IllegalArgumentException("alunoId ou alunoNome é obrigatório");
        return usuarioRepository
            .findByNomeIgnoreCase(alunoNome.trim())
            .orElseThrow(() -> new IllegalArgumentException("Aluno não encontrado"));
    }

    private Turma resolverTurma(Long turmaId, String turmaNome) {
        if (turmaId != null) {
            return turmaRepository.findById(turmaId).orElseThrow(() -> new IllegalArgumentException("Turma não encontrada"));
        }
        if (turmaNome == null || turmaNome.isBlank()) throw new IllegalArgumentException("turmaId ou turmaNome é obrigatório");
        return turmaRepository
            .findByNomeIgnoreCase(turmaNome.trim())
            .orElseThrow(() -> new IllegalArgumentException("Turma não encontrada"));
    }

    private Disciplina resolverDisciplina(Long disciplinaId, String disciplinaNome) {
        if (disciplinaId != null) {
            return disciplinaRepository.findById(disciplinaId)
                .orElseThrow(() -> new IllegalArgumentException("Disciplina não encontrada"));
        }
        if (disciplinaNome == null || disciplinaNome.isBlank()) {
            throw new IllegalArgumentException("disciplinaId ou disciplinaNome é obrigatório");
        }
        return disciplinaRepository
            .findByNomeIgnoreCase(disciplinaNome.trim())
            .orElseThrow(() -> new IllegalArgumentException("Disciplina não encontrada"));
    }

    private Periodo resolverPeriodo(Long periodoId, String bimestre) {
        if (periodoId != null) {
            return periodoRepository.findById(periodoId)
                .orElseThrow(() -> new IllegalArgumentException("Período não encontrado"));
        }
        if (bimestre == null || bimestre.isBlank()) {
            throw new IllegalArgumentException("periodoId ou bimestre é obrigatório");
        }
        String nome = bimestre.trim();
        Optional<Periodo> existing = periodoRepository.findByNomeIgnoreCase(nome);
        if (existing.isPresent()) return existing.get();

        LocalDate[] janela = janelaPeriodo(nome);
        return periodoRepository.save(Periodo.builder().nome(nome).dataInicio(janela[0]).dataFim(janela[1]).build());
    }

    private LocalDate[] janelaPeriodo(String nomeBimestre) {
        int ano = LocalDate.now().getYear();
        Matcher m = BIMESTRE_NUM_PATTERN.matcher(normalize(nomeBimestre));
        int idx = 1;
        if (m.find()) {
            try {
                idx = Integer.parseInt(m.group(1));
            } catch (NumberFormatException ignored) {}
        }
        idx = Math.max(1, Math.min(4, idx));
        int startMonth = ((idx - 1) * 3) + 1;
        LocalDate start = LocalDate.of(ano, startMonth, 1);
        LocalDate end = start.plusMonths(3).minusDays(1);
        return new LocalDate[] { start, end };
    }

    private String normalize(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private Double sanitize(Double value) {
        if (value == null || value.isNaN()) return null;
        double v = Math.max(0d, Math.min(10d, value));
        return Math.round(v * 10d) / 10d;
    }

    private Double mediaComponentes(Double trabalhos, Double provas) {
        if (trabalhos != null && provas != null) return Math.round(((trabalhos + provas) / 2d) * 10d) / 10d;
        if (trabalhos != null) return trabalhos;
        if (provas != null) return provas;
        return null;
    }
}
