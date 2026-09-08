self.addEventListener("message", async (event) => {
  const { file, id } = event.data;

  try {
    const value = JSON.parse(await file.text());
    self.postMessage({ id, value });
  } catch {
    self.postMessage({ error: "Complete backup must contain valid JSON.", id });
  }
});
