from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
import json
import os
import bcrypt
import random
import string
import secrets
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# Data file paths
USERS_FILE = 'data/users.json'
MEDICINES_FILE = 'data/medicines.json'

def load_users():
    """Load users from JSON file"""
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {"patients": [], "faculty": [], "reset_codes": {}}

def save_users(data):
    """Save users to JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def load_medicines():
    """Load medicines from JSON file"""
    if os.path.exists(MEDICINES_FILE):
        with open(MEDICINES_FILE, 'r') as f:
            return json.load(f)
    return []

def save_medicines(data):
    """Save medicines to JSON file"""
    with open(MEDICINES_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def hash_password(password):
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password, hashed):
    """Check if password matches the hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_reset_code():
    """Generate a random 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))

def patient_required(f):
    """Decorator to require patient login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_type' not in session or session['user_type'] != 'patient':
            return redirect(url_for('patient_login'))
        return f(*args, **kwargs)
    return decorated_function

def faculty_required(f):
    """Decorator to require faculty login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_type' not in session or session['user_type'] != 'faculty':
            return redirect(url_for('faculty_login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    """Home page - redirect to patient login"""
    return redirect(url_for('patient_login'))

@app.route('/patient/login', methods=['GET', 'POST'])
def patient_login():
    """Patient login page"""
    if request.method == 'POST':
        username = request.form.get('username')

        
        if username:
            users_data = load_users()
            
            # Check if patient exists
            patient_found = False
            for patient in users_data.get('patients', []):
                if patient['username'] == username:
                    patient_found = True
                    break
            
            # If not found, create new patient
            if not patient_found:
                new_patient = {
                    'username': username,
                    'password_hash': '', # No password needed
                    'email': '' # Optional, or could ask in future
                }
                if 'patients' not in users_data:
                    users_data['patients'] = []
                users_data['patients'].append(new_patient)
                save_users(users_data)
            
            # Log in
            session['username'] = username
            session['user_type'] = 'patient'
            return redirect(url_for('patient_dashboard'))
            
        flash('Username is required', 'error')
    
    return render_template('patient_login.html')

@app.route('/faculty/login', methods=['GET', 'POST'])
def faculty_login():
    """Faculty login page"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        users_data = load_users()
        
        for faculty in users_data.get('faculty', []):
            if faculty['username'] == username and check_password(password, faculty['password_hash']):
                session['username'] = username
                session['user_type'] = 'faculty'
                return redirect(url_for('faculty_dashboard'))
        
        flash('Invalid username or password', 'error')
    
    return render_template('faculty_login.html')

@app.route('/patient/dashboard')
@patient_required
def patient_dashboard():
    """Patient dashboard"""
    medicines = load_medicines()
    low_stock_medicines = [m for m in medicines if m.get('quantity', 0) < 18]
    return render_template('patient_dashboard.html', medicines=medicines, low_stock=low_stock_medicines)

@app.route('/faculty/dashboard')
@faculty_required
def faculty_dashboard():
    """Faculty dashboard"""
    medicines = load_medicines()
    low_stock_medicines = [m for m in medicines if m.get('quantity', 0) < 18]
    return render_template('faculty_dashboard.html', medicines=medicines, low_stock=low_stock_medicines)

