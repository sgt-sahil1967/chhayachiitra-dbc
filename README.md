# 🎨 Brand Manager

A comprehensive Flask-based brand management application for creative professionals.

## Features

- **Dashboard**: Overview of all immediate tasks and upcoming shoots
- **Brand Management**: Create and organize brand-specific folders
- **Kanban Task Board**: Drag-and-drop task management (To Do, In Progress, Done)
- **Shoot Planner**: Calendar interface for planning photo shoots
- **Content Calendar**: Month-view calendar for scheduled content
- **External Storage Links**: Manual entry of NAS-hosted file URLs
- **Secure Authentication**: Master password protection with session management

## Quick Start

### 1. Install Dependencies
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 2. Run the Application
\`\`\`bash
python run.py
\`\`\`

### 3. First Time Setup
- Navigate to `http://localhost:5000/setup`
- Create your master password
- Start managing your brands!

## Alternative Start Methods

### Direct Flask Run
\`\`\`bash
python app.py
\`\`\`

### Production Deployment
For production, use a WSGI server like Gunicorn:
\`\`\`bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
\`\`\`

## Application Structure

\`\`\`
brand-manager/
├── app.py                 # Main Flask application
├── run.py                 # Startup script
├── requirements.txt       # Python dependencies
├── templates/            # HTML templates
│   ├── base.html
│   ├── dashboard.html
│   ├── brands.html
│   ├── tasks.html
│   ├── shoots.html
│   └── content_calendar.html
└── static/              # CSS and JavaScript
    ├── css/style.css
    └── js/
        ├── main.js
        ├── kanban.js
        ├── shoots.js
        └── content.js
\`\`\`

## Database

- Uses SQLite for local storage (no cloud dependencies)
- Database file: `brand_manager.db` (created automatically)
- All data stored locally on your machine

## Security Features

- Master password authentication
- Session timeout (8 hours)
- Rate limiting (5 failed attempts per 15 minutes)
- Strong password requirements
- Security headers for XSS protection

## Usage Tips

1. **First Run**: Complete the setup at `/setup` to create your master password
2. **Create Brands**: Start by creating brands to organize your work
3. **Add Tasks**: Use the Kanban board for task management
4. **Schedule Shoots**: Plan photo shoots with the calendar interface
5. **Organize Content**: Use folder paths to organize content items
6. **External Links**: Add URLs to your NAS or external storage for file access

## Troubleshooting

- **Port 5000 in use**: Change the port in `run.py` or `app.py`
- **Database issues**: Delete `brand_manager.db` to reset (loses all data)
- **Permission errors**: Ensure write permissions in the application directory

## Support

This is a local application - all data stays on your machine. No internet connection required after initial setup.
