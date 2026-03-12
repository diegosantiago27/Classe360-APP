package com.classe360.repository;

import com.classe360.domain.UserStorage;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserStorageRepository extends JpaRepository<UserStorage, Long> {
    Optional<UserStorage> findByUserLoginAndStorageKey(String userLogin, String storageKey);

    List<UserStorage> findByUserLoginAndStorageKeyIn(String userLogin, Collection<String> storageKeys);

    Optional<UserStorage> findFirstByStorageKey(String storageKey);
}
