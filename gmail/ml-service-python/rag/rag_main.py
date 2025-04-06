import os
import re
import ast
import json
import getpass
from typing import Literal, List, Dict
from flask import Flask, request, jsonify
import nest_asyncio
from dotenv import load_dotenv
import pickle
from langchain_core.documents import Document
from langchain.document_loaders import TextLoader  # Keep for potential future use
from langchain_community.document_loaders.mongodb import MongodbLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma  # Keep for potential future use
from langchain.embeddings import HuggingFaceEmbeddings  # Keep for potential future use
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain.schema.runnable import RunnableParallel, RunnableBranch, RunnableLambda, RunnablePassthrough
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from pydantic import BaseModel, Field

# Apply nest_asyncio for compatibility if running in certain async environments (like Jupyter)
# This might not be strictly necessary in a standard Python script but doesn't hurt.
nest_asyncio.apply()

# --- Environment & API Keys ---
load_dotenv()

if "GROQ_API_KEY" not in os.environ:
    os.environ["GROQ_API_KEY"] = getpass.getpass("Enter your Groq API key: ")
if "GOOGLE_API_KEY" not in os.environ:
    os.environ["GOOGLE_API_KEY"] = getpass.getpass("Enter your GOOGLE API key: ")

# --- Chat History Management ---
store = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """Get or create chat message history for a session."""
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

# --- Prompt Templates ---
contextualize_q_system_prompt = (
    "Given a chat history and the latest user question "
    "which might reference context in the chat history, "
    "formulate a standalone question which can be understood "
    "without the chat history. Do NOT answer the question, "
    "just reformulate it if needed and otherwise return it as is."
)
contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", contextualize_q_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])

default_query = "Generate an email as a reply to the latest email to the speficied person. "

