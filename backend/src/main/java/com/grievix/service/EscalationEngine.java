package com.grievix.service;

import com.grievix.model.*;
import com.grievix.repository.ComplaintHistoryRepository;
import com.grievix.repository.ComplaintRepository;
import com.grievix.repository.EscalationLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
public class EscalationEngine {
    private static final Logger logger = LoggerFactory.getLogger(EscalationEngine.class);

    private final ComplaintRepository complaintRepository;
    private final EscalationLogRepository escalationLogRepository;
    private final ComplaintHistoryRepository historyRepository;

    public EscalationEngine(ComplaintRepository complaintRepository,
                            EscalationLogRepository escalationLogRepository,
                            ComplaintHistoryRepository historyRepository) {
        this.complaintRepository = complaintRepository;
        this.escalationLogRepository = escalationLogRepository;
        this.historyRepository = historyRepository;
    }

    // Schedule check. Runs every interval configured (60s in dev for testing ease, 1hr in production)
    @Scheduled(fixedDelayString = "${grievix.escalation.checkIntervalMs}")
    @Transactional
    public void runEscalationCheck() {
        logger.info("Starting automated SLA escalation check...");
        checkAndEscalateComplaints();
        logger.info("Automated SLA escalation check completed.");
    }

    @Transactional
    public int checkAndEscalateComplaints() {
        LocalDateTime now = LocalDateTime.now();
        List<Status> excludedStatuses = Arrays.asList(Status.RESOLVED, Status.CLOSED);

        List<Complaint> breachedComplaints = complaintRepository.findSlaBreachedComplaints(excludedStatuses, now);
        int escalationCount = 0;

        for (Complaint complaint : breachedComplaints) {
            escalateComplaint(complaint);
            escalationCount++;
        }

        return escalationCount;
    }

    private void escalateComplaint(Complaint complaint) {
        Priority originalPriority = complaint.getPriority();
        Priority escalatedPriority = originalPriority;

        // Increase priority levels
        if (originalPriority != null) {
            switch (originalPriority) {
                case LOW -> escalatedPriority = Priority.MEDIUM;
                case MEDIUM -> escalatedPriority = Priority.HIGH;
                case HIGH, CRITICAL -> escalatedPriority = Priority.CRITICAL;
            }
        } else {
            escalatedPriority = Priority.MEDIUM;
        }

        complaint.setPriority(escalatedPriority);
        
        // Mark status as ESCALATED
        Status originalStatus = complaint.getStatus();
        complaint.setStatus(Status.ESCALATED);

        // Update deadline to a fresh grace period if needed, or leave it breached
        complaint.setSlaDeadline(LocalDateTime.now().plusHours(12)); // Give 12 hours grace

        // Save Complaint
        complaintRepository.save(complaint);

        // Create Escalation Log
        String details = String.format("SLA deadline of %s passed. Status transitioned from %s to ESCALATED. Priority escalated from %s to %s.",
                complaint.getSlaDeadline(), originalStatus, originalPriority, escalatedPriority);
        
        EscalationLog log = EscalationLog.builder()
                .complaint(complaint)
                .details(details)
                .originalPriority(originalPriority)
                .escalatedPriority(escalatedPriority)
                .build();
        escalationLogRepository.save(log);

        // Create Complaint History timeline entry
        ComplaintHistory history = ComplaintHistory.builder()
                .complaint(complaint)
                .status(Status.ESCALATED)
                .comment("Automated System Escalation: " + details)
                .updatedBy(null) // system trigger
                .build();
        historyRepository.save(history);

        // Notify officers, department heads, and admins (Simulated via console logs)
        sendEscalationNotifications(complaint, details);
    }

    private void sendEscalationNotifications(Complaint complaint, String details) {
        String officerName = complaint.getAssignedOfficer() != null ? complaint.getAssignedOfficer().getUsername() : "Unassigned";
        String departmentName = complaint.getDepartment() != null ? complaint.getDepartment().getLabel() : "Unspecified";

        System.out.printf("[NOTIFICATION ENGINE - ESCALATION WARNING]\n" +
                        "TO ASSIGNED OFFICER (%s): Warning! Complaint #%d is past due. %s\n" +
                        "TO DEPARTMENT HEAD (%s Head): Alert! SLA breached on Complaint #%d. Escalated to Critical/High attention.\n" +
                        "TO SYSTEM ADMINISTRATORS: Audit logged for Complaint #%d SLA failure.\n",
                officerName, complaint.getId(), details, departmentName, complaint.getId(), complaint.getId());
    }
}
