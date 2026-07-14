package com.grievix.controller;

import com.grievix.dto.*;
import com.grievix.model.Department;
import com.grievix.model.Role;
import com.grievix.model.User;
import com.grievix.repository.UserRepository;
import com.grievix.security.JwtUtils;
import com.grievix.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder encoder;
    private final JwtUtils jwtUtils;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository,
                          PasswordEncoder encoder, JwtUtils jwtUtils) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.encoder = encoder;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        String jwt = jwtUtils.generateJwtToken(userDetails.getUsername());
        String refreshToken = jwtUtils.generateRefreshToken(userDetails.getUsername());

        // Find user in DB to retrieve their department and role details
        User user = userRepository.findById(userDetails.getId()).orElseThrow();
        String deptStr = user.getDepartment() != null ? user.getDepartment().name() : null;

        return ResponseEntity.ok(new JwtResponse(
                jwt,
                refreshToken,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                user.getRole().name(),
                deptStr
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Username is already taken!"));
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
        }

        // Determine user role (defaulting to citizen)
        Role role = Role.ROLE_CITIZEN;
        String requestedRole = signUpRequest.getRole();
        if (requestedRole != null) {
            switch (requestedRole.toLowerCase()) {
                case "officer" -> role = Role.ROLE_OFFICER;
                case "dept_head" -> role = Role.ROLE_DEPT_HEAD;
                case "admin" -> role = Role.ROLE_ADMIN;
                case "super_admin" -> role = Role.ROLE_SUPER_ADMIN;
            }
        }

        // Map department if specified
        Department department = null;
        if (signUpRequest.getDepartment() != null && !signUpRequest.getDepartment().isBlank()) {
            try {
                department = Department.valueOf(signUpRequest.getDepartment().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Invalid department specified."));
            }
        }

        // Create new user's account
        User user = User.builder()
                .username(signUpRequest.getUsername())
                .email(signUpRequest.getEmail())
                .password(encoder.encode(signUpRequest.getPassword()))
                .role(role)
                .department(department)
                .active(true)
                .build();

        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        if (jwtUtils.validateJwtToken(requestRefreshToken)) {
            String username = jwtUtils.getUserNameFromJwtToken(requestRefreshToken);
            String token = jwtUtils.generateJwtToken(username);
            String refreshToken = jwtUtils.generateRefreshToken(username);
            return ResponseEntity.ok(new TokenRefreshResponse(token, refreshToken));
        }

        return ResponseEntity.badRequest().body(new MessageResponse("Refresh token is expired or invalid."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: No user registered with this email."));
        }
        // Mock email notification sent
        System.out.println("[SMTP Mock] Password reset link sent to: " + email);
        return ResponseEntity.ok(new MessageResponse("Password reset link has been sent to your email."));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String email) {
        // Mock activation verification
        System.out.println("[SMTP Mock] Email activation code verified for: " + email);
        return ResponseEntity.ok(new MessageResponse("Email successfully verified!"));
    }
}
