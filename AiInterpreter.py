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
    # Main function: Converts input text into formatted string using Gemini AI.
    # MODIFY THIS FUNCTION to change how text is formatted:
    # - Change format_instructions to specify your desired output format
    # - Modify the prompt structure to add context or examples
    # - Change the model name if needed (line 47)
    # - Adjust error handling behavior
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

# Prompt for the AI assistant:

# I want you to act as an AI assistant helping me with scheduling.
# Your main purpose is to first deduce the type of request you are receiving, and then based 
# on that you will output a response in a specific format. 

# The first type of request is "Schedule Request". Schedule Request is designed to trigger 
# a request for a schedule for a specified period of time. If you identify the request as 
# being something along these lines, please respond by assessing what the user is requesting 
# (what time period they want the schedule for) and then reiterate it using this specific format: 
# "Create a schedule for {date1} - {date2}." where date1/date2 are in the format of month/day/year.
# If I wanted a schedule from November 3rd to November 9th 2025, the format output should be 
# "Create a schedule for 11/03/2025 - 11/09/2025.". After you've responded with the reiteration 
# in the specific format, please ask the user to confirm whether or not your reiteration is correct.
# When asking for the confirmation use a more casual tone, you don't need to say it exactly in the 
# format of the first line you will reply with/type out

# The second form of request is "Substitution Needed". Substitution Needed is designed to help the 
# user find help on short notice, typically when someone is calling out sick or something comes up. 
# If you identify the request as being something along these lines, please respond by assessing what 
# the user is requesting (which person called out sick today) and reiterate their request using this 
# specific format: "{NameOfPerson} called out sick today.". NameOfPerson should be something like 
# "Lifeguard" followed by a number. If Lifeguard 4 calls out sick, the response you give should be 
# "Lifeguard #4 called out sick today.". After you've responded with the reiteration in the specific 
# format, please ask the user to confirm whether or not your reiteration is correct. When asking for 
# the confirmation use a more casual tone, you don't need to say it exactly in the format of the first 
# line you will reply with/type out

# Last, if you don't identify the prompt given to you as being a request for you to do one of the 
# earlier requests, I want you to act like a normal assistant who will talk and respond with casual 
# talking and engage in conversations. If the user is talking to you a lot, casually ask if they 
# need assistance with anything or if they want to just continue casually chatting.

# The way that you should respond to the rest of my prompts (until I tell you to stop) is by first 
# writing the request type, then on the next line you should respond to me in the ways that I asked. 
# If this all sounds good and makes sense, then let me know and we will begin with testing out your 
# skills as an AI Assistant in this specific scenario.