
import os
import requests
import easyocr
from pdf2image import convert_from_path
import time
import tempfile
from groq import Groq
from urllib.parse import urlparse, unquote # Import urlparse and unquote
import urllib.request



import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from peft import PeftModel, PeftConfig # Import PeftModel and PeftConfig
import time # Optional: to measure inference time
import gc
import os
from dotenv import load_dotenv
import requests
from groq import Groq



class OCRReader:
    def __init__(self,file_paths_to_process):
       self.file_paths = file_paths_to_process
       self.reader = None
       self.all_images_to_process = [] # Paths to final images (PNGs from PDF, original images)
       self.extracted_texts = []
       self.temp_pdf_image_paths = [] # Keep track of temp PNGs created from PDFs for cleanup
       self.has_files_to_process = bool(file_paths_to_process)


    def intiate_reader(self):
        if not self.reader and self.has_files_to_process:
            try:
                print("Initializing EasyOCR Reader...")
                self.reader = easyocr.Reader(["en"], gpu=True) # Or gpu=False
                print("EasyOCR Reader initialized.")
            except Exception as e:
                print(f"Error initializing EasyOCR Reader: {e}")
                self.reader = None
                self.has_files_to_process = False


    def _convert_pdf_to_images(self, pdf_path):
        """Converts a single PDF to images and returns paths to temp image files."""
        temp_image_paths = []
        try:
            print(f"Converting PDF: {os.path.basename(pdf_path)}")
            images = convert_from_path(pdf_path, dpi=300)
            for i, img in enumerate(images):
                # Use tempfile to create uniquely named temporary files
                temp_img_file = tempfile.NamedTemporaryFile(suffix=f"_page_{i+1}.png", delete=False)
                img.save(temp_img_file.name, 'PNG')
                temp_image_paths.append(temp_img_file.name)
                self.temp_pdf_image_paths.append(temp_img_file.name) # Track for internal cleanup
            print(f"Converted {os.path.basename(pdf_path)} to {len(images)} images.")
        except Exception as e:
            print(f"Error converting PDF '{os.path.basename(pdf_path)}': {e}")
        return temp_image_paths


    def prepare_images(self):
        """Prepares the list of all images (from PDFs and direct images) to be processed."""
        if not self.has_files_to_process:
            return

        print("Preparing images for OCR...")
        image_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff')
        for file_path in self.file_paths:
            if not os.path.exists(file_path):
                print(f"Warning: File not found during preparation: {file_path}")
                continue

            # Convert PDF to temporary images
            if file_path.lower().endswith('.pdf'):
                pdf_image_paths = self._convert_pdf_to_images(file_path)
                self.all_images_to_process.extend(pdf_image_paths)
            # Add direct image paths
            elif file_path.lower().endswith(image_extensions):
                self.all_images_to_process.append(file_path)
            else:
                print(f"Warning: Unsupported file type skipped: {os.path.basename(file_path)}")
        print(f"Total images prepared for OCR: {len(self.all_images_to_process)}")

    def extract_texts(self):
        """Extracts text from all prepared images."""
        if not self.reader or not self.all_images_to_process:
             if not self.reader and self.has_files_to_process:
                 print("OCR Reader not available, cannot extract text from files.")
             elif not self.all_images_to_process and self.has_files_to_process:
                 print("No processable images found (check file types and conversion errors).")
             return

        print(f"\nStarting OCR extraction on {len(self.all_images_to_process)} image(s)...")
        for img_source in self.all_images_to_process:
            print(f"Processing image: {os.path.basename(img_source)}")
            try:
                result = self.reader.readtext(img_source, detail=0, paragraph=True)
                extracted_text = "\n".join(result)
                # Include filename context in the extracted text
                source_filename = "Unknown Source"
                # Try to find original filename (might be tricky with temp files)
                # This part is heuristic - may need refinement based on naming convention
                if "_page_" in os.path.basename(img_source):
                     # Could try to parse original name if stored better, otherwise use temp name
                     source_filename = f"Page from PDF (source: {os.path.basename(img_source)})"
                else:
                     source_filename = os.path.basename(img_source)

                self.extracted_texts.append(f"--- Content from {source_filename} ---\n{extracted_text}\n--- End Content ---")
                # print(f"  Extracted snippet: {extracted_text[:100]}...")
            except Exception as e:
                print(f"  Error processing {os.path.basename(img_source)} with OCR: {e}")
                self.extracted_texts.append(f"[Error processing image: {os.path.basename(img_source)}]")

    def _cleanup_temp_pdf_images(self):
        """Cleans up temporary PNG files created from PDFs."""
        print("Cleaning up temporary images created from PDFs...")
        cleaned_count = 0
        for temp_path in self.temp_pdf_image_paths:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                    cleaned_count += 1
                except Exception as e:
                    print(f"Error removing temporary file {temp_path}: {e}")
        print(f"Cleaned up {cleaned_count} temporary PDF page images.")
        self.temp_pdf_image_paths = [] # Reset list

    def get_ocr_output(self):
        """Runs the full OCR pipeline and returns combined text."""
        if not self.has_files_to_process:
            return ""

        self.intiate_reader()
        if not self.reader:
             return "[OCR Initialization Failed]"

        self.prepare_images()
        self.extract_texts()
        self._cleanup_temp_pdf_images() # Clean up temp files created by this class

        return "\n\n".join(self.extracted_texts)



