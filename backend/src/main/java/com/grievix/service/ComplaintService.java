package com.grievix.service;

import com.grievix.dto.AiAnalysisResult;
import com.grievix.dto.ComplaintRequest;
import com.grievix.dto.ComplaintResponse;
import com.grievix.exception.BadRequestException;
import com.grievix.exception.ResourceNotFoundException;
import com.grievix.model.*;
import com.grievix.repository.ComplaintHistoryRepository;
import com.grievix.repository.ComplaintRepository;
import com.grievix.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final ComplaintHistoryRepository historyRepository;
    private final GeminiService geminiService;

    public ComplaintService(ComplaintRepository complaintRepository,
                            UserRepository userRepository,
                            ComplaintHistoryRepository historyRepository,
                            GeminiService geminiService) {
        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.historyRepository = historyRepository;
        this.geminiService = geminiService;
    }

    @Transactional
    public ComplaintResponse createComplaint(ComplaintRequest request, String citizenUsername) {
        User citizen = userRepository.findByUsername(citizenUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Citizen not found"));

        // 1. Run Gemini AI analysis
        boolean hasImage = request.getImageUrl() != null && !request.getImageUrl().isBlank();
        AiAnalysisResult aiResult = geminiService.analyzeComplaint(
                request.getTitle(),
                request.getDescription(),
                request.getArea(),
                hasImage
        );

        // 2. Set SLA Deadline based on priority
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime slaDeadline = calculateSlaDeadline(now, aiResult.getPriority());

        // 3. Create Complaint
        Complaint complaint = Complaint.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .ward(request.getWard())
                .area(request.getArea())
                .city(request.getCity())
                .imageUrl(request.getImageUrl())
                .videoUrl(request.getVideoUrl())
                .citizen(citizen)
                .category(aiResult.getCategory())
                .priority(aiResult.getPriority())
                .department(aiResult.getDepartment())
                .slaDeadline(slaDeadline)
                .status(Status.PENDING)
                .build();

        // 4. Automated Workload-Balanced Assignment
        User assignedOfficer = assignWorkloadBalancedOfficer(aiResult.getDepartment());
        if (assignedOfficer != null) {
            complaint.setAssignedOfficer(assignedOfficer);
            complaint.setStatus(Status.ASSIGNED);
        }

        Complaint savedComplaint = complaintRepository.save(complaint);

        // 5. Create History Entry
        String historyComment = String.format("Complaint submitted. AI categorized as '%s' (Priority: %s). Routed to %s.",
                aiResult.getCategory().getLabel(), aiResult.getPriority(), aiResult.getDepartment().getLabel());
        
        if (assignedOfficer != null) {
            historyComment += " Automatically assigned to officer: " + assignedOfficer.getUsername();
        } else {
            historyComment += " Pending officer assignment.";
        }

        if (aiResult.getDuplicateOfId() != null) {
            historyComment += " Potential duplicate detected of Complaint ID #" + aiResult.getDuplicateOfId();
        }

        ComplaintHistory history = ComplaintHistory.builder()
                .complaint(savedComplaint)
                .status(savedComplaint.getStatus())
                .comment(historyComment)
                .updatedBy(null) // System/AI update
                .build();
        historyRepository.save(history);

        return mapToResponse(savedComplaint);
    }

    private LocalDateTime calculateSlaDeadline(LocalDateTime now, Priority priority) {
        if (priority == null) return now.plusHours(48);
        return switch (priority) {
            case CRITICAL -> now.plusHours(12);
            case HIGH -> now.plusHours(24);
            case MEDIUM -> now.plusHours(48);
            case LOW -> now.plusHours(72);
        };
    }

    private User assignWorkloadBalancedOfficer(Department department) {
        List<User> officers = userRepository.findByRoleAndDepartmentAndActiveTrue(Role.ROLE_OFFICER, department);
        if (officers.isEmpty()) {
            return null;
        }

        // Fetch current active workloads (officerId -> count of complaints)
        List<Object[]> workloadsData = complaintRepository.getOfficerWorkloads();
        Map<Long, Long> workloads = workloadsData.stream()
                .collect(Collectors.toMap(
                        arr -> (Long) arr[0],
                        arr -> (Long) arr[1]
                ));

        // Find the officer with the minimum workload
        User leastBusyOfficer = null;
        long minWorkload = Long.MAX_VALUE;

        for (User officer : officers) {
            long currentWorkload = workloads.getOrDefault(officer.getId(), 0L);
            if (currentWorkload < minWorkload) {
                minWorkload = currentWorkload;
                leastBusyOfficer = officer;
            }
        }

        return leastBusyOfficer;
    }

    public List<ComplaintResponse> getCitizenComplaints(String citizenUsername) {
        User citizen = userRepository.findByUsername(citizenUsername)
                .orElseThrow(() -> new RuntimeException("Citizen not found"));
        return complaintRepository.findByCitizenIdOrderByCreatedDateDesc(citizen.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ComplaintResponse> getOfficerComplaints(String officerUsername) {
        User officer = userRepository.findByUsername(officerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Officer not found"));
        return complaintRepository.findByAssignedOfficerIdOrderByCreatedDateDesc(officer.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ComplaintResponse> getDepartmentComplaints(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if (user.getDepartment() == null) {
            return Collections.emptyList();
        }

        return complaintRepository.findByDepartmentOrderByCreatedDateDesc(user.getDepartment()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ComplaintResponse> searchAndFilter(String category, String status, String department, String search) {
        return complaintRepository.searchComplaints(category, status, department, search).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ComplaintResponse getComplaintById(Long id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with ID: " + id));
        return mapToResponse(complaint);
    }

    @Transactional
    public ComplaintResponse updateComplaintStatus(Long id, String statusStr, String notes, String resolutionImageUrl, String officerUsername) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with ID: " + id));
        User officer = userRepository.findByUsername(officerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Officer not found"));

        Status newStatus = Status.valueOf(statusStr.toUpperCase());
        complaint.setStatus(newStatus);
        
        if (newStatus == Status.RESOLVED) {
            complaint.setResolutionNotes(notes);
            if (resolutionImageUrl != null && !resolutionImageUrl.isBlank()) {
                complaint.setResolutionImageUrl(resolutionImageUrl);
            }
        }

        Complaint savedComplaint = complaintRepository.save(complaint);

        // Add history timeline entry
        String comment = "Status updated to " + newStatus;
        if (newStatus == Status.RESOLVED && notes != null && !notes.isBlank()) {
            comment += ". Resolution details: " + notes;
        }

        ComplaintHistory history = ComplaintHistory.builder()
                .complaint(savedComplaint)
                .status(newStatus)
                .comment(comment)
                .updatedBy(officer)
                .build();
        historyRepository.save(history);

        return mapToResponse(savedComplaint);
    }

    @Transactional
    public ComplaintResponse submitFeedback(Long id, Double rating, String feedbackNotes, String citizenUsername) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with ID: " + id));
        User citizen = userRepository.findByUsername(citizenUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Citizen not found"));

        if (!complaint.getCitizen().getId().equals(citizen.getId())) {
            throw new BadRequestException("Unauthorized: Citizens can only submit feedback for their own complaints");
        }

        complaint.setRating(rating);
        complaint.setFeedbackNotes(feedbackNotes);
        complaint.setStatus(Status.CLOSED); // Close complaint when feedback is received

        Complaint savedComplaint = complaintRepository.save(complaint);

        // Log history entry
        ComplaintHistory history = ComplaintHistory.builder()
                .complaint(savedComplaint)
                .status(Status.CLOSED)
                .comment(String.format("Feedback submitted by citizen. Rating: %.1f stars. Feedback: %s. Case closed.", rating, feedbackNotes))
                .updatedBy(citizen)
                .build();
        historyRepository.save(history);

        return mapToResponse(savedComplaint);
    }

    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new HashMap<>();

        // Group counts
        analytics.put("categoryDistribution", complaintRepository.countByCategory().stream()
                .collect(Collectors.toMap(arr -> ((Category) arr[0]).name(), arr -> arr[1])));
        
        analytics.put("statusDistribution", complaintRepository.countByStatus().stream()
                .collect(Collectors.toMap(arr -> ((Status) arr[0]).name(), arr -> arr[1])));
        
        analytics.put("departmentDistribution", complaintRepository.countByDepartment().stream()
                .collect(Collectors.toMap(arr -> ((Department) arr[0]).name(), arr -> arr[1])));
        
        analytics.put("areaDistribution", complaintRepository.countByArea().stream()
                .collect(Collectors.toMap(arr -> (String) arr[0], arr -> arr[1])));

        // Average resolution time (Java calculation to ensure database independence)
        List<Complaint> resolved = complaintRepository.findAll().stream()
                .filter(c -> c.getStatus() == Status.RESOLVED || c.getStatus() == Status.CLOSED)
                .collect(Collectors.toList());

        double avgHours = resolved.stream()
                .mapToLong(c -> Duration.between(c.getCreatedDate(), c.getUpdatedDate()).toHours())
                .average()
                .orElse(0.0);

        analytics.put("averageResolutionTimeHours", Math.round(avgHours * 10.0) / 10.0);
        analytics.put("totalComplaintsCount", complaintRepository.count());

        return analytics;
    }

    private ComplaintResponse mapToResponse(Complaint complaint) {
        List<ComplaintHistory> histories = historyRepository.findByComplaintIdOrderByTimestampAsc(complaint.getId());
        List<ComplaintResponse.HistoryEventDto> timeline = histories.stream()
                .map(h -> ComplaintResponse.HistoryEventDto.builder()
                        .id(h.getId())
                        .status(h.getStatus())
                        .comment(h.getComment())
                        .updatedByName(h.getUpdatedBy() != null ? h.getUpdatedBy().getUsername() : "System Engine")
                        .timestamp(h.getTimestamp())
                        .build())
                .collect(Collectors.toList());

        return ComplaintResponse.builder()
                .id(complaint.getId())
                .title(complaint.getTitle())
                .description(complaint.getDescription())
                .category(complaint.getCategory())
                .priority(complaint.getPriority())
                .status(complaint.getStatus())
                .latitude(complaint.getLatitude())
                .longitude(complaint.getLongitude())
                .ward(complaint.getWard())
                .area(complaint.getArea())
                .city(complaint.getCity())
                .imageUrl(complaint.getImageUrl())
                .videoUrl(complaint.getVideoUrl())
                .citizenId(complaint.getCitizen().getId())
                .citizenName(complaint.getCitizen().getUsername())
                .officerId(complaint.getAssignedOfficer() != null ? complaint.getAssignedOfficer().getId() : null)
                .officerName(complaint.getAssignedOfficer() != null ? complaint.getAssignedOfficer().getUsername() : "Unassigned")
                .department(complaint.getDepartment())
                .createdDate(complaint.getCreatedDate())
                .updatedDate(complaint.getUpdatedDate())
                .slaDeadline(complaint.getSlaDeadline())
                .resolutionNotes(complaint.getResolutionNotes())
                .resolutionImageUrl(complaint.getResolutionImageUrl())
                .rating(complaint.getRating())
                .feedbackNotes(complaint.getFeedbackNotes())
                .timeline(timeline)
                .build();
    }
}
