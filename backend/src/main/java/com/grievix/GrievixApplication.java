package com.grievix;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GrievixApplication {
    public static void main(String[] args) {
        SpringApplication.run(GrievixApplication.class, args);
    }
}
