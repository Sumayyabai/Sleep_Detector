"""
groq_vision.py — Groq Vision API module for sleep detection.

Uses Llama 4 Scout vision model to analyze images and determine
if a person is sleeping or awake.
"""

import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Vision model
MODEL_ID = "meta-llama/llama-4-scout-17b-16e-instruct"

SYSTEM_PROMPT = """You are a sleep detection AI assistant. Your job is to analyze images and determine if the person in the image is sleeping or awake.

Analyze the image carefully and look for these indicators of sleep:
- Eyes closed
- Head tilted or dropped
- Relaxed facial muscles
- Lying down or slumped posture
- Appears unconscious or drowsy

You MUST respond with ONLY a valid JSON object in this exact format (no markdown, no extra text):
{"status": "sleeping" or "awake", "confidence": "high" or "medium" or "low", "details": "brief explanation of what you observed"}

Examples:
{"status": "sleeping", "confidence": "high", "details": "Person has eyes closed and head tilted to the side, appearing to be asleep"}
{"status": "awake", "confidence": "high", "details": "Person has eyes open and is looking at the camera, clearly awake"}
"""


def detect_sleep(base64_image: str) -> dict:
    """
    Analyze an image to detect if a person is sleeping.

    Args:
        base64_image: Base64-encoded image string (without data URI prefix)

    Returns:
        dict with keys: status, confidence, details
    """
    try:
        # Ensure proper data URI format
        if not base64_image.startswith("data:"):
            image_url = f"data:image/jpeg;base64,{base64_image}"
        else:
            image_url = base64_image

        response = client.chat.completions.create(
            model=MODEL_ID,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": SYSTEM_PROMPT + "\n\nAnalyze this image and determine if the person is sleeping or awake. Respond with ONLY the JSON object."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url
                            }
                        }
                    ]
                }
            ],
            temperature=0.1,
            max_completion_tokens=256,
        )

        result_text = response.choices[0].message.content.strip()

        # Try to parse JSON from response
        # Handle cases where model wraps in markdown code block
        if result_text.startswith("```"):
            lines = result_text.split("\n")
            json_lines = [l for l in lines if not l.startswith("```")]
            result_text = "\n".join(json_lines).strip()

        result = json.loads(result_text)

        # Validate required keys
        if "status" not in result:
            result["status"] = "awake"
        if "confidence" not in result:
            result["confidence"] = "low"
        if "details" not in result:
            result["details"] = "Analysis completed"

        # Normalize status
        result["status"] = result["status"].lower().strip()
        if result["status"] not in ("sleeping", "awake"):
            result["status"] = "awake"

        return result

    except json.JSONDecodeError:
        # If model doesn't return valid JSON, try to extract intent
        if "sleep" in result_text.lower():
            return {
                "status": "sleeping",
                "confidence": "medium",
                "details": "Person appears to be sleeping based on image analysis"
            }
        return {
            "status": "awake",
            "confidence": "low",
            "details": "Could not parse model response clearly"
        }

    except Exception as e:
        return {
            "status": "error",
            "confidence": "none",
            "details": f"Error during analysis: {str(e)}"
        }
