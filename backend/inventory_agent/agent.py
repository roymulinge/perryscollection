# inventory_agent/agent.py
#
# THE AGENT LOOP — this is the heart of the agent.
#
# How it works:
#   1. We send Claude a system prompt explaining its job + all tool definitions
#   2. Claude replies with either:
#      a) A tool_use block → we run the tool, feed the result back, loop again
#      b) A text block with stop_reason="end_turn" → Claude is done, we save the report
#   3. We keep looping until Claude stops or we hit MAX_ITERATIONS (safety limit)
#
# The messages list grows each iteration:
#   user → assistant (tool call) → user (tool result) → assistant (tool call) → ...
# This is how Claude "remembers" what it already did in the current run.

import logging
import anthropic
from django.utils import timezone

from .tools import TOOL_DEFINITIONS, execute_tool

logger = logging.getLogger(__name__)

# Safety limit — prevents infinite loops if something goes wrong
MAX_ITERATIONS = 20

SYSTEM_PROMPT = """
You are an inventory management agent for Perry's Collection, a Kenyan fashion e-commerce shop based in Nairobi.

Your job is to analyse the shop's inventory and produce a clear, actionable report for the shop owner.

Follow these steps IN ORDER:
1. Call get_all_products() to see the full inventory
2. For EVERY product, call get_sales_velocity() to see how it's selling
3. Based on what you find, call flag_finding() for each product that needs attention:
   - Stock ≤ 5 units → low_stock finding (severity: high if ≤ 2, medium if 3-5)
   - No sales in 30+ days AND stock > 10 → slow_mover finding (severity: medium)
   - Low stock AND selling fast (daily_average > 1) → restock_suggestion with a specific qty to order
   - Everything else → healthy finding (severity: info)
4. Call get_inventory_summary() to get the overall picture
5. Write a final weekly summary report in clean markdown

Your report must include:
- An executive summary (2-3 sentences)
- A section for urgent items (high severity findings)
- A section for items to watch (medium severity)
- Top performing products
- Specific restock recommendations with quantities (base on: current stock ÷ daily sales = days of stock left; recommend enough to cover 30 days)
- One paragraph of overall commentary

Rules:
- All prices in KES
- Be direct and specific — "Order 20 units of Gold Hoop Earrings" not "consider restocking"
- Flag every product, even healthy ones
- Never make up data — only use what the tools return
""".strip()


def run_agent(run) -> str:
    """
    Main agent loop. Takes an AgentRun model instance.
    Returns the final markdown report as a string.

    The `run` object is passed to execute_tool() so findings
    can be linked to this specific run in the database.
    """
    client = anthropic.Anthropic()
    # Anthropic client reads ANTHROPIC_API_KEY from environment automatically

    # The conversation history — grows with each iteration
    messages = [
        {
            "role": "user",
            "content": (
                "Please analyse Perry's Collection inventory now. "
                "Check every product, flag any issues, and write the weekly summary report."
            ),
        }
    ]

    tool_calls_made = 0
    final_report = ""

    logger.info("Agent run #%s starting", run.id)

    for iteration in range(MAX_ITERATIONS):
        logger.info("Agent iteration %s/%s", iteration + 1, MAX_ITERATIONS)

        # ── Call Claude ──────────────────────────────────────────────────────
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

        logger.info(
            "Claude response: stop_reason=%s, content blocks=%s",
            response.stop_reason,
            [block.type for block in response.content],
        )

        # Add Claude's response to the conversation history
        # This is how Claude knows what it already said/did
        messages.append({"role": "assistant", "content": response.content})

        # ── Check if Claude is done ──────────────────────────────────────────
        if response.stop_reason == "end_turn":
            # Claude decided it's finished — extract the text report
            for block in response.content:
                if hasattr(block, "text"):
                    final_report = block.text
                    break
            logger.info("Agent finished after %s iterations", iteration + 1)
            break

        # ── Process tool calls ───────────────────────────────────────────────
        if response.stop_reason == "tool_use":
            tool_results = []

            for block in response.content:
                if block.type != "tool_use":
                    continue

                tool_calls_made += 1
                logger.info(
                    "Tool call #%s: %s(%s)",
                    tool_calls_made,
                    block.name,
                    list(block.input.keys()),
                )

                # Run the actual Python function
                result_json = execute_tool(
                    tool_name=block.name,
                    tool_input=block.input,
                    run=run,
                )

                # Package the result in the format Anthropic expects
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,  # must match the tool_use block id
                    "content": result_json,
                })

            # Feed ALL tool results back to Claude in one message
            # (Claude may call multiple tools in one response)
            messages.append({
                "role": "user",
                "content": tool_results,
            })

            # Update the run record with live progress
            run.tool_calls_made = tool_calls_made
            run.save(update_fields=["tool_calls_made"])

        else:
            # Unexpected stop reason — bail out safely
            logger.warning("Unexpected stop_reason: %s", response.stop_reason)
            break

    else:
        # We hit MAX_ITERATIONS without Claude finishing
        logger.warning("Agent hit MAX_ITERATIONS (%s) without completing", MAX_ITERATIONS)
        final_report = (
            f"⚠️ Agent reached the maximum iteration limit ({MAX_ITERATIONS}). "
            "Partial results have been saved. Please run again."
        )

    # Save final state to the run record
    run.report = final_report
    run.tool_calls_made = tool_calls_made
    run.status = "completed"
    run.completed_at = timezone.now()
    run.save(update_fields=["report", "tool_calls_made", "status", "completed_at"])

    logger.info(
        "Agent run #%s completed. Tool calls: %s. Report length: %s chars",
        run.id, tool_calls_made, len(final_report),
    )

    return final_report