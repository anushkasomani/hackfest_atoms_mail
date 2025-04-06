#pip install -r requirments.txt


import os
import sys
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import getpass
from groq import Groq
import torch # Needed for GPU check
import easyocr # <-- Import easyocr here for global init
import time # <-- Import time for request timing

# --- Import your custom class ---
try:
    from summary_model_new import Summarizer
except ImportError:
    sys.path.append(os.path.dirname(__file__))
    try:
        from summary_model_new import Summarizer
    except ImportError as e:
         print(f"Error: Could not import Summarizer from summary_model_packed.py: {e}")
         print("Ensure the file exists and has no syntax errors.")
         sys.exit(1)

# --- Global Configuration & Client Initialization ---
load_dotenv()

# Get Groq API Key
groq_api_key = os.environ.get("GROQ_API_KEY")
if not groq_api_key:
    print("Warning: GROQ_API_KEY not found in environment variables or .env file.")
    if os.getenv('FLASK_ENV') == 'development' or not os.getenv('FLASK_ENV'):
         try:
            groq_api_key = getpass.getpass("Enter your Groq API key: ")
            os.environ["GROQ_API_KEY"] = groq_api_key
         except Exception as e:
             print(f"Could not get API key via prompt: {e}")
             groq_api_key = None
    if not groq_api_key:
         print("Error: Groq API Key is required. Set GROQ_API_KEY environment variable.")
         sys.exit(1)

# Initialize Groq client globally
try:
    groq_client = Groq(api_key=groq_api_key)
    print("Groq client initialized successfully.")
except Exception as e:
    print(f"Error initializing Groq client: {e}")
    sys.exit(1)

# --- <<< NEW: Pre-initialize EasyOCR Reader Globally >>> ---
easyocr_reader = None # Initialize as None
try:
    # Determine if a CUDA GPU is available
    use_gpu = torch.cuda.is_available()
    print(f"Attempting global EasyOCR initialization...")
    if use_gpu:
        print("CUDA GPU detected. Attempting to initialize EasyOCR on GPU.")
    else:
        # Optional: Check for MPS (Apple Silicon GPU)
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
             print("MPS device (Apple Silicon GPU) detected, but EasyOCR will use CPU for better compatibility/performance unless CUDA is present.")
             use_gpu = False # Stick to CPU for EasyOCR if only MPS is available
        else:
             print("No CUDA GPU detected. Initializing EasyOCR on CPU.")

    # Initialize the reader (this is the time-consuming part)
    # Using ['en'] for English. Add other languages if needed: ['en', 'ch_sim', 'fr'] etc.
    start_ocr_init = time.time()
    easyocr_reader = easyocr.Reader(['en'], gpu=use_gpu)
    end_ocr_init = time.time()
    print(f"Global EasyOCR reader initialized successfully on {'GPU' if use_gpu else 'CPU'} in {end_ocr_init - start_ocr_init:.2f} seconds.")

except ImportError:
     print("Error: easyocr or torch library not found. Cannot initialize EasyOCR reader.")
     easyocr_reader = None # Ensure it remains None
except Exception as e:
    print(f"Error: Could not pre-initialize EasyOCR reader globally: {e}")
    import traceback
    print(traceback.format_exc()) # Print full traceback for debugging startup errors
    easyocr_reader = None # Ensure it's None if initialization fails

# --- Flask App Initialization ---
app = Flask(__name__)

# --- API Endpoint Definition ---
@app.route('/summarize', methods=['POST'])
def handle_summarize():
    print("\nReceived request for /summarize")
    start_request_time = time.time()

    # --- <<< CHECK: Ensure Global Reader is Ready >>> ---
    if easyocr_reader is None:
        print("Error: EasyOCR reader was not initialized successfully during startup. Cannot process request.")
        # Return 503 Service Unavailable, as OCR capability is missing
        return jsonify({"error": "OCR service initialization failed. Service unavailable."}), 503

    # 1. Get Input Data
    if not request.is_json:
        print("Error: Request Content-Type must be application/json")
        return jsonify({"error": "Request Content-Type must be application/json"}), 415
    data = request.get_json()
    if not data:
        print("Error: No JSON data received in request body")
        return jsonify({"error": "No JSON data received in request body"}), 400
    if 'messages' not in data:
        print("Error: Invalid input format. 'messages' key is missing.")
        return jsonify({"error": "Invalid input format. 'messages' key is missing."}), 400

    print(f"Received conversationId: {data.get('conversationId', 'N/A')}")

    try:
        # 2. Initialize Summarizer (Pass request data, global Groq client, and global OCR reader)
        summarizer = Summarizer(
            conversation_data=data,
            client=groq_client,
            ocr_reader_instance=easyocr_reader # <-- Pass the global reader here
        )

        # 3. Run the Summarization Process
        summary, final_content, conversation_id = summarizer.run()

        # 4. Prepare Response
        response_data = {
            "conversationId": conversation_id,
            "summary": summary
        }
        end_request_time = time.time()
        print(f"Successfully processed request for {conversation_id}. Total time: {end_request_time - start_request_time:.2f} seconds")
        return jsonify(response_data), 200

    except Exception as e:
        import traceback
        print(f"Error processing request: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"An internal server error occurred: {e}"}), 500

# --- App Runner ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)