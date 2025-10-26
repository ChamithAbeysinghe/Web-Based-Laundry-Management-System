package com.laundrypro.service;

import com.laundrypro.model.TaxSettings;
import com.laundrypro.repository.TaxSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@Transactional
public class TaxSettingsService {

    private final TaxSettingsRepository repo;

    public TaxSettingsService(TaxSettingsRepository repo) {
        this.repo = repo;
    }

    public TaxSettings getOrCreate() {
        return repo.findFirstByOrderByIdAsc().orElseGet(() -> {
            TaxSettings s = new TaxSettings();
            s.setRate(new BigDecimal("0.0800"));
            return repo.save(s);
        });
    }

    @Transactional(readOnly = true)
    public BigDecimal getRate() {
        return getOrCreate().getRate();
    }

    public TaxSettings updateRate(BigDecimal rate) {
        if (rate == null) throw new IllegalArgumentException("rate is required");
        // Clamp to sensible range 0.0 - 1.0 (0% - 100%)
        if (rate.compareTo(BigDecimal.ZERO) < 0) rate = BigDecimal.ZERO;
        if (rate.compareTo(BigDecimal.ONE) > 0) rate = BigDecimal.ONE;
        TaxSettings s = getOrCreate();
        s.setRate(rate);
        return repo.save(s);
    }
}

