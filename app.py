from db import get_db_connection
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import send_from_directory
import os


app = Flask(__name__, static_folder='.')
CORS(app)

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

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

    data = request.form
    print("Received:", data)

    if not data:
        return jsonify({"error": "No data"}), 400

    name = data.get('name', '').strip()
    location = data.get('location', '').strip()
    issue_type = data.get('issue_type', '').strip()
    description = data.get('description', '').strip()
    latitude=data.get("latitude")
    longitude=data.get("longitude")
    image = request.files.get("image")
    image_filename = None

    if image and image.filename != "":
        image_filename = secure_filename(image.filename)

        image.save(
            os.path.join(
                app.config['UPLOAD_FOLDER'],
                image_filename
            )
        )

    print(name, location, issue_type, description)

    conn = get_db_connection()
    cursor = conn.cursor()

    print("Connected to DB")

    cursor.execute("""
    INSERT INTO reports
    (
    name,
    location,
    issue_type,
    description,
    image,
    latitude,
    longitude
    )
    VALUES(%s,%s,%s,%s,%s,%s,%s)
    """,
    (name, location, issue_type, description, image_filename,latitude,longitude))

    conn.commit()

    print("Inserted Successfully!")

    issue_id = cursor.lastrowid

    cursor.close()
    conn.close()

    return jsonify({
        "message":"Success",
        "issue_id":issue_id
    }),201

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

@app.route('/chart-data')
def chart_data():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    # Status counts
    cursor.execute("""
        SELECT status, COUNT(*) AS total
        FROM reports
        GROUP BY status
    """)

    status_data = cursor.fetchall()

    # Issue counts
    cursor.execute("""
        SELECT issue_type, COUNT(*) AS total
        FROM reports
        GROUP BY issue_type
    """)

    issue_data = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({
        "status": status_data,
        "issues": issue_data
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


@app.route('/report/<int:report_id>', methods=['PUT'])
def update_report(report_id):

    data = request.get_json()

    status = data.get("status")

    if not status:
        return jsonify({"error": "Status is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE reports SET status=%s WHERE id=%s",
        (status, report_id)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Report updated successfully"
    })


@app.route('/report/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM reports WHERE id=%s",
        (report_id,)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "message": "Report deleted successfully"
    })


if __name__ == '__main__':
    print("🌱 Smart Waste Management System running at http://localhost:5000")
    app.run(debug=True, port=5000)
