from app import app  # import your Flask app
import vercel_wsgi

# Vercel looks for 'handler'
handler = vercel_wsgi.handle(app)
