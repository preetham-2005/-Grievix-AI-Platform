package com.grievix.repository;

import com.grievix.model.Complaint;
import com.grievix.model.Department;
import com.grievix.model.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findByCitizenIdOrderByCreatedDateDesc(Long citizenId);

    List<Complaint> findByAssignedOfficerIdOrderByCreatedDateDesc(Long officerId);

    List<Complaint> findByDepartmentOrderByCreatedDateDesc(Department department);

    // Find complaints that have breached SLA and are not closed/resolved
    @Query("SELECT c FROM Complaint c WHERE c.status NOT IN (:excludedStatuses) AND c.slaDeadline < :now")
    List<Complaint> findSlaBreachedComplaints(
        @Param("excludedStatuses") List<Status> excludedStatuses,
        @Param("now") LocalDateTime now
    );

    // General search/filter (simple implementation)
    @Query("SELECT c FROM Complaint c WHERE " +
           "(:category IS NULL OR c.category = :category) AND " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:department IS NULL OR c.department = :department) AND " +
           "(:search IS NULL OR LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Complaint> searchComplaints(
        @Param("category") String category,
        @Param("status") String status,
        @Param("department") String department,
        @Param("search") String search
    );

    // Dashboard Analytics queries
    @Query("SELECT c.category, COUNT(c) FROM Complaint c GROUP BY c.category")
    List<Object[]> countByCategory();

    @Query("SELECT c.status, COUNT(c) FROM Complaint c GROUP BY c.status")
    List<Object[]> countByStatus();

    @Query("SELECT c.department, COUNT(c) FROM Complaint c GROUP BY c.department")
    List<Object[]> countByDepartment();

    @Query("SELECT c.area, COUNT(c) FROM Complaint c GROUP BY c.area")
    List<Object[]> countByArea();

    // Workload of officers (returns officerId and count of assigned complaints)
    @Query("SELECT c.assignedOfficer.id, COUNT(c) FROM Complaint c WHERE c.status IN ('ASSIGNED', 'IN_PROGRESS') GROUP BY c.assignedOfficer.id")
    List<Object[]> getOfficerWorkloads();
}
