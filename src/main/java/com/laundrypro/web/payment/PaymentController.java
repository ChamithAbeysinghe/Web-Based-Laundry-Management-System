package com.laundrypro.web.payment;

import com.laundrypro.model.Payment;
import com.laundrypro.service.PaymentService;
import com.laundrypro.web.payment.dto.PaymentRequest;
import com.laundrypro.web.payment.dto.PaymentResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> recordPayment(@RequestBody PaymentRequest request) {
        Payment saved = paymentService.record(request);
        return ResponseEntity.ok(new PaymentResponse(saved.getPaymentId(), "Payment recorded"));
    }

    @GetMapping
    public ResponseEntity<Page<Payment>> getAllPayments(Pageable pageable) {
        return ResponseEntity.ok(paymentService.getAll(pageable));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<Payment>> getPaymentsByCustomer(@PathVariable Integer customerId) {
        return ResponseEntity.ok(paymentService.getByCustomer(customerId));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<Payment>> getPaymentsByOrder(@PathVariable Integer orderId) {
        return ResponseEntity.ok(paymentService.getByOrder(orderId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Payment> getPaymentById(@PathVariable Integer id) {
        return ResponseEntity.ok(paymentService.getById(id));
    }
}
