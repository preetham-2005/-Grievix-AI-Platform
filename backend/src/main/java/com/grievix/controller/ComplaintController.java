package com.grievix.controller;

import com.grievix.dto.ComplaintRequest;
import com.grievix.dto.ComplaintResponse;
import com.grievix.dto.MessageResponse;
import com.grievix.service.ComplaintService;
import com.grievix.service.EscalationEngine;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;
    private final EscalationEngine escalationEngine;

    public ComplaintController(ComplaintService complaintService, EscalationEngine escalationEngine) {
        this.complaintService = complaintService;
        this.escalationEngine = escalationEngine;
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_CITIZEN')")
    public ResponseEntity<ComplaintResponse> submitComplaint(
            @Valid @RequestBody ComplaintRequest request,
            Principal principal) {
        ComplaintResponse response = complaintService.createComplaint(request, principal.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/citizen")
    @PreAuthorize("hasRole('ROLE_CITIZEN')")
    public ResponseEntity<List<ComplaintResponse>> getCitizenComplaints(Principal principal) {
        List<ComplaintResponse> responses = complaintService.getCitizenComplaints(principal.getName());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/officer")
    @PreAuthorize("hasRole('ROLE_OFFICER')")
    public ResponseEntity<List<ComplaintResponse>> getOfficerComplaints(Principal principal) {
        List<ComplaintResponse> responses = complaintService.getOfficerComplaints(principal.getName());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/department")
    @PreAuthorize("hasAnyRole('ROLE_OFFICER', 'ROLE_DEPT_HEAD')")
    public ResponseEntity<List<ComplaintResponse>> getDepartmentComplaints(Principal principal) {
        List<ComplaintResponse> responses = complaintService.getDepartmentComplaints(principal.getName());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ROLE_DEPT_HEAD', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<List<ComplaintResponse>> searchComplaints(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String query) {
        List<ComplaintResponse> responses = complaintService.searchAndFilter(category, status, department, query);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComplaintResponse> getComplaintById(@PathVariable Long id) {
        ComplaintResponse response = complaintService.getComplaintById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ROLE_OFFICER', 'ROLE_DEPT_HEAD')")
    public ResponseEntity<ComplaintResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String notes,
            @RequestParam(required = false) String resolutionImageUrl,
            Principal principal) {
        ComplaintResponse response = complaintService.updateComplaintStatus(id, status, notes, resolutionImageUrl, principal.getName());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/feedback")
    @PreAuthorize("hasRole('ROLE_CITIZEN')")
    public ResponseEntity<ComplaintResponse> submitFeedback(
            @PathVariable Long id,
            @RequestParam Double rating,
            @RequestParam String notes,
            Principal principal) {
        ComplaintResponse response = complaintService.submitFeedback(id, rating, notes, principal.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        Map<String, Object> responses = complaintService.getAnalytics();
        return ResponseEntity.ok(responses);
    }

    // Manual triggers for testing/demonstration of SLA engine
    @PostMapping("/escalate-check")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPT_HEAD')")
    public ResponseEntity<MessageResponse> triggerEscalationCheck() {
        int count = escalationEngine.checkAndEscalateComplaints();
        return ResponseEntity.ok(new MessageResponse("Manual SLA check run successfully. Escalated " + count + " complaints."));
    }

    @PutMapping("/{id}/override")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<ComplaintResponse> overrideRouting(
            @PathVariable Long id,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Long officerId) {
        ComplaintResponse response = complaintService.overrideRouting(id, category, department, officerId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('ROLE_DEPT_HEAD', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<byte[]> exportFilteredComplaintsCsv(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String query) {
        byte[] csvBytes = complaintService.exportFilteredComplaintsCsv(category, status, department, query);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"complaints_export.csv\"")
                .header("Content-Type", "text/csv; charset=UTF-8")
                .body(csvBytes);
    }

    @GetMapping("/officers")
    @PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPT_HEAD')")
    public ResponseEntity<List<Map<String, Object>>> getOfficers() {
        return ResponseEntity.ok(complaintService.getAllOfficers());
    }
}
