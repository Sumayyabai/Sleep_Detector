"""
app.py — Flask server for Sleep Detection Website.

Routes:
  GET  /       → Main page (webcam + upload UI)
  POST /detect → Accepts base64 image, returns sleep detection result
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from groq_vision import detect_sleep

load_dotenv()

app = Flask(__name__)
CORS(app)


@app.route("/")
def index():
    """Serve the main page."""
    return render_template("index.html")


@app.route("/detect", methods=["POST"])
def detect():
    """
    Detect sleep from an image.

    Expects JSON body: { "image": "<base64-encoded image>" }
    Returns JSON:      { "status": "sleeping"|"awake"|"error", "confidence": "...", "details": "..." }
    """
    data = request.get_json()

    if not data or "image" not in data:
        return jsonify({
            "status": "error",
            "confidence": "none",
            "details": "No image data provided. Send JSON with 'image' key containing base64 data."
        }), 400

    base64_image = data["image"]

    # Strip data URI prefix if present for size check, but pass full to detector
    raw_b64 = base64_image.split(",")[-1] if "," in base64_image else base64_image

    # Basic validation: check if image data is not empty
    if len(raw_b64) < 100:
        return jsonify({
            "status": "error",
            "confidence": "none",
            "details": "Image data appears too small or invalid."
        }), 400

    result = detect_sleep(base64_image)
    return jsonify(result)


if __name__ == "__main__":
    print("\n🌙 Sleep Detection Server Starting...")
    print("📍 Open http://localhost:5000 in your browser")
    print("🔑 Using Groq API with Llama 4 Scout Vision\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