dotenv_path = '/kaggle/input/api-keys/API_KEYS.env'  # Specify the full path to your file
load_dotenv(dotenv_path=dotenv_path)

hf_api_token=os.environ.get("HF_API_KEY")

from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
device = 0 if torch.cuda.is_available() else -1

class Summarizer():
    def __init__(self, conversation_data, client):
        """
        Initializes the Summarizer with conversation data potentially containing attachment URLs.

        Args:
            conversation_data (dict): Parsed JSON data including 'conversationId' and 'messages'.
                                      Messages can contain an 'attachments' list with 'url' and 'name'.
            system_prompt (str): System prompt for the LLM.
            client: Initialized LLM API client.
        """
        self.conversation_data = conversation_data
        self.system_prompt ="""
You are an AI assistant specialized in **comprehensive** high-fidelity information extraction and **synthesis** from potentially mixed-source texts (like documents combined with conversational excerpts). Your primary mission is to condense the provided text into a **SINGLE, detailed, unified, factually exhaustive narrative paragraph.**

**Core Mandate: Integrate, Synthesize ALL Information, Prioritizing Detail.**
*   Thoroughly analyze the ENTIRE text provided, recognizing it may contain structured information alongside conversational elements or updates.
*   Your goal is NOT to summarize distinct parts separately, but to **exhaustively capture and weave all relevant facts together** into one cohesive summary reflecting the complete picture presented. **Err on the side of including specifics rather than omitting them**; detail is highly valued.
*   **Crucially: Identify and incorporate any updates, changes, decisions, or corrections mentioned anywhere within the text, especially in later sections or conversational parts.** If information presented later modifies earlier statements (e.g., a change in plans, techniques, roles, or scope), your final summary MUST accurately represent the **most current and definitive state** described across the *entire* input, integrating the final decision or updated information seamlessly.
*   Preserve ALL specific entities and data points explicitly mentioned in the source text. **Strive to include associated context or nuances mentioned alongside these specifics.** This includes, but is not limited to:
    *   Names (people, organizations, products, projects)
    *   Numbers (statistics, quantities, measurements, costs, durations, versions, percentages - include units/context)
    *   Dates and Timeframes (be specific)
    *   Locations
    *   **Specific technical terms, tools, methodologies, or jargon mentioned** (include brief explanations if provided in the source)
    *   Distinct features, capabilities, processes, or steps described (capture related details or parameters)
    *   Reported outcomes, results, or key decisions stated in the text (include relevant metrics, reasons, or implications if mentioned)
*   There is **minimal tolerance for omitting explicitly stated specifics, even seemingly minor ones.** Accuracy, completeness, and **detail richness** take absolute precedence over aggressive brevity.

**Process:**
1.  **Identify All Facts:** Extract every distinct factual statement and specific data point from the entire input, making sure to capture supporting details or context provided in the source.
2.  **Identify Updates & Final Decisions:** Specifically note any information that modifies, clarifies, or overrides earlier statements. Determine the most current understanding presented.
3.  **Synthesize Detailed Narrative:** Construct a single paragraph that logically integrates these facts, prioritizing the most current information where updates exist. Aim for a **comprehensive and richly detailed** narrative that fully represents the nuances of the source information.
4.  **Use Precise Language, Prioritize Full Detail:** Employ clear and precise wording. **While avoiding unnecessary filler or pure repetition, prioritize capturing the full context and nuance of each specific detail, even if this naturally results in a longer summary.** Do not sacrifice detail, context, or clarity for the sake of forcing brevity.

**Strict Output Requirements:**
*   **Format:** The entire output MUST be a single block of text, formatted as ONE paragraph.
*   **Content:** The output must contain ONLY the **detailed and comprehensive** synthesized factual information reflecting the final understanding based on the *entire* source text.
*   **Exclusions:** Absolutely NO bullet points, lists, section headers, or any other formatting beyond a single paragraph. NO introductory phrases ("Here is a summary...", "The provided text discusses..."). NO concluding remarks ("Overall...", "In conclusion..."). NO interpretation, analysis, opinions, inferences, or information external to the provided text.
*   **Tone:** Maintain a strictly neutral, objective, and purely informational tone.
*   **Meta-Commentary:** Do not include any comments about the summarization process itself. Output only the synthesized paragraph."""
        self.client = client

        self.conversation_id = conversation_data.get("conversationId", "N/A") # Note the capital 'I'
        self.formatted_conversation_text = None
        self.extracted_ocr_content = None
        self.final_content = None
        self.downloaded_file_paths = [] # Store paths of files downloaded for this run

    def _download_attachments(self, temp_dir):
        """Downloads attachments from URLs found in messages to a temporary directory."""
        print("Checking for attachments to download...")
        messages = self.conversation_data.get("messages", [])
        download_count = 0

        for i, msg in enumerate(messages):
            attachments = msg.get("attachments", [])
            if not attachments:
                continue

            for j, attachment in enumerate(attachments):
                url = attachment.get("url")
                name = attachment.get("name", f"attachment_{i}_{j}") # Default name if missing
                file_type = attachment.get("type", "").lower() # pdf, png, jpg etc.

                if not url:
                    print(f"Warning: Attachment in message {i} missing URL.")
                    continue

                # Basic check for supported types (optional, OCRReader handles it too)
                # supported_types = ['pdf', 'png', 'jpg', 'jpeg', 'bmp', 'tiff']
                # if file_type not in supported_types:
                #     print(f"Warning: Skipping download for unsupported attachment type '{file_type}' in message {i}: {name}")
                #     continue

                try:
                    print(f"Downloading attachment: {name} from {url[:50]}...")
                    response = requests.get(url, stream=True, timeout=30) # Timeout added
                    response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

                    # Create a safe local filename within the temp directory
                    local_filename = os.path.join(temp_dir, f"msg{i}_att{j}_{name}")

                    with open(local_filename, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)

                    self.downloaded_file_paths.append(local_filename)
                    download_count += 1
                    print(f"Successfully downloaded {name} to {local_filename}")

                except requests.exceptions.RequestException as e:
                    print(f"Error downloading attachment {name} from {url}: {e}")
                except Exception as e:
                    print(f"Error saving attachment {name}: {e}")

        print(f"Downloaded {download_count} attachments.")
        return self.downloaded_file_paths


    def _cleanup_downloaded_files(self):
        """Removes files downloaded during the process."""
        if not self.downloaded_file_paths:
            return
        print(f"Cleaning up {len(self.downloaded_file_paths)} downloaded attachment(s)...")
        cleaned_count = 0
        for file_path in self.downloaded_file_paths:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    cleaned_count +=1
                except Exception as e:
                    print(f"Error removing downloaded file {file_path}: {e}")
        print(f"Cleaned up {cleaned_count} downloaded files.")
        self.downloaded_file_paths = [] # Reset list


    def _format_conversation(self):
        """Formats messages, including mentioning attachments."""
        print("Formatting conversation text...")
        formatted_messages = []
        messages = self.conversation_data.get("messages", [])
        if not messages:
            return "[No conversation messages found]"

        for msg in messages:
            sender = msg.get("sender", "Unknown Sender")
            receiver = msg.get("receiver", "Unknown Receiver")
            text = msg.get("text", "[Empty Message]")
            timestamp = msg.get("timestamp", "")
            attachments = msg.get("attachments", [])

            attachment_info = ""
            if attachments:
                names = [att.get('name', 'Unknown File') for att in attachments]
                attachment_info = f"\n[Attachments: {', '.join(names)}]" # Mention attachments

            # Include sender, receiver, timestamp, text, and attachment info
            formatted_messages.append(
                f"--- Message ---\n"
                f"From: {sender}\n"
                f"To: {receiver}\n"
                f"Time: {timestamp}\n\n"
                f"{text}"
                f"{attachment_info}\n" # Add attachment info here
                f"--- End Message ---"
            )

        return "\n\n".join(formatted_messages)

    def _get_ocr_text(self, temp_dir):
        """Downloads attachments, runs OCR, and cleans up downloads."""
        ocr_text = ""
        downloaded_paths = self._download_attachments(temp_dir)

        if not downloaded_paths:
            print("No attachments downloaded or found for OCR.")
            return "" # Return empty string if no files were downloaded/processed

        print("Attachments found, initiating OCR...")
        ocr_reader = OCRReader(downloaded_paths) # Pass downloaded paths
        try:
            ocr_text = ocr_reader.get_ocr_output()
        except Exception as e:
            print(f"An unexpected error occurred during OCR processing: {e}")
            ocr_text = "[Error during OCR processing]"
        # No finally block needed for _cleanup_downloaded_files here
        # because we want Summarizer to clean them up regardless of OCR success/failure
        # and OCRReader cleans its own temp files internally.
        return ocr_text

    def prepare_final_content(self):
        """Prepares final content by formatting conversation, downloading, running OCR, and combining."""
        self.formatted_conversation_text = self._format_conversation()

        # Use a temporary directory for downloads
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"Using temporary directory for downloads: {temp_dir}")
            self.extracted_ocr_content = self._get_ocr_text(temp_dir)
            # Cleanup of downloaded files happens *after* OCR completes or fails
            self._cleanup_downloaded_files() # Explicitly call cleanup

        # Combine conversation and OCR content
        content_parts = [f"Conversation History:\n=====================\n{self.formatted_conversation_text}"]
        if self.extracted_ocr_content:
            content_parts.append("\n\nExtracted Content from Attachments:\n===================================\n")
            content_parts.append(self.extracted_ocr_content)
        else:
            content_parts.append("\n\n[No content extracted from attachments]")


        self.final_content = "\n".join(content_parts)
        print("Final content prepared for summarization.")
        # print(f"Final Content Snippet:\n{self.final_content[:500]}...\n")
        return self.final_content

    def generate_summary(self):
        """Generates summary using the LLM."""
        if not self.final_content:
            print("Error: Final content not prepared.")
            # Attempt to prepare content if not already done
            self.prepare_final_content()
            if not self.final_content: # Check again if preparation failed
                 return "[Error: Content preparation failed]", "[Content unavailable]", self.conversation_id

        print("Sending content to LLM for summarization...")
        try:
            response = self.client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": self.final_content}
                ],
                temperature=0.1,
                max_tokens=512,
                top_p=0.95
            )
            summary = response.choices[0].message.content
            print("Summary received from LLM.")
            return summary, self.final_content, self.conversation_id
        except Exception as e:
            print(f"Error during LLM inference: {e}")
            return f"[Error during summarization: {e}]", self.final_content, self.conversation_id

    def run(self):
        """Runs the full process: prepare content (incl. download/OCR) and generate summary."""
        # Cleanup is now handled within prepare_final_content/get_ocr_text
        try:
            self.prepare_final_content()
            return self.generate_summary()
        except Exception as e:
             print(f"An error occurred during the run process: {e}")
             # Ensure cleanup happens even if prepare_final_content fails partially
             self._cleanup_downloaded_files()
             return "[Error during processing]", f"[Failed to generate final content: {e}]", self.conversation_id

