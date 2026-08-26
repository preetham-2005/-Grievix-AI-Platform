package com.grievix;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GrievixApplication {
    public static void main(String[] args) {
        // Automatically discover and load configuration variables from .env file
        try {
            java.io.File envFile = new java.io.File(".env");
            if (!envFile.exists()) {
                // Try parent folder relative to backend directory
                envFile = new java.io.File("../.env");
            }
            if (envFile.exists()) {
                System.out.println("[CONFIG] Loading variables from env config: " + envFile.getAbsolutePath());
                java.nio.file.Files.lines(envFile.toPath())
                        .map(String::trim)
                        .filter(line -> !line.startsWith("#") && line.contains("="))
                        .forEach(line -> {
                            int eqIdx = line.indexOf('=');
                            String key = line.substring(0, eqIdx).trim();
                            String value = line.substring(eqIdx + 1).trim();
                            if (value.startsWith("\"") && value.endsWith("\"")) {
                                value = value.substring(1, value.length() - 1);
                            } else if (value.startsWith("'") && value.endsWith("'")) {
                                value = value.substring(1, value.length() - 1);
                            }
                            System.setProperty(key, value);
                        });
            }
        } catch (Exception e) {
            System.err.println("[CONFIG] Failed to parse .env file: " + e.getMessage());
        }

        SpringApplication.run(GrievixApplication.class, args);
    }
}
