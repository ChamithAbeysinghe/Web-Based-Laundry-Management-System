package com.laundrypro.web.payment.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {
    private Integer orderId;
    private Integer customerId;
    private BigDecimal amount;
    private String paymentMethod;
}
