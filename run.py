#!/usr/bin/env python3
"""
Brand Manager Application Startup Script
"""

import os
import sys
from app import app, init_db

def main():
    print("🎨 Brand Manager - Starting Application...")
    print("=" * 50)
    
    # Initialize database
    print("📊 Initializing database...")
    init_db()
    print("✅ Database initialized successfully!")
    
    # Check if this is first run
    from app import User
    with app.app_context():
        if not User.query.first():
            print("\n🔧 First time setup required!")
            print("👉 Navigate to: http://localhost:5000/setup")
            print("   Create your master password to get started.")
        else:
            print("\n🔐 Login required!")
            print("👉 Navigate to: http://localhost:5000/login")
    
    print("\n🚀 Starting Flask development server...")
    print("📱 Application will be available at: http://localhost:5000")
    print("🛑 Press Ctrl+C to stop the server")
    print("=" * 50)
    
    # Start the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)

if __name__ == '__main__':
    main()
