package com.classe360.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_storage")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserStorage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_login", nullable = false, length = 100)
    private String userLogin;

    @Column(name = "storage_key", nullable = false, length = 255)
    private String storageKey;

    @Lob
    @Column(name = "value_text")
    private String valueText;
}
