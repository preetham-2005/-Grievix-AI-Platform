package com.grievix.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "escalation_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EscalationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @Column(name = "escalated_at")
    private LocalDateTime escalatedAt;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Enumerated(EnumType.STRING)
    @Column(name = "original_priority", length = 20)
    private Priority originalPriority;

    @Enumerated(EnumType.STRING)
    @Column(name = "escalated_priority", length = 20)
    private Priority escalatedPriority;

    @PrePersist
    protected void onCreate() {
        escalatedAt = LocalDateTime.now();
    }
}
