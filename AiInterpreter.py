import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# Get API key from environment - set GOOGLE_API_KEY in your .env file
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize Gemini AI client - only runs if API key is found
# Modify: Change model name here if you want to use a different Gemini model
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    print("✅ Google AI configured successfully")
else:
    print("⚠️  Warning: GOOGLE_API_KEY not found. AI features may not work.")

def format_text_with_ai(text: str, format_instructions: str = None) -> str:
    """
    Main function: Converts input text into formatted string using Gemini AI.
    
    MODIFY THIS FUNCTION to change how text is formatted:
    - Change format_instructions to specify your desired output format
    - Modify the prompt structure to add context or examples
    - Change the model name if needed (line 47)
    - Adjust error handling behavior
    """
    # Early return if API key not configured
    if not GOOGLE_API_KEY:
        print("⚠️  GOOGLE_API_KEY not set, returning original text")
        return text
    
    # Default formatting instructions - MODIFY THIS to change default behavior
    # This is what tells the AI how to format your text
    if not format_instructions:
        format_instructions = """
        Rewrite the following text into a professional, clear, and concise format.
        Keep the core meaning and intent, but make it more polished and appropriate for email communication.
        """
    
    # Build the prompt sent to Gemini - MODIFY THIS to change prompt structure
    # You can add examples, context, or specific formatting rules here
    prompt = f"""
    {format_instructions}
    
    Original text: "{text}"
    
    Return only the formatted text, without any additional commentary or labels.
    """
    
    try:
        # Model selection - MODIFY: Change model name here (e.g., "gemini-1.5-flash", "gemini-2.0-flash-exp")
        # Check Google AI Studio for available models: https://aistudio.google.com/
        model = genai.GenerativeModel(model_name="gemini-2.0-flash-exp")
        
        # Send request to Gemini and get response
        response = model.generate_content(prompt)
        formatted_text = response.text.strip()
        
        print(f"✅ AI formatted text successfully")
        return formatted_text
        
    except Exception as e:
        # Error handling - MODIFY: Change what happens on error (currently returns original text)
        print(f"❌ Error formatting text with AI: {e}")
        return text  # Return original text if AI fails
