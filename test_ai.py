from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5-mini",
    input="こんにちは！短く自己紹介して。"
)

print(response.output_text)
