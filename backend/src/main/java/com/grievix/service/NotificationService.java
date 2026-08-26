package com.grievix.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class NotificationService {

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void sendSms(String toPhoneNumber, String message) {
        String accountSid = System.getenv("TWILIO_ACCOUNT_SID");
        String authToken = System.getenv("TWILIO_AUTH_TOKEN");
        String fromNumber = System.getenv("TWILIO_PHONE_NUMBER");

        if (accountSid != null && authToken != null && fromNumber != null) {
            try {
                String twilioUrl = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";
                String requestBody = "To=" + URLEncoder.encode(toPhoneNumber, StandardCharsets.UTF_8) +
                                     "&From=" + URLEncoder.encode(fromNumber, StandardCharsets.UTF_8) +
                                     "&Body=" + URLEncoder.encode(message, StandardCharsets.UTF_8);

                String authHeader = "Basic " + Base64.getEncoder().encodeToString((accountSid + ":" + authToken).getBytes(StandardCharsets.UTF_8));

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(twilioUrl))
                        .header("Authorization", authHeader)
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                        .thenAccept(response -> {
                            System.out.println("Twilio SMS response status: " + response.statusCode());
                        });

            } catch (Exception e) {
                System.err.println("Failed to dispatch Twilio SMS: " + e.getMessage());
            }
        } else {
            // MOCK Fallback for developer environment
            System.out.println("\n--------------------------------------------------");
            System.out.println("[NOTIFY - SMS ALERT]");
            System.out.println("To: " + toPhoneNumber);
            System.out.println("Message: " + message);
            System.out.println("--------------------------------------------------\n");
        }
    }

    public void sendEmail(String toEmail, String subject, String body) {
        String mailHost = System.getenv("SPRING_MAIL_HOST");
        
        if (mailHost != null && mailSender != null) {
            try {
                SimpleMailMessage mailMessage = new SimpleMailMessage();
                mailMessage.setTo(toEmail);
                mailMessage.setSubject(subject);
                mailMessage.setText(body);
                
                String mailUser = System.getenv("SPRING_MAIL_USERNAME");
                if (mailUser != null) {
                    mailMessage.setFrom(mailUser);
                }
                
                mailSender.send(mailMessage);
                System.out.println("Mail successfully sent to: " + toEmail);
            } catch (Exception e) {
                System.err.println("SMTP dispatch failed: " + e.getMessage());
            }
        } else {
            // MOCK Fallback for developer environment
            System.out.println("\n--------------------------------------------------");
            System.out.println("[NOTIFY - EMAIL ALERT]");
            System.out.println("To: " + toEmail);
            System.out.println("Subject: " + subject);
            System.out.println("Body: " + body);
            System.out.println("--------------------------------------------------\n");
        }
    }
}
