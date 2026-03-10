package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Cadastro temporário - armazena solicitações pendentes de aprovação.
 * Após o admin autorizar, os dados são transferidos para a tabela usuario (cadastro definitivo).
 */
@Entity
@Table(name = "cadastro_temporario")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitacaoCadastro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String cpf;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String senha;

    @Column(name = "data_nascimento")
    private String dataNascimento;

    private String telefone;
    private String rua;
    private String numero;
    private String complemento;
    private String bairro;
    private String cidade;
    private String cep;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDENTE;

    @Column(name = "perfil_aprovado")
    private String perfilAprovado;

    @Column(name = "aprovado_por_id")
    private Long aprovadoPorId;

    @Column(name = "data_aprovacao")
    private LocalDateTime dataAprovacao;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public enum Status {
        PENDENTE,
        APROVADO,
        REJEITADO
    }
}
