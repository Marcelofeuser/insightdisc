export async function interpretDISC(profile) {
  const response = await fetch("/api/ai-disc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(profile)
  });

  return response.json();
}
