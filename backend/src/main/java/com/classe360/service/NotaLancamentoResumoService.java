package com.classe360.service;

import com.classe360.domain.*;
import com.classe360.repository.*;
import com.classe360.security.SecurityUtils;
import com.classe360.service.dto.NotaLancamentoCabecalhoCreateDTO;
import com.classe360.service.dto.NotaLancamentoResumoDTO;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NotaLancamentoResumoService {

    private static final List<String> BIMESTRES_PADRAO = List.of(
        "1º Bimestre",
        "2º Bimestre",
        "3º Bimestre",
        "4º Bimestre"
    );

    private final NotaLancamentoService notaLancamentoService;
    private final NotaLancamentoCabecalhoRepository notaLancamentoCabecalhoRepository;
    private final DisciplinaTurmaRepository disciplinaTurmaRepository;
    private final NotaRepository notaRepository;
    private final TurmaRepository turmaRepository;
    private final DisciplinaRepository disciplinaRepository;
    private final PeriodoRepository periodoRepository;
    private final ProvaRespostaRepository provaRespostaRepository;
    private final EntregaAtividadeRepository entregaAtividadeRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<NotaLancamentoResumoDTO> listarResumo() {
        Optional<Long> uid = SecurityUtils.getCurrentUserId();
        Usuario current = uid.flatMap(usuarioRepository::findById).orElse(null);
        boolean filtrarProfessor = current != null && current.getRole() == Usuario.Role.ROLE_PROFESSOR;

        Set<String> paresProfessor = new HashSet<>();
        List<DisciplinaTurma> dts;
        if (filtrarProfessor) {
            dts = disciplinaTurmaRepository.findByProfessor_Id(current.getId());
            for (DisciplinaTurma dt : dts) {
                paresProfessor.add(parKey(dt.getTurma().getId(), dt.getDisciplina().getId()));
            }
        } else {
            dts = disciplinaTurmaRepository.findAll();
        }

        Map<String, Slot> slots = new LinkedHashMap<>();

        for (DisciplinaTurma dt : dts) {
            Turma t = dt.getTurma();
            Disciplina d = dt.getDisciplina();
            if (t == null || d == null) continue;
            for (String bim : BIMESTRES_PADRAO) {
                Periodo p = notaLancamentoService.resolverPeriodo(null, bim);
                addSyntheticSlot(slots, t.getId(), d.getId(), p.getId());
            }
        }

        for (NotaLancamentoCabecalho cab : notaLancamentoCabecalhoRepository.findAll()) {
            if (filtrarProfessor && !paresProfessor.contains(parKey(cab.getTurma().getId(), cab.getDisciplina().getId()))) {
                continue;
            }
            String k = tripleKey(cab.getTurma().getId(), cab.getDisciplina().getId(), cab.getPeriodo().getId());
            Slot slot = slots.computeIfAbsent(k, key -> new Slot(cab.getTurma().getId(), cab.getDisciplina().getId(), cab.getPeriodo().getId()));
            slot.cabecalhoId = cab.getId();
        }

        for (Object[] row : notaRepository.findDistinctTurmaDisciplinaPeriodoIds()) {
            if (row == null || row.length < 3) continue;
            Long tid = toLong(row[0]);
            Long did = toLong(row[1]);
            Long pid = toLong(row[2]);
            if (tid == null || did == null || pid == null) continue;
            if (filtrarProfessor && !paresProfessor.contains(parKey(tid, did))) continue;
            addSyntheticSlot(slots, tid, did, pid);
        }

        List<NotaLancamentoResumoDTO> out = new ArrayList<>();
        for (Slot s : slots.values()) {
            out.add(construirResumo(s));
        }

        out.sort(
            Comparator.comparing(NotaLancamentoResumoDTO::getTurmaNome, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(NotaLancamentoResumoDTO::getDisciplinaNome, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(NotaLancamentoResumoDTO::getBimestre, String.CASE_INSENSITIVE_ORDER)
        );
        return out;
    }

    public NotaLancamentoResumoDTO criarCabecalho(NotaLancamentoCabecalhoCreateDTO dto) {
        Turma t = notaLancamentoService.resolverTurma(dto.getTurmaId(), dto.getTurmaNome());
        Disciplina d = notaLancamentoService.resolverDisciplina(dto.getDisciplinaId(), dto.getDisciplinaNome());
        Periodo p = notaLancamentoService.resolverPeriodo(null, dto.getBimestre());

        NotaLancamentoCabecalho entity = notaLancamentoCabecalhoRepository
            .findByTurma_IdAndDisciplina_IdAndPeriodo_Id(t.getId(), d.getId(), p.getId())
            .orElseGet(() ->
                notaLancamentoCabecalhoRepository.save(
                    NotaLancamentoCabecalho.builder().turma(t).disciplina(d).periodo(p).build()
                )
            );

        Slot s = new Slot(t.getId(), d.getId(), p.getId());
        s.cabecalhoId = entity.getId();
        return construirResumo(s);
    }

    public void removerCabecalho(Long id) {
        notaLancamentoCabecalhoRepository.deleteById(id);
    }

    private void addSyntheticSlot(Map<String, Slot> slots, Long turmaId, Long disciplinaId, Long periodoId) {
        String k = tripleKey(turmaId, disciplinaId, periodoId);
        slots.putIfAbsent(k, new Slot(turmaId, disciplinaId, periodoId));
    }

    private NotaLancamentoResumoDTO construirResumo(Slot s) {
        Turma turma = turmaRepository.findById(s.turmaId).orElseThrow(() -> new IllegalStateException("Turma não encontrada"));
        Disciplina disc = disciplinaRepository.findById(s.disciplinaId).orElseThrow(() -> new IllegalStateException("Disciplina não encontrada"));
        Periodo per = periodoRepository.findById(s.periodoId).orElseThrow(() -> new IllegalStateException("Período não encontrado"));

        String bimestre = per.getNome();
        int pendentes = contarPendentes(s.turmaId, s.disciplinaId, s.periodoId, bimestre);
        String status = pendentes > 0 ? "Pendente" : "Concluida";

        String id = s.cabecalhoId != null ? "cab-" + s.cabecalhoId : "syn-" + s.turmaId + "-" + s.disciplinaId + "-" + s.periodoId;

        return NotaLancamentoResumoDTO
            .builder()
            .id(id)
            .cabecalhoId(s.cabecalhoId)
            .turmaId(s.turmaId)
            .turmaNome(turma.getNome())
            .disciplinaId(s.disciplinaId)
            .disciplinaNome(disc.getNome())
            .periodoId(s.periodoId)
            .bimestre(bimestre)
            .pendentes(pendentes)
            .status(status)
            .build();
    }

    private int contarPendentes(Long turmaId, Long disciplinaId, Long periodoId, String bimestreNome) {
        Turma turma = turmaRepository.findWithAlunosById(turmaId).orElse(null);
        if (turma == null || turma.getAlunos() == null || turma.getAlunos().isEmpty()) {
            return 0;
        }

        List<Nota> notasTriple = notaRepository.findByTurmaIdAndDisciplinaIdAndPeriodoIdOrderByAlunoNomeAsc(
            turmaId,
            disciplinaId,
            periodoId
        );
        Map<Long, Nota> notaPorAluno = notasTriple
            .stream()
            .filter(n -> n.getAluno() != null)
            .collect(Collectors.toMap(n -> n.getAluno().getId(), n -> n, (a, b) -> a));

        List<ProvaResposta> respostas = provaRespostaRepository.findByProvaTurmaIdAndProvaDisciplinaIdFetched(turmaId, disciplinaId);
        Map<Long, String> periodoPorProvaId = respostas
            .stream()
            .filter(pr -> pr.getProva() != null)
            .collect(
                Collectors.toMap(
                    pr -> pr.getProva().getId(),
                    pr -> pr.getProva().getPeriodo() == null ? "" : pr.getProva().getPeriodo(),
                    (a, b) -> a
                )
            );

        List<EntregaAtividade> entregas = entregaAtividadeRepository.findByAtividadeTurmaAndDisciplinaFetched(turmaId, disciplinaId);

        int pendentes = 0;
        for (Usuario aluno : turma.getAlunos()) {
            Nota n = notaPorAluno.get(aluno.getId());
            Double exib = notaExibicaoParaAluno(
                aluno.getId(),
                turmaId,
                disciplinaId,
                bimestreNome,
                n,
                respostas,
                entregas,
                periodoPorProvaId
            );
            if (exib == null || exib.isNaN()) {
                pendentes++;
            }
        }
        return pendentes;
    }

    private Double notaExibicaoParaAluno(
        Long alunoId,
        Long turmaId,
        Long disciplinaId,
        String bimestre,
        Nota notaRow,
        List<ProvaResposta> respostasTurmaDisc,
        List<EntregaAtividade> entregasTurmaDisc,
        Map<Long, String> periodoPorProvaId
    ) {
        if (notaRow != null && notaRow.getValor() != null && !notaRow.getValor().isNaN()) {
            return notaRow.getValor();
        }

        List<ProvaResposta> provasAluno = respostasTurmaDisc
            .stream()
            .filter(pr -> pr.getAluno() != null && pr.getAluno().getId().equals(alunoId))
            .filter(pr -> pr.getProva() != null && pr.getProva().getTurma().getId().equals(turmaId))
            .filter(pr -> pr.getProva().getDisciplina().getId().equals(disciplinaId))
            .filter(this::respostaCorrigida)
            .filter(pr -> pr.getNotaFinal() != null && !pr.getNotaFinal().isNaN())
            .filter(pr ->
                bimestreCompativel(
                    Optional.ofNullable(pr.getProva().getPeriodo()).orElse(periodoPorProvaId.getOrDefault(pr.getProva().getId(), "")),
                    bimestre
                )
            )
            .toList();

        List<EntregaAtividade> trabalhosAluno = entregasTurmaDisc
            .stream()
            .filter(e -> e.getAluno() != null && e.getAluno().getId().equals(alunoId))
            .filter(e -> e.getAtividade() != null && e.getAtividade().getDisciplina().getId().equals(disciplinaId))
            .filter(e -> e.getNota() != null && !e.getNota().isNaN())
            .toList();

        Double mediaProvas = null;
        if (!provasAluno.isEmpty()) {
            double sum = provasAluno.stream().mapToDouble(ProvaResposta::getNotaFinal).sum();
            mediaProvas = Math.round((sum / provasAluno.size()) * 10d) / 10d;
        }

        Double mediaTrabalhos = null;
        if (!trabalhosAluno.isEmpty()) {
            double sum = trabalhosAluno.stream().mapToDouble(EntregaAtividade::getNota).sum();
            mediaTrabalhos = Math.round((sum / trabalhosAluno.size()) * 10d) / 10d;
        }

        List<Double> componentes = new ArrayList<>();
        if (mediaProvas != null) componentes.add(mediaProvas);
        if (mediaTrabalhos != null) componentes.add(mediaTrabalhos);

        if (componentes.isEmpty()) return null;
        return Math.round((componentes.stream().mapToDouble(Double::doubleValue).average().orElse(0d)) * 10d) / 10d;
    }

    private boolean respostaCorrigida(ProvaResposta pr) {
        if (pr.getStatus() != null && "Corrigido".equalsIgnoreCase(pr.getStatus())) return true;
        return pr.getCorrigidoEm() != null;
    }

    private boolean bimestreCompativel(String periodoProva, String bimestreLancamento) {
        String p = normalize(periodoProva).replace("º", "o").replaceAll("[^a-z0-9]", "");
        String b = normalize(bimestreLancamento).replace("º", "o").replaceAll("[^a-z0-9]", "");
        if (p.isEmpty()) return true;
        return p.equals(b);
    }

    private String normalize(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private static String parKey(Long turmaId, Long disciplinaId) {
        return turmaId + "|" + disciplinaId;
    }

    private static String tripleKey(Long turmaId, Long disciplinaId, Long periodoId) {
        return turmaId + "|" + disciplinaId + "|" + periodoId;
    }

    private static Long toLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        return null;
    }

    private static final class Slot {

        final Long turmaId;
        final Long disciplinaId;
        final Long periodoId;
        Long cabecalhoId;

        Slot(Long turmaId, Long disciplinaId, Long periodoId) {
            this.turmaId = turmaId;
            this.disciplinaId = disciplinaId;
            this.periodoId = periodoId;
        }
    }
}
