"""
Setup script to initialize users with hashed passwords.
Run this once to set up default test users.
"""
import json
import bcrypt
import os

def hash_password(password):
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def setup_users():
    """Setup default users with hashed passwords"""
    users_file = 'data/users.json'
    
    if os.path.exists(users_file):
        with open(users_file, 'r') as f:
            users_data = json.load(f)
    else:
        users_data = {"patients": [], "faculty": [], "reset_codes": {}}
    
    # Default password for all test users
    default_password = "password123"
    
    # Setup patient users
    patient_usernames = ["patient1", "patient2"]
    for username in patient_usernames:
        existing = next((p for p in users_data.get("patients", []) if p["username"] == username), None)
        if not existing:
            users_data.setdefault("patients", []).append({
                "username": username,
                "password_hash": hash_password(default_password),
                "email": f"{username}@example.com"
            })
        elif not existing.get("password_hash") or existing["password_hash"] == "":
            existing["password_hash"] = hash_password(default_password)
    
    # Setup faculty users
    faculty_usernames = ["faculty1", "admin"]
    for username in faculty_usernames:
        existing = next((f for f in users_data.get("faculty", []) if f["username"] == username), None)
        if not existing:
            users_data.setdefault("faculty", []).append({
                "username": username,
                "password_hash": hash_password(default_password),
                "email": f"{username}@example.com"
            })
        elif not existing.get("password_hash") or existing["password_hash"] == "":
            existing["password_hash"] = hash_password(default_password)
    
    # Ensure reset_codes exists
    if "reset_codes" not in users_data:
        users_data["reset_codes"] = {}
    
    with open(users_file, 'w') as f:
        json.dump(users_data, f, indent=2)
    
    print("Users setup complete!")
    print(f"Default password for all users: {default_password}")
    print("\nTest Users:")
    print("Patients:")
    for patient in users_data.get("patients", []):
        print(f"  - Username: {patient['username']}, Email: {patient['email']}")
    print("Faculty:")
    for faculty in users_data.get("faculty", []):
        print(f"  - Username: {faculty['username']}, Email: {faculty['email']}")

if __name__ == '__main__':
    setup_users()

