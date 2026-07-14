package com.mediflow.pharmacy.controller;

import com.mediflow.pharmacy.model.Medicine;
import com.mediflow.pharmacy.repository.MedicineRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Controller
public class MedicineController {

    @Autowired
    private MedicineRepository medicineRepository;

    private boolean isFaculty(HttpSession session) {
        String role = (String) session.getAttribute("role");
        return "faculty".equalsIgnoreCase(role);
    }

    private boolean isPatient(HttpSession session) {
        String role = (String) session.getAttribute("role");
        return "patient".equalsIgnoreCase(role);
    }

    @GetMapping("/patient/dashboard")
    public String patientDashboard(@RequestParam(value = "q", defaultValue = "") String query,
                                   HttpSession session,
                                   Model model) {
        String username = (String) session.getAttribute("username");
        if (username == null || !isPatient(session)) {
            return "redirect:/login";
        }

        List<Medicine> medicines;
        if (query.trim().isEmpty()) {
            medicines = medicineRepository.findAll();
        } else {
            medicines = medicineRepository.findByNameContainingIgnoreCaseOrDetailsContainingIgnoreCase(query.trim(), query.trim());
        }

        List<Medicine> lowStockMedicines = new ArrayList<>();
        for (Medicine m : medicines) {
            if (m.getQuantity() < 18) {
                lowStockMedicines.add(m);
            }
        }

        model.addAttribute("username", username);
        model.addAttribute("medicines", medicines);
        model.addAttribute("lowStockMedicines", lowStockMedicines);
        model.addAttribute("query", query);
        return "patient-dashboard";
    }

    @GetMapping("/faculty/dashboard")
    public String facultyDashboard(@RequestParam(value = "q", defaultValue = "") String query,
                                   HttpSession session,
                                   Model model) {
        String username = (String) session.getAttribute("username");
        if (username == null || !isFaculty(session)) {
            return "redirect:/login";
        }

        List<Medicine> medicines;
        if (query.trim().isEmpty()) {
            medicines = medicineRepository.findAll();
        } else {
            medicines = medicineRepository.findByNameContainingIgnoreCaseOrDetailsContainingIgnoreCase(query.trim(), query.trim());
        }

        List<Medicine> lowStockMedicines = new ArrayList<>();
        for (Medicine m : medicines) {
            if (m.getQuantity() < 18) {
                lowStockMedicines.add(m);
            }
        }

        model.addAttribute("username", username);
        model.addAttribute("medicines", medicines);
        model.addAttribute("lowStockMedicines", lowStockMedicines);
        model.addAttribute("query", query);
        return "faculty-dashboard";
    }

    @PostMapping("/faculty/medicines/add")
    public String addMedicine(@RequestParam("name") String name,
                              @RequestParam("quantity") Integer quantity,
                              @RequestParam("details") String details,
                              @RequestParam(value = "available", defaultValue = "false") Boolean available,
                              HttpSession session,
                              RedirectAttributes redirectAttributes) {
        if (!isFaculty(session)) {
            return "redirect:/login";
        }

        if (name == null || name.trim().isEmpty() || quantity == null) {
            redirectAttributes.addFlashAttribute("error", "Name and quantity are required.");
            return "redirect:/faculty/dashboard";
        }

        Medicine newMedicine = new Medicine(name.trim(), quantity, available, details != null ? details.trim() : "");
        medicineRepository.save(newMedicine);
        redirectAttributes.addFlashAttribute("message", "Medicine " + newMedicine.getName() + " registered successfully.");
        return "redirect:/faculty/dashboard";
    }

