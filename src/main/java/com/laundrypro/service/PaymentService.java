package com.laundrypro.service;

import com.laundrypro.model.Payment;
import com.laundrypro.repository.PaymentRepository;
import com.laundrypro.web.payment.dto.PaymentRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    public Payment record(PaymentRequest req) {
        if (req == null) throw new IllegalArgumentException("Payment request is required");
        if (req.getOrderId() == null || req.getCustomerId() == null) {
            throw new IllegalArgumentException("Order ID and Customer ID are required");
        }
        BigDecimal amount = req.getAmount() == null ? BigDecimal.ZERO : req.getAmount();

        Payment payment = Payment.builder()
                .orderId(req.getOrderId())
                .customerId(req.getCustomerId())
                .amount(amount)
                .paymentMethod(req.getPaymentMethod() == null ? "unknown" : req.getPaymentMethod())
                .build();

        return paymentRepository.save(payment);
    }

    public Page<Payment> getAll(Pageable pageable) {
        return paymentRepository.findAll(pageable);
    }

    public List<Payment> getByCustomer(Integer customerId) {
        return paymentRepository.findByCustomerId(customerId);
    }

    public List<Payment> getByOrder(Integer orderId) {
        return paymentRepository.findByOrderId(orderId);
    }

    public Payment getById(Integer paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found with ID: " + paymentId));
    }

    public void deletePayment(Integer id) {
        paymentRepository.deleteById(id);
    }
}
