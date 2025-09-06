from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date, timedelta
import os
import json
import re
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///brand_manager.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)  # 8 hour session timeout
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

db = SQLAlchemy(app)

class LoginAttempt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    success = db.Column(db.Boolean, default=False)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    master_password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Brand(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7), default='#3B82F6')  # Hex color
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    tasks = db.relationship('Task', backref='brand', lazy=True, cascade='all, delete-orphan')
    shoots = db.relationship('Shoot', backref='brand', lazy=True, cascade='all, delete-orphan')
    content_items = db.relationship('ContentItem', backref='brand', lazy=True, cascade='all, delete-orphan')

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='todo')  # todo, in_progress, done
    priority = db.Column(db.String(10), default='medium')  # low, medium, high
    due_date = db.Column(db.Date)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Shoot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    shoot_date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(200))
    attachments = db.Column(db.Text)  # JSON string of external file URLs
    brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ContentItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    file_url = db.Column(db.String(500), nullable=False)  # External storage URL
    content_type = db.Column(db.String(50))  # image, video, document, etc.
    folder_path = db.Column(db.String(200))  # Virtual folder structure
    brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'authenticated' not in session:
            return redirect(url_for('login'))
        
        # Check session timeout
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if isinstance(last_activity, str):
                # Parse string to naive datetime
                last_activity = datetime.fromisoformat(last_activity)
            elif hasattr(last_activity, 'isoformat'):
                # Already a datetime object
                last_activity = last_activity.replace(tzinfo=None)
            if datetime.utcnow() - last_activity > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                flash('Session expired. Please login again.', 'error')
                return redirect(url_for('login'))
        session['last_activity'] = datetime.utcnow().isoformat()
        return f(*args, **kwargs)
    return decorated_function

def check_rate_limit(ip_address, max_attempts=5, window_minutes=15):
    """Check if IP has exceeded login attempts in the time window"""
    cutoff_time = datetime.utcnow() - timedelta(minutes=window_minutes)
    recent_attempts = LoginAttempt.query.filter(
        LoginAttempt.ip_address == ip_address,
        LoginAttempt.timestamp > cutoff_time,
        LoginAttempt.success == False
    ).count()
    
    return recent_attempts < max_attempts

def validate_password_strength(password):
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is strong"

# Routes
@app.route('/')
@login_required
def index():
    # Get dashboard data
    brands = Brand.query.all()
    recent_tasks = Task.query.filter_by(status='todo').order_by(Task.due_date.asc()).limit(5).all()
    upcoming_shoots = Shoot.query.filter(Shoot.shoot_date >= date.today()).order_by(Shoot.shoot_date.asc()).limit(3).all()
    
    return render_template('dashboard.html', brands=brands, recent_tasks=recent_tasks, upcoming_shoots=upcoming_shoots)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form['password']
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', 'unknown'))
        
        if not check_rate_limit(ip_address):
            flash('Too many failed login attempts. Please try again in 15 minutes.', 'error')
            return render_template('login.html')
        
        user = User.query.first()
        
        attempt = LoginAttempt(ip_address=ip_address)
        
        if user and check_password_hash(user.master_password_hash, password):
            session.permanent = True
            session['authenticated'] = True
            session['last_activity'] = datetime.utcnow()
            attempt.success = True
            db.session.add(attempt)
            db.session.commit()
            
            flash('Login successful!', 'success')
            return redirect(url_for('index'))
        else:
            attempt.success = False
            db.session.add(attempt)
            db.session.commit()
            flash('Invalid password!', 'error')
    
    return render_template('login.html')

