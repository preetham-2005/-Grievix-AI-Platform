package com.grievix.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.grievix.dto.AiAnalysisResult;
import com.grievix.model.*;
import com.grievix.repository.ComplaintRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GeminiService {
    private static final Logger logger = LoggerFactory.getLogger(GeminiService.class);

    private final String apiKey;
    private final String apiUrl;
    private final ComplaintRepository complaintRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GeminiService(
            @Value("${grievix.gemini.apiKey:}") String apiKey,
            @Value("${grievix.gemini.apiUrl}") String apiUrl,
            ComplaintRepository complaintRepository,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.complaintRepository = complaintRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public AiAnalysisResult analyzeComplaint(String title, String description, String area, boolean hasImage) {
        // Fetch recent active complaints in the same area to check for duplicates
        List<Complaint> recentComplaints = complaintRepository.searchComplaints(null, null, null, null)
                .stream()
                .filter(c -> area != null && area.equalsIgnoreCase(c.getArea()) && c.getStatus() != Status.CLOSED)
                .limit(5)
                .collect(Collectors.toList());

        if (apiKey == null || apiKey.isBlank()) {
            logger.info("Gemini API Key not found, executing local heuristic fallback.");
            return executeFallbackAnalysis(title, description, recentComplaints);
        }

        try {
            String recentListStr = recentComplaints.stream()
                    .map(c -> String.format("- ID %d: %s (%s)", c.getId(), c.getTitle(), c.getDescription()))
                    .collect(Collectors.joining("\n"));

            String systemPrompt = "You are the AI routing and analysis engine for Grievix, a smart public grievance management platform. " +
                    "Analyze the user's complaint details and classify them into standard Enums. " +
                    "Categories: [ROAD_DAMAGE, GARBAGE, WATER_LEAKAGE, STREET_LIGHT, ELECTRICITY, DRAINAGE, ILLEGAL_PARKING, PUBLIC_TRANSPORT, TREE_FALLEN, POLLUTION, ENCROACHMENT, NOISE_COMPLAINT, ANIMAL_ISSUES, SANITATION, OTHERS]. " +
                    "Priorities: [CRITICAL, HIGH, MEDIUM, LOW]. " +
                    "Departments: [ROADS_DEPARTMENT, WATER_DEPARTMENT, ELECTRICITY_BOARD, MUNICIPALITY, TRAFFIC_POLICE, PUBLIC_HEALTH, FOREST_DEPARTMENT, POLICE]. " +
                    "Duplicate Detection: Check the recent list. If the user's issue matches an existing complaint in substance and location, set 'duplicateOfId' to that ID. Otherwise, null. " +
                    "Provide a brief summary and standard recommendation. " +
                    "You MUST respond ONLY with a JSON object containing fields: category, priority, department, summary, duplicateOfId, recommendedAction. Do not include markdown wraps (like ```json).";

            String userPrompt = String.format(
                    "New Complaint Details:\nTitle: %s\nDescription: %s\nArea: %s\nHas Image: %b\n\nRecent Complaints in Area:\n%s",
                    title, description, area, hasImage, recentListStr.isEmpty() ? "None" : recentListStr
            );

            // Construct payload
            String payload = String.format(
                    "{\"contents\": [{\"parts\": [{\"text\": \"%s\\n\\n%s\"}]}], \"generationConfig\": {\"responseMimeType\": \"application/json\"}}",
                    escapeJson(systemPrompt), escapeJson(userPrompt)
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + "?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String responseText = root.path("candidates").get(0)
                        .path("content").path("parts").get(0).path("text").asText();

                JsonNode resultJson = objectMapper.readTree(responseText.trim());

                Category category = Category.valueOf(resultJson.path("category").asText("OTHERS").toUpperCase());
                Priority priority = Priority.valueOf(resultJson.path("priority").asText("MEDIUM").toUpperCase());
                Department department = Department.valueOf(resultJson.path("department").asText("MUNICIPALITY").toUpperCase());
                String summary = resultJson.path("summary").asText("No summary provided.");
                Long duplicateOfId = resultJson.path("duplicateOfId").isNull() ? null : resultJson.path("duplicateOfId").asLong();
                String recommendedAction = resultJson.path("recommendedAction").asText("Review complaint and dispatch field staff.");

                return AiAnalysisResult.builder()
                        .category(category)
                        .priority(priority)
                        .department(department)
                        .summary(summary)
                        .duplicateOfId(duplicateOfId)
                        .recommendedAction(recommendedAction)
                        .build();
            } else {
                logger.error("Gemini API call failed with status: {}, body: {}", response.statusCode(), response.body());
            }

        } catch (Exception e) {
            logger.error("Error calling Gemini API, falling back: {}", e.getMessage());
        }

        return executeFallbackAnalysis(title, description, recentComplaints);
    }

    private AiAnalysisResult executeFallbackAnalysis(String title, String description, List<Complaint> recentComplaints) {
        String combined = (title + " " + description).toLowerCase();

        Category category = Category.OTHERS;
        Department department = Department.MUNICIPALITY;
        Priority priority = Priority.MEDIUM;
        String action = "Review complaint and dispatch field staff.";

        if (combined.contains("pothole") || combined.contains("road") || combined.contains("crack")) {
            category = Category.ROAD_DAMAGE;
            department = Department.ROADS_DEPARTMENT;
            priority = Priority.MEDIUM;
            action = "Dispatch roads inspection team to assess repair depth.";
        } else if (combined.contains("garbage") || combined.contains("trash") || combined.contains("waste") || combined.contains("dump")) {
            category = Category.GARBAGE;
            department = Department.MUNICIPALITY;
            priority = Priority.LOW;
            action = "Dispatch sanitation truck for immediate clearing.";
        } else if (combined.contains("leak") || combined.contains("water") || combined.contains("pipe") || combined.contains("burst")) {
            category = Category.WATER_LEAKAGE;
            department = Department.WATER_DEPARTMENT;
            priority = Priority.HIGH;
            action = "Send plumbing crew to inspect water mains and seal leakage.";
        } else if (combined.contains("street light") || combined.contains("dark") || combined.contains("bulb")) {
            category = Category.STREET_LIGHT;
            department = Department.MUNICIPALITY;
            priority = Priority.LOW;
            action = "Replace street lamp bulbs and check connection lines.";
        } else if (combined.contains("electricity") || combined.contains("shock") || combined.contains("wire") || combined.contains("power")) {
            category = Category.ELECTRICITY;
            department = Department.ELECTRICITY_BOARD;
            priority = Priority.CRITICAL;
            action = "Emergency dispatch to isolate power grid and secure live wires.";
        } else if (combined.contains("parking") || combined.contains("parked") || combined.contains("car")) {
            category = Category.ILLEGAL_PARKING;
            department = Department.TRAFFIC_POLICE;
            priority = Priority.LOW;
            action = "Send towing unit or issue traffic violation fine.";
        } else if (combined.contains("accident") || combined.contains("crime") || combined.contains("police") || combined.contains("theft")) {
            category = Category.OTHERS;
            department = Department.POLICE;
            priority = Priority.HIGH;
            action = "Forward report to local precinct for inspection.";
        } else if (combined.contains("animal") || combined.contains("dog") || combined.contains("monkey") || combined.contains("stray")) {
            category = Category.ANIMAL_ISSUES;
            department = Department.PUBLIC_HEALTH;
            priority = Priority.MEDIUM;
            action = "Alert local animal welfare and rescue services.";
        }

        if (combined.contains("emergency") || combined.contains("danger") || combined.contains("hazard") || combined.contains("accident")) {
            priority = Priority.CRITICAL;
        } else if (combined.contains("urgent") || combined.contains("blocked")) {
            priority = Priority.HIGH;
        }

        // Mock Duplicate Check (Simple title matching)
        Long duplicateOfId = null;
        for (Complaint c : recentComplaints) {
            if (c.getTitle().toLowerCase().contains(title.toLowerCase()) || title.toLowerCase().contains(c.getTitle().toLowerCase())) {
                duplicateOfId = c.getId();
                break;
            }
        }

        String summary = "Grievance regarding " + category.getLabel() + ".";

        return AiAnalysisResult.builder()
                .category(category)
                .priority(priority)
                .department(department)
                .summary(summary)
                .duplicateOfId(duplicateOfId)
                .recommendedAction(action)
                .build();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