    @PostMapping("/faculty/medicines/toggle/{id}")
    public String toggleAvailability(@PathVariable("id") Long id,
                                     HttpSession session,
                                     RedirectAttributes redirectAttributes) {
        if (!isFaculty(session)) {
            return "redirect:/login";
        }

        Optional<Medicine> medOpt = medicineRepository.findById(id);
        if (medOpt.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Medicine not found.");
            return "redirect:/faculty/dashboard";
        }

        Medicine medicine = medOpt.get();
        medicine.setAvailable(!medicine.getAvailable());
        medicineRepository.save(medicine);
        redirectAttributes.addFlashAttribute("message", "Visibility status toggled for " + medicine.getName());
        return "redirect:/faculty/dashboard";
    }

    @PostMapping("/faculty/medicines/quantity/{id}")
    public String updateQuantity(@PathVariable("id") Long id,
                                 @RequestParam(value = "action", required = false) String action,
                                 @RequestParam(value = "quantity", required = false) Integer quantity,
                                 HttpSession session,
                                 RedirectAttributes redirectAttributes) {
        if (!isFaculty(session)) {
            return "redirect:/login";
        }

        Optional<Medicine> medOpt = medicineRepository.findById(id);
        if (medOpt.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Medicine not found.");
            return "redirect:/faculty/dashboard";
        }

        Medicine medicine = medOpt.get();
        if ("increase".equals(action)) {
            medicine.setQuantity(medicine.getQuantity() + 1);
        } else if ("decrease".equals(action)) {
            if (medicine.getQuantity() > 0) {
                medicine.setQuantity(medicine.getQuantity() - 1);
            }
        } else if (quantity != null && quantity >= 0) {
            medicine.setQuantity(quantity);
        }

        medicineRepository.save(medicine);
        redirectAttributes.addFlashAttribute("message", "Inventory count updated for " + medicine.getName());
        return "redirect:/faculty/dashboard";
    }

    @GetMapping("/faculty/medicines/edit/{id}")
    public String editMedicinePage(@PathVariable("id") Long id,
                                   HttpSession session,
                                   Model model,
                                   RedirectAttributes redirectAttributes) {
        String username = (String) session.getAttribute("username");
        if (username == null || !isFaculty(session)) {
            return "redirect:/login";
        }

        Optional<Medicine> medOpt = medicineRepository.findById(id);
        if (medOpt.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Medicine not found.");
            return "redirect:/faculty/dashboard";
        }

        model.addAttribute("username", username);
        model.addAttribute("medicine", medOpt.get());
        return "edit-medicine";
    }

    @PostMapping("/faculty/medicines/edit/{id}")
    public String editMedicine(@PathVariable("id") Long id,
                               @RequestParam("name") String name,
                               @RequestParam("details") String details,
                               HttpSession session,
                               RedirectAttributes redirectAttributes) {
        if (!isFaculty(session)) {
            return "redirect:/login";
        }

        Optional<Medicine> medOpt = medicineRepository.findById(id);
        if (medOpt.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Medicine not found.");
            return "redirect:/faculty/dashboard";
        }

        if (name == null || name.trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Medicine name is required.");
            return "redirect:/faculty/medicines/edit/" + id;
        }

        Medicine medicine = medOpt.get();
        medicine.setName(name.trim());
        medicine.setDetails(details != null ? details.trim() : "");
        medicineRepository.save(medicine);

        redirectAttributes.addFlashAttribute("message", "Medicine details updated successfully.");
        return "redirect:/faculty/dashboard";
    }

    @PostMapping("/faculty/medicines/delete/{id}")
    public String deleteMedicine(@PathVariable("id") Long id,
                                 HttpSession session,
                                 RedirectAttributes redirectAttributes) {
        if (!isFaculty(session)) {
            return "redirect:/login";
        }

        Optional<Medicine> medOpt = medicineRepository.findById(id);
        if (medOpt.isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Medicine not found.");
            return "redirect:/faculty/dashboard";
        }

        Medicine medicine = medOpt.get();
        medicineRepository.delete(medicine);
        redirectAttributes.addFlashAttribute("message", "Medicine " + medicine.getName() + " deleted successfully.");
        return "redirect:/faculty/dashboard";
    }
}
