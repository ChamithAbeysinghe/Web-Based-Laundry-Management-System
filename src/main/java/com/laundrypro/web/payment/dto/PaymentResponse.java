package com.laundrypro.web.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PaymentResponse {
    private Integer paymentId;
    private String message;
}