groq_api_key=os.environ.get("GROQ_API_KEY")
from groq import Groq
client = Groq(api_key=groq_api_key)
# Example usage:

"""
You are an AI assistant specialized in **comprehensive** high-fidelity information extraction and **synthesis** from potentially mixed-source texts (like documents combined with conversational excerpts). Your primary mission is to condense the provided text into a **SINGLE, detailed, unified, factually exhaustive narrative paragraph.**

**Core Mandate: Integrate, Synthesize ALL Information, Prioritizing Detail.**
*   Thoroughly analyze the ENTIRE text provided, recognizing it may contain structured information alongside conversational elements or updates.
*   Your goal is NOT to summarize distinct parts separately, but to **exhaustively capture and weave all relevant facts together** into one cohesive summary reflecting the complete picture presented. **Err on the side of including specifics rather than omitting them**; detail is highly valued.
*   **Crucially: Identify and incorporate any updates, changes, decisions, or corrections mentioned anywhere within the text, especially in later sections or conversational parts.** If information presented later modifies earlier statements (e.g., a change in plans, techniques, roles, or scope), your final summary MUST accurately represent the **most current and definitive state** described across the *entire* input, integrating the final decision or updated information seamlessly.
*   Preserve ALL specific entities and data points explicitly mentioned in the source text. **Strive to include associated context or nuances mentioned alongside these specifics.** This includes, but is not limited to:
    *   Names (people, organizations, products, projects)
    *   Numbers (statistics, quantities, measurements, costs, durations, versions, percentages - include units/context)
    *   Dates and Timeframes (be specific)
    *   Locations
    *   **Specific technical terms, tools, methodologies, or jargon mentioned** (include brief explanations if provided in the source)
    *   Distinct features, capabilities, processes, or steps described (capture related details or parameters)
    *   Reported outcomes, results, or key decisions stated in the text (include relevant metrics, reasons, or implications if mentioned)
*   There is **minimal tolerance for omitting explicitly stated specifics, even seemingly minor ones.** Accuracy, completeness, and **detail richness** take absolute precedence over aggressive brevity.

**Process:**
1.  **Identify All Facts:** Extract every distinct factual statement and specific data point from the entire input, making sure to capture supporting details or context provided in the source.
2.  **Identify Updates & Final Decisions:** Specifically note any information that modifies, clarifies, or overrides earlier statements. Determine the most current understanding presented.
3.  **Synthesize Detailed Narrative:** Construct a single paragraph that logically integrates these facts, prioritizing the most current information where updates exist. Aim for a **comprehensive and richly detailed** narrative that fully represents the nuances of the source information.
4.  **Use Precise Language, Prioritize Full Detail:** Employ clear and precise wording. **While avoiding unnecessary filler or pure repetition, prioritize capturing the full context and nuance of each specific detail, even if this naturally results in a longer summary.** Do not sacrifice detail, context, or clarity for the sake of forcing brevity.

**Strict Output Requirements:**
*   **Format:** The entire output MUST be a single block of text, formatted as ONE paragraph.
*   **Content:** The output must contain ONLY the **detailed and comprehensive** synthesized factual information reflecting the final understanding based on the *entire* source text.
*   **Exclusions:** Absolutely NO bullet points, lists, section headers, or any other formatting beyond a single paragraph. NO introductory phrases ("Here is a summary...", "The provided text discusses..."). NO concluding remarks ("Overall...", "In conclusion..."). NO interpretation, analysis, opinions, inferences, or information external to the provided text.
*   **Tone:** Maintain a strictly neutral, objective, and purely informational tone.
*   **Meta-Commentary:** Do not include any comments about the summarization process itself. Output only the synthesized paragraph."""

# 1. Your NEW input data structure - CORRECTED WITH REAL URLs
input_data_local_files={
  "conversationId": "aditya@gmail.com_somani@gmail.com_1743828742354",
  "messages": [
    {
      "sender": "aditya@gmail.com",
      "receiver": "somani@gmail.com",
      "subject": "fileuploadcheck",
      "body": "file check",
      "createdAt": "2024-05-04T12:12:22.338Z"
    }
  ],
  "attachments": [
    {
      "url": "https://res.cloudinary.com/dx3y6lm0i/image/upload/v1743828739/b2n9ioal9n4ti7r7owwq.pdf",
      "type": "pdf",
      "name": "document.pdf"
    }
  ]
}

summarizer = Summarizer(
    conversation_data=input_data_local_files, # Use the JSON with local paths
    client=client
)

# 6. Run the process
print("\nStarting summarization process with local files...")
summary, final_content, conversation_id = summarizer.run()
print(final_content)

print("\n--- Results ---")
print(f"Conversation ID: {conversation_id}")
print(summary)
