# summary_model_packed.py
#pip install -r requirments.txt
import os
import requests
import easyocr # <--- Keep import here as OCRReader might still be used standalone elsewhere
from pdf2image import convert_from_path
import time
import tempfile
import torch # Keep import here

# === Modified OCRReader Class ===
class OCRReader:
    # Add 'reader_instance=None' to __init__
    # Remove 'use_gpu' parameter as the decision is made when the instance is created
    def __init__(self, file_paths_to_process, reader_instance=None):
       self.file_paths = file_paths_to_process
       # Store the passed-in reader instance directly
       self.reader = reader_instance
       self.all_images_to_process = []
       self.extracted_texts = []
       self.temp_pdf_image_paths = []
       self.has_files_to_process = bool(file_paths_to_process)
       # If no reader was passed, we might need to initialize later (though less ideal)
       self.needs_late_init = reader_instance is None

    def initiate_reader(self):
        # --- <<< MODIFIED >>> ---
        # 1. If a reader instance was already provided during __init__, DO NOTHING.
        if self.reader is not None:
            # print("Using pre-initialized EasyOCR reader.") # Optional debug message
            return

        # 2. If no reader was provided AND we haven't tried late init yet
        if self.needs_late_init and self.has_files_to_process:
            print("Warning: No pre-initialized EasyOCR reader provided. Attempting late initialization...")
            # Fallback: Initialize here (less efficient, happens per request)
            # This logic runs only if the global init failed or wasn't used.
            try:
                gpu_available = torch.cuda.is_available()
                print(f"Late OCR init: GPU available = {gpu_available}")
                self.reader = easyocr.Reader(["en"], gpu=gpu_available)
                print(f"EasyOCR Reader late-initialized on {'GPU' if gpu_available else 'CPU'}.")
                self.needs_late_init = False # Mark that we've tried
            except Exception as e:
                print(f"Error during late initialization of EasyOCR Reader: {e}")
                self.reader = None
                self.has_files_to_process = False
        elif not self.has_files_to_process:
             print("OCRReader: No files to process, skipping reader initialization.")
        # else: # Reader is None, but we already tried late init or have no files
        #     print("OCRReader: Reader not available.")


    # --- REST OF OCRREADER METHODS ARE UNCHANGED ---
    # _convert_pdf_to_images, prepare_images, extract_texts,
    # _cleanup_temp_pdf_images, get_ocr_output
    # ... (include all methods as before) ...
    def _convert_pdf_to_images(self, pdf_path):
        temp_image_paths = []
        try:
            print(f"Converting PDF: {os.path.basename(pdf_path)}")
            images = convert_from_path(pdf_path, dpi=300) # Consider making DPI configurable
            for i, img in enumerate(images):
                temp_img_file = tempfile.NamedTemporaryFile(suffix=f"_page_{i+1}.png", delete=False)
                img.save(temp_img_file.name, 'PNG')
                temp_image_paths.append(temp_img_file.name)
                self.temp_pdf_image_paths.append(temp_img_file.name)
            print(f"Converted {os.path.basename(pdf_path)} to {len(images)} images.")
        except Exception as e:
            print(f"Error converting PDF '{os.path.basename(pdf_path)}': {e}")
        return temp_image_paths

    def prepare_images(self):
        if not self.has_files_to_process: return
        print("Preparing images for OCR...")
        self.all_images_to_process = [] # Reset
        image_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff')
        for file_path in self.file_paths:
            if not os.path.exists(file_path):
                print(f"Warning: File not found during preparation: {file_path}")
                continue
            if file_path.lower().endswith('.pdf'):
                pdf_image_paths = self._convert_pdf_to_images(file_path)
                self.all_images_to_process.extend(pdf_image_paths)
            elif file_path.lower().endswith(image_extensions):
                self.all_images_to_process.append(file_path)
            else:
                print(f"Warning: Unsupported file type skipped: {os.path.basename(file_path)}")
        print(f"Total images prepared for OCR: {len(self.all_images_to_process)}")

    def extract_texts(self):
        # Ensure reader is ready (might trigger late init if needed)
        self.initiate_reader()

        if not self.reader:
            print("OCR Reader not available, cannot extract text.")
            self.extracted_texts = ["[OCR Reader Unavailable]"]
            return
        if not self.all_images_to_process:
             print("No processable images found for OCR.")
             self.extracted_texts = []
             return

        print(f"\nStarting OCR extraction on {len(self.all_images_to_process)} image(s)...")
        self.extracted_texts = [] # Reset
        for img_source in self.all_images_to_process:
            print(f"Processing image: {os.path.basename(img_source)}")
            try:
                result = self.reader.readtext(img_source, detail=0, paragraph=True)
                extracted_text = "\n".join(result)
                source_filename = os.path.basename(img_source) # Keep it simple
                self.extracted_texts.append(f"--- Content from {source_filename} ---\n{extracted_text}\n--- End Content ---")
            except Exception as e:
                print(f"  Error processing {os.path.basename(img_source)} with OCR: {e}")
                self.extracted_texts.append(f"[Error processing image: {os.path.basename(img_source)}]")

    def _cleanup_temp_pdf_images(self):
        if not self.temp_pdf_image_paths: return
        print("Cleaning up temporary images created from PDFs...")
        cleaned_count = 0
        paths_to_clean = list(self.temp_pdf_image_paths)
        self.temp_pdf_image_paths = []
        for temp_path in paths_to_clean:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                    cleaned_count += 1
                except Exception as e:
                    print(f"Error removing temporary file {temp_path}: {e}")
        print(f"Cleaned up {cleaned_count} temporary PDF page images.")

    def get_ocr_output(self):
        if not self.has_files_to_process: return ""
        self.initiate_reader() # Ensure reader is ready (calls modified version)
        if not self.reader: return "[OCR Initialization Failed]"
        self.prepare_images()
        self.extract_texts()
        self._cleanup_temp_pdf_images()
        return "\n\n".join(self.extracted_texts)



