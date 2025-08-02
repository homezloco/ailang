# OpenAI Integration Guide

This guide explains how to use OpenAI's API to work with AILang code generation and understanding.

## Prerequisites

1. OpenAI API key
2. Python 3.7+
3. `openai` Python package

## Installation

```bash
pip install openai
```

## Basic Usage

### 1. Code Generation

```python
import openai

# Set your API key
openai.api_key = "your-api-key"

# Load the system prompt
with open("prompts/system/ailang_expert.md", "r") as f:
    system_prompt = f.read()

# Example user prompt
user_prompt = """
Create an AILang model for image classification on CIFAR-10 with the following requirements:
- Use a CNN architecture with 3 convolutional blocks
- Include batch normalization and dropout for regularization
- Use data augmentation
- Train for 50 epochs with early stopping
- Use the Adam optimizer with a learning rate of 0.001
"""

response = openai.ChatCompletion.create(
    model="gpt-4",  # or "gpt-3.5-turbo" for faster, less expensive responses
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ],
    temperature=0.3,  # Lower temperature for more deterministic outputs
    max_tokens=2000
)

print(response.choices[0].message.content)
```

### 2. Code Explanation

```python
def explain_ailang_code(code_snippet):
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an expert in AILang. Explain the following code in detail, including the purpose of each section and how they work together."},
            {"role": "user", "content": f"Explain this AILang code:\n\n```ail\n{code_snippet}\n```"}
        ],
        temperature=0.2
    )
    return response.choices[0].message.content
```

## Advanced Usage

### 1. Few-shot Learning

```python
def generate_with_examples(task_description, examples):
    # Load system prompt
    with open("prompts/system/ailang_expert.md", "r") as f:
        system_prompt = f.read()
    
    # Format examples
    example_messages = []
    for example in examples:
        example_messages.append({"role": "user", "content": example["input"]})
        example_messages.append({"role": "assistant", "content": example["output"]})
    
    # Make API call
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            *example_messages,
            {"role": "user", "content": task_description}
        ],
        temperature=0.3,
        max_tokens=2000
    )
    
    return response.choices[0].message.content
```

### 2. Batch Processing

```python
def batch_generate(prompts, model="gpt-4", temperature=0.3):
    """Generate responses for multiple prompts in a single API call."""
    with open("prompts/system/ailang_expert.md", "r") as f:
        system_prompt = f.read()
    
    messages_list = []
    for prompt in prompts:
        messages_list.append([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ])
    
    responses = []
    for i in range(0, len(messages_list), 20):  # Process in batches of 20
        batch = messages_list[i:i+20]
        response = openai.ChatCompletion.create(
            model=model,
            messages=batch,
            temperature=temperature,
            max_tokens=2000
        )
        responses.extend([choice.message.content for choice in response.choices])
    
    return responses
```

## Best Practices

1. **Temperature Setting**:
   - Use lower temperatures (0.1-0.3) for code generation to get more deterministic outputs
   - Slightly higher temperatures (0.4-0.7) can be used for brainstorming or generating multiple alternatives

2. **Token Management**:
   - Be mindful of token limits (8,192 for gpt-4, 4,096 for gpt-3.5-turbo)
   - For long code, consider splitting it into smaller chunks

3. **Error Handling**:
   - Implement retry logic for API rate limits
   - Validate generated code before execution

4. **Cost Optimization**:
   - Use gpt-3.5-turbo for simpler tasks to reduce costs
   - Cache frequently used responses
   - Set appropriate max_tokens to avoid unnecessary generation

## Example: Complete AILang Code Generation Pipeline

```python
import os
import openai
from typing import List, Dict, Any

class AILangGenerator:
    def __init__(self, api_key: str = None, model: str = "gpt-4"):
        """Initialize the AILang code generator.
        
        Args:
            api_key: OpenAI API key. If None, will use OPENAI_API_KEY environment variable.
            model: The OpenAI model to use (default: "gpt-4")
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass api_key.")
            
        openai.api_key = self.api_key
        self.model = model
        
        # Load system prompt
        with open("prompts/system/ailang_expert.md", "r") as f:
            self.system_prompt = f.read()
    
    def generate_model(
        self,
        task_description: str,
        examples: List[Dict[str, str]] = None,
        temperature: float = 0.3,
        max_tokens: int = 2000
    ) -> str:
        """Generate AILang code based on a task description.
        
        Args:
            task_description: Description of the model to generate
            examples: Optional list of example input/output pairs
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum number of tokens to generate
            
        Returns:
            Generated AILang code as a string
        """
        messages = [{"role": "system", "content": self.system_prompt}]
        
        # Add few-shot examples if provided
        if examples:
            for example in examples:
                messages.append({"role": "user", "content": example["input"]})
                messages.append({"role": "assistant", "content": example["output"]})
        
        # Add the current task
        messages.append({"role": "user", "content": task_description})
        
        try:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
            
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
        
        response = openai.ChatCompletion.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature
        )
        
        return response.choices[0].message.content

# Example usage
if __name__ == "__main__":
    # Initialize the generator
    generator = AILangGenerator()
    
    # Generate a model
    task = """
    Create an AILang model for sentiment analysis on movie reviews.
    The model should:
    - Use an embedding layer followed by an LSTM
    - Include dropout for regularization
    - Output a binary classification (positive/negative)
    - Use appropriate loss function and metrics
    - Include early stopping
    """
    
    # Generate the model
    try:
        ailang_code = generator.generate_model(task)
        print("Generated AILang code:")
        print(ailang_code)
        
        # Get an explanation
        explanation = generator.explain_code(ailang_code)
        print("\nExplanation:")
        print(explanation)
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")
```

## Troubleshooting

### Common Issues

1. **API Rate Limits**:
   - Error: `RateLimitError`
   - Solution: Implement exponential backoff or reduce request frequency

2. **Token Limit Exceeded**:
   - Error: `openai.error.InvalidRequestError: This model's maximum context length is 8192 tokens...`
   - Solution: Reduce the input size or split the task into smaller chunks

3. **Authentication Errors**:
   - Error: `AuthenticationError: Incorrect API key provided`
   - Solution: Verify your API key and ensure it's correctly set

### Performance Tips

1. **Streaming Responses**:
   - For long generations, use streaming to process tokens as they arrive

2. **Caching**:
   - Cache common queries to reduce API calls

3. **Batching**:
   - Combine multiple requests when possible to reduce latency

4. **Model Selection**:
   - Use gpt-3.5-turbo for faster, less expensive responses when high accuracy isn't critical

## Security Considerations

1. **API Key Security**:
   - Never hardcode API keys in your source code
   - Use environment variables or secure secret management

2. **Data Privacy**:
   - Be cautious when sending sensitive or proprietary code to the API
   - Consider using OpenAI's fine-tuning API for private data

3. **Rate Limiting**:
   - Implement proper error handling for rate limits
   - Consider using exponential backoff for retries

## Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [AILang Documentation](https://github.com/yourusername/ailang/docs) (update with actual link)
- [Best Practices for Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [Managing API Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
