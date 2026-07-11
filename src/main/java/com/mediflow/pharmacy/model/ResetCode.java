package com.mediflow.pharmacy.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reset_codes")
public class ResetCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private LocalDateTime expires;

    @Column(name = "user_type", nullable = false)
    private String userType; // "patient" or "faculty"

    @Column(nullable = false)
    private String username;

    public ResetCode() {
    }

    public ResetCode(String email, String code, LocalDateTime expires, String userType, String username) {
        this.email = email;
        this.code = code;
        this.expires = expires;
        this.userType = userType;
        this.username = username;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public LocalDateTime getExpires() {
        return expires;
    }

    public void setExpires(LocalDateTime expires) {
        this.expires = expires;
    }

    public String getUserType() {
        return userType;
    }

    public void setUserType(String userType) {
        this.userType = userType;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