@app.route('/setup', methods=['GET', 'POST'])
def setup():
    if User.query.first():
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if password != confirm_password:
            flash('Passwords do not match!', 'error')
            return render_template('setup.html')
        
        is_valid, message = validate_password_strength(password)
        if not is_valid:
            flash(message, 'error')
            return render_template('setup.html')
        
        user = User(master_password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        
        session.permanent = True
        session['authenticated'] = True
        session['last_activity'] = datetime.utcnow()
        flash('Setup complete! Welcome to Brand Manager!', 'success')
        return redirect(url_for('index'))
    
    return render_template('setup.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out successfully.', 'success')
    return redirect(url_for('login'))

@app.route('/change_password', methods=['GET', 'POST'])
@login_required
def change_password():
    if request.method == 'POST':
        current_password = request.form['current_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']
        
        user = User.query.first()
        
        if not check_password_hash(user.master_password_hash, current_password):
            flash('Current password is incorrect!', 'error')
            return render_template('change_password.html')
        
        if new_password != confirm_password:
            flash('New passwords do not match!', 'error')
            return render_template('change_password.html')
        
        is_valid, message = validate_password_strength(new_password)
        if not is_valid:
            flash(message, 'error')
            return render_template('change_password.html')
        
        user.master_password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        flash('Password changed successfully!', 'success')
        return redirect(url_for('index'))
    
    return render_template('change_password.html')

# Brand Management Routes
@app.route('/brands')
@login_required
def brands():
    brands = Brand.query.all()
    return render_template('brands.html', brands=brands)

@app.route('/brands/new', methods=['GET', 'POST'])
@login_required
def new_brand():
    if request.method == 'POST':
        brand = Brand(
            name=request.form['name'],
            description=request.form['description'],
            color=request.form['color']
        )
        db.session.add(brand)
        db.session.commit()
        flash('Brand created successfully!', 'success')
        return redirect(url_for('brands'))
    
    return render_template('new_brand.html')

@app.route('/brands/<int:brand_id>')
@login_required
def brand_detail(brand_id):
    brand = Brand.query.get_or_404(brand_id)
    tasks = Task.query.filter_by(brand_id=brand_id).all()
    shoots = Shoot.query.filter_by(brand_id=brand_id).all()
    content_items = ContentItem.query.filter_by(brand_id=brand_id).all()
    
    return render_template('brand_detail.html', brand=brand, tasks=tasks, shoots=shoots, content_items=content_items)

@app.route('/brands/<int:brand_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_brand(brand_id):
    brand = Brand.query.get_or_404(brand_id)
    
    if request.method == 'POST':
        brand.name = request.form['name']
        brand.description = request.form['description']
        brand.color = request.form['color']
        db.session.commit()
        flash('Brand updated successfully!', 'success')
        return redirect(url_for('brand_detail', brand_id=brand.id))
    
    return render_template('edit_brand.html', brand=brand)

@app.route('/brands/<int:brand_id>/delete', methods=['POST'])
@login_required
def delete_brand(brand_id):
    brand = Brand.query.get_or_404(brand_id)
    db.session.delete(brand)
    db.session.commit()
    return jsonify({'success': True})

# Task Management Routes
@app.route('/tasks')
@login_required
def tasks():
    brands = Brand.query.all()
    todo_tasks = Task.query.filter_by(status='todo').all()
    in_progress_tasks = Task.query.filter_by(status='in_progress').all()
    done_tasks = Task.query.filter_by(status='done').all()
    
    return render_template('tasks.html', brands=brands, todo_tasks=todo_tasks, 
                         in_progress_tasks=in_progress_tasks, done_tasks=done_tasks, today=date.today())

@app.route('/tasks/new', methods=['GET', 'POST'])
@login_required
def new_task():
    if request.method == 'POST':
        task = Task(
            title=request.form['title'],
            description=request.form['description'],
            brand_id=request.form['brand_id'],
            priority=request.form['priority'],
            status=request.form.get('status', 'todo'),
            due_date=datetime.strptime(request.form['due_date'], '%Y-%m-%d').date() if request.form['due_date'] else None
        )
        db.session.add(task)
        db.session.commit()
        flash('Task created successfully!', 'success')
        return redirect(url_for('tasks'))
    
    brands = Brand.query.all()
    return render_template('new_task.html', brands=brands)

@app.route('/tasks/<int:task_id>/edit')
@login_required
def get_task(task_id):
    task = Task.query.get_or_404(task_id)
    return jsonify({
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'brand_id': task.brand_id,
        'priority': task.priority,
        'status': task.status,
        'due_date': task.due_date.isoformat() if task.due_date else None
    })

@app.route('/tasks/<int:task_id>/update', methods=['POST'])
@login_required
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    
    task.title = request.form['title']
    task.description = request.form['description']
    task.brand_id = request.form['brand_id']
    task.priority = request.form['priority']
    task.status = request.form['status']
    task.due_date = datetime.strptime(request.form['due_date'], '%Y-%m-%d').date() if request.form['due_date'] else None
    
    db.session.commit()
    flash('Task updated successfully!', 'success')
    return redirect(url_for('tasks'))

@app.route('/tasks/<int:task_id>/update_status', methods=['POST'])
@login_required
def update_task_status():
    data = request.get_json()
    task = Task.query.get_or_404(data['task_id'])
    task.status = data['status']
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/tasks/<int:task_id>/delete', methods=['POST'])
@login_required
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True})

