package com.grievix.dto;

import com.grievix.model.Category;
import com.grievix.model.Department;
import com.grievix.model.Priority;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiAnalysisResult {
    private Category category;
    private Priority priority;
    private Department department;
    private String summary;
    private Long duplicateOfId; // ID of the duplicate complaint, or null if unique
    private String recommendedAction;
}
