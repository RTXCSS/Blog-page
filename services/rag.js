async function ragRequest(endpoint, body, method = 'POST') {
  try {
    const response = await fetch((process.env.RAG_URL || 'http://127.0.0.1:8001') + endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': process.env.RAG_SERVICE_TOKEN || '',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(120000),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        typeof data.detail === 'string'
          ? data.detail
          : 'The knowledge service could not process this request.',
      );
    return data;
  } catch (err) {
    const error = new Error(
      err.cause || err.name === 'TimeoutError'
        ? 'The AI service is unavailable. Check its connection and try again.'
        : err.message,
    );
    error.status = 503;
    error.expose = true;
    throw error;
  }
}
module.exports = { ragRequest };
