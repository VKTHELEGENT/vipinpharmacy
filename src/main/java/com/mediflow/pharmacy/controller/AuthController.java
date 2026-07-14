package com.mediflow.pharmacy.controller;

import com.mediflow.pharmacy.model.ResetCode;
import com.mediflow.pharmacy.model.User;
import com.mediflow.pharmacy.repository.ResetCodeRepository;
import com.mediflow.pharmacy.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResetCodeRepository resetCodeRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request, HttpSession session) {
        String username = request.get("username");
        String password = request.get("password");
        String role = request.get("role"); // "patient" or "faculty"

        if (username == null || password == null || role == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username, password and role are required."));
        }

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid username or password."));
        }

        User user = userOpt.get();
        // Check role
        if (!user.getRole().equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Access denied for this role."));
        }

        // Check password
        if (!BCrypt.checkpw(password, user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid username or password."));
        }

        // Set session
        session.setAttribute("username", user.getUsername());
        session.setAttribute("role", user.getRole().toLowerCase());

        Map<String, String> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("type", user.getRole().toLowerCase());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request, HttpSession session) {
        String username = request.get("username");
        String password = request.get("password");
        String email = request.get("email");
        String role = request.get("role"); // Default to PATIENT if not provided or register flow

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required."));
        }

        if (role == null) role = "PATIENT";
        role = role.toUpperCase();

        Optional<User> checkUser = userRepository.findByUsername(username);
        if (checkUser.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already exists."));
        }

        String hashed = BCrypt.hashpw(password, BCrypt.gensalt(12));
        User newUser = new User(username, hashed, email, role);
        userRepository.save(newUser);

        // Auto login after register
        session.setAttribute("username", newUser.getUsername());
        session.setAttribute("role", newUser.getRole().toLowerCase());

        Map<String, String> response = new HashMap<>();
        response.put("username", newUser.getUsername());
        response.put("type", newUser.getRole().toLowerCase());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }

    @GetMapping("/session")
    public ResponseEntity<?> getSession(HttpSession session) {
        String username = (String) session.getAttribute("username");
        String role = (String) session.getAttribute("role");

        if (username == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No active session."));
        }

        Map<String, String> response = new HashMap<>();
        response.put("username", username);
        response.put("type", role);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    @Transactional
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String userType = request.get("userType"); // "patient" or "faculty"

        if (email == null || userType == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and user role type are required."));
        }

        Optional<User> userOpt = userRepository.findByEmailAndRole(email, userType.toUpperCase());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "No account found matching this email."));
        }

        User user = userOpt.get();

        // Generate 6-digit random code
        Random random = new Random();
        String code = String.valueOf(100000 + random.nextInt(900000));
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        // Delete existing codes
        resetCodeRepository.deleteByEmail(email);

        // Save new code
        ResetCode resetCode = new ResetCode(email, code, expiry, userType, user.getUsername());
        resetCodeRepository.save(resetCode);

        // Emulate sending verification email by passing code back in response
        Map<String, String> response = new HashMap<>();
        response.put("message", "Verification code generated.");
        response.put("code", code); // Passed for local testing emulation
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    @Transactional
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String code = request.get("code");
        String newPassword = request.get("newPassword");
        String confirmPassword = request.get("confirmPassword");

        if (email == null || code == null || newPassword == null || confirmPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "All fields are required."));
        }

        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Passwords do not match."));
        }

        Optional<ResetCode> codeOpt = resetCodeRepository.findFirstByEmailOrderByExpiresDesc(email);
        if (codeOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Password reset request session not found or invalid email."));
        }

        ResetCode resetCode = codeOpt.get();
        if (LocalDateTime.now().isAfter(resetCode.getExpires())) {
            resetCodeRepository.delete(resetCode);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Verification code has expired. Request a new one."));
        }

        if (!resetCode.getCode().equals(code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid verification code."));
        }

        // Find user and reset password
        Optional<User> userOpt = userRepository.findByUsername(resetCode.getUsername());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPasswordHash(BCrypt.hashpw(newPassword, BCrypt.gensalt(12)));
            userRepository.save(user);

            // Clean up code
            resetCodeRepository.delete(resetCode);
            return ResponseEntity.ok(Map.of("message", "Password reset successfully. Please login with your new password."));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Internal user retrieval error."));
    }
}
