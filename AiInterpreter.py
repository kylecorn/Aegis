import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize Gemini AI
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    print("✅ Google AI configured successfully")
else:
    print("⚠️  Warning: GOOGLE_API_KEY not found. AI features may not work.")

def format_text_with_ai(text: str, format_instructions: str = None) -> str:
    """
    Convert text into a specific formatted string using Gemini AI.
    
    Args:
        text: The input text to format
        format_instructions: Optional instructions for how to format the text
    
    Returns:
        Formatted string, or original text if AI fails
    """
    if not GOOGLE_API_KEY:
        print("⚠️  GOOGLE_API_KEY not set, returning original text")
        return text
    
    # Default format instructions if none provided
    if not format_instructions:
        format_instructions = """
        Rewrite the following text into a professional, clear, and concise format.
        Keep the core meaning and intent, but make it more polished and appropriate for email communication.
        """
    
    prompt = f"""
    {format_instructions}
    
    Original text: "{text}"
    
    Return only the formatted text, without any additional commentary or labels.
    """
    
    try:
        model = genai.GenerativeModel(model_name="gemini-2.0-flash-exp")
        response = model.generate_content(prompt)
        formatted_text = response.text.strip()
        
        print(f"✅ AI formatted text successfully")
        return formatted_text
        
    except Exception as e:
        print(f"❌ Error formatting text with AI: {e}")
        return text  # Return original text if AI fails
