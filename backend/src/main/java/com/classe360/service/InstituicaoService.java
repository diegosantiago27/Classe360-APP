package com.classe360.service;

import com.classe360.domain.Instituicao;
import com.classe360.repository.InstituicaoRepository;
import com.classe360.service.dto.InstituicaoDTO;
import com.classe360.service.mapper.InstituicaoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstituicaoService {

    private final InstituicaoRepository instituicaoRepository;
    private final InstituicaoMapper instituicaoMapper;

    @Transactional(readOnly = true)
    public Optional<InstituicaoDTO> findPrincipal() {
        return instituicaoRepository.findAll().stream().findFirst().map(instituicaoMapper::toDto);
    }

    public InstituicaoDTO savePrincipal(InstituicaoDTO payload) {
        Instituicao entity = instituicaoRepository
            .findAll()
            .stream()
            .findFirst()
            .orElseGet(() -> Instituicao.builder().build());

        entity.setNome(payload.getNome());
        entity.setCnpj(payload.getCnpj());
        entity.setTelefone(payload.getTelefone());
        entity.setEmail(payload.getEmail());
        entity.setEndereco(payload.getEndereco());
        entity.setNumero(payload.getNumero());
        entity.setComplemento(payload.getComplemento());
        entity.setBairro(payload.getBairro());
        entity.setCidade(payload.getCidade());
        entity.setEstado(payload.getEstado());
        entity.setCep(payload.getCep());

        entity = instituicaoRepository.save(entity);
        return instituicaoMapper.toDto(entity);
    }
}
