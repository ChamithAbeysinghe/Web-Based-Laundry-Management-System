package com.laundrypro.patterns.strategy.simplepayment;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

/**
 * ConcreteStrategy: Implements the payment behavior for PayPal.
 * Holds its own required data (e.g., account email) and performs payment logic.
 */
public class PayPalPayment implements PaymentStrategy {

    private final String accountEmail;

    public PayPalPayment(String accountEmail) {
        this.accountEmail = accountEmail;
    }

    /**
     * Executes payment and persists a simple record into payments.txt.
     */
    @Override
    public void pay(double amount) {
        String message = String.format("Paid %.1f using PayPal", amount);
        System.out.println(message);

        // Append the same info to a simple text file in the working directory.
        Path file = Paths.get("payments.txt");
        String details = String.format("Method=PayPal, Email=%s", safe(accountEmail));
        String line = String.format("%s | %s%n", message, details);
        try {
            if (!Files.exists(file)) {
                Files.createFile(file);
            }
            Files.write(file, line.getBytes(), StandardOpenOption.APPEND);
        } catch (IOException e) {
            System.err.println("Failed to write payment record: " + e.getMessage());
        }
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }
}

