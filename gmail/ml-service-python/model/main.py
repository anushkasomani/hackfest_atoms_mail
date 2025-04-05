from summarizer_model import Summarizer
import os 
import getpass
from groq import Groq
from dotenv import load_dotenv
# Load environment variables from a .env file if it exists
load_dotenv()
if "GROQ_API_KEY" not in os.environ:
    os.environ["GROQ_API_KEY"] = getpass.getpass("Enter your Groq API key: ")
if "GOOGLE_API_KEY" not in os.environ:
    os.environ["GOOGLE_API_KEY"] = getpass.getpass("Enter your GOOGLE API key: ")

# 1. Your NEW input data structure - CORRECTED WITH REAL URLs
input_data_local_files={
  "conversationId": "Arush_Arjun_1743793567000", 
  "messages":  [
   {
    "sender": "Arush",
    "receiver": "Arjun",
    "text": "Hey Arjun, I've decided to switch things up for the Hackfest proposal. Instead of using a Visual Language Model (VLM) for processing PDFs and images, I'm implementing Groq's Llama3-70B model for summarization and EasyOCR for text extraction.",
    "timestamp": "2025-04-05T08:30:00.000Z",
    "attachments": []
   },
   {
    "sender": "Arjun",
    "receiver": "Arush",
    "text": "That's a smart move! EasyOCR should handle text extraction from images and PDFs efficiently, and Groq's Llama3 is perfect for fast, detailed summarization. How are you planning to integrate them?",
    "timestamp": "2025-04-05T08:31:00.000Z",
    "attachments": []
   },
   {
    "sender": "Arush",
    "receiver": "Arjun",
    "text": "The pipeline will work like this:\n1. EasyOCR extracts text from images or PDFs.\n2. The extracted text is sent to Groq’s Llama3-70B for summarization.\n3. Groq generates structured summaries with all the key details like names, metrics, and technical terms.\n\nAttaching the details here.", 
    "attachments": [
     {
      "type": "pdf",
      "url": "https://drive.google.com/uc?export=download&id=1o4xYLn3ufSIr3qahrTKPANoELD9oyuR-",
      "name": "hackfest_plan_details.pdf" 
     }
    ]
   },
   {
    "sender": "Arjun",
    "receiver": "Arush",
    "text": "Sounds great! Are you using a specific prompt for Groq to ensure it retains all important information?",
    "timestamp": "2025-04-05T08:33:00.000Z",
    "attachments": []
   },
   {
    "sender": "Arush",
    "receiver": "Arjun",
    "text": "Yes, I've crafted a system prompt that ensures Groq outputs concise summaries while preserving proper nouns, metrics, contact info, and technical terms. It also formats the output into labeled sections for better readability.",
    "timestamp": "2025-04-05T08:34:00.000Z",
    "attachments": []
   },
   {
    "sender": "Arjun",
    "receiver": "Arush",
    "text": "Perfect! This setup should make the proposal much more professional and easier to follow. Let me know once you’re done—I’ll help review the final version.",
    "timestamp": "2025-04-05T08:35:00.000Z",
    "attachments":[]
}
]
}
client = Groq(
    api_key=os.environ["GROQ_API_KEY"]
)

summarizer= Summarizer(
    conversation_data=input_data_local_files,
    client=client
)

print("Summarizing the conversation...")
summary , final_content, conversation_id= summarizer.run()
print(final_content)
print("-------------------------")
print("results")
print(f"Conversation_id : {conversation_id}")
print(f"Summary :\n {summary}")