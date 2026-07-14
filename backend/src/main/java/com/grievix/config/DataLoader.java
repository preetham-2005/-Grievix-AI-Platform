package com.grievix.config;

import com.grievix.model.*;
import com.grievix.repository.ComplaintHistoryRepository;
import com.grievix.repository.ComplaintRepository;
import com.grievix.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component
public class DataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final ComplaintHistoryRepository historyRepository;
    private final PasswordEncoder passwordEncoder;

    public DataLoader(UserRepository userRepository,
                      ComplaintRepository complaintRepository,
                      ComplaintHistoryRepository historyRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.complaintRepository = complaintRepository;
        this.historyRepository = historyRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() > 0) {
            return; // Database already seeded
        }

        System.out.println("Seeding database with default Grievix users and complaints...");

        // 1. Create Default Users
        String encodedPassword = passwordEncoder.encode("password");

        User citizen = User.builder()
                .username("citizen")
                .email("citizen@grievix.gov.in")
                .password(encodedPassword)
                .role(Role.ROLE_CITIZEN)
                .active(true)
                .build();
        userRepository.save(citizen);

        User roadsOfficer = User.builder()
                .username("roads_officer")
                .email("roads.officer@grievix.gov.in")
                .password(encodedPassword)
                .role(Role.ROLE_OFFICER)
                .department(Department.ROADS_DEPARTMENT)
                .active(true)
                .build();
        userRepository.save(roadsOfficer);

        User waterOfficer = User.builder()
                .username("water_officer")
                .email("water.officer@grievix.gov.in")
                .password(encodedPassword)
                .role(Role.ROLE_OFFICER)
                .department(Department.WATER_DEPARTMENT)
                .active(true)
                .build();
        userRepository.save(waterOfficer);

        User electricOfficer = User.builder()
                .username("electric_officer")
                .email("electric.officer@grievix.gov.in")
                .password(encodedPassword)
                .role(Role.ROLE_OFFICER)
                .department(Department.ELECTRICITY_BOARD)
                .active(true)
                .build();
        userRepository.save(electricOfficer);

        User deptHead = User.builder()
                .username("dept_head")
                .email("roads.head@grievix.gov.in")
                .password(encodedPassword)
                .role(Role.ROLE_DEPT_HEAD)
                .department(Department.ROADS_DEPARTMENT)
                .active(true)
                .build();
        userRepository.save(deptHead);

        User admin = User.builder()
                .username("admin")
                .email("admin@grievix.gov.in")
                .password(encodedPassword)
                .role(Role.ROLE_ADMIN)
                .active(true)
                .build();
        userRepository.save(admin);

        // 2. Seed Sample Complaints
        LocalDateTime now = LocalDateTime.now();

        // Complaint 1: Active
        Complaint c1 = Complaint.builder()
                .title("Massive pothole on Inner Ring Road")
                .description("There is a large, dangerous pothole on the inner ring road just past the flyover. Cars have to swerve to avoid it, causing near-misses daily.")
                .latitude(12.9716)
                .longitude(77.5946)
                .ward("Ward 15")
                .area("Shanti Nagar")
                .city("Bengaluru")
                .imageUrl("/presets/road_damage.png")
                .citizen(citizen)
                .assignedOfficer(roadsOfficer)
                .category(Category.ROAD_DAMAGE)
                .priority(Priority.HIGH)
                .status(Status.ASSIGNED)
                .department(Department.ROADS_DEPARTMENT)
                .slaDeadline(now.plusHours(24))
                .build();
        complaintRepository.save(c1);
        historyRepository.save(ComplaintHistory.builder()
                .complaint(c1)
                .status(Status.ASSIGNED)
                .comment("Complaint submitted. AI categorized as 'Road Damage' (Priority: HIGH). Auto-assigned to roads_officer.")
                .build());

        // Complaint 2: Overdue (SLA Breached) to demo Escalation Engine
        Complaint c2 = Complaint.builder()
                .title("Severe water leakage in Sector 4 street main")
                .description("Clean drinking water has been gushing out of the pipe under the street for over 2 days. The entire street is flooded, and residents are facing low water pressure.")
                .latitude(12.9279)
                .longitude(77.6271)
                .ward("Ward 32")
                .area("HSR Layout")
                .city("Bengaluru")
                .imageUrl("/presets/water_leakage.png")
                .citizen(citizen)
                .assignedOfficer(waterOfficer)
                .category(Category.WATER_LEAKAGE)
                .priority(Priority.CRITICAL)
                .status(Status.ASSIGNED)
                .department(Department.WATER_DEPARTMENT)
                // Set SLA deadline in the past (e.g. 10 hours ago) to verify escalation
                .slaDeadline(now.minusHours(10))
                .build();
        // Override pre-persist creation dates manually for the seed to show history
        c2.setCreatedDate(now.minusDays(2));
        complaintRepository.save(c2);
        historyRepository.save(ComplaintHistory.builder()
                .complaint(c2)
                .status(Status.ASSIGNED)
                .comment("Complaint submitted. AI categorized as 'Water Leakage' (Priority: CRITICAL). Auto-assigned to water_officer.")
                .timestamp(now.minusDays(2))
                .build());

        // Complaint 3: Resolved
        Complaint c3 = Complaint.builder()
                .title("Power outage and spark from transformer")
                .description("The transformer behind Sector 2 market sparked last night, and we have had no power since then. Dangerous sparking is still happening occasionally.")
                .latitude(12.9784)
                .longitude(77.6408)
                .ward("Ward 8")
                .area("Indiranagar")
                .city("Bengaluru")
                .imageUrl("/presets/electricity.png")
                .citizen(citizen)
                .assignedOfficer(electricOfficer)
                .category(Category.ELECTRICITY)
                .priority(Priority.CRITICAL)
                .status(Status.RESOLVED)
                .department(Department.ELECTRICITY_BOARD)
                .slaDeadline(now.plusHours(12))
                .resolutionNotes("Transformer fuse replaced and overhead cabling secured. Power restored to Indiranagar Sector 2.")
                .resolutionImageUrl("/presets/electricity.png")
                .build();
        c3.setCreatedDate(now.minusDays(1));
        c3.setUpdatedDate(now.minusHours(2));
        complaintRepository.save(c3);
        
        historyRepository.save(ComplaintHistory.builder()
                .complaint(c3)
                .status(Status.ASSIGNED)
                .comment("Complaint submitted. AI categorized as 'Electricity' (Priority: CRITICAL). Auto-assigned to electric_officer.")
                .timestamp(now.minusDays(1))
                .build());
        
        historyRepository.save(ComplaintHistory.builder()
                .complaint(c3)
                .status(Status.RESOLVED)
                .comment("Status updated to RESOLVED. Resolution details: Transformer fuse replaced and overhead cabling secured. Power restored.")
                .updatedBy(electricOfficer)
                .timestamp(now.minusHours(2))
                .build());

        // Complaint 4: JP Nagar
        Complaint c4 = Complaint.builder()
                .title("Damaged road divider in JP Nagar 3rd Phase")
                .description("A major concrete road divider has been knocked out of place, blocking a lane and causing cars to veer dangerously. Needs patching and alignment.")
                .latitude(12.9063)
                .longitude(77.5857)
                .ward("Ward 27")
                .area("JP Nagar")
                .city("Bengaluru")
                .imageUrl("/presets/road_damage.png")
                .citizen(citizen)
                .assignedOfficer(roadsOfficer)
                .category(Category.ROAD_DAMAGE)
                .priority(Priority.MEDIUM)
                .status(Status.ASSIGNED)
                .department(Department.ROADS_DEPARTMENT)
                .slaDeadline(now.plusHours(48))
                .build();
        complaintRepository.save(c4);
        historyRepository.save(ComplaintHistory.builder()
                .complaint(c4)
                .status(Status.ASSIGNED)
                .comment("Complaint submitted. AI categorized as 'Road Damage' (Priority: MEDIUM). Auto-assigned to roads_officer.")
                .build());

        // Complaint 5: Whitefield
        Complaint c5 = Complaint.builder()
                .title("Garbage pile blocking pedestrian walkway")
                .description("A massive pile of commercial garbage and plastics has been dumped on the walking path in Whitefield Main Road near the tech park gate. Unbearable smell.")
                .latitude(12.9698)
                .longitude(77.7500)
                .ward("Ward 54")
                .area("Whitefield")
                .city("Bengaluru")
                .imageUrl("/presets/garbage.png")
                .citizen(citizen)
                .category(Category.GARBAGE)
                .priority(Priority.LOW)
                .status(Status.PENDING)
                .department(Department.MUNICIPALITY)
                .slaDeadline(now.plusHours(72))
                .build();
        complaintRepository.save(c5);
        historyRepository.save(ComplaintHistory.builder()
                .complaint(c5)
                .status(Status.PENDING)
                .comment("Complaint submitted. AI categorized as 'Garbage' (Priority: LOW). Routed to Municipality (Pending officer assignment).")
                .build());

        // Complaint 6: Yelahanka
        Complaint c6 = Complaint.builder()
                .title("Sewer water backup on Yelahanka road")
                .description("Drainage and raw sewage water is bubbling up from an open manhole near Yelahanka junction, creating an active health hazard and flooding the road.")
                .latitude(13.1007)
                .longitude(77.5963)
                .ward("Ward 2")
                .area("Yelahanka")
                .city("Bengaluru")
                .imageUrl("/presets/water_leakage.png")
                .citizen(citizen)
                .assignedOfficer(waterOfficer)
                .category(Category.DRAINAGE)
                .priority(Priority.HIGH)
                .status(Status.ASSIGNED)
                .department(Department.WATER_DEPARTMENT)
                .slaDeadline(now.plusHours(24))
                .build();
        complaintRepository.save(c6);
        historyRepository.save(ComplaintHistory.builder()
                .complaint(c6)
                .status(Status.ASSIGNED)
                .comment("Complaint submitted. AI categorized as 'Drainage' (Priority: HIGH). Auto-assigned to water_officer.")
                .build());

        System.out.println("Database seeding completed successfully.");
    }
}
