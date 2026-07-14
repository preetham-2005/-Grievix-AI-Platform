package com.grievix.dto;

import com.grievix.model.*;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ComplaintResponse {
    private Long id;
    private String title;
    private String description;
    private Category category;
    private Priority priority;
    private Status status;
    private double latitude;
    private double longitude;
    private String ward;
    private String area;
    private String city;
    private String imageUrl;
    private String videoUrl;
    
    // User details (simplified names/ids to avoid nested loops)
    private Long citizenId;
    private String citizenName;
    private Long officerId;
    private String officerName;
    
    private Department department;
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;
    private LocalDateTime slaDeadline;
    
    private String resolutionNotes;
    private String resolutionImageUrl;
    private Double rating;
    private String feedbackNotes;
    
    private List<HistoryEventDto> timeline;

    @Data
    @Builder
    public static class HistoryEventDto {
        private Long id;
        private Status status;
        private String comment;
        private String updatedByName;
        private LocalDateTime timestamp;
    }
}
