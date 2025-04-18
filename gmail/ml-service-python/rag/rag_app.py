from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from rag_main import RAG
from langchain_community.document_loaders.mongodb import MongodbLoader
# Initialize Flask app
app = Flask(__name__)

# Load environment variables
load_dotenv()

# Initialize RAG model globally but don't build the chain yet
# as we'll customize it per request
rag_model = RAG()

@app.route('/query', methods=['POST'])
def query_rag():
    # Get data from request
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Extract user input and session ID
    user_input = data.get('user_input')
    session_id = data.get('session_id', 'default_session')
    user_email = data.get('user_email')
    
    if not user_input:
        return jsonify({"error": "No user input provided"}), 400
    
    try:
        
        # Create a filter based on user input
        # This is a simple example - adjust the filter logic based on your MongoDB schema
        filter_criteria={
            "$or": [
                {"user_email": user_email},
                {"other": user_email}
            ]
        }
        
        # Fields to extract from MongoDB
        field_names=["user_email", "other", "email_thread", "summary"]
        
        # Load documents from MongoDB with the filter applied
        if True:
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
            
            # Process documents to extract summaries into metadata
            processed_docs = docs
            
            split_docs = rag_model.split_documents(processed_docs)
            
            # Create retriever with the filtered documents
            rag_model.create_retriever(split_docs)
        else:
            print("Warning: MongoDB connection details not provided. Initializing RAG without retrieval.")
        
        # Build the chain for this request
        rag_model.build_chain()
        
        # Query the RAG model
        response = rag_model.invoke(user_input, session_id)
        return jsonify(response)
    
    except Exception as e:
        print(f"Error processing query: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))  # Change to 8080 or another free port
    app.run(host='0.0.0.0', port=port, debug=False)