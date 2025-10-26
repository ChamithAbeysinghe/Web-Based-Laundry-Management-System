package com.laundrypro.repository;

import com.laundrypro.model.TaxSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TaxSettingsRepository extends JpaRepository<TaxSettings, Integer> {
    Optional<TaxSettings> findFirstByOrderByIdAsc();
}

