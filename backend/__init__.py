from flask import Flask, session, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import re
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/brand_manager.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

db = SQLAlchemy(app)

# ensure DB exists on cold start
with app.app_context():
    db.create_all()

# ---------------- Models ----------------
class LoginAttempt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    success = db.Column(db.Boolean, default=False)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    master_password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Brand(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7), default='#3B82F6')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    tasks = db.relationship('Task', backref='brand', lazy=True, cascade='all, delete-orphan')
    shoots = db.relationship('Shoot', backref='brand', lazy=True, cascade='all, delete-orphan')
    content_items = db.relationship('ContentItem', backref='brand', lazy=True, cascade='all, delete-orphan')

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='todo')
    priority = db.Column(db.String(10), default='medium')
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
    attachments = db.Column(db.Text)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ContentItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    file_url = db.Column(db.String(500), nullable=False)
    content_type = db.Column(db.String(50))
    folder_path = db.Column(db.String(200))
    brand_id = db.Column(db.Integer, db.ForeignKey('brand.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ---------------- Utils ----------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'authenticated' not in session:
            return redirect(url_for('login'))
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if isinstance(last_activity, str):
                last_activity = datetime.fromisoformat(last_activity)
            if datetime.utcnow() - last_activity > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                flash('Session expired. Please login again.', 'error')
                return redirect(url_for('login'))
        session['last_activity'] = datetime.utcnow().isoformat()
        return f(*args, **kwargs)
    return decorated_function

def check_rate_limit(ip_address, max_attempts=5, window_minutes=15):
    cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
    return LoginAttempt.query.filter(
        LoginAttempt.ip_address == ip_address,
        LoginAttempt.timestamp > cutoff,
        LoginAttempt.success == False
    ).count() < max_attempts

def validate_password_strength(password):
    if len(password) < 8: return False, "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password): return False, "Password must contain uppercase"
    if not re.search(r"[a-z]", password): return False, "Password must contain lowercase"
    if not re.search(r"\d", password): return False, "Password must contain number"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password): return False, "Password must contain special char"
    return True, "Strong password"

def init_db():
    with app.app_context():
        db.create_all()
