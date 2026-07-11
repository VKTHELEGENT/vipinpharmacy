package com.mediflow.pharmacy.repository;

import com.mediflow.pharmacy.model.ResetCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResetCodeRepository extends JpaRepository<ResetCode, Long> {
    Optional<ResetCode> findFirstByEmailOrderByExpiresDesc(String email);
    void deleteByEmail(String email);
}
