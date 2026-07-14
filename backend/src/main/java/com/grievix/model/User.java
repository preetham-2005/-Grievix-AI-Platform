package com.grievix.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(columnNames = "username"),
    @UniqueConstraint(columnNames = "email")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(length = 50)
    private String username;

    @NotBlank
    @Column(length = 100)
    private String password;

    @NotBlank
    @Email
    @Column(length = 100)
    private String email;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "department", length = 50)
    private Department department; // Relevant for officers and department heads

    @Builder.Default
    private boolean active = true;
}
