# Anthropic Claude Integration Guide

This guide explains how to use Anthropic's Claude models to work with AILang code generation and understanding.

## Prerequisites

1. Anthropic API key
2. Python 3.7+
3. `anthropic` Python package

## Installation

```bash
pip install anthropic
```

## Basic Usage

### 1. Generating AILang Code

```python
import anthropic

# Initialize the Anthropic client
client = anthropic.Anthropic(api_key="your-api-key")

# Load the system prompt
with open("prompts/system/ailang_expert.md", "r") as f:
    system_prompt = f.read()

# Example user prompt
user_prompt = """
Create an AILang model for sentiment analysis on product reviews.
The model should:
- Use an LSTM architecture
- Include dropout for regularization
- Output a sentiment score between 0 and 1
- Include early stopping
"""

try:
    response = client.messages.create(
        model="claude-3-opus-20240229",  # or "claude-3-sonnet-20240229" for faster responses
        max_tokens=4000,
        temperature=0.3,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt}
        ]
    )
    
    print(response.content[0].text)
    
except Exception as e:
    print(f"Error: {str(e)}")
```

### 2. Code Explanation

```python
def explain_ailang_code(code_snippet: str) -> str:
    """Generate an explanation for the given AILang code."""
    client = anthropic.Anthropic()
    
    prompt = f"""
    Please explain the following AILang code in detail. Include:
    1. The overall purpose of the code
    2. The function of each major section
    3. Any important parameters or configurations
    4. Potential use cases
    
    Code:
    ```ail
    {code_snippet}
    ```
    """
    
    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2000,
            temperature=0.1,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text
        
    except Exception as e:
        return f"Error generating explanation: {str(e)}"
```

## Advanced Usage

### 1. Few-shot Learning

```python
def generate_with_examples(task_description: str, examples: list) -> str:
    """Generate AILang code using few-shot examples."""
    client = anthropic.Anthropic()
    
    # Format examples
    messages = []
    for example in examples:
        messages.append({"role": "user", "content": example["input"]})
        messages.append({"role": "assistant", "content": example["output"]})
    
    # Add the current task
    messages.append({"role": "user", "content": task_description})
    
    try:
        response = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=4000,
            temperature=0.3,
            messages=messages
        )
        return response.content[0].text
        
    except Exception as e:
        return f"Error generating code: {str(e)}"
```

### 2. Streaming Responses

```python
def stream_ailang_generation(prompt: str):
    """Stream the generation of AILang code."""
    client = anthropic.Anthropic()
    
    try:
        with client.messages.stream(
            model="claude-3-opus-20240229",
            max_tokens=4000,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                print(text, end="", flush=True)
            print()
            
    except Exception as e:
        print(f"Error during streaming: {str(e)}")
```

## Best Practices

1. **Model Selection**:
   - Use `claude-3-opus-20240229` for complex tasks requiring deep reasoning
   - Use `claude-3-sonnet-20240229` for faster, more cost-effective responses

2. **Temperature**:
   - Use lower temperatures (0.1-0.3) for code generation
   - Slightly higher temperatures (0.4-0.7) for creative tasks

3. **Max Tokens**:
   - Set an appropriate `max_tokens` based on expected response length
   - Claude 3 models support up to 200,000 tokens context window

4. **Error Handling**:
   - Implement retry logic for rate limits
   - Validate generated code before execution

## Example: Complete AILang Generation Pipeline

```python
import os
from typing import List, Dict, Optional
import anthropic

class AILangGenerator:
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-sonnet-20240229"):
        """Initialize the AILang code generator.
        
        Args:
            api_key: Anthropic API key. If None, will use ANTHROPIC_API_KEY environment variable.
            model: The Claude model to use (default: "claude-3-sonnet-20240229")
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or pass api_key.")
            
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.model = model
        
        # Load system prompt
        with open("prompts/system/ailang_expert.md", "r") as f:
            self.system_prompt = f.read()
    
    def generate_model(
        self,
        task_description: str,
        examples: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.3,
        max_tokens: int = 4000,
        stream: bool = False
    ) -> str:
        """Generate AILang code based on a task description.
        
        Args:
            task_description: Description of the model to generate
            examples: Optional list of example input/output pairs
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum number of tokens to generate
            stream: Whether to stream the response
            
        Returns:
            Generated AILang code as a string
        """
        messages = []
        
        # Add few-shot examples if provided
        if examples:
            for example in examples:
                messages.append({"role": "user", "content": example["input"]})
                messages.append({"role": "assistant", "content": example["output"]})
        
        # Add the current task
        messages.append({"role": "user", "content": task_description})
        
        try:
            if stream:
                with self.client.messages.stream(
                    model=self.model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system=self.system_prompt,
                    messages=messages
                ) as stream:
                    full_response = []
                    for text in stream.text_stream:
                        full_response.append(text)
                        print(text, end="", flush=True)
                    print()
                    return "".join(full_response)
            else:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system=self.system_prompt,
                    messages=messages
                )
                return response.content[0].text
                
        except Exception as e:
            print(f"Error generating AILang code: {str(e)}")
            raise
    
    def explain_code(self, code: str, temperature: float = 0.2) -> str:
        """Generate an explanation for the given AILang code.
        
        Args:
            code: The AILang code to explain
            temperature: Sampling temperature (0-1)
            
        Returns:
            Explanation of the code
        """
        prompt = f"""
        Please explain the following AILang code in detail. Include:
        1. The overall purpose of the code
        2. The function of each major section
        3. Any important parameters or configurations
        4. Potential use cases
        
        Code:
        ```ail
        {code}
        ```
        """
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=temperature,
                system="You are an expert in explaining AILang code.",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
            
        except Exception as e:
            return f"Error generating explanation: {str(e)}"

# Example usage
if __name__ == "__main__":
    # Initialize the generator
    generator = AILangGenerator()
    
    # Example task
    task = """
    Create an AILang model for time series forecasting with the following requirements:
    - Use a combination of 1D convolutions and LSTM layers
    - Include batch normalization and dropout
    - Predict the next 7 time steps
    - Include early stopping and learning rate reduction
    """
    
    # Generate the model
    try:
        print("Generating AILang model...")
        ailang_code = generator.generate_model(task, stream=True)
        
        # Get an explanation
        print("\nGenerating explanation...")
        explanation = generator.explain_code(ailang_code)
        print("\nExplanation:")
        print(explanation)
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Ensure your API key is correctly set and has sufficient permissions
   - Check for typos in the API key

2. **Rate Limiting**:
   - Implement exponential backoff for rate limits
   - Consider batching requests if making many API calls

3. **Model Context Window**:
   - For long conversations or large codebases, be mindful of the 200K token limit
   - Consider summarizing or truncating long inputs

### Performance Tips

1. **Batching**:
   - Group multiple requests when possible to reduce latency

2. **Caching**:
   - Cache common queries to reduce API calls

3. **Streaming**:
   - Use streaming for better user experience with long generations

## Security Considerations

1. **API Key Security**:
   - Never commit API keys to version control
   - Use environment variables or secure secret management

2. **Data Privacy**:
   - Be cautious when sending sensitive or proprietary code to the API
   - Review Anthropic's data usage policies

## Additional Resources

- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/)
- [Claude Models](https://www.anthropic.com/product)
- [AILang Documentation](https://github.com/yourusername/ailang/docs) (update with actual link)
