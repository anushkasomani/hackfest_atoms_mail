import nest_asyncio
nest_asyncio.apply()

from rag_main import RAG
from langchain.document_loaders import TextLoader  # if needed
from langchain_core.documents import Document
import re
import ast
import json

# Use your improved summary_to_meta function

def main():
    # Initialize the RAG instance
    rag_instance = RAG()

    # Load documents from MongoDB using your parameters
    print("Loading documents from MongoDB...")
    docs = rag_instance.load_documents_from_mongodb(
        connection_string="mongodb+srv://anushka:anushkas@cluster0.w2aa386.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
        db_name="atom-mail",
        collection_name="summary",
        filter_criteria={
            "$or": [
                {"user_email": "somanianu@gmail.com"},
                {"other": "somanianu@gmail.com"}
            ]
        },
        field_names=["user_email", "other", "email_thread", "summary"]
    )
    
    print(f"Total documents retrieved: {len(docs)}")

    # Use your improved preprocessing function
    print("Preprocessing documents...")
    processed_docs = rag_instance.summary_to_meta(docs)
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
