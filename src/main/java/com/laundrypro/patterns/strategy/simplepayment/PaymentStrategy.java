package com.laundrypro.patterns.strategy.simplepayment;

/**
 * Strategy interface: defines the operation that all payment strategies must implement.
 * This matches the "Strategy" role in the Strategy Design Pattern.
 */
public interface PaymentStrategy {
    /**
     * Pay the given amount using the selected payment strategy.
     * @param amount amount to pay
     */
    void pay(double amount);
}

