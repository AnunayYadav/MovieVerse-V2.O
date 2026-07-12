import os
import shutil
import uuid
import sys
import urllib.request
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn

# Import the main execution from main.py
from main import main

app = FastAPI(title="Manga Translator Backend")

# Enable CORS to allow the React client to call it directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = os.path.abspath("./temp_api")
os.makedirs(TEMP_DIR, exist_ok=True)

def cleanup_dir(dir_path: str):
    try:
        shutil.rmtree(dir_path)
    except Exception as e:
        print(f"Error cleaning up directory {dir_path}: {e}")

@app.post("/translate-page")
async def translate_page(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(None),
    image_url: str = Form(None),
    target_lang: str = Form("English"),
    source_lang: str = Form("Japanese")
):
    session_id = str(uuid.uuid4())
    session_dir = os.path.join(TEMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    input_ext = ".png"
    input_path = os.path.join(session_dir, f"input{input_ext}")

    try:
        if file:
            # Save uploaded file
            input_ext = os.path.splitext(file.filename)[1] or ".png"
            input_path = os.path.join(session_dir, f"input{input_ext}")
            with open(input_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        elif image_url:
            # Download image from URL (bypasses client-side CORS issues)
            req = urllib.request.Request(
                image_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://mangadex.org/'
                }
            )
            with urllib.request.urlopen(req, timeout=30) as response, open(input_path, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)
        else:
            background_tasks.add_task(cleanup_dir, session_dir)
            return {"error": "No file or image_url provided"}
    except Exception as e:
        background_tasks.add_task(cleanup_dir, session_dir)
        return {"error": f"Failed to acquire input image: {str(e)}"}

    # Output path
    output_path = os.path.join(session_dir, f"output{input_ext}")

    # Set up sys.argv to simulate CLI args
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    
    # We construct the list of arguments to pass to main.py
    sys.argv = [
        "main.py",
        "--input", input_path,
        "--output", output_path,
        "--input-language", source_lang,
        "--output-language", target_lang,
    ]

    # Dynamically select provider based on available keys in environment, defaulting to Google
    if os.environ.get("OPENAI_API_KEY"):
        sys.argv.extend(["--provider", "OpenAI", "--openai-api-key", os.environ.get("OPENAI_API_KEY")])
    elif os.environ.get("ANTHROPIC_API_KEY"):
        sys.argv.extend(["--provider", "Anthropic", "--anthropic-api-key", os.environ.get("ANTHROPIC_API_KEY")])
    elif os.environ.get("DEEPSEEK_API_KEY"):
        sys.argv.extend(["--provider", "DeepSeek", "--deepseek-api-key", os.environ.get("DEEPSEEK_API_KEY")])
    else:
        sys.argv.extend(["--provider", "Google"])
        if gemini_key:
            sys.argv.extend(["--google-api-key", gemini_key])

    # Run the main execution of MangaTranslator
    try:
        main()
    except SystemExit as e:
        if e.code != 0:
            background_tasks.add_task(cleanup_dir, session_dir)
            return {"error": f"Translation failed with exit code {e.code}"}
    except Exception as e:
        background_tasks.add_task(cleanup_dir, session_dir)
        return {"error": f"Translation failed: {str(e)}"}

    if not os.path.exists(output_path):
        background_tasks.add_task(cleanup_dir, session_dir)
        return {"error": "Translation failed. Output file was not found."}

    # Queue cleanup task after file is sent to browser
    background_tasks.add_task(cleanup_dir, session_dir)
    return FileResponse(output_path, media_type="image/png")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
