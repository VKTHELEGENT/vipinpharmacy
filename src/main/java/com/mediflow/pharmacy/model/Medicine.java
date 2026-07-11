package com.mediflow.pharmacy.model;

import jakarta.persistence.*;

@Entity
@Table(name = "medicines")
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Boolean available;

    @Column(columnDefinition = "TEXT")
    private String details;

    // Default constructor for JPA
    public Medicine() {
    }

    public Medicine(String name, Integer quantity, Boolean available, String details) {
        this.name = name;
        this.quantity = quantity;
        this.available = available;
        this.details = details;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Boolean getAvailable() {
        return available;
    }

    public void setAvailable(Boolean available) {
        this.available = available;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
