package com.mediflow.pharmacy;

import com.mediflow.pharmacy.model.Medicine;
import com.mediflow.pharmacy.model.User;
import com.mediflow.pharmacy.repository.MedicineRepository;
import com.mediflow.pharmacy.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@SpringBootApplication
public class PharmacyApplication {

    public static void main(String[] args) {
        SpringApplication.run(PharmacyApplication.class, args);
    }

    @Component
    public static class DatabaseSeeder {

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private MedicineRepository medicineRepository;

        @EventListener(ApplicationReadyEvent.class)
        public void seedDatabase() {
            // 1. Seed Users if table is empty
            if (userRepository.count() == 0) {
                System.out.println("Seeding users database in H2 Database...");
                
                String patientHash = BCrypt.hashpw("patient123", BCrypt.gensalt(12));
                String facultyHash = BCrypt.hashpw("faculty123", BCrypt.gensalt(12));
                String adminHash = BCrypt.hashpw("admin123", BCrypt.gensalt(12));
                String facAdminHash = BCrypt.hashpw("faculty123", BCrypt.gensalt(12));
 
                User p1 = new User("patient1", patientHash, "patient1@example.com", "PATIENT");
                User p2 = new User("patient2", patientHash, "patient2@example.com", "PATIENT");
                User pa = new User("patient_admin", adminHash, "admin@example.com", "PATIENT");
 
                User f1 = new User("faculty1", facultyHash, "faculty1@example.com", "FACULTY");
                User fa = new User("admin", facAdminHash, "admin@example.com", "FACULTY");
 
                userRepository.saveAll(Arrays.asList(p1, p2, pa, f1, fa));
                System.out.println("Users seeded successfully.");
            }
 
            // 2. Seed Medicines if table is empty
            if (medicineRepository.count() == 0) {
                System.out.println("Seeding medicines catalog in H2 Database...");
                
                List<Medicine> initialMedicines = Arrays.asList(
                    new Medicine("Paracetamol", 20, true, "Pain reliever and fever reducer. Dosage: 500mg tablets. Take 1-2 tablets every 4-6 hours as needed."),
                    new Medicine("Ibuprofen", 14, true, "Anti-inflammatory medication. Dosage: 200mg tablets. Take with food. Maximum 1200mg per day."),
                    new Medicine("Amoxicillin", 25, true, "Antibiotic for bacterial infections. Dosage: 250mg capsules. Take as prescribed by doctor."),
                    new Medicine("Aspirin", 12, true, "Blood thinner and pain reliever. Dosage: 75-100mg tablets. Take as directed by doctor."),
                    new Medicine("Cetirizine", 30, true, "Antihistamine for allergies. Dosage: 10mg tablets. Take one tablet daily as needed."),
                    new Medicine("Montasulac", 25, true, "It is medicine used for treating asthma and allergy symptoms."),
                    new Medicine("Dollo-650", 18, true, "Medicine used as pain killer and also fever relief. Dosage: 650mg. Take after food, maintaining 6-8 hr gaps."),
                    new Medicine("Fruticote", 6, false, "Used to maintain glucose levels in blood and body. Consumed before food.")
                );
                
                medicineRepository.saveAll(initialMedicines);
                System.out.println("Medicines catalog seeded successfully.");
            }
        }
    }
}
