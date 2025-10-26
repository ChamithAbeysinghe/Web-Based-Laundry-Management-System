package com.laundrypro.patterns.strategy.simplepayment;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

/**
 * ConcreteStrategy: Implements the payment behavior for Credit Card.
 * This class holds its own required data (e.g., card number, holder name)
 * and knows how to execute a payment using that data.
 */
public class CreditCardPayment implements PaymentStrategy {

    private final String cardNumber;
    private final String cardHolderName;

    public CreditCardPayment(String cardNumber, String cardHolderName) {
        this.cardNumber = cardNumber;
        this.cardHolderName = cardHolderName;
    }

    /**
     * Executes payment and persists a simple record into payments.txt.
     */
    @Override
    public void pay(double amount) {
        String message = String.format("Paid %.1f using Credit Card", amount);
        System.out.println(message);

        // Append the same info to a simple text file in the working directory.
        Path file = Paths.get("payments.txt");
        String details = String.format("Method=CreditCard, CardHolder=%s, CardNumber=****%s",
                safe(cardHolderName), last4(cardNumber));
        String line = String.format("%s | %s%n", message, details);
        try {
            if (!Files.exists(file)) {
                Files.createFile(file);
            }
            Files.write(file, line.getBytes(), StandardOpenOption.APPEND);
        } catch (IOException e) {
            // Keep it simple: print the error; real apps would use proper logging.
            System.err.println("Failed to write payment record: " + e.getMessage());
        }
    }

    private static String last4(String number) {
        if (number == null || number.length() < 4) return "";
        return number.substring(number.length() - 4);
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }
}

