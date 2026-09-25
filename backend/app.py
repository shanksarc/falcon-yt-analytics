import os
import uvicorn
from main import app

# Hugging Face Spaces (Gradio SDK) entrypoint
# Runs the Falcon FastAPI backend server on port 7860
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"Starting Falcon YT Backend on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