# === Modified Summarizer Class ===
class Summarizer():
    # --- Add 'ocr_reader_instance=None' to __init__ ---
    def __init__(self, conversation_data, client, ocr_reader_instance=None):
        """
        Initializes the Summarizer.
        client: Pre-initialized Groq client.
        ocr_reader_instance: Optional pre-initialized EasyOCR reader instance.
        """
        self.conversation_data = conversation_data
        # --- System Prompt (Keep as before) ---
        self.system_prompt = """... (your detailed system prompt) ..."""
        self.client = client # Groq client passed in
        # --- Store the passed-in OCR reader ---
        self.ocr_reader_instance = ocr_reader_instance

        self.conversation_id = conversation_data.get("conversationId", "N/A")
        self.formatted_conversation_text = None
        self.extracted_ocr_content = None
        self.final_content = None
        self.downloaded_file_paths = []
        # Remove self.use_gpu_for_ocr - decision is made globally now


    # --- Modified _get_ocr_text Method ---
    def _get_ocr_text(self, temp_dir):
        ocr_text = ""
        downloaded_paths = self._download_attachments(temp_dir)
        if not downloaded_paths:
            print("No attachments were successfully downloaded for OCR.")
            # Cleanup any potentially downloaded (but maybe problematic) files before returning
            self._cleanup_downloaded_files()
            return ""

        print("Attachments downloaded, initiating OCR processing...")
        # --- <<< MODIFIED: Pass the pre-initialized reader >>> ---
        # Create OCRReader instance, passing the reader we got during __init__
        ocr_processor = OCRReader(
            downloaded_paths,
            reader_instance=self.ocr_reader_instance # Pass the global reader
        )
        try:
            ocr_text = ocr_processor.get_ocr_output()
        except Exception as e:
            print(f"An unexpected error occurred during OCR processing step: {e}")
            ocr_text = "[Error during OCR processing]"
            # Ensure OCRReader attempts cleanup even if its main method fails
            ocr_processor._cleanup_temp_pdf_images()

        # Cleanup downloaded files AFTER OCR attempt is complete
        self._cleanup_downloaded_files()
        return ocr_text


    # --- REST OF SUMMARIZER METHODS ARE UNCHANGED ---
    # _download_attachments, _cleanup_downloaded_files, _format_conversation,
    # prepare_final_content, generate_summary, run
    # ... (include all methods as before) ...
    def _download_attachments(self, temp_dir):
        print("Checking for attachments to download...")
        messages = self.conversation_data.get("messages", [])
        download_count = 0
        self.downloaded_file_paths = [] # Reset for this run

        for i, msg in enumerate(messages):
            attachments = msg.get("attachments", [])
            if not attachments: continue

            for j, attachment in enumerate(attachments):
                url = attachment.get("url")
                name = attachment.get("name", f"attachment_{i}_{j}")
                if not url:
                    print(f"Warning: Attachment in message {i} missing URL.")
                    continue
                try:
                    print(f"Attempting download: {name} from {url[:60]}...")
                    headers = {'User-Agent': 'Mozilla/5.0'}
                    response = requests.get(url, stream=True, timeout=60, headers=headers, allow_redirects=True)
                    response.raise_for_status()
                    content_type = response.headers.get('content-type', '').lower()
                    print(f"  Content-Type: {content_type}")
                    safe_name = "".join(c if c.isalnum() or c in ('_', '-', '.') else '_' for c in name)
                    safe_name = safe_name.lstrip('.')
                    while '..' in safe_name: safe_name = safe_name.replace('..', '_')
                    if not safe_name: safe_name = f"attachment_{i}_{j}_unnamed"
                    local_filename = os.path.join(temp_dir, f"msg{i}_att{j}_{safe_name}")
                    count = 1
                    base_filename, ext = os.path.splitext(local_filename)
                    while os.path.exists(local_filename):
                        local_filename = f"{base_filename}_{count}{ext}"
                        count += 1
                    with open(local_filename, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    if os.path.exists(local_filename) and os.path.getsize(local_filename) > 0:
                        self.downloaded_file_paths.append(local_filename)
                        download_count += 1
                        print(f"  Successfully downloaded and saved {name} to {local_filename}")
                    elif os.path.exists(local_filename):
                         print(f"  Warning: Downloaded file {local_filename} is empty.")
                         os.remove(local_filename)
                    else:
                         print(f"  Error: File {local_filename} not created after download.")
                except requests.exceptions.Timeout: print(f"Error: Timeout downloading attachment {name} from {url}")
                except requests.exceptions.RequestException as e:
                    if "drive.google.com" in url: print(f"Error downloading Google Drive attachment {name}: {e}. Direct downloads from GDrive URLs can be unreliable.")
                    else: print(f"Error downloading attachment {name}: {e}")
                except Exception as e: print(f"Error saving or processing attachment {name}: {e}")
                finally:
                    if 'response' in locals() and response: response.close()
        print(f"Finished download attempts. Successfully saved {download_count} attachments.")
        return self.downloaded_file_paths

    def _cleanup_downloaded_files(self):
        if not self.downloaded_file_paths: return
        print(f"Cleaning up {len(self.downloaded_file_paths)} downloaded attachment(s)...")
        cleaned_count = 0
        paths_to_clean = list(self.downloaded_file_paths)
        self.downloaded_file_paths = []
        for file_path in paths_to_clean:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    cleaned_count +=1
                except Exception as e:
                    print(f"Error removing downloaded file {file_path}: {e}")
        print(f"Cleaned up {cleaned_count} downloaded files.")

    def _format_conversation(self):
        print("Formatting conversation text...")
        formatted_messages = []
        messages = self.conversation_data.get("messages", [])
        if not messages: return "[No conversation messages found]"
        for msg in messages:
            sender = msg.get("sender", "Unknown Sender")
            receiver = msg.get("receiver", "Unknown Receiver")
            text = msg.get("text", "[Empty Message]")
            timestamp = msg.get("timestamp", "")
            attachments = msg.get("attachments", [])
            attachment_info = ""
            if attachments:
                names = [att.get('name', 'Unknown File') for att in attachments]
                attachment_info = f"\n[Attachments mentioned: {', '.join(names)}]"
            formatted_messages.append(
                f"--- Message ---\n"
                f"From: {sender}\nTo: {receiver}\nTime: {timestamp}\n\n{text}{attachment_info}\n"
                f"--- End Message ---"
            )
        return "\n\n".join(formatted_messages)

    def prepare_final_content(self):
        self.formatted_conversation_text = self._format_conversation()
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"Using temporary directory for downloads/OCR: {temp_dir}")
            self.extracted_ocr_content = self._get_ocr_text(temp_dir)
        content_parts = [f"Conversation History:\n=====================\n{self.formatted_conversation_text}"]
        if self.extracted_ocr_content:
             content_parts.append("\n\nExtracted Content from Attachments:\n===================================\n")
             content_parts.append(self.extracted_ocr_content)
        self.final_content = "\n".join(content_parts)
        print("Final content prepared for summarization.")
        return self.final_content

    def generate_summary(self):
        if not self.final_content:
            print("Error: Final content not prepared. Attempting preparation...")
            self.prepare_final_content()
            if not self.final_content:
                 print("Error: Content preparation failed.")
                 return "[Error: Content preparation failed]", "[Content unavailable]", self.conversation_id
        print(f"Sending content to LLM for summarization via Groq...")
        try:
            response = self.client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": self.final_content}
                ],
                temperature=0.1,
                max_tokens=1024,
                top_p=0.95
            )
            summary = response.choices[0].message.content
            print("Summary received from Groq LLM.")
            return summary, self.final_content, self.conversation_id
        except Exception as e:
            print(f"Error during Groq LLM inference: {e}")
            return f"[Error during summarization: {e}]", self.final_content, self.conversation_id

    def run(self):
        try:
            start_prep = time.time()
            self.prepare_final_content()
            prep_time = time.time() - start_prep
            print(f"Content preparation time: {prep_time:.2f} seconds")
            start_gen = time.time()
            summary, final_content, conv_id = self.generate_summary()
            gen_time = time.time() - start_gen
            print(f"LLM generation time: {gen_time:.2f} seconds")
            return summary, final_content, conv_id
        except Exception as e:
             print(f"An critical error occurred during the Summarizer run process: {e}")
             self._cleanup_downloaded_files()
             return "[Error during processing]", f"[Failed to generate final content: {e}]", self.conversation_id

# --- End of summary_model_packed.py ---