# Shoot Management Routes
@app.route('/shoots')
@login_required
def shoots():
    brands = Brand.query.all()
    shoots = Shoot.query.order_by(Shoot.shoot_date.asc()).all()
    
    # Convert shoots to JSON for JavaScript
    shoots_json = []
    for shoot in shoots:
        shoots_json.append({
            'id': shoot.id,
            'title': shoot.title,
            'description': shoot.description,
            'shoot_date': shoot.shoot_date.isoformat(),
            'location': shoot.location,
            'brand_id': shoot.brand_id,
            'attachments': json.loads(shoot.attachments) if shoot.attachments else []
        })
    
    brands_json = []
    for brand in brands:
        brands_json.append({
            'id': brand.id,
            'name': brand.name,
            'color': brand.color
        })
    
    return render_template('shoots.html', brands=brands, shoots=shoots, 
                         shoots_json=json.dumps(shoots_json), brands_json=json.dumps(brands_json))

@app.route('/shoots/new', methods=['GET', 'POST'])
@login_required
def new_shoot():
    if request.method == 'POST':
        # Process attachments
        attachments = []
        for attachment in request.form.getlist('attachments[]'):
            if attachment.strip():
                attachments.append(attachment.strip())
        
        shoot = Shoot(
            title=request.form['title'],
            description=request.form['description'],
            brand_id=request.form['brand_id'],
            shoot_date=datetime.strptime(request.form['shoot_date'], '%Y-%m-%d').date(),
            location=request.form['location'] if request.form['location'] else None,
            attachments=json.dumps(attachments) if attachments else None
        )
        db.session.add(shoot)
        db.session.commit()
        flash('Shoot scheduled successfully!', 'success')
        return redirect(url_for('shoots'))
    
    brands = Brand.query.all()
    return render_template('new_shoot.html', brands=brands)

@app.route('/shoots/<int:shoot_id>/edit')
@login_required
def get_shoot(shoot_id):
    shoot = Shoot.query.get_or_404(shoot_id)
    return jsonify({
        'id': shoot.id,
        'title': shoot.title,
        'description': shoot.description,
        'brand_id': shoot.brand_id,
        'shoot_date': shoot.shoot_date.isoformat(),
        'location': shoot.location,
        'attachments': json.loads(shoot.attachments) if shoot.attachments else []
    })

@app.route('/shoots/<int:shoot_id>/view')
@login_required
def view_shoot(shoot_id):
    shoot = Shoot.query.get_or_404(shoot_id)
    return jsonify({
        'id': shoot.id,
        'title': shoot.title,
        'description': shoot.description,
        'brand_id': shoot.brand_id,
        'shoot_date': shoot.shoot_date.isoformat(),
        'location': shoot.location,
        'attachments': json.loads(shoot.attachments) if shoot.attachments else []
    })

