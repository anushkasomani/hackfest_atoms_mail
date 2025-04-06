import nest_asyncio
nest_asyncio.apply()

from rag_main import RAG
from langchain.document_loaders import TextLoader  # if needed
from langchain_core.documents import Document
import re
import ast
import json
from langchain_community.document_loaders.mongodb import MongodbLoader

# Use your improved summary_to_meta function

def main():
    # Initialize the RAG instance
    rag_instance = RAG()

    # Load documents from MongoDB using your parameters
    print("Loading documents from MongoDB...")
    loader = MongodbLoader(
        connection_string="mongodb+srv://adityavaryan:hackfest25@hackfest25.pvcefma.mongodb.net/?retryWrites=true&w=majority&appName=hackfest250",
        db_name="auth",
        collection_name="summaries",
        filter_criteria={
            "$or": [
                {"user_name": "aditya@gmail.com"},
                {"other": "aditya@gmail.com"}
            ]
        },
        field_names=["user_name", "other", "email_thread", "summary"],
    )
    docs = loader.load()
    
    print(f"Total documents retrieved: {len(docs)}")

    # Use your improved preprocessing functionwrite 
    print("Preprocessing documents...")
    processed_docs = docs
    if not processed_docs:
        print("No valid documents processed. Exiting.")
        return

    # Split documents into chunks for better retrieval
    print("Splitting documents...")
    split_docs = rag_instance.split_documents(processed_docs)

    # Create a retriever using the split documents
    print("Creating retriever...")
    rag_instance.create_retriever(split_docs)

    # Build the conversational chain
    print("Building conversational chain...")
    rag_instance.build_chain()

    # Interactive session for testing
    session_id = "mongodb_test_session"
    print("\n--- Interactive Test Session ---")
    print("Type 'exit' to quit.")
    while True:
        user_input = input("Enter your question: ")
        if user_input.lower() == "exit":
            break
        response = rag_instance.invoke(user_input, session_id)
        print("AI Response:", response.get("answer", "No answer found."), "\n")

main()
