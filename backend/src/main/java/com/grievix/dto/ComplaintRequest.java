package com.grievix.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ComplaintRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String description;

    private double latitude;
    private double longitude;
    
    private String ward;
    private String area;
    private String city;

    private String imageUrl;
    private String videoUrl;
}
