package com.laundrypro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "Payment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "Payment_ID")
    private Integer paymentId;

    @Column(name = "Order_ID", nullable = false)
    private Integer orderId;

    @Column(name = "Customer_ID", nullable = false)
    private Integer customerId;

    @Column(name = "Amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "Payment_Method", nullable = false, length = 50)
    private String paymentMethod;
}