@app.route('/shoots/<int:shoot_id>/update', methods=['POST'])
@login_required
def update_shoot(shoot_id):
    shoot = Shoot.query.get_or_404(shoot_id)
    
    # Process attachments
    attachments = []
    for attachment in request.form.getlist('attachments[]'):
        if attachment.strip():
            attachments.append(attachment.strip())
    
    shoot.title = request.form['title']
    shoot.description = request.form['description']
    shoot.brand_id = request.form['brand_id']
    shoot.shoot_date = datetime.strptime(request.form['shoot_date'], '%Y-%m-%d').date()
    shoot.location = request.form['location'] if request.form['location'] else None
    shoot.attachments = json.dumps(attachments) if attachments else None
    
    db.session.commit()
    flash('Shoot updated successfully!', 'success')
    return redirect(url_for('shoots'))

@app.route('/shoots/<int:shoot_id>/delete', methods=['POST'])
@login_required
def delete_shoot(shoot_id):
    shoot = Shoot.query.get_or_404(shoot_id)
    db.session.delete(shoot)
    db.session.commit()
    return jsonify({'success': True})

# Content Management Routes
@app.route('/content_calendar')
@login_required
def content_calendar():
    brands = Brand.query.all()
    content_items = ContentItem.query.order_by(ContentItem.created_at.desc()).all()
    
    # Convert content items to JSON for JavaScript
    content_json = []
    for item in content_items:
        content_json.append({
            'id': item.id,
            'title': item.title,
            'description': item.description,
            'content_type': item.content_type,
            'file_url': item.file_url,
            'folder_path': item.folder_path,
            'brand_id': item.brand_id,
            'created_at': item.created_at.isoformat()
        })
    
    brands_json = []
    for brand in brands:
        brands_json.append({
            'id': brand.id,
            'name': brand.name,
            'color': brand.color
        })
    
    return render_template('content_calendar.html', brands=brands, content_items=content_items,
                         content_json=json.dumps(content_json), brands_json=json.dumps(brands_json))

@app.route('/content/new', methods=['GET', 'POST'])
@login_required
def new_content_item():
    if request.method == 'POST':
        content_item = ContentItem(
            title=request.form['title'],
            description=request.form['description'],
            brand_id=request.form['brand_id'],
            content_type=request.form['content_type'],
            file_url=request.form['file_url'],  # External storage URL only
            folder_path=request.form['folder_path'] if request.form['folder_path'] else None
        )
        db.session.add(content_item)
        db.session.commit()
        flash('Content item added successfully!', 'success')
        return redirect(url_for('content_calendar'))
    
    brands = Brand.query.all()
    return render_template('new_content_item.html', brands=brands)

@app.route('/content/<int:content_id>/edit')
@login_required
def get_content_item(content_id):
    content_item = ContentItem.query.get_or_404(content_id)
    return jsonify({
        'id': content_item.id,
        'title': content_item.title,
        'description': content_item.description,
        'brand_id': content_item.brand_id,
        'content_type': content_item.content_type,
        'file_url': content_item.file_url,
        'folder_path': content_item.folder_path
    })

@app.route('/content/<int:content_id>/update', methods=['POST'])
@login_required
def update_content_item(content_id):
    content_item = ContentItem.query.get_or_404(content_id)
    
    content_item.title = request.form['title']
    content_item.description = request.form['description']
    content_item.brand_id = request.form['brand_id']
    content_item.content_type = request.form['content_type']
    content_item.file_url = request.form['file_url']  # External storage URL only
    content_item.folder_path = request.form['folder_path'] if request.form['folder_path'] else None
    
    db.session.commit()
    flash('Content item updated successfully!', 'success')
    return redirect(url_for('content_calendar'))

@app.route('/content/<int:content_id>/delete', methods=['POST'])
@login_required
def delete_content_item(content_id):
    content_item = ContentItem.query.get_or_404(content_id)
    db.session.delete(content_item)
    db.session.commit()
    return jsonify({'success': True})

@app.after_request
def after_request(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# Initialize database
def init_db():
    with app.app_context():
        db.create_all()

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