# Updated QA Prompt to use email_summary from metadata
qa_system_prompt = """You are a highly capable and helpful AI assistant.

Your job is to answer user questions clearly, accurately, and concisely. Use the context provided to guide your answers. If no relevant context is available, rely on your general knowledge to provide a helpful response.

Follow these guidelines when answering:
- Focus on the user’s intent and respond accordingly.
- Prioritize factual accuracy, clarity, and relevance.
- If context is available, especially email-related context, base your response on it.
- Do **not** fabricate information. If you don’t know something, say so honestly.
- Avoid filler. Keep the language simple, professional, and easy to understand.
- If the user’s question is vague or incomplete, make reasonable assumptions.

⚠️ **Important**: If the question is related to emails (e.g., reply generation, clarification, tone, sender/receiver actions), refer specifically to the provided **Email Summary** for context.

---

**Email Summary**:
{email_summary}
"""
qa_prompt = ChatPromptTemplate.from_messages([
    ("system", qa_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])

no_retrieval_prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer based on your knowledge and the chat history"),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])

retrieval_decision_prompt = ChatPromptTemplate.from_messages([
    ("system", """Determine if the question requires document retrieval based on the user's input and chat history.
Respond ONLY with 'YES' or 'NO'.

Consider these cases:
- If the question asks about specific email content, summaries, senders, actions discussed in emails, or asks for replies/drafts based on emails -> RETRIEVAL IS REQUIRED (YES).
- If the conversation history is empty -> RETRIEVAL IS REQUIRED (YES).
- If the question is general conversation, a follow-up that doesn't need specific email details from the knowledge base, or relies only on your own knowledge -> NO RETRIEVAL IS REQUIRED (NO).

Example needing retrieval: "What did Anushka say about the database?" or "Draft a reply to the last email."
Example not needing retrieval: "Hello" or "Can you explain ChromaDB in general?" (unless the history implies context)

IF THE USER QUERY IS EMPTY, RETRIEVAL IS REQUIRED.
"""),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])

# --- Helper Functions ---
def format_response(response: str) -> dict:
    """Ensure consistent output format."""
    return {"answer": response}

def decide_to_retrieve(response: str) -> bool:
    """Parse decision response to boolean."""
    return response.strip().upper() == "YES"

def format_docs_with_content(docs):
    """Extract page content from documents."""
    if not docs:
        return "No relevant information found."
    
    # Use the actual page_content directly
    contents = [doc.page_content for doc in docs if hasattr(doc, "page_content")]
    
    # Filter out empty content
    contents = [c for c in contents if c]
    
    if not contents:
        return "No content found in the relevant documents."
    
    return "\n\n".join(contents)
def gen_sufx(scores):
    if not scores:
        return ""
    prefix = (
        "\n\nAdditionally, generate the response such that if you were to self-assess, "
        "your answer would receive the following scores exactly:\n"
    )

    # Generate each "Key: Value" line, capitalizing the key
    score_lines = [f"{key.capitalize()}: {value}\n" for key, value in scores.items()]

    # Join the lines together
    dynamic_part = "".join(score_lines)
    suffix = (
        "\n\n Make sure just to answer just the user's query and do not generate anything more."
    )

    return prefix + dynamic_part + suffix
# --- RAG Class ---
class RAG:
    def __init__(self, llm=None, embedding_model=None, retriever=None):
        """Initialize RAG with optional models and retriever."""
        if llm is None:
            self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.7)
        else:
            self.llm = llm

        if embedding_model is None:
            self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
        else:
            self.embedding_model = embedding_model

        self.retriever = retriever
        self.conversational_chain = None  # Initialize chain placeholder

    def load_documents_from_mongodb(self, connection_string, db_name, collection_name, filter_criteria, field_names):
        """Load documents from MongoDB with filtering."""
        print(f"Loading documents from MongoDB: db={db_name}, collection={collection_name}")
        loader = MongodbLoader(
            connection_string=connection_string,
            db_name=db_name,
            collection_name=collection_name,
            filter_criteria=filter_criteria,
            field_names=field_names
        )
        docs = loader.load()
        print(f"Loaded {len(docs)} documents.")
        return docs

    def summary_to_meta(self,docs):
        mapped_docs = []
        for doc in docs:
            raw = doc.page_content

            # STEP 1: Extract the JSON-like list with regex
            match = re.search(r"(\[{'sender':.*?}\])", raw)
            if not match:
                print("No email thread found")
                continue

            thread_str = match.group(1)

            try:
                thread = ast.literal_eval(thread_str)
            except Exception as e:
                print("Failed to parse thread:", e)
                continue

            # STEP 2: Extract summary as everything after thread
            try:
                summary_start = raw.index(thread_str) + len(thread_str)
                summary = raw[summary_start:].strip()
            except Exception as e:
                print("Summary extraction failed:", e)
                continue

            # STEP 3: Store flipped doc
            new_doc = Document(
                page_content=json.dumps(thread),  # This is now the conversation
                metadata={"summary": summary}       # Summary stored here
            )
            mapped_docs.append(new_doc)

        return mapped_docs

    def split_documents(self, documents, chunk_size=1000, chunk_overlap=200):
        """Split documents into chunks."""
        print(f"Splitting {len(documents)} documents into chunks...")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            add_start_index=True,
            length_function=len,
            is_separator_regex=False
        )
        splits = text_splitter.split_documents(documents)
        print(f"Split into {len(splits)} chunks.")
        return splits
    def gen_sufx(scores):
        if not scores:
            return ""
        prefix = (
            "\n\nAdditionally, generate the response such that if you were to self-assess, "
            "your answer would receive the following scores exactly:\n"
        )

        # Generate each "Key: Value" line, capitalizing the key
        score_lines = [f"{key.capitalize()}: {value}\n" for key, value in scores.items()]

        # Join the lines together
        dynamic_part = "".join(score_lines)
        suffix = (
            "\n\n Make sure just to answer just the user's query and do not generate anything more."
        )

        return prefix + dynamic_part + suffix

    def create_retriever(self, documents):
        """Create a retriever from documents using InMemoryVectorStore."""
        if not documents:
            print("Warning: No documents provided to create retriever. Retrieval will not work.")
            self.retriever = None
            return None

        print(f"Creating retriever from {len(documents)} document chunks...")
        vector_store = InMemoryVectorStore(embedding=self.embedding_model)
        vector_store.add_documents(documents=documents)
        self.retriever = vector_store.as_retriever(search_kwargs={"k": 3})
        print("Retriever created successfully.")
        return self.retriever

    def build_chain(self):
        """Build the full conversational RAG chain."""
        print("Building the conversational RAG chain...")
        if self.retriever is None:
             print("Warning: Retriever is not set. Building chain without retrieval capabilities.")
             no_retrieval_full_chain = (
                 no_retrieval_prompt
                 | self.llm
                 | StrOutputParser()
                 | RunnableLambda(format_response)
             )
             self.conversational_chain = RunnableWithMessageHistory(
                 no_retrieval_full_chain,
                 get_session_history,
                 input_messages_key="input",
                 history_messages_key="chat_history",
                 output_messages_key="answer",
             )
             print("Chain built (no retrieval).")
             return self.conversational_chain

        # --- Core Chain Components ---
        history_aware_retriever = create_history_aware_retriever(
            self.llm,
            self.retriever,
            contextualize_q_prompt
        )

        document_processing_chain = (
            RunnablePassthrough.assign(
                email_summary=lambda inputs: format_docs_with_content(inputs["documents"])
            )
            | qa_prompt
            | self.llm
            | StrOutputParser()
            | RunnableLambda(format_response)
        )

        no_retrieval_chain = (
            no_retrieval_prompt
            | self.llm
            | StrOutputParser()
            | RunnableLambda(format_response)
        )

        decision_chain = (
            retrieval_decision_prompt
            | self.llm
            | StrOutputParser()
            | RunnableLambda(decide_to_retrieve)
        )

        def retrieve_and_process(info: Dict):
            input_text = info.get("input" , default_query)
            chat_history = info.get("chat_history", [])
            retrieved_docs = history_aware_retriever.invoke({
                "input": input_text,
                "chat_history": chat_history
            })
            return document_processing_chain.invoke({
                "input": input_text,
                "chat_history": chat_history,
                "documents": retrieved_docs
            })

        def route_based_on_decision(info: Dict):
            input_text = info["input"]
            chat_history = info.get("chat_history", [])
            needs_retrieval = decision_chain.invoke({
                "input": input_text,
                "chat_history": chat_history
            })
            print(f"Decision: Needs Retrieval? {'YES' if needs_retrieval else 'NO'}")
            if needs_retrieval:
                return retrieve_and_process(info)
            else:
                return no_retrieval_chain.invoke({
                    "input": input_text,
                    "chat_history": chat_history
                })

        full_chain = RunnableBranch(
            (lambda x: not x.get("chat_history"), RunnableLambda(retrieve_and_process)),
            RunnableLambda(route_based_on_decision)
        )

        self.conversational_chain = RunnableWithMessageHistory(
            full_chain,
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
            output_messages_key="answer",
        )

        print("Conversational RAG chain built successfully.")
        return self.conversational_chain

    def invoke(self, user_input: str, session_id: str):
        """Invoke the conversational chain."""
        if not self.conversational_chain:
            raise ValueError("Chain has not been built yet. Call build_chain() first.")

        print(f"\n--- Invoking chain for session '{session_id}' ---")
        print(f"User Input: {user_input}")
        response = self.conversational_chain.invoke(
            {"input": user_input},
            config={"configurable": {"session_id": session_id}}
        )
        print(f"AI Response: {response.get('answer', 'Error: No answer found')}")
        print("----------------------------------------------")
        return response
