package com.classe360.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "turno")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Turno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 32)
    private String codigo;

    @Column(nullable = false, length = 64)
    private String nome;
}
