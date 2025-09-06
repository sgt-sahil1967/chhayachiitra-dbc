# backend/__init__.py
from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "Hello from Flask on Vercel!"
