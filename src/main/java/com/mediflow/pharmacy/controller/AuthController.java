package com.mediflow.pharmacy.controller;

import com.mediflow.pharmacy.model.ResetCode;
import com.mediflow.pharmacy.model.User;
import com.mediflow.pharmacy.repository.ResetCodeRepository;
import com.mediflow.pharmacy.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Controller
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResetCodeRepository resetCodeRepository;

    @GetMapping("/")
    public String index(HttpSession session) {
        String role = (String) session.getAttribute("role");
        String username = (String) session.getAttribute("username");
        if (username != null && role != null) {
            if ("faculty".equalsIgnoreCase(role)) {
                return "redirect:/faculty/dashboard";
            } else {
                return "redirect:/patient/dashboard";
            }
        }
        return "redirect:/login";
    }

    @GetMapping("/login")
    public String loginPage(@RequestParam(value = "role", defaultValue = "patient") String role,
                            @RequestParam(value = "mode", defaultValue = "login") String mode,
                            HttpSession session,
                            Model model) {
        String sessionUser = (String) session.getAttribute("username");
        String sessionRole = (String) session.getAttribute("role");
        if (sessionUser != null && sessionRole != null) {
            if ("faculty".equalsIgnoreCase(sessionRole)) {
                return "redirect:/faculty/dashboard";
            } else {
                return "redirect:/patient/dashboard";
            }
        }
        model.addAttribute("role", role.toLowerCase());
        model.addAttribute("mode", mode.toLowerCase());
        return "login";
    }

    @PostMapping("/login")
    public String login(@RequestParam("username") String username,
                        @RequestParam("password") String password,
                        @RequestParam("role") String role,
                        HttpSession session,
                        Model model) {
        
        model.addAttribute("role", role.toLowerCase());
        model.addAttribute("mode", "login");

        if (username == null || username.trim().isEmpty() || password == null || role == null) {
            model.addAttribute("error", "Username, password and role are required.");
            return "login";
        }

        Optional<User> userOpt = userRepository.findByUsername(username.trim());
        if (userOpt.isEmpty()) {
            model.addAttribute("error", "Invalid username or password.");
            return "login";
        }

        User user = userOpt.get();
        if (!user.getRole().equalsIgnoreCase(role)) {
            model.addAttribute("error", "Access denied for this role.");
            return "login";
        }

        if (!BCrypt.checkpw(password, user.getPasswordHash())) {
            model.addAttribute("error", "Invalid username or password.");
            return "login";
        }

        session.setAttribute("username", user.getUsername());
        session.setAttribute("role", user.getRole().toLowerCase());

        if (user.getRole().equalsIgnoreCase("FACULTY")) {
            return "redirect:/faculty/dashboard";
        } else {
            return "redirect:/patient/dashboard";
        }
    }

    @PostMapping("/register")
    public String register(@RequestParam("username") String username,
                           @RequestParam("password") String password,
                           @RequestParam(value = "email", required = false) String email,
                           @RequestParam("role") String role,
                           HttpSession session,
                           Model model) {

        model.addAttribute("role", role.toLowerCase());
        model.addAttribute("mode", "register");

        if (username == null || username.trim().isEmpty() || password == null) {
            model.addAttribute("error", "Username and password are required.");
            return "login";
        }

        String checkRole = (role == null) ? "PATIENT" : role.toUpperCase();

        Optional<User> checkUser = userRepository.findByUsername(username.trim());
        if (checkUser.isPresent()) {
            model.addAttribute("error", "Username already exists.");
            return "login";
        }

        String hashed = BCrypt.hashpw(password, BCrypt.gensalt(12));
        User newUser = new User(username.trim(), hashed, email != null ? email.trim() : null, checkRole);
        userRepository.save(newUser);

        session.setAttribute("username", newUser.getUsername());
        session.setAttribute("role", newUser.getRole().toLowerCase());

        if (newUser.getRole().equalsIgnoreCase("FACULTY")) {
            return "redirect:/faculty/dashboard";
        } else {
            return "redirect:/patient/dashboard";
        }
    }

    @PostMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/login";
    }

    @GetMapping("/forgot-password")
    public String forgotPasswordPage(@RequestParam(value = "role", defaultValue = "patient") String role, Model model) {
        model.addAttribute("role", role.toLowerCase());
        return "forgot";
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestParam("email") String email,
                                 @RequestParam("role") String role,
                                 Model model) {
        
        model.addAttribute("role", role.toLowerCase());

        if (email == null || email.trim().isEmpty() || role == null) {
            model.addAttribute("error", "Email and user role type are required.");
            return "forgot";
        }

        Optional<User> userOpt = userRepository.findByEmailAndRole(email.trim(), role.toUpperCase());
        if (userOpt.isEmpty()) {
            model.addAttribute("error", "No account found matching this email and role.");
            return "forgot";
        }

        User user = userOpt.get();

        Random random = new Random();
        String code = String.valueOf(100000 + random.nextInt(900000));
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(10);

        resetCodeRepository.deleteByEmail(email.trim());

        ResetCode resetCode = new ResetCode(email.trim(), code, expiry, role.toLowerCase(), user.getUsername());
        resetCodeRepository.save(resetCode);

        model.addAttribute("step", "reset");
        model.addAttribute("email", email.trim());
        model.addAttribute("generatedCode", code);
        model.addAttribute("message", "Verification code generated.");
        return "forgot";
    }

    @PostMapping("/reset-password")
    public String resetPassword(@RequestParam("email") String email,
                                @RequestParam("code") String code,
                                @RequestParam("newPassword") String newPassword,
                                @RequestParam("confirmPassword") String confirmPassword,
                                Model model,
                                RedirectAttributes redirectAttributes) {

        if (email == null || code == null || newPassword == null || confirmPassword == null) {
            model.addAttribute("error", "All fields are required.");
            model.addAttribute("step", "reset");
            model.addAttribute("email", email);
            return "forgot";
        }

        if (!newPassword.equals(confirmPassword)) {
            model.addAttribute("error", "Passwords do not match.");
            model.addAttribute("step", "reset");
            model.addAttribute("email", email);
            return "forgot";
        }

        Optional<ResetCode> codeOpt = resetCodeRepository.findFirstByEmailOrderByExpiresDesc(email.trim());
        if (codeOpt.isEmpty()) {
            model.addAttribute("error", "Password reset request session not found or invalid email.");
            model.addAttribute("step", "reset");
            model.addAttribute("email", email);
            return "forgot";
        }

        ResetCode resetCode = codeOpt.get();
        if (LocalDateTime.now().isAfter(resetCode.getExpires())) {
            resetCodeRepository.delete(resetCode);
            model.addAttribute("error", "Verification code has expired. Request a new one.");
            return "forgot";
        }

        if (!resetCode.getCode().equals(code.trim())) {
            model.addAttribute("error", "Invalid verification code.");
            model.addAttribute("step", "reset");
            model.addAttribute("email", email);
            model.addAttribute("generatedCode", resetCode.getCode());
            return "forgot";
        }

        Optional<User> userOpt = userRepository.findByUsername(resetCode.getUsername());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPasswordHash(BCrypt.hashpw(newPassword, BCrypt.gensalt(12)));
            userRepository.save(user);

            resetCodeRepository.delete(resetCode);
            redirectAttributes.addFlashAttribute("message", "Password reset successfully. Please login with your new password.");
            return "redirect:/login";
        }

        model.addAttribute("error", "Internal user retrieval error.");
        return "forgot";
    }
}
