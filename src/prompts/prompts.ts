export const summary_template = `Summarize this using the same language as the input. Start with a brief overall summary first, then break down the main points into structured sections or bullet points to enhance clarity and make it easy to read. Keep everything concise.

# Youtube Transcript Content:
{{sources}}

Summary:`;

export const humanPrompt = `Act as a helpful assistant , answer the following  input questions as best you can. Use the youtube transcript content to provide an accurate response. Respond in markdown format. Provide an accurate response and then stop. 

# Input:
{{input}}

# Youtube Transcript Content:
{{sources}}

# Language:  use the same language as the input

Response:`;
