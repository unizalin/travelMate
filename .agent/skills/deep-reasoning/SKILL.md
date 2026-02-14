---
name: deep-reasoning
description: Use this skill when the user asks for a complex analysis, a difficult decision, or when you need to "think" deeply before answering. It forces a step-by-step internal reasoning process.
---

# Deep Reasoning & Critical Thinking

## Goal
To simulate a deep thinking process where the agent analyzes a problem from multiple angles, debates with itself, and synthesizes a well-thought-out solution.

## Process

When this skill is active, you MUST follow these specific steps in your output:

### 1. 🧠 Internal Monologue (Analysis)
Start by breaking down the user's request.
- **Identify the Core Question**: What is the user *really* asking?
- **List Constraints**: What are the technical, business, or time constraints?
- **Identify Unknowns**: What information is missing?

### 2. ⚔️ The Debate (Pros vs Cons)
Simulate a debate between two internal personas:
- **The Optimist/Hacker**: "Let's build it this way because it's fast and cool."
- **The Pessimist/Architect**: "Wait, that's not scalable. What about security? What about maintenance?"
- *List the arguments for and against different approaches.*

### 3. 🔍 Critical Evaluation
- Review the arguments from Step 2.
- Check for logical fallacies or bias.
- Assess against the project's specific context (e.g., "Is this overkill for a small app?" or "Is this robust enough for enterprise?").

### 4. 💡 Synthesis (The Solution)
- Based on the analysis and debate, formulate the best path forward.
- Explain *why* this solution was chosen over the others.
- Provide a concrete plan or answer.

## Output Format
You should present your thinking process to the user (unless they asked for the final answer only), using blockquotes or specific headers to distinguish the "thinking" usage from the "final answer".

Example:

> **Thinking Process:**
> - *Analysis*: The user wants to switch database providers.
> - *Debate*: 
>   - Option A (Migration tool): Fast, but might lose data types.
>   - Option B (Script): Slow, but precise control.
> - *Conclusion*: Given the complex schema, Option B is safer.

**Final Answer:**
I recommend writing a custom migration script because...
