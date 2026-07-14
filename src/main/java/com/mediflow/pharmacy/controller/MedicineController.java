package com.mediflow.pharmacy.controller;

import com.mediflow.pharmacy.model.Medicine;
import com.mediflow.pharmacy.repository.MedicineRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/medicines")
public class MedicineController {

    @Autowired
    private MedicineRepository medicineRepository;

    private boolean isFaculty(HttpSession session) {
        String role = (String) session.getAttribute("role");
        return "faculty".equalsIgnoreCase(role);
    }

    @GetMapping
    public ResponseEntity<List<Medicine>> getAllMedicines() {
        return ResponseEntity.ok(medicineRepository.findAll());
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchMedicines(@RequestParam(value = "q", defaultValue = "") String query) {
        if (query.trim().isEmpty()) {
            return ResponseEntity.ok(medicineRepository.findAll());
        }
        List<Medicine> matches = medicineRepository.findByNameContainingIgnoreCaseOrDetailsContainingIgnoreCase(query, query);
        return ResponseEntity.ok(matches);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMedicine(@PathVariable("id") Long id) {
        Optional<Medicine> medOpt = medicineRepository.findById(id);
        if (medOpt.isPresent()) {
            return ResponseEntity.ok(medOpt.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Medicine not found."));
    }

    @PostMapping
    public ResponseEntity<?> addMedicine(@RequestBody Map<String, Object> request, HttpSession session) {
        if (!isFaculty(session)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "For faculty/staff access only."));
        }

        String name = (String) request.get("name");
        Integer quantity = (Integer) request.get("quantity");
        Boolean available = (Boolean) request.get("available");
        String details = (String) request.get("details");

        if (name == null || quantity == null || available == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Name, quantity and availability are required."));
        }

        Medicine newMedicine = new Medicine(name, quantity, available, details);
        Medicine saved = medicineRepository.save(newMedicine);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMedicine(@PathVariable("id") Long id, @RequestBody Map<String, Object> request, HttpSession session) {
        if (!isFaculty(session)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "For faculty/staff access only."));
        }

        Optional<Medicine> medOpt = medicineRepository.findById(id);
        if (medOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Medicine not found."));
        }

        Medicine medicine = medOpt.get();

        if (request.containsKey("name")) {
            medicine.setName((String) request.get("name"));
        }
        if (request.containsKey("quantity")) {
            Object qtyObj = request.get("quantity");
            if (qtyObj instanceof Integer) {
                medicine.setQuantity((Integer) qtyObj);
            } else if (qtyObj instanceof String) {
                medicine.setQuantity(Integer.parseInt((String) qtyObj));
            }
        }
        if (request.containsKey("available")) {
            medicine.setAvailable((Boolean) request.get("available"));
        }
        if (request.containsKey("details")) {
            medicine.setDetails((String) request.get("details"));
        }

        Medicine updated = medicineRepository.save(medicine);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMedicine(@PathVariable("id") Long id, HttpSession session) {
        if (!isFaculty(session)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "For faculty/staff access only."));
        }

        Optional<Medicine> medOpt = medicineRepository.findById(id);
        if (medOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Medicine not found."));
        }

        medicineRepository.delete(medOpt.get());
        return ResponseEntity.ok(Map.of("message", "Medicine deleted successfully from inventory."));
    }
}