@app.route('/logout')
def logout():
    """Logout route"""
    session.clear()
    return redirect(url_for('patient_login'))

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Forgot password page"""
    if request.method == 'POST':
        email = request.form.get('email')
        user_type = request.form.get('user_type', 'patient')
        
        users_data = load_users()
        # Fix pluralization: 'patient' -> 'patients', 'faculty' -> 'faculty'
        user_key = 'patients' if user_type == 'patient' else 'faculty'
        user_list = users_data.get(user_key, [])
        
        # Find user by email
        user = None
        for u in user_list:
            if u.get('email') == email:
                user = u
                break
        
        if user:
            # Generate verification code
            reset_code = generate_reset_code()
            
            # Store reset code with expiration (10 minutes)
            if 'reset_codes' not in users_data:
                users_data['reset_codes'] = {}
            
            users_data['reset_codes'][email] = {
                'code': reset_code,
                'expires': (datetime.now() + timedelta(minutes=10)).isoformat(),
                'user_type': user_type,
                'username': user['username']
            }
            save_users(users_data)
            
            # In production, send email here
            # For development, we'll flash the code (in production, this would be sent via email)
            flash(f'Verification code sent to {email}. Code: {reset_code} (This is for development only)', 'info')
            return redirect(url_for('reset_password', email=email))
        else:
            flash('Email not found', 'error')
    
    return render_template('forgot_password.html')

@app.route('/reset-password', methods=['GET', 'POST'])
def reset_password():
    """Reset password page with verification code"""
    email = request.args.get('email')
    
    if request.method == 'POST':
        email = request.form.get('email')
        code = request.form.get('code')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        
        if new_password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('reset_password.html', email=email)
        
        users_data = load_users()
        reset_codes = users_data.get('reset_codes', {})
        
        if email in reset_codes:
            stored_code_data = reset_codes[email]
            
            # Check if code is valid and not expired
            expires = datetime.fromisoformat(stored_code_data['expires'])
            if datetime.now() > expires:
                flash('Verification code has expired', 'error')
                del reset_codes[email]
                save_users(users_data)
                return render_template('reset_password.html', email=email)
            
            if stored_code_data['code'] == code:
                # Reset password
                user_type = stored_code_data['user_type']
                username = stored_code_data['username']
                
                # Fix pluralization: 'patient' -> 'patients', 'faculty' -> 'faculty'
                user_key = 'patients' if user_type == 'patient' else 'faculty'
                user_list = users_data.get(user_key, [])
                
                for user in user_list:
                    if user['username'] == username:
                        user['password_hash'] = hash_password(new_password)
                        break
                
                # Remove used reset code
                del reset_codes[email]
                save_users(users_data)
                
                flash('Password reset successfully. Please login with your new password.', 'success')
                login_route = 'patient_login' if user_type == 'patient' else 'faculty_login'
                return redirect(url_for(login_route))
            else:
                flash('Invalid verification code', 'error')
        else:
            flash('Invalid email or code', 'error')
    
    return render_template('reset_password.html', email=email)

# API Routes for Medicine Operations

@app.route('/api/medicines/search')
def search_medicines():
    """Search medicines API endpoint"""
    query = request.args.get('q', '').lower()
    medicines = load_medicines()
    
    if query:
        matches = [m for m in medicines if query in m['name'].lower()]
        return jsonify(matches)
    
    return jsonify([])

@app.route('/api/medicines/<int:medicine_id>')
def get_medicine(medicine_id):
    """Get medicine details by ID"""
    medicines = load_medicines()
    medicine = next((m for m in medicines if m['id'] == medicine_id), None)
    
    if medicine:
        return jsonify(medicine)
    return jsonify({'error': 'Medicine not found'}), 404

@app.route('/api/medicines', methods=['POST'])
@faculty_required
def add_medicine():
    """Add new medicine"""
    data = request.get_json()
    
    medicines = load_medicines()
    
    # Generate new ID
    new_id = max([m['id'] for m in medicines], default=0) + 1
    
    new_medicine = {
        'id': new_id,
        'name': data.get('name'),
        'quantity': int(data.get('quantity', 0)),
        'available': data.get('available', True),
        'details': data.get('details', '')
    }
    
    medicines.append(new_medicine)
    save_medicines(medicines)
    
    return jsonify(new_medicine), 201

@app.route('/api/medicines/<int:medicine_id>', methods=['PUT'])
@faculty_required
def update_medicine(medicine_id):
    """Update medicine details"""
    data = request.get_json()
    medicines = load_medicines()
    
    for i, medicine in enumerate(medicines):
        if medicine['id'] == medicine_id:
            if 'name' in data:
                medicines[i]['name'] = data['name']
            if 'quantity' in data:
                medicines[i]['quantity'] = int(data['quantity'])
            if 'available' in data:
                medicines[i]['available'] = data['available']
            if 'details' in data:
                medicines[i]['details'] = data['details']
            
            save_medicines(medicines)
            return jsonify(medicines[i])
    
    return jsonify({'error': 'Medicine not found'}), 404

@app.route('/api/medicines/<int:medicine_id>', methods=['DELETE'])
@faculty_required
def delete_medicine(medicine_id):
    """Delete medicine"""
    medicines = load_medicines()
    
    for i, medicine in enumerate(medicines):
        if medicine['id'] == medicine_id:
            deleted = medicines.pop(i)
            save_medicines(medicines)
            return jsonify({'message': 'Medicine deleted successfully', 'deleted': deleted})
    
    return jsonify({'error': 'Medicine not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)

