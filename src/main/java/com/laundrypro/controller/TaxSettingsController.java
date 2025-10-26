package com.laundrypro.controller;

import com.laundrypro.service.TaxSettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
public class TaxSettingsController {

    private final TaxSettingsService service;

    public TaxSettingsController(TaxSettingsService service) {
        this.service = service;
    }

    @GetMapping("/api/config/tax-rate")
    public Map<String, Object> getTaxRate() {
        BigDecimal rate = service.getRate();
        Map<String, Object> resp = new HashMap<>();
        resp.put("rate", rate);
        return resp;
    }

    public static class UpdateTaxRequest {
        private BigDecimal rate;
        public BigDecimal getRate() { return rate; }
        public void setRate(BigDecimal rate) { this.rate = rate; }
    }

    @PutMapping("/api/admin/config/tax-rate")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> updateTaxRate(@RequestBody UpdateTaxRequest req) {
        if (req == null || req.getRate() == null) {
            throw new IllegalArgumentException("rate is required");
        }
        BigDecimal updated = service.updateRate(req.getRate()).getRate();
        Map<String, Object> resp = new HashMap<>();
        resp.put("rate", updated);
        return resp;
    }
}

