package com.laundrypro.repository;

import com.laundrypro.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    List<Payment> findByCustomerId(Integer customerId);

    List<Payment> findByOrderId(Integer orderId);
}
