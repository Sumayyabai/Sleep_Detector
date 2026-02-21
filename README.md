team name : hackers
team members: niveditha s, sumayya bai 
collage of engineering karunagappaly
# Sleep Detector

Lightweight Flask web app that uses Groq Vision (Llama 4 Scout) to analyze images and detect whether a person appears to be sleeping.

Project layout
- `hackersss/` — application package
  - `app.py` — Flask server (GET `/` serves UI, POST `/detect` accepts base64 image JSON)
  - `groq_vision.py` — Groq Vision integration and `detect_sleep()` helper
  - `requirements.txt` — Python dependencies
  - `static/`, `templates/` — web UI assets and `index.html`

Quick facts
- Language: Python
- Framework: Flask
- Vision API: Groq (model: `meta-llama/llama-4-scout-17b-16e-instruct`)

Prerequisites
- Python 3.10+ installed
- A Groq API key (set as environment variable `GROQ_API_KEY` or in a local `.env` file)

Local setup
1. Create and activate a virtual environment inside `hackersss/`:

```powershell
cd hackersss
python -m venv .venv
. .\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

3. Create an environment file (recommended) or set the variable in your shell:

```text
# hackersss/.env (DO NOT commit this file)
GROQ_API_KEY=your_groq_api_key_here
```

The repository includes `.gitignore` entries for `.env` and `hackersss/.env`.

Run
1. From `hackersss/` with the venv active:

```powershell
python app.py
```

2. Open http://localhost:5000 in your browser. The web UI lets you use your webcam or upload images.

API
- GET `/` — serves the UI
- POST `/detect` — JSON body: `{ "image": "<base64-image>" }` (can include data URI prefix)
  - Response JSON: `{ "status": "sleeping"|"awake"|"error", "confidence": "high"|"medium"|"low"|"none", "details": "..." }

Implementation notes
- `groq_vision.detect_sleep()` wraps the Groq client and instructs the model to return only a JSON object with `status`, `confidence`, and `details`.
- The code normalizes and validates model output and provides fallback behavior if the model response doesn't parse as JSON.

Security & secrets
- The project previously contained a Groq API key in `hackersss/.env`; DO NOT commit API keys.
- If your key was accidentally committed or exposed, revoke/regenerate it immediately from your Groq account dashboard.
- This repository includes `/.gitignore` entries to avoid committing `.env` files.

Notes & next steps
- If you plan to deploy, use server-side environment variables (not checked-in files), and consider adding rate-limiting, authentication, and usage logging.
- If the repository history contained secrets, follow the GitHub guidance to remove them from the history and rotate keys.
![0c42e1d0-5cce-48bd-a7fe-8d35013758dc](https://github.com/user-attachments/assets/81899524-a5b9-458e-bf8f-e35d70d0ff28)
![712f7482-95fb-480d-b8e6-52465c229c39](https://github.com/user-attachments/assets/95e0ae91-bc5f-4645-9d6b-4dd6db0379e9)

video link:
https://drive.google.com/file/d/1N-FBXaB4Z1uLVGRpOOlRfePkyb5RRaSL/view?usp=drive_link

License
- (Add license information here if desired)
# Sleep_Detector 

