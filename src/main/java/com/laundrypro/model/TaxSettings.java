package com.laundrypro.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "Tax_Settings")
public class TaxSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Id")
    private Integer id;

    @Column(name = "Rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal rate;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }
}

