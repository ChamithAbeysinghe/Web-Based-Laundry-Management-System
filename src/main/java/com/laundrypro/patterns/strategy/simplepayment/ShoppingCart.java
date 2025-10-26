package com.laundrypro.patterns.strategy.simplepayment;

/**
 * Context: Holds a reference to a Strategy object and uses it to perform the operation.
 * In this example, ShoppingCart uses a PaymentStrategy to complete checkout.
 */
public class ShoppingCart {

    private PaymentStrategy paymentStrategy; // Strategy reference

    /**
     * Allow client to set/replace the strategy at runtime.
     */
    public void setPaymentStrategy(PaymentStrategy paymentStrategy) {
        this.paymentStrategy = paymentStrategy;
    }

    /**
     * Uses the currently set PaymentStrategy to pay the given amount.
     */
    public void checkout(double amount) {
        if (paymentStrategy == null) {
            throw new IllegalStateException("Payment strategy not set");
        }
        paymentStrategy.pay(amount);
    }
}

