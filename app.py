from db import get_db_connection
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__, static_folder='.')
CORS(app)

# In-memory storage for reported issues
issues = []

# Stats tracker
stats = {
    "total_reported": 0,
    "resolved": 0,
    "pending": 0,
    "bins_monitored": 142
}

@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/report', methods=['POST'])
def report_issue():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    name = data.get('name', '').strip()
    location = data.get('location', '').strip()
    issue_type = data.get('issue_type', '').strip()
    description = data.get('description', '').strip()

    if not name or not location or not issue_type:
        return jsonify({"error": "Name, location, and issue type are required"}), 400


    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO reports
    (name, location, issue_type, description)
    VALUES (%s, %s, %s, %s)
    """, (name, location, issue_type, description))

    conn.commit()

    issue_id = cursor.lastrowid

    cursor.close()
    conn.close()


    return jsonify({
        "message": "Issue reported successfully",
        "issue_id": issue_id,
        "status": "Pending"
    }), 201

@app.route('/stats', methods=['GET'])
def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total FROM reports")
    total = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) AS pending FROM reports WHERE status='Pending'")
    pending = cursor.fetchone()["pending"]

    cursor.execute("SELECT COUNT(*) AS resolved FROM reports WHERE status='Resolved'")
    resolved = cursor.fetchone()["resolved"]

    cursor.close()
    conn.close()

    return jsonify({
        "total_reported": total,
        "pending": pending,
        "resolved": resolved,
        "bins_monitored": 142
    })

@app.route('/issues', methods=['GET'])
def get_issues():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM reports ORDER BY created_at DESC")

    reports = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(reports)

if __name__ == '__main__':
    print("🌱 Smart Waste Management System running at http://localhost:5000")
    app.run(debug=True, port=5000)



@app.route('/testdb')
def test_db():
    try:
        conn = get_db_connection()
        conn.close()
        return "Database Connected Successfully!"
    except Exception as e:
        return f"Connection Failed: {e}